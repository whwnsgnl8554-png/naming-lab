// 반려동물 작명 로직
//   1) 종류/품종/성격/외모 키워드를 컨셉 풀에 매핑
//   2) 컨셉 풀에서 가중 무작위 추출
//   3) 부르기 좋음 점수로 정렬
//   4) "병원 호명 친화" 필터 (욕설/민망한 단어 제외)
//   5) 비슷한 분위기 더보기 토글용 그룹화

import { PET_CONCEPT, PET_TAILS } from '../data/keywords.js';
import { 부르기점수, 발음점수 } from '../util/score.js';
import { 조사 } from '../util/hangul.js';

// 품종 → 톤 매핑 (실제 견묘 분위기 기반)
const 견종톤 = {
  '말티즈': ['cute', 'food_west', 'korean_old'],
  '푸들': ['cute', 'food_west', 'cool'],
  '포메라니안': ['cute', 'food_west', 'retro90'],
  '시바견': ['food_kor', 'nature', 'korean_old'],
  '진돗개': ['nature', 'korean_old', 'cool'],
  '비숑': ['cute', 'food_west', 'cool'],
  '치와와': ['cute', 'funny', 'food_west'],
  '닥스훈트': ['funny', 'food_west', 'retro90'],
  '리트리버': ['cool', 'nature', 'cute'],
  '도베르만': ['cool', 'hero'],
  '시츄': ['cute', 'food_kor', 'korean_old'],
  '웰시코기': ['cute', 'food_west', 'funny'],
  '믹스': ['korean_old', 'cute', 'nature'],
};
const 묘종톤 = {
  '코리안숏헤어': ['food_kor', 'korean_old', 'cute'],
  '러시안블루': ['cool', 'nature'],
  '페르시안': ['food_west', 'cool', 'cute'],
  '먼치킨': ['cute', 'food_west', 'funny'],
  '뱅갈': ['cool', 'hero', 'nature'],
  '메인쿤': ['cool', 'hero'],
  '스코티시폴드': ['cute', 'food_west'],
  '랙돌': ['cute', 'food_west'],
  '믹스': ['food_kor', 'korean_old', 'cute'],
};

// 외모 → 톤 가산
const 외모톤 = {
  '흰색': ['food_west', 'nature'],   // 라떼·솜이·구름·눈
  '검정': ['cool', 'hero'],           // 다크·블랙
  '갈색': ['food_kor', 'food_west'],  // 약과·캐러멜
  '회색': ['cool', 'nature'],
  '얼룩': ['funny', 'food_kor'],
  '삼색': ['cute', 'funny'],
  '치즈': ['food_west', 'food_kor'],
};

// 성격 → 톤
const 성격톤 = {
  '활발한': ['cool', 'hero', 'funny'],
  '얌전한': ['cute', 'nature', 'food_west'],
  '까칠한': ['cool', 'funny'],
  '애교많은': ['cute', 'food_west', 'korean_old'],
  '바보같은': ['funny', 'cute'],
  '도도한': ['cool', 'hero'],
  '겁많은': ['cute', 'food_west'],
  '장난꾸러기': ['funny', 'cute', 'food_kor'],
};

const 부적절단어 = new Set(['파산','텅장','이불','뒷광고','노답']); // 병원 호명 친화 필터에서 빼는 것

export function 반려동물작명(input) {
  const {
    종류 = '강아지',   // '강아지' | '고양이'
    성별 = 'u',
    품종 = '',
    털색 = '',
    성격 = [],
    스타일 = 'auto',   // 'auto' | 'kor' | 'eng' | 'food' | 'hero' | 'funny' | 'cute' | 'cool' | 'retro90' | 'nature'
    병원친화 = false,
    개수 = 8,
  } = input;

  // 톤 가중치 산정
  const 톤점수 = {};
  for (const k of Object.keys(PET_CONCEPT)) 톤점수[k] = 1;

  const 종톤맵 = 종류 === '고양이' ? 묘종톤 : 견종톤;
  for (const t of (종톤맵[품종] || [])) 톤점수[t] = (톤점수[t] || 0) + 3;
  for (const t of (외모톤[털색] || [])) 톤점수[t] = (톤점수[t] || 0) + 2;
  for (const ch of 성격) for (const t of (성격톤[ch] || [])) 톤점수[t] = (톤점수[t] || 0) + 2;

  if (스타일 !== 'auto') {
    if (스타일 === 'kor') 톤점수.korean_old += 8;
    else if (스타일 === 'eng') 톤점수.english = (톤점수.english || 0) + 8;
    else if (톤점수[스타일] != null) 톤점수[스타일] += 8;
  } else {
    // 자동 — 약간 모든 톤에 base
    for (const k of Object.keys(톤점수)) 톤점수[k] += 0.5;
  }

  // 톤별 후보 풀에서 가중 추출
  const 후보 = [];
  const seen = new Set();
  const 키목록 = Object.keys(톤점수);
  const 총가중 = 키목록.reduce((s, k) => s + Math.max(0, 톤점수[k]), 0);

  for (let tries = 0; tries < 200 && 후보.length < 개수; tries++) {
    let r = Math.random() * 총가중;
    let chosen = 키목록[0];
    for (const k of 키목록) {
      r -= Math.max(0, 톤점수[k]);
      if (r <= 0) { chosen = k; break; }
    }
    const 풀 = PET_CONCEPT[chosen]?.items;
    if (!풀 || !풀.length) continue;
    const 이름 = 풀[Math.floor(Math.random() * 풀.length)];
    if (병원친화 && 부적절단어.has(이름)) continue;
    if (seen.has(이름)) continue;
    seen.add(이름);

    // 끝 글자에 '이' 자동 추가 옵션 (콩 → 콩이)
    const 끝 = 이름[이름.length - 1];
    const 친근화 = (이름.length === 1 || PET_TAILS[끝]) ? 이름 + '이' : 이름;

    후보.push({
      이름: 이름,
      친근형: 친근화,
      컨셉: PET_CONCEPT[chosen].label,
      컨셉id: chosen,
      부르기점수: 부르기점수(친근화),
      발음점수: 발음점수(친근화),
      유래: 유래설명(이름, chosen, 품종, 털색, 성격),
    });
  }

  후보.sort((a, b) => (b.부르기점수 + b.발음점수) - (a.부르기점수 + a.발음점수));
  return {
    종류, 품종, 털색,
    후보들: 후보,
    컨셉가중: 톤점수,
  };
}

function 유래설명(이름, 컨셉, 품종, 털색, 성격) {
  const 컨셉별 = {
    food_kor: `한식 간식 시리즈. ${이름} — 부엌 냄새가 살짝 도는, 부르면 입꼬리 올라가는 이름.`,
    food_west: `디저트·카페 시리즈. ${이름} 한 잔 시킨 기분으로 부를 수 있는 이름.`,
    nature: `밤하늘·계절 시리즈. ${이름}, 창문 너머 보이는 풍경에서 따왔다.`,
    hero: `히어로·캐릭터 시리즈. ${이름} — 거실에서 망토 휘날리는 그림이 그려진다.`,
    retro90: `90년대 동네 반려친구 시리즈. ${이름} — 옛날 마당집 강아지 같은 정감.`,
    cute: `귀여움 시리즈. ${이름} — 뒤꿈치에 졸졸 붙어다닐 것 같은 이름.`,
    cool: `쿨한 시리즈. ${이름} — 어딘가 새벽에 혼자 산책하는 그림.`,
    korean_old: `한국식 옛이름. ${이름} — 마당에 풀어놨을 때 가장 어울리는 톤.`,
    funny: `웃긴 시리즈. ${이름} — 동물병원 대기실에서 호명되면 다들 웃을 이름.`,
    english: `영어식 표기. ${이름} — 인스타 태그 잘 어울리는 톤.`,
  };
  let base = 컨셉별[컨셉] || `${이름}.`;
  const 꼬리 = [];
  if (품종) 꼬리.push(`${품종}${조사(품종, '이라는')} 종`);
  if (털색) {
    const 면 = 조사(털색, '이라는') === '이라는' ? '이면' : '면';
    꼬리.push(`${털색}${면}`);
  }
  if (꼬리.length) base += ' ' + 꼬리.join(' + ') + ' 특히 잘 어울림.';
  return base;
}
