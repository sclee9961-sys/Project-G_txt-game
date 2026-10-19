import { useState } from 'react'

// 단말 접속 창. 계정과 비밀번호를 직접 입력한다. (쪽지에서 찾은 조각을 맞춰서 완성해야 한다)
export default function TerminalForm({ onSubmit, onNotebook, onLeave }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')

  return (
    <form
      className="buttons terminal"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(id, password)
      }}
    >
      <label htmlFor="terminal-id">계정</label>
      <input id="terminal-id" value={id} maxLength={24} autoComplete="off" spellCheck={false} autoFocus onChange={(e) => setId(e.target.value)} />
      <label htmlFor="terminal-password">비밀번호</label>
      <input
        id="terminal-password"
        value={password}
        maxLength={24}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">접속</button>
      {onNotebook && (
        <button type="button" onClick={onNotebook}>
          수첩
        </button>
      )}
      <button type="button" onClick={onLeave}>
        물러난다
      </button>
    </form>
  )
}
