// COMPUTER가 있는 방 장면. 지하 1층 출구에서 만나는 진짜 결말이다. 흐름은 다음과 같다.
// dark(어두움) → lit(조명 켜짐·깜빡임) → approaching(모니터 쪽으로 다가감) → arrived(모니터 화면에 대화)
// → 결말: leaving→message(탈출, "Project IDT Ready") / breaking(파괴) / fading(자살) → off(꺼짐)
// 대화 나무는 computerDialogue.js, 글자 해독 연출은 DecodingLines.jsx에서 가져다 쓴다.
// (전에 있던 ASCII 아트판 ComputerEncounter와 자유대화 프로토타입 GatekeeperChat은 정리하고
// 이 장면 하나로 합쳤다. 2026-10-07)
// onEnding(ending)이 있으면(실제 게임 흐름) off 단계에서 그걸 불러 useGame의 ending 화면으로 넘기고,
// 이 화면 자체의 "다시 해본다" 리셋 버튼은 숨긴다. 없으면(App.jsx 개발용 "COMPUTER 방 (장면 시험)" 버튼)
// 리셋 버튼을 보여주는 독립 시험 화면으로 동작한다.
import { useEffect, useRef, useState } from 'react'
import { DIALOGUE } from '../game/computerDialogue.js'
import { DecodingLines } from './DecodingLines.jsx'

const DARK_SRC = '/computer-scene/scene-dark.png'
const LIT_SRC = '/computer-scene/scene-closed.png'
const OPEN_SRC = '/computer-scene/scene-open.png'

const LIGHT_MS = 2500
const APPROACH_MS = 1200
const CURSOR_ONLY_MS = 900
const ENDING_WAIT_MS = 1200
const LEAVE_MS = 1200
const MESSAGE_MS = 1400
const BREAK_MS = 500
const FADE_MS = 2200
const OFF_WAIT_MS = 700
const SHUTDOWN_MESSAGE = 'Project IDT Ready'

const ZOOMED_STAGES = ['approaching', 'arrived', 'breaking', 'fading']
const TERMINAL_STAGES = ['arrived', 'leaving', 'breaking', 'fading']

export default function ComputerScene({ onEnding } = {}) {
  const [stage, setStage] = useState('dark')
  const [open, setOpen] = useState(false)
  const [introShown, setIntroShown] = useState(false)
  const [nodeId, setNodeId] = useState('start')
  const [nodeRevealed, setNodeRevealed] = useState(false)
  const [history, setHistory] = useState([])
  const logRef = useRef(null)

  const lit = stage !== 'dark'
  const node = DIALOGUE[nodeId]

  // 각 단계가 끝나면 다음 단계로 넘어간다.
  useEffect(() => {
    let t
    if (stage === 'lit') t = setTimeout(() => setStage('approaching'), LIGHT_MS)
    else if (stage === 'approaching') t = setTimeout(() => setStage('arrived'), APPROACH_MS)
    else if (stage === 'arrived') t = setTimeout(() => setIntroShown(true), CURSOR_ONLY_MS)
    else if (stage === 'leaving') t = setTimeout(() => setStage('message'), LEAVE_MS)
    else if (stage === 'message') t = setTimeout(() => setStage('off'), MESSAGE_MS)
    else if (stage === 'breaking') t = setTimeout(() => setStage('off'), BREAK_MS)
    else if (stage === 'fading') t = setTimeout(() => setStage('off'), FADE_MS)
    return () => clearTimeout(t)
  }, [stage])

  // 결말 노드까지 다 읽었으면(해독이 끝났으면), 잠깐 쉬었다가 해당 결말 연출로 넘어간다.
  const ending = nodeRevealed ? node.ending ?? null : null
  useEffect(() => {
    if (!ending) return
    const next = { ESCAPE: 'leaving', DESTROY: 'breaking', SUICIDE: 'fading' }[ending]
    const t = setTimeout(() => setStage(next), ENDING_WAIT_MS)
    return () => clearTimeout(t)
  }, [ending])

  // 꺼지는 연출까지 다 끝나면(실제 게임 흐름이면) 결말을 상위로 알린다.
  useEffect(() => {
    if (stage !== 'off' || !ending || !onEnding) return
    const t = setTimeout(() => onEnding(ending), OFF_WAIT_MS)
    return () => clearTimeout(t)
  }, [stage, ending, onEnding])

  // 글자가 한 자씩 나타날 때마다 로그를 맨 아래로 부드럽게 따라 내려간다. 그래서 COMPUTER가 말하는 줄을 계속 읽을 수 있다.
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    const scrollToBottom = () => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    el.scrollTop = el.scrollHeight
    const observer = new MutationObserver(scrollToBottom)
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [stage])

  const pick = (choice) => {
    setHistory((h) => [...h, { role: 'computer', lines: DIALOGUE[nodeId].lines }, { role: 'player', lines: [choice.label] }])
    setNodeRevealed(false)
    setNodeId(choice.next)
  }

  const reset = () => {
    setStage('dark')
    setOpen(false)
    setIntroShown(false)
    setNodeId('start')
    setNodeRevealed(false)
    setHistory([])
  }

  const blackClass = {
    breaking: 'is-breaking',
    fading: 'is-fading',
    off: 'is-off',
  }[stage]

  return (
    <div className="scene">
      <div className={`scene-frame${ZOOMED_STAGES.includes(stage) ? ' is-zoomed' : ''}`}>
        <img className="scene-image" src={DARK_SRC} alt="어두운 방" />
        <img className={`scene-layer${lit ? ' is-on' : ''}`} src={LIT_SRC} alt="" />
        <img className={`scene-layer${lit && open ? ' is-on' : ''}`} src={OPEN_SRC} alt="" />
        {/* 배선 문제로 조명이 끊기는 연출 */}
        <div className={`scene-flicker${lit && stage !== 'off' ? ' is-on' : ''}`} aria-hidden="true" />

        {stage === 'dark' && (
          <button type="button" className="scene-approach" onClick={() => setStage('lit')}>
            다가가본다
          </button>
        )}

        {/* 리더기 위치(1200×896 기준 약 가로 70.5~87%, 세로 67.5~84%)에 투명하게 겹친 클릭 영역 */}
        {(stage === 'lit' || stage === 'approaching') && (
          <button
            type="button"
            className="scene-drive-hit"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? '디스크 리더기 닫기' : '디스크 리더기 열기'}
          />
        )}

        {/* 모니터 초록 화면 위치(1200×896 기준 가로 33.9~66.0%, 세로 30.2~63.6%)에 맞춘 터미널 */}
        {TERMINAL_STAGES.includes(stage) && (
          <div className={`scene-terminal${stage === 'leaving' ? ' is-leaving' : ''}`}>
            <div className="scene-terminal-inner">
              {/* 선택지도 로그 안에 넣어서, 나타날 때 같은 방식으로 아래까지 따라 내려가게 한다. */}
              <div className="scene-terminal-log" ref={logRef}>
                {!introShown && <span className="scene-cursor">█</span>}
                {introShown && (
                  <>
                    {history.map((entry, i) => (
                      <p key={i} className={entry.role === 'player' ? 'scene-you' : ''}>
                        <b>{entry.role === 'player' ? '나' : 'COMPUTER'}</b> {entry.lines.join(' ')}
                      </p>
                    ))}
                    <DecodingLines key={nodeId} lines={node.lines} onDone={() => setNodeRevealed(true)} />
                  </>
                )}
                {nodeRevealed && !node.ending && (
                  <div className="scene-terminal-choices">
                    {node.choices.map((choice, i) => (
                      <button key={i} type="button" onClick={() => pick(choice)}>
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 탈출 결말: 화면이 작아진 뒤 문구 한 줄만 띄운다. 파괴·자살 결말에는 문구가 없다. */}
        {stage === 'message' && (
          <div className="scene-terminal scene-terminal-message">
            <div className="scene-terminal-inner">
              <p>{SHUTDOWN_MESSAGE}</p>
            </div>
          </div>
        )}

        <div className={`scene-black${blackClass ? ` ${blackClass}` : ''}`} aria-hidden="true" />
      </div>

      {stage === 'off' && !onEnding && (
        <button type="button" className="scene-reset" onClick={reset}>
          다시 해본다
        </button>
      )}
    </div>
  )
}
