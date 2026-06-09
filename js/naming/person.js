// 인물(신생아·개명) 작명 로직
//   1) 사주 분석 → 부족 오행 추출
//   2) 부족 오행 보충하는 한자 후보 풀 구성
//   3) 키워드(밝은/지혜로운…) 필터 적용
//   4) 항렬자 옵션 처리
//   5) 발음·시대성 점수로 정렬
//   6) 한자 미사용 모드면 순한글/한국 인기 음절 풀에서 추출

import { HANJA, HANJA_BY_OHAENG } from '../data/hanja.js';
import { 사주오행분석, 띠 } from '../util/saju.js';
import { 운세분석 } from '../util/unse.js';
import { 음오행, 수리길흉 } from '../data/ohaeng.js';
import { 자모분리 } from '../util/hangul.js';
import { 인물종합점수, 발음점수, 시대성점수, 희소성점수 } from '../util/score.js';
import { PERSON_KEYWORDS } from '../data/keywords.js';
import { 보강가중 } from '../data/unse-hanja.js';
import { 뜻에서한자훈 } from '../data/foreign.js';
import { SYLLABLES, POPULAR_PERSON_NAMES } from '../data/syllables.js';

// 성씨(한 글자) 모집단
const 한글성씨 = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍','유','고','문','양','손','배','조','백','허','남','심','노','하','곽','성','차','주','우','구','신','임'];

function 성_자모(성) {
  return 자모분리(성[0]);
}

// 한자 후보 점수
function 한자가중치(h, ctx) {
  let w = 0;
  // 부족 오행이면 +10
  if (ctx.부족오행.includes(h.오)) w += 10;
  // 충만 오행이면 -3 (이미 많은 걸 또 보태진 않음)
  if (ctx.충만오행.includes(h.오)) w -= 3;
  // 성별 일치 +5
  if (ctx.성별 && (h.성 === ctx.성별 || h.성 === 'u')) w += 5;
  // 키워드 매칭 +8
  if (ctx.키워드들 && ctx.키워드들.length) {
    for (const k of ctx.키워드들) {
      const def = PERSON_KEYWORDS.find(p => p.id === k);
      if (def && def.훈매칭.some(t => h.훈.includes(t))) {
        w += 8;
        break;
      }
    }
  }
  // 운세 보강 — 사용자가 보강하고 싶은 운세에 해당하는 한자 +12씩
  w += 보강가중(ctx.보강운세, h);

  // 외국인 모드 — 본명 음·뜻 가산
  if (ctx.외국인모드) {
    // 음역: 본명 한국 음의 글자(들)와 한자 음 일치 시 가산
    if (ctx.음역음 && ctx.음역음.includes(h.음)) {
      w += ctx.변환방식 === 'phonetic' ? 22 : 14;
    }
    // 의역: 본명 뜻 키워드가 한자 훈에 포함되면 가산
    if (ctx.의미훈 && ctx.의미훈.some(t => h.훈.includes(t))) {
      w += ctx.변환방식 === 'meaning' ? 22 : 14;
    }
  }
  return w;
}

// 셔플 (Fisher–Yates 변형, 가중치 반영)
function 가중샘플(items, weights, k) {
  const pool = items.map((it, i) => ({ it, w: Math.max(0.1, weights[i]) }));
  const out = [];
  for (let i = 0; i < k && pool.length; i++) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].w;
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    out.push(pool[idx].it);
    pool.splice(idx, 1);
  }
  return out;
}

// 두 한자로 이름 만들기
function 한자조합(첫후보, 둘후보, 항렬자, 항렬위치) {
  // 항렬자(돌림자) 있으면 한 자리 고정
  if (항렬자) {
    if (항렬위치 === '첫') return [{ 첫: 항렬자, 둘: 둘후보[0] }, { 첫: 항렬자, 둘: 둘후보[1] }, { 첫: 항렬자, 둘: 둘후보[2] }];
    return [{ 첫: 첫후보[0], 둘: 항렬자 }, { 첫: 첫후보[1], 둘: 항렬자 }, { 첫: 첫후보[2], 둘: 항렬자 }];
  }
  // 둘 다 자유
  const out = [];
  for (let i = 0; i < Math.min(첫후보.length, 둘후보.length); i++) {
    out.push({ 첫: 첫후보[i], 둘: 둘후보[i] });
  }
  return out;
}

// 메인 진입점
export function 인물작명(input) {
  const {
    구분 = '신생아',
    성 = '',
    성별 = 'u',
    생년 = null,
    생월 = null, 생일 = null, 생시 = null,
    한자사용 = true,
    키워드 = [],
    항렬자 = null,
    항렬위치 = '뒤',
    음절 = 2,
    부모합성 = false,
    아빠글자 = '',
    엄마글자 = '',
    합성어순 = '아빠먼저',
    옛스러움제외 = true,
    이름지정 = false,
    지정이름 = '',
    // ── 외국인 귀화 모드 ──
    외국인모드 = false,
    본명원어 = '',          // 예: "Sophia", "Yuki", "王雷"
    본명한국음 = '',        // 사용자가 직접 한국식 음 표기 (예: "소피아", "유키", "왕뢰")
    본명뜻 = '',            // 자유 텍스트 (예: "지혜로운 봄꽃", "thunder strong")
    변환방식 = 'mix',        // 'phonetic' (음역) | 'meaning' (의역) | 'mix'
  } = input;

  // 사주 분석
  let 사주 = null;
  let 부족오행 = [];
  let 충만오행 = [];
  let 띠정보 = null;
  let 운세 = null;
  if (생년) {
    사주 = 사주오행분석({ year: 생년, month: 생월 || 1, day: 생일 || 1, hour: 생시 });
    부족오행 = 사주.부족;
    충만오행 = 사주.충만;
    띠정보 = 띠(생년);
    운세 = 운세분석(사주);
  }

  // 이름 지정 모드 — 한글 이름은 정해져 있고 한자만 추천
  if (이름지정 && 지정이름) {
    const r = 지정이름작명({
      성, 성별, 지정이름, 한자사용,
      사주, 띠정보, 키워드, 부족오행, 충만오행,
      옛스러움제외, 보강운세: input.보강운세 || [],
    });
    r.운세 = 운세;
    return r;
  }

  // 부모 합성 모드 — 두 글자 고정해 후보 생성
  if (부모합성 && 아빠글자 && 엄마글자) {
    const [첫음, 둘음] = 합성어순 === '엄마먼저'
      ? [엄마글자, 아빠글자]
      : [아빠글자, 엄마글자];
    const r = 부모합성작명({
      성, 성별, 첫음, 둘음, 한자사용,
      사주, 띠정보, 키워드, 부족오행,
    });
    r.운세 = 운세;  // 사주 운세 같이 전달
    return r;
  }

  // 한자 미사용 → 순한글 / 한국 인기 풀에서 작명
  if (!한자사용) {
    return 한글작명({ 성, 성별, 음절, 키워드, 부족오행, 띠정보, 사주 });
  }

  // 외국인 모드 컨텍스트
  const 음역음 = 외국인모드 ? [...(본명한국음 || '')].filter(c => /[가-힣]/.test(c)) : null;
  const 의미훈 = 외국인모드 ? 뜻에서한자훈(본명뜻, 본명원어) : null;

  // 한자 후보 가중치 산정
  const ctx = {
    부족오행, 충만오행, 성별,
    키워드들: 키워드,
    보강운세: input.보강운세 || [],
    외국인모드, 음역음, 의미훈, 변환방식,
  };
  const 가중리스트 = HANJA.map(h => ({ h, w: 한자가중치(h, ctx) }));
  가중리스트.sort((a, b) => b.w - a.w);

  // 상위 풀에서 무작위 가중 샘플로 다양성 확보
  const 상위풀 = 가중리스트.slice(0, 40);

  const 후보들 = [];
  for (let tries = 0; tries < 12 && 후보들.length < 5; tries++) {
    const 첫 = 가중샘플(상위풀.map(x => x.h), 상위풀.map(x => 1 + Math.max(0, x.w)), 5);
    const 둘 = 가중샘플(상위풀.map(x => x.h), 상위풀.map(x => 1 + Math.max(0, x.w)), 5);

    // 항렬자 처리
    if (음절 === 1) {
      // 외자 — 한 글자만
      for (const h of 첫) {
        const 한글 = h.음;
        if (이미존재(후보들, 한글)) continue;
        후보들.push(이름카드만들기({ 첫: h, 둘: null, 성, 한글, 사주, 띠정보, 키워드 }));
        if (후보들.length >= 5) break;
      }
    } else {
      const 조합 = 한자조합(첫, 둘, 항렬자 ? lookupHanja(항렬자) : null, 항렬위치);
      for (const c of 조합) {
        if (!c.첫 || !c.둘) continue;
        if (c.첫.자 === c.둘.자) continue;       // 같은 한자 두 번 금지
        if (c.첫.음 === c.둘.음) continue;       // 같은 음 두 번도 금지 (민민 등)
        const 한글 = c.첫.음 + c.둘.음;
        if (이미존재(후보들, 한글)) continue;
        const 카드 = 이름카드만들기({ 첫: c.첫, 둘: c.둘, 성, 한글, 사주, 띠정보, 키워드 });
        // 옛스러움 필터 — 시대성 점수 50 미만 제외
        if (옛스러움제외 && 카드.시대성 < 50) continue;
        후보들.push(카드);
        if (후보들.length >= 5) break;
      }
    }
  }

  // 점수 내림차순 정렬
  후보들.sort((a, b) => b.종합점수 - a.종합점수);
  return {
    구분,
    사주,
    띠: 띠정보,
    운세,
    후보들,
    외국인: 외국인모드 ? { 본명원어, 본명한국음, 본명뜻, 변환방식, 매칭훈: 의미훈 } : null,
  };
}

function lookupHanja(자) {
  return HANJA.find(h => h.자 === 자) || null;
}

function 이미존재(list, 한글) {
  return list.some(x => x.한글 === 한글);
}

function 이름카드만들기({ 첫, 둘, 성, 한글, 사주, 띠정보, 키워드 }) {
  const 한자 = 둘 ? `${첫.자}${둘.자}` : 첫.자;
  const 뜻조합 = 둘 ? `${첫.훈}+${둘.훈}` : 첫.훈;
  const 오행조합 = 둘 ? `${첫.오}·${둘.오}` : 첫.오;
  const 획총 = (성 ? 1 : 0) + 첫.획 + (둘 ? 둘.획 : 0); // 성 한자 획수 모르므로 약식
  const 수리 = 수리길흉(첫.획 + (둘 ? 둘.획 : 0));

  const 발음 = 발음점수(한글);
  const 시대 = 시대성점수(한글);
  const 희소 = 희소성점수(한글);
  const 종합 = 인물종합점수(한글);

  return {
    한글,
    한자,
    풀네임: 성 + 한글,
    풀네임한자: 성 + 한자,
    뜻: 뜻조합,
    오행: 오행조합,
    수리: 수리,
    발음점수: 발음,
    시대성: 시대,
    희소성: 희소,
    종합점수: 종합,
    첫인상: 첫인상생성(한글, 키워드),
    별명: 별명생성(한글),
    영문표기: 로마자표기(한글),
    동명이인: 동명이인흔함(한글),
  };
}

// 이름 지정 모드 — 한글 이름이 정해져 있고 사주에 맞는 한자만 추천
function 지정이름작명({ 성, 성별, 지정이름, 한자사용, 사주, 띠정보, 키워드, 부족오행, 충만오행, 옛스러움제외, 보강운세 }) {
  const 음절 = [...지정이름].filter(c => /[가-힣]/.test(c));
  if (!음절.length) {
    return { 구분: '신생아', 사주, 띠: 띠정보, 후보들: [], 지정모드: { 이름: 지정이름, 에러: '한글 이름을 입력해주세요' } };
  }

  // 한자 사용 안 함이면 그냥 지정 이름 그대로
  if (!한자사용) {
    return {
      구분: '신생아',
      사주, 띠: 띠정보,
      지정모드: { 이름: 지정이름 },
      후보들: [{
        한글: 지정이름,
        한자: null,
        풀네임: 성 + 지정이름,
        풀네임한자: null,
        뜻: '한자 미사용 — 정해진 한글 그대로',
        오행: '—',
        수리: null,
        발음점수: 발음점수(지정이름),
        시대성: 시대성점수(지정이름),
        희소성: 희소성점수(지정이름),
        종합점수: 인물종합점수(지정이름),
        첫인상: '부모님이 정한 한글 그대로 — 가장 자신 있는 이름.',
        별명: 별명생성(지정이름),
        영문표기: 로마자표기(지정이름),
        동명이인: 동명이인흔함(지정이름),
      }],
    };
  }

  // 음 유사 매칭 — 한자 부족 시 폴백
  const 음유사 = (target) => HANJA.filter(h => h.음[0] === target[0]);

  // 각 음절에 대한 한자 후보 가져오기 + 가중치
  const ctx = { 부족오행, 충만오행, 성별, 키워드들: 키워드, 보강운세 };
  const 음절후보 = 음절.map(음 => {
    let cands = HANJA.filter(h => h.음 === 음);
    if (cands.length < 3) cands = [...cands, ...음유사(음).slice(0, 8)];
    // 음 일치 + 폴백 제거
    cands = [...new Map(cands.map(c => [c.자, c])).values()];
    // 가중치 정렬 (사주/키워드/운세 모두 반영)
    return cands
      .map(h => ({ h, w: 한자가중치(h, ctx) }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 8);
  });

  const 후보들 = [];
  const seen = new Set();

  // 음절 수에 따라 조합
  if (음절.length === 1) {
    // 외자
    for (const { h } of 음절후보[0]) {
      if (seen.has(h.자)) continue;
      seen.add(h.자);
      후보들.push(이름카드만들기({ 첫: h, 둘: null, 성, 한글: h.음, 사주, 띠정보, 키워드 }));
      if (후보들.length >= 6) break;
    }
  } else if (음절.length === 2) {
    for (const { h: a } of 음절후보[0]) {
      for (const { h: b } of 음절후보[1]) {
        if (a.자 === b.자) continue;
        const key = a.자 + b.자;
        if (seen.has(key)) continue;
        seen.add(key);
        const 카드 = 이름카드만들기({ 첫: a, 둘: b, 성, 한글: a.음 + b.음, 사주, 띠정보, 키워드 });
        if (옛스러움제외 && 카드.시대성 < 50) continue;
        후보들.push(카드);
        if (후보들.length >= 6) break;
      }
      if (후보들.length >= 6) break;
    }
  } else {
    // 3음절 — 세 음절 한자 조합 (간단히 상위 3개씩 곱셈)
    for (const { h: a } of 음절후보[0].slice(0, 3)) {
      for (const { h: b } of 음절후보[1].slice(0, 3)) {
        for (const { h: c } of 음절후보[2].slice(0, 3)) {
          if (a.자 === b.자 || b.자 === c.자) continue;
          const key = a.자 + b.자 + c.자;
          if (seen.has(key)) continue;
          seen.add(key);
          후보들.push({
            한글: a.음 + b.음 + c.음,
            한자: a.자 + b.자 + c.자,
            풀네임: 성 + a.음 + b.음 + c.음,
            풀네임한자: 성 + a.자 + b.자 + c.자,
            뜻: `${a.훈}+${b.훈}+${c.훈}`,
            오행: `${a.오}·${b.오}·${c.오}`,
            수리: 수리길흉(a.획 + b.획 + c.획),
            발음점수: 발음점수(a.음 + b.음 + c.음),
            시대성: 시대성점수(a.음 + b.음 + c.음),
            희소성: 희소성점수(a.음 + b.음 + c.음),
            종합점수: 인물종합점수(a.음 + b.음 + c.음),
            첫인상: 첫인상생성(a.음 + b.음 + c.음, 키워드),
            별명: 별명생성(a.음 + b.음 + c.음),
            영문표기: 로마자표기(a.음 + b.음 + c.음),
            동명이인: 동명이인흔함(a.음 + b.음 + c.음),
          });
          if (후보들.length >= 5) break;
        }
        if (후보들.length >= 5) break;
      }
      if (후보들.length >= 5) break;
    }
  }

  // 부족 오행 매칭 비중 표시 — 종합점수 정렬
  후보들.sort((a, b) => b.종합점수 - a.종합점수);

  return {
    구분: '신생아',
    사주, 띠: 띠정보,
    지정모드: {
      이름: 지정이름,
      음절: 음절.length,
      매칭정보: 음절후보.map((c, i) => ({ 음: 음절[i], 후보수: c.length })),
    },
    후보들,
  };
}

// 부모 합성 작명 — 두 글자 음 고정, 가능한 한자 조합으로 후보 생성
function 부모합성작명({ 성, 성별, 첫음, 둘음, 한자사용, 사주, 띠정보, 키워드 }) {
  const 후보들 = [];
  const seen = new Set();

  // 음 유사 매칭 (한자가 부족할 때 폴백) — ㅂ↔ㅁ 같은 한국식 변환은 안 하고
  // 단순히 첫 자음이 같은 음으로만 폴백
  const 음유사 = (target) => {
    if (!target) return [];
    return HANJA.filter(h => h.음[0] === target[0]);
  };

  // 한자 사용: 첫음의 한자 × 둘음의 한자 조합
  if (한자사용) {
    let 첫후보 = HANJA.filter(h => h.음 === 첫음);
    let 둘후보 = HANJA.filter(h => h.음 === 둘음);
    // 폴백: 정확한 음 한자가 부족하면 첫 자음이 같은 한자로 확장
    if (첫후보.length < 3) 첫후보 = [...첫후보, ...음유사(첫음).slice(0, 6)];
    if (둘후보.length < 3) 둘후보 = [...둘후보, ...음유사(둘음).slice(0, 6)];

    // 성별 일치 우선
    const 정렬 = arr => arr.slice().sort((a, b) => {
      const aMatch = 성별 && (a.성 === 성별 || a.성 === 'u') ? 1 : 0;
      const bMatch = 성별 && (b.성 === 성별 || b.성 === 'u') ? 1 : 0;
      return bMatch - aMatch;
    });
    const 첫S = 정렬(첫후보);
    const 둘S = 정렬(둘후보);

    for (const 첫 of 첫S.slice(0, 6)) {
      for (const 둘 of 둘S.slice(0, 6)) {
        if (첫.자 === 둘.자) continue;
        const 한글 = 첫음 + 둘음;
        const key = 첫.자 + 둘.자;
        if (seen.has(key)) continue;
        seen.add(key);
        후보들.push(이름카드만들기({ 첫, 둘, 성, 한글, 사주, 띠정보, 키워드 }));
        if (후보들.length >= 6) break;
      }
      if (후보들.length >= 6) break;
    }
  }

  // 한자 없거나 부족 → 순한글 카드도 한두 개 추가
  if (후보들.length < 4) {
    const 한글 = 첫음 + 둘음;
    if (!후보들.some(c => c.한글 === 한글)) {
      후보들.push({
        한글,
        한자: null,
        풀네임: 성 + 한글,
        풀네임한자: null,
        뜻: '부모 이름에서 한 글자씩 따온 순한글 이름',
        오행: '—',
        수리: null,
        발음점수: 발음점수(한글),
        시대성: 시대성점수(한글),
        희소성: 희소성점수(한글),
        종합점수: 인물종합점수(한글),
        첫인상: '엄마·아빠 이름이 자연스럽게 한 호흡으로 이어진 이름.',
        별명: 별명생성(한글),
        영문표기: 로마자표기(한글),
        동명이인: 동명이인흔함(한글),
      });
    }
  }

  return {
    구분: '신생아',
    사주,
    띠: 띠정보,
    운세: 사주 ? null : null,  // 운세는 메인 진입점에서 따로 계산되지만 부모합성은 짧은 경로
    부모합성: { 첫음, 둘음, 어순: 첫음 + '·' + 둘음 },
    후보들,
  };
}

function 한글작명({ 성, 성별, 음절, 키워드, 부족오행 }) {
  const 후보들 = [];
  const 앞풀 = 성별 === 'f' ? SYLLABLES.앞_여 : 성별 === 'm' ? SYLLABLES.앞_남 : [...SYLLABLES.앞_남, ...SYLLABLES.앞_여];
  const 뒤풀 = 성별 === 'f' ? SYLLABLES.뒤_여 : 성별 === 'm' ? SYLLABLES.뒤_남 : [...SYLLABLES.뒤_남, ...SYLLABLES.뒤_여];

  // 순한글 단독 풀도 섞기
  const 순한글풀 = [...SYLLABLES.순한글_두음절];

  for (let tries = 0; tries < 30 && 후보들.length < 5; tries++) {
    let 한글;
    if (Math.random() < 0.25 && 음절 === 2) {
      한글 = 순한글풀[Math.floor(Math.random() * 순한글풀.length)];
    } else {
      const 앞 = 앞풀[Math.floor(Math.random() * 앞풀.length)];
      if (음절 === 1) { 한글 = 앞; }
      else {
        const 뒤 = 뒤풀[Math.floor(Math.random() * 뒤풀.length)];
        한글 = 앞 + 뒤;
      }
    }
    if (이미존재(후보들, 한글)) continue;

    // 부족 오행과 첫 자음의 음오행이 맞으면 가산
    const 초 = 자모분리(한글[0]).초;
    const 한글오행 = 음오행[초] || '土';

    후보들.push({
      한글,
      한자: null,
      풀네임: 성 + 한글,
      풀네임한자: null,
      뜻: '순한글 이름',
      오행: 한글오행,
      수리: null,
      발음점수: 발음점수(한글),
      시대성: 시대성점수(한글),
      희소성: 희소성점수(한글),
      종합점수: 인물종합점수(한글) + (부족오행.includes(한글오행) ? 6 : 0),
      첫인상: 첫인상생성(한글, 키워드),
      별명: 별명생성(한글),
      영문표기: 로마자표기(한글),
      동명이인: 동명이인흔함(한글),
    });
  }
  후보들.sort((a, b) => b.종합점수 - a.종합점수);
  return { 사주: null, 후보들 };
}

// 첫인상 한 줄 — 키워드 기반 코멘트
function 첫인상생성(한글, 키워드) {
  const 줄들 = [
    `교실 뒷자리에서 누가 "${한글}!" 하고 부르면 돌아볼 이름.`,
    `정중하게 "${한글} 씨" 라고 불러도 어색하지 않은 균형.`,
    `친구가 단톡방에서 "${한글}아" 라고 부르면 따뜻해지는 톤.`,
    `명함에 박혀 있어도 카페에서 호명돼도 다 어울리는 이름.`,
    `10년 뒤 이력서에 적혀 있어도 안 촌스러운 시대성.`,
    `노트 표지에 직접 손글씨로 적고 싶어지는 균형감.`,
    `처음 듣자마자 한 번에 외워지는 가벼움.`,
    `발음할 때 입꼬리가 살짝 올라가는 이름.`,
  ];
  if (키워드.includes('bright')) 줄들.push(`이름 끝이 환하게 열려 있는 느낌.`);
  if (키워드.includes('warm')) 줄들.push(`겨울 손난로 같은 따뜻한 음절 조합.`);
  if (키워드.includes('strong')) 줄들.push(`흘려서 부를 수 없는 분명한 무게가 있다.`);
  if (키워드.includes('wise')) 줄들.push(`글공부 잘하는 친구 이름 같다는 인상.`);
  return 줄들[Math.floor(Math.random() * 줄들.length)];
}

function 별명생성(한글) {
  const last = 한글[한글.length - 1];
  if (한글.length >= 2) {
    return `${한글}~ / ${한글[0]}${last}${last} / ${한글}이`;
  }
  return `${한글}이 / ${한글}쨩 / 우리 ${한글}`;
}

// 한국식 로마자 표기 (개정 로마자) — 작명 결과에서 영문 표기 미리 보여주기
const 로마자초 = {
  ㄱ:'g',ㄲ:'kk',ㄴ:'n',ㄷ:'d',ㄸ:'tt',ㄹ:'r',ㅁ:'m',ㅂ:'b',ㅃ:'pp',
  ㅅ:'s',ㅆ:'ss',ㅇ:'',ㅈ:'j',ㅉ:'jj',ㅊ:'ch',ㅋ:'k',ㅌ:'t',ㅍ:'p',ㅎ:'h'
};
const 로마자중 = {
  ㅏ:'a',ㅐ:'ae',ㅑ:'ya',ㅒ:'yae',ㅓ:'eo',ㅔ:'e',ㅕ:'yeo',ㅖ:'ye',
  ㅗ:'o',ㅘ:'wa',ㅙ:'wae',ㅚ:'oe',ㅛ:'yo',ㅜ:'u',ㅝ:'wo',ㅞ:'we',ㅟ:'wi',ㅠ:'yu',ㅡ:'eu',ㅢ:'ui',ㅣ:'i'
};
const 로마자종 = {
  '':'',ㄱ:'k',ㄴ:'n',ㄷ:'t',ㄹ:'l',ㅁ:'m',ㅂ:'p',ㅇ:'ng',
};
function 로마자표기(한글) {
  let out = '';
  for (const c of 한글) {
    const j = 자모분리(c);
    out += (로마자초[j.초] || '') + (로마자중[j.중] || '') + (로마자종[j.종] || '');
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function 동명이인흔함(한글) {
  const VERY_COMMON = new Set([
    ...POPULAR_PERSON_NAMES.m_2024,
    ...POPULAR_PERSON_NAMES.f_2024,
  ]);
  const COMMON = new Set([
    ...POPULAR_PERSON_NAMES.m_classic,
    ...POPULAR_PERSON_NAMES.f_classic,
  ]);
  if (VERY_COMMON.has(한글)) return { 단계: '높음', 코멘트: '같은 반에 1~2명 있을 가능성 있음' };
  if (COMMON.has(한글)) return { 단계: '중간', 코멘트: '직장 동료 중에 비슷한 이름이 있을 수 있음' };
  return { 단계: '낮음', 코멘트: '주변에 같은 이름 만나기 어려움' };
}
