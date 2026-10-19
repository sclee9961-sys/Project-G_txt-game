// 판마다 각 층의 복도 모양(path)과 곁길 방의 자리(at/dir)를 다시 뽑는다.
// 방 배열의 인덱스는 절대 바꾸지 않는다 — 세이브의 visited/notebook 키가 인덱스 기반이라서, 각 방은 원래
// 자리(배열 순서)에 그대로 머물고 at/dir 값만 다시 뽑는다. 같은 층 안에서 비밀번호 힌트가 적힌 방(또는 잠긴 문)은
// 그 비밀번호를 쓰는 문/방보다 항상 먼저 나오도록(at가 더 작도록) 순서를 지키고, 나머지는 자유롭게 뒤섞는다.
import { PASSWORD_SLOT } from './character.js'
import { floors } from './data.js'

const DIRS = ['R', 'D', 'L', 'U']
const STEP = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] }
const GATE_NODE = '__gate__'
const MAX_FLOOR_ATTEMPTS = 50
const MAX_PATH_ATTEMPTS = 300

// map.js의 mapGridSize와 같은 공식이다. 순환 참조(map.js → mapgen.js)를 피하려고 여기 따로 둔다.
const gridSize = (floorIndex) => 50 + Math.floor(floorIndex / 3) * 11

// map.js의 pathCells와 같은 계산. 역시 순환 참조를 피하려고 따로 둔다.
function pathCells(path) {
  const cells = [{ x: 0, y: 0 }]
  for (const d of path) {
    const [dx, dy] = STEP[d]
    const last = cells.at(-1)
    cells.push({ x: last.x + dx, y: last.y + dy })
  }
  return cells
}

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// [lo, hi] 범위에서 서로 다른 정수 n개를 무작위로 뽑아 오름차순으로 돌려준다. 범위가 부족하면 null.
function sampleSorted(lo, hi, n, rng) {
  if (n === 0) return []
  const size = hi - lo + 1
  if (size < n) return null
  const pool = Array.from({ length: size }, (_, i) => lo + i)
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(rng() * (size - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n).sort((a, b) => a - b)
}

// 자기 자신과 겹치지 않는 길이 length짜리 경로를 백트래킹 랜덤워크로 한 번 만들어 본다. 막히면 null.
function attemptWalk(length, rng) {
  const cells = [{ x: 0, y: 0 }]
  const seen = new Set(['0,0'])
  const path = []
  const choices = [shuffle(DIRS, rng)]
  let i = 0

  while (i < length) {
    if (choices[i].length === 0) {
      if (i === 0) return null
      choices.pop()
      const removed = cells.pop()
      seen.delete(`${removed.x},${removed.y}`)
      path.pop()
      i -= 1
      continue
    }
    const dir = choices[i].pop()
    const last = cells[i]
    const [dx, dy] = STEP[dir]
    const next = { x: last.x + dx, y: last.y + dy }
    const key = `${next.x},${next.y}`
    if (seen.has(key)) continue
    seen.add(key)
    cells.push(next)
    path.push(dir)
    choices.push(shuffle(DIRS, rng))
    i += 1
  }
  return path.join('')
}

// attemptWalk을 반복해서, 그 층의 지도 캔버스(gridSize) 안에 넉넉히 들어오는 모양이 나올 때까지 고른다.
// (캔버스보다 훨씬 작게 잡아서, 굳이 구석까지 몰리는 드문 모양은 그냥 다시 뽑는다)
function generateSelfAvoidingPath(length, floorIndex, rng) {
  const size = gridSize(floorIndex)
  const margin = 4
  for (let attempt = 0; attempt < MAX_PATH_ATTEMPTS; attempt += 1) {
    const path = attemptWalk(length, rng)
    if (!path) continue
    const cells = pathCells(path)
    const xs = cells.map((c) => c.x)
    const ys = cells.map((c) => c.y)
    const w = Math.max(...xs) - Math.min(...xs) + 1
    const h = Math.max(...ys) - Math.min(...ys) + 1
    if (w <= size - margin && h <= size - margin) return path
  }
  return null
}

// 같은 at를 쓰는 방들(갈림길/포크)을 하나의 그룹으로 묶는다. at: 원래(수기) at 값, indices: 그 방들의 배열 인덱스.
function forkGroups(rooms) {
  const byAt = new Map()
  rooms.forEach((room, index) => {
    if (!byAt.has(room.at)) byAt.set(room.at, [])
    byAt.get(room.at).push(index)
  })
  return [...byAt.entries()].map(([at, indices]) => ({ at, indices }))
}

// 쪽지/문장 속 자리표시자로 "이 방이 어느 잠금의 힌트를 담고 있는지" 알아낸다. character.js의 fillNote가
// 채우는 자리표시자와 PASSWORD_SLOT 테이블을 그대로 따른다.
const PLACEHOLDER_SLOT_NAME = {
  '{게이트}': 'gate',
  '{동별관}': 'wingEast',
  '{서별관}': 'wingWest',
  '{남별관}': 'wingSouth',
  '{북별관}': 'wingNorth',
  '{단말앞}': 'terminal',
  '{단말뒤}': 'terminal',
}

function hintedSlots(room) {
  const text = [...(room.notes ?? []), ...(room.text ?? [])].join('\n')
  const slots = new Set()
  for (const [placeholder, slotName] of Object.entries(PLACEHOLDER_SLOT_NAME)) {
    if (text.includes(placeholder)) slots.add(PASSWORD_SLOT[slotName])
  }
  return slots
}

// 이 방이 어느 잠금을 "소비"하는지(wing/terminal의 passwordIndex). 아니면 undefined.
function lockSlot(room) {
  if (room.kind === 'wing') return room.passwordIndex
  if (room.kind === 'terminal') return room.login?.passwordIndex
  return undefined
}

function groupHintedSlots(group, rooms) {
  const slots = new Set()
  group.indices.forEach((i) => hintedSlots(rooms[i]).forEach((s) => slots.add(s)))
  return slots
}

function groupLockSlots(group, rooms) {
  const slots = new Set()
  group.indices.forEach((i) => {
    const s = lockSlot(rooms[i])
    if (s !== undefined) slots.add(s)
  })
  return slots
}

// "힌트를 먼저 봐야 잠금을 쓸 수 있다"는 순서 제약을 그래프(엣지: [먼저 와야 할 at, 그 다음 at])로 만든다.
// 같은 층의 gate도 (움직이지 않는) 고정 지점으로 그래프에 끼워 넣어, 힌트 방은 항상 gate.at보다 작은 at를 받게 한다.
function buildDependencyGraph(floor, groups) {
  const nodeIds = groups.map((g) => g.at)
  const edges = []
  const gateSlot = floor.gate?.passwordIndex
  if (floor.gate) nodeIds.push(GATE_NODE)

  const lockSlotsByGroup = groups.map((g) => groupLockSlots(g, floor.rooms))

  groups.forEach((group, gi) => {
    groupHintedSlots(group, floor.rooms).forEach((slot) => {
      if (gateSlot !== undefined && slot === gateSlot) edges.push([group.at, GATE_NODE])
      groups.forEach((other, oi) => {
        if (oi !== gi && lockSlotsByGroup[oi].has(slot)) edges.push([group.at, other.at])
      })
    })
  })

  return { nodeIds, edges }
}

// Kahn's algorithm인데, 동시에 준비된 노드가 여럿이면 무작위로 하나를 고른다(무작위 위상정렬).
function randomTopoOrder(nodeIds, edges, rng) {
  const indegree = new Map(nodeIds.map((id) => [id, 0]))
  const adj = new Map(nodeIds.map((id) => [id, []]))
  for (const [from, to] of edges) {
    if (!adj.has(from) || !indegree.has(to)) continue
    adj.get(from).push(to)
    indegree.set(to, indegree.get(to) + 1)
  }
  const ready = nodeIds.filter((id) => indegree.get(id) === 0)
  const order = []
  while (ready.length) {
    const idx = Math.floor(rng() * ready.length)
    const node = ready.splice(idx, 1)[0]
    order.push(node)
    adj.get(node).forEach((next) => {
      indegree.set(next, indegree.get(next) - 1)
      if (indegree.get(next) === 0) ready.push(next)
    })
  }
  return order.length === nodeIds.length ? order : null
}

// 위상정렬 순서대로 1..length-1 범위의 새 at 값을 오름차순으로 나눠 준다. gate가 있으면 그 자리를 기준으로
// 앞쪽 노드는 1..gate.at-1, 뒤쪽 노드는 gate.at+1..length-1 범위에서만 뽑아, gate 앞뒤 관계도 자연히 지켜진다.
function assignPositions(order, length, gateAt, rng) {
  const positions = new Map()
  const gateIndex = order.indexOf(GATE_NODE)
  if (gateIndex === -1) {
    const values = sampleSorted(1, length - 1, order.length, rng)
    if (!values) return null
    order.forEach((id, i) => positions.set(id, values[i]))
    return positions
  }
  const before = order.slice(0, gateIndex)
  const after = order.slice(gateIndex + 1)
  const lowValues = sampleSorted(1, gateAt - 1, before.length, rng)
  const highValues = sampleSorted(gateAt + 1, length - 1, after.length, rng)
  if (!lowValues || !highValues) return null
  before.forEach((id, i) => positions.set(id, lowValues[i]))
  after.forEach((id, i) => positions.set(id, highValues[i]))
  return positions
}

// 그룹마다 새 at 칸을 기준으로, 복도나 이미 배치된 다른 방과 안 겹치는 방향을 무작위로 골라 준다.
// 포크(같은 at를 쓰는 방 여럿)는 먼저 배치된 방의 칸도 충돌 검사에 들어가므로 자연히 서로 다른 방향을 받는다.
function assignDirections(cells, groups, positions, rng) {
  const occupied = new Set(cells.map((c) => `${c.x},${c.y}`))
  const dirs = new Map()
  for (const group of groups) {
    const from = cells[positions.get(group.at)]
    const order = shuffle(DIRS, rng)
    for (const roomIndex of group.indices) {
      const dir = order.find((d) => {
        const [dx, dy] = STEP[d]
        return !occupied.has(`${from.x + dx},${from.y + dy}`)
      })
      if (!dir) return null
      const [dx, dy] = STEP[dir]
      occupied.add(`${from.x + dx},${from.y + dy}`)
      dirs.set(roomIndex, dir)
    }
  }
  return dirs
}

// 층 하나의 새 레이아웃을 만든다. 실패(막다른 구석이라 자리를 못 찾는 등, 드문 경우)하면 null —
// 호출자(getFloor)는 null이면 그 층의 원래(수기) 레이아웃을 그대로 쓴다.
function generateFloorLayout(floor, floorIndex, rng) {
  const groups = forkGroups(floor.rooms)
  const { nodeIds, edges } = buildDependencyGraph(floor, groups)

  for (let attempt = 0; attempt < MAX_FLOOR_ATTEMPTS; attempt += 1) {
    const path = generateSelfAvoidingPath(floor.length, floorIndex, rng)
    if (!path) continue
    const order = randomTopoOrder(nodeIds, edges, rng)
    if (!order) return null // 순환 의존 — 구조적인 문제라 다시 시도해도 소용없다
    const positions = assignPositions(order, floor.length, floor.gate?.at, rng)
    if (!positions) continue
    const dirs = assignDirections(pathCells(path), groups, positions, rng)
    if (!dirs) continue
    const rooms = floor.rooms.map((room, index) => ({ at: positions.get(room.at), dir: dirs.get(index) }))
    return { path, rooms }
  }
  return null
}

// "기록을 지우고 새로 시작"할 때 한 번 호출해서 player.mapLayout에 저장한다(useGame.js의 startRun).
// 층마다 독립적으로 생성하며, 생성에 실패한 층은 결과에서 빠진다(= 그 층은 원본 레이아웃 유지).
export function generateMapLayout(rng = Math.random) {
  const layout = {}
  floors.forEach((floor, floorIndex) => {
    const generated = generateFloorLayout(floor, floorIndex, rng)
    if (generated) layout[floorIndex] = generated
  })
  return layout
}

// 지금 플레이어가 있는 층의 데이터. player.mapLayout에 이 층의 생성된 레이아웃이 있으면 path/rooms[].at,dir를
// 그걸로 덮어써서 돌려주고, 없으면(테스트처럼 createPlayer()만으로 만든 플레이어, 옛 세이브, 생성 실패한 층)
// 원본 floors[player.floor]를 그대로 돌려준다.
export function getFloor(player) {
  const floor = floors[player.floor]
  const layout = player.mapLayout?.[player.floor]
  if (!layout) return floor
  return {
    ...floor,
    path: layout.path,
    rooms: floor.rooms.map((room, i) => ({ ...room, at: layout.rooms[i].at, dir: layout.rooms[i].dir })),
  }
}
