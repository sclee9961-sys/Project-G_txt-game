// 미궁 탐색 로직: 한 걸음 나아가기 / 쉬기 / 계단 오르기. 모두 새 player와 로그를 반환한다.
// 반환값: { player, logs: [{ text, type }], enemy: null | 마주친 적 }
import { addItem, gain, heal, itemCount, markReached, moveTo, spawnFloorEnemy } from './character.js'
import { config } from './config.js'
import { floors, items as itemData } from './data.js'
import { atGate, gateAnnounce } from './gate.js'
import { getFloor } from './mapgen.js'
import { doorLogs } from './rooms.js'
import { josa, pick, randInt, weightedPick } from './util.js'

const log = (text, type = 'normal') => ({ text, type })

const lootTexts = [
  (n) => `바닥에 ${josa(n, '이/가')} 떨어져 있다. 주웠다.`,
  (n) => `부서진 상자 속에서 ${josa(n, '을/를')} 찾았다.`,
  (n) => `벽 틈에 ${josa(n, '이/가')} 끼어 있다. 조심스럽게 빼냈다.`,
]

const trapTexts = [
  '발밑의 바닥이 꺼졌다. 간신히 매달렸지만 팔을 다쳤다.',
  '어둠 속에서 튀어나온 철근에 옆구리를 긁혔다.',
  '낡은 배관이 터지며 뜨거운 증기가 뿜어져 나왔다.',
]

export { getFloor }
export const isFinalFloor = (player) => getFloor(player).final === true
export const atExit = (player) => player.progress >= getFloor(player).length

// 적과 마주칠 확률. 마지막으로 마주친 뒤 안전하게 걸은 걸음(dangerStreak)이 늘어날수록 조금씩 오른다.
function encounterChance(player) {
  const cfg = config.encounterPity
  const table = player.light > 0 ? cfg.lit : cfg.dark
  return Math.min(cfg.max, table.base + table.step * player.dangerStreak)
}

// 이번 걸음에 일어날 사건의 가중치 표. '적' 항목만 encounterChance로 정하고, 나머지는 원래 비율 그대로 나눠 가진다.
function eventWeights(player) {
  const base = config.events[player.light > 0 ? 'lit' : 'dark']
  const restSum = Object.values(base).reduce((a, b) => a + b, 0)
  const p = encounterChance(player)
  const enemy = (p / (1 - p)) * restSum // weightedPick이 전체 합으로 나누므로, enemy 비중이 정확히 p가 되도록 역산한다
  return { nothing: base.nothing, loot: base.loot, enemy, trap: base.trap, lost: base.lost }
}

// 층에 도착했을 때 보여줄 로그. 이정표를 찾기 전까지는 몇 층·어디인지 모른다.
export function floorLogs(player) {
  const floor = getFloor(player)
  const header = player.floorKnown ? `— ${floor.name} · ${floor.place} —` : '— ??? —'
  return [log(header, 'header'), log(floor.intro)]
}

// 계단(또는 출구 문)을 찾았을 때의 로그. 아직 도착하지 않았으면 null.
export function arrivalLog(player) {
  if (!atExit(player)) return null
  if (getFloor(player).wing) return log('되짚어 돌아갈 수 있는 곳에 다다랐다.', 'event')
  return isFinalFloor(player)
    ? log('묵직한 철문이 보인다. 문틈으로 빛과 함께, 낮은 소리가 새어 나온다.', 'event')
    : log('위로 이어지는 계단을 찾았다.', 'event')
}

// 지금 위치에서 눈에 들어오는 것: 계단(출구), 잠긴 문, 곁길의 문
export const sightLogs = (player) => [arrivalLog(player), ...gateAnnounce(player), ...doorLogs(player)].filter(Boolean)

// 이 층에서 찾을 수 있는 소모품 하나를 뽑는다.
export function rollLoot(floorIndex, rng = Math.random) {
  return weightedPick(floors[floorIndex].loot, rng)
}

// 한 걸음 나아간다. 빛이 줄고, 사건이 하나 일어난다.
export function step(player, rng = Math.random) {
  if (atGate(player)) return { player, logs: [log('잠긴 문이 가로막고 있다. 먼저 열어야 한다.', 'muted')], enemy: null }
  const floor = getFloor(player)
  const logs = []
  let p = { ...player, steps: player.steps + 1, light: Math.max(0, player.light - config.lightPerStep) }
  if (player.light > 0 && p.light === 0) logs.push(log('손전등이 깜빡이다 꺼졌다. 어둠이 짙어진다.', 'bad'))

  const forward = Math.min(floor.length, p.progress + 1)
  const find = floor.finds.find((f) => f.at === forward && itemCount(p, f.item) === 0)
  const sign = !p.floorKnown && floor.sign && forward >= floor.sign.at ? floor.sign : null
  const event = find ? 'find' : sign ? 'sign' : weightedPick(eventWeights(p), rng)
  p = { ...p, dangerStreak: event === 'enemy' ? 0 : p.dangerStreak + 1 }
  let enemy = null
  let foundGear = null // 이번 걸음에 새로 얻은 무기·방어구. 있으면 장착할지 물어봐야 한다.

  switch (event) {
    case 'find':
      p = { ...addItem(p, find.item), progress: forward }
      logs.push(log(find.text, 'good'))
      if (['weapon', 'armor'].includes(itemData[find.item].type)) foundGear = find.item
      break
    case 'sign':
      p = { ...p, progress: forward, floorKnown: true }
      sign.text.forEach((t) => logs.push(log(t, 'event')))
      break
    case 'loot': {
      const id = rollLoot(p.floor, rng)
      const { player: withLoot, gained } = gain(p, id)
      p = { ...withLoot, progress: forward }
      logs.push(
        gained
          ? log(pick(lootTexts, rng)(itemData[id].name), 'good')
          : log(`${josa(itemData[id].name, '이/가')} 있었지만, 소지품이 가득 차 챙기지 못했다.`, 'muted'),
      )
      break
    }
    case 'trap': {
      const [min, max] = config.trapDamage
      const dmg = Math.min(p.hp - 1, randInt(min, max, rng))
      p = { ...p, hp: p.hp - dmg, progress: forward }
      logs.push(log(`${pick(trapTexts, rng)} 체력 -${dmg}`, 'bad'))
      break
    }
    case 'lost':
      p = { ...p, progress: Math.max(0, p.progress - 1) }
      logs.push(log('길을 잃었다. 방금 지나온 곳으로 되돌아와 버렸다.', 'muted'))
      break
    case 'enemy':
      p = { ...p, progress: forward }
      enemy = spawnFloorEnemy(p.floor, rng)
      logs.push(log(enemy.appear, 'event'))
      break
    default:
      p = { ...p, progress: forward }
      logs.push(log(pick(floor.ambient, rng), 'muted'))
  }

  p = markReached(p)
  if (!enemy) logs.push(...sightLogs(p))
  return { player: p, logs, enemy, foundGear }
}

// 쉰다. 층마다 횟수가 정해져 있고, 어둠 속에서 쉬다가 습격당할 수도 있다.
export function rest(player, rng = Math.random) {
  if (player.rests <= 0) return { player, logs: [log('이 층에서는 더 쉬기 불안하다.', 'muted')], enemy: null }
  if (player.hp >= player.maxHp) return { player, logs: [log('몸은 아직 멀쩡하다.', 'muted')], enemy: null }

  const { character, healed } = heal({ ...player, rests: player.rests - 1 }, config.restHeal)
  const logs = [log(`손전등을 끄고 벽에 기대어 숨을 고른다. 체력 +${healed}`, 'good')]
  if (rng() >= config.restAmbushChance) return { player: character, logs, enemy: null }

  const enemy = spawnFloorEnemy(player.floor, rng)
  logs.push(log('그때, 어둠 속에서 무언가 다가오는 기척이 난다.', 'bad'), log(enemy.appear, 'event'))
  return { player: character, logs, enemy }
}

// 왔던 길로 한 걸음 물러난다. 이미 지나온 자리라 빛이 들지 않고 사건도 일어나지 않지만,
// 그 자리의 곁길·갈림길·잠긴 문은 다시 안내해 준다.
export function retreat(player) {
  if (player.progress <= 0) return { player, logs: [log('더 물러날 곳이 없다.', 'muted')], enemy: null }
  const p = { ...player, progress: player.progress - 1 }
  return { player: p, logs: [log('왔던 길을 되짚어 한 걸음 물러났다.', 'muted'), ...sightLogs(p)], enemy: null }
}

// 빠른 되짚기: 이미 지나온 칸 사이는 사건 없이, 빛도 들이지 않고 한 번에 오간다(retreat를 여러 번 한 것과 같다).
// 입구(0)까지 물러나거나, 이 층에서 가장 멀리 나아갔던 칸(reached)까지 다시 나아간다.
export const furthest = (player) => player.reached[player.floor] ?? player.progress

export function backtrack(player, target) {
  const to = Math.max(0, Math.min(target, furthest(player)))
  if (to === player.progress) return { player, logs: [log('그럴 수 없다.', 'muted')], enemy: null }
  const p = { ...player, progress: to }
  const text = to < player.progress ? '왔던 길을 되짚어 입구까지 돌아왔다.' : '아는 길을 따라 지나왔던 곳까지 단숨에 나아갔다.'
  return { player: p, logs: [log(text, 'muted'), ...sightLogs(p)], enemy: null }
}

// 별관(wing 층)으로 들어오는 문: 어느 층의 몇 번째 방인지. 별관끼리 이어져 있어도(보안실 → 서/남/북) 문은 하나뿐이다.
export function wingEntrance(floorIndex) {
  for (const [fi, f] of floors.entries()) {
    const roomIndex = f.rooms.findIndex((r) => r.kind === 'wing' && r.enterFloor === floorIndex)
    if (roomIndex !== -1) return { floor: fi, roomIndex }
  }
  return null
}

// 별관의 입구나 끝에서 그 별관으로 들어온 문 앞으로 돌아간다. 문은 계속 열려 있어 언제든 다시 들어올 수 있다.
export function returnFromWing(player) {
  const { floor, roomIndex } = wingEntrance(player.floor)
  const door = getFloor({ ...player, floor }).rooms[roomIndex]
  const next = moveTo(player, floor, door.at)
  return { player: next, logs: [log('철문을 지나 온 길로 돌아나왔다.', 'muted'), ...floorLogs(next), ...sightLogs(next)], enemy: null }
}

// 계단을 올라 다음 층으로 간다. 처음 오는 층은 이정표를 다시 찾아야 한다.
export function climb(player) {
  const next = moveTo(player, player.floor + 1, 0)
  return { player: next, logs: [log('계단을 오른다.', 'muted'), ...floorLogs(next)], enemy: null }
}

// 입구의 계단을 내려가 아래층으로 되돌아간다. 아래층의 위로 오르는 계단(끝 칸) 앞에 선다.
export const canDescend = (player) => player.progress === 0 && player.floor > 0 && !getFloor(player).wing

export function descend(player) {
  if (!canDescend(player)) return { player, logs: [log('내려갈 계단이 없다.', 'muted')], enemy: null }
  const below = player.floor - 1
  const next = moveTo(player, below, floors[below].length)
  return { player: next, logs: [log('계단을 내려간다.', 'muted'), ...floorLogs(next), ...sightLogs(next)], enemy: null }
}
