import { useState } from 'react'

// 잠긴 문 앞. 비밀번호만 입력한다. (자료실 쪽지 등에서 찾아야 한다)
export default function GateForm({ onSubmit, onNotebook, onLeave }) {
  const [password, setPassword] = useState('')

  return (
    <form
      className="buttons terminal"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(password)
      }}
    >
      <label htmlFor="gate-password">비밀번호</label>
      <input
        id="gate-password"
        value={password}
        maxLength={24}
        autoComplete="off"
        spellCheck={false}
        autoFocus
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">연다</button>
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
