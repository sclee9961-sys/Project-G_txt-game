import { useEffect } from 'react'

// 방향키 → 지도 상의 U(위)/D(아래)/L(왼쪽)/R(오른쪽). 탐색 화면의 선택지 중 그 방향으로 움직이는 것(dir)을 찾아 누른다.
const ARROW_DIR = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }

// 선택지 버튼. 숫자 키(1~9), 또는 방향키(있는 선택지에 한해)로도 고를 수 있다.
export default function ChoicePanel({ choices }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return
      const dir = ARROW_DIR[e.key]
      const choice = /^[1-9]$/.test(e.key) ? choices[Number(e.key) - 1] : dir ? choices.find((c) => c.dir === dir) : null
      if (!choice || choice.disabled) return
      if (dir) e.preventDefault() // 화살표의 기본 동작(스크롤)을 막는다
      choice.onClick()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choices])

  return (
    <section className="buttons">
      {choices.map((c, i) => (
        <button key={`${i}-${c.label}`} type="button" disabled={c.disabled} onClick={c.onClick}>
          <span className="key">{i + 1}</span>
          {c.label}
        </button>
      ))}
    </section>
  )
}
