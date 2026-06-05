// 한글 자모 분리·합성 유틸

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const SBase = 0xAC00;

export function 자모분리(char) {
  const code = char.charCodeAt(0) - SBase;
  if (code < 0 || code > 11171) return { 초: char, 중: '', 종: '' };
  const 초 = Math.floor(code / 588);
  const 중 = Math.floor((code % 588) / 28);
  const 종 = code % 28;
  return { 초: CHO[초], 중: JUNG[중], 종: JONG[종] };
}

export function 음절자모(str) {
  return [...str].map(자모분리);
}

// 자음 충돌 점수 — 같은 자음 연속(예: ㅅ-ㅅ) 시 발음이 부담스러움
export function 자음충돌(name) {
  const jamos = 음절자모(name);
  let collisions = 0;
  for (let i = 1; i < jamos.length; i++) {
    if (jamos[i - 1].종 && jamos[i].초 === jamos[i - 1].종) collisions++;
    if (jamos[i - 1].초 === jamos[i].초) collisions += 0.5; // 두음 반복도 약간 감점
  }
  return collisions;
}

// 모음 종결 — 부르기 좋은 이름 (콩이, 보리)
export function 모음종결(name) {
  const last = 자모분리(name[name.length - 1]);
  return last.종 === '';
}

export function 음절수(str) {
  return [...str].filter(c => c.charCodeAt(0) >= SBase && c.charCodeAt(0) <= 0xD7A3).length;
}

// 마지막 글자에 받침이 있는지
export function 받침있음(str) {
  if (!str) return false;
  const last = str[str.length - 1];
  const j = 자모분리(last);
  return !!j.종;
}

// 조사 자동 선택 — "이/가", "을/를", "은/는", "와/과", "(이)라는"
export function 조사(str, type) {
  const 받침 = 받침있음(str);
  switch (type) {
    case '이가': return 받침 ? '이' : '가';
    case '을를': return 받침 ? '을' : '를';
    case '은는': return 받침 ? '은' : '는';
    case '와과': return 받침 ? '과' : '와';
    case '이라는': return 받침 ? '이라는' : '라는';
    case '으로': return 받침 ? '으로' : '로';
  }
  return '';
}
