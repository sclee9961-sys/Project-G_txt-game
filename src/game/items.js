// 아이템 조회 / 사용 로직. 사용은 { ok, message, player }를 반환하고 실패 시 player는 그대로다.
import { capacityOf, carriedCount, heal, itemCount, maxLightOf, removeItem } from './character.js'
import { config } from './config.js'
import { items as itemData } from './data.js'

export const getItem = (id) => itemData[id]

// 지금 쓸 수 있는 소모품 id 목록. 전투 중에는 types를 ['heal']로 좁힌다.
export function usableItems(player, types = ['heal', 'light', 'vitality']) {
  return Object.keys(player.inventory).filter((id) => types.includes(itemData[id]?.type) && itemCount(player, id) > 0)
}

// 소지품 목록. 장비(무기·방어구)는 장착 중인지(equipped)를 함께 담아, 가진 걸 숨기지 않고 다 보여준다.
export function visibleInventory(player) {
  return Object.keys(player.inventory).map((id) => ({
    id,
    ...itemData[id],
    count: player.inventory[id],
    equipped: player.equipped.weapon === id || player.equipped.armor === id || player.equippedAugs.includes(id),
  }))
}

export function useItem(player, id) {
  const def = itemData[id]
  if (!def || itemCount(player, id) < 1) return { ok: false, message: '사용할 수 없다.', player }

  if (def.type === 'heal') {
    if (player.hp >= player.maxHp) return { ok: false, message: '체력이 이미 가득하다.', player }
    const { character, healed } = heal(removeItem(player, id), def.value)
    return { ok: true, message: `${def.useText} 체력 +${healed}`, player: character }
  }
  if (def.type === 'light') {
    const cap = maxLightOf(player)
    if (player.light >= cap) return { ok: false, message: '손전등은 이미 환하다.', player }
    const light = Math.min(cap, player.light + def.value)
    return { ok: true, message: `${def.useText} 빛 +${light - player.light}`, player: { ...removeItem(player, id), light } }
  }
  if (def.type === 'vitality') {
    const maxHp = player.maxHp + def.value
    return { ok: true, message: `${def.useText} 최대 체력 +${def.value}`, player: { ...removeItem(player, id), maxHp, hp: maxHp } }
  }
  return { ok: false, message: '사용할 수 없다.', player }
}

// 가죽을 조합해 가방을 키운다. 용량이 늘어나 소지품을 더 담을 수 있다.
export function upgradeBag(player) {
  const cost = config.inventory.upgradeLeatherCost
  if (itemCount(player, 'leather') < cost) return { ok: false, message: `가죽이 모자라다. (가죽 ${cost}개 필요)`, player }
  const upgraded = { ...removeItem(player, 'leather', cost), bagLevel: player.bagLevel + 1 }
  return { ok: true, message: `가죽을 이어 붙여 가방을 키웠다. 이제 ${carriedCount(upgraded)} / ${capacityOf(upgraded)}개까지 담을 수 있다.`, player: upgraded }
}

// 기계부품을 조합해 손전등을 개조한다. 최대 빛이 늘어난다.
export function upgradeLight(player) {
  const cost = config.flashlight.upgradePartCost
  if (itemCount(player, 'part') < cost) return { ok: false, message: `기계부품이 모자라다. (기계부품 ${cost}개 필요)`, player }
  const upgraded = { ...removeItem(player, 'part', cost), lightLevel: player.lightLevel + 1 }
  return { ok: true, message: `기계부품으로 손전등을 개조했다. 이제 최대 ${maxLightOf(upgraded)}까지 밝힐 수 있다.`, player: upgraded }
}
