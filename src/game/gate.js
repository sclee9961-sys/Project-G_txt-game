// 통로 자체를 막는 잠긴 문. 곁길의 방(rooms)과 달리 열지 않으면 그 너머로 나아갈 수 없다.
// data.js의 floors[].gate 주석 참고.
import { config } from './config.js'
import { floors } from './data.js'
import { gateKey, normalizeCode, randInt } from './util.js'

const log = (text, type = 'normal') => ({ text, type })

export const floorGate = (player) => floors[player.floor].gate ?? null
export const isGateOpen = (player) => {
  const gate = floorGate(player)
  return !gate || player.gatesOpen.includes(gateKey(player.floor))
}

// 지금 문 앞에 서 있는지: 문이 있고, 아직 안 열렸고, 문 바로 앞(at - 1)까지 나아왔다.
export function atGate(player) {
  const gate = floorGate(player)
  return !!gate && !isGateOpen(player) && player.progress === gate.at - 1
}

// 문 앞에 처음 다다랐을 때 sightLogs에 덧붙는 짧은 안내. (문을 살펴보기 전까지 매번 나온다)
export function gateAnnounce(player) {
  return atGate(player) ? [log('굳게 잠긴 문이 길을 가로막고 있다.', 'event')] : []
}

// 비밀번호를 넣어 본다. 틀리면 체력이 깎이고 다시 시도할 수 있다.
export function tryGate(player, password, rng = Math.random) {
  const gate = floorGate(player)
  if (!atGate(player)) return { player, logs: [log('그럴 수 없다.', 'muted')], ok: false }

  if (normalizeCode(password) !== normalizeCode(player.passwords[gate.passwordIndex])) {
    const [min, max] = config.gateWrongDamage
    const dmg = Math.min(player.hp - 1, randInt(min, max, rng))
    const hurt = { ...player, hp: player.hp - dmg }
    return {
      player: hurt,
      logs: [log(`붉은 경고등이 켜지며 손끝에 따끔한 전류가 흐른다. 체력 -${dmg}`, 'bad')],
      ok: false,
    }
  }

  const opened = { ...player, gatesOpen: [...player.gatesOpen, gateKey(player.floor)] }
  return { player: opened, logs: gate.openText.map((t) => log(t, 'good')), ok: true }
}
