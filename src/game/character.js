// 플레이어 / 적 로직. React와 무관한 순수 함수이며, 원본을 바꾸지 않고 새 객체를 반환한다.
import { config } from './config.js'
import { enemies as enemyData, floors, items as itemData } from './data.js'
import { clamp, gateKey, noteKey, pick, randInt, randomCodes, roomKey } from './util.js'

// 잠긴 곳(gate/wing/단말)마다 이 배열에서 하나씩 골라 쓰는 4자리 비밀번호의 개수. floors의 passwordIndex가 이 안의 자리를 가리킨다.
const PASSWORD_COUNT = 9

export const isAlive = (c) => c.hp > 0

export const itemCount = (player, id) => player.inventory[id] || 0

// 소지품 용량을 차지하는 종류. 장비(무기·방어구)는 하나만 쓰이므로 용량을 차지하지 않는다.
const CARRIED_TYPES = ['heal', 'light', 'material', 'vitality']
export const carriedCount = (player) =>
  Object.entries(player.inventory).reduce((sum, [id, n]) => (CARRIED_TYPES.includes(itemData[id]?.type) ? sum + n : sum), 0)

// 가방 용량. 가죽을 조합해 가방을 키울 때마다(bagLevel) 늘어난다.
export const capacityOf = (player) =>
  config.inventory.baseCapacity + player.bagLevel * config.inventory.capacityPerUpgrade

// 손전등의 최대 빛. 기계부품으로 개조할 때마다(lightLevel) 늘어난다.
export const maxLightOf = (player) => config.player.baseMaxLight + player.lightLevel * config.flashlight.capacityPerUpgrade

// 장착한 장비 하나의 보너스. type: 'weapon' | 'armor'. 가지고만 있고 장착하지 않은 장비는 반영되지 않는다.
function equippedBonus(player, type) {
  const id = player.equipped[type]
  return id ? itemData[id].value : 0
}

// 이식(aug)은 무기·방어구와 달리 여러 개를 동시에 장착할 수 있다. stat이 일치하는 것만 골라 합친다.
function augBonus(player, stat) {
  return player.equippedAugs.reduce((sum, id) => (itemData[id].stat === stat ? sum + itemData[id].value : sum), 0)
}

// 지금 장착 중인 이식들의 변질도 합. useGame.js의 ending 분기와 config.corruptionThreshold가 이 값을 본다.
export const corruptionOf = (player) => player.equippedAugs.reduce((sum, id) => sum + itemData[id].corruption, 0)

// 무기·방어구·이식을 장착한다.
// 무기/방어구는 같은 종류를 이미 장착했으면 갈아 낀다(소지품에서는 사라지지 않는다).
// 이식(aug)은 하나만 고르는 게 아니라 여러 개를 동시에 몸에 지닐 수 있어서, 이미 장착한 게 아니면 목록에 더한다.
export function equip(player, id) {
  const type = itemData[id]?.type
  if (type === 'weapon' || type === 'armor') return { ...player, equipped: { ...player.equipped, [type]: id } }
  if (type === 'aug') {
    if (player.equippedAugs.includes(id)) return player
    return { ...player, equippedAugs: [...player.equippedAugs, id] }
  }
  return player
}

// 이식을 뗀다. 소지품에서는 사라지지 않는다.
export function unequipAug(player, id) {
  return { ...player, equippedAugs: player.equippedAugs.filter((a) => a !== id) }
}

// 피험자 번호(네 자리 문자열). 쓰러질 때마다 1씩 늘어난다: 0417 → 0418 → …
export const subjectNumber = (player) => String((config.subjectStart + player.deaths) % 10000).padStart(4, '0')
// 투입 횟수. 번호와 마찬가지로 쓰러질 때마다 늘어난다.
export const insertionCount = (player) => config.insertionStart + player.deaths

// 잠긴 곳마다 player.passwords의 몇 번째 값을 쓰는지. floors의 gate.passwordIndex / rooms의 kind: 'wing' passwordIndex /
// terminal room의 login.passwordIndex가 가리키는 자리와 이름만 다를 뿐 같은 값이다. (판마다 임의로 정해진다)
export const PASSWORD_SLOT = { gate: 0, wingEast: 1, terminal: 2, wingWest: 3, wingNorth: 4, wingSouth: 5 }

// 쪽지나 계정 문장 속 자리표시자를 플레이어의 현재 값으로 바꾼다.
//   {번호} 피험자 번호 네 자리   {번호앞} 앞 두 자리   {번호뒤} 뒤 두 자리   {투입} 투입 횟수
//   {게이트} 실험동 잠긴 문 비밀번호   {단말앞}/{단말뒤} 관리 단말 비밀번호(GATE-####)의 앞/뒤 두 자리
//   {동별관}/{서별관}/{남별관}/{북별관} 각 방향 별관 통로 비밀번호
export function fillNote(text, player) {
  const number = subjectNumber(player)
  const terminalCode = player.passwords[PASSWORD_SLOT.terminal]
  return text
    .replaceAll('{번호앞}', number.slice(0, 2))
    .replaceAll('{번호뒤}', number.slice(2))
    .replaceAll('{번호}', number)
    .replaceAll('{투입}', String(insertionCount(player)))
    .replaceAll('{게이트}', player.passwords[PASSWORD_SLOT.gate])
    .replaceAll('{동별관}', player.passwords[PASSWORD_SLOT.wingEast])
    .replaceAll('{서별관}', player.passwords[PASSWORD_SLOT.wingWest])
    .replaceAll('{남별관}', player.passwords[PASSWORD_SLOT.wingSouth])
    .replaceAll('{북별관}', player.passwords[PASSWORD_SLOT.wingNorth])
    .replaceAll('{단말앞}', terminalCode.slice(0, 2))
    .replaceAll('{단말뒤}', terminalCode.slice(2))
}

export const attackOf = (player) => config.player.attack + equippedBonus(player, 'weapon') + augBonus(player, 'attack')
export const defenseOf = (player) => config.player.defense + equippedBonus(player, 'armor') + augBonus(player, 'defense')

export function createPlayer(rng = Math.random) {
  const p = config.player
  return {
    floor: 0, // floors 배열의 인덱스 (0 = 가장 깊은 층)
    progress: 0, // 이 층에서 나아간 걸음 수
    hp: p.maxHp,
    maxHp: p.maxHp,
    light: p.light,
    rests: config.restsPerFloor, // 이 층에서 남은 휴식 횟수
    steps: 0, // 지금까지 걸은 총 걸음 수
    dangerStreak: 0, // 마지막으로 적과 마주친 뒤 걸은 걸음 수. 늘어날수록 다음 걸음에 적과 마주칠 확률이 오른다.
    branchReturn: null, // 별관(wing)에 들어가 있는 동안, 돌아갈 층·자리를 기억해 둔다: { floor, progress }
    // 이번 판에 쓸, 무작위로 재배치된 지도 레이아웃. createPlayer()는 여기서 만들지 않고 null로 둔다 — 실제
    // "새로 시작" 흐름(useGame.js의 startRun)에서만 generateMapLayout()으로 채운다. mapgen.js의 getFloor 참고.
    mapLayout: null,
    // 이번 판에서 잠긴 곳(gate/wing/단말)마다 쓰일 4자리 후보 번호. 판마다 새로 뽑혀서, 쪽지 속 힌트도 이 값에 맞춰 바뀐다.
    // 어느 잠금이 몇 번째 값을 쓰는지는 fillNote의 PASSWORD_SLOT과 floors의 passwordIndex 참고.
    passwords: randomCodes(PASSWORD_COUNT, rng),
    deaths: 0,
    visited: [], // 다녀온 방의 키 목록 (util.js의 roomKey)
    notebook: [], // 수첩에 적어 둔 쪽지의 키 목록 (util.js의 noteKey)
    gatesOpen: [], // 연 잠긴 문의 키 목록 (util.js의 gateKey)
    floorKnown: false, // 이 층이 몇 층·어디인지 이정표를 찾아 알아냈는지. 다음 층으로 오르면 다시 false가 된다.
    inventory: { ...p.items },
    bagLevel: 0, // 가죽을 조합해 가방을 키운 횟수. 늘어날수록 소지품 용량이 커진다.
    lightLevel: 0, // 기계부품으로 손전등을 개조한 횟수. 늘어날수록 최대 빛이 커진다.
    equipped: { weapon: null, armor: null }, // 지금 장착한 무기·방어구의 id. 얻는다고 곧장 장착되지는 않는다.
    equippedAugs: [], // 지금 장착 중인 이식(aug)들의 id 목록. 무기·방어구와 달리 여러 개를 동시에 장착할 수 있다.
  }
}

export function spawnEnemy(id) {
  const base = enemyData[id]
  return { id, ...base, hp: base.maxHp }
}

// 이 층에 나오는 적 중 하나를 무작위로 만든다.
export const spawnFloorEnemy = (floorIndex, rng = Math.random) => spawnEnemy(pick(floors[floorIndex].enemies, rng))

// 공격력 - 방어력 ± 편차, 최소 1
export function calcDamage(attack, defense, rng = Math.random) {
  const v = config.damageVariance
  return Math.max(1, attack - defense + randInt(-v, v, rng))
}

export function takeDamage(c, amount) {
  return { ...c, hp: Math.max(0, c.hp - Math.max(0, amount)) }
}

// { character, healed } 반환
export function heal(c, amount) {
  const hp = Math.min(c.maxHp, c.hp + amount)
  return { character: { ...c, hp }, healed: hp - c.hp }
}

export function addItem(player, id, count = 1) {
  return { ...player, inventory: { ...player.inventory, [id]: itemCount(player, id) + count } }
}

// 탐색·전투 중에 소모품·재료를 얻을 때 쓴다. 가방이 가득 차 있으면 얻지 못한다(gained: false).
// 장비(무기·방어구)는 용량과 상관없이 항상 얻는다.
export function gain(player, id, count = 1) {
  if (CARRIED_TYPES.includes(itemData[id]?.type) && carriedCount(player) + count > capacityOf(player)) {
    return { player, gained: false }
  }
  return { player: addItem(player, id, count), gained: true }
}

// 수량이 모자라면 null
export function removeItem(player, id, count = 1) {
  if (itemCount(player, id) < count) return null
  const inventory = { ...player.inventory, [id]: player.inventory[id] - count }
  if (inventory[id] <= 0) delete inventory[id]
  return { ...player, inventory }
}

// 저장 데이터를 검증해서 복원한다. 손상됐으면 null.
export function restorePlayer(d) {
  if (!d || typeof d !== 'object') return null
  if (!['floor', 'progress', 'maxHp', 'hp', 'light'].every((k) => Number.isFinite(d[k]))) return null
  if (!Number.isInteger(d.floor) || d.floor < 0 || d.floor >= floors.length || d.maxHp <= 0) return null

  const inventory = {}
  for (const [id, n] of Object.entries(d.inventory || {})) {
    if (itemData[id] && Number.isInteger(n) && n > 0) inventory[id] = n
  }
  const count = (v, fallback) => (Number.isInteger(v) && v >= 0 ? v : fallback)
  const roomKeys = new Set(floors.flatMap((f, fi) => f.rooms.map((_, ri) => roomKey(fi, ri))))
  const visited = Array.isArray(d.visited) ? [...new Set(d.visited)].filter((k) => roomKeys.has(k)) : []
  const noteKeys = new Set(
    floors.flatMap((f, fi) => f.rooms.flatMap((r, ri) => (r.notes ?? []).map((_, i) => noteKey(fi, ri, i)))),
  )
  const notebook = Array.isArray(d.notebook) ? [...new Set(d.notebook)].filter((k) => noteKeys.has(k)) : []
  const gateKeys = new Set(floors.flatMap((f, fi) => (f.gate ? [gateKey(fi)] : [])))
  const gatesOpen = Array.isArray(d.gatesOpen) ? [...new Set(d.gatesOpen)].filter((k) => gateKeys.has(k)) : []

  // 장착 중인 장비. 그 종류가 맞고 아직도 가지고 있어야 유효하다.
  const validEquipped = (id, type) => (id && itemData[id]?.type === type && inventory[id] ? id : null)
  // 장착 개념이 생기기 전(d.equipped가 아예 없는) 저장 데이터는, 이 기능이 생기기 전처럼 가진 것 중 가장 좋은 걸로 맞춰 준다.
  const bestOwned = (type) =>
    Object.keys(inventory)
      .filter((id) => itemData[id]?.type === type)
      .sort((a, b) => itemData[b].value - itemData[a].value)[0] ?? null
  const equipped =
    d.equipped && typeof d.equipped === 'object'
      ? { weapon: validEquipped(d.equipped.weapon, 'weapon'), armor: validEquipped(d.equipped.armor, 'armor') }
      : { weapon: bestOwned('weapon'), armor: bestOwned('armor') }

  // 장착 중인 이식들. 그 종류가 aug이고 아직도 가지고 있어야 유효하다.
  const equippedAugs = Array.isArray(d.equippedAugs)
    ? [...new Set(d.equippedAugs)].filter((id) => itemData[id]?.type === 'aug' && inventory[id])
    : []

  const lightLevel = count(d.lightLevel, 0)

  // 이번 판의 잠긴 곳 비밀번호들. 이 기능이 생기기 전 저장 데이터거나 손상되었으면 새로 뽑는다.
  // (이미 읽은 쪽지도 fillNote가 그때그때 다시 채우는 값이라, 여기서 새로 뽑아도 어긋나지 않는다)
  const validPasswords =
    Array.isArray(d.passwords) &&
    d.passwords.length === PASSWORD_COUNT &&
    new Set(d.passwords).size === PASSWORD_COUNT &&
    d.passwords.every((v) => /^\d{4}$/.test(v))
  const passwords = validPasswords ? d.passwords : randomCodes(PASSWORD_COUNT)

  // 이번 판에서 생성된 지도 레이아웃(판마다 무작위로 재배치됨). 이 기능이 생기기 전 저장 데이터거나,
  // 모양이 지금의 floors와 안 맞으면(길이가 다르다 등) 그 층은 버리고 원래(수기) 레이아웃을 쓰게 한다.
  const mapLayout = (() => {
    if (!d.mapLayout || typeof d.mapLayout !== 'object') return null
    const result = {}
    for (const [key, entry] of Object.entries(d.mapLayout)) {
      const floor = floors[Number(key)]
      if (!floor || !entry || typeof entry !== 'object') continue
      if (typeof entry.path !== 'string' || entry.path.length !== floor.length) continue
      if (!Array.isArray(entry.rooms) || entry.rooms.length !== floor.rooms.length) continue
      const roomsOk = entry.rooms.every(
        (r) => r && Number.isInteger(r.at) && r.at >= 0 && r.at < floor.length && ['R', 'D', 'L', 'U'].includes(r.dir),
      )
      if (roomsOk) result[Number(key)] = entry
    }
    return Object.keys(result).length ? result : null
  })()

  // 별관에 들어가 있던 기록. 돌아갈 층·자리가 지금도 유효해야(그 층이 실제로 있고 자리도 범위 안이어야) 유지한다.
  const branchReturn = (() => {
    const b = d.branchReturn
    if (!b || typeof b !== 'object') return null
    if (!Number.isInteger(b.floor) || b.floor < 0 || b.floor >= floors.length) return null
    if (!Number.isFinite(b.progress)) return null
    return { floor: b.floor, progress: clamp(Math.floor(b.progress), 0, floors[b.floor].length) }
  })()

  return {
    floor: d.floor,
    progress: clamp(Math.floor(d.progress), 0, floors[d.floor].length),
    hp: clamp(d.hp, 1, d.maxHp),
    maxHp: d.maxHp,
    light: clamp(d.light, 0, maxLightOf({ lightLevel })),
    rests: clamp(count(d.rests, config.restsPerFloor), 0, config.restsPerFloor),
    steps: count(d.steps, 0),
    dangerStreak: count(d.dangerStreak, 0),
    passwords,
    mapLayout,
    branchReturn,
    deaths: count(d.deaths, 0),
    bagLevel: count(d.bagLevel, 0),
    lightLevel,
    equipped,
    equippedAugs,
    visited,
    notebook,
    gatesOpen,
    floorKnown: d.floorKnown === true,
    inventory,
  }
}
