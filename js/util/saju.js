// 사주(四柱) 간이 계산
// 정밀 사주는 만세력 + 절기 보정이 필요하지만, 작명용으로는
// 양력 → 60갑자 일주/연주/월주 계산만으로도 오행 비중을 충분히 추정 가능.

import { 천간, 지지, OHAENG } from '../data/ohaeng.js';

// 1900-01-01 = 庚子年 丙子月(=11월) 戊辰日 (Julian 기준 알려진 일진)
// 그날 기준으로 일주 계산.
// 정확한 한국 천문 기준: 1900년 1월 1일 일주 = 甲戌(34)... 자료마다 다르다.
// 보편적으로 쓰이는 "기원일자 + 일진 매핑" 방식.
// 검증된 기준: 2000-01-01 (토요일) 일주 = 戊午 (54번)
const BASE_DATE = new Date(Date.UTC(2000, 0, 1));
const BASE_DAY_INDEX = 54; // 戊午 = 천간 戊(4) × 12 + 지지 午(6) — 60갑자 순서 기준 54번째

function dayDiff(date) {
  const ms = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - BASE_DATE.getTime();
  return Math.round(ms / 86400000);
}

// 일주(日柱) — 그날의 천간·지지
export function 일주(date) {
  const diff = dayDiff(date);
  let idx = (BASE_DAY_INDEX + diff) % 60;
  if (idx < 0) idx += 60;
  // 60갑자 → 천간(idx%10), 지지(idx%12)
  const 천 = 천간[idx % 10];
  const 지 = 지지[idx % 12];
  return { 천, 지, idx };
}

// 연주(年柱) — 입춘(2월 4일 무렵) 기준이 정통이지만 양력 단순화
//   양력 기준 천간 = (year - 4) % 10, 지지 = (year - 4) % 12
export function 연주(year) {
  const i = ((year - 4) % 60 + 60) % 60;
  return { 천: 천간[i % 10], 지: 지지[i % 12], idx: i };
}

// 월주(月柱) — 정통은 24절기 기준이지만 양력 월 + 연주 천간으로 간이 계산
//   "오월기간법" 단순화: 월지지 = (월 + 1) % 12 (인월=1월 기준 보정)
//   월천간 = 연천간으로부터 계산
export function 월주(year, month) {
  const yi = ((year - 4) % 60 + 60) % 60;
  const yc = yi % 10; // 연천간 인덱스
  // 월지: 양력월을 인월(寅, idx 2)부터 시작하도록 보정
  const 월지i = (month + 1) % 12;
  // 월천간 시작: 갑·기년→丙寅, 을·경년→戊寅, 병·신년→庚寅, 정·임년→壬寅, 무·계년→甲寅
  const 시작천간 = [2, 4, 6, 8, 0][yc % 5];
  const 월천i = (시작천간 + (month - 1)) % 10;
  return { 천: 천간[월천i], 지: 지지[월지i] };
}

// 시주(時柱) — 시간 입력 시. 자시(23~01)부터 인덱스 0.
//   시지지: 시간 → 지지
//   시천간: 일천간 + 시지지 인덱스로 계산
export function 시주(hour, 일천간Index) {
  if (hour == null || hour < 0 || hour > 23) return null;
  const 시지i = (Math.floor((hour + 1) / 2) + 12) % 12;
  // 시천간 시작 규칙: 갑·기일→甲子, 을·경일→丙子, 병·신일→戊子, 정·임일→庚子, 무·계일→壬子
  const 시작 = [0, 2, 4, 6, 8][일천간Index % 5];
  const 시천i = (시작 + 시지i) % 10;
  return { 천: 천간[시천i], 지: 지지[시지i] };
}

// 전체 사주 → 오행 비중
export function 사주오행분석({ year, month, day, hour }) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const Y = 연주(year);
  const M = 월주(year, month);
  const D = 일주(date);
  const H = hour != null ? 시주(hour, 천간.indexOf(D.천)) : null;

  const count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of [Y, M, D, H].filter(Boolean)) {
    count[p.천.오]++;
    count[p.지.오]++;
  }
  // 가장 적은 오행 = 보충해야 할 오행
  const sorted = OHAENG.slice().sort((a, b) => count[a] - count[b]);
  return {
    연주: Y, 월주: M, 일주: D, 시주: H,
    count,
    부족: sorted.slice(0, 2),    // 가장 부족한 2개
    충만: sorted.slice(-2),      // 가장 충만한 2개
  };
}

// 띠 계산 (1900년 이후 양력 기준)
export function 띠(year) {
  const i = ((year - 4) % 12 + 12) % 12;
  return 지지[i];
}
