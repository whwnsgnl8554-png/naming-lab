// 닉네임·게임 아이디 작명 로직
//   - 19개 카테고리 × 6개 서브풀(영문진지·영문유머·한글진지·한글유머·참신·대중) ≈ 5,000개 풀
//   - 게임명 자유 입력 → 별칭 매칭 OR 사용자 지정 장르 → 풀 선택
//   - 스타일(자동/짧/길/진지/유머/영문/한글/참신/대중) 필터링
//   - 변형(_99, _kr 등) 자동 첨가

import { POOLS, GAME_ALIASES, CATEGORY_LABELS } from '../data/nickname.js';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand() { return Math.random(); }

// ─── 통합 풀 선택기 ────────────────
// 한 카테고리의 6개 서브풀 중 스타일에 맞춰 합집합 추출
function 풀선택(p, style) {
  if (!p) return [];
  const all = [...p.eng_serious, ...p.eng_funny, ...p.kor_serious, ...p.kor_funny, ...p.creative, ...p.popular];
  switch (style) {
    case 'eng':      return [...p.eng_serious, ...p.eng_funny];
    case 'kor':      return [...p.kor_serious, ...p.kor_funny, ...p.creative.filter(n => !/[A-Za-z]/.test(n)), ...p.popular.filter(n => !/[A-Za-z]/.test(n))];
    case 'serious':  return [...p.eng_serious, ...p.kor_serious];
    case 'funny':    return [...p.eng_funny, ...p.kor_funny];
    case 'creative': return p.creative;
    case 'popular':  return p.popular;
    case 'short':    return all.filter(n => [...n].length <= 6);
    case 'long':     return all.filter(n => [...n].length >= 6);
    case 'auto':
    default:         return all;
  }
}

// 길이 필터 (스타일이 short/long 이미 적용된 경우는 통과)
function 길이맞춤(name, style) {
  if (!name) return null;
  const len = [...name].length;
  if (style === 'short' && len > 7) return null;
  if (style === 'long' && len < 6) return null;
  if (len < 2 || len > 18) return null;
  return name;
}

// 한 줄 코멘트 — 카테고리별 어디서 쓰면 어울리는지
function 코멘트(_name, cat) {
  const 풀 = {
    sc: ['방송용 이름판에 박혀도 무게 있는 톤.', '프로씬 닉네임 스타일 — 대문자 한두 자가 시그니처.', '브루드워 채팅창에 떴을 때 모르는 척 못 할 이름.', '종족 정체성 살짝 묻어나는 닉.'],
    pubg: ['자기장 한 칸 남았을 때 부르면 부담스러운 이름.', '치킨 먹은 직후 스크린샷에 박혀야 어울리는 톤.', '로비에서 사람들이 한 번씩 쳐다보게 되는 닉.', '킬로그에 떴을 때 약간 웃긴 톤.'],
    fifa: ['구단주 모드 들어가면 더 빛나는 닉.', '경기 후 인터뷰에 자막으로 떠도 안 어색.', 'BWC 신청서에 적어도 부끄럽지 않은 톤.', '한 골 넣고 세리머니할 때 카메라가 잡았으면 하는 이름.'],
    maple: ['자유시장에서 거래 신청 들어오면 친근한 이름.', '길드 모집 게시판에 올렸을 때 답글 잘 달릴 톤.', '리부트 월드보다 일반 서버 분위기.', '테네브리스 입장 전 외쳐도 좋을 톤.'],
    kart: ['로비에서 첫 줄에 떠있으면 다들 한 번 보는 닉.', '시즌 카드 빛 위에 올라가도 안 어색한 톤.', '대전 끝나고 GG 칠 때 부드럽게 어울리는 이름.', '리그 진출 명단에 올라가면 잘 어울릴 닉.'],
    yut: ['명절 가족 단톡방에 정해도 안 부끄러운 톤.', '안방 거실 윷판에 어울리는 이름.', '친척들 사이에서 잠깐 화제 될 닉.', '방판 까는 순간 분위기 잡아주는 톤.'],
    mmorpg: ['길드 모집글에 답글 잘 달릴 톤.', '필드보스 트라이 때 외쳐도 잘 들리는 닉.', '채팅창에 길게 떠도 시선이 가는 톤.', '랭킹 페이지에 박혀도 안 어색한 무게감.'],
    fps: ['킬로그에 떴을 때 한 번에 외워지는 톤.', '랭크 매치 로비에서 무게 있는 닉.', '에임 안 좋아도 어딘가 자신감 있어 보이는 톤.', '매치 시작 전 팀원들이 한 번 흘끔 보는 이름.'],
    br: ['자기장 한 칸 남았을 때 외치면 묘하게 어울리는 톤.', '1등 먹은 직후 스크린샷에 잘 박히는 닉.', '대기 로비에서 다음 판 같이 하자 신청 들어올 톤.'],
    moba: ['로비 화면에 떴을 때 챔피언 모스트 궁금해지는 닉.', 'OP.GG 검색하고 싶어지는 톤.', '핑 한 번 찍으면 팀이 따라올 것 같은 무게감.'],
    rpg: ['보스 처치 화면 캡처에 잘 박히는 톤.', '엔딩 크레딧에 자기 닉네임 박혀도 어색하지 않은 닉.', '솔플 회차에 어울리는 묵직한 무게.'],
    mobile: ['친구 추천 알림에 떠도 보내고 싶어지는 톤.', '랭킹 보드에 박혀도 잘 어울리는 가벼운 닉.', '카톡 프로필에 그대로 가져다 써도 무난한 톤.'],
    card: ['덱 코드 공유할 때 닉네임도 같이 보내고 싶은 톤.', '토너먼트 시드 표에 박혀도 멋있을 닉.', '상대 멘트 칠 때 무게감 있는 톤.'],
    fight: ['네온 사인처럼 강하게 떠야 어울리는 톤.', 'K.O. 화면에 한 번에 박히는 닉.', '경기 끝나고 핸드셰이크 할 때 어색하지 않은 무게.'],
    board: ['한 수 두는 데 시간 걸려도 기다리게 되는 톤.', '복기 화면에 박혀도 정갈한 닉.', '대국실 로비에서 어른스러운 분위기.'],
    sand: ['서버 운영자 명단에 박혀도 어울리는 톤.', '친구 초대 코드 옆에 자연스러운 닉.', '자기 월드 이름이랑 같이 두고 봐도 잘 묶이는 톤.'],
    rhythm: ['풀콤보 직후 랭킹 보드에 박힐 톤.', '이지투온 옆자리 친구 시선 끌만한 닉.', '난이도 차트 위에서 빛나는 톤.'],
    sim: ['자기 마을·도시 이름이랑 묶어도 자연스러운 톤.', '친구 마을 방문 손님 명단에 어울리는 닉.', '굳이 격렬하지 않은 일상감 있는 톤.'],
    gen: ['디스코드 서버 친구 목록에서 한 번에 눈에 띄는 닉.', '스팀 친구 추가 들어오면 누군지 궁금해지는 톤.', '유튜브 댓글창에서 자주 보이는 분위기.', '카톡 프로필에 그대로 써도 어색하지 않은 닉.'],
  };
  return pick(풀[cat] || 풀.gen);
}

// 변형 — 동명이인 대비 백업
function 변형들(name) {
  const 후보 = new Set([name]);
  const isEn = /[A-Za-z]/.test(name);
  후보.add(`${name}_99`);
  후보.add(`${name}07`);
  if (isEn) {
    후보.add(name.toLowerCase().replaceAll(' ', '_'));
    후보.add(name.replace(/^./, c => c.toUpperCase()));
  } else {
    후보.add(`${name}_kr`);
    후보.add(`${name}99`);
  }
  return [...후보].slice(0, 4);
}

// 게임명 → 카테고리 결정
function 게임명에서카테고리(이름) {
  if (!이름) return null;
  const k = 이름.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
  if (GAME_ALIASES[k]) return GAME_ALIASES[k];
  // 부분 매칭 — 입력 안에 별칭 키가 들어 있는지
  for (const key of Object.keys(GAME_ALIASES)) {
    if (k.length >= 2 && key.length >= 2 && (k.includes(key) || key.includes(k))) {
      return GAME_ALIASES[key];
    }
  }
  return null;
}

// 메인 진입점
export function 닉네임작명(input) {
  const {
    게임명 = '',
    장르 = 'auto',
    스타일 = 'auto',
    개수 = 12,
    핵심키워드 = [],
  } = input;

  // 카테고리 결정
  let 카테고리 = 게임명에서카테고리(게임명);
  let 자동매칭 = !!카테고리;
  if (!카테고리 && 장르 && 장르 !== 'auto') 카테고리 = 장르;
  if (!카테고리) 카테고리 = 'gen';

  const p = POOLS[카테고리] || POOLS.gen;
  const pool = 풀선택(p, 스타일);
  if (!pool.length) {
    // 빈 풀이면 전체 풀로 폴백
    const all = 풀선택(p, 'auto');
    pool.push(...all);
  }

  // 게임명 자체도 키워드로 활용
  const 추가키워드 = [];
  if (게임명) {
    const short = 게임명.replace(/\s+/g, '').slice(0, 4);
    추가키워드.push(short);
  }
  const 전체키워드 = [...핵심키워드, ...추가키워드];

  const 후보 = [];
  const seen = new Set();
  for (let tries = 0; tries < 400 && 후보.length < 개수; tries++) {
    let n = pick(pool);
    if (!n) continue;
    // 키워드 1/4 확률로 합성
    if (전체키워드.length && rand() < 0.22) {
      const k = pick(전체키워드);
      n = rand() < 0.5 ? `${k}${n.slice(0, 5)}` : `${n.slice(0, 6)}${k}`;
    }
    n = 길이맞춤(n, 스타일);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    후보.push({
      이름: n,
      게임라벨: 게임명 || CATEGORY_LABELS[카테고리] || '게임',
      카테고리라벨: CATEGORY_LABELS[카테고리] || '범용',
      길이: [...n].length,
      코멘트: 코멘트(n, 카테고리),
      변형: 변형들(n),
    });
  }
  return {
    상황: '닉네임',
    게임명,
    카테고리,
    자동매칭,
    후보들: 후보,
    풀크기: pool.length,
  };
}
