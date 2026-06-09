// 태명 작명 로직
//   1) 키워드 + 출산 예정 계절로 풀 가중치 산정
//   2) 가중 무작위 추출
//   3) 형제자매 옵션이면 운율 맞춤 풀도 섞기
//   4) 각 태명에 한 줄 의미·코멘트 부여

import { TAEMYUNG_POOL, KEYWORD_TO_POOL, SEASON_TO_POOL, 예정월에서계절 } from '../data/taemyung.js';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand() { return Math.random(); }

// 9개월 내내 부르기 좋은지 — 발음 점수 간이 산정
function 부르기쉬움(name) {
  const len = [...name].length;
  if (len === 1) return 70;
  if (len === 2) return 95;
  if (len === 3) return 85;
  return 60;
}

// 한 줄 의미·코멘트 — 컨셉별 + 일반 풀에서 추출
const 코멘트풀 = {
  food: [
    '엄마 배 안에 콩 한 알 들어앉은 듯한 친근함.',
    '작고 단단하게 자라라는 마음이 담긴 톤.',
    '단어 자체가 달짝지근해서 부르면 입꼬리 올라가는 이름.',
    '엄마 아빠 첫 끼 같이 먹는 기분으로 부를 수 있는 톤.',
  ],
  nature: [
    '창문 밖 풍경에서 따와, 매일 자연스럽게 부르게 되는 이름.',
    '환하고 너른 이미지 — 부르면 아기 기분도 환해질 톤.',
    '계절이 바뀌어도 어색하지 않은 무난한 이름.',
    '하늘에 한 자리 떠 있는 느낌으로 다정한 톤.',
  ],
  cute: [
    '발길질 한 번에 답해줄 것 같은 친근한 톤.',
    '의태어가 그대로 이름이 된 — 부르면 표정이 풀리는 이름.',
    '아기가 꼬물거리는 모습을 그대로 옮겨 놓은 듯.',
    '태교 동화 속 주인공 이름 같은 부드러움.',
  ],
  hope: [
    '부르는 순간 부모의 바람이 그대로 묻어나는 이름.',
    '9개월 내내 같은 마음으로 부를 수 있는 단단한 톤.',
    '말 자체에 응원이 담겨 있어, 부르는 사람도 다정해지는 이름.',
    '병원 가는 길에 작은 목소리로 한 번 더 불러보고 싶은 톤.',
  ],
  jewel: [
    '귀하고 반짝이는 — 부모에게 이 시기가 얼마나 소중한지 담은 톤.',
    '초음파 사진 옆에 적어두면 어울리는 단정한 이름.',
    '말 자체에 작은 빛이 있는 톤.',
    '특별한 만남을 짧은 한 음절에 담은 느낌.',
  ],
  meeting: [
    '깜짝 소식을 그대로 이름으로 옮긴 톤.',
    '첫 초음파 영상 본 그 순간을 기억하게 하는 이름.',
    '예기치 못한 기쁨이 그대로 단어가 된 톤.',
    '부르면 처음 알게 된 그날 기분이 다시 살아나는 이름.',
  ],
  sibling: [
    '윗아이 이름과 운율이 맞아 가족 안에서 자연스러운 톤.',
    '두 아이를 한 묶음으로 부르게 되는 — 형제자매 사이 다정한 이름.',
    '큰 아이와 함께 부를 때 운율이 좋은 톤.',
  ],
  general: [
    '엄마 아빠가 부르면 배 안에서 발길질로 답할 것 같은 이름.',
    '초음파 사진 옆에 손글씨로 적어두면 어울리는 톤.',
    '9개월 동안 가장 자주 부를 한 단어.',
    '출산 후 태어난 아기에게도 한참 그대로 불러도 좋은 톤.',
    '병원 가는 차 안에서 작은 목소리로 부르게 되는 이름.',
    '부모가 부르면 아기도 같이 익숙해질 정도로 부드러운 톤.',
  ],
};

// 메인 진입점
export function 태명작명(input) {
  const {
    예정월 = null,
    키워드 = [],
    형제자매 = false,
    윗아이 = '',      // 형제자매 시 윗아이 태명 또는 본명
    개수 = 6,
  } = input;

  // 풀 가중치
  const w = { food: 2, nature: 2, cute: 2, hope: 1.5, jewel: 1, meeting: 1, sibling: 0 };

  // 키워드 가산
  for (const k of 키워드) {
    for (const p of (KEYWORD_TO_POOL[k] || [])) w[p] = (w[p] || 0) + 1.5;
  }

  // 계절 가산
  const 계절 = 예정월에서계절(예정월);
  if (계절 && SEASON_TO_POOL[계절]) {
    w[SEASON_TO_POOL[계절].pool] = (w[SEASON_TO_POOL[계절].pool] || 0) + 1.5;
  }

  // 형제자매
  if (형제자매) w.sibling += 3;

  // 풀별 가중 샘플링
  const 후보 = [];
  const seen = new Set();
  const keys = Object.keys(w);
  const 총 = keys.reduce((s, k) => s + Math.max(0, w[k]), 0);

  // 계절 보너스 풀(extra) 한두 개 먼저 섞기
  if (계절) {
    for (const n of SEASON_TO_POOL[계절].extra.slice(0, 2)) {
      if (!seen.has(n)) {
        seen.add(n);
        후보.push(만들기(n, SEASON_TO_POOL[계절].pool, 계절));
      }
    }
  }

  // 윗아이 운율 맞춤 — 끝 글자 비슷한 풀에서 한 개
  if (형제자매 && 윗아이) {
    const 끝 = 윗아이[윗아이.length - 1];
    const 운율후보 = TAEMYUNG_POOL.sibling.items.concat(TAEMYUNG_POOL.cute.items)
      .filter(n => n[n.length - 1] === 끝 || n.endsWith(끝 + '이'));
    if (운율후보.length && !seen.has(운율후보[0])) {
      seen.add(운율후보[0]);
      후보.push(만들기(운율후보[0], 'sibling', null));
    }
  }

  for (let tries = 0; tries < 200 && 후보.length < 개수; tries++) {
    let r = rand() * 총;
    let 선택 = keys[0];
    for (const k of keys) {
      r -= Math.max(0, w[k]);
      if (r <= 0) { 선택 = k; break; }
    }
    const 풀 = TAEMYUNG_POOL[선택];
    if (!풀 || !풀.items.length) continue;
    const 이름 = pick(풀.items);
    if (seen.has(이름)) continue;
    seen.add(이름);
    후보.push(만들기(이름, 선택, null));
  }

  // 부르기 쉬움 점수로 정렬
  후보.sort((a, b) => b.부르기점수 - a.부르기점수);

  return {
    예정월,
    계절,
    형제자매,
    후보들: 후보,
  };
}

function 만들기(이름, 컨셉, 계절) {
  const 풀 = TAEMYUNG_POOL[컨셉];
  const 컨셉라벨 = 풀 ? 풀.label : '계절';
  const 코멘트목록 = 코멘트풀[컨셉] || 코멘트풀.general;
  let 코멘트 = pick(코멘트목록);
  if (계절) 코멘트 = `${계절}에 태어날 아기에게 — ` + 코멘트;
  return {
    이름,
    컨셉,
    컨셉라벨,
    부르기점수: 부르기쉬움(이름),
    코멘트,
  };
}
