// 브라우저 localStorage 저장/불러오기. 저장소를 못 쓰는 환경에서도 게임이 죽지 않도록 try/catch 처리.
import { restorePlayer } from './character.js'
import { config } from './config.js'

export function hasSave() {
  try {
    return localStorage.getItem(config.saveKey) !== null
  } catch {
    return false
  }
}

export function saveGame(player) {
  try {
    localStorage.setItem(config.saveKey, JSON.stringify({ version: config.version, savedAt: Date.now(), player }))
    return true
  } catch {
    return false
  }
}

// 저장된 플레이어를 돌려준다. 없거나 손상됐으면 null.
export function loadGame() {
  try {
    const raw = localStorage.getItem(config.saveKey)
    return raw ? restorePlayer(JSON.parse(raw).player) : null
  } catch {
    return null
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(config.saveKey)
  } catch {
    // 저장소를 못 쓰면 지울 것도 없다.
  }
}
