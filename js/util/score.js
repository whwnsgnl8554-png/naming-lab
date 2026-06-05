// 이름 점수화 — 발음, 시대성, 희소성, 부르기 좋음

import { 음절자모, 자음충돌, 모음종결, 음절수 } from './hangul.js';

// 발음 점수 (0~100)
//   - 자음 충돌 없을수록 ↑
//   - 모음 종결 시 +
//   - 같은 음 반복 시 살짝 감점
export function 발음점수(name) {
  let s = 100;
  s -= 자음충돌(name) * 12;
  if (!모음종결(name)) s -= 5;
  // 같은 글자 연속(예: 민민)
  for (let i = 1; i < name.length; i++) {
    if (name[i] === name[i - 1]) s -= 15;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

// 시대성 점수 — 흔한 옛 이름 패턴(-자, -식, -남) 감점
//   현대 신생아 이름 패턴 가산
const OLDFASHIONED_TAIL = ['자', '순', '식', '남', '복', '돌', '례', '덕'];
const MODERN_TAIL = ['아', '윤', '서', '준', '우', '하', '은', '지'];

export function 시대성점수(name) {
  let s = 60;
  const last = name[name.length - 1];
  if (OLDFASHIONED_TAIL.includes(last)) s -= 30;
  if (MODERN_TAIL.includes(last)) s += 25;
  if (음절수(name) === 1) s -= 10;       // 외자는 시대 상관없이 호불호
  return Math.max(0, Math.min(100, s));
}

// 희소성 점수 — 매우 흔한 이름은 낮게
//   상위 인기 이름 풀과 비교
import { POPULAR_PERSON_NAMES } from '../data/syllables.js';
const VERY_COMMON = new Set([
  ...POPULAR_PERSON_NAMES.m_2024,
  ...POPULAR_PERSON_NAMES.f_2024,
  ...POPULAR_PERSON_NAMES.m_classic,
  ...POPULAR_PERSON_NAMES.f_classic,
]);

export function 희소성점수(name) {
  if (VERY_COMMON.has(name)) return 25;
  // 마지막 한 글자로 트렌드 추정
  const tail = name[name.length - 1];
  const trendyTail = ['윤','준','우','아','서','지','하','은'];
  if (trendyTail.includes(tail)) return 55;
  return 80;
}

// 부르기 좋은 점수 (반려동물용)
//   - 2~3음절 가산
//   - 모음 종결 가산
//   - 받침 적을수록 가산
export function 부르기점수(name) {
  let s = 60;
  const n = 음절수(name);
  if (n === 2) s += 25;
  if (n === 3) s += 10;
  if (n >= 4) s -= 10;
  if (모음종결(name)) s += 15;
  const j = 음절자모(name);
  const 받침수 = j.filter(x => x.종).length;
  s -= 받침수 * 8;
  return Math.max(0, Math.min(100, s));
}

// 외국인 발음 친화도 (회사명용)
//   - ㄲ ㄸ ㅃ ㅆ ㅉ 같은 된소리 감점
//   - 받침 적을수록 가산
//   - 음절 3 이하 가산
export function 외국인친화(name) {
  let s = 60;
  const j = 음절자모(name);
  const 된소리 = ['ㄲ','ㄸ','ㅃ','ㅆ','ㅉ'];
  for (const x of j) {
    if (된소리.includes(x.초)) s -= 12;
    if (x.종 === 'ㄹ' || x.종 === 'ㅂ' || x.종 === 'ㄷ') s -= 4;
  }
  if (음절수(name) <= 3) s += 15;
  if (음절수(name) >= 5) s -= 15;
  return Math.max(0, Math.min(100, s));
}

// 종합 점수 — 인물용
export function 인물종합점수(name) {
  const pron = 발음점수(name);
  const era = 시대성점수(name);
  const rare = 희소성점수(name);
  return Math.round(pron * 0.5 + era * 0.25 + rare * 0.25);
}
