// 게임 로그. 가장 최근 행동의 결과가 맨 위에 오고, 오래된 것은 아래로 밀리며 흐려진다.
// 한 번의 행동으로 여러 줄이 생기면 그 줄들은 읽는 순서대로 한 덩어리로 묶는다.
function groupByBatch(log) {
  const groups = []
  for (const line of log) {
    const last = groups.at(-1)
    if (last && last.batch === line.batch) last.lines.push(line)
    else groups.push({ batch: line.batch, lines: [line] })
  }
  return groups.reverse()
}

// scrollable: 수첩처럼 내용이 길어서 끝까지 읽어야 할 때. 흐려짐 없이 스크롤할 수 있다.
export default function Journal({ log, scrollable = false }) {
  return (
    <section
      className={scrollable ? 'log scrollable' : 'log'}
      aria-live="polite"
      aria-label="기록"
      tabIndex={scrollable ? 0 : undefined}
    >
      {groupByBatch(log).map((g) => (
        <div key={g.batch} className="entry">
          {g.lines.map((l) => (
            <p key={l.id} className={l.type}>
              {l.type === 'note' ? `-${l.text}-` : l.text}
            </p>
          ))}
        </div>
      ))}
    </section>
  )
}
