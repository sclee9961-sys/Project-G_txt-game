// rng 인자를 받아 테스트에서 난수를 고정할 수 있게 한다. (rng: 0 이상 1 미만을 돌려주는 함수)
export const randInt = (min, max, rng = Math.random) => Math.floor(rng() * (max - min + 1)) + min

export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)]

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

// 방을 구분하는 키. floors[층].rooms[번호]를 "층:번호"로 쓴다. (다녀온 방을 저장할 때 쓴다)
export const roomKey = (floorIndex, roomIndex) => `${floorIndex}:${roomIndex}`

// 잠긴 문을 구분하는 키. 층마다 문이 하나뿐이라 층 번호만 쓴다. (연 문을 저장할 때 쓴다)
export const gateKey = (floorIndex) => `${floorIndex}`

// 계정/비밀번호/코드 비교용: 대소문자, 하이픈, 공백을 무시한다. ("subj 0417" == "SUBJ-0417")
export const normalizeCode = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// 서로 겹치지 않는 4자리 숫자 코드 count개를 뽑는다 (앞자리 0도 허용, 예: '0417').
// 판마다 잠긴 곳(gate/wing/단말)의 비밀번호로 이 중 일부를 쓴다. character.js의 createPlayer 참고.
// Fisher-Yates로 뽑아서, rng가 테스트처럼 고정값만 돌려줘도(무한히 같은 값만 나와도) 정확히 count번 만에 끝난다.
export function randomCodes(count, rng = Math.random) {
  const pool = Array.from({ length: 10000 }, (_, i) => i)
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).map((n) => String(n).padStart(4, '0'))
}

// 방에서 읽는 쪽지를 구분하는 키. floors[층].rooms[번호].notes[순서]를 "층:번호:순서"로 쓴다. (수첩에 적어 둘 때 쓴다)
export const noteKey = (floorIndex, roomIndex, noteIndex) => `${floorIndex}:${roomIndex}:${noteIndex}`

// { 키: 가중치 } 표에서 가중치에 비례해 키 하나를 뽑는다.
export function weightedPick(weights, rng = Math.random) {
  const entries = Object.entries(weights)
  let r = rng() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    r -= w
    if (r < 0) return key
  }
  return entries[entries.length - 1][0]
}

// 받침 유무에 맞는 조사를 붙인다. josa('들개', '이/가') → '들개가', josa('문지기', '을/를') → '문지기를'
export function josa(word, pair) {
  const [withFinal, withoutFinal] = pair.split('/')
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0
  return word + (hasFinal ? withFinal : withoutFinal)
}
