import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyDefeat, attack, flee, useItemInBattle } from './battle.js'
import {
  attackOf,
  calcDamage,
  capacityOf,
  carriedCount,
  corruptionOf,
  createPlayer,
  defenseOf,
  equip,
  fillNote,
  gain,
  heal,
  insertionCount,
  maxLightOf,
  removeItem,
  restorePlayer,
  spawnEnemy,
  spawnFloorEnemy,
  subjectNumber,
  takeDamage,
  unequipAug,
} from './character.js'
import { config } from './config.js'
import { enemies, floors, items, roomKinds } from './data.js'
import { arrivalLog, atExit, climb, floorLogs, isFinalFloor, rest, retreat, returnFromWing, sightLogs, step } from './explore.js'
import { atGate, tryGate } from './gate.js'
import { upgradeBag, upgradeLight, usableItems, useItem, visibleInventory } from './items.js'
import { buildMap, mapGridSize, mapLegend, mapView, mapViewSize, pathCells, roomCell, viewOrigin } from './map.js'
import { generateMapLayout, getFloor } from './mapgen.js'
import {
  availableRooms,
  doorLogs,
  enterRoom,
  healInClinic,
  login,
  notebookLogs,
  openWing,
  readArchive,
  restInRoom,
  searchRoom,
  takeSupplyItem,
} from './rooms.js'
import { clearSave, hasSave, loadGame, saveGame } from './save.js'
import { josa, randomCodes, weightedPick } from './util.js'

const mid = () => 0.5 // 피해 편차 0이 되는 난수

// 잠긴 곳 비밀번호를 결정적으로 만들기 위한 고정 후보 번호.
// [게이트, 동쪽 별관, 단말, 서쪽 별관, 북쪽 별관, 남쪽 별관] 순서로 character.js의 PASSWORD_SLOT과 같다.
const FIXED_PASSWORDS = ['0326', '2645', '7319', '1183', '4408', '9052']
const dog = () => spawnEnemy('dog') // 들개: HP11 공격5 방어0 (플레이어는 공격6 방어2)
const total = (p) => Object.values(p.inventory).reduce((a, b) => a + b, 0)

// 사건 종류를 고르는 난수 (streak 0의 lit 기준 누적 비율: nothing .622 / loot .846 / enemy .876 / trap .938 / lost 1)
// enemy 비중은 dangerStreak(연속 무사고 걸음 수)이 늘수록 커지므로, 아래 값은 방금 막 걷기 시작한 상태 기준이다.
const NOTHING = () => 0
const LOOT = () => 0.7
const ENEMY = () => 0.86
const TRAP = () => 0.92
const LOST = () => 0.97

describe('util', () => {
  it('josa: 받침 유무에 맞는 조사를 붙인다', () => {
    expect(josa('들개', '이/가')).toBe('들개가')
    expect(josa('벽을 긁는 것', '이/가')).toBe('벽을 긁는 것이')
    expect(josa('문지기', '을/를')).toBe('문지기를')
    expect(josa('붕대', '을/를')).toBe('붕대를')
    expect(josa('지렛대', '을/를')).toBe('지렛대를')
    expect(josa('통조림', '을/를')).toBe('통조림을')
  })

  it('weightedPick: 가중치에 비례해 뽑는다', () => {
    expect(weightedPick({ a: 1, b: 3 }, () => 0.1)).toBe('a')
    expect(weightedPick({ a: 1, b: 3 }, () => 0.3)).toBe('b')
    expect(weightedPick({ a: 1, b: 3 }, () => 0.999)).toBe('b')
  })

  it('randomCodes: 서로 겹치지 않는 4자리 숫자를 요청한 개수만큼 뽑는다', () => {
    const codes = randomCodes(9, Math.random)
    expect(codes).toHaveLength(9)
    expect(new Set(codes).size).toBe(9)
    codes.forEach((c) => expect(c).toMatch(/^\d{4}$/))
  })

  it('randomCodes: rng가 매번 같은 값만 돌려줘도(테스트처럼 고정돼 있어도) 멈추지 않고 끝난다', () => {
    const codes = randomCodes(9, () => 0)
    expect(codes).toHaveLength(9)
    expect(new Set(codes).size).toBe(9) // 뽑기 방식(Fisher-Yates) 자체가 겹침을 만들지 않는다
  })
})

describe('data', () => {
  it('14개 층이 있고, 층 데이터가 가리키는 아이템/적이 모두 존재한다', () => {
    expect(floors).toHaveLength(14)
    floors.forEach((f) => {
      f.enemies.forEach((id) => expect(enemies[id]).toBeDefined())
      Object.keys(f.loot).forEach((id) => expect(items[id]?.type).toMatch(/heal|light/))
      f.finds.forEach((find) => {
        expect(items[find.item]).toBeDefined()
        expect(find.at).toBeGreaterThanOrEqual(1)
        expect(find.at).toBeLessThanOrEqual(f.length)
      })
      expect(f.sign.at).toBeGreaterThanOrEqual(1)
      expect(f.sign.at).toBeLessThanOrEqual(f.length)
      expect(f.sign.text.length).toBeGreaterThan(0)
      expect(f.sign.text.at(-1)).toBe(`「${f.name} · ${f.place}」`) // 이정표 마지막 줄은 몇 층·어디인지 밝힌다
    })
  })

  it('층 이름은 지하 10층부터 지하 1층까지 차례로 이어지고, 그 뒤에 네 방향 별관이 따라붙는다', () => {
    expect(floors.slice(0, 10).map((f) => f.name)).toEqual(Array.from({ length: 10 }, (_, i) => `지하 ${10 - i}층`))
    const wingNames = floors.slice(10).map((f) => f.name)
    expect(wingNames).toEqual(['동쪽 별관', '서쪽 별관', '남쪽 별관', '북쪽 별관'])
    floors.slice(10).forEach((f) => expect(f.wing).toBe(true))
  })

  it('곁길의 방은 종류에 맞는 내용을 갖고, 통로나 다른 방과 겹치지 않는다', () => {
    for (const f of floors) {
      const cells = pathCells(f.path)
      const taken = new Set(cells.map((c) => `${c.x},${c.y}`))
      for (const room of f.rooms) {
        expect(roomKinds[room.kind]).toBeDefined()
        expect(room.at).toBeGreaterThanOrEqual(1)
        expect(room.at).toBeLessThanOrEqual(f.length)
        expect(room.text.length).toBeGreaterThan(0)
        const c = roomCell(cells, room)
        expect(taken.has(`${c.x},${c.y}`)).toBe(false) // 통로 또는 다른 방과 같은 칸이 아니다
        taken.add(`${c.x},${c.y}`)

        if (room.kind === 'supply') Object.keys(room.items).forEach((id) => expect(items[id]).toBeDefined())
        if (room.kind === 'archive') expect(room.notes.length).toBeGreaterThan(0)
        if (room.kind === 'lab') {
          expect(items[room.reward]?.type).toMatch(/weapon|armor/)
          expect(room.guards.length).toBeGreaterThan(0)
          room.guards.forEach((id) => expect(enemies[id]).toBeDefined())
        }
        if (room.kind === 'implant') {
          expect(items[room.reward]?.type).toBe('aug')
          expect(room.guards.length).toBeGreaterThan(0)
          room.guards.forEach((id) => expect(enemies[id]).toBeDefined())
        }
        if (room.kind === 'terminal') {
          expect(room.login.id).toBeTruthy()
          expect(room.login.passwordPrefix).toBeTruthy()
          expect(Number.isInteger(room.login.passwordIndex)).toBe(true)
          expect(room.notes.length).toBeGreaterThan(0)
        }
        if (room.kind === 'wing') {
          expect(Number.isInteger(room.passwordIndex)).toBe(true)
          expect(Number.isInteger(room.enterFloor)).toBe(true)
          expect(floors[room.enterFloor]).toBeDefined()
          expect(room.openText.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('단말의 계정과 비밀번호는 쪽지에 조각으로만 나뉘어 있고, 어느 쪽지에도 완성된 값이 없다 (번호도 비밀번호도 판마다 바뀌지만 마찬가지)', () => {
    const rooms = floors.flatMap((f) => f.rooms)
    const terminal = rooms.find((r) => r.kind === 'terminal')
    const pwWord = terminal.login.passwordPrefix.replace(/[^A-Z]/gi, '') // GATE
    const archiveNotes = rooms.filter((r) => r.kind === 'archive').flatMap((r) => r.notes)

    // 0번 쓰러졌을 때(0417), 1번(0418), 83번(0500: 앞 두 자리가 바뀐다). 비밀번호도 매번 새로 뽑힌 값이다.
    for (const deaths of [0, 1, 83]) {
      const p = { ...createPlayer(), deaths }
      const number = subjectNumber(p)
      const pwDigits = p.passwords[terminal.login.passwordIndex]
      const notes = archiveNotes.map((n) => fillNote(n, p))
      const has = (s) => notes.some((n) => n.includes(s))

      // 조각은 각각 어딘가에 있어서, 모두 모으면 완성할 수 있다.
      for (const piece of ['SUBJ', number.slice(0, 2), number.slice(2), pwWord, pwDigits.slice(0, 2), pwDigits.slice(2)]) {
        expect(has(piece)).toBe(true)
      }
      // 완성된 값은 어느 쪽지에도 통째로 적혀 있지 않다.
      for (const whole of [number, fillNote(terminal.login.id, p), terminal.login.passwordPrefix + pwDigits, pwDigits]) {
        expect(has(whole)).toBe(false)
      }
    }
  })

  it('쪽지의 자리표시자는 모두 채워진다 ({번호} 같은 글자가 그대로 남지 않는다)', () => {
    const p = createPlayer()
    for (const room of floors.flatMap((f) => f.rooms)) {
      for (const note of room.notes ?? []) expect(fillNote(note, p)).not.toMatch(/[{}]/)
      if (room.login) expect(fillNote(room.login.id, p)).not.toMatch(/[{}]/)
    }
  })

  it('방의 종류마다 지도에 그려질 글자가 서로 다르다', () => {
    const symbols = Object.values(roomKinds).map((k) => k.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
    expect(symbols.every((s) => /^[A-Z]$/.test(s) && !'@^'.includes(s))).toBe(true)
  })
})

describe('character', () => {
  it('createPlayer: 인벤토리는 설정 원본과 공유되지 않는다', () => {
    const p = createPlayer()
    p.inventory.bandage = 999
    expect(config.player.items.bandage).toBe(2)
  })

  it('createPlayer: 판마다 서로 겹치지 않는 4자리 비밀번호 9개를 뽑는다', () => {
    const p = createPlayer()
    expect(p.passwords).toHaveLength(9)
    expect(new Set(p.passwords).size).toBe(9)
    p.passwords.forEach((v) => expect(v).toMatch(/^\d{4}$/))
  })

  it('attackOf / defenseOf: 장착한 장비만 적용되고, 가지고만 있으면 적용되지 않는다', () => {
    const owned = { ...createPlayer(), inventory: { pipe: 1, crowbar: 1, overalls: 1 } }
    expect(attackOf(owned)).toBe(config.player.attack) // 가지고만 있을 뿐 장착 전이라 그대로다
    expect(defenseOf(owned)).toBe(config.player.defense)

    const p = equip(equip(owned, 'crowbar'), 'overalls')
    expect(attackOf(p)).toBe(config.player.attack + 4)
    expect(defenseOf(p)).toBe(config.player.defense + 2)
    expect(attackOf(createPlayer())).toBe(config.player.attack)
  })

  it('equip: 같은 종류를 이미 장착했으면 갈아 끼우고, 소지품에서는 사라지지 않는다', () => {
    const p = { ...createPlayer(), inventory: { pipe: 1, crowbar: 1 } }
    const withPipe = equip(p, 'pipe')
    expect(withPipe.equipped.weapon).toBe('pipe')
    const withCrowbar = equip(withPipe, 'crowbar')
    expect(withCrowbar.equipped.weapon).toBe('crowbar')
    expect(withCrowbar.inventory.pipe).toBe(1) // 갈아 껴도 소지품에서 사라지지 않는다

    expect(equip(p, 'bandage')).toBe(p) // 장비가 아니면 그대로다
  })

  it('equip: 이식(aug)은 무기·방어구와 달리 여러 개를 동시에 장착할 수 있다', () => {
    const p = { ...createPlayer(), inventory: { neuralBooster: 1, steelFrame: 1 } }
    const withOne = equip(p, 'neuralBooster')
    expect(withOne.equippedAugs).toEqual(['neuralBooster'])
    const withTwo = equip(withOne, 'steelFrame')
    expect(withTwo.equippedAugs).toEqual(['neuralBooster', 'steelFrame'])
    expect(equip(withTwo, 'neuralBooster')).toBe(withTwo) // 이미 장착한 이식을 또 장착하면 그대로다

    expect(unequipAug(withTwo, 'neuralBooster').equippedAugs).toEqual(['steelFrame'])
  })

  it('attackOf / defenseOf: 이식도 장착한 것만 반영되고, stat이 맞는 것만 더해진다', () => {
    const owned = { ...createPlayer(), inventory: { neuralBooster: 1, steelFrame: 1 } }
    expect(attackOf(owned)).toBe(config.player.attack) // 장착 전이라 그대로다
    const p = equip(equip(owned, 'neuralBooster'), 'steelFrame')
    expect(attackOf(p)).toBe(config.player.attack + 3) // neuralBooster(attack)만 더해진다
    expect(defenseOf(p)).toBe(config.player.defense + 3) // steelFrame(defense)만 더해진다
  })

  it('corruptionOf: 장착 중인 이식들의 변질도를 더한다', () => {
    const p = { ...createPlayer(), inventory: { neuralBooster: 1, extraArm: 1 } }
    expect(corruptionOf(p)).toBe(0)
    const withOne = equip(p, 'neuralBooster')
    expect(corruptionOf(withOne)).toBe(20)
    const withTwo = equip(withOne, 'extraArm')
    expect(corruptionOf(withTwo)).toBe(45)
    expect(corruptionOf(unequipAug(withTwo, 'neuralBooster'))).toBe(25)
  })

  it('피험자 번호와 투입 횟수는 쓰러질 때마다 1씩 늘어난다', () => {
    const p = createPlayer()
    expect(subjectNumber(p)).toBe('0417')
    expect(insertionCount(p)).toBe(5)
    expect(subjectNumber({ ...p, deaths: 1 })).toBe('0418')
    expect(insertionCount({ ...p, deaths: 1 })).toBe(6)
    expect(subjectNumber({ ...p, deaths: 83 })).toBe('0500') // 자리 올림
    expect(subjectNumber({ ...p, deaths: 10000 - 417 })).toBe('0000') // 네 자리를 넘기면 처음으로
  })

  it('applyDefeat로 쓰러지면 피험자 번호가 늘어난다', () => {
    const p = createPlayer()
    expect(subjectNumber(applyDefeat({ ...p, hp: 0 }).player)).toBe('0418')
  })

  it('fillNote: 자리표시자를 현재 번호와 투입 횟수로 바꾼다', () => {
    const p = { ...createPlayer(), deaths: 2 } // 0419, 7번째
    expect(fillNote('번호 {번호앞}■■ / ■■{번호뒤} / {번호} / {투입}번째', p)).toBe('번호 04■■ / ■■19 / 0419 / 7번째')
    expect(fillNote('자리표시자 없음', p)).toBe('자리표시자 없음')
  })

  it('calcDamage: 공격-방어 기준이며 최소 1', () => {
    expect(calcDamage(8, 1, mid)).toBe(7)
    expect(calcDamage(1, 100, mid)).toBe(1)
  })

  it('takeDamage / heal: 범위를 벗어나지 않는다', () => {
    expect(takeDamage({ hp: 5 }, 99).hp).toBe(0)
    const r = heal({ hp: 40, maxHp: 50 }, 30)
    expect(r.character.hp).toBe(50)
    expect(r.healed).toBe(10)
  })

  it('removeItem: 부족하면 null, 0개가 되면 키를 지운다', () => {
    const p = createPlayer()
    expect(removeItem(p, 'bandage', 3)).toBeNull()
    expect(removeItem(p, 'bandage', 2).inventory).not.toHaveProperty('bandage')
  })

  it('carriedCount / capacityOf: 소모품·재료·강화 아이템만 용량을 차지하고, 장비는 차지하지 않는다', () => {
    const p = { ...createPlayer(), inventory: { bandage: 3, battery: 2, leather: 4, serum: 1, pipe: 1, vest: 1 } }
    expect(carriedCount(p)).toBe(10) // 3 + 2 + 4 + 1. pipe(무기)·vest(방어구)는 세지 않는다
    expect(capacityOf(p)).toBe(config.inventory.baseCapacity)
    expect(capacityOf({ ...p, bagLevel: 2 })).toBe(config.inventory.baseCapacity + config.inventory.capacityPerUpgrade * 2)
  })

  it('gain: 가방이 가득 차면 소모품·재료는 못 얻지만, 장비는 용량과 상관없이 항상 얻는다', () => {
    const full = { ...createPlayer(), inventory: { bandage: config.inventory.baseCapacity } }
    const blocked = gain(full, 'battery')
    expect(blocked.gained).toBe(false)
    expect(blocked.player).toBe(full) // 못 얻으면 원래 player 그대로다

    const gearOk = gain(full, 'pipe')
    expect(gearOk.gained).toBe(true)
    expect(gearOk.player.inventory.pipe).toBe(1)

    const stacked = gain(createPlayer(), 'leather', 3)
    expect(stacked.gained).toBe(true)
    expect(stacked.player.inventory.leather).toBe(3)
  })

  it('spawnEnemy: 체력이 가득 찬 새 적을 만들고 원본 데이터는 변하지 않는다', () => {
    const e = spawnEnemy('dog')
    expect(e.hp).toBe(e.maxHp)
    takeDamage(e, 5)
    expect(enemies.dog).not.toHaveProperty('hp')
  })

  it('spawnFloorEnemy: 그 층에 나오는 적만 나온다', () => {
    for (let i = 0; i < 50; i += 1) expect(floors[0].enemies).toContain(spawnFloorEnemy(0).id)
  })

  it('restorePlayer: 손상된 데이터는 거부하고 값은 범위 안으로 고친다', () => {
    const base = createPlayer()
    expect(restorePlayer(null)).toBeNull()
    expect(restorePlayer({ ...base, hp: NaN })).toBeNull()
    expect(restorePlayer({ ...base, floor: 99 })).toBeNull()
    expect(restorePlayer({ ...base, floor: 1.5 })).toBeNull()

    const p = restorePlayer({ ...base, hp: 9999, light: -5, progress: 99, inventory: { bandage: 2, fake: 5, battery: -1 } })
    expect(p.hp).toBe(p.maxHp)
    expect(p.light).toBe(0)
    expect(p.progress).toBe(floors[0].length)
    expect(p.inventory).toEqual({ bandage: 2 })
  })

  it('restorePlayer: 없는 항목(걸음 수, 사망 횟수 등)은 기본값으로 채운다', () => {
    const old = { ...createPlayer(), steps: undefined, deaths: undefined, rests: undefined }
    expect(restorePlayer(old)).toMatchObject({ steps: 0, deaths: 0, rests: config.restsPerFloor })
  })

  it('restorePlayer: 다녀온 방 기록은 존재하는 방만 남기고 중복은 합치며, 없으면 빈 목록이다', () => {
    const base = createPlayer()
    expect(restorePlayer({ ...base, visited: ['0:0', '0:0', '99:0', '0:9', 'abc', 5] }).visited).toEqual(['0:0'])
    expect(restorePlayer({ ...base, visited: 'nope' }).visited).toEqual([])
    expect(restorePlayer({ ...base, visited: undefined }).visited).toEqual([])
  })

  it('restorePlayer: 수첩 기록도 존재하는 쪽지만 남기고 중복은 합치며, 없으면 빈 목록이다', () => {
    const base = createPlayer()
    expect(restorePlayer({ ...base, notebook: ['2:0:0', '2:0:0', '99:0:0', '2:0:99', 'x', 7] }).notebook).toEqual(['2:0:0'])
    expect(restorePlayer({ ...base, notebook: 'nope' }).notebook).toEqual([])
    expect(restorePlayer({ ...base, notebook: undefined }).notebook).toEqual([])
  })

  it('restorePlayer: 연 문 기록도 문이 있는 층만 남기고 중복은 합치며, 없으면 빈 목록이다', () => {
    const base = createPlayer()
    const gateFloor = String(floors.findIndex((f) => f.gate))
    expect(restorePlayer({ ...base, gatesOpen: [gateFloor, gateFloor, '99', 'x'] }).gatesOpen).toEqual([gateFloor])
    expect(restorePlayer({ ...base, gatesOpen: 'nope' }).gatesOpen).toEqual([])
    expect(restorePlayer({ ...base, gatesOpen: undefined }).gatesOpen).toEqual([])
  })

  it('restorePlayer: 장착 중인 이식은 종류가 aug이고 아직 가지고 있어야 유효하고, 중복은 합치며, 없으면 빈 목록이다', () => {
    const base = { ...createPlayer(), inventory: { neuralBooster: 1, pipe: 1 } }
    expect(
      restorePlayer({ ...base, equippedAugs: ['neuralBooster', 'neuralBooster', 'pipe', 'fake', 'extraArm'] }).equippedAugs,
    ).toEqual(['neuralBooster']) // pipe(무기)·fake(없는 id)·extraArm(안 가지고 있음)은 걸러진다
    expect(restorePlayer({ ...base, equippedAugs: 'nope' }).equippedAugs).toEqual([])
    expect(restorePlayer({ ...base, equippedAugs: undefined }).equippedAugs).toEqual([])
  })

  it('restorePlayer: 가방을 키운 횟수(bagLevel)가 없거나 이상하면 0으로 채운다', () => {
    const base = createPlayer()
    expect(restorePlayer({ ...base, bagLevel: undefined }).bagLevel).toBe(0)
    expect(restorePlayer({ ...base, bagLevel: -3 }).bagLevel).toBe(0)
    expect(restorePlayer({ ...base, bagLevel: 4 }).bagLevel).toBe(4)
  })

  it('restorePlayer: 비밀번호 9개가 온전하면 그대로 두고, 없거나 손상됐으면(이 기능이 생기기 전 저장 등) 새로 뽑는다', () => {
    const base = createPlayer()
    expect(restorePlayer(base).passwords).toEqual(base.passwords)

    const noPasswords = { ...base, passwords: undefined }
    const regenerated = restorePlayer(noPasswords).passwords
    expect(regenerated).toHaveLength(9)
    expect(new Set(regenerated).size).toBe(9)

    const duplicated = ['0000', '0000', '0002', '0003', '0004', '0005', '0006', '0007', '0008']
    expect(restorePlayer({ ...base, passwords: duplicated }).passwords).not.toEqual(duplicated) // 9개 중 중복이 있다
    expect(restorePlayer({ ...base, passwords: ['12', '34', '56'] }).passwords).toHaveLength(9) // 개수도 자릿수도 틀렸다
  })

  it('restorePlayer: 손전등을 개조한 횟수(lightLevel)가 없거나 이상하면 0으로 채우고, 늘어난 최대치까지는 빛을 그대로 인정한다', () => {
    const base = createPlayer()
    expect(restorePlayer({ ...base, lightLevel: undefined }).lightLevel).toBe(0)
    expect(restorePlayer({ ...base, lightLevel: -3 }).lightLevel).toBe(0)

    const p = restorePlayer({ ...base, lightLevel: 2, light: 9999 })
    expect(p.lightLevel).toBe(2)
    expect(p.light).toBe(maxLightOf(p)) // 개조된 최대치(기본 + 2단계)를 넘지 못하고 거기서 잘린다
    expect(maxLightOf(p)).toBe(config.player.baseMaxLight + config.flashlight.capacityPerUpgrade * 2)
  })
})

describe('items', () => {
  it('useItem(heal): 체력이 가득 차 있으면 소모하지 않는다', () => {
    const r = useItem(createPlayer(), 'bandage')
    expect(r.ok).toBe(false)
    expect(r.player.inventory.bandage).toBe(2)
  })

  it('useItem(heal): 회복하고 1개 소모한다', () => {
    const r = useItem({ ...createPlayer(), hp: 10 }, 'bandage')
    expect(r.ok).toBe(true)
    expect(r.player.hp).toBe(30)
    expect(r.player.inventory.bandage).toBe(1)
  })

  it('useItem(light): 충전하되 최대치를 넘지 않고, 가득이면 소모하지 않는다', () => {
    const cap = maxLightOf(createPlayer())
    const r = useItem({ ...createPlayer(), light: cap - 10 }, 'battery')
    expect(r.player.light).toBe(cap)
    expect(r.player.inventory).not.toHaveProperty('battery')
    expect(useItem({ ...createPlayer(), light: cap }, 'battery').ok).toBe(false)
  })

  it('useItem(vitality): 최대 체력이 영구히 늘고 체력이 가득 찬다', () => {
    const r = useItem({ ...createPlayer(), hp: 5, inventory: { serum: 1 } }, 'serum')
    expect(r.ok).toBe(true)
    expect(r.player.maxHp).toBe(config.player.maxHp + 15)
    expect(r.player.hp).toBe(r.player.maxHp)
    expect(r.player.inventory).not.toHaveProperty('serum')
  })

  it('useItem: 장비는 사용할 수 없다', () => {
    const p = { ...createPlayer(), inventory: { pipe: 1 } }
    expect(useItem(p, 'pipe').ok).toBe(false)
  })

  it('usableItems: 전투 중에는 회복 아이템만 고를 수 있다', () => {
    const p = { ...createPlayer(), inventory: { bandage: 1, battery: 1, serum: 1, pipe: 1 } }
    expect(usableItems(p).sort()).toEqual(['bandage', 'battery', 'serum'])
    expect(usableItems(p, ['heal'])).toEqual(['bandage'])
  })

  it('visibleInventory: 가진 것은 다 보여주고, 장착 중인 장비만 equipped로 표시한다', () => {
    const p = equip({ ...createPlayer(), inventory: { pipe: 1, crowbar: 1, bandage: 2 } }, 'crowbar')
    expect(visibleInventory(p).map((i) => i.id).sort()).toEqual(['bandage', 'crowbar', 'pipe'])
    const byId = Object.fromEntries(visibleInventory(p).map((i) => [i.id, i.equipped]))
    expect(byId).toEqual({ bandage: false, crowbar: true, pipe: false })
  })

  it('upgradeBag: 가죽이 모자라면 실패하고, 충분하면 가죽을 써서 용량을 늘린다', () => {
    const cost = config.inventory.upgradeLeatherCost
    const short = { ...createPlayer(), inventory: { leather: cost - 1 } }
    const failed = upgradeBag(short)
    expect(failed.ok).toBe(false)
    expect(failed.player).toBe(short)

    const p = { ...createPlayer(), inventory: { leather: cost } }
    const r = upgradeBag(p)
    expect(r.ok).toBe(true)
    expect(r.player.bagLevel).toBe(1)
    expect(r.player.inventory).not.toHaveProperty('leather') // 다 써서 0개가 되면 키가 지워진다
    expect(capacityOf(r.player)).toBe(config.inventory.baseCapacity + config.inventory.capacityPerUpgrade)
  })

  it('upgradeLight: 기계부품이 모자라면 실패하고, 충분하면 기계부품을 써서 최대 빛을 늘린다', () => {
    const cost = config.flashlight.upgradePartCost
    const short = { ...createPlayer(), inventory: { part: cost - 1 } }
    const failed = upgradeLight(short)
    expect(failed.ok).toBe(false)
    expect(failed.player).toBe(short)

    const p = { ...createPlayer(), inventory: { part: cost } }
    const r = upgradeLight(p)
    expect(r.ok).toBe(true)
    expect(r.player.lightLevel).toBe(1)
    expect(r.player.inventory).not.toHaveProperty('part')
    expect(maxLightOf(r.player)).toBe(config.player.baseMaxLight + config.flashlight.capacityPerUpgrade)
  })
})

describe('explore', () => {
  it('step: 걸음 수가 늘고 빛이 줄며, 별일 없으면 한 칸 나아간다', () => {
    const p = createPlayer()
    const r = step(p, NOTHING)
    expect(r.player.progress).toBe(1)
    expect(r.player.steps).toBe(1)
    expect(r.player.light).toBe(p.light - config.lightPerStep)
    expect(r.enemy).toBeNull()
    expect(r.logs).toHaveLength(1)
  })

  it('step: 정해진 걸음에서는 반드시 장비를 얻고, 이미 있으면 얻지 않는다', () => {
    const at = floors[0].finds[0].at
    const r = step({ ...createPlayer(), progress: at - 1 }, LOST) // 난수와 상관없이 발견
    expect(r.player.inventory.pipe).toBe(1)
    expect(r.player.progress).toBe(at)

    const again = step({ ...createPlayer(), progress: at - 1, inventory: { pipe: 1 }, floorKnown: true }, NOTHING)
    expect(again.player.inventory.pipe).toBe(1)
    expect(again.logs[0].type).toBe('muted')
  })

  it('step(loot): 소모품 하나를 찾고 한 칸 나아간다', () => {
    const p = createPlayer()
    const r = step(p, LOOT)
    expect(total(r.player)).toBe(total(p) + 1)
    expect(r.player.progress).toBe(1)
    expect(r.logs[0].type).toBe('good')
  })

  it('step(enemy): 적을 만나고 한 칸 나아간다', () => {
    const r = step(createPlayer(), ENEMY)
    expect(r.enemy).not.toBeNull()
    expect(r.enemy.hp).toBe(r.enemy.maxHp)
    expect(r.player.progress).toBe(1)
    expect(r.logs[0].text).toBe(r.enemy.appear)
  })

  it('step(trap): 체력을 잃지만 함정으로는 쓰러지지 않는다', () => {
    const r = step({ ...createPlayer(), hp: 2 }, TRAP)
    expect(r.player.hp).toBe(1)
    expect(step(createPlayer(), TRAP).player.hp).toBeLessThan(config.player.maxHp)
  })

  it('step(lost): 한 칸 되돌아가되 0 아래로는 내려가지 않는다', () => {
    expect(step({ ...createPlayer(), progress: 3, floorKnown: true }, LOST).player.progress).toBe(2)
    expect(step(createPlayer(), LOST).player.progress).toBe(0)
  })

  it('step: 빛이 꺼지면 같은 난수에서도 적을 더 자주 만난다', () => {
    const rng = () => 0.55
    expect(step(createPlayer(), rng).enemy).toBeNull() // 빛 있음: 사건 없음
    expect(step({ ...createPlayer(), light: 0 }, rng).enemy).not.toBeNull() // 빛 없음: 적
  })

  it('step: 빛이 마지막으로 꺼지는 순간 알려준다', () => {
    const r = step({ ...createPlayer(), light: 1 }, NOTHING)
    expect(r.player.light).toBe(0)
    expect(r.logs.some((l) => l.text.includes('꺼졌다'))).toBe(true)
  })

  it('step: 마지막 칸에 도착하면 계단을 찾았다는 로그가 붙는다', () => {
    const p = { ...createPlayer(), progress: floors[0].length - 1 }
    const r = step(p, NOTHING)
    expect(atExit(r.player)).toBe(true)
    expect(r.logs.at(-1)).toEqual(arrivalLog(r.player))
  })

  it('arrivalLog: 도착 전에는 null이고, 마지막 층은 문 앞이라고 알린다', () => {
    expect(arrivalLog(createPlayer())).toBeNull()
    const last = floors.findIndex((f) => f.final)
    expect(arrivalLog({ ...createPlayer(), floor: last, progress: floors[last].length }).text).toContain('철문')
  })

  it('rest: 체력을 회복하고 횟수를 하나 쓴다', () => {
    const r = rest({ ...createPlayer(), hp: 20 }, mid)
    expect(r.player.hp).toBe(20 + config.restHeal)
    expect(r.player.rests).toBe(config.restsPerFloor - 1)
    expect(r.enemy).toBeNull()
  })

  it('rest: 낮은 난수에서는 쉬다가 습격당한다', () => {
    const r = rest({ ...createPlayer(), hp: 20 }, () => 0.1)
    expect(r.enemy).not.toBeNull()
    expect(r.player.hp).toBe(20 + config.restHeal)
  })

  it('rest: 횟수가 없거나 체력이 가득이면 아무것도 소모하지 않는다', () => {
    const none = { ...createPlayer(), hp: 20, rests: 0 }
    expect(rest(none, mid).player).toBe(none)
    const full = createPlayer()
    expect(rest(full, mid).player).toBe(full)
  })

  it('climb: 다음 층으로 올라가고 진행도·휴식 횟수·이정표를 아는지가 초기화된다', () => {
    const r = climb({ ...createPlayer(), progress: 6, rests: 0, floorKnown: true })
    expect(r.player.floor).toBe(1)
    expect(r.player.progress).toBe(0)
    expect(r.player.rests).toBe(config.restsPerFloor)
    expect(r.player.floorKnown).toBe(false) // 새 층은 이정표를 다시 찾아야 한다
    expect(r.logs.some((l) => l.text === '— ??? —')).toBe(true)
  })

  it('floorLogs: 이정표를 찾기 전까지는 몇 층·어디인지 대신 ???만 보인다', () => {
    expect(floorLogs(createPlayer())[0].text).toBe('— ??? —')
    expect(floorLogs({ ...createPlayer(), floorKnown: true })[0].text).toBe('— 지하 10층 · 배수로 —')
  })

  it('step: 이정표가 있는 칸에 닿으면 반드시 몇 층·어디인지 알아내고, 그 뒤로는 다시 나오지 않는다', () => {
    const sign = floors[0].sign
    const p = { ...createPlayer(), progress: sign.at - 1 }
    const r = step(p, NOTHING) // 난수와 상관없이 이정표를 찾는다
    expect(r.player.progress).toBe(sign.at)
    expect(r.player.floorKnown).toBe(true)
    expect(r.logs[0].text).toBe(sign.text[0])
    expect(r.logs.some((l) => l.text === `「${floors[0].name} · ${floors[0].place}」`)).toBe(true)

    // 이미 알고 있으면 그 칸을 다시 지나도 이정표 문구가 나오지 않는다
    const again = step({ ...p, floorKnown: true }, NOTHING)
    expect(again.logs.every((l) => !sign.text.includes(l.text))).toBe(true)
  })

  it('step: 잠긴 문 앞에서는 나아가지 못하고 막혔다는 로그만 남는다', () => {
    const gateFloor = floors.findIndex((f) => f.gate)
    const p = { ...createPlayer(), floor: gateFloor, progress: floors[gateFloor].gate.at - 1 }
    const r = step(p, NOTHING)
    expect(r.player).toBe(p)
    expect(r.logs).toHaveLength(1)
    expect(r.logs[0].text).toContain('잠긴 문')
  })

  it('retreat: 한 걸음 물러나되 빛은 줄지 않고 사건도 일어나지 않는다', () => {
    const p = { ...createPlayer(), progress: 5, light: 20 }
    const r = retreat(p)
    expect(r.player.progress).toBe(4)
    expect(r.player.light).toBe(20)
    expect(r.enemy).toBeNull()
  })

  it('retreat: 입구까지 물러났으면 더 물러날 수 없다', () => {
    const p = createPlayer()
    const r = retreat(p)
    expect(r.player).toBe(p)
    expect(r.logs).toEqual([{ text: '더 물러날 곳이 없다.', type: 'muted' }])
  })

  it('retreat: 물러난 자리에 갈림길이 있으면 다시 안내된다', () => {
    // 지하 10층 16칸째: 왼쪽 갈림길(보급) / 오른쪽 갈림길(막다른 길)
    const r = retreat({ ...createPlayer(), progress: 17 })
    expect(r.player.progress).toBe(16)
    expect(r.logs.some((l) => l.text === '길이 두 갈래로 갈라진다.')).toBe(true)
  })
})

describe('gate', () => {
  const GATE_FLOOR = floors.findIndex((f) => f.gate)
  const gate = floors[GATE_FLOOR].gate
  const at = (progress, extra = {}) => ({ ...createPlayer(), passwords: FIXED_PASSWORDS, floor: GATE_FLOOR, progress, ...extra })

  it('문 비밀번호는 같은 층의 자료실 쪽지에 적혀 있다', () => {
    const archive = floors[GATE_FLOOR].rooms.find((r) => r.kind === 'archive')
    expect(fillNote(archive.notes.join(' '), at(0))).toContain(FIXED_PASSWORDS[gate.passwordIndex])
  })

  it('atGate: 문 바로 앞(at - 1)에서만 참이고, 이미 열었으면 거짓이다', () => {
    expect(atGate(at(gate.at - 2))).toBe(false) // 아직 못 미쳤다
    expect(atGate(at(gate.at - 1))).toBe(true) // 문 앞
    expect(atGate(at(gate.at - 1, { gatesOpen: [String(GATE_FLOOR)] }))).toBe(false)
  })

  it('sightLogs: 문 앞에 서면 안내가 붙고, 열면 더는 안내되지 않는다', () => {
    expect(sightLogs(at(gate.at - 1)).some((l) => l.text.includes('잠긴 문'))).toBe(true)
    expect(sightLogs(at(gate.at - 2)).some((l) => l.text.includes('잠긴 문'))).toBe(false)
    expect(sightLogs(at(gate.at - 1, { gatesOpen: [String(GATE_FLOOR)] })).some((l) => l.text.includes('잠긴 문'))).toBe(
      false,
    )
  })

  it('문 앞이라도 이미 문을 지난 곁길의 방(대문자·비밀번호 단서)은 그대로 들어갈 수 있다', () => {
    const names = availableRooms(at(gate.at - 1)).map((r) => r.room.name)
    expect(names).toContain('동관 사무실')
    expect(names).not.toContain('부품 창고') // 문 너머(서관)라 아직 안 보인다
  })

  it('tryGate: 비밀번호가 틀리면 체력이 깎이고 문은 그대로 잠겨 있어 다시 시도할 수 있다', () => {
    const p = at(gate.at - 1, { hp: 40 })
    const r = tryGate(p, '0000', mid)
    expect(r.ok).toBe(false)
    expect(r.player.hp).toBeLessThan(p.hp)
    expect(atGate(r.player)).toBe(true)
    expect(r.player.gatesOpen).toEqual([])
  })

  it('tryGate: 비밀번호가 맞으면 열리고, 대소문자·하이픈·공백은 무시한다', () => {
    const r = tryGate(at(gate.at - 1), ' 03-26 ')
    expect(r.ok).toBe(true)
    expect(r.player.gatesOpen).toEqual([String(GATE_FLOOR)])
    expect(atGate(r.player)).toBe(false)
  })

  it('tryGate: 문 앞이 아니면 아무 일도 일어나지 않는다', () => {
    const p = at(gate.at - 3)
    const r = tryGate(p, FIXED_PASSWORDS[gate.passwordIndex])
    expect(r.ok).toBe(false)
    expect(r.player).toBe(p)
  })

  it('문을 연 뒤에는 step으로 그 너머까지 나아갈 수 있다', () => {
    const opened = at(gate.at - 1, { gatesOpen: [String(GATE_FLOOR)] })
    const r = step(opened, NOTHING)
    expect(r.player.progress).toBe(gate.at)
  })
})

describe('wing', () => {
  // 별관으로 이어지는 통로(동/서/남/북)가 있는 층을 전부 모아, 각 통로마다 같은 동작을 검사한다.
  const wingSpots = floors.flatMap((f, floorIndex) =>
    f.rooms.filter((r) => r.kind === 'wing').map((room) => ({ floorIndex, room })),
  )

  it('별관 통로가 네 방향 모두 있다', () => {
    expect(wingSpots).toHaveLength(4)
  })

  it.each(wingSpots)('별관 통로 비밀번호는 같은 층의 자료실 쪽지에 적혀 있다 ($room.name)', ({ floorIndex, room }) => {
    const archive = floors[floorIndex].rooms.find((r) => r.kind === 'archive')
    const p = { ...createPlayer(), passwords: FIXED_PASSWORDS, floor: floorIndex, progress: 0 }
    expect(fillNote(archive.notes.join(' '), p)).toContain(FIXED_PASSWORDS[room.passwordIndex])
  })

  it.each(wingSpots)(
    'openWing: 비밀번호가 틀리면 체력이 깎이고, 방은 그대로 남아 있어 다시 시도할 수 있다 ($room.name)',
    ({ floorIndex, room }) => {
      const wingIndex = floors[floorIndex].rooms.indexOf(room)
      const p = { ...createPlayer(), passwords: FIXED_PASSWORDS, floor: floorIndex, progress: room.at, hp: 40 }
      const r = openWing(p, wingIndex, '0000', mid)
      expect(r.ok).toBe(false)
      expect(r.player.hp).toBeLessThan(p.hp)
      expect(r.player.floor).toBe(floorIndex)
      expect(r.player.visited).toEqual([])
    },
  )

  it.each(wingSpots)(
    'openWing: 비밀번호가 맞으면 별관으로 곧장 넘어가고, 돌아올 자리를 기억해 둔다 ($room.name)',
    ({ floorIndex, room }) => {
      const wingIndex = floors[floorIndex].rooms.indexOf(room)
      const p = { ...createPlayer(), passwords: FIXED_PASSWORDS, floor: floorIndex, progress: room.at }
      const r = openWing(p, wingIndex, FIXED_PASSWORDS[room.passwordIndex])
      expect(r.ok).toBe(true)
      expect(r.player.floor).toBe(room.enterFloor)
      expect(r.player.progress).toBe(0)
      expect(r.player.floorKnown).toBe(false)
      expect(r.player.branchReturn).toEqual({ floor: floorIndex, progress: room.at })
      expect(r.player.visited).toContain(`${floorIndex}:${wingIndex}`)
    },
  )

  it.each(wingSpots)('별관 층은 wing으로 표시되어 있고, isFinalFloor는 아니다 ($room.name)', ({ room }) => {
    expect(floors[room.enterFloor].wing).toBe(true)
    expect(isFinalFloor({ ...createPlayer(), floor: room.enterFloor })).toBe(false)
  })

  it.each(wingSpots)(
    'returnFromWing: 별관 끝에서 branchReturn이 가리키는 원래 층·자리로 돌아온다 ($room.name)',
    ({ floorIndex, room }) => {
      const inWing = {
        ...createPlayer(),
        floor: room.enterFloor,
        progress: floors[room.enterFloor].length,
        branchReturn: { floor: floorIndex, progress: room.at },
      }
      const r = returnFromWing(inWing)
      expect(r.player.floor).toBe(floorIndex)
      expect(r.player.progress).toBe(room.at)
      expect(r.player.branchReturn).toBeNull()
      expect(r.player.floorKnown).toBe(true)
    },
  )
})

describe('map', () => {
  const at = (floor, progress, extra = {}) => ({ ...createPlayer(), floor, progress, ...extra })

  // 현재 위치(@ 또는 ^) 둘레 3x3 칸을 [윗줄, 가운뎃줄, 아랫줄] 문자열 배열로 잘라 온다.
  const window3 = (lines, ch = '@') => {
    const y = lines.findIndex((row) => row.includes(ch))
    const x = lines[y].indexOf(ch)
    return [y - 1, y, y + 1].map((r) => lines[r].slice(x - 1, x + 2))
  }
  const DIR_INDEX = { U: [0, 1], D: [2, 1], L: [1, 0], R: [1, 2] } // window3 결과에서 [행, 열] 인덱스
  const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' }

  it('층마다 통로 모양의 글자 수가 걸음 수와 같고, 서로 겹치는 칸이 없다', () => {
    for (const f of floors) {
      expect(f.path).toMatch(/^[RDLU]+$/)
      expect(f.path).toHaveLength(f.length)
      const cells = pathCells(f.path)
      expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(cells.length)
    }
  })

  it('캔버스 크기는 3개 층마다 한 단계씩 커지고(지하 10층 50x50 ~ 지하 1층 83x83), 진행도와 상관없이 같다', () => {
    floors.forEach((_, i) => {
      const size = 50 + Math.floor(i / 3) * 11
      expect(mapGridSize(i)).toEqual({ width: size, height: size })
      ;[0, -5, 999].forEach((progress) => {
        const lines = buildMap(at(i, progress))
        expect(lines).toHaveLength(size)
        expect(new Set(lines.map((l) => l.length))).toEqual(new Set([size]))
      })
    })
  })

  it('지나온 칸(0~진행도)마다의 3x3만 보이고, 그 밖은 전부 빈칸이다', () => {
    const progress = 2
    const lines = buildMap(at(0, progress))
    const cy = lines.findIndex((row) => row.includes('@'))
    const cx = lines[cy].indexOf('@')
    const cells = pathCells(floors[0].path)
    // 렌더된 @ 위치로 오프셋을 역산해, 지나온 칸들을 같은 그리드 좌표로 옮긴다.
    const offsetX = cx - cells[progress].x
    const offsetY = cy - cells[progress].y
    const seen = cells.slice(0, progress + 1).map((c) => [c.x + offsetX, c.y + offsetY])
    lines.forEach((row, y) => {
      row.split('').forEach((ch, x) => {
        const inView = seen.some(([sx, sy]) => Math.max(Math.abs(x - sx), Math.abs(y - sy)) <= 1)
        expect(ch === ' ').toBe(!inView)
      })
    })
  })

  it('입구에서는 현재 위치(@)와 그다음 한 걸음까지만 보이고, 그 뒤 곁길은 아직 감춰진다', () => {
    const win = window3(buildMap(at(0, 0)))
    // 지하 10층 path 'RUUULUUURRRRRUUUUUURRRRDDD': 입구에서 오른쪽으로 한 걸음(R), 그다음 위(U)로 꺾인다.
    // 꺾이는 지점의 대각선 이웃(2번째 칸)도 반경 1칸 안에 들어와 함께 보인다.
    const s = floors[0].theme.symbol
    expect(win).toEqual([`##${s}`, `#@${s}`, '###'])
  })

  it('갈림길이 나오면 길은 보이지만, 안 가 본 쪽은 막다른 길이든 아니든 무엇인지 ? 로 감춘다', () => {
    // 지하 10층 16칸째: 오른쪽(보급)·왼쪽(막다른 길) 갈림길이 같은 지점에서 갈라진다
    const win = window3(buildMap(at(0, 16)))
    expect(win[1][2]).toBe('?') // 왼쪽 갈림길(보급, 안 가 봄)
    expect(win[1][0]).toBe('?') // 오른쪽 갈림길(막다른 길, 안 가 봄)
  })

  it('갈림길도 다녀오면 그제야 실제 글자(소문자)로 바뀐다. 막다른 길이었어도 마찬가지다', () => {
    const supplyVisited = window3(buildMap(at(0, 16, { visited: ['0:1'] })))
    expect(supplyVisited[1][2]).toBe('s')
    const deadVisited = window3(buildMap(at(0, 16, { visited: ['0:2'] })))
    expect(deadVisited[1][0]).toBe('x')
  })

  it('방문 지점(room.at)에 서면 그 방향의 곁길이 시야 안에 들어오고, 갈림길이 아니면 바로 대문자로 그려진다', () => {
    floors.forEach((f, fi) => {
      f.rooms.forEach((room, ri) => {
        const fork = f.rooms.filter((r) => r.at === room.at).length >= 2
        const [dy, dx] = DIR_INDEX[room.dir]

        const win = window3(buildMap(at(fi, room.at)))
        expect(win[dy][dx]).toBe(fork ? '?' : roomKinds[room.kind].symbol)

        const visitedWin = window3(buildMap(at(fi, room.at, { visited: [`${fi}:${ri}`] })))
        expect(visitedWin[dy][dx]).toBe(roomKinds[room.kind].symbol.toLowerCase())
      })
    })
  })

  it('출구에 도착하면 그 칸이 ^ 로 바뀐다', () => {
    const last = floors.length - 1
    floors.forEach((f, i) => {
      const joined = buildMap(at(i, f.length)).join('')
      expect(joined).toContain('^')
      expect(joined).not.toContain('@')
    })
    expect(buildMap(at(last, floors[last].length)).join('')).toContain('^')
  })

  it('이동해서 시야를 벗어나도 지나온 길과 발견한 갈림길은 다시 가려지지 않는다', () => {
    const near = buildMap(at(0, 16))
    const y0 = near.findIndex((row) => row.includes('@'))
    const x0 = near[y0].indexOf('@')
    // 오른쪽(보급, 안 가 봄)·왼쪽(막다른 길, 안 가 봄) 갈림길의 절대 좌표. 캔버스와 오프셋은 진행도와 상관없이 같다.
    expect(near[y0][x0 - 1]).toBe('?')
    expect(near[y0][x0 + 1]).toBe('?')

    const far = buildMap(at(0, 20))
    expect(far[y0][x0 - 1]).toBe('?') // 멀리 나아가 시야(3x3) 밖이 되어도 계속 보인다
    expect(far[y0][x0 + 1]).toBe('?')
    expect(far[y0][x0]).toBe(floors[0].theme.symbol) // 방금까지 서 있던 자리도 지나온 길로 계속 보인다
    expect(far[y0 - 2][x0 + 1]).toBe('R') // 새로 발견한 휴게실도 함께 보인다
  })

  it('범례는 발견한 방의 종류만 알려주고, 안 가 본 갈림길은 (막다른 길이어도) 무엇인지 알려주지 않는다', () => {
    expect(mapLegend(at(0, 0))).toHaveLength(1)

    const hidden = mapLegend(at(0, 18)) // 갈림길 양쪽(보급/막다른 길)을 아직 안 가 봤다
    expect(hidden).toHaveLength(3)
    expect(hidden[1]).toBe('R 휴게실 (소문자는 다녀온 곳)')
    expect(hidden[2]).toContain('안 가 본 갈림길')

    const oneSide = mapLegend(at(0, 18, { visited: ['0:1'] })) // 한쪽(보급)만 다녀왔다
    expect(oneSide[1]).toContain('S 보급실')
    expect(oneSide.some((l) => l.includes('안 가 본 갈림길'))).toBe(true) // 반대쪽(막다른 길)은 아직 안 가 봤다

    const bothSides = mapLegend(at(0, 18, { visited: ['0:1', '0:2'] })) // 양쪽 다 다녀왔다
    expect(bothSides[1]).toContain('X 막다른 길')
    expect(bothSides.some((l) => l.includes('안 가 본 갈림길'))).toBe(false)
  })

  it('보이는 지도(mapView)는 층과 상관없이 고정 크기(9x9)이고, 그 안에 플레이어가 항상 들어 있다', () => {
    const { width: vw, height: vh } = mapViewSize()
    floors.forEach((f, fi) => {
      ;[0, Math.ceil(f.length / 2), f.length].forEach((progress) => {
        const view = mapView(at(fi, progress))
        expect(view).toHaveLength(vh)
        expect(new Set(view.map((r) => r.length))).toEqual(new Set([vw]))
        expect(view.some((row) => row.includes('@') || row.includes('^'))).toBe(true)
      })
    })
  })

  it('캔버스가 보이는 창보다 큰 층에서 멀리 이동하면, 카메라가 따라가며 입구는 화면 밖으로 빠진다', () => {
    const fi = floors.length - 1 // 맨 마지막 층(동쪽 별관도 지하 1층과 같은 구간이라 캔버스가 창보다 크다): 83x83, 보이는 창은 9x9
    const size = mapGridSize(fi)
    const { width: vw } = mapViewSize()
    expect(size.width).toBeGreaterThan(vw) // 이 층은 실제로 창보다 캔버스가 크다

    // 입구(진행도 0)의 캔버스 절대 좌표
    const start = buildMap(at(fi, 0))
    const ey = start.findIndex((row) => row.includes('@'))
    const ex = start[ey].indexOf('@')

    const startOrigin = viewOrigin(at(fi, 0))
    expect(ex >= startOrigin.x && ex < startOrigin.x + vw && ey >= startOrigin.y && ey < startOrigin.y + mapViewSize().height).toBe(
      true,
    ) // 처음에는 입구가 창 안에 있다

    const endOrigin = viewOrigin(at(fi, floors[fi].length))
    expect(endOrigin).not.toEqual(startOrigin) // 카메라가 실제로 움직였다
    const { height: vh } = mapViewSize()
    const inEndView = ex >= endOrigin.x && ex < endOrigin.x + vw && ey >= endOrigin.y && ey < endOrigin.y + vh
    expect(inEndView).toBe(false) // 끝까지 가면 입구는 더 이상 창 안에 없다

    // 하지만 데이터로는(buildMap) 입구가 여전히 남아 있다 — mapView가 화면에서만 잘라내는 것뿐이다
    expect(buildMap(at(fi, floors[fi].length))[ey][ex]).toBe(floors[fi].theme.symbol)
  })

  it('roomIndex를 주면 @가 통로 대신 그 방의 글자 자리로 옮겨 겹쳐 보이고, 원래 통로 칸은 길로 남는다', () => {
    // 관리 초소(휴게실): dir 방향으로 옮겨 겹쳐 보이는지 확인한다 (dir 자체는 데이터가 바뀌어도 상관없게 동적으로 구한다)
    const room = floors[0].rooms.findIndex((r) => r.kind === 'rest')
    const dir = floors[0].rooms[room].dir
    const [dy, dx] = DIR_INDEX[dir]
    const [ody, odx] = DIR_INDEX[OPPOSITE[dir]]
    const p = at(0, floors[0].rooms[room].at)

    const outside = window3(buildMap(p))
    expect(outside[dy][dx]).toBe('R') // 아직 방 밖: 대문자 방 글자가 그대로 보인다
    expect(outside[1][1]).toBe('@') // @는 통로 칸에 있다

    const inside = window3(buildMap(p, room))
    expect(inside[1][1]).toBe('@') // 방 안: @가 방의 글자 자리로 옮겨 겹친다 (창 가운데)
    expect(inside[ody][odx]).toBe(floors[0].theme.symbol) // 원래 서 있던 통로 칸(반대 방향)은 평범한 길로 남는다
  })

  it('mapView/viewOrigin도 roomIndex를 받으면 방을 기준으로 창을 잡는다', () => {
    const room = floors[0].rooms.findIndex((r) => r.kind === 'rest')
    const p = at(0, floors[0].rooms[room].at)
    const view = mapView(p, room)
    expect(view.some((row) => row.includes('@'))).toBe(true)
    expect(view.some((row) => row.includes('R'))).toBe(false) // @로 덮여서 대문자 글자는 더 안 보인다
  })

  it('잠긴 문: 열기 전에는 그 앞칸이 벽(#)처럼 막혀 보이고, 열면 길로 바뀐다', () => {
    const gateFloor = floors.findIndex((f) => f.gate)
    const gate = floors[gateFloor].gate
    const [dy, dx] = DIR_INDEX[floors[gateFloor].path[gate.at - 1]] // 문 앞칸이 놓인 방향
    const locked = at(gateFloor, gate.at - 1)
    expect(window3(buildMap(locked))[dy][dx]).toBe('#')
    expect(mapLegend(locked).some((l) => l.includes('잠긴 문'))).toBe(true)

    const opened = at(gateFloor, gate.at - 1, { gatesOpen: [String(gateFloor)] })
    expect(window3(buildMap(opened))[dy][dx]).toBe(floors[gateFloor].theme.symbol)
    expect(mapLegend(opened).some((l) => l.includes('잠긴 문'))).toBe(false)
  })
})

describe('rooms', () => {
  // 지하 10층 관리 초소(휴게실, 18칸째) / 지하 9층 보급 창고(12칸째) / 지하 8층 기록 보관함(자료실, 13칸째)
  // 지하 7층 작업장 의무실(24칸째) / 지하 5층 소규모 실험실(20칸째)
  const at = (floor, progress, extra = {}) => ({ ...createPlayer(), passwords: FIXED_PASSWORDS, floor, progress, ...extra })

  it('availableRooms: 문을 지나야 보이고, 다녀온 방은 다시 나오지 않는다', () => {
    expect(availableRooms(at(0, 10))).toEqual([]) // 갈림길 앞
    expect(availableRooms(at(0, 18)).map((r) => r.room.name)).toEqual(['관리 초소', '왼쪽 갈림길', '오른쪽 갈림길'])
    expect(availableRooms(at(0, 20)).map((r) => r.room.name)).toEqual(['관리 초소', '왼쪽 갈림길', '오른쪽 갈림길']) // 지나친 뒤에도 갈 수 있다
    expect(availableRooms(at(0, 18, { visited: ['0:0'] })).map((r) => r.room.name)).toEqual(['왼쪽 갈림길', '오른쪽 갈림길'])
  })

  it('갈림길: 같은 지점의 두 방은 순서 상관없이 둘 다 들어갈 수 있고, 서로를 막지 않는다', () => {
    expect(availableRooms(at(0, 16)).map((r) => r.room.name)).toEqual(['왼쪽 갈림길', '오른쪽 갈림길'])
    expect(doorLogs(at(0, 16))).toEqual([{ text: '길이 두 갈래로 갈라진다.', type: 'event' }])

    // 오른쪽(막다른 길)부터 가 봐도, 왼쪽(보급)은 여전히 갈 수 있다
    const p = at(0, 16)
    const dead = enterRoom(p, 2)
    expect(dead.enemy).toBeNull()
    expect(dead.player.visited).toEqual(['0:2'])
    expect(availableRooms(dead.player).map((r) => r.room.name)).toContain('왼쪽 갈림길')

    const entered = enterRoom(dead.player, 1)
    expect(entered.room).toBe(true) // 보급실은 방 화면으로 넘어갈 뿐, 곧장 아이템을 주지 않는다
    const reward = takeSupplyItem(entered.player, 1, 'battery')
    expect(reward.player.inventory.battery).toBe(p.inventory.battery + 1)
  })

  it('매복 갈림길: 보상 없이 적이 바로 나타난다', () => {
    const r = enterRoom(at(3, 21), 2) // 지하 7층 오른쪽 갈림길
    expect(r.enemy.id).toBe('worker')
    expect(r.logs.some((l) => l.type === 'good')).toBe(false) // 보상 로그 없음
  })

  it('doorLogs: 문 바로 앞에 도착했을 때만 알려준다', () => {
    expect(doorLogs(at(0, 18))[0].text).toContain('관리 초소')
    expect(doorLogs(at(0, 19))).toEqual([])
  })

  it('step: 곁길의 문이 있는 칸에 도착하면 로그로 알려준다', () => {
    const r = step(at(0, 17), NOTHING)
    expect(r.player.progress).toBe(18)
    expect(r.logs.some((l) => l.text.includes('곁길') && l.text.includes('관리 초소'))).toBe(true)
  })

  it('휴게실: 방 화면에서 쉬어야 체력이 가득 차고 휴식 횟수도 채워진다', () => {
    const entered = enterRoom(at(0, 18, { hp: 10, rests: 0 }), 0)
    expect(entered.room).toBe(true) // 문을 지난 것만으로는 아직 쉬지 않는다
    expect(entered.player.hp).toBe(10)

    const r = restInRoom(entered.player)
    expect(r.player.hp).toBe(r.player.maxHp)
    expect(r.player.rests).toBe(config.restsPerFloor)
  })

  it('방에 들어가면 빛이 조금 줄고 다녀온 방으로 기록되며, 같은 방은 다시 들어갈 수 없다', () => {
    const p = at(0, 18, { hp: 10 })
    const r = enterRoom(p, 0)
    expect(r.player.light).toBe(p.light - config.roomLight)
    expect(r.player.visited).toEqual(['0:0'])

    const again = enterRoom(r.player, 0)
    expect(again.player).toBe(r.player)
    expect(again.logs[0].type).toBe('muted')
  })

  it('아직 문을 발견하지 못한 방에는 들어갈 수 없다', () => {
    const p = at(0, 3, { hp: 10 })
    const r = enterRoom(p, 0)
    expect(r.player).toBe(p)
  })

  it('빛이 없어도 방에는 들어갈 수 있고 빛이 음수가 되지 않는다', () => {
    expect(enterRoom(at(0, 18, { light: 0 }), 0).player.light).toBe(0)
  })

  it('보급실: 방 화면에서 하나씩 챙겨야 아이템을 얻는다', () => {
    const p = at(1, 12)
    const entered = enterRoom(p, 0)
    expect(entered.room).toBe(true)
    expect(entered.player.inventory.bandage).toBe(p.inventory.bandage) // 아직 안 챙겼다

    const withBandage = takeSupplyItem(entered.player, 0, 'bandage')
    expect(withBandage.player.inventory.bandage).toBe(p.inventory.bandage + 1)
    const withCanned = takeSupplyItem(withBandage.player, 0, 'canned')
    expect(withCanned.player.inventory.canned).toBe(1)
    const withBattery = takeSupplyItem(withCanned.player, 0, 'battery')
    expect(withBattery.player.inventory.battery).toBe(p.inventory.battery + 1)
  })

  it('의무실: 방 화면에서 치료받아야 최대 체력이 영구히 늘고 체력이 가득 찬다', () => {
    const entered = enterRoom(at(3, 24, { hp: 5 }), 0)
    expect(entered.room).toBe(true)
    expect(entered.player.maxHp).toBe(config.player.maxHp)

    const r = healInClinic(entered.player, 0)
    expect(r.player.maxHp).toBe(config.player.maxHp + 10)
    expect(r.player.hp).toBe(r.player.maxHp)
  })

  it('자료실: 방 화면에서 읽어야 쪽지가 나온다 (쪽지 형식의 로그)', () => {
    const entered = enterRoom(at(2, 13), 0)
    expect(entered.room).toBe(true)
    expect(entered.player.notebook).toEqual([]) // 아직 안 읽었다

    const r = readArchive(entered.player, 0)
    const notes = r.logs.filter((l) => l.type === 'note')
    expect(notes).toHaveLength(5)
    expect(r.player.notebook).toEqual(['2:0:0', '2:0:1', '2:0:2', '2:0:3', '2:0:4']) // 읽은 쪽지가 수첩에 적힌다
  })

  it('조사 지점: 방 화면에서 정해진 행동과 별개로 하나씩 더 골라 볼 수 있다', () => {
    const p = at(0, 18) // 관리 초소(휴게실): blanket(문장만) / shelf(통조림)
    const entered = enterRoom(p, 0)

    const noReward = searchRoom(entered.player, 0, 'blanket')
    expect(noReward.player).toBe(entered.player) // 문장만 나오고 아무것도 바뀌지 않는다
    expect(noReward.enemy).toBeNull()

    const withCanned = searchRoom(entered.player, 0, 'shelf')
    expect(withCanned.player.inventory.canned).toBe(1)

    expect(searchRoom(entered.player, 0, '없는곳')).toEqual({
      player: entered.player,
      logs: [{ text: '그런 곳은 없다.', type: 'muted' }],
      enemy: null,
    })
  })

  it('조사 지점: enemy가 있으면 위험한 것과 마주쳐 전투로 이어진다', () => {
    const entered = enterRoom(at(6, 14), 0) // 지하 4층 연구원 휴게실: vent(적 등장)
    const r = searchRoom(entered.player, 0, 'vent')
    expect(r.enemy.id).toBe('scratcher')
    expect(r.logs.some((l) => l.type === 'event')).toBe(true)
  })

  it('실험실: 장비와 혈청(bonus)을 먼저 얻고, 곧바로 경비와 싸우게 된다 (guards 중 하나가 무작위로 나온다)', () => {
    const p = at(5, 20)
    const first = enterRoom(p, 0, () => 0)
    expect(first.player.inventory.axe).toBe(1)
    expect(first.player.inventory.serum).toBe(1) // 실험실은 장비와 함께 혈청도 준다
    expect(first.foundGear).toBe('axe') // 장착할지는 화면(useGame)에서 따로 물어본다
    expect(first.enemy.id).toBe('subject') // guards[0]
    expect(first.enemy.hp).toBe(first.enemy.maxHp)
    expect(first.player.hp).toBe(p.hp)
    expect(attackOf(first.player)).toBe(config.player.attack) // 아직 장착 전이라 공격력은 그대로다
    expect(attackOf(equip(first.player, 'axe'))).toBe(config.player.attack + 6)

    const second = enterRoom(p, 0, () => 0.99)
    expect(second.enemy.id).toBe('machine') // guards[1]
  })

  // 지하 1층: [0] 경비 휴게실(27칸째) [1] 통제실(38칸째) [2] 관리 단말실(45칸째)
  describe('단말실', () => {
    const term = (extra = {}) => at(9, 45, extra)

    it('들어가도 방이 소진되지 않고 접속 화면으로 이어진다 (빛은 든다)', () => {
      const p = term()
      const r = enterRoom(p, 2)
      expect(r.terminal).toBe(true)
      expect(r.enemy).toBeNull()
      expect(r.player.light).toBe(p.light - config.roomLight)
      expect(r.player.visited).toEqual([])
      expect(availableRooms(r.player).map((x) => x.room.name)).toContain('관리 단말실')
    })

    it('문을 발견하지 못했으면 들어갈 수 없다', () => {
      const p = at(9, 44)
      expect(enterRoom(p, 2).player).toBe(p)
    })

    it('계정이 틀리면 계정이 없다고, 비밀번호만 틀리면 계정은 확인됐다고 알려주고 아무것도 소진되지 않는다', () => {
      const p = term()
      const noId = login(p, 2, 'SUBJ-1111', 'GATE-7319')
      expect(noId.ok).toBe(false)
      expect(noId.logs[0].text).toBe('존재하지 않는 계정입니다.')

      const noPw = login(p, 2, 'SUBJ-0417', 'GATE-0000')
      expect(noPw.ok).toBe(false)
      expect(noPw.logs[0].text).toContain('계정은 확인되었다')
      expect(noPw.player).toBe(p)
      expect(login(p, 2, '', '').ok).toBe(false)
    })

    it('맞게 입력하면 접속되어 방이 소진되고 열람한 내용이 수첩에 적힌다', () => {
      const r = login(term(), 2, 'SUBJ-0417', 'GATE-7319')
      expect(r.ok).toBe(true)
      expect(r.logs.every((l) => l.type === 'note')).toBe(true)
      expect(r.logs.some((l) => l.text.includes('INFINITE DUNGEON TRAIN'))).toBe(true)
      expect(r.player.visited).toContain('9:2')
      expect(r.player.notebook).toHaveLength(r.logs.length)
      expect(availableRooms(r.player).map((x) => x.room.name)).not.toContain('관리 단말실')

      const again = login(r.player, 2, 'SUBJ-0417', 'GATE-7319') // 다시 접속할 수는 없다
      expect(again.ok).toBe(false)
      expect(again.player).toBe(r.player)
    })

    it('계정은 그 순간의 피험자 번호라서, 쓰러져 번호가 늘어나면 예전 번호로는 접속되지 않는다', () => {
      const died = term({ deaths: 1 }) // 번호 0418
      expect(login(died, 2, 'SUBJ-0417', 'GATE-7319').logs[0].text).toBe('존재하지 않는 계정입니다.')
      expect(login(died, 2, 'SUBJ-0418', 'GATE-7319').ok).toBe(true)
    })

    it('접속하면 열람 내용에 지금의 피험자 번호와 투입 횟수가 나온다', () => {
      const r = login(term({ deaths: 2 }), 2, 'SUBJ-0419', 'GATE-7319')
      expect(r.logs.some((l) => l.text.includes('SUBJ-0419') && l.text.includes('투입 횟수 7'))).toBe(true)
    })

    it('대소문자, 하이픈, 공백은 무시한다', () => {
      expect(login(term(), 2, 'subj 0417', 'gate7319').ok).toBe(true)
      expect(login(term(), 2, ' SUBJ0417 ', 'Gate - 7319').ok).toBe(true)
    })
  })

  describe('수첩', () => {
    it('아무것도 읽지 않았으면 비어 있다고 알려준다', () => {
      const logs = notebookLogs(createPlayer())
      expect(logs[0].text).toBe('— 수첩 —')
      expect(logs.at(-1).text).toBe('아직 적어 둔 것이 없다.')
    })

    it('읽은 쪽지를 층과 방별로 모아서 보여준다', () => {
      const p = readArchive(enterRoom(at(2, 13), 0).player, 0).player
      const logs = notebookLogs(p)
      expect(logs.some((l) => l.text === '지하 8층 · 기록 보관함')).toBe(true)
      expect(logs.filter((l) => l.type === 'note')).toHaveLength(5)
    })

    it('쪽지 속 피험자 번호는 지금 값으로 바뀌어 보인다 (쓰러진 뒤에는 수첩의 기록이 달라진다)', () => {
      // 지하 5층 자료실 [2]번 쪽지: "번호 {번호앞}■■", 지하 2층 관찰실 [3]번 쪽지: "■■{번호뒤}"
      const text = (deaths) =>
        notebookLogs(at(5, 0, { deaths, notebook: ['5:1:2', '8:2:3'] }))
          .filter((l) => l.type === 'note')
          .map((l) => l.text)
          .join(' | ')
      expect(text(0)).toContain('번호 04■■')
      expect(text(0)).toContain('■■17. 5번째 투입')
      expect(text(1)).toContain('■■18. 6번째 투입')
      expect(text(83)).toContain('번호 05■■') // 앞 두 자리도 바뀐다
    })

    it('읽지 않은 방의 쪽지는 나오지 않는다', () => {
      const p = at(2, 3, { notebook: ['2:0:0'] })
      expect(notebookLogs(p).filter((l) => l.type === 'note')).toHaveLength(1)
    })
  })
})

describe('battle', () => {
  it('attack: 적이 살아 있으면 반격한다', () => {
    const p = createPlayer()
    const r = attack(p, dog(), mid)
    expect(r.result).toBeNull()
    expect(r.enemy.hp).toBe(11 - 6)
    expect(r.player.hp).toBe(p.hp - 3) // 들개 공격5 - 방어2
  })

  it('attack: 장착한 장비가 공격과 방어에 반영된다', () => {
    const p = equip(equip({ ...createPlayer(), inventory: { crowbar: 1, vest: 1 } }, 'crowbar'), 'vest')
    const r = attack(p, dog(), mid)
    expect(r.enemy.hp).toBe(11 - 10)
    expect(r.player.hp).toBe(p.hp - 1) // 들개 공격5 - 방어6 → 최소 1
  })

  it('attack: 적을 쓰러뜨리면 승리하고 반격은 없다', () => {
    const p = createPlayer()
    const r = attack(p, { ...dog(), hp: 5 }, mid)
    expect(r.result).toBe('win')
    expect(r.player.hp).toBe(p.hp)
    expect(total(r.player)).toBe(total(p)) // mid(0.5)에서는 주변에서 아무것도 못 찾는다
  })

  it('attack: 승리 후 낮은 난수에서는 주변에서 소모품과 가죽을 함께 찾는다', () => {
    const p = createPlayer()
    const r = attack(p, { ...dog(), hp: 4 }, () => 0.1)
    expect(r.result).toBe('win')
    expect(r.player.inventory.leather).toBe(1) // 가죽은 소모품과 별개로 굴린다
    expect(total(r.player)).toBe(total(p) + 2)
  })

  it('attack: 기계 계열 적을 낮은 난수에서 쓰러뜨리면 기계부품도 함께 얻지만, 다른 적에게서는 나오지 않는다', () => {
    const p = createPlayer()
    const machine = attack(p, { ...spawnEnemy('machine'), hp: 1 }, () => 0.1)
    expect(machine.result).toBe('win')
    expect(machine.player.inventory.part).toBe(1)

    const nonMachine = attack(p, { ...dog(), hp: 1 }, () => 0.1)
    expect(nonMachine.result).toBe('win')
    expect(nonMachine.player.inventory.part).toBeUndefined()
  })

  it('attack: 보스를 쓰러뜨려도 주변에서 아무것도 찾지 않는다', () => {
    const p = createPlayer()
    const r = attack(p, { ...spawnEnemy('dog'), boss: true, hp: 1 }, () => 0)
    expect(r.result).toBe('win')
    expect(total(r.player)).toBe(total(p))
  })

  it('attack: 반격으로 체력이 0이 되면 패배', () => {
    const r = attack({ ...createPlayer(), hp: 1 }, dog(), mid)
    expect(r.result).toBe('lose')
    expect(r.player.hp).toBe(0)
  })

  it('flee: 확률에 따라 성공하거나 반격을 받는다', () => {
    const p = createPlayer()
    expect(flee(p, dog(), () => 0.1).result).toBe('fled')
    const failed = flee(p, dog(), () => 0.9)
    expect(failed.result).toBeNull()
    expect(failed.player.hp).toBeLessThan(p.hp)
  })

  it('flee: 보스에게서는 도망칠 수 없고 턴도 소모하지 않는다', () => {
    const p = createPlayer()
    const r = flee(p, { ...spawnEnemy('dog'), boss: true }, () => 0)
    expect(r.result).toBeNull()
    expect(r.turnUsed).toBe(false)
    expect(r.player).toBe(p)
  })

  it('useItemInBattle: 사용 실패 시 턴을 소모하지 않는다', () => {
    const p = createPlayer()
    const r = useItemInBattle(p, dog(), 'bandage', mid)
    expect(r.turnUsed).toBe(false)
    expect(r.player).toBe(p)
  })

  it('useItemInBattle: 회복하면 턴이 지나 적이 반격한다', () => {
    const r = useItemInBattle({ ...createPlayer(), hp: 10 }, dog(), 'bandage', mid)
    expect(r.turnUsed).toBe(true)
    expect(r.player.hp).toBe(10 + 20 - 3)
  })

  it('applyDefeat: 층 입구로 돌아가 절반의 체력과 절반의 빛만 남는다', () => {
    const { player, lostLight } = applyDefeat({ ...createPlayer(), light: 25, hp: 0, progress: 4, rests: 0, deaths: 1 })
    expect(lostLight).toBe(12)
    expect(player.light).toBe(13)
    expect(player.hp).toBe(Math.ceil(player.maxHp / 2))
    expect(player.progress).toBe(0)
    expect(player.rests).toBe(config.restsPerFloor)
    expect(player.deaths).toBe(2)
  })
})

describe('save', () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubStorage() {
    const store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    })
    return store
  }

  it('저장 후 불러오면 같은 플레이어가 복원된다', () => {
    stubStorage()
    const p = { ...createPlayer(), floor: 2, progress: 3, deaths: 1, steps: 40, hp: 33, visited: ['0:0', '1:0'], notebook: ['2:0:0', '2:0:1'] }
    expect(hasSave()).toBe(false)
    expect(saveGame(p)).toBe(true)
    expect(hasSave()).toBe(true)
    expect(loadGame()).toEqual(p)
    clearSave()
    expect(hasSave()).toBe(false)
  })

  it('저장 데이터가 깨져 있으면 null', () => {
    stubStorage().set(config.saveKey, '{깨진 json')
    expect(loadGame()).toBeNull()
  })

  it('저장소를 쓸 수 없으면 저장 실패를 반환할 뿐 예외를 던지지 않는다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(hasSave()).toBe(false)
    expect(saveGame(createPlayer())).toBe(false)
    expect(loadGame()).toBeNull()
  })
})

describe('mapgen', () => {
  // character.js의 PASSWORD_SLOT/fillNote가 쓰는 자리표시자와 같은 테이블. 이 방(또는 gate)이 그 비밀번호의
  // "힌트"인지(hint) "잠금"인지(lock) 알아내서, 재배치 뒤에도 힌트가 항상 잠금보다 먼저(at가 더 작게) 나오는지 본다.
  const PLACEHOLDER_SLOT_INDEX = {
    '{게이트}': 0,
    '{동별관}': 1,
    '{서별관}': 3,
    '{남별관}': 5,
    '{북별관}': 4,
    '{단말앞}': 2,
    '{단말뒤}': 2,
  }
  const hintedSlots = (room) => {
    const text = [...(room.notes ?? []), ...(room.text ?? [])].join('\n')
    return Object.entries(PLACEHOLDER_SLOT_INDEX)
      .filter(([ph]) => text.includes(ph))
      .map(([, slot]) => slot)
  }
  const lockSlot = (room) => (room.kind === 'wing' ? room.passwordIndex : room.kind === 'terminal' ? room.login?.passwordIndex : undefined)

  // 생성된 레이아웃 하나를 여러 번 검증하는 걸 재사용하기 위한 헬퍼.
  function expectValidLayout(layout) {
    floors.forEach((floor, fi) => {
      const generated = layout[fi]
      if (!generated) return // 드물게 실패한 층은 원본을 그대로 쓰므로 검증 대상이 아니다
      expect(generated.path).toHaveLength(floor.length)
      expect(generated.rooms).toHaveLength(floor.rooms.length)

      // 복도는 자기 자신과 겹치지 않는다.
      const cells = pathCells(generated.path)
      const taken = new Set(cells.map((c) => `${c.x},${c.y}`))
      expect(taken.size).toBe(cells.length)

      // 방은 통로나 다른 방과 겹치지 않고, at/dir 모두 유효한 값이다.
      generated.rooms.forEach(({ at, dir }) => {
        expect(at).toBeGreaterThanOrEqual(1)
        expect(at).toBeLessThanOrEqual(floor.length - 1)
        expect(['R', 'D', 'L', 'U']).toContain(dir)
        const c = roomCell(cells, { at, dir })
        expect(taken.has(`${c.x},${c.y}`)).toBe(false)
        taken.add(`${c.x},${c.y}`)
      })

      // 같은 at를 쓰던 방(포크)은 재배치 뒤에도 여전히 같은 at를 공유한다 — 포크 자체가 사라지거나 생기지 않는다.
      const byOriginalAt = new Map()
      floor.rooms.forEach((room, i) => {
        if (!byOriginalAt.has(room.at)) byOriginalAt.set(room.at, [])
        byOriginalAt.get(room.at).push(generated.rooms[i].at)
      })
      for (const newAts of byOriginalAt.values()) expect(new Set(newAts).size).toBe(1)

      // 같은 층 안에서, 힌트가 적힌 방은 그 힌트를 쓰는 잠금(wing/terminal 문 또는 gate)보다 항상 먼저 나온다.
      floor.rooms.forEach((hintRoom, hi) => {
        hintedSlots(hintRoom).forEach((slot) => {
          const hintAt = generated.rooms[hi].at
          if (floor.gate?.passwordIndex === slot) expect(hintAt).toBeLessThan(floor.gate.at)
          floor.rooms.forEach((lockRoom, li) => {
            if (li !== hi && lockSlot(lockRoom) === slot) expect(hintAt).toBeLessThan(generated.rooms[li].at)
          })
        })
      })
    })
  }

  it('여러 번 생성해도 매번 자기 자신과 안 겹치는 복도와, 힌트→잠금 순서를 지키는 방 배치가 나온다', () => {
    for (let trial = 0; trial < 15; trial += 1) expectValidLayout(generateMapLayout())
  })

  it('방 배열의 길이와 순서(인덱스)는 바뀌지 않는다 — at/dir 값만 다시 뽑힌다', () => {
    const layout = generateMapLayout()
    floors.forEach((floor, fi) => {
      if (layout[fi]) expect(layout[fi].rooms).toHaveLength(floor.rooms.length)
    })
  })

  it('mapLayout이 없는 플레이어에게는 getFloor가 원본 floors를 그대로 돌려준다 (옛 세이브·테스트용 createPlayer 호환)', () => {
    const player = { ...createPlayer(), floor: 0 }
    expect(player.mapLayout).toBeNull()
    expect(getFloor(player)).toEqual(floors[0])
  })

  it('mapLayout이 있으면 그 층의 path와 방 at/dir만 덮어써서 돌려준다', () => {
    const fakeLayout = { 0: { path: 'R'.repeat(floors[0].length), rooms: floors[0].rooms.map(() => ({ at: 1, dir: 'D' })) } }
    const player = { ...createPlayer(), floor: 0, mapLayout: fakeLayout }
    const floor = getFloor(player)
    expect(floor.path).toBe(fakeLayout[0].path)
    floor.rooms.forEach((room) => {
      expect(room.at).toBe(1)
      expect(room.dir).toBe('D')
    })
    expect(floor.name).toBe(floors[0].name) // path/rooms 말고 나머지 필드는 원본 그대로다
  })
})
