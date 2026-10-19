// 게임 전역 설정. 밸런스를 바꾸고 싶으면 이 파일의 숫자만 고치면 됩니다.
export const config = {
  title: '미궁',
  version: '0.3.0',
  saveKey: 'labyrinth-save-v2', // 층이 늘어나 이전 저장과 호환되지 않는다.
  autoSave: true, // 탐색 중 행동할 때마다 자동 저장
  maxLogLines: 200,

  // 처음 깨어났을 때의 상태. 최대 체력·빛은 낮게 잡고, 대신 실험실의 혈청과 기계부품 개조로 늘려 가게 한다.
  player: {
    maxHp: 35,
    attack: 6,
    defense: 2,
    light: 25, // 손전등 배터리 잔량
    baseMaxLight: 40, // 손전등 개조 전 기본 최대치. 실제 최대치는 character.js의 maxLightOf 참고
    items: { bandage: 2, battery: 1 },
  },

  // 한 걸음 나아갈 때 일어나는 사건의 가중치 (적과 마주치는 사건은 아래 encounterPity가 따로 정한다).
  // 빛이 꺼지면 위험한 사건이 늘어난다.
  events: {
    lit: { nothing: 50, loot: 18, trap: 5, lost: 5 },
    dark: { nothing: 20, loot: 15, trap: 15, lost: 15 },
  },
  // 적과 마주칠 확률은 걸음마다 독립적으로 뽑지 않고, 마지막으로 마주친 뒤 걸은 걸음 수(dangerStreak)에 따라
  // 조금씩 올라간다(오래 안전하게 걸을수록 다음 걸음의 위험도 커진다). 마주치면 0으로 되돌아간다.
  // 이렇게 하면 짧은 층이든(걸음이 적음) 긴 층이든(걸음이 많음) 걸음당 위험도는 같아서, 적과 마주치는 평균 횟수가
  // 층의 크기(걸음 수)에 자연스럽게 비례하면서도, 순전한 매 걸음 독립 확률보다 뭉치거나 너무 뜸해지는 편차가 줄어든다.
  encounterPity: {
    lit: { base: 0.03, step: 0.09 },
    dark: { base: 0.08, step: 0.22 },
    max: 0.9,
  },
  lightPerStep: 1, // 한 걸음마다 줄어드는 빛
  trapDamage: [3, 7], // 함정 피해 (최소, 최대). 함정으로는 쓰러지지 않는다.
  corpseLootChance: 0.25, // 쓰러뜨린 뒤 주변을 뒤져 뭔가 찾을 확률
  leatherDropChance: 0.3, // 쓰러뜨린 뒤 가죽을 벗겨 낼 확률 (장비와 별개로 굴린다)
  partDropChance: 0.4, // '기계' 계열 적을 쓰러뜨렸을 때 기계부품을 뜯어낼 확률 (위 둘과 별개로 굴린다)

  // 소지품 용량: 소모품·재료(heal/light/material/vitality)만 세고, 장비(weapon/armor)는 세지 않는다.
  // 가득 차면 더 얻지 못한다. 가죽을 모아 가방을 키우면 용량이 늘어난다.
  inventory: {
    baseCapacity: 10,
    capacityPerUpgrade: 10,
    upgradeLeatherCost: 5,
  },

  // 손전등 개조: 기계부품을 모아 개조하면 최대 빛(baseMaxLight 기준)이 늘어난다. character.js의 maxLightOf 참고.
  flashlight: {
    capacityPerUpgrade: 15,
    upgradePartCost: 3,
  },

  // 전투
  damageVariance: 2, // 피해 편차 (-2 ~ +2)
  fleeChance: 0.5, // 도망 성공 확률

  // 피험자 번호와 투입 횟수: 처음에는 아래 값이고, 쓰러질 때마다 1씩 늘어난다. (쪽지와 단말 계정에 쓰인다)
  subjectStart: 417,
  insertionStart: 5,

  // 곁길의 방
  roomLight: 1, // 방에 다녀오는 데 드는 빛
  clinicMaxHp: 10, // 의무실에서 늘어나는 최대 체력 (방에 maxHp가 없을 때)

  // 통로를 막는 잠긴 문. 비밀번호를 틀리면 페널티로 체력이 깎인다. (최소, 최대)
  gateWrongDamage: [2, 4],

  // 이식(aug): 별관 개조실에서 얻는 보조도구. 무기·방어구와 달리 여러 개를 동시에 장착할 수 있다.
  // 장착한 이식들의 변질도(corruption) 합이 이 값 이상이면, 탈출을 골라도 결말이 달라진다.
  corruptionThreshold: 40,

  // 휴식: 층마다 횟수가 제한되어 있고, 쉬는 동안 습격당할 수 있다.
  restsPerFloor: 2,
  restHeal: 12,
  restAmbushChance: 0.25,
}
