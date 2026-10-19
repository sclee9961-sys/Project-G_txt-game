import { useState } from 'react'
import { EnemyBox, InventoryBox, MapBox, MapLegend, StatusBox } from './components/Boxes.jsx'
import ChoicePanel from './components/ChoicePanel.jsx'
import ComputerScene from './components/ComputerScene.jsx'
import GateForm from './components/GateForm.jsx'
import Journal from './components/Journal.jsx'
import TerminalForm from './components/TerminalForm.jsx'
import { floors, roomKinds } from './game/data.js'
import { useGame } from './hooks/useGame.js'

const BATTLE_SCREENS = ['battle', 'battleItems', 'battleEnd']
const MENU_SCREENS = ['title', 'confirmNew', 'awaken']

export default function App() {
  const { game, choices, menu, terminal, gate, actions } = useGame()
  const { player, enemy, screen } = game
  const [sceneOpen, setSceneOpen] = useState(false)
  const menuScreen = MENU_SCREENS.includes(screen)
  const inRun = player && !menuScreen
  const floor = inRun ? floors[player.floor] : null
  const inBattle = enemy && BATTLE_SCREENS.includes(screen)
  // 방(휴게실·보급실·의무실·자료실) 화면일 때, 층 이름 탭 옆에 지금 어느 방에 들어와 있는지 보여주는 탭.
  // 지도는 이 방에 있는 동안에도 계속 층 지도를 보여주되, @가 그 방의 글자 자리로 옮겨 겹쳐 보인다(MapBox의 roomIndex).
  const room = screen === 'room' && inRun ? floor.rooms[game.roomIndex] : null

  // 지하 1층 출구에서 COMPUTER를 만나는 진짜 결말. 게임 UI를 완전히 대체한다.
  if (screen === 'computer') {
    return <ComputerScene onEnding={actions.finishComputer} />
  }

  // 테스트용: COMPUTER가 있는 방 장면 그림을 게임 UI 대신 보여준다.
  if (import.meta.env.DEV && sceneOpen) {
    return (
      <>
        <ComputerScene />
        <button type="button" className="dev-exit" onClick={() => setSceneOpen(false)}>
          테스트 종료
        </button>
      </>
    )
  }

  return (
    <main className="game">
      {/* 표지판을 봐서 이 층인 걸 알게 된 뒤부터, 그 층에 맞는 이미지를 흐릿하게 배경에 깐다.
          floor.sceneFlicker가 있는 층(지하 4층의 깜빡이는 전등 등)은 fade-in 뒤에 깜빡임 효과가 이어진다. */}
      {inRun && player.floorKnown && floor.scene && (
        <img
          className={floor.sceneFlicker ? 'floor-scene floor-scene-flicker' : 'floor-scene'}
          src={floor.scene}
          alt=""
          aria-hidden="true"
        />
      )}
      <header className="topbar">
        <div className="location-group">
          <span className="location">{floor && player.floorKnown ? `${floor.name} · ${floor.place}` : '???'}</span>
          {room && (
            <span className="location room-tab">
              {room.name} · {roomKinds[room.kind].name}
            </span>
          )}
        </div>
        <nav className="menu" aria-label="메뉴">
          {menu.map((m) => (
            <button key={m.label} type="button" onClick={m.onClick}>
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 테스트용: 층을 곧장 골라 옮겨 다니거나 COMPUTER와 대화해 본다. 개발 빌드에서만 보이고, 배포 빌드(build)에는 포함되지 않는다. */}
      {import.meta.env.DEV && inRun && (
        <nav className="dev-jump" aria-label="테스트용 도구">
          {floors.map((f, i) => (
            <button
              key={f.name}
              type="button"
              disabled={player.floor === i}
              onClick={() => actions.devJumpFloor(i)}
            >
              {i}. {f.name}
            </button>
          ))}
          <button type="button" onClick={() => setSceneOpen(true)}>
            COMPUTER 방 (장면 시험)
          </button>
        </nav>
      )}

      {menuScreen ? (
        // 게임을 처음 시작할 때(타이틀 / 눈을 뜨는 중)는 지문과 선택지를 화면 한가운데에 모아 보여준다.
        <div className="menu-screen">
          <Journal log={game.log} />
          <ChoicePanel choices={choices} />
        </div>
      ) : (
        <div className="layout">
          {/* 상태·설명(왼쪽)과 지도·선택지(가운데)는 서로 다른 세로 칸(각각 flex 열)이라, 한쪽 칸이 길어져도
              다른 칸 안의 간격(상태-설명, 지도-선택지)은 항상 똑같이 유지된다. */}
          <div className="area-left">
            <div>{inRun && <StatusBox player={player} />}</div>
            {/* 지도 글자 설명은 지도가 보일 때만(전투 중이 아닐 때만) 상태 상자 아래에 놓인다 */}
            <div>{inRun && !inBattle && <MapLegend player={player} />}</div>
          </div>
          {/* 전투 중에는 지도 대신 적 상자가 그 자리에 뜬다. */}
          <div className="area-map">
            {inBattle ? (
              <EnemyBox enemy={enemy} />
            ) : (
              inRun && <MapBox player={player} roomIndex={room ? game.roomIndex : null} />
            )}
            {gate ? <GateForm {...gate} /> : terminal ? <TerminalForm {...terminal} /> : <ChoicePanel choices={choices} />}
          </div>
          <div className="area-inventory">{inRun && <InventoryBox player={player} />}</div>
          <Journal log={game.log} scrollable={screen === 'notebook'} />
        </div>
      )}

      <footer className="hint">숫자 키(1~9) 또는 방향키로도 고를 수 있다</footer>
    </main>
  )
}
