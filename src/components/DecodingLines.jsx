import { useEffect, useState } from 'react'

// 해독 연출용 스크램블 문자. 한글/희귀 유니코드 대신 어느 모노스페이스 폰트에서도 폭이 같은
// ASCII 기호만 써서, 글자가 계속 바뀌는 동안에도 줄 너비가 흔들리거나 깨지지 않게 한다.
const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#$%01234789'
const DECODE_TICK_MS = 35

function scramble(text, revealCount) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    out += i < revealCount || text[i] === ' ' ? text[i] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
  }
  return out
}

function useReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 문자열 하나를 한 글자씩 순서대로 "해독되며 나타나는" 것처럼 보여준다. COMPUTER의 모든 대사가
// 이 효과 하나로 통일되게 이 컴포넌트를 재사용한다.
function DecodingText({ text, onDone }) {
  const reduceMotion = useReducedMotion()
  const [revealCount, setRevealCount] = useState(reduceMotion ? text.length : 0)

  useEffect(() => {
    if (reduceMotion) {
      onDone?.()
      return
    }
    if (revealCount >= text.length) {
      onDone?.()
      return
    }
    const id = setTimeout(() => setRevealCount((n) => n + 1), DECODE_TICK_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealCount])

  return reduceMotion ? text : scramble(text, revealCount)
}

// 대사 줄 배열을 한 줄씩 순서대로 보여준다. 한 줄이 다 해독되면 다음 줄로 넘어간다.
export function DecodingLines({ lines, onDone }) {
  const [doneCount, setDoneCount] = useState(0)

  useEffect(() => {
    if (doneCount >= lines.length) onDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount])

  return (
    <>
      {lines.slice(0, doneCount).map((line, i) => (
        <p key={i}>
          {i === 0 && <b>COMPUTER</b>} {line}
        </p>
      ))}
      {doneCount < lines.length && (
        <p>
          {doneCount === 0 && <b>COMPUTER</b>}{' '}
          {/* key로 줄 바뀔 때마다 새로 마운트시켜야 한다. 안 그러면 이전 줄에서 다 채워진 revealCount가
              그대로 남아, effect가 다시 안 돌면서 다음 줄이 중간에 멈춘 채로 영원히 안 풀린다. */}
          <DecodingText key={doneCount} text={lines[doneCount]} onDone={() => setDoneCount((n) => n + 1)} />
        </p>
      )}
    </>
  )
}
