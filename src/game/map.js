// 지도 그리기. 층의 통로 모양(path)·곁길의 방(rooms)과 진행도만으로 계산하는 순수 함수라 게임 상태를 따로 저장하지 않는다.
import { roomKinds } from './data.js'
import { isGateOpen } from './gate.js'
import { getFloor } from './mapgen.js'
import { isVisited } from './rooms.js'

const STEP = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] }

// 지나온 칸(0번째부터 지금까지)마다 상하좌우 1칸(체비쇼프 거리 1, 3x3)씩 본 것으로 친다.
// 한 번 본 곳은 다시 가려지지 않는다 — 지나온 길 전체가 계속 보인다.
const VIEW_RADIUS = 1

// 같은 at에 방이 두 개 이상이면 갈림길이다.
const isFork = (floor, room) => floor.rooms.filter((r) => r.at === room.at).length >= 2

// path 문자열을 칸 좌표 목록으로 바꾼다. 첫 칸(입구)은 (0, 0)이고, 칸은 걸음 수 + 1개다.
export function pathCells(path) {
  const cells = [{ x: 0, y: 0 }]
  for (const d of path) {
    const [dx, dy] = STEP[d]
    const last = cells.at(-1)
    cells.push({ x: last.x + dx, y: last.y + dy })
  }
  return cells
}

// 곁길의 방이 놓이는 칸: 통로의 at번째 칸에서 dir 방향으로 한 칸 떨어진 곳
export function roomCell(cells, room) {
  const [dx, dy] = STEP[room.dir]
  const from = cells[room.at]
  return { x: from.x + dx, y: from.y + dy }
}

// 지도 전체 캔버스 크기. 3개 층마다 한 단계씩 커진다 (지하 10층 50x50 ~ 지하 1층 83x83).
// 화면에는 이보다 작은 고정 창(VIEW_SIZE)만 보이므로, 층이 커질수록 실제로 잘려 보이는 부분도 커진다.
export function mapGridSize(floorIndex) {
  const size = 50 + Math.floor(floorIndex / 3) * 11
  return { width: size, height: size }
}

// 화면에 실제로 보이는 지도 창의 크기. 가장 작은 캔버스(10x10)보다 작게 잡아, 층이 몇 층이든
// 항상 이 크기로 잘려 보인다. (레이아웃의 지도 칸 폭에 넉넉히 들어가는 크기다)
const VIEW_SIZE = { width: 9, height: 9 }
export function mapViewSize() {
  return VIEW_SIZE
}

// 통로·방 좌표를 고정 캔버스 위에 올리는 데 필요한 값들을 한 번에 계산한다. buildMap과 viewOrigin이 함께 쓴다.
function canvasLayout(player) {
  const floor = getFloor(player)
  const cells = pathCells(floor.path)
  const roomCells = floor.rooms.map((room) => roomCell(cells, room))
  const all = [...cells, ...roomCells]
  const minX = Math.min(...all.map((c) => c.x))
  const minY = Math.min(...all.map((c) => c.y))
  const pathWidth = Math.max(...all.map((c) => c.x)) - minX + 1
  const pathHeight = Math.max(...all.map((c) => c.y)) - minY + 1

  const { width, height } = mapGridSize(player.floor)
  // 통로가 고정 캔버스보다 작으면 가운데로 오도록 오프셋을 더한다.
  const offsetX = minX - Math.floor((width - pathWidth) / 2)
  const offsetY = minY - Math.floor((height - pathHeight) / 2)
  const at = (c) => [c.x - offsetX, c.y - offsetY]

  return { floor, cells, roomCells, width, height, at }
}

// 지도 한 줄씩의 문자열 배열을 돌려준다. (캔버스 전체 — 화면에 보일 범위만 잘라내는 건 mapView가 한다)
//   floor.theme.symbol 갈 수 있는 길(층마다 다른 글자)   @ 현재 위치   ^ 출구(계단 또는 문)   # 벽 또는 아직 안 연 잠긴 문
//   곁길의 방(대문자는 아직 안 가 본 방, 소문자는 다녀온 방)   (공백) 아직 한 번도 못 본 곳
//   갈림길(같은 at에 방이 둘 이상)은 안 가 본 쪽이면 무엇인지(막다른 길인지도) 감추고 ? 로만 그린다. 가 보면 그때 실제 글자로 바뀐다.
// 캔버스 크기는 층 전체에 맞춰 고정이라 걸을 때마다 틀이 변하지 않고, 지나온 길은 한 번 보이면 계속 보인다.
// roomIndex: 지금 그 방(휴게실 등) 화면 안에 있다면 방 번호. 있으면 @가 통로 대신 그 방의 글자 자리로 옮겨 겹쳐 보인다.
export function buildMap(player, roomIndex = null) {
  const { floor, cells, roomCells, width, height, at } = canvasLayout(player)

  const here = Math.min(Math.max(player.progress, 0), cells.length - 1)

  // 지나온 칸(0~here)마다의 3x3 반경을 합친 것이 "본 적 있는" 범위다.
  const seenCenters = cells.slice(0, here + 1).map(at)
  const inView = (x, y) => seenCenters.some(([cx, cy]) => Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= VIEW_RADIUS)

  const grid = Array.from({ length: height }, () => Array(width).fill(' '))

  // 잠긴 문: 열기 전에는 그 앞칸(gate.at)이 길이 아니라 벽처럼 막혀 보인다.
  const gateBlocked = floor.gate && !isGateOpen(player)

  // 통로 칸: 층마다 테마 글자(floor.theme.symbol)로 그린다.
  cells.forEach((c, i) => {
    const [x, y] = at(c)
    if (!inView(x, y)) return
    grid[y][x] = gateBlocked && i === floor.gate.at ? '#' : floor.theme.symbol
  })

  // 곁길 방: 문을 지나왔으면(한 번 발견했으면) 그 뒤로는 계속 그려진다.
  floor.rooms.forEach((room, i) => {
    if (player.progress < room.at) return
    const [x, y] = at(roomCells[i])
    const visited = isVisited(player, i)
    const symbol = roomKinds[room.kind].symbol
    grid[y][x] = visited ? symbol.toLowerCase() : isFork(floor, room) ? '?' : symbol
  })

  // 벽: 본 적 있는 범위 안이지만 길도 방도 아닌 칸
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x] === ' ' && inView(x, y)) grid[y][x] = '#'
    }
  }

  const [mx, my] = roomIndex != null ? at(roomCells[roomIndex]) : at(cells[here])
  grid[my][mx] = roomIndex == null && here === cells.length - 1 ? '^' : '@'
  return grid.map((row) => row.join(''))
}

// 화면에 보이는 창의 왼쪽 위 좌표(캔버스 기준). 플레이어(또는 지금 들어와 있는 방)를 가운데 두려 하되,
// 캔버스 끝에서는 더 밀리지 않도록 붙잡는다 — 그래서 창이 캔버스 밖의 빈 공간을 보여주는 일은 없다.
export function viewOrigin(player, roomIndex = null) {
  const { cells, roomCells, width, height, at } = canvasLayout(player)
  const here = Math.min(Math.max(player.progress, 0), cells.length - 1)
  const [px, py] = roomIndex != null ? at(roomCells[roomIndex]) : at(cells[here])
  const { width: vw, height: vh } = VIEW_SIZE
  const x = Math.min(Math.max(px - Math.floor(vw / 2), 0), Math.max(0, width - vw))
  const y = Math.min(Math.max(py - Math.floor(vh / 2), 0), Math.max(0, height - vh))
  return { x, y }
}

// 화면에 실제로 그릴 지도. buildMap의 캔버스 전체(층이 커질수록 커진다) 중, 플레이어를 따라다니는
// 고정 크기(VIEW_SIZE) 창만 잘라 낸다. 창을 벗어난 칸은 (본 적이 있어도) 화면에서는 안 보인다.
export function mapView(player, roomIndex = null) {
  const grid = buildMap(player, roomIndex)
  const { width: vw, height: vh } = VIEW_SIZE
  const { x, y } = viewOrigin(player, roomIndex)
  return grid.slice(y, y + vh).map((row) => row.slice(x, x + vw))
}

// 지도 아래에 붙는 설명 줄들. 발견한 방의 종류만 알려주되, 안 가 본 갈림길은 무엇인지 알려주지 않는다.
export function mapLegend(player) {
  const floor = getFloor(player)
  const lines = [`@ 현재 · ${floor.theme.symbol} ${floor.theme.label} · ^ 출구 · # 벽`]
  const found = floor.rooms.filter(
    (room, i) => player.progress >= room.at && (isVisited(player, i) || !isFork(floor, room)),
  )
  if (found.length) {
    const kinds = [...new Set(found.map((room) => room.kind))]
    lines.push(`${kinds.map((k) => `${roomKinds[k].symbol} ${roomKinds[k].name}`).join(' · ')} (소문자는 다녀온 곳)`)
  }
  const hiddenFork = floor.rooms.some(
    (room, i) => player.progress >= room.at && isFork(floor, room) && !isVisited(player, i),
  )
  if (hiddenFork) lines.push('? 안 가 본 갈림길 (들어가 봐야 무엇인지 압니다)')
  if (floor.gate && player.progress >= floor.gate.at - 1 && !isGateOpen(player)) {
    lines.push('# 잠긴 문 (비밀번호 필요)')
  }
  return lines
}
