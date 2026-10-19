// 곁길의 방 로직. 통로의 at번째 칸을 지나면 문이 보이고, 방은 한 번만 들어갈 수 있다.
// enterRoom은 { player, logs: [{ text, type }], enemy: null | 방을 지키던 적, terminal?: true, room?: true }을 반환한다.
// 효과가 있는 방(휴게실·보급실·의무실·자료실·단말실)은 문을 지나도 효과가 곧장 적용되지 않는다.
// 대신 방 전용 화면으로 넘어가고, 그 안에서 직접 행동을 골라야(쉰다/치료받는다/쪽지를 읽는다/아이템을 챙긴다) 효과가 적용된다.
// 단말실은 그 화면이 접속 폼이고, 나머지 넷(ROOM_SCREENS)은 이 화면(useGame의 'room')으로 넘어간다.
// 실험실(lab)·매복(ambush)·막다른 길(dead)은 예전처럼 문을 지나자마자 곧장 결과가 나온다.
import { addItem, fillNote, gain, spawnEnemy } from './character.js'
import { config } from './config.js'
import { floors, items as itemData } from './data.js'
import { getFloor } from './mapgen.js'
import { josa, noteKey, normalizeCode, pick, randInt, roomKey } from './util.js'

const log = (text, type = 'normal') => ({ text, type })

export const ROOM_SCREENS = ['rest', 'supply', 'clinic', 'archive']

export const floorRooms = (player) => getFloor(player).rooms
export const isVisited = (player, index) => player.visited.includes(roomKey(player.floor, index))

// 지금 들어갈 수 있는 방. 문을 이미 발견했고(진행도가 문 위치 이상) 아직 안 가 본 방이다.
export function availableRooms(player) {
  return floorRooms(player)
    .map((room, index) => ({ room, index }))
    .filter(({ room, index }) => player.progress >= room.at && !isVisited(player, index))
}

// 방금 문 앞에 도착했을 때 알려주는 로그. 같은 at에 방이 두 개면 갈림길로 안내한다.
export function doorLogs(player) {
  const here = availableRooms(player).filter(({ room }) => room.at === player.progress)
  if (here.length >= 2) return [log('길이 두 갈래로 갈라진다.', 'event')]
  return here.map(({ room }) => log(`곁길이 보인다. 문패: ${room.name}`, 'event'))
}

// 방의 쪽지(notes)를 수첩에 적어 둔다. 이미 적은 것은 중복하지 않는다.
function jot(player, index) {
  const keys = floorRooms(player)[index].notes.map((_, i) => noteKey(player.floor, index, i))
  return { ...player, notebook: [...new Set([...player.notebook, ...keys])] }
}

// 방 종류별 효과. { player, enemy } 를 반환하고 logs에 문장을 덧붙인다. index는 이 층에서 방의 번호다.
// rest/supply/clinic/archive는 여기 없다 — 문을 지나도 곧장 적용되지 않고, 방 화면에서 직접 골라야
// 적용되는 효과라 아래쪽 restInRoom/takeSupplyItem/healInClinic/readArchive로 따로 뺐다.
// 장비를 먼저 손에 넣고(있으면 bonus 아이템도 함께), 그 뒤에 경비가 깨어난다. guards 중 하나가 매번 무작위로 나온다.
// lab(무기·방어구)과 implant(이식)이 공유한다 — 보상의 종류만 다를 뿐 흐름은 같다.
function labEffect(p, room, logs, index, rng) {
  logs.push(log(`${josa(itemData[room.reward].name, '을/를')} 손에 넣었다.`, 'good'))
  let player = addItem(p, room.reward)
  if (room.bonus) {
    const { player: withBonus, gained } = gain(player, room.bonus)
    player = withBonus
    logs.push(
      gained
        ? log(`${josa(itemData[room.bonus].name, '을/를')} 함께 챙겼다.`, 'good')
        : log(`${josa(itemData[room.bonus].name, '이/가')} 있었지만, 소지품이 가득 차 챙기지 못했다.`, 'muted'),
    )
  }
  const enemy = spawnEnemy(pick(room.guards, rng))
  logs.push(log('…그때, 무언가 깨어나는 기척이 난다.', 'bad'), log(enemy.appear, 'event'))
  return { player, enemy, foundGear: room.reward }
}

const effects = {
  lab: labEffect,
  implant: labEffect,

  // 막다른 길. 얻는 것 없이 room.text만 나오고 끝난다.
  dead(p) {
    return { player: p, enemy: null }
  },

  // 매복. 보상 없이 적이 바로 나타난다.
  ambush(p, room, logs) {
    const enemy = spawnEnemy(room.enemy)
    logs.push(log(enemy.appear, 'event'))
    return { player: p, enemy }
  },
}

export function enterRoom(player, index, rng = Math.random) {
  const room = floorRooms(player)[index]
  if (!room || isVisited(player, index) || player.progress < room.at) {
    return { player, logs: [log('그곳으로 갈 수 없다.', 'muted')], enemy: null }
  }
  const walked = { ...player, light: Math.max(0, player.light - config.roomLight) }
  const logs = room.text.map((t) => log(t))

  // 단말실은 접속에 성공해야 소진된다. 지금은 접속 화면으로 이어질 뿐이다.
  if (room.kind === 'terminal') return { player: walked, logs, enemy: null, terminal: true }
  // 별관 통로도 마찬가지로, 비밀번호를 맞혀야 소진된다. 지금은 잠긴 문 화면으로 이어질 뿐이다.
  if (room.kind === 'wing') return { player: walked, logs, enemy: null, wing: true }

  const consumed = { ...walked, visited: [...walked.visited, roomKey(player.floor, index)] }

  // 효과가 있는 방(휴게실·보급실·의무실·자료실)은 문을 지난 것만으로는 효과가 나오지 않는다.
  // 방 화면으로 넘어가서, 그 안에서 직접 행동을 골라야 한다.
  if (ROOM_SCREENS.includes(room.kind)) return { player: consumed, logs, enemy: null, room: true }

  return { ...effects[room.kind](consumed, room, logs, index, rng), logs }
}

// 아래 넷은 방 화면 안에서 직접 고르는 행동이다. 문은 이미 지났고(enterRoom에서 소진 처리됨), 그 안에서
// 실제 효과만 적용한다. logs만 새로 반환하고, enterRoom의 logs(방을 둘러본 문장)와는 따로 화면에 붙는다.
export function restInRoom(player) {
  const logs = [log('체력이 모두 회복되었다.', 'good')]
  return { player: { ...player, hp: player.maxHp, rests: config.restsPerFloor }, logs }
}

export function healInClinic(player, index) {
  const room = floorRooms(player)[index]
  const up = room.maxHp ?? config.clinicMaxHp
  const logs = [log(`최대 체력이 ${up} 늘었다. 체력이 모두 회복되었다.`, 'good')]
  return { player: { ...player, maxHp: player.maxHp + up, hp: player.maxHp + up }, logs }
}

export function readArchive(player, index) {
  const room = floorRooms(player)[index]
  const logs = room.notes.map((note) => log(fillNote(note, player), 'note'))
  return { player: jot(player, index), logs }
}

// 방 안의 조사 지점(room.searches). 정해진 행동(쉰다/치료받는다 등)과 별개로, 방을 나서기 전까지 하나씩 더 골라 볼 수 있다.
// item이 있으면 그것을 챙기고, enemy가 있으면 위험한 것과 마주쳐 전투로 이어진다. 둘 다 없으면 문장만 나온다.
// 이미 조사한 지점인지는 takeSupplyItem처럼 화면(useGame)이 따로 기억해서 다시 안 보여준다.
export function searchRoom(player, index, searchId) {
  const room = floorRooms(player)[index]
  const search = (room.searches ?? []).find((s) => s.id === searchId)
  if (!search) return { player, logs: [log('그런 곳은 없다.', 'muted')], enemy: null }
  const logs = search.text.map((t) => log(t))
  let next = player
  if (search.item) {
    const count = search.count ?? 1
    const { player: withItem, gained } = gain(player, search.item, count)
    next = withItem
    const label = count > 1 ? `${itemData[search.item].name} ${count}개` : itemData[search.item].name
    logs.push(gained ? log(`${josa(label, '을/를')} 챙겼다.`, 'good') : log('소지품이 가득 차 챙기지 못했다.', 'muted'))
  }
  const enemy = search.enemy ? spawnEnemy(search.enemy) : null
  if (enemy) logs.push(log(enemy.appear, 'event'))
  return { player: next, enemy, logs }
}

// itemId: room.items 중 하나. 이미 챙긴 것인지는 화면(useGame)이 따로 기억해서 다시 안 보여준다.
export function takeSupplyItem(player, index, itemId) {
  const room = floorRooms(player)[index]
  const count = room.items[itemId]
  if (!count) return { player, logs: [log('그런 것은 없다.', 'muted')] }
  const { player: withItem, gained } = gain(player, itemId, count)
  const logs = gained
    ? [log(`${itemData[itemId].name} ${count}개를 챙겼다.`, 'good')]
    : [log('소지품이 가득 차 챙기지 못했다.', 'muted')]
  return { player: withItem, logs }
}

// 단말에 접속한다. 반환값: { player, logs, ok }
// 계정은 그 순간의 피험자 번호라서, 쓰러져서 번호가 늘어나면 예전 번호로는 접속되지 않는다.
// 계정이 틀렸는지 비밀번호가 틀렸는지 알려주어, 조각을 맞춰 가는 도중에 어디까지 맞았는지 알 수 있다.
export function login(player, index, id, password) {
  const room = floorRooms(player)[index]
  if (!room || room.kind !== 'terminal' || isVisited(player, index) || player.progress < room.at) {
    return { player, logs: [log('단말을 쓸 수 없다.', 'muted')], ok: false }
  }
  if (normalizeCode(id) !== normalizeCode(fillNote(room.login.id, player))) {
    return { player, logs: [log('존재하지 않는 계정입니다.', 'bad')], ok: false }
  }
  const actualPassword = (room.login.passwordPrefix ?? '') + player.passwords[room.login.passwordIndex]
  if (normalizeCode(password) !== normalizeCode(actualPassword)) {
    return { player, logs: [log('계정은 확인되었다. 그러나 비밀번호가 일치하지 않는다.', 'bad')], ok: false }
  }
  const opened = { ...player, visited: [...player.visited, roomKey(player.floor, index)] }
  return { player: jot(opened, index), logs: room.notes.map((n) => log(fillNote(n, player), 'note')), ok: true }
}

// 별관 통로 문을 열어 본다. 반환값: { player, logs, ok }
// 맞으면 그 자리를 기억해 두고(branchReturn) 곧장 별관(room.enterFloor)으로 넘어간다. 틀리면 gate처럼 체력이 깎인다.
export function openWing(player, index, password, rng = Math.random) {
  const room = floorRooms(player)[index]
  if (!room || room.kind !== 'wing' || isVisited(player, index) || player.progress < room.at) {
    return { player, logs: [log('그럴 수 없다.', 'muted')], ok: false }
  }
  if (normalizeCode(password) !== normalizeCode(player.passwords[room.passwordIndex])) {
    const [min, max] = config.gateWrongDamage
    const dmg = Math.min(player.hp - 1, randInt(min, max, rng))
    return {
      player: { ...player, hp: player.hp - dmg },
      logs: [log(`붉은 경고등이 켜지며 손끝에 따끔한 전류가 흐른다. 체력 -${dmg}`, 'bad')],
      ok: false,
    }
  }
  const visited = { ...player, visited: [...player.visited, roomKey(player.floor, index)] }
  const next = {
    ...visited,
    floor: room.enterFloor,
    progress: 0,
    floorKnown: false,
    rests: config.restsPerFloor,
    dangerStreak: 0,
    branchReturn: { floor: player.floor, progress: room.at },
  }
  return { player: next, logs: room.openText.map((t) => log(t, 'good')), ok: true }
}

// 수첩을 펼쳤을 때 보여줄 로그. 읽은 쪽지를 층과 방별로 모아서 보여준다.
// 쪽지 속 피험자 번호는 지금 값으로 바뀌어 보이므로, 쓰러진 뒤에는 기록이 달라져 있다.
export function notebookLogs(player) {
  const owned = new Set(player.notebook)
  const logs = [log('— 수첩 —', 'header')]
  floors.forEach((floor, fi) => {
    floor.rooms.forEach((room, ri) => {
      const mine = (room.notes ?? []).filter((_, i) => owned.has(noteKey(fi, ri, i)))
      if (!mine.length) return
      logs.push(log(`${floor.name} · ${room.name}`, 'muted'))
      for (const text of mine) logs.push(log(fillNote(text, player), 'note'))
    })
  })
  if (logs.length === 1) logs.push(log('아직 적어 둔 것이 없다.', 'muted'))
  return logs
}
