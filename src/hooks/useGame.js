// 게임 진행 상태(어느 화면인지, 플레이어/적/로그)를 관리하는 훅.
// 규칙 계산은 src/game/ 의 순수 함수에 맡기고, 여기서는 "화면 전환 + 로그 기록"만 한다.
import { useEffect, useMemo, useState } from 'react'
import * as battle from '../game/battle.js'
import {
  capacityOf,
  carriedCount,
  corruptionOf,
  createPlayer,
  equip,
  itemCount,
  maxLightOf,
  subjectNumber,
  unequipAug,
} from '../game/character.js'
import { config } from '../game/config.js'
import { floors } from '../game/data.js'
import { atExit, climb, floorLogs, getFloor, isFinalFloor, rest, retreat, returnFromWing, sightLogs, step } from '../game/explore.js'
import { atGate, tryGate } from '../game/gate.js'
import { getItem, upgradeBag, upgradeLight, usableItems, useItem } from '../game/items.js'
import { generateMapLayout } from '../game/mapgen.js'
import {
  availableRooms,
  enterRoom,
  healInClinic,
  login,
  notebookLogs,
  openWing,
  readArchive,
  restInRoom,
  searchRoom,
  takeSupplyItem,
} from '../game/rooms.js'
import { clearSave, hasSave, loadGame, saveGame } from '../game/save.js'
import { josa } from '../game/util.js'

// 방향키로 탐색 화면을 움직일 때, 지금 서 있는 칸에서 반대 방향을 구하는 데 쓴다.
const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' }

// 로그 한 줄. batch는 한 번의 행동으로 함께 추가된 줄들의 묶음 번호다. (화면에서는 묶음 단위로 최신순 정렬)
let nextLogId = 1
let nextBatchId = 1
const entry = (text, type = 'normal', batch) => ({ id: nextLogId++, batch, text, type })

const initialState = () => {
  const batch = nextBatchId++
  return {
    screen: 'title', // title | confirmNew | awaken | explore | inventory | notebook | terminal | gate | room | equip | battle | battleItems | battleEnd | computer | ending
    player: null,
    enemy: null,
    terminalRoom: null, // 접속 화면(terminal)일 때 그 방의 번호
    wingRoom: null, // 잠긴 문 화면(gate)이 별관 통로일 때 그 방의 번호 (null이면 그 층의 gate)
    roomIndex: null, // 방 화면(room)일 때 그 방의 번호
    roomTaken: [], // 방 화면에서 이미 챙긴 아이템 id들 (보급실용, 방을 나서면 비운다)
    roomSearched: [], // 방 화면에서 이미 조사한 지점 id들 (room.searches용, 방을 나서면 비운다)
    pendingGear: null, // 방금 얻어 장착할지 묻는 중인 무기·방어구 id (equip 화면)
    returnScreen: null, // 수첩을 열기 전 화면 (닫으면 여기로 돌아간다)
    battleResult: null, // 'win' | 'lose' | 'fled'
    log: [
      entry('어디선가 환풍기 소리가 낮게 들려온다.', 'muted', batch),
      entry('나는 누구지...? 이곳은 어디지...?', 'muted', batch),
    ],
  }
}

export function useGame() {
  const [game, setGame] = useState(initialState)
  const { screen, player, enemy } = game

  // 상태 일부를 바꾸고 로그를 덧붙인다. logs: [{ text, type }]
  // resetLog가 true면 이어 붙이는 대신 지금까지의 기록을 지우고 이 logs로만 새로 시작한다.
  const set = (patch, logs = [], resetLog = false) => {
    const batch = nextBatchId++
    const added = logs.filter(Boolean).map((l) => entry(l.text, l.type, batch))
    setGame((g) => ({ ...g, ...patch, log: (resetLog ? added : [...g.log, ...added]).slice(-config.maxLogLines) }))
  }
  const say = (text, type) => set({}, [{ text, type }])

  // 탐색 화면에서는 상태가 바뀔 때마다 자동 저장
  useEffect(() => {
    if (config.autoSave && screen === 'explore' && player) saveGame(player)
  }, [screen, player])

  // 타이틀 화면에서만 저장 데이터를 확인한다.
  const saved = useMemo(() => (screen === 'title' ? loadGame() : null), [screen])

  const goExplore = (p, logs = [], resetLog = false) =>
    set(
      {
        screen: 'explore',
        player: p,
        enemy: null,
        battleResult: null,
        terminalRoom: null,
        wingRoom: null,
        roomIndex: null,
        pendingGear: null,
        returnScreen: null,
      },
      logs,
      resetLog,
    )

  // 탐색/휴식 결과를 반영한다. 새 무기·방어구·이식을 얻었으면 장착할지부터 물어보고, 그다음에 적을 만났으면 전투로 넘어간다.
  const applyExplore = (r) => {
    if (r.foundGear) {
      const type = getItem(r.foundGear).type
      // 이식(aug)은 무기·방어구처럼 하나만 갈아 끼우는 게 아니라 여러 개를 동시에 지닐 수 있어서, 지금 장착 중인 것과 비교하지 않는다.
      if (type === 'aug') return set({ player: r.player, enemy: r.enemy, pendingGear: r.foundGear, screen: 'equip' }, r.logs)
      const currentId = r.player.equipped[type]
      const currentDesc = currentId ? `${getItem(currentId).name} (${getItem(currentId).description})` : '없음'
      return set({ player: r.player, enemy: r.enemy, pendingGear: r.foundGear, screen: 'equip' }, [
        ...r.logs,
        { text: `지금 장착한 ${type === 'weapon' ? '무기' : '방어구'}: ${currentDesc}`, type: 'muted' },
      ])
    }
    set({ player: r.player, enemy: r.enemy, screen: r.enemy ? 'battle' : 'explore' }, r.logs)
  }

  // 장비·이식 하나를 장착한다. 이식이면 몸의 변화를 알리는 문장을 덧붙이고, 그로 인해 변질도가 문턱을 처음 넘으면
  // (직접 말하지 않고) 아주 짧게만 암시하는 문장 한 줄을 더 얹는다.
  const applyEquip = (id) => {
    const item = getItem(id)
    const before = corruptionOf(player)
    const p = equip(player, id)
    const logs = [{ text: `${josa(item.name, '을/를')} ${item.type === 'aug' ? '이식했다' : '장착했다'}.`, type: 'good' }]
    if (item.type === 'aug') {
      if (item.installText) logs.push({ text: item.installText, type: 'muted' })
      if (before < config.corruptionThreshold && corruptionOf(p) >= config.corruptionThreshold) {
        logs.push({ text: '몸 안에서 무언가 어긋나는 소리가 났다. 아주 잠깐이었다.', type: 'bad' })
      }
    }
    return { player: p, logs }
  }

  // 전투 한 턴의 결과를 반영한다.
  const applyBattle = (r) =>
    set(
      r.result
        ? { player: r.player, enemy: r.enemy, screen: 'battleEnd', battleResult: r.result }
        : { player: r.player, enemy: r.enemy, screen: 'battle' },
      r.logs,
    )

  // '눈을 뜬다'(또는 '기록을 지우고 시작')를 누르면 곧장 시작하지 않고, 먼저 둘러볼지 물어본다.
  const goAwaken = () =>
    set({ screen: 'awaken' }, [
      { text: '칠흑 같은 어둠뿐이다. 아무것도 보이지 않는다.', type: 'muted' },
      { text: '눅눅한 공기 속에 녹슨 쇠와 고인 물 냄새가 섞여 있다. 어디선가 물 흐르는 소리가 희미하게 들린다.', type: 'muted' },
    ])

  // '주변을 둘러본다'를 누르면 그제야 깨어난 순간의 지문이 나오고 실제로 시작한다.
  // 본격적으로 시작하는 순간이라, 타이틀·눈을 뜨는 동안 나온 지문은 기록에서 지운다.
  const startRun = () => {
    const p = { ...createPlayer(), mapLayout: generateMapLayout() }
    goExplore(
      p,
      [
        { text: '차가운 콘크리트 바닥에서 눈을 뜬다. 손에는 꺼져가는 손전등과 쪽지 하나가 있었다.', type: 'event' },
        { text: '이 곳을 탈출하라.', type: 'note' },
        ...floorLogs(p),
      ],
      true,
    )
  }

  const actions = {
    // 타이틀 / 시작
    toTitle: () => setGame(initialState()),
    newGame: () =>
      hasSave()
        ? set({ screen: 'confirmNew' }, [{ text: '이어서 걸을 수 있는 기록이 있다. 새로 시작하면 사라진다.', type: 'bad' }])
        : goAwaken(),
    confirmNewGame: goAwaken,
    lookAround: startRun,
    continueGame: () => {
      const p = loadGame()
      if (!p) return say('기록을 불러오지 못했다.', 'bad')
      goExplore(p, [{ text: '다시 눈을 뜬다. 아직 이곳이다.', type: 'event' }, ...floorLogs(p)])
    },

    // 탐색
    walk: () => applyExplore(step(player)),
    retreat: () => applyExplore(retreat(player)),
    rest: () => applyExplore(rest(player)),
    enterRoom: (index) => {
      const r = enterRoom(player, index)
      // 단말실은 접속 화면으로, 별관 통로는 잠긴 문 화면으로, 효과가 있는 방은 방 화면으로 넘어간다.
      if (r.terminal) return set({ player: r.player, screen: 'terminal', terminalRoom: index }, r.logs)
      if (r.wing) return set({ player: r.player, screen: 'gate', wingRoom: index }, r.logs)
      if (r.room) return set({ player: r.player, screen: 'room', roomIndex: index, roomTaken: [], roomSearched: [] }, r.logs)
      applyExplore(r)
    },

    // 방 화면 안에서 직접 고르는 행동들. 하나를 마치면(보급실 제외) 탐색으로 돌아간다.
    restInRoom: () => {
      const r = restInRoom(player)
      set({ player: r.player, screen: 'explore', roomIndex: null }, r.logs)
    },
    healInClinic: () => {
      const r = healInClinic(player, game.roomIndex)
      set({ player: r.player, screen: 'explore', roomIndex: null }, r.logs)
    },
    readArchive: () => {
      const r = readArchive(player, game.roomIndex)
      set({ player: r.player, screen: 'explore', roomIndex: null }, r.logs)
    },
    // 보급실은 여러 아이템을 하나씩 고를 수 있어서, 다 챙기지 않아도 '나선다'를 눌러야 나간다.
    takeSupplyItem: (itemId) => {
      const r = takeSupplyItem(player, game.roomIndex, itemId)
      set({ player: r.player, roomTaken: [...game.roomTaken, itemId] }, r.logs)
    },
    // 방 안의 조사 지점. 위험한 것과 마주치면(enemy) 전투로 이어지고, 이기면 방으로 돌아온다(endBattle 참고).
    searchRoom: (searchId) => {
      const r = searchRoom(player, game.roomIndex, searchId)
      const roomSearched = [...game.roomSearched, searchId]
      if (r.enemy) return set({ player: r.player, enemy: r.enemy, screen: 'battle', roomSearched }, r.logs)
      set({ player: r.player, roomSearched }, r.logs)
    },
    leaveRoom: () =>
      set({ screen: 'explore', roomIndex: null, roomTaken: [], roomSearched: [] }, [{ text: '방에서 나섰다.', type: 'muted' }]),

    // 단말 접속: 성공하면 방이 소진되고 탐색으로 돌아온다. 틀리면 접속 화면에 남는다.
    login: (id, password) => {
      const r = login(player, game.terminalRoom, id, password)
      set(r.ok ? { player: r.player, screen: 'explore', terminalRoom: null } : {}, r.logs)
    },
    leaveTerminal: () => set({ screen: 'explore', terminalRoom: null }, [{ text: '단말에서 물러났다.', type: 'muted' }]),

    // 잠긴 문: 문 앞에서 비밀번호를 살펴보고 넣어 본다. 열리면 탐색으로 돌아온다. 틀리면 체력이 깎이고 문 앞에 남는다.
    // 별관 통로(wingRoom이 있을 때)는 열리면 그 별관으로 곧장 넘어간다.
    openGate: () => set({ screen: 'gate', wingRoom: null }, getFloor(player).gate.text.map((t) => ({ text: t, type: 'event' }))),
    unlockGate: (password) => {
      if (game.wingRoom != null) {
        const r = openWing(player, game.wingRoom, password)
        if (!r.ok) return set({ player: r.player }, r.logs)
        return set({ player: r.player, screen: 'explore', wingRoom: null }, [...r.logs, ...floorLogs(r.player)])
      }
      const r = tryGate(player, password)
      set(r.ok ? { player: r.player, screen: 'explore' } : { player: r.player }, r.logs)
    },
    leaveGate: () => set({ screen: 'explore', wingRoom: null }, [{ text: '문에서 물러났다.', type: 'muted' }]),

    // 수첩: 읽은 쪽지를 다시 본다. 탐색, 단말 접속, 잠긴 문 화면 어디서든 열 수 있다.
    openNotebook: () => set({ screen: 'notebook', returnScreen: screen }, notebookLogs(player)),
    closeNotebook: () => set({ screen: game.returnScreen ?? 'explore', returnScreen: null }),
    climb: () => {
      const r = climb(player)
      set({ player: r.player }, r.logs)
    },
    returnFromWing: () => {
      const r = returnFromWing(player)
      set({ player: r.player }, r.logs)
    },
    // 지하 1층 출구: 문은 안쪽의 COMPUTER와 대화가 끝나야 열린다. 보스 전투 없이 곧장 들어간다.
    enterComputer: () => set({ screen: 'computer' }, [{ text: '문을 연다.', type: 'event' }]),
    // COMPUTER와의 대화가 결말(ESCAPE/DESTROY/SUICIDE)에 닿고, 그 결말 연출까지 다 끝나면 호출된다.
    finishComputer: (ending) => {
      clearSave() // 실험이 끝났으니 이어하기 기록은 남기지 않는다.
      // 이식을 너무 많이 장착해 변질도가 문턱을 넘었으면(config.corruptionThreshold), 탈출을 골라도
      // "피험자"로 인정받지 못한 채 끝난다 — 직접 "괴물이 되었다"고 말하지 않고, 판정 실패라는 형식으로만 드러낸다.
      const corrupted = corruptionOf(player) >= config.corruptionThreshold
      const bodies = {
        ESCAPE: corrupted
          ? [
              { text: 'COMPUTER가 멀어진다. 화면 가득 낯선 글자가 떠올랐다가 꺼진다.', type: 'event' },
              { text: '— 판정 보류 —', type: 'header' },
              { text: '문이 열린다. …바깥이 아니다. 빛이 너무 고르다. 천장에 줄지어 선 조명이다.' },
              { text: '"기록 불일치. 피험자로 확인되지 않음."', type: 'note' },
              {
                text: `기록: SUBJ-${subjectNumber(player)}는 더 이상 그 번호로 남지 않는다. ${player.steps}걸음, ${player.deaths}번 쓰러짐.`,
                type: 'muted',
              },
            ]
          : [
              { text: 'COMPUTER가 멀어진다. 화면 가득 낯선 글자가 떠올랐다가 꺼진다.', type: 'event' },
              { text: '— 탈출 —', type: 'header' },
              { text: '문이 열린다. 그런데 밖으로 나가는 느낌이 들지 않는다.', type: 'note' },
              { text: `기록: 피험자 SUBJ-${subjectNumber(player)}, ${player.steps}걸음, ${player.deaths}번 쓰러짐.`, type: 'muted' },
            ],
        DESTROY: [
          { text: '화면이 터지듯 깨지고, 방이 그대로 어두워진다.', type: 'bad' },
          { text: '— 파괴 —', type: 'header' },
          { text: '그 뒤로는 아무것도 묻지 않는다.', type: 'note' },
        ],
        SUICIDE: [
          { text: '대화창이 소리 없이 어두워진다.', type: 'muted' },
          { text: '— 종료 —', type: 'header' },
          { text: '관측이 끝났다.', type: 'note' },
        ],
      }[ending]
      set({ screen: 'ending', enemy: null, battleResult: null }, bodies)
    },
    manualSave: () => (saveGame(player) ? say('기록했다.', 'muted') : say('기록에 실패했다. 브라우저 저장소를 확인해 주세요.', 'bad')),

    // 테스트용: 층을 곧장 옮긴다 (개발 빌드에서만 UI에 노출된다).
    devJumpFloor: (floorIndex) => {
      const next = {
        ...player,
        floor: floorIndex,
        progress: 0,
        rests: config.restsPerFloor,
        floorKnown: true,
        dangerStreak: 0,
        branchReturn: null,
      }
      goExplore(next, floorLogs(next))
    },

    // 소지품
    openInventory: () => set({ screen: 'inventory' }),
    useInventoryItem: (id) => {
      const r = useItem(player, id)
      set({ player: r.player }, [{ text: r.message, type: r.ok ? 'good' : 'muted' }])
    },
    // 가죽을 조합해 가방을 키운다. 소지품 화면에서 고를 수 있다.
    upgradeBag: () => {
      const r = upgradeBag(player)
      set({ player: r.player }, [{ text: r.message, type: r.ok ? 'good' : 'muted' }])
    },
    // 기계부품을 조합해 손전등을 개조한다. 소지품 화면에서 고를 수 있다.
    upgradeLight: () => {
      const r = upgradeLight(player)
      set({ player: r.player }, [{ text: r.message, type: r.ok ? 'good' : 'muted' }])
    },
    closeInventory: () => set({ screen: 'explore' }),

    // 새 무기·방어구·이식을 얻었을 때(equip 화면): 장착하거나, 넣어만 두고 원래 가려던 화면(전투/탐색)으로 돌아간다.
    equipGear: () => {
      const { player: p, logs } = applyEquip(game.pendingGear)
      set({ player: p, pendingGear: null, screen: enemy ? 'battle' : 'explore' }, logs)
    },
    skipEquip: () =>
      set({ pendingGear: null, screen: enemy ? 'battle' : 'explore' }, [{ text: '장착하지 않고 넣어 두었다.', type: 'muted' }]),
    // 소지품 화면에서 직접 장비를 갈아 끼우거나, 가지고 있는 이식을 장착한다.
    equipFromInventory: (id) => {
      const { player: p, logs } = applyEquip(id)
      set({ player: p }, logs)
    },
    // 장착한 이식을 뗀다. 무기·방어구와 달리 이식은 뗄 수 있다(여러 개를 동시에 지닐 수 있어서 갈아 끼우는 개념이 없다).
    unequipFromInventory: (id) => {
      const p = unequipAug(player, id)
      set({ player: p }, [{ text: `${josa(getItem(id).name, '을/를')} 제거했다.`, type: 'muted' }])
    },

    // 전투
    attack: () => applyBattle(battle.attack(player, enemy)),
    openBattleItems: () =>
      usableItems(player, ['heal']).length ? set({ screen: 'battleItems' }) : say('쓸 수 있는 것이 없다.', 'muted'),
    useBattleItem: (id) => applyBattle(battle.useItemInBattle(player, enemy, id)),
    closeBattleItems: () => set({ screen: 'battle' }),
    flee: () => applyBattle(battle.flee(player, enemy)),
    endBattle: () => {
      if (game.battleResult === 'lose') {
        const { player: revived, lostLight } = battle.applyDefeat(player)
        return goExplore(revived, [
          { text: '쓰러졌다. 어둠이 덮쳐온다.', type: 'bad' },
          { text: '…눈을 뜨니 이 층의 입구다.', type: 'muted' },
          lostLight > 0 && { text: `빛 -${lostLight}`, type: 'bad' },
        ])
      }
      // 방 안에서 조사하다 마주친 적을 이겼으면, 탐색이 아니라 그 방 안으로 돌아간다.
      if (game.battleResult === 'win' && game.roomIndex != null) return set({ screen: 'room', enemy: null, battleResult: null })
      goExplore(player, sightLogs(player))
    },
  }

  // 현재 화면에서 고를 수 있는 선택지
  const itemLabel = (id) => `${getItem(id).name} x${player.inventory[id]}`
  const itemHint = (id) => `${itemLabel(id)} — ${getItem(id).description}`
  const choices = (() => {
    switch (screen) {
      case 'title':
        return [
          ...(saved ? [{ label: `이어서 걷는다 (${floors[saved.floor].name})`, onClick: actions.continueGame }] : []),
          { label: '눈을 뜬다', onClick: actions.newGame },
        ]
      case 'confirmNew':
        return [
          { label: '기록을 지우고 시작', onClick: actions.confirmNewGame },
          { label: '취소', onClick: actions.toTitle },
        ]
      case 'awaken':
        return [{ label: '주변을 둘러본다', onClick: actions.lookAround }]
      case 'explore': {
        // 방향키 이동: 지도에서 실제로 그 방향으로 가는 선택지에만 dir을 붙인다.
        const floor = getFloor(player)
        const forwardDir = floor.path[Math.min(player.progress, floor.path.length - 1)]
        const backDir = player.progress > 0 ? OPPOSITE[floor.path[player.progress - 1]] : null
        return [
          {
            ...(atExit(player)
              ? floor.wing
                ? { label: '온 길을 되짚어 돌아간다', onClick: actions.returnFromWing }
                : isFinalFloor(player)
                  ? { label: '문으로 다가간다', onClick: actions.enterComputer }
                  : { label: '계단을 오른다', onClick: actions.climb }
              : atGate(player)
                ? { label: '잠긴 문을 살펴본다', onClick: actions.openGate }
                : { label: '전진', onClick: actions.walk }),
            dir: forwardDir,
          },
          // 입구까지 물러났으면 더 물러날 곳이 없다.
          ...(player.progress > 0 ? [{ label: '돌아간다', onClick: actions.retreat, dir: backDir }] : []),
          { label: `쉰다 (${player.rests})`, disabled: player.rests <= 0, onClick: actions.rest },
          { label: '소지품', onClick: actions.openInventory },
          // 쪽지를 하나라도 읽었을 때부터 나타난다.
          ...(player.notebook.length ? [{ label: '수첩', onClick: actions.openNotebook }] : []),
          // 문을 발견하고 아직 안 가 본 곁길의 방. 지금 그 문 앞(room.at)이면 방향키로도 들어갈 수 있다.
          ...availableRooms(player).map(({ room, index }) => ({
            label: `${room.name}에 들어간다`,
            onClick: () => actions.enterRoom(index),
            dir: room.at === player.progress ? room.dir : undefined,
          })),
        ]
      }
      case 'room': {
        const room = floors[player.floor].rooms[game.roomIndex]
        const tail = [
          // 조사 지점: 정해진 행동과 별개로, 방을 나서기 전까지 하나씩 더 골라 볼 수 있다.
          // requires가 있으면 그 id를 먼저 조사해야("더 들어가본다") 비로소 선택지에 나타난다(사슬).
          ...(room.searches ?? [])
            .filter((s) => !game.roomSearched.includes(s.id) && (!s.requires || game.roomSearched.includes(s.requires)))
            .map((s) => ({ label: s.label, onClick: () => actions.searchRoom(s.id) })),
          ...(player.notebook.length ? [{ label: '수첩', onClick: actions.openNotebook }] : []),
          { label: '나선다', onClick: actions.leaveRoom },
        ]
        if (room.kind === 'supply') {
          return [
            // 이미 챙긴 아이템은 다시 안 보인다. 안 챙긴 것이 남아 있어도 '나선다'로 나갈 수 있다.
            ...Object.entries(room.items)
              .filter(([id]) => !game.roomTaken.includes(id))
              .map(([id, count]) => ({ label: `${getItem(id).name} (${count}개) 챙긴다`, onClick: () => actions.takeSupplyItem(id) })),
            ...tail,
          ]
        }
        if (room.kind === 'rest') return [{ label: '쉰다', onClick: actions.restInRoom }, ...tail]
        if (room.kind === 'clinic') return [{ label: '치료받는다', onClick: actions.healInClinic }, ...tail]
        if (room.kind === 'archive') return [{ label: '쪽지를 읽는다', onClick: actions.readArchive }, ...tail]
        return tail
      }
      case 'equip': {
        const item = getItem(game.pendingGear)
        const verb = item.type === 'aug' ? '이식' : '장착'
        return [
          { label: `${verb}한다 (${item.description})`, onClick: actions.equipGear },
          { label: `${verb}하지 않는다`, onClick: actions.skipEquip },
        ]
      }
      case 'notebook':
        return [{ label: '돌아가기', onClick: actions.closeNotebook }]
      case 'inventory': {
        const bagCost = config.inventory.upgradeLeatherCost
        const lightCost = config.flashlight.upgradePartCost
        // 가지고 있지만 아직 장착하지 않은 무기·방어구. 여기서 바로 갈아 낄 수 있다.
        const gearToEquip = Object.keys(player.inventory).filter((id) => {
          const type = getItem(id)?.type
          return (type === 'weapon' || type === 'armor') && player.equipped[type] !== id
        })
        // 가지고 있는 이식들. 무기·방어구와 달리 여러 개를 동시에 장착할 수 있어서, 장착 중이면 제거를,
        // 아니면 장착을 고를 수 있다.
        const augsOwned = Object.keys(player.inventory).filter((id) => getItem(id)?.type === 'aug')
        return [
          ...usableItems(player).map((id) => ({ label: itemHint(id), onClick: () => actions.useInventoryItem(id) })),
          ...gearToEquip.map((id) => ({
            label: `${getItem(id).name} 장착한다 (${getItem(id).description})`,
            onClick: () => actions.equipFromInventory(id),
          })),
          ...augsOwned.map((id) =>
            player.equippedAugs.includes(id)
              ? {
                  label: `${getItem(id).name} 이식을 제거한다 (${getItem(id).description})`,
                  onClick: () => actions.unequipFromInventory(id),
                }
              : {
                  label: `${getItem(id).name} 이식한다 (${getItem(id).description})`,
                  onClick: () => actions.equipFromInventory(id),
                },
          ),
          {
            label: `가죽 ${bagCost}개로 가방을 키운다 (${carriedCount(player)} / ${capacityOf(player)})`,
            disabled: itemCount(player, 'leather') < bagCost,
            onClick: actions.upgradeBag,
          },
          {
            label: `기계부품 ${lightCost}개로 손전등을 개조한다 (최대 빛 ${maxLightOf(player)})`,
            disabled: itemCount(player, 'part') < lightCost,
            onClick: actions.upgradeLight,
          },
          { label: '돌아가기', onClick: actions.closeInventory },
        ]
      }
      case 'battle':
        return [
          { label: '공격', onClick: actions.attack },
          { label: '소지품', onClick: actions.openBattleItems },
          { label: '도망', disabled: enemy.boss, onClick: actions.flee },
        ]
      case 'battleItems':
        return [
          ...usableItems(player, ['heal']).map((id) => ({ label: itemHint(id), onClick: () => actions.useBattleItem(id) })),
          { label: '취소', onClick: actions.closeBattleItems },
        ]
      case 'battleEnd':
        return [{ label: '계속', onClick: actions.endBattle }]
      case 'ending':
        return [{ label: '다시 눈을 뜬다', onClick: actions.toTitle }]
      default:
        return []
    }
  })()

  // 화면 위쪽의 작은 메뉴. 전투 중에는 저장/종료를 막는다.
  const menu =
    screen === 'explore' || screen === 'inventory'
      ? [
          { label: '저장', onClick: actions.manualSave },
          { label: '처음으로', onClick: actions.toTitle },
        ]
      : []

  // 단말 접속 화면에서는 버튼 대신 계정/비밀번호 입력 칸을 보여준다.
  const terminal =
    screen === 'terminal'
      ? {
          onSubmit: actions.login,
          onNotebook: player.notebook.length ? actions.openNotebook : null,
          onLeave: actions.leaveTerminal,
        }
      : null

  // 잠긴 문 화면에서는 버튼 대신 비밀번호 입력 칸을 보여준다.
  const gate =
    screen === 'gate'
      ? {
          onSubmit: actions.unlockGate,
          onNotebook: player.notebook.length ? actions.openNotebook : null,
          onLeave: actions.leaveGate,
        }
      : null

  return { game, choices, menu, terminal, gate, actions }
}
