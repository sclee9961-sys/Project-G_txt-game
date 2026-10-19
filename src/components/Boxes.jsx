import { attackOf, capacityOf, carriedCount, defenseOf, maxLightOf } from '../game/character.js'
import { floors } from '../game/data.js'
import { visibleInventory } from '../game/items.js'
import { mapLegend, mapView } from '../game/map.js'

// 테두리 위에 이름표가 걸린 상자. 안에는 "이름 ... 값" 줄들을 넣는다.
function Box({ legend, className = '', children }) {
  return (
    <section className={`box ${className}`.trim()} data-legend={legend} aria-label={legend}>
      {children}
    </section>
  )
}

function Row({ label, value, warn }) {
  return (
    <div className={warn ? 'row warn' : 'row'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function StatusBox({ player }) {
  const { light } = player
  return (
    <Box legend="상태">
      <Row label="체력" value={`${player.hp} / ${player.maxHp}`} warn={player.hp <= player.maxHp * 0.3} />
      <Row label="빛" value={light > 0 ? `${light} / ${maxLightOf(player)}` : '꺼짐'} warn={light <= 0} />
      <Row label="공격" value={attackOf(player)} />
      <Row label="방어" value={defenseOf(player)} />
    </Box>
  )
}

// 지도: 캔버스 전체가 아니라, 플레이어를 따라다니는 고정 크기 창만 보인다. 지나온 길은 그 창 안에서는
// 계속 그려지지만, 창을 벗어나면(멀리 이동하면) 화면에서는 다시 안 보인다. 테두리는 상태·소지품 상자와 같다.
// roomIndex: 지금 방(휴게실 등) 화면 안에 있으면 그 방 번호. 있으면 @가 그 방의 글자 자리로 옮겨 겹쳐 보인다.
export function MapBox({ player, roomIndex = null }) {
  const floor = floors[player.floor]
  const lines = mapView(player, roomIndex)
  const room = roomIndex != null ? floor.rooms[roomIndex] : null
  return (
    <Box legend="지도" className="map-box">
      <pre
        className="map-grid"
        role="img"
        aria-label={`지도. ${player.floorKnown ? floor.name : '???'}, ${
          room ? `${room.name} 안` : `${player.progress} / ${floor.length}칸 지나옴`
        }`}
      >
        {lines.join('\n')}
      </pre>
    </Box>
  )
}

// 지도 글자 설명. 상태 상자 아래(area-legend)에 같은 테두리로 놓인다.
export function MapLegend({ player }) {
  return (
    <Box legend="설명">
      {mapLegend(player).map((line) => (
        <p key={line} className="map-legend">
          {line}
        </p>
      ))}
    </Box>
  )
}

export function EnemyBox({ enemy }) {
  return (
    <Box legend="적">
      <Row label={enemy.name} value={`${enemy.hp} / ${enemy.maxHp}`} />
    </Box>
  )
}

export function InventoryBox({ player }) {
  const list = visibleInventory(player)
  if (!list.length) return null
  return (
    <Box legend={`소지품 (${carriedCount(player)} / ${capacityOf(player)})`} className="inventory">
      {list.map((item) => {
        const isGear = item.type === 'weapon' || item.type === 'armor' || item.type === 'aug'
        const label = isGear && item.equipped ? `${item.name} (${item.type === 'aug' ? '이식' : '장착'})` : item.name
        return <Row key={item.id} label={label} value={isGear ? item.description : item.count} />
      })}
    </Box>
  )
}
