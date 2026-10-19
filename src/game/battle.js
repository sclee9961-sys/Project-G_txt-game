// 턴제 전투 로직. 플레이어가 행동하면 적이 반격하는 한 턴을 처리해 결과를 반환한다.
// 반환값: { player, enemy, logs: [{ text, type }], result: null | 'win' | 'lose' | 'fled', turnUsed }
import { attackOf, calcDamage, defenseOf, gain, isAlive, takeDamage } from './character.js'
import { config } from './config.js'
import { items as itemData } from './data.js'
import { rollLoot } from './explore.js'
import { useItem } from './items.js'
import { josa } from './util.js'

const log = (text, type = 'normal') => ({ text, type })

function enemyTurn(player, enemy, rng, logs) {
  const dmg = calcDamage(enemy.attack, defenseOf(player), rng)
  logs.push(log(`${josa(enemy.name, '이/가')} ${enemy.verb} 체력 -${dmg}`, 'bad'))
  return takeDamage(player, dmg)
}

function victory(player, enemy, rng, logs) {
  logs.push(log(`${josa(enemy.name, '을/를')} 쓰러뜨렸다.`, 'good'))
  let p = player
  if (!enemy.boss && rng() < config.corpseLootChance) {
    const id = rollLoot(player.floor, rng)
    const { player: withLoot, gained } = gain(p, id)
    p = withLoot
    logs.push(
      gained
        ? log(`쓰러진 것의 곁에서 ${josa(itemData[id].name, '을/를')} 발견했다.`, 'good')
        : log(`쓰러진 것의 곁에 ${josa(itemData[id].name, '이/가')} 있었지만, 소지품이 가득 차 챙기지 못했다.`, 'muted'),
    )
  }
  // 가죽은 위 소모품과 별개로 굴린다 — 장비를 못 찾아도 가죽은 얻을 수 있다.
  if (!enemy.boss && rng() < config.leatherDropChance) {
    const { player: withLeather, gained } = gain(p, 'leather')
    p = withLeather
    logs.push(
      gained
        ? log('쓰러진 것에서 가죽을 벗겨 냈다.', 'good')
        : log('가죽을 벗겨 낼 수 있었지만, 소지품이 가득 차 챙기지 못했다.', 'muted'),
    )
  }
  // 기계부품은 '기계' 계열 적에게서만 나온다. 역시 위 둘과 별개로 굴린다.
  if (!enemy.boss && enemy.id === 'machine' && rng() < config.partDropChance) {
    const { player: withPart, gained } = gain(p, 'part')
    p = withPart
    logs.push(
      gained
        ? log('고장 난 몸체에서 쓸 만한 기계부품을 뜯어냈다.', 'good')
        : log('기계부품을 뜯어낼 수 있었지만, 소지품이 가득 차 챙기지 못했다.', 'muted'),
    )
  }
  return { player: p, enemy, logs, result: 'win', turnUsed: true }
}

// 플레이어 행동 이후: 적이 죽었으면 승리, 아니면 적이 반격한다.
function resolveTurn(player, enemy, rng, logs) {
  if (!isAlive(enemy)) return victory(player, enemy, rng, logs)
  const hit = enemyTurn(player, enemy, rng, logs)
  return { player: hit, enemy, logs, result: isAlive(hit) ? null : 'lose', turnUsed: true }
}

export function attack(player, enemy, rng = Math.random) {
  const dmg = calcDamage(attackOf(player), enemy.defense, rng)
  const logs = [log(`힘껏 내리쳤다. ${enemy.name}에게 ${dmg}의 피해를 입혔다.`)]
  return resolveTurn(player, takeDamage(enemy, dmg), rng, logs)
}

// 사용에 실패하면 턴을 소모하지 않는다(turnUsed: false).
export function useItemInBattle(player, enemy, itemId, rng = Math.random) {
  const used = useItem(player, itemId)
  if (!used.ok) return { player, enemy, logs: [log(used.message, 'muted')], result: null, turnUsed: false }
  return resolveTurn(used.player, enemy, rng, [log(used.message, 'good')])
}

export function flee(player, enemy, rng = Math.random) {
  if (enemy.boss) {
    return { player, enemy, logs: [log('등 뒤에는 어둠뿐이다. 도망칠 곳이 없다.', 'muted')], result: null, turnUsed: false }
  }
  if (rng() < config.fleeChance) {
    return { player, enemy, logs: [log('숨을 죽이고 어둠 속으로 빠져나왔다.', 'muted')], result: 'fled', turnUsed: true }
  }
  return resolveTurn(player, enemy, rng, [log('도망치려 했지만 놓아주지 않는다.', 'muted')])
}

// 패배 페널티: 이 층의 입구에서 절반의 체력으로 깨어나고, 이 층에서 나아간 것과 빛의 절반을 잃는다.
export function applyDefeat(player) {
  const lostLight = Math.floor(player.light / 2)
  return {
    player: {
      ...player,
      hp: Math.ceil(player.maxHp / 2),
      light: player.light - lostLight,
      progress: 0,
      rests: config.restsPerFloor,
      dangerStreak: 0,
      deaths: player.deaths + 1,
    },
    lostLight,
  }
}
