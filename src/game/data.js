// 게임 데이터. 아이템 / 적 / 방 / 층을 추가하려면 여기에 항목만 늘리면 됩니다.

// type: heal(체력 회복) | light(손전등 충전) | vitality(최대 체력 영구 증가) | weapon(공격 +value) | armor(방어 +value) | material(조합 재료)
// 무기와 방어구는 장착한 하나만 적용된다(character.js의 equip). 소모품·재료·vitality는 소지품 용량을 차지하지만, 장비는 차지하지 않는다.
export const items = {
  bandage: { name: '붕대', type: 'heal', value: 20, useText: '붕대로 상처를 동여맸다.', description: '체력 +20' },
  canned: { name: '통조림', type: 'heal', value: 12, useText: '식은 통조림을 억지로 삼켰다.', description: '체력 +12' },
  battery: { name: '배터리', type: 'light', value: 25, useText: '손전등의 배터리를 갈아 끼웠다.', description: '빛 +25' },
  serum: {
    name: '강화 혈청',
    type: 'vitality',
    value: 15,
    useText: '혈청을 주사했다. 뜨거운 기운이 온몸에 퍼진다.',
    description: '최대 체력 +15',
  },
  leather: { name: '가죽', type: 'material', description: '가방을 키우는 재료' },
  part: { name: '기계부품', type: 'material', description: '손전등을 개조하는 재료' },
  pipe: { name: '쇠 파이프', type: 'weapon', value: 2, description: '공격 +2' },
  crowbar: { name: '지렛대', type: 'weapon', value: 4, description: '공격 +4' },
  axe: { name: '소방 도끼', type: 'weapon', value: 6, description: '공격 +6' },
  baton: { name: '전기 충격봉', type: 'weapon', value: 8, description: '공격 +8' },
  overalls: { name: '두꺼운 작업복', type: 'armor', value: 2, description: '방어 +2' },
  vest: { name: '방폭 조끼', type: 'armor', value: 4, description: '방어 +4' },
  suit: { name: '방호복', type: 'armor', value: 6, description: '방어 +6' },
  // 이식(aug): 별관 안쪽 개조실에서만 얻는 보조도구. 무기·방어구와 달리 하나만 고르는 게 아니라 여러 개를 동시에 몸에 지닐 수 있다.
  // stat은 어느 전투 능력치에 더해지는지(attack/defense), corruption은 장착했을 때 쌓이는 변질도다. character.js의 corruptionOf 참고.
  neuralBooster: {
    name: '이식된 신경 가속기',
    type: 'aug',
    stat: 'attack',
    value: 3,
    corruption: 20,
    description: '공격 +3',
    installText: '목덜미에 차가운 기구를 대자, 짧은 통증 뒤에 팔이 먼저 움직이는 감각이 남는다.',
  },
  steelFrame: {
    name: '강철 골격 이식',
    type: 'aug',
    stat: 'defense',
    value: 3,
    corruption: 20,
    description: '방어 +3',
    installText: '뼈대를 따라 차가운 금속이 스며든다. 이제 살갗 아래로 단단한 것이 만져진다.',
  },
  extraArm: {
    name: '적출된 여분의 팔',
    type: 'aug',
    stat: 'attack',
    value: 4,
    corruption: 25,
    description: '공격 +4',
    installText: '등 뒤에 접혀 있던 것이 펴진다. 원래 없던 팔이, 이제는 내 것처럼 움직인다.',
  },
  secondHeart: {
    name: '이식된 두 번째 심장',
    type: 'aug',
    stat: 'defense',
    value: 5,
    corruption: 30,
    description: '방어 +5',
    installText: '가슴 안쪽에서 낯선 박동이 하나 더 뛰기 시작한다. 곧 내 것과 구별할 수 없게 된다.',
  },
}

// appear: 마주쳤을 때의 문장 / verb: 공격할 때의 문장 / boss: 출구를 지키는 적(도망 불가)
export const enemies = {
  dog: {
    name: '굶주린 들개',
    maxHp: 11,
    attack: 5,
    defense: 0,
    appear: '어둠 속에서 눈 두 개가 번뜩인다. 굶주린 들개다.',
    verb: '달려들어 물어뜯었다.',
  },
  scratcher: {
    name: '벽을 긁는 것',
    maxHp: 15,
    attack: 7,
    defense: 1,
    appear: '벽 안쪽에서 긁는 소리가 다가온다. 콘크리트가 갈라지며 무언가 기어 나온다.',
    verb: '날카로운 손톱으로 할퀴었다.',
  },
  worker: {
    name: '창백한 작업자',
    maxHp: 22,
    attack: 9,
    defense: 2,
    appear: '작업복을 입은 사람이 멍하니 서 있다. 이쪽을 돌아본다. 눈에 초점이 없다.',
    verb: '멍한 얼굴로 팔을 휘둘렀다.',
  },
  ceiling: {
    name: '천장에 매달린 것',
    maxHp: 28,
    attack: 11,
    defense: 3,
    appear: '위에서 물방울이 떨어진다. 올려다보니 천장에 무언가 매달려 있다.',
    verb: '천장에서 떨어져 덮쳤다.',
  },
  subject: {
    name: '눈 먼 실험체',
    maxHp: 32,
    attack: 12,
    defense: 3,
    appear: '누군가 벽을 더듬으며 다가온다. 눈이 있어야 할 자리가 하얗게 굳어 있다.',
    verb: '더듬던 손으로 목을 움켜쥐었다.',
  },
  machine: {
    name: '고장 난 경비 장치',
    maxHp: 38,
    attack: 13,
    defense: 4,
    appear: '천장의 레일을 따라 무언가 미끄러져 온다. 렌즈가 깜빡이며 이쪽을 향한다.',
    verb: '금속 팔을 휘둘러 후려쳤다.',
  },
  experiment: {
    name: '실패한 실험체',
    maxHp: 46,
    attack: 15,
    defense: 4,
    appear: '유리 수조가 깨져 있다. 그 안에서 사람이었던 것이 몸을 일으킨다.',
    verb: '일그러진 팔로 짓눌렀다.',
  },
  // 아래는 층마다 하나씩 두는 전용 몬스터다. 기존 8종(공용 풀)에 섞이지 않고, 그 층의 몬스터 풀에만 추가로 들어간다.
  drowned: {
    name: '수로에 잠긴 것',
    maxHp: 13,
    attack: 6,
    defense: 0,
    appear: '발밑의 얕은 물이 출렁인다. 물속에서 무언가 천천히 몸을 일으킨다.',
    verb: '젖은 손으로 발목을 붙잡아 끌어당겼다.',
  },
  stacker: {
    name: '상자 더미 밑의 것',
    maxHp: 18,
    attack: 8,
    defense: 1,
    appear: '쌓인 상자 더미가 기우뚱, 흔들린다. 밑에서 무언가 기어 나온다.',
    verb: '상자 더미 사이에서 팔을 뻗어 붙잡았다.',
  },
  steamer: {
    name: '증기에 그을린 것',
    maxHp: 25,
    attack: 10,
    defense: 2,
    appear: '증기 구름 속에서 그림자가 어른거린다. 뜨거운 숨소리가 다가온다.',
    verb: '뜨거운 증기를 내뿜으며 달려들었다.',
  },
  beltThing: {
    name: '컨베이어에 끼인 것',
    maxHp: 30,
    attack: 12,
    defense: 3,
    appear: '멈춘 컨베이어 벨트가 덜컹, 저절로 움직인다. 벨트 위에 있던 것이 일어선다.',
    verb: '벨트에 끼인 팔로 후려쳤다.',
  },
  sleeper: {
    name: '잠들지 못한 것',
    maxHp: 26,
    attack: 10,
    defense: 2,
    appear: '이불 더미가 부스스 움직인다. 그 안에서 무언가 일어나 앉는다.',
    verb: '잠에 취한 손짓으로 후려쳤다.',
  },
  filer: {
    name: '서류에 파묻힌 것',
    maxHp: 35,
    attack: 13,
    defense: 3,
    appear: '쌓인 서류 더미가 무너지며 그 밑에서 무언가 일어선다.',
    verb: '종이 뭉치를 움켜쥔 손으로 내리쳤다.',
  },
  doorThing: {
    name: '문틈으로 보이던 것',
    maxHp: 37,
    attack: 13,
    defense: 3,
    appear: '반쯤 열린 문틈으로 눈이 마주친다. 문이 천천히 더 열린다.',
    verb: '문틈으로 팔을 뻗어 움켜쥐었다.',
  },
  tank: {
    name: '수조에서 깨어난 것',
    maxHp: 42,
    attack: 14,
    defense: 4,
    appear: '깨진 수조 안에서 액체가 흘러나온다. 그 안에 있던 것이 눈을 뜬다.',
    verb: '축축한 손으로 목을 감아 쥐었다.',
  },
  observed: {
    name: '관찰 당하던 것',
    maxHp: 44,
    attack: 14,
    defense: 4,
    appear: '관찰 창 안쪽에서 얼굴 하나가 이쪽을 바라본다. 유리에 금이 간다.',
    verb: '깨진 유리 조각을 손에 쥔 채 휘둘렀다.',
  },
  usher: {
    name: '출구를 안내하던 것',
    maxHp: 45,
    attack: 14,
    defense: 4,
    appear: '제복을 입은 것이 손짓한다. "이쪽입니다." 목소리가 갈라져 있다.',
    verb: '안내하듯 뻗은 손으로 목을 조였다.',
  },
  hallWatcher: {
    name: '보안실을 배회하는 것',
    maxHp: 20,
    attack: 8,
    defense: 1,
    appear: '보안실 저편에서 발소리가 울린다. 규칙적으로, 점점 가까워진다.',
    verb: '어깨로 부딪히며 밀어붙였다.',
  },
  craneThing: {
    name: '크레인 그림자',
    maxHp: 24,
    attack: 9,
    defense: 2,
    appear: '멈춘 크레인이 삐걱, 움직인다. 그 그림자가 통로를 가로막는다.',
    verb: '쇠사슬을 휘둘러 후려쳤다.',
  },
  staticThing: {
    name: '잡음 속의 것',
    maxHp: 27,
    attack: 10,
    defense: 2,
    appear: '스피커의 잡음이 갑자기 커진다. 그 소리를 따라 무언가 다가온다.',
    verb: '귀를 찢는 잡음과 함께 달려들었다.',
  },
  railThing: {
    name: '레일을 타고 오는 것',
    maxHp: 32,
    attack: 12,
    defense: 3,
    appear: '천장 레일이 삐걱이며 움직인다. 그 끝에서 무언가 미끄러져 온다.',
    verb: '레일에서 뛰어내려 덮쳤다.',
  },
}

// 방의 종류. symbol은 지도에 그려지는 글자다. (아직 안 가 본 방은 대문자, 다녀온 방은 소문자)
//   rest    체력을 모두 회복하고, 이 층에서 쉴 수 있는 횟수를 채운다.
//   supply  items({ 아이템: 개수 })를 얻는다.
//   clinic  최대 체력이 maxHp만큼 영구히 늘고 체력이 모두 회복된다.
//   archive 쪽지(notes)를 읽는다. 읽은 쪽지는 수첩에 적힌다.
//   lab     장비(reward)를 얻지만 경비가 깨어나 싸우게 된다. guards(적 id 목록) 중 하나가 매번 무작위로 나온다.
//           bonus가 있으면 장비와 함께 그 아이템(주로 체력 강화 혈청)도 챙긴다.
//   implant lab과 흐름은 같지만(reward+bonus를 얻고 guards 중 하나와 싸운다), reward가 이식(aug)이라는 점만 다르다.
//           별관에만 있다. 이식은 무기·방어구처럼 하나만 장착하는 게 아니라 여러 개를 동시에 장착할 수 있고,
//           장착할수록 변질도(corruption)가 쌓인다. character.js의 corruptionOf, config.corruptionThreshold 참고.
//   terminal 단말. 계정(login.id)과 비밀번호(login.passwordPrefix + player.passwords[login.passwordIndex])를 맞게
//           입력하면 notes를 열람하고 방이 소진된다. 틀려도 다시 시도할 수 있다.
//   dead    막다른 길. 얻는 것 없이 문장만 나온다.
//   ambush  매복. 보상 없이 적(enemy)이 바로 나타난다.
//   wing    다른 별관(floors의 다른 층)으로 이어지는 통로 문. passwordIndex가 가리키는 값을 맞게 입력해야 열리고,
//           열리면 enterFloor가 가리키는 층으로 곧장 넘어간다(진행도 0부터, 이 방의 자리를 기억해 둔다).
//           그 층 끝에 다다르면 돌아와 이 자리에서 이어간다. 틀리면 gate처럼 체력이 깎인다.
// 같은 at에 방이 두 개 있으면 갈림길로 취급되어, "길이 두 갈래로 갈라진다"로 한 번에 안내된다.
// 방은 순서 상관없이 아무 때나(막다른 길이어도 되돌아와서) 다른 쪽에 들어갈 수 있다.
export const roomKinds = {
  rest: { name: '휴게실', symbol: 'R' },
  supply: { name: '보급실', symbol: 'S' },
  clinic: { name: '의무실', symbol: 'M' },
  archive: { name: '자료실', symbol: 'A' },
  lab: { name: '실험실', symbol: 'E' }, // L은 소문자 l이 숫자 1이나 세로줄 | 과 헷갈려서 쓰지 않는다
  implant: { name: '개조실', symbol: 'I' },
  terminal: { name: '단말실', symbol: 'T' },
  dead: { name: '막다른 길', symbol: 'X' },
  ambush: { name: '매복', symbol: 'K' },
  wing: { name: '별관 통로', symbol: 'W' },
}

// 잠긴 곳(gate/wing/단말)의 비밀번호는 여기 고정 값으로 적지 않는다. 판마다 character.js의 createPlayer가
// player.passwords에 4자리 후보 번호 9개를 새로 뽑아 두고, passwordIndex로 그중 몇 번째를 쓸지만 여기서 정한다.
// (0=게이트, 1=동쪽 별관, 2=단말, 3=서쪽 별관, 4=북쪽 별관, 5=남쪽 별관 — character.js의 PASSWORD_SLOT과 같은 자리다.
// 나머지 6~8번은 아직 안 쓴다) 실제 값은 player.passwords[passwordIndex]다.
// 쪽지 속 힌트는 이 값을 직접 적지 않고 {게이트}/{동별관}/{서별관}/{남별관}/{북별관}/{단말앞}/{단말뒤} 자리표시자로 써서,
// fillNote가 그 판의 값으로 채운다.

// 층 끝까지 잇는 통로 자체를 막는 잠긴 문. rooms(곁길)와 달리 열지 않으면 그 너머로 나아갈 수 없다.
//   at            문이 걸려 있는 지점. progress가 (at - 1)에 닿으면 문이 보이고, 열기 전까지 그 너머로 못 간다.
//   passwordIndex 문을 여는 값이 player.passwords의 몇 번째인지 (대소문자, 하이픈, 공백 무시하고 비교한다)
//   text          문 앞에 섰을 때 보여줄 문장 (열기 전, 매번)
//   openText      올바른 값을 넣었을 때 보여줄 문장

// 지하 10층에서 시작해 위로 올라간다. 마지막 층의 출구 문은 boss가 지킨다.
// length: 계단(출구)을 찾기까지 나아가야 하는 걸음 수
// path: 지도에 그려질 통로 모양. 한 글자가 한 걸음이고 R(오른쪽) D(아래) L(왼쪽) U(위)로 쓴다. 글자 수는 length와 같아야 하고 자기 자신과 겹치면 안 된다.
// theme: 지도에서 길 칸(.)을 대신해 그릴 층 고유 글자와, 범례에 붙는 한 줄 설명. place(장소 이름)의 분위기에 맞춰 고른다.
//   symbol은 한 글자여야 하고, 다른 층의 symbol이나 예약된 글자(공백 #@^? 와 roomKinds의 symbol 대소문자)와 겹치면 안 된다.
// finds: at번째 걸음에서 반드시 얻는 장비 (이미 가지고 있으면 나오지 않는다)
// sign: at번째 걸음에서 이 층이 몇 층·어디인지 알려주는 이정표를 반드시 발견한다. (한 번 찾으면 그 층에서는 계속 안다)
//   그 전까지는 화면 위쪽과 지도에 층 이름 대신 "???"만 보인다.
// loot: 탐색 중 찾을 수 있는 소모품의 가중치
// rooms: 통로에서 갈라지는 곁길과 방. at번째 칸을 지나면 문이 보이고, 그 뒤로는 이 층에서 언제든 들어갈 수 있다. (방마다 한 번만)
//   dir은 at번째 칸에서 방이 있는 방향(R/D/L/U)이며 통로나 다른 방과 겹치면 안 된다. text는 들어갔을 때의 문장이다.
//   searches: (rest/supply/clinic/archive에만) 정해진 행동과 별개로, 방을 나서기 전까지 하나씩 더 골라 볼 수 있는 조사 지점.
//     item이 있으면 그것을 챙기고(count 없으면 1개), enemy가 있으면 위험한 것과 마주쳐 전투로 이어진다(이기면 방으로 돌아온다). 둘 다 없으면 문장만 나온다.
//     requires: 다른 조사 지점의 id. 그 지점을 먼저 조사해야("더 들어가본다") 비로소 선택지에 나타난다 — 조사 지점을 사슬로 이어서
//       방 하나를 더 깊이 파고들 수 있게 한다. 지금은 한 단계만 쓰지만, requires가 또 다른 requires를 가리키면 더 길게도 이을 수 있다.
// gate: (있는 층만) 통로 자체를 막는 잠긴 문. 위 주석 참고. 비밀번호는 보통 같은 층의 자료실 쪽지에 있다.
// final: (지하 1층에만) 이 층 출구는 계단이 아니라, 안쪽의 COMPUTER와 대화해야 열리는 문이다.
//   isFinalFloor가 이 값으로 판단한다.
// wing: (별관 층에만) 이 층은 climb으로 오는 게 아니라 다른 층의 wing 방을 통해 들어온다. 출구에 다다르면
//   계단 대신 "돌아간다"로 원래 층의 그 방 자리로 되돌아간다.
// scene: 표지판을 봐서 floorKnown이 된 뒤부터 그 층 동안 배경에 흐릿하게 깔리는 이미지. 없는 층은 기존처럼 까만 배경.
// sceneFlicker: scene이 있는 층 중, 깜빡이는 전등처럼 추가 연출이 필요한 층에만 true로 둔다(App.jsx 참고).
export const floors = [
  {
    name: '지하 10층',
    place: '배수로',
    theme: { symbol: '~', label: '흐르는 물' },
    scene: '/floor-scenes/drain.png',
    length: 26,
    path: 'RUUULUUURRRRRUUUUUURRRRDDD',
    intro: '젖은 콘크리트 냄새. 발밑으로 얕은 물이 흐른다.',
    sign: { at: 2, text: ['벽에 녹슨 팻말이 박혀 있다. 흙을 닦아내자 글자가 드러난다.', '「지하 10층 · 배수로」'] },
    ambient: [
      '물방울 떨어지는 소리가 일정한 간격으로 이어진다.',
      '벽에 분필로 그은 줄이 이어져 있다. 세다가 그만둔 흔적이다.',
      '멀리서 금속을 끄는 소리가 났다가 멈춘다.',
      '갈림길이다. 어느 쪽이든 똑같이 어둡다.',
      '같은 모퉁이를 돌았던 것 같다. 아닐지도 모른다.',
    ],
    enemies: ['dog', 'scratcher', 'drowned'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [{ at: 14, item: 'pipe', text: '배관 틈에 쇠 파이프가 끼어 있다. 손에 쥐니 묵직하다.' }],
    rooms: [
      {
        at: 18,
        dir: 'R',
        kind: 'rest',
        name: '관리 초소',
        text: ['배수로 관리인이 쓰던 초소다. 낡은 담요와 식은 보온병이 남아 있다.'],
        searches: [
          { id: 'blanket', label: '담요를 들춰본다', text: ['담요 밑에 눅눅한 종이 몇 장이 깔려 있다. 읽을 수 없다.'] },
          { id: 'shelf', label: '선반을 살펴본다', text: ['선반 구석에서 통조림 하나를 찾았다.'], item: 'canned' },
          {
            id: 'shelfBack',
            requires: 'shelf',
            label: '선반 뒤쪽까지 마저 뒤져본다',
            text: ['선반을 밀어내자 뒤쪽 틈에 배터리 하나가 끼어 있다.'],
            item: 'battery',
          },
        ],
      },
      {
        at: 16,
        dir: 'R',
        kind: 'supply',
        name: '왼쪽 갈림길',
        items: { battery: 1 },
        text: ['녹슨 배수관 뒤에 작은 상자가 끼어 있다.'],
        searches: [
          { id: 'pipe', label: '배수관 안쪽을 비춰본다', text: ['손전등을 배수관 안쪽으로 비췄다. 녹슨 나사 몇 개뿐이다.'] },
          { id: 'crate', label: '상자 밑을 뒤진다', text: ['상자 밑바닥에 붕대 하나가 깔려 있다.'], item: 'bandage' },
          {
            id: 'crateDeep',
            requires: 'crate',
            label: '상자를 완전히 치우고 더 들어가본다',
            text: ['상자를 치우자 그 밑으로 좁은 틈이 이어진다. 몸을 숙여 들어간다.', '물이 더 깊다. 무언가 물속에서 움직인다.'],
            enemy: 'drowned',
          },
        ],
      },
      {
        at: 16,
        dir: 'L',
        kind: 'dead',
        name: '오른쪽 갈림길',
        text: ['물이 무릎까지 차오른 막다른 통로다.', '더 갈 곳이 없다. 되돌아간다.'],
      },
    ],
  },
  {
    name: '지하 9층',
    place: '창고',
    theme: { symbol: '=', label: '빈 선반' },
    scene: '/floor-scenes/warehouse.png',
    length: 28,
    path: 'UUUUUURRRRURRRDDDDDDRDDRRRRR',
    intro: '철제 선반이 줄지어 선 창고다. 상자는 모두 비어 있다.',
    sign: { at: 2, text: ['선반 기둥에 낡은 표찰이 매달려 있다.', '「지하 9층 · 창고」'] },
    ambient: [
      '텅 빈 철제 선반이 끝없이 늘어서 있다.',
      '먼지 위에 발자국이 어지럽게 찍혀 있다. 모두 같은 방향을 향한다.',
      '상자마다 번호가 적혀 있다. 내 것은 없다.',
      '선반 너머에서 누군가 숨을 죽이는 기척이 난다.',
    ],
    enemies: ['scratcher', 'worker', 'stacker'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [{ at: 17, item: 'overalls', text: '사물함 안에 두꺼운 작업복이 걸려 있다. 겹쳐 입었다.' }],
    rooms: [
      {
        at: 12,
        dir: 'D',
        kind: 'supply',
        name: '보급 창고',
        items: { bandage: 1, canned: 1, battery: 1 },
        text: ['잠긴 철망 안쪽에 상자 몇 개가 남아 있다.'],
        searches: [
          { id: 'shelfTop', label: '선반 위쪽을 살펴본다', text: ['먼지 쌓인 선반 위에서 배터리 하나를 더 찾았다.'], item: 'battery' },
          { id: 'boxes', label: '빈 상자들을 헤집는다', text: ['상자는 정말로 텅 비어 있다. 시간만 버렸다.'] },
          {
            id: 'shelfTopDeep',
            requires: 'shelfTop',
            label: '선반 맨 위 칸까지 올라가본다',
            text: ['까치발을 들어 맨 위 칸을 더듬는다. 손끝에 기계부품 하나가 걸린다.'],
            item: 'part',
          },
        ],
      },
    ],
  },
  {
    name: '지하 8층',
    place: '보일러실',
    theme: { symbol: '*', label: '뜨거운 증기' },
    scene: '/floor-scenes/boiler.png',
    length: 30,
    path: 'RRRRUURRURRDDDDDDRRUUULUUUURDD',
    intro: '뜨거운 공기와 낮게 울리는 굉음. 녹슨 배관이 천장을 가득 메우고 있다.',
    sign: { at: 2, text: ['배관에 걸린 안내판이 눈에 들어온다.', '「지하 8층 · 보일러실」'] },
    ambient: [
      '배관 어딘가에서 증기가 새는 소리가 난다.',
      '압력계 바늘이 위험 구간에서 떨리고 있다.',
      '벽이 손을 델 만큼 뜨겁다. 누군가 여기서 오래 불을 지폈다.',
      '보일러 문 안쪽에서 무언가 두드리는 소리가 난다.',
    ],
    enemies: ['scratcher', 'worker', 'steamer'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [],
    rooms: [
      {
        at: 13,
        dir: 'L',
        kind: 'archive',
        name: '기록 보관함',
        notes: [
          '피험자 번호는 세다가 잊었다. 오늘도 한 명이 위로 올라갔다.',
          '문 앞을 막는 것은 없다고 한다. 대신, 문 너머의 것이 말을 건다.',
          '[시험 개요] 목표: 출구 도달. 관찰 대상: 도달까지의 선택. 출구의 실체는 피험자에게 공개하지 않는다.',
          '[편성 안내] INFINITE DUNGEON TRAIN. 종착역 없이 달리는 열차. 이 시설은 그 열차에 이어 붙은 칸 하나다.',
          '[단말 안내] 관리 단말 접속. 계정: 피험자 번호 그대로 (SUBJ-####). 비밀번호: 구역 코드와 네 자리 숫자를 하이픈으로 잇는다. 단말은 지하 1층에 있다.',
        ],
        text: ['벽에 박힌 철제 보관함을 비틀어 열었다.', '안에 접힌 종이가 몇 장 들어 있다.'],
        searches: [
          { id: 'floor', label: '바닥에 떨어진 종이를 줍는다', text: ['바닥에 떨어진 종이는 물에 젖어 글자가 번져 있다. 읽을 수 없다.'] },
          { id: 'pipeCheck', label: '배관 틈을 살펴본다', text: ['배관 틈에서 붕대 하나를 찾았다.'], item: 'bandage' },
          {
            id: 'pipeDeep',
            requires: 'pipeCheck',
            label: '배관을 따라 더 들어가본다',
            text: ['배관 틈이 사람 하나 지날 만큼 넓어진다. 안쪽으로 뜨거운 김이 뿜어져 나온다.'],
            enemy: 'steamer',
          },
        ],
      },
    ],
  },
  {
    name: '지하 7층',
    place: '작업장',
    theme: { symbol: '+', label: '멈춘 기계' },
    scene: '/floor-scenes/workshop.png',
    length: 34,
    path: 'UUUUUULUUUUULUULUUUUUURRRRRRDDLLLL',
    intro: '멈춘 기계와 끊어진 컨베이어 벨트. 누군가 여기서 오래 일했다.',
    sign: { at: 2, text: ['작업 지시판 모서리에 낡은 각인이 있다.', '「지하 7층 · 작업장」'] },
    ambient: [
      '멈춘 기계들이 어둠 속에서 웅크리고 있다.',
      '컨베이어 벨트 위에 신발 한 짝이 놓여 있다.',
      '작업 지시판에 같은 문장이 수백 번 적혀 있다. "계속 일하시오."',
      '기계 하나가 덜컥 움직이다 멈춘다.',
    ],
    enemies: ['worker', 'ceiling', 'beltThing'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [{ at: 17, item: 'crowbar', text: '공구함에서 지렛대를 찾았다. 무기로 쓸 만하다.' }],
    rooms: [
      {
        at: 24,
        dir: 'D',
        kind: 'clinic',
        name: '작업장 의무실',
        maxHp: 10,
        text: ['먼지 쌓인 진료대와 열린 약장. 빈 선반 사이에서 주사기 하나가 굴러다닌다.'],
        searches: [
          { id: 'cabinet', label: '약장 안쪽을 살펴본다', text: ['빈 약병들 사이에서 통조림 하나가 굴러 나온다.'], item: 'canned' },
          { id: 'bedUnder', label: '진료대 밑을 본다', text: ['진료대 밑은 먼지뿐이다.'] },
          {
            id: 'cabinetDeep',
            requires: 'cabinet',
            label: '약장 뒤쪽 벽까지 살펴본다',
            text: ['약장을 밀어내자 벽에 작은 틈이 있다. 붕대 하나가 끼워져 있다.'],
            item: 'bandage',
          },
        ],
      },
      {
        at: 21,
        dir: 'R',
        kind: 'supply',
        name: '왼쪽 갈림길',
        items: { bandage: 1 },
        text: ['멈춘 컨베이어 벨트 밑에 공구함이 끼어 있다.'],
        searches: [
          { id: 'toolbox', label: '공구함 구석을 뒤진다', text: ['공구함 구석에서 배터리 하나를 찾았다.'], item: 'battery' },
          { id: 'belt', label: '컨베이어 벨트 아래를 본다', text: ['벨트 아래는 기름때뿐이다.'] },
          {
            id: 'beltDeep',
            requires: 'belt',
            label: '벨트 밑으로 몸을 숙여 더 들어가본다',
            text: ['벨트 밑을 기어 안쪽까지 들어간다. 갑자기 벨트가 덜컹, 움직인다.'],
            enemy: 'beltThing',
          },
        ],
      },
      {
        at: 21,
        dir: 'L',
        kind: 'ambush',
        name: '오른쪽 갈림길',
        enemy: 'worker',
        text: ['멈춘 기계 그림자 사이에서 인기척이 느껴진다.'],
      },
    ],
  },
  {
    name: '지하 6층',
    place: '숙소',
    theme: { symbol: '-', label: '늘어선 침대' },
    scene: '/floor-scenes/dorm.png',
    length: 36,
    path: 'RRRRDRRUUUUUURRRRDRDLLLDDDDDLLLLDDDD',
    intro: '이층 침대가 끝없이 늘어선 방. 이불 속이 아직 따뜻한 것 같다.',
    sign: { at: 2, text: ['문설주에 붙은 호수 표찰을 발견했다.', '「지하 6층 · 숙소」'] },
    ambient: [
      '침대마다 이름표가 붙어 있다. 이름은 모두 지워져 있다.',
      '누군가 벽에 손톱으로 그은 달력이 있다. 마지막 줄은 끝나지 않았다.',
      '베개 밑에서 접힌 쪽지가 나온다. 비어 있다.',
      '누군가 이불 속에서 뒤척이는 소리가 난다. 확인하지 않는다.',
    ],
    enemies: ['worker', 'ceiling', 'sleeper'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [],
    rooms: [
      {
        at: 16,
        dir: 'U',
        kind: 'rest',
        name: '직원 숙소',
        text: ['이층 침대 하나가 비어 있다. 시트에는 아직 온기가 남은 것 같다.'],
        searches: [
          { id: 'bunk', label: '다른 침대를 살펴본다', text: ['다른 침대에도 온기가 남아 있다. 애써 무시한다.'] },
          { id: 'pillow', label: '베개 밑을 뒤진다', text: ['베개 밑에서 붕대 하나를 찾았다.'], item: 'bandage' },
          {
            id: 'bunkDeep',
            requires: 'bunk',
            label: '이불을 걷어보고 더 들어가본다',
            text: ['이불을 걷는다. 그 아래 시트가 사람 모양으로 부풀어 있다.', '천천히, 그것이 몸을 일으킨다.'],
            enemy: 'sleeper',
          },
        ],
      },
      {
        at: 28,
        dir: 'R',
        kind: 'supply',
        name: '숙소 매점',
        items: { canned: 2, battery: 1 },
        text: ['매점 선반에 통조림과 건전지가 몇 개 남아 있다.'],
        searches: [
          { id: 'register', label: '계산대 안쪽을 확인한다', text: ['계산대 서랍은 텅 비어 있다.'] },
          { id: 'fridge', label: '냉장고를 열어본다', text: ['꺼진 냉장고 안에서 통조림 하나를 찾았다.'], item: 'canned' },
          {
            id: 'fridgeDeep',
            requires: 'fridge',
            label: '냉장고 안쪽 칸까지 뒤진다',
            text: ['냉장고 안쪽, 성에 낀 칸 구석에서 통조림 하나를 더 찾았다.'],
            item: 'canned',
          },
        ],
      },
    ],
  },
  {
    name: '지하 5층',
    place: '자료동',
    theme: { symbol: ':', label: '늘어선 캐비닛' },
    scene: '/floor-scenes/archive.png',
    length: 38,
    path: 'UULLLLLDDDDDDRDDDLLDDRDDDRRRRRDLDDDDDD',
    intro: '서류 캐비닛이 벽을 따라 늘어선 층. 종이 냄새와 곰팡이 냄새가 섞여 있다.',
    sign: { at: 2, text: ['캐비닛 위에 붙은 안내판이 보인다.', '「지하 5층 · 자료동」'] },
    ambient: [
      '캐비닛 서랍이 모두 열려 있다. 안은 비어 있다.',
      '바닥에 흩어진 서류마다 같은 도장이 찍혀 있다. "재시도".',
      '복사기가 혼자 돌아가며 백지를 뱉고 있다.',
      '형광등 아래로 그림자가 하나 더 길게 늘어져 있다.',
    ],
    enemies: ['ceiling', 'subject', 'filer'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [],
    rooms: [
      {
        at: 20,
        dir: 'R',
        kind: 'lab',
        name: '소규모 실험실',
        reward: 'axe',
        bonus: 'serum',
        guards: ['subject', 'machine'], // 들어갈 때마다 둘 중 하나가 무작위로 나온다
        text: ['유리 너머로 수술대와 낡은 기록판이 보인다.', '벽에 걸린 소방 도끼가 눈에 들어온다. 손에 쥐었다.'],
      },
      {
        at: 30,
        dir: 'R',
        kind: 'archive',
        name: '자료실',
        notes: [
          '이 시설은 출구를 만들기 위해 지어졌다. 출구를 찾는 사람을 관찰하기 위해서.',
          '관찰 항목: 망설임의 길이, 두려움의 방향, 위로 올라가려는 의지. 의지가 남은 자만 끝까지 지켜본다.',
          '[투입 기록] 신규 피험자. 번호 {번호앞}■■. 이름과 나이는 삭제됨. 이전 투입 기록이 있으나 본인은 기억하지 못한다.',
          '[임시 메모] 단말 비밀번호의 숫자 앞 두 자리는 {단말앞}. 뒤 두 자리는 통제실 파일에 있다.',
        ],
        text: ['자료실 책상 위에 노트 한 권이 펼쳐져 있다.'],
        searches: [
          { id: 'cabinetDrawer', label: '다른 캐비닛 서랍을 열어본다', text: ['서랍은 모두 비어 있다. 이 방만 유독 그렇다.'] },
          { id: 'underNote', label: '책상 밑을 살펴본다', text: ['책상 밑에서 배터리 하나를 찾았다.'], item: 'battery' },
          {
            id: 'cabinetDeep',
            requires: 'cabinetDrawer',
            label: '텅 빈 캐비닛 안쪽까지 더 들어가본다',
            text: ['맨 아래 서랍만 잠겨 있다. 억지로 당기자 서랍째 뜯겨 나온다.', '서랍 안쪽 깊은 곳에서 종이 뭉치가 무너져 내린다.'],
            enemy: 'filer',
          },
        ],
      },
    ],
  },
  {
    name: '지하 4층',
    place: '회랑',
    theme: { symbol: '|', label: '깜빡이는 전등' },
    scene: '/floor-scenes/corridor.png',
    sceneFlicker: true,
    length: 42,
    path: 'UUUUUULLLLUUURRRRRRUUUUUURDDDDRUURDRUURRRR',
    intro: '끝없이 이어지는 복도. 천장의 전등이 하나씩 깜빡인다.',
    sign: { at: 2, text: ['복도 벽에 걸린 층수 표지판을 지나친다.', '「지하 4층 · 회랑」'] },
    ambient: [
      '문마다 번호가 붙어 있지만 순서가 맞지 않는다.',
      '아무리 걸어도 같은 전등이 나타난다.',
      '어느 문 너머에서 웃음소리가 들린다. 열어 보지 않는다.',
      '바닥에 무언가 끌린 자국이 위쪽으로 이어진다.',
    ],
    enemies: ['worker', 'ceiling', 'subject', 'doorThing'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [{ at: 23, item: 'vest', text: '부서진 문 안쪽에 방폭 조끼가 놓여 있다. 무겁지만 든든하다.' }],
    rooms: [
      {
        at: 14,
        dir: 'D',
        kind: 'rest',
        name: '연구원 휴게실',
        text: ['자판기 불빛만 깜빡이는 방. 커피 냄새가 희미하다.'],
        searches: [
          { id: 'vending', label: '자판기를 흔들어본다', text: ['자판기가 덜컹거리더니 통조림 하나가 떨어진다.'], item: 'canned' },
          { id: 'vent', label: '환풍구 안을 들여다본다', text: ['환풍구 안에서 눈이 마주쳤다.'], enemy: 'scratcher' },
          {
            id: 'vendingDeep',
            requires: 'vending',
            label: '자판기를 더 세게 흔들어본다',
            text: ['자판기가 요란하게 덜컹거리더니 배터리 하나가 마저 떨어진다.'],
            item: 'battery',
          },
        ],
      },
      {
        at: 33,
        dir: 'U',
        kind: 'clinic',
        name: '응급 처치실',
        maxHp: 10,
        text: ['침대 옆에 링거 걸이가 쓰러져 있다. 서랍 속에 알약 통이 남아 있다.'],
        searches: [
          { id: 'drawerPills', label: '서랍 속 알약 통을 확인한다', text: ['알약은 모두 삭아 못 쓴다.'] },
          { id: 'ivStand', label: '링거 걸이 밑을 본다', text: ['링거 걸이 밑에서 붕대 하나를 찾았다.'], item: 'bandage' },
          {
            id: 'ivDeep',
            requires: 'ivStand',
            label: '침대 안쪽 커튼 너머로 더 들어가본다',
            text: ['커튼을 걷자 안쪽에 침대가 하나 더 있다. 시트가 불룩하게 부풀어 있다.'],
            enemy: 'doorThing',
          },
        ],
      },
      {
        at: 38,
        dir: 'U',
        kind: 'archive',
        name: '관리 기록실',
        notes: [
          '문에 붙은 번호는 통제실 기준이고, 실제 방 배치와는 다르다고 적혀 있다.',
          '이 방 기록은 일부일 뿐이다. 더 오래된 서류는 아래층 자료동 캐비닛에 꽂혀 있다고 적혀 있다.',
          '[관리 메모] 복도 안쪽 철문은 동쪽 별관으로 이어진다. 잠금 번호: {동별관}.',
        ],
        text: ['복도와 똑같은 문 하나를 밀어 열자, 작은 사무실이 나온다. 책상 위에 서류철이 쌓여 있다.'],
        searches: [
          { id: 'folder', label: '서류철을 넘겨본다', text: ['대부분 빈 양식뿐이다.'] },
          { id: 'underDesk', label: '책상 밑을 살펴본다', text: ['책상 밑에서 붕대 하나를 찾았다.'], item: 'bandage' },
          {
            id: 'folderDeep',
            requires: 'folder',
            label: '서류철 맨 아래까지 더 넘겨본다',
            text: ['맨 아래 장 뒤에 숨겨진 쪽지가 끼워져 있다. 꺼내려 하자 종이 뭉치가 와르르 쏟아진다.'],
            enemy: 'doorThing',
          },
        ],
      },
      {
        at: 41,
        dir: 'D',
        kind: 'wing',
        name: '별관으로 이어지는 철문',
        passwordIndex: 1,
        enterFloor: 10,
        text: [
          '복도 끝, 낯선 철문이 하나 더 있다. 이 층 도면에는 없던 문이다.',
          '손잡이 옆에 작은 잠금장치가 붙어 있다. 네 자리 번호가 필요해 보인다.',
        ],
        openText: [
          '녹슨 잠금장치가 낮은 소리를 내며 풀린다.',
          '문 너머로 낯선 통로가 이어진다. 지금까지와는 다른 공기다.',
        ],
      },
    ],
  },
  {
    name: '지하 3층',
    place: '실험동',
    theme: { symbol: '%', label: '빈 수조' },
    scene: '/floor-scenes/lab.png',
    length: 44,
    path: 'LLLDLLUUUURRRRRRUURUULURRRUUUUUURDRRRDLDDDDR',
    intro: '흰 타일과 강한 소독약 냄새. 유리 벽 너머로 텅 빈 수조들이 줄지어 서 있다.',
    sign: { at: 2, text: ['문 위 명패에 글자가 새겨져 있다.', '「지하 3층 · 실험동」'] },
    ambient: [
      '수조마다 이름표가 붙어 있다. 안은 비어 있다.',
      '바닥 배수구 쪽으로 무언가를 씻어 낸 자국이 이어진다.',
      '어느 유리벽 안쪽에 손바닥 자국이 겹겹이 찍혀 있다.',
      '스피커에서 잡음 섞인 안내 방송이 들린다. "시험을 계속하겠습니다."',
    ],
    enemies: ['ceiling', 'subject', 'machine', 'tank'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [],
    // 이 실험동은 동관(문 앞)과 서관(문 너머)으로 나뉜다. 서관의 부품 창고는 gate를 열어야 닿을 수 있다.
    gate: {
      at: 30,
      passwordIndex: 0,
      text: [
        '복도 끝이 두꺼운 철문으로 막혀 있다. 손잡이 옆에 작은 숫자 패널이 붙어 있다.',
        '패널에는 네 자리 코드를 입력하라고 적혀 있다.',
      ],
      openText: ['패널에 코드를 입력하자 잠금 장치가 풀리는 소리가 난다.', '무거운 문이 옆으로 밀려 열린다. 서관으로 이어지는 통로다.'],
    },
    rooms: [
      {
        at: 21,
        dir: 'R',
        kind: 'lab',
        name: '제2 실험실',
        reward: 'suit',
        bonus: 'serum',
        guards: ['machine', 'experiment'],
        text: ['벽에 방호복이 걸려 있다. 입고 나니 한결 든든하다.', '천장의 렌즈가 천천히 이쪽을 향한다.'],
      },
      {
        at: 35,
        dir: 'D',
        kind: 'supply',
        name: '부품 창고',
        items: { bandage: 2, battery: 1, part: 2 },
        text: ['부품 상자 속에 의료 물품과 뜯어낸 기계부품이 섞여 있다.'],
        searches: [
          { id: 'boxCorner', label: '상자 구석을 더 뒤진다', text: ['상자 구석에서 기계부품 하나를 더 찾았다.'], item: 'part' },
          { id: 'shelfBelow', label: '선반 아래 칸을 본다', text: ['아래 칸은 녹슨 나사뿐이다.'] },
          {
            id: 'boxCornerDeep',
            requires: 'boxCorner',
            label: '상자를 다 비우고 바닥까지 더 뒤진다',
            text: ['상자를 완전히 비우자 바닥에 기계부품 하나가 더 깔려 있다.'],
            item: 'part',
          },
        ],
      },
      {
        at: 11,
        dir: 'D',
        kind: 'archive',
        name: '동관 사무실',
        notes: [
          '이 실험동은 동관과 서관으로 나뉜다. 서관은 격리문 너머에 있다.',
          '서랍 안쪽에 격리문 코드를 적어 둔 종이가 붙어 있다. {게이트}.',
        ],
        text: ['책상 서랍에서 낡은 서류철을 꺼냈다.', '먼지를 털어 내고 펼쳐 보았다.'],
        searches: [
          { id: 'otherDrawer', label: '다른 서랍을 열어본다', text: ['다른 서랍에서 배터리 하나를 찾았다.'], item: 'battery' },
          { id: 'closet', label: '벽장을 열어본다', text: ['벽장 안에서 무언가 움직인다.'], enemy: 'machine' },
          {
            id: 'drawerDeep',
            requires: 'otherDrawer',
            label: '서랍 안쪽 칸막이를 뜯어내고 더 들어가본다',
            text: ['서랍 안쪽에 또 다른 칸막이가 있다. 뜯어내자 좁은 통로가 나타난다.', '통로 끝, 깨진 수조 하나가 놓여 있다.'],
            enemy: 'tank',
          },
        ],
      },
    ],
  },
  {
    name: '지하 2층',
    place: '격리동',
    theme: { symbol: ';', label: '긁힌 자국' },
    scene: '/floor-scenes/quarantine.png',
    length: 46,
    path: 'RRRURRRRDDDDDDLLLDDLLLUUURDRUULLLLULULLLDDDDLL',
    intro: '두꺼운 철문과 관찰 창이 늘어선 복도. 문마다 안쪽에서 긁힌 자국이 있다.',
    sign: { at: 2, text: ['철문 옆에 붙은 표찰이 눈에 띈다.', '「지하 2층 · 격리동」'] },
    ambient: [
      '관찰 창 안쪽이 젖어 있다. 안에서 누가 방금까지 두드린 것처럼.',
      '철문마다 안쪽 손잡이가 없다.',
      '벽에 "여기서 나가지 마시오"라고 적혀 있다. 누군가 "마시오"를 긁어냈다.',
      '복도 끝에서 규칙적인 숨소리가 들린다. 내 숨소리가 아니다.',
    ],
    enemies: ['subject', 'machine', 'observed'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [],
    rooms: [
      {
        at: 14,
        dir: 'D',
        kind: 'clinic',
        name: '중환자실',
        maxHp: 10,
        text: ['침대가 하나뿐인 방. 약품 냉장고가 아직 희미하게 돈다.'],
        searches: [
          { id: 'cooler', label: '약품 냉장고를 살펴본다', text: ['약품은 모두 삭아 있다. 쓸 수 없다.'] },
          { id: 'underBed', label: '침대 밑을 본다', text: ['침대 밑에서 붕대 하나를 찾았다.'], item: 'bandage' },
          {
            id: 'coolerDeep',
            requires: 'cooler',
            label: '냉장고 안쪽 서랍까지 더 뒤진다',
            text: ['냉장고 안쪽 서랍에서 멀쩡한 붕대 하나를 찾았다.'],
            item: 'bandage',
          },
        ],
      },
      {
        at: 24,
        dir: 'L',
        kind: 'lab',
        name: '격리 실험실',
        reward: 'baton',
        bonus: 'serum',
        guards: ['experiment', 'subject'],
        text: ['수조 옆 선반에 전기 충격봉이 놓여 있다. 아직 전기가 남아 있다.', '유리가 깨지는 소리가 뒤에서 들린다.'],
      },
      {
        at: 37,
        dir: 'U',
        kind: 'archive',
        name: '관찰실',
        notes: [
          '문 너머의 것에는 얼굴이 없다.',
          '말을 거는 것도, 지켜보는 것도 전부 그것 하나다.',
          '문 뒤는 바깥이 아니다. 피험자들은 그것을 모른 채 웃으며 문을 연다.',
          '[관찰 일지] 피험자 ■■{번호뒤}. {투입}번째 투입. 이번에도 같은 길로 올라온다. 쓰러진 횟수는 세지 않기로 했다.',
          '[구역 코드] 이 구역의 관리 코드는 GATE.',
        ],
        text: ['관찰실 모니터에 지나온 복도가 재생되고 있다. 그 안에 내가 있다.', '책상 위에 쪽지가 남아 있다.'],
        searches: [
          { id: 'monitor', label: '다른 모니터를 확인한다', text: ['다른 모니터는 이미 꺼져 있다.'] },
          { id: 'deskUnder', label: '책상 밑을 본다', text: ['책상 밑에서 무언가 손을 뻗는다.'], enemy: 'subject' },
          {
            id: 'monitorDeep',
            requires: 'monitor',
            label: '꺼진 모니터 뒤쪽 관찰 창까지 더 들어가본다',
            text: ['꺼진 모니터 뒤로 작은 관찰 창이 하나 더 있다. 안쪽이 캄캄하다.', '창에 얼굴을 가까이 대는 순간, 안쪽에서도 눈이 마주친다.'],
            enemy: 'observed',
          },
        ],
      },
    ],
  },
  {
    name: '지하 1층',
    place: '출구 앞',
    theme: { symbol: '!', label: '가까운 출구' },
    final: true,
    length: 48,
    path: 'RUUUULLLLLLUUUUURRRRRRDDLLULDDRRRRDDDDDDRRRRRRDD',
    intro: '계단 위에서 희미한 바람이 내려온다. 출구가 가깝다.',
    sign: { at: 2, text: ['계단참 표지판에 글자가 적혀 있다.', '「지하 1층 · 출구 앞」'] },
    ambient: [
      '공기가 다르다. 희미하게, 바깥의 냄새가 난다.',
      '벽의 페인트가 새것이다. 누군가 최근까지 이곳을 손봤다.',
      '계단참마다 표지판이 붙어 있다. "출구 →"',
      '내가 멈추면 뒤의 발소리도 멈춘다.',
    ],
    enemies: ['ceiling', 'subject', 'machine', 'usher'],
    loot: { bandage: 3, canned: 2, battery: 3 },
    finds: [],
    rooms: [
      {
        at: 27,
        dir: 'R',
        kind: 'rest',
        name: '경비 휴게실',
        text: ['출구 앞 경비들이 쓰던 방이다. 의자에 걸린 제복이 사람 모양으로 굳어 있다.'],
        searches: [
          { id: 'locker', label: '사물함을 열어본다', text: ['사물함 안에서 배터리 하나를 찾았다.'], item: 'battery' },
          { id: 'uniform', label: '제복을 만져본다', text: ['제복은 정말로 사람 모양으로 굳어 있다. 손대지 않는다.'] },
          {
            id: 'lockerDeep',
            requires: 'locker',
            label: '사물함 맨 아래 칸까지 더 뒤진다',
            text: ['맨 아래 칸 구석에서 배터리 하나를 더 찾았다.'],
            item: 'battery',
          },
        ],
      },
      {
        at: 38,
        dir: 'R',
        kind: 'archive',
        name: '통제실',
        notes: [
          '문은 안쪽에서 열리지 않는다. 바깥에서도 열리지 않는다.',
          '안쪽의 것과 대화가 끝나야 열린다.',
          '[판정] 문이 열리면 시험은 끝난다. 피험자의 기록은 그때 확정된다.',
          '[단말 메모] 비밀번호의 숫자 뒤 두 자리는 {단말뒤}. 앞 두 자리는 자료실에 적어 두었다.',
        ],
        text: ['통제실 콘솔에 문 앞의 영상이 떠 있다. 누군가 서 있다.', '책상 위에 쪽지가 몇 장 남아 있다.'],
        searches: [
          { id: 'otherConsole', label: '다른 콘솔을 켜본다', text: ['다른 콘솔은 이미 꺼져 있다.'] },
          { id: 'drawerDoc', label: '책상 서랍을 더 뒤진다', text: ['서랍에서 통조림 하나를 찾았다.'], item: 'canned' },
          {
            id: 'consoleDeep',
            requires: 'otherConsole',
            label: '콘솔 뒤쪽 정비 통로로 더 들어가본다',
            text: ['꺼진 콘솔 뒤로 좁은 정비 통로가 이어진다. 몸을 숙여 들어간다.', '통로 끝에서 제복 입은 것이 돌아본다.'],
            enemy: 'usher',
          },
        ],
      },
      {
        at: 45,
        dir: 'D',
        kind: 'terminal',
        name: '관리 단말실',
        // 계정은 그 순간의 피험자 번호다. (죽으면 번호가 늘어나므로 계정도 바뀐다) 자리표시자는 character.js의 fillNote 참고
        login: { id: 'SUBJ-{번호}', passwordPrefix: 'GATE-', passwordIndex: 2 },
        text: ['좁은 방 한가운데 낡은 단말 하나가 켜져 있다.', '화면에 계정과 비밀번호를 묻는 창이 떠 있다.'],
        notes: [
          '접속 성공. 관리 단말 — 시험 구역 기록 열람.',
          '이 미궁은 시험장이다. 출구는 없다. 출구를 찾는 피험자를 관찰할 뿐이다.',
          'INFINITE DUNGEON TRAIN. 멈추지 않는 열차. 칸마다 던전이 이어 붙는다. 피험자는 한 칸을 넘어야만 다음 칸에 오른다.',
          '피험자 SUBJ-{번호}. 투입 횟수 {투입}. 이전 투입은 모두 문이 열리기 전에 끝났다.',
          '이번 투입에서 문이 열리면 피험자는 다음 칸으로 이송된다. 열린다면, 그것은 안쪽의 것이 말을 끝냈다는 뜻이다.',
        ],
      },
    ],
  },
  // 별관 네 곳: climb으로 올라오는 층이 아니다. 본선에서는 지하 4층(회랑)의 wing 방 하나로 동쪽 별관(보안실, 허브)에
  // 들어오고, 보안실 안의 wing 방 세 개(서/남/북)를 통해 원하는 순서로 각 별관을 드나든다 — 어느 별관에서 나오든
  // 항상 보안실로(그 wing 문을 열었던 자리로) 돌아간다. 별관 끝에 다다르면 다음 별관으로 이어지지 않고, 그냥
  // 바로 돌아간다(별관끼리 중첩 진입은 없다 — branchReturn이 슬롯 하나뿐이라 덮어써지기 때문).
  {
    name: '동쪽 별관',
    place: '보안실',
    theme: { symbol: 'o', label: '매끈한 바닥' },
    wing: true,
    length: 14,
    path: 'RRUURRUURRDDRR',
    intro: '문 너머는 지금까지와 다른 공기다. 낡은 타일 대신 매끈한 콘크리트 바닥이 이어진다.',
    sign: { at: 2, text: ['벽에 걸린 안내판이 낯설다.', '「동쪽 별관 · 보안실」'] },
    ambient: [
      '천장의 조명이 자료동 쪽보다 훨씬 밝다.',
      '벽에 붙은 도면에는 이 구역만 따로 표시되어 있다.',
      '어디선가 낮게 웅웅거리는 기계음이 들린다.',
      '바닥에 낯선 발자국이 이어지다 끊긴다.',
    ],
    enemies: ['scratcher', 'worker', 'hallWatcher'],
    loot: { bandage: 2, battery: 2 },
    finds: [],
    rooms: [
      {
        at: 3,
        dir: 'L',
        kind: 'implant',
        name: '이식 수술실',
        reward: 'neuralBooster',
        bonus: 'serum',
        guards: ['worker', 'hallWatcher'],
        text: [
          '먼지 쌓인 수술대 하나가 놓여 있다. 위에 낯선 기구들이 가지런히 정리되어 있다.',
          '벽에 붙은 도해에는 사람의 팔 부위가 확대되어 그려져 있다. 손에 쥘 만한 이식용 기구 하나가 눈에 들어온다.',
        ],
      },
      {
        at: 5,
        dir: 'D',
        kind: 'archive',
        name: '별관 관리 사무실',
        notes: [
          '이 시설에는 원래 네 개의 별관이 있었다고 한다 — 동, 서, 남, 북.',
          '[관리 메모] 보안실 안쪽 철문은 서쪽 별관으로 이어진다. 잠금 번호: {서별관}.',
          '[관리 메모] 보안실 안쪽 또 다른 철문은 남쪽 별관으로 이어진다. 잠금 번호: {남별관}.',
          '[관리 메모] 보안실 안쪽 마지막 철문은 북쪽 별관으로 이어진다. 잠금 번호: {북별관}.',
        ],
        text: ['먼지 쌓인 책상 위에 관리 서류 몇 장이 남아 있다.'],
        searches: [
          { id: 'shelf', label: '옆 선반을 살펴본다', text: ['선반 구석에서 배터리 하나를 찾았다.'], item: 'battery' },
          {
            id: 'shelfDeep',
            requires: 'shelf',
            label: '선반 안쪽 사무실 문으로 더 들어가본다',
            text: ['선반 뒤에 작은 쪽문이 있다. 밀어 열자 좁은 안쪽 사무실이 나온다.', '발소리가 이쪽으로 가까워진다.'],
            enemy: 'hallWatcher',
          },
        ],
      },
      {
        at: 9,
        dir: 'D',
        kind: 'supply',
        name: '창고',
        items: { serum: 1, battery: 1 },
        text: ['먼지 쌓인 선반 위에 물건 몇 개가 남아 있다.'],
      },
      {
        at: 12,
        dir: 'D',
        kind: 'wing',
        name: '서쪽 별관으로 이어지는 철문',
        passwordIndex: 3,
        enterFloor: 11,
        text: [
          '보안실 안쪽 깊숙이, 낯선 철문이 하나 있다. 이 별관 도면에는 없던 문이다.',
          '손잡이 옆에 작은 잠금장치가 붙어 있다. 네 자리 번호가 필요해 보인다.',
        ],
        openText: [
          '녹슨 잠금장치가 낮은 소리를 내며 풀린다.',
          '문 너머로 낯선 통로가 이어진다. 지금까지와는 다른 공기다.',
        ],
      },
      // 원래 서쪽 별관 끝에 있던 방이 보안실(허브)로 옮겨 붙었다. 세이브의 visited 인덱스가 배열 순서에 묶여 있어
      // 끝에만 추가한다 — 중간 삽입 금지.
      {
        at: 7,
        dir: 'L',
        kind: 'wing',
        name: '남쪽 별관으로 이어지는 철문',
        passwordIndex: 5,
        enterFloor: 12,
        text: [
          '보안실 안쪽 깊숙이, 낯선 철문이 하나 있다. 이 별관 도면에는 없던 문이다.',
          '손잡이 옆에 작은 잠금장치가 붙어 있다. 네 자리 번호가 필요해 보인다.',
        ],
        openText: [
          '녹슨 잠금장치가 낮은 소리를 내며 풀린다.',
          '문 너머로 낯선 통로가 이어진다. 지금까지와는 다른 공기다.',
        ],
      },
      // 원래 남쪽 별관 끝에 있던 방이 보안실(허브)로 옮겨 붙었다. (위와 같은 이유로 끝에만 추가)
      {
        at: 10,
        dir: 'U',
        kind: 'wing',
        name: '북쪽 별관으로 이어지는 철문',
        passwordIndex: 4,
        enterFloor: 13,
        text: [
          '보안실 안쪽 깊숙이, 낯선 철문이 하나 있다. 이 별관 도면에는 없던 문이다.',
          '손잡이 옆에 작은 잠금장치가 붙어 있다. 네 자리 번호가 필요해 보인다.',
        ],
        openText: [
          '녹슨 잠금장치가 낮은 소리를 내며 풀린다.',
          '문 너머로 낯선 통로가 이어진다. 지금까지와는 다른 공기다.',
        ],
      },
    ],
  },
  {
    name: '서쪽 별관',
    place: '자재 창고',
    theme: { symbol: '"', label: '쌓인 자재' },
    wing: true,
    length: 14,
    path: 'LLDDLLDDLLUULL',
    intro: '문 너머로 쇠 냄새가 훅 끼친다. 쌓인 자재 상자들 사이로 좁은 통로가 이어진다.',
    sign: { at: 2, text: ['상자 더미에 기대 세운 안내판을 발견했다.', '「서쪽 별관 · 자재 창고」'] },
    ambient: [
      '천장 크레인이 멈춘 채 녹슬어 있다.',
      '쌓인 자재 상자마다 방향을 알 수 없는 화살표가 그려져 있다.',
      '어디선가 컨베이어 벨트가 혼자 덜컹거린다.',
      '바닥에 기름 자국이 한쪽으로만 길게 이어져 있다.',
    ],
    enemies: ['scratcher', 'machine', 'craneThing'],
    loot: { bandage: 2, battery: 2 },
    finds: [],
    rooms: [
      {
        at: 3,
        dir: 'R',
        kind: 'implant',
        name: '개조 공방',
        reward: 'steelFrame',
        bonus: 'serum',
        guards: ['machine', 'craneThing'],
        text: [
          '작업대 위에 뜯어낸 부품과 함께 사람 뼈대 모양의 금속 틀이 놓여 있다.',
          '한쪽 벽에 "골격 개조 — 3차 시험"이라는 팻말이 붙어 있다. 틀에서 이식용 부속 하나를 떼어 낸다.',
        ],
      },
      {
        at: 5,
        dir: 'D',
        kind: 'archive',
        name: '자재 반출 기록실',
        notes: [
          '반출 기록마다 목적지가 "다음 칸"으로만 적혀 있다.',
          '[반출 기록] 이번 열차 편성에는 새 칸이 이어 붙을 예정이라고 한다. 이름은 아직 적혀 있지 않다.',
        ],
        text: ['녹슨 캐비닛 속에 반출 기록철이 가득하다.'],
        searches: [
          { id: 'crateGap', label: '상자 틈을 살펴본다', text: ['상자 틈에서 기계부품 하나를 찾았다.'], item: 'part' },
          {
            id: 'crateGapDeep',
            requires: 'crateGap',
            label: '상자 틈을 비집고 더 들어가본다',
            text: ['상자 더미 틈을 비집고 들어가자 크레인 아래 공간이 나온다.', '위에서 삐걱, 크레인이 움직이는 소리가 난다.'],
            enemy: 'craneThing',
          },
        ],
      },
      {
        at: 9,
        dir: 'D',
        kind: 'supply',
        name: '자재 보관함',
        items: { part: 2, battery: 1 },
        text: ['보관함 안에 손대지 않은 부품 상자가 남아 있다.'],
      },
    ],
  },
  {
    name: '남쪽 별관',
    place: '통신실',
    theme: { symbol: "'", label: '깜빡이는 장비' },
    wing: true,
    length: 14,
    path: 'DDRRDDRRDDLLDD',
    intro: '문 너머로 낮은 잡음이 들린다. 벽을 가득 채운 낡은 통신 장비가 아직 깜빡이고 있다.',
    sign: { at: 2, text: ['장비 선반에 붙은 안내판을 발견했다.', '「남쪽 별관 · 통신실」'] },
    ambient: [
      '스피커에서 끊긴 신호음이 일정한 간격으로 반복된다.',
      '수신 기록지가 바닥 가득 흩어져 있다. 대부분 백지다.',
      '벽의 지도에는 이 시설 말고도 여러 개의 점이 표시되어 있다.',
      '헤드셋 하나가 책상에 걸린 채 아직도 작게 울리고 있다.',
    ],
    enemies: ['worker', 'subject', 'staticThing'],
    loot: { bandage: 2, battery: 2 },
    finds: [],
    rooms: [
      {
        at: 3,
        dir: 'U',
        kind: 'implant',
        name: '적출실',
        reward: 'extraArm',
        bonus: 'serum',
        guards: ['subject', 'staticThing'],
        text: [
          '타일 바닥에 마른 얼룩이 넓게 번져 있다. 수술 기구가 트레이 위에 흩어져 있다.',
          '벽 선반에 알 수 없는 것이 유리병 속에 담긴 채 놓여 있다. 그 옆에 이식용 기구 하나가 따로 놓여 있다.',
        ],
      },
      {
        at: 5,
        dir: 'R',
        kind: 'archive',
        name: '통신 기록실',
        notes: [
          '수신 기록 대부분은 잡음뿐이다. 몇 장만 글자를 알아볼 수 있다.',
          '[수신 기록] "…다음 칸 준비 완료. 열차는 멈추지 않는다…" 이후는 잡음.',
        ],
        text: ['책상 위에 수신 기록지 몇 장이 가지런히 놓여 있다.'],
        searches: [
          { id: 'headset', label: '헤드셋을 귀에 대본다', text: ['잡음뿐이다. 서둘러 내려놓는다.'] },
          {
            id: 'headsetDeep',
            requires: 'headset',
            label: '잡음이 나던 안쪽 장비실로 더 들어가본다',
            text: ['잡음을 따라 안쪽 장비실 문을 연다. 스피커들이 일제히 켜져 있다.', '잡음이 갑자기 커진다.'],
            enemy: 'staticThing',
          },
        ],
      },
      {
        at: 9,
        dir: 'R',
        kind: 'supply',
        name: '장비 보관함',
        items: { battery: 2, canned: 1 },
        text: ['보관함 안에 예비 장비 몇 개가 남아 있다.'],
      },
    ],
  },
  {
    name: '북쪽 별관',
    place: '격납고',
    theme: { symbol: '/', label: '텅 빈 자리' },
    wing: true,
    length: 14,
    path: 'UURRUURRUULLUU',
    intro: '문 너머는 천장이 유독 높다. 커다란 무언가를 넣어 두었던 자리가 텅 비어 있다.',
    sign: { at: 2, text: ['격납고 벽에 붙은 안내판을 발견했다.', '「북쪽 별관 · 격납고」'] },
    ambient: [
      '바닥에 커다란 바퀴 자국이 길게 이어져 있다.',
      '천장 레일이 한쪽 벽 너머로 계속 이어진다.',
      '벽에 걸린 편성표에는 칸 번호만 있고 이름이 없다.',
      '멀리서 쇠가 부딪히는 소리가 규칙적으로 울린다.',
    ],
    enemies: ['machine', 'ceiling', 'railThing'],
    loot: { bandage: 2, battery: 2 },
    finds: [],
    rooms: [
      {
        at: 3,
        dir: 'U',
        kind: 'implant',
        name: '이식 보관고',
        reward: 'secondHeart',
        bonus: 'serum',
        guards: ['ceiling', 'railThing'],
        text: [
          '커다란 냉동 보관함이 줄지어 서 있다. 라벨에는 장기 이름과 번호만 적혀 있다.',
          '보관함 하나의 문이 살짝 열려 있다. 안이 비어 있다 — 아니, 하나가 이미 밖에 나와 있다.',
        ],
      },
      {
        at: 5,
        dir: 'R',
        kind: 'archive',
        name: '격납고 관리실',
        notes: [
          '편성표 구석에 작게 적힌 글자: "무한 편성. 종착역 없음."',
          '[격납고 일지] 이 칸이 실려 나간 뒤로 새 칸이 다시 들어온 적은 없다.',
        ],
        text: ['관리실 책상 위에 편성표 사본이 남아 있다.'],
        searches: [
          { id: 'schedule', label: '편성표를 더 살펴본다', text: ['편성표 아래쪽은 찢겨 나가고 없다.'] },
          {
            id: 'scheduleDeep',
            requires: 'schedule',
            label: '찢긴 자리를 따라 안쪽 격납고까지 더 들어가본다',
            text: ['찢긴 편성표가 가리키는 쪽으로 문이 하나 더 있다. 열어보니 격납고 안쪽이다.', '천장 레일이 머리 위에서 삐걱인다.'],
            enemy: 'railThing',
          },
        ],
      },
      {
        at: 9,
        dir: 'R',
        kind: 'supply',
        name: '격납고 창고',
        items: { part: 1, serum: 1 },
        text: ['창고 선반에 정비용 물품이 몇 개 남아 있다.'],
      },
    ],
  },
]
