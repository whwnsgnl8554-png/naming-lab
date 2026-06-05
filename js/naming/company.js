// 회사·가게·팀 작명 로직
//   1) 상황(회사/가게/팀)에 따라 톤 풀 선택
//   2) 어근+어미 합성
//   3) 슬로건 자동 생성
//   4) 도메인 가용성 힌트
//   5) 팀명은 위트 등급에 따라 별도 풀

import { COMPANY_TONES, TEAM_FUN } from '../data/keywords.js';
import { 외국인친화, 발음점수 } from '../util/score.js';
import { 조사 } from '../util/hangul.js';

// 업종 → 톤 매핑 (실제 한국 업종 분위기 기반)
const 업종톤 = {
  '카페': ['warm', 'food', 'trendy'],
  '식당': ['food', 'warm', 'trust'],
  '디저트': ['food', 'trendy', 'warm'],
  '베이커리': ['food', 'warm'],
  'IT': ['tech', 'trendy', 'bold'],
  '스타트업': ['trendy', 'tech', 'bold'],
  '의류': ['trendy', 'bold'],
  '뷰티': ['trendy', 'warm'],
  '교육': ['trust', 'warm'],
  '컨설팅': ['trust', 'tech'],
  '병원': ['trust', 'warm'],
  '법무': ['trust'],
  '제조': ['trust', 'bold'],
  '연구소': ['trust', 'tech'],
  '문화': ['trendy', 'warm'],
  '미디어': ['trendy', 'tech'],
};

// 이미지 → 톤 가산
const 이미지톤 = {
  '신뢰감': ['trust'],
  '트렌디': ['trendy'],
  '따뜻함': ['warm'],
  '강렬함': ['bold'],
  '유머': ['trendy', 'warm'],
  '기술감': ['tech'],
  '전통적': ['trust', 'warm'],
};

// 슬로건 템플릿 — {을를} 같은 토큰은 핵심 단어에 맞춰 자동 변환
const 슬로건템플릿 = [
  '{이름} — {핵심}, 한 번에.',
  '{이름}, 매일의 {핵심}.',
  '{핵심}{을를} 가장 다정하게, {이름}.',
  '{이름}{은는} {핵심}의 다른 이름입니다.',
  '{이름}, {핵심}에 진심인 사람들.',
  '오늘 {핵심}, 내일도 {이름}.',
  '{핵심}{을를} 가볍게, {이름}답게.',
  '{이름} — 그 자체로 {핵심}.',
];
const 핵심키워드 = ['좋은 하루','한 끗','정성','속도','품질','기분','맛','순간','일상','발걸음','다음','이야기'];

export function 회사작명(input) {
  const {
    상황 = '회사',     // '회사' | '가게' | '팀'
    업종 = '',
    이미지 = [],
    핵심키워드: 사용자키워드 = [],
    스타일 = 'auto',   // 'auto' | 'kor' | 'eng' | 'mix' | 'abbr'
    분위기 = 'mid',    // 팀 — 'serious' | 'mid' | 'fun'
    개수 = 8,
  } = input;

  if (상황 === '팀') {
    return 팀작명({ 분위기, 이미지, 사용자키워드, 개수 });
  }

  // 톤 가중치
  const 톤점수 = { trust: 1, trendy: 1, warm: 1, bold: 1, food: 1, tech: 1 };
  for (const t of (업종톤[업종] || [])) 톤점수[t] += 3;
  for (const im of 이미지) for (const t of (이미지톤[im] || [])) 톤점수[t] += 2;
  if (상황 === '가게') { 톤점수.warm += 1; 톤점수.food += 0.5; }
  if (상황 === '회사') { 톤점수.trust += 1; }

  // 스타일 강제
  if (스타일 === 'kor') { 톤점수.warm += 4; 톤점수.trust += 4; }
  if (스타일 === 'eng') { 톤점수.trendy += 6; 톤점수.tech += 4; }

  const 후보 = [];
  const seen = new Set();
  for (let tries = 0; tries < 500 && 후보.length < 개수; tries++) {
    const t = 가중선택(톤점수);
    const 풀 = COMPANY_TONES[t];
    if (!풀) continue;
    let 어근 = 풀.어근[Math.floor(Math.random() * 풀.어근.length)];
    let 어미 = 풀.어미[Math.floor(Math.random() * 풀.어미.length)];

    // 사용자 핵심 키워드가 있으면 1/3 확률로 어근 대체
    if (사용자키워드.length && Math.random() < 0.4) {
      어근 = 사용자키워드[Math.floor(Math.random() * 사용자키워드.length)];
    }

    let 이름 = 조합(어근, 어미, 스타일);
    if (이름.length > 14) continue;
    if (seen.has(이름)) continue;
    seen.add(이름);

    const 슬로건 = 슬로건만들기(이름);
    후보.push({
      이름,
      어근, 어미,
      톤: t,
      톤라벨: 풀.label,
      발음점수: 발음점수(이름.replace(/[A-Za-z]/g, '')),
      외국인친화: 외국인친화(이름.replace(/[A-Za-z]/g, '')),
      슬로건,
      도메인후보: 도메인후보(이름),
      로고모티프: 로고모티프(t),
    });
  }

  후보.sort((a, b) => (b.발음점수 + b.외국인친화) - (a.발음점수 + a.외국인친화));
  return { 상황, 업종, 후보들: 후보 };
}

function 가중선택(톤점수) {
  const 키목록 = Object.keys(톤점수);
  const 총 = 키목록.reduce((s, k) => s + Math.max(0, 톤점수[k]), 0);
  let r = Math.random() * 총;
  for (const k of 키목록) {
    r -= Math.max(0, 톤점수[k]);
    if (r <= 0) return k;
  }
  return 키목록[0];
}

function 조합(어근, 어미, 스타일) {
  // 영문이면 띄어쓰기, 한글이면 붙여쓰기
  const isEn = /[A-Za-z]/.test(어근) || /[A-Za-z]/.test(어미);
  if (스타일 === 'abbr' && !isEn) {
    // 약자형 — 첫 글자 따기
    return 어근[0] + 어미[0] + ' ' + 어근 + 어미;
  }
  return isEn ? `${어근} ${어미}` : `${어근}${어미}`;
}

function 슬로건만들기(이름) {
  const t = 슬로건템플릿[Math.floor(Math.random() * 슬로건템플릿.length)];
  const 핵 = 핵심키워드[Math.floor(Math.random() * 핵심키워드.length)];
  return t
    .replaceAll('{이름}', 이름)
    .replaceAll('{핵심}', 핵)
    .replaceAll('{을를}', 조사(핵, '을를'))
    .replaceAll('{은는}', 조사(이름, '은는'));
}

function 도메인후보(이름) {
  const cleaned = 이름.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleaned) {
    // 한글이라 도메인 불가 — 영문 음차 안내
    return [
      { 도메인: '한글 도메인 → 영문 음차 권장', 가용성: '미정' },
    ];
  }
  return [
    { 도메인: `${cleaned}.com`, 가용성: '직접 확인 필요' },
    { 도메인: `${cleaned}.co.kr`, 가용성: '직접 확인 필요' },
    { 도메인: `${cleaned}.io`, 가용성: '직접 확인 필요' },
    { 도메인: `${cleaned}.kr`, 가용성: '직접 확인 필요' },
  ];
}

const 로고모티프맵 = {
  trust: ['직선의 미니멀 워드마크', '둥근 사각형 모노그램', '굵은 세리프 한 글자'],
  trendy: ['그러데이션 한 줄', '동그라미와 점 하나', '얇은 산세리프'],
  warm: ['손글씨 한 줄', '둥근 새 한 마리', '낙엽 한 잎'],
  bold: ['굵은 사선', '강한 X자 마크', '꽉찬 사각 안 글자'],
  food: ['주방 도구 실루엣', '냄비 위 김 한 줄기', '둥근 접시'],
  tech: ['픽셀 그리드', '하이브리드 모노그램', '회로 모티프'],
};
function 로고모티프(t) {
  const arr = 로고모티프맵[t] || ['워드마크'];
  return arr[Math.floor(Math.random() * arr.length)];
}

function 팀작명({ 분위기, 이미지, 사용자키워드, 개수 }) {
  const 후보 = [];
  const seen = new Set();

  // 진지 모드는 회사 톤(trust) 풀에서 가벼운 합성
  if (분위기 === 'serious') {
    const 풀 = COMPANY_TONES.trust;
    for (let i = 0; i < 개수 * 2 && 후보.length < 개수; i++) {
      const 어근 = 사용자키워드.length && Math.random() < 0.5
        ? 사용자키워드[Math.floor(Math.random() * 사용자키워드.length)]
        : 풀.어근[Math.floor(Math.random() * 풀.어근.length)];
      const 어미 = ['팀','연구','모임','회의실','조'][Math.floor(Math.random() * 5)];
      const 이름 = 어근 + 어미;
      if (seen.has(이름)) continue;
      seen.add(이름);
      후보.push({ 이름, 위트: '진지', 코멘트: '발표 자료에 적어도 무난한 톤.' });
    }
  } else if (분위기 === 'fun') {
    // 위트 폭발
    const 셔플 = [...TEAM_FUN].sort(() => Math.random() - 0.5);
    for (const t of 셔플.slice(0, 개수)) {
      후보.push({ 이름: t, 위트: '대놓고 웃김', 코멘트: '발표 직전에 정신 차리려는 자가 진단 같은 이름.' });
    }
  } else {
    // 중간 — 위트풀 + 합성 풀 혼합
    const 셔플 = [...TEAM_FUN].sort(() => Math.random() - 0.5);
    const half = Math.ceil(개수 / 2);
    for (const t of 셔플.slice(0, half)) {
      후보.push({ 이름: t, 위트: '장난스러움', 코멘트: '웃기되 회의에서 부끄럽지 않을 수위.' });
    }
    const 풀 = COMPANY_TONES.trendy;
    for (let i = 0; i < half * 2 && 후보.length < 개수; i++) {
      const 어근 = 풀.어근[Math.floor(Math.random() * 풀.어근.length)];
      const 어미 = ['팀','크루','클럽','조','파티'][Math.floor(Math.random() * 5)];
      const 이름 = 어근 + 어미;
      if (seen.has(이름)) continue;
      seen.add(이름);
      후보.push({ 이름, 위트: '장난스러움', 코멘트: '캐주얼하지만 안 유치한 톤.' });
    }
  }
  return { 상황: '팀', 후보들: 후보 };
}
