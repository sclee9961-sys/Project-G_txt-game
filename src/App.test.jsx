// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { createPlayer } from './game/character.js'
import { config } from './game/config.js'
import { floors } from './game/data.js'

const button = (label) => screen.queryByRole('button', { name: new RegExp(label) })
const click = (label) => fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
const text = (t) => screen.queryByText(t)
const notes = () => document.querySelectorAll('.log .note')

// 난수를 고정한다: 0 = 별일 없음, 0.5 = 피해 편차 0, 0.8 = 적을 만난다
const fixRandom = (v) => vi.spyOn(Math, 'random').mockReturnValue(v)

// 전투가 끝날 때까지 공격만 반복한다. (승/패 어느 쪽이든 '계속' 버튼이 나온다)
function fightToTheEnd() {
  for (let i = 0; i < 200 && !button('계속'); i += 1) click('공격')
  expect(button('계속')).not.toBeNull()
}

// 가짜 시간을 조금씩 흘려보내며(각 틱마다 React가 그 결과를 반영할 시간을 준다) condition이 될 때까지 기다린다.
// ComputerScene은 여러 단계(조명 켜짐 → 다가감 → 대사 해독 → 결말 연출)가 전부 setTimeout으로 이어져 있어서,
// 한 번에 크게 건너뛰기보다 이렇게 잘게 흘려야 중간의 state 변화가 다음 setTimeout 예약까지 제대로 이어진다.
function advanceUntil(condition, { step = 40, maxMs = 20000 } = {}) {
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    if (condition()) return
    act(() => vi.advanceTimersByTime(step))
  }
  if (!condition()) throw new Error('advanceUntil: 시간이 다 됐는데도 조건을 만족하지 못했다')
}

// COMPUTER 장면에 들어온 뒤(screen: 'computer'), 고정된 대화 선택지만 골라 항상 ESCAPE 결말까지 도달시킨다.
// (computerDialogue.js의 start→whereAmI→whyHere→question→resist1→resist2 경로 — 전부 난수와 무관한 고정 분기다)
function driveComputerToEscape() {
  advanceUntil(() => button('다가가본다'))
  click('다가가본다')
  for (const choice of ['여긴 어디지', '그래서, 내가 왜 여기 있었던 건데', '그래서 결론이 뭔데', '당연하지', '그래도 나는 나간다']) {
    advanceUntil(() => button(choice))
    click(choice)
  }
  advanceUntil(() => text('— 탈출 —') || text('— 판정 보류 —'))
}

// 저장 데이터(기본 플레이어에 patch를 덮어쓴 것)를 미리 심어 두고 "이어서 걷는다"까지 누른다.
// 반환하는 player는 실제로 저장한 값이라, 그 판에 뽑힌 passwords 같은 난수 결과를 테스트에서 그대로 참고할 수 있다.
function continueFromSave(patch) {
  const player = { ...createPlayer(), ...patch }
  localStorage.setItem(config.saveKey, JSON.stringify({ version: config.version, player }))
  render(<App />)
  click('이어서 걷는다')
  return player
}

describe('App 플레이 흐름', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom에는 matchMedia가 없다. DecodingLines(COMPUTER 대사 해독 연출)의 useReducedMotion이 이걸 호출한다.
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('타이틀에서는 저장 데이터가 없으면 "눈을 뜬다"만 보인다', () => {
    render(<App />)
    expect(button('눈을 뜬다')).not.toBeNull()
    expect(button('이어서 걷는다')).toBeNull()
  })

  it('눈을 뜨면 곧장 시작하지 않고, 어둠 속 지문과 함께 주변을 둘러본다만 고를 수 있다', () => {
    render(<App />)
    click('눈을 뜬다')
    expect(text('???')).not.toBeNull() // 아직 몇 층인지 알 계제가 아니다. 제목도 ???로 가려진다
    expect(text('어디선가 환풍기 소리가 낮게 들려온다.')).not.toBeNull() // 타이틀의 분위기 문장은 남아 있다
    expect(text(/칠흑 같은 어둠뿐이다/)).not.toBeNull() // 하수구 분위기의 새 지문
    expect(text(/녹슨 쇠와 고인 물 냄새/)).not.toBeNull()
    expect(button('주변을 둘러본다')).not.toBeNull()
    expect(button('전진')).toBeNull() // 아직 탐색은 시작되지 않았다
    expect(text(/손전등과 쪽지 하나가 있었다/)).toBeNull() // '둘러본다'의 지문은 아직 나오지 않았다
  })

  it('주변을 둘러본다를 고르면 그제야 깨어난 지문이 나오고 지하 10층에서 시작한다', () => {
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    expect(text('???')).not.toBeNull() // 몇 층인지는 이정표를 찾기 전까지 모른다
    expect(text(/손전등과 쪽지 하나가 있었다/)).not.toBeNull()
    expect(notes()[0].textContent).toContain('이 곳을 탈출하라.') // 쪽지 문구
    expect(text(`${config.player.maxHp} / ${config.player.maxHp}`)).not.toBeNull() // 체력
    expect(screen.getByRole('img', { name: /\?\?\?, 0 \/ 26칸/ })).not.toBeNull() // 이동은 지도 쪽에서 확인한다
    expect(text('붕대')).not.toBeNull() // 소지품
    expect(button('전진')).not.toBeNull()
    // 본격적으로 시작했으니, 타이틀·눈을 뜨는 동안 나온 지문은 기록에서 지워졌다
    expect(text('어디선가 환풍기 소리가 낮게 들려온다.')).toBeNull()
    expect(text(/칠흑 같은 어둠뿐이다/)).toBeNull()
  })

  it('이정표를 찾기 전까지는 ???로 보이고, 찾으면 몇 층·어디인지 드러난다', () => {
    fixRandom(0) // 별일 없으면 나아가고, 이정표가 있는 칸에서는 이정표를 찾는다
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    expect(text('???')).not.toBeNull()

    click('전진') // 1칸: 아직 못 찾았다
    expect(text('???')).not.toBeNull()

    click('전진') // 2칸: 이정표를 찾는다
    expect(text('지하 10층 · 배수로')).not.toBeNull()
    expect(text('「지하 10층 · 배수로」')).not.toBeNull() // 이정표 문구가 기록에 남는다
  })

  it('지도는 현재 위치 둘레 3x3만 보이고, 상태·소지품과 같은 테두리를 쓴다', () => {
    fixRandom(0) // 별일 없으면 나아가고, 이정표가 있는 칸(2번째)에서는 이정표를 찾는다
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    // 현재 위치(@) 둘레 3x3 칸만 잘라 온다
    const window3 = () => {
      const lines = document.querySelector('.map-grid').textContent.split('\n')
      const y = lines.findIndex((row) => row.includes('@'))
      const x = lines[y].indexOf('@')
      return [y - 1, y, y + 1].map((r) => lines[r].slice(x - 1, x + 2))
    }
    expect(screen.getByRole('img', { name: /\?\?\?, 0 \/ 26칸/ })).not.toBeNull() // 몇 층인지 아직 모른다
    // 복도 모양은 판마다 무작위라 어느 쪽으로 꺾이는지는 모르지만, 시작 지점(@) 둘레 3x3은 전부
    // 체비쇼프 거리 1 이내(= 반드시 "본 적 있는" 범위)라, 통로면 테마 글자, 아니면 반드시 #이어야 한다 — 빈 칸(안 본 곳)은 없다.
    expect(window3().join('')).not.toMatch(/ /)

    click('전진')
    click('전진')
    expect(screen.getByRole('img', { name: /지하 10층, 2 \/ 26칸/ })).not.toBeNull() // 이정표를 찾아 이제는 안다
    expect(window3().join('')).not.toMatch(/ /) // 움직인 뒤에도 현재 위치 둘레는 항상 다 드러나 있다
    // 지도 상자는 상태·소지품과 같은 .box 테두리를 쓴다
    const mapBox = document.querySelector('.map-box')
    expect(mapBox.classList.contains('box')).toBe(true)
    expect(mapBox.dataset.legend).toBe('지도')
  })

  it('돌아간다로 한 걸음 물러날 수 있고, 입구에서는 버튼이 사라진다', () => {
    fixRandom(0) // 별일 없이 한 칸씩 나아간다
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    expect(button('돌아간다')).toBeNull() // 입구에서는 물러날 곳이 없다

    click('전진')
    click('전진')
    expect(screen.getByRole('img', { name: /지하 10층, 2 \/ 26칸/ })).not.toBeNull()

    click('돌아간다')
    expect(screen.getByRole('img', { name: /지하 10층, 1 \/ 26칸/ })).not.toBeNull()
    click('돌아간다')
    expect(screen.getByRole('img', { name: /지하 10층, 0 \/ 26칸/ })).not.toBeNull()
    expect(button('돌아간다')).toBeNull() // 다시 입구다
  })

  it('나아가다 적을 만나 싸우고 이기면 탐색으로 돌아온다', () => {
    fixRandom(0.86) // 걸음을 막 시작한 상태(streak 0)에서 적과 마주치는 구간의 난수
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    click('전진')
    expect(button('도망')).not.toBeNull()
    expect(text('수로에 잠긴 것')).not.toBeNull() // 적 상자 (지하 10층 enemies: dog, scratcher, drowned 중 이 rng는 마지막을 고른다)

    fightToTheEnd()
    click('계속')
    expect(button('전진')).not.toBeNull()
    expect(screen.getByRole('img', { name: /\?\?\?, 1 \/ 26칸/ })).not.toBeNull()
  })

  it('숫자 키로 선택지를 고를 수 있다', () => {
    fixRandom(0)
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    fireEvent.keyDown(window, { key: '1' }) // 1. 전진
    expect(screen.getByRole('img', { name: /\?\?\?, 1 \/ 26칸/ })).not.toBeNull()
  })

  it('방향키로 지도의 방향에 맞게 나아가거나 물러날 수 있다', () => {
    fixRandom(0) // 별일 없이 나아간다
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    // 복도 모양은 판마다 무작위라, 지도에서 @ 바로 옆의 통로 글자를 찾아 그 방향키를 쓴다.
    // cameFrom: 방금 지나온 칸의 방향키. 그 칸도 @ 옆의 통로 글자라서 빼고 찾는다.
    const forwardKey = (cameFrom = null) => {
      const lines = document.querySelector('.map-grid').textContent.split('\n')
      const y = lines.findIndex((row) => row.includes('@'))
      const x = lines[y].indexOf('@')
      const s = floors[0].theme.symbol
      const candidates = [
        { press: 'ArrowRight', back: 'ArrowLeft', cell: lines[y][x + 1] },
        { press: 'ArrowLeft', back: 'ArrowRight', cell: lines[y][x - 1] },
        { press: 'ArrowDown', back: 'ArrowUp', cell: lines[y + 1]?.[x] },
        { press: 'ArrowUp', back: 'ArrowDown', cell: lines[y - 1]?.[x] },
      ]
      return candidates.find((c) => c.cell === s && c.press !== cameFrom)
    }
    const first = forwardKey()
    fireEvent.keyDown(window, { key: first.press })
    expect(screen.getByRole('img', { name: /\?\?\?, 1 \/ 26칸/ })).not.toBeNull()
    const second = forwardKey(first.back) // 2칸째에서 이정표를 찾는다
    fireEvent.keyDown(window, { key: second.press })
    expect(screen.getByRole('img', { name: /지하 10층, 2 \/ 26칸/ })).not.toBeNull()
    // 왔던 방향으로 물러난다
    fireEvent.keyDown(window, { key: second.back })
    expect(screen.getByRole('img', { name: /지하 10층, 1 \/ 26칸/ })).not.toBeNull()
  })

  it('갈림길 문 앞에서는 그 방향의 방향키로 곧장 들어갈 수 있다', () => {
    fixRandom(0) // 별일 없이 나아간다
    // 지하 10층 16칸째: 오른쪽에 보급실(왼쪽 갈림길)이 있다
    continueFromSave({ progress: 16 })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(button('배터리')).not.toBeNull() // 방 화면의 보급실 선택지
    expect(text('왼쪽 갈림길 · 보급실')).not.toBeNull() // 층 이름 옆에 방 표지가 뜬다
  })

  it('쉬면 체력이 오르고 횟수가 줄며, 횟수가 없으면 버튼이 비활성화된다', () => {
    fixRandom(0.5) // 습격 없음
    continueFromSave({ hp: 20 })
    click('쉰다 \\(2\\)')
    expect(text(`${20 + config.restHeal} / ${config.player.maxHp}`)).not.toBeNull()
    click('쉰다 \\(1\\)')
    expect(button('쉰다 \\(0\\)').disabled).toBe(true)
  })

  it('소지품에서 붕대를 쓰려 하면 체력이 가득일 때는 쓰지 않는다', () => {
    render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    click('소지품')
    click('붕대 x2')
    expect(text('체력이 이미 가득하다.')).not.toBeNull()
    expect(button('붕대 x2')).not.toBeNull() // 소모되지 않았다
    click('돌아가기')
    expect(button('전진')).not.toBeNull()
  })

  it('가죽이 모자라면 가방 키우기 선택지가 비활성화된다', () => {
    continueFromSave({ inventory: { leather: config.inventory.upgradeLeatherCost - 1 } })
    click('소지품')
    expect(button('가방을 키운다').disabled).toBe(true)
  })

  it('가죽을 충분히 모으면 가방을 키워 용량이 늘어난다', () => {
    const cost = config.inventory.upgradeLeatherCost
    continueFromSave({ inventory: { leather: cost } })
    click('소지품')
    click('가방을 키운다')
    expect(text(/가방을 키웠다/)).not.toBeNull()
    const capacity = config.inventory.baseCapacity + config.inventory.capacityPerUpgrade
    expect(button(`0 / ${capacity}`)).not.toBeNull() // 다 써서 0개, 용량은 늘었다
  })

  it('탐색 중 자동 저장되고, 다시 열면 이어서 걷기로 복원된다', () => {
    const first = render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    first.unmount()

    render(<App />)
    expect(button('이어서 걷는다 \\(지하 10층\\)')).not.toBeNull() // 저장 슬롯 이름은 이정표와 무관하게 보인다
    click('이어서 걷는다')
    expect(text('???')).not.toBeNull() // 게임 안에서는 아직 이정표를 못 찾았다
  })

  it('저장 데이터가 있을 때 새로 시작하면 덮어쓰기 확인을 거친다', () => {
    const first = render(<App />)
    click('눈을 뜬다')
    click('주변을 둘러본다')
    first.unmount()

    render(<App />)
    click('눈을 뜬다')
    expect(text(/새로 시작하면 사라진다/)).not.toBeNull()
    click('취소')
    expect(button('이어서 걷는다')).not.toBeNull()

    click('눈을 뜬다')
    click('기록을 지우고 시작')
    expect(button('주변을 둘러본다')).not.toBeNull() // 지우고 시작해도 곧장 시작하진 않는다
    click('주변을 둘러본다')
    expect(button('전진')).not.toBeNull()
  })

  it('곁길의 문을 지나야 방이 선택지로 나타나고, 휴게실에 들어가면 체력이 회복되며 한 번뿐이다', () => {
    continueFromSave({ progress: 10, hp: 20 })
    expect(button('관리 초소')).toBeNull() // 아직 문을 발견하지 못했다
    cleanup()

    continueFromSave({ progress: 18, hp: 20, floorKnown: true })
    expect(text(`20 / ${config.player.maxHp}`)).not.toBeNull()
    click('관리 초소에 들어간다') // 방 화면으로 들어간다 (문을 지난 순간 이미 소진된다)
    expect(text('관리 초소 · 휴게실')).not.toBeNull() // 층 이름 옆에 방 표지가 뜬다
    // 방 안에서도 지도는 계속 보이되, @가 통로 대신 방의 글자 자리로 옮겨 겹쳐 보인다
    // 관리 초소는 dir 'R'(오른쪽)에 있으므로, 원래 서 있던 통로 칸은 반대 방향(왼쪽)에 남는다
    const insideLines = document.querySelector('.map-grid').textContent.split('\n')
    const iy = insideLines.findIndex((row) => row.includes('@'))
    const ix = insideLines[iy].indexOf('@')
    expect(insideLines[iy][ix - 1]).toBe(floors[0].theme.symbol) // 원래 서 있던 통로 칸은 평범한 길로 남는다
    click('쉰다')
    expect(text('체력이 모두 회복되었다.')).not.toBeNull()
    expect(text(`${config.player.maxHp} / ${config.player.maxHp}`)).not.toBeNull()
    expect(button('관리 초소')).toBeNull() // 다녀온 방은 다시 나오지 않는다
    expect(text('관리 초소 · 휴게실')).toBeNull() // 방에서 나오면 방 표지도 사라진다
    // 다녀온 방(휴게실)은 현재 위치 오른쪽(dir 'R')에 소문자로 보인다
    const lines = document.querySelector('.map-grid').textContent.split('\n')
    const y = lines.findIndex((row) => row.includes('@'))
    const x = lines[y].indexOf('@')
    expect(lines[y][x + 1]).toBe('r')
  })

  it('방 안의 조사 지점: 정해진 행동과 별개로 하나씩 더 골라 볼 수 있고, 위험한 조사는 전투로 이어진다', () => {
    fixRandom(0)
    continueFromSave({ progress: 18, hp: 20, floorKnown: true })
    click('관리 초소에 들어간다')
    click('선반을 살펴본다') // 조사 지점: 통조림을 챙긴다
    expect(text(/통조림.*챙겼다/)).not.toBeNull()
    expect(button('선반을 살펴본다')).toBeNull() // 한 번 조사한 지점은 다시 안 보인다
    click('담요를 들춰본다') // 조사 지점: 보상 없이 문장만 나온다
    expect(text('담요 밑에 눅눅한 종이 몇 장이 깔려 있다. 읽을 수 없다.')).not.toBeNull()
    expect(button('담요를 들춰본다')).toBeNull()
    click('쉰다') // 정해진 행동은 조사와 별개로 여전히 할 수 있다
    cleanup()

    // 위험한 조사(enemy)는 전투로 이어지고, 이기면 탐색이 아니라 그 방 안으로 돌아온다
    continueFromSave({ floor: 6, progress: 14, floorKnown: true })
    click('연구원 휴게실에 들어간다')
    click('환풍구 안을 들여다본다')
    expect(text('벽을 긁는 것')).not.toBeNull() // 전투 시작
    fightToTheEnd()
    click('계속')
    expect(text('연구원 휴게실 · 휴게실')).not.toBeNull() // 방 밖(탐색)이 아니라 방 안으로 돌아왔다
    expect(button('환풍구 안을 들여다본다')).toBeNull() // 조사 지점도 다시 안 보인다
  })

  it('조사 지점을 사슬로 이으면("더 들어가본다") 먼저 조사해야 다음 지점이 나타난다', () => {
    fixRandom(0)
    continueFromSave({ progress: 18, hp: 20, floorKnown: true })
    click('관리 초소에 들어간다')
    expect(button('선반 뒤쪽까지 마저 뒤져본다')).toBeNull() // 아직 선반을 안 살펴봐서 안 보인다
    click('선반을 살펴본다')
    expect(button('선반 뒤쪽까지 마저 뒤져본다')).not.toBeNull() // 이제 사슬로 이어진 다음 지점이 보인다
    click('선반 뒤쪽까지 마저 뒤져본다')
    expect(text(/배터리 하나가 끼어 있다/)).not.toBeNull()
    expect(button('선반 뒤쪽까지 마저 뒤져본다')).toBeNull() // 조사한 지점은 다시 안 보인다
  })

  it('자료실에 들어가면 쪽지 문구가 나타난다', () => {
    continueFromSave({ floor: 2, progress: 13 })
    click('기록 보관함에 들어간다')
    click('쪽지를 읽는다')
    expect(notes()).toHaveLength(5)
    expect(text(/문 앞을 막는 것은 없다고 한다/)).not.toBeNull()
    expect(text(/출구의 실체는 피험자에게 공개하지 않는다/)).not.toBeNull() // 탈출을 가장한 실험이라는 단서
    expect(text(/INFINITE DUNGEON TRAIN/)).not.toBeNull() // 열차에 대한 정보
  })

  it('쪽지를 읽으면 수첩이 생기고, 수첩에서 읽은 쪽지를 다시 볼 수 있다', () => {
    continueFromSave({ floor: 2, progress: 13 })
    expect(button('수첩')).toBeNull() // 아직 읽은 쪽지가 없다
    click('기록 보관함에 들어간다')
    click('쪽지를 읽는다')
    expect(button('수첩')).not.toBeNull()

    click('수첩')
    expect(text('— 수첩 —')).not.toBeNull()
    expect(text('지하 8층 · 기록 보관함')).not.toBeNull()
    expect(document.querySelector('.log').classList.contains('scrollable')).toBe(true) // 길어도 끝까지 읽을 수 있다
    expect(button('돌아가기')).not.toBeNull()
    click('돌아가기')
    expect(button('전진')).not.toBeNull()
    expect(document.querySelector('.log').classList.contains('scrollable')).toBe(false)
  })

  it('단말실에서는 계정과 비밀번호를 맞게 입력해야 접속되고, 틀려도 다시 시도할 수 있다', () => {
    const player = continueFromSave({ floor: 9, progress: 45 })
    const room = floors[9].rooms.find((r) => r.kind === 'terminal')
    const password = room.login.passwordPrefix + player.passwords[room.login.passwordIndex]
    click('관리 단말실에 들어간다')
    const fill = (id, pw) => {
      fireEvent.change(screen.getByLabelText('계정'), { target: { value: id } })
      fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: pw } })
      click('접속')
    }

    fill('아무거나', 'x')
    expect(text('존재하지 않는 계정입니다.')).not.toBeNull()
    fill('SUBJ-0417', 'x' + password)
    expect(text(/계정은 확인되었다/)).not.toBeNull()
    expect(screen.getByLabelText('계정')).toBeTruthy() // 아직 접속 화면이다

    fill('subj 0417', password.toLowerCase())
    expect(text(/멈추지 않는 열차/)).not.toBeNull()
    expect(button('전진')).not.toBeNull() // 탐색 화면으로 돌아왔다
    expect(screen.queryByLabelText('계정')).toBeNull() // 접속 화면은 닫혔다
    expect(button('관리 단말실')).toBeNull() // 다시 들어갈 수 없다
  })

  it('쓰러져서 피험자 번호가 늘어나면 계정도 바뀐다 (예전 번호로는 접속되지 않는다)', () => {
    const player = continueFromSave({ floor: 9, progress: 45, deaths: 1 }) // 번호 0418
    const room = floors[9].rooms.find((r) => r.kind === 'terminal')
    const password = room.login.passwordPrefix + player.passwords[room.login.passwordIndex]
    click('관리 단말실에 들어간다')
    const fill = (id, pw) => {
      fireEvent.change(screen.getByLabelText('계정'), { target: { value: id } })
      fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: pw } })
      click('접속')
    }

    fill('SUBJ-0417', password)
    expect(text('존재하지 않는 계정입니다.')).not.toBeNull()
    fill('SUBJ-0418', password)
    expect(text(/투입 횟수 6/)).not.toBeNull() // 처음엔 5, 한 번 쓰러져서 6
  })

  it('수첩 속 피험자 번호는 쓰러진 횟수에 따라 달라진다', () => {
    continueFromSave({ floor: 2, progress: 3, deaths: 2, notebook: ['5:1:2'] })
    click('수첩')
    expect(text(/번호 04■■/)).not.toBeNull()
    cleanup()

    continueFromSave({ floor: 2, progress: 3, deaths: 83, notebook: ['5:1:2'] })
    click('수첩')
    expect(text(/번호 05■■/)).not.toBeNull() // 0417 + 83 = 0500
  })

  it('단말에서 물러나도 방은 남아 있고, 접속 화면에서 수첩을 열었다가 돌아올 수 있다', () => {
    continueFromSave({ floor: 9, progress: 45, notebook: ['2:0:0'] })
    click('관리 단말실에 들어간다')

    click('수첩')
    expect(text('— 수첩 —')).not.toBeNull()
    click('돌아가기')
    expect(screen.getByLabelText('계정')).toBeTruthy() // 접속 화면으로 돌아온다

    click('물러난다')
    expect(button('관리 단말실에 들어간다')).not.toBeNull()
  })

  it('잠긴 문은 비밀번호를 맞혀야 열리고, 틀리면 체력이 깎이지만 다시 시도할 수 있다', () => {
    fixRandom(0.5) // 틀린 시도의 피해량 -3, 문을 연 뒤 한 걸음은 '별일 없음' 대신 소모품 하나
    const gateFloor = floors.findIndex((f) => f.gate)
    const gate = floors[gateFloor].gate
    const player = continueFromSave({
      floor: gateFloor,
      progress: gate.at - 1,
      hp: config.player.maxHp - 5,
      notebook: ['7:2:0'],
    })
    const password = player.passwords[gate.passwordIndex]
    const wrong = password === '0000' ? '1111' : '0000' // 실제 비밀번호와 겹치지 않는 오답

    expect(button('전진')).toBeNull() // 문이 가로막고 있다
    click('잠긴 문을 살펴본다')
    expect(screen.getByLabelText('비밀번호')).toBeTruthy()

    // 접속 화면에서처럼 수첩을 열었다가 돌아올 수 있다
    click('수첩')
    expect(text('— 수첩 —')).not.toBeNull()
    click('돌아가기')
    expect(screen.getByLabelText('비밀번호')).toBeTruthy()

    const fill = (value) => {
      fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value } })
      click('연다')
    }

    fill(wrong)
    expect(text(/전류가 흐른다/)).not.toBeNull()
    expect(text(`${config.player.maxHp - 5 - 3} / ${config.player.maxHp}`)).not.toBeNull() // 체력 -3
    expect(screen.getByLabelText('비밀번호')).toBeTruthy() // 여전히 문 앞이다

    fill(` ${password.slice(0, 2)}-${password.slice(2)} `) // 대소문자, 하이픈, 공백은 무시한다
    expect(text(/무거운 문이/)).not.toBeNull()
    expect(button('전진')).not.toBeNull() // 탐색 화면으로 돌아왔다
    expect(screen.queryByLabelText('비밀번호')).toBeNull()

    click('전진') // 이제 문 너머로 나아갈 수 있다. 문 너머에서 이정표도 마저 찾는다
    expect(screen.getByRole('img', { name: new RegExp(`${gate.at} / ${floors[gateFloor].length}칸`) })).not.toBeNull()
  })

  it('별관 통로는 비밀번호를 맞혀야 열리고, 열리면 별관으로 넘어갔다가 끝에서 돌아온 뒤에도 다시 드나들 수 있다', () => {
    fixRandom(0) // 별일 없이 나아간다
    const wingFloor = floors.findIndex((f) => f.rooms.some((r) => r.kind === 'wing'))
    const room = floors[wingFloor].rooms.find((r) => r.kind === 'wing')
    const wingFloorData = floors[room.enterFloor]
    const player = continueFromSave({ floor: wingFloor, progress: room.at, hp: config.player.maxHp - 5 })
    const password = player.passwords[room.passwordIndex]
    const wrong = password === '0000' ? '1111' : '0000' // 실제 비밀번호와 겹치지 않는 오답

    click(`${room.name}에 들어간다`)
    expect(screen.getByLabelText('비밀번호')).toBeTruthy()

    const fill = (value) => {
      fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value } })
      click('연다')
    }

    fixRandom(0.5) // 틀린 시도의 피해량 -3
    fill(wrong)
    expect(text(/전류가 흐른다/)).not.toBeNull()
    expect(text(`${config.player.maxHp - 5 - 3} / ${config.player.maxHp}`)).not.toBeNull() // 체력 -3
    expect(screen.getByLabelText('비밀번호')).toBeTruthy() // 여전히 문 앞이다

    fixRandom(0) // 다시 별일 없이 나아간다
    fill(password)
    expect(text(/문 너머로 낯선 통로가 이어진다/)).not.toBeNull()
    expect(text(wingFloorData.intro)).not.toBeNull() // 별관에 도착했다
    expect(button('전진')).not.toBeNull()

    for (let i = 0; i < wingFloorData.length; i += 1) click('전진')
    expect(text(`「${wingFloorData.name} · ${wingFloorData.place}」`)).not.toBeNull() // 이정표를 찾아 이름을 안다
    expect(button('온 길을 되짚어 돌아간다')).not.toBeNull()

    click('온 길을 되짚어 돌아간다')
    expect(text(/온 길로 돌아나왔다/)).not.toBeNull()
    expect(screen.getByRole('img', { name: new RegExp(`${room.at} / ${floors[wingFloor].length}칸`) })).not.toBeNull()

    // 연 문은 계속 열려 있다: 비밀번호 없이 곧장 다시 들어가고, 별관 입구에서 철문으로 돌아나올 수도 있다.
    click(`${room.name}에 들어간다`)
    expect(screen.queryByLabelText('비밀번호')).toBeNull()
    expect(text(/열어 둔 .* 지나간다/)).not.toBeNull()
    expect(text(`${wingFloorData.name} · ${wingFloorData.place}`)).not.toBeNull() // 이미 이정표를 본 별관이다
    click('철문으로 돌아나간다')
    expect(screen.getByRole('img', { name: new RegExp(`${room.at} / ${floors[wingFloor].length}칸`) })).not.toBeNull()
  })

  it('입구에서 계단을 내려가 지나온 층으로 되돌아가고, 지나온 길은 한 번에 오갈 수 있다', () => {
    fixRandom(0)
    const reached = { 0: floors[0].length, 1: floors[1].length, 2: 0 }
    continueFromSave({ floor: 2, progress: 0, reached })
    expect(button('입구까지 되짚어 간다')).toBeNull() // 이미 입구다

    click('계단을 내려간다')
    expect(text(`${floors[1].name} · ${floors[1].place}`)).not.toBeNull()
    expect(screen.getByRole('img', { name: new RegExp(`${floors[1].length} / ${floors[1].length}칸`) })).not.toBeNull()
    expect(button('계단을 오른다')).not.toBeNull()

    click('입구까지 되짚어 간다')
    expect(screen.getByRole('img', { name: new RegExp(`0 / ${floors[1].length}칸`) })).not.toBeNull()
    click(`지나왔던 곳까지 나아간다 \\(${floors[1].length} / ${floors[1].length}칸\\)`)
    click('계단을 오른다')
    expect(text(`${floors[2].name} · ${floors[2].place}`)).toBeNull() // 지하 8층은 아직 이정표를 못 봤다
  })

  it('열쇠로 여는 문은 열쇠가 없으면 무엇이 필요한지만 알리고, 열쇠가 있으면 살펴보는 순간 열린다', () => {
    const floor = floors.findIndex((f) => f.gate?.key === 'cutter')
    const gate = floors[floor].gate
    continueFromSave({ floor, progress: gate.at - 1, hp: 30 })
    click('잠긴 문을 살펴본다')
    expect(text(/다른 곳에서 방법을 찾아야 한다/)).not.toBeNull()
    expect(screen.queryByLabelText('비밀번호')).toBeNull()
    expect(button('잠긴 문을 살펴본다')).not.toBeNull() // 여전히 막혀 있다
    cleanup()
    localStorage.clear()

    continueFromSave({ floor, progress: gate.at - 1, inventory: { cutter: 1 } })
    click('잠긴 문을 살펴본다')
    expect(text(gate.openText[0])).not.toBeNull()
    expect(button('전진')).not.toBeNull()
  })

  it('실험실에 들어가면 장비를 얻고, 장착 여부를 물은 뒤 guards 중 하나와 싸운다', () => {
    fixRandom(0.5) // guards: ['subject', 'machine'] 중 뒤의 machine이 나온다
    continueFromSave({ floor: 5, progress: 20 })
    click('소규모 실험실에 들어간다')
    expect(text(/소방 도끼를 손에 넣었다/)).not.toBeNull()
    expect(button('장착한다')).not.toBeNull() // 장착할지부터 물어본다 (아직 전투 화면이 아니다)
    expect(text('고장 난 경비 장치')).toBeNull()

    click('장착한다')
    expect(text(/장착했다/)).not.toBeNull()
    expect(text('고장 난 경비 장치')).not.toBeNull() // 적 상자 (이제 전투로 넘어갔다)
    expect(text('공격 +6')).not.toBeNull() // 소지품 상자
    expect(text('소방 도끼 (장착)')).not.toBeNull() // 이름 옆에 장착 표시가 붙는다
    expect(button('공격')).not.toBeNull()

    fightToTheEnd()
    click('계속')
    expect(button('전진')).not.toBeNull()
    expect(button('소규모 실험실')).toBeNull()
  })

  it('개조실에 들어가면 이식(aug)을 얻고, 장착 여부를 "이식한다"로 물은 뒤 guards 중 하나와 싸운다', () => {
    fixRandom(0) // guards: ['worker', 'hallWatcher'] 중 앞의 worker가 나온다
    const eastWing = floors.findIndex((f) => f.name === '동쪽 별관')
    continueFromSave({ floor: eastWing, progress: 3 })
    click('이식 수술실에 들어간다')
    expect(text(/이식된 신경 가속기를 손에 넣었다/)).not.toBeNull()
    expect(button('이식한다')).not.toBeNull() // 무기·방어구는 '장착한다'지만 이식은 '이식한다'로 물어본다
    expect(text('창백한 작업자')).toBeNull()

    click('이식한다')
    expect(text(/이식했다/)).not.toBeNull()
    expect(text(/목덜미에 차가운 기구를 대자/)).not.toBeNull() // 이식 전용 설치 문구
    expect(text('창백한 작업자')).not.toBeNull() // 적 상자 (이제 전투로 넘어갔다)
    expect(text('이식된 신경 가속기 (이식)')).not.toBeNull() // 무기·방어구와 달리 (이식)으로 표시된다

    fightToTheEnd()
    click('계속')
    expect(button('전진')).not.toBeNull()
  })

  it('이식은 소지품 화면에서 여러 개를 동시에 장착할 수 있고, 다시 뗄 수도 있다', () => {
    continueFromSave({ inventory: { neuralBooster: 1, steelFrame: 1 } })
    click('소지품')
    click('이식된 신경 가속기 이식한다')
    expect(text('이식된 신경 가속기 (이식)')).not.toBeNull()
    expect(button('이식된 신경 가속기 이식을 제거한다')).not.toBeNull()

    click('강철 골격 이식 이식한다')
    expect(text(/몸 안에서 무언가 어긋나는 소리가 났다/)).not.toBeNull() // 두 개째부터 변질도가 문턱을 넘는다(직접 말하지 않는다)
    expect(text('강철 골격 이식 (이식)')).not.toBeNull()

    click('강철 골격 이식 이식을 제거한다')
    expect(text('강철 골격 이식 (이식)')).toBeNull() // 뗀 뒤에는 표시가 사라진다
    expect(button('강철 골격 이식 이식한다')).not.toBeNull() // 소지품에는 남아 있어 다시 장착할 수 있다
  })

  it('무기를 주워도 장착하지 않으면 소지품에는 있지만 공격력에는 반영되지 않는다', () => {
    continueFromSave({ progress: 13 }) // 지하 10층 14칸째에서 쇠 파이프를 반드시 줍는다
    click('전진')
    expect(text(/쇠 파이프가 끼어 있다/)).not.toBeNull()
    click('장착하지 않는다')
    expect(button('전진')).not.toBeNull() // 탐색으로 돌아왔다

    click('소지품')
    expect(text('쇠 파이프')).not.toBeNull() // 가지고는 있다
    expect(text('쇠 파이프 (장착)')).toBeNull() // 장착하지는 않았다
  })

  it('쓰러지면 이 층의 입구에서 절반의 체력으로 깨어난다', () => {
    fixRandom(0.86) // 걸음을 막 시작한 상태(streak 0)에서 적과 마주치는 구간의 난수
    continueFromSave({ hp: 1 })
    click('전진')
    fightToTheEnd()
    click('계속')
    expect(text(/이 층의 입구/)).not.toBeNull()
    expect(text(/피험자 번호를 갱신합니다/)).toBeNull() // 번호가 바뀐다는 사실도 말해 주지 않는다
    expect(text(`${Math.ceil(config.player.maxHp / 2)} / ${config.player.maxHp}`)).not.toBeNull()
  })

  it('지하 1층 출구에서 COMPUTER와의 대화가 탈출로 끝나면 결말이 뜨고, 이어하기 기록은 지워진다', () => {
    const last = floors.findIndex((f) => f.final)
    continueFromSave({ floor: last, progress: floors[last].length })
    click('문으로 다가간다') // 더 이상 보스 전투가 아니라, 곧장 COMPUTER 장면으로 들어간다
    expect(button('다가가본다')).not.toBeNull()

    vi.useFakeTimers()
    driveComputerToEscape()
    expect(text('— 탈출 —')).not.toBeNull()
    expect([...notes()].some((n) => n.textContent.includes('밖으로 나가는 느낌이 들지 않는다'))).toBe(true)
    expect(text(/기록: 피험자 SUBJ-0417/)).not.toBeNull() // 결말에서 피험자 번호가 기록된다
    expect(localStorage.getItem(config.saveKey)).toBeNull()

    click('다시 눈을 뜬다')
    expect(button('눈을 뜬다')).not.toBeNull()
  })

  it('이식을 너무 많이 장착해 변질도가 문턱을 넘으면, COMPUTER와의 대화가 탈출로 끝나도 다른 결말이 나온다', () => {
    const last = floors.findIndex((f) => f.final)
    continueFromSave({
      floor: last,
      progress: floors[last].length,
      inventory: { extraArm: 1, secondHeart: 1 },
      equippedAugs: ['extraArm', 'secondHeart'], // 변질도 25 + 30 = 55 (문턱 40 이상)
    })
    click('문으로 다가간다')

    vi.useFakeTimers()
    driveComputerToEscape()
    expect(text('— 판정 보류 —')).not.toBeNull()
    expect(text('— 탈출 —')).toBeNull() // 같은 선택을 해도 결말은 다르다
    expect([...notes()].some((n) => n.textContent.includes('피험자로 확인되지 않음'))).toBe(true)
    expect(localStorage.getItem(config.saveKey)).toBeNull()
  })
})
