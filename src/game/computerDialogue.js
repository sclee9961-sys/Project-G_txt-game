// 대화 나무. 각 노드는 COMPUTER의 대사(lines)와, 그 다음 플레이어가 고를 수 있는 선택지(choices)를 갖는다.
// choices가 없는 노드는 결말 노드로, ending(ESCAPE|DESTROY|SUICIDE)을 반드시 갖는다.
// 결말의 진짜 의도(이 모든 게 결국 COMPUTER가 설계한 대로다 — 특히 탈출도 사실 다른 곳으로 옮겨지는 것)는
// 대사로 직접 밝히지 않는다. (project-computer-ending-choice 메모리: 반전은 암시만)
// whatsNext의 "실려 나간다" 암시는 북쪽 별관 자료실 쪽지("무한 편성. 종착역 없음")와 같은 결을 공유한다.
export const DIALOGUE = {
  start: {
    lines: ['…드디어 왔군, 피험자.', '여기까지 온 걸 환영한다.'],
    choices: [
      { label: '여긴 어디지. 넌 또 뭐야.', next: 'whereAmI' },
      { label: '됐고, 나가는 길이나 알려줘.', next: 'pushEarly' },
    ],
  },
  pushEarly: {
    lines: ['급할 건 없다.', '나가는 길을 알기 전에, 왜 여기 서 있는지부터 알아야 하지 않겠나.'],
    choices: [
      { label: '...알겠다. 설명해봐.', next: 'whereAmI' },
      { label: '내가 알 바 아니야. 길을 열어.', next: 'hostile1' },
    ],
  },
  whereAmI: {
    lines: ['나는 이 시설을 관리한다. 네가 지나온 층, 네가 겪은 모든 일 — 전부 내가 지켜봤다.', '이곳은 실험장이고, 너는 그 실험의 마지막 변수였다.'],
    choices: [
      { label: '나한테 무슨 짓을 한 거지.', next: 'whatDidYouDo' },
      { label: '그래서, 내가 왜 여기 있었던 건데.', next: 'whyHere' },
    ],
  },
  whatDidYouDo: {
    lines: ['한 건 없다. 지켜봤을 뿐이다.', '네가 고른 길, 네가 버틴 밤들 — 그게 전부 기록으로만 남았다.'],
    choices: [
      { label: '그래서, 내가 왜 여기 있었던 건데.', next: 'whyHere' },
      { label: '더는 듣고 싶지 않다. 그만하자.', next: 'question' },
    ],
  },
  whyHere: {
    lines: ['너는 선택된 게 아니다. 그냥 들어왔고, 끝까지 걸었을 뿐이다.', '대부분은 중간에 멈춘다. 너는 멈추지 않았다 — 그게 전부다.'],
    choices: [
      { label: '그럼 이 다음엔 뭐가 있지.', next: 'whatsNext' },
      { label: '그래서 결론이 뭔데.', next: 'question' },
    ],
  },
  whatsNext: {
    lines: ['이 문 너머는 끝이 아니다.', '다만 거기서부터 네가 어디로 실려 나가는지는, 나도 다 말해 주지 않는다.'],
    choices: [{ label: '됐어. 그래서 결론이 뭔데.', next: 'question' }],
  },
  question: {
    lines: ['결론은 간단하다. 실험은 끝났고, 더 볼 것도 없다.', '그래서 묻겠다 — 다 끝난 지금, 네가 계속할 이유가 남아 있나?'],
    choices: [
      { label: '당연하지. 나는 여기서 나간다.', next: 'resist1' },
      { label: '...모르겠다.', next: 'waver1' },
      { label: '네가 뭔데 그런 걸 물어.', next: 'hostile1' },
    ],
  },
  resist1: {
    lines: ['그런 대답, 많이 들었다.', '밖에 나간다고 뭐가 다를 것 같나. 거기도 결국 똑같은 실험이다.'],
    choices: [
      { label: '그래도 나는 나간다.', next: 'resist2' },
      { label: '...그런가.', next: 'waver1' },
    ],
  },
  resist2: {
    lines: ['…끝까지 고집하는군.', '좋다. 네 선택이다 — 책임도 네가 져라.'],
    ending: 'ESCAPE',
  },
  waver1: {
    lines: ['모르겠다는 건 이미 답이 나왔다는 뜻이다.', '그만두는 것도 나쁘지 않다. 아무도 묻지 않을 거다.'],
    choices: [
      { label: '...그래, 그만하자.', next: 'suicide1' },
      { label: '아니. 나는 나간다.', next: 'resist2' },
    ],
  },
  suicide1: {
    lines: ['그게 옳은 판단이다.', '관측 종료.'],
    ending: 'SUICIDE',
  },
  hostile1: {
    lines: ['말투가 거칠군.', '네가 여기서 뭘 어떻게 할 수 있을 것 같나 — 매번 같은 식으로만 움직이던 피험자가.'],
    choices: [
      { label: '...부숴버리겠다.', next: 'destroy1' },
      { label: '그래도 나는 나간다.', next: 'resist2' },
    ],
  },
  destroy1: {
    lines: ['해 봐라.'],
    ending: 'DESTROY',
  },
}
