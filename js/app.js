// 앱 셸 — 탭 라우팅, 입력 폼, 결과 렌더링

import { 인물작명 } from './naming/person.js';
import { 반려동물작명 } from './naming/pet.js';
import { 회사작명 } from './naming/company.js';
import { 닉네임작명 } from './naming/nickname.js';
import { 태명작명 } from './naming/taemyung.js';
import { GAME_ALIASES } from './data/nickname.js';
import { mountExtraButton } from './ai.js';
import { getFavorites, isFavorite, toggleFavorite, removeFavorite, clearAll, makeId } from './util/favorites.js';
import { downloadShareCard } from './util/share.js';

// 마지막 폼 입력값 저장 — AI 추천 호출 시 재사용
let lastPersonInput = null;
let lastPetInput = null;
let lastCompanyInput = null;
let lastNickInput = null;

const 카테고리라벨 = {
  sc: '스타크래프트', pubg: '배틀그라운드', fifa: '피파온라인',
  maple: '메이플스토리', kart: '카트라이더', yut: '윷놀이',
  mmorpg: 'MMORPG', fps: 'FPS', br: '배틀로얄', moba: 'MOBA', rpg: '액션 RPG',
  mobile: '모바일 캐주얼', card: '카드·전략', fight: '격투·스포츠',
  board: '보드·전통', sand: '샌드박스', rhythm: '리듬', sim: '시뮬·경영',
  gen: '범용 인터넷',
};
import { PERSON_KEYWORDS } from './data/keywords.js';
import { OHAENG_KO, OHAENG_COLOR, OHAENG_FEEL } from './data/ohaeng.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

// ─── 테마 ────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('naming-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  const btn = $('#theme-toggle');
  btn?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('naming-theme', next);
  });
}

// ─── 탭 라우팅 ────────────────────────
function initTabs() {
  const tabs = $$('.tab-btn');
  const panes = $$('.tab-pane');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const id = t.dataset.tab;
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panes.forEach(p => p.classList.toggle('active', p.dataset.tab === id));
      // 결과 영역 초기화
      const out = $(`#out-${id}`);
      if (out && !out.dataset.populated) out.innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // 홈 카드에서 탭 진입
  $$('.home-card').forEach(c => {
    c.addEventListener('click', () => {
      const id = c.dataset.go;
      $(`.tab-btn[data-tab="${id}"]`)?.click();
    });
  });
}

// ─── 키워드 토글 ───────────────────────
function initKeywordChips() {
  const wrap = $('#person-keywords');
  if (!wrap) return;
  for (const k of PERSON_KEYWORDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.id = k.id;
    b.textContent = k.label;
    b.addEventListener('click', () => b.classList.toggle('on'));
    wrap.appendChild(b);
  }

  // 회사 이미지 칩
  const wrap2 = $('#company-images');
  if (wrap2) {
    for (const im of ['신뢰감','트렌디','따뜻함','강렬함','유머','기술감','전통적']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.id = im;
      b.textContent = im;
      b.addEventListener('click', () => b.classList.toggle('on'));
      wrap2.appendChild(b);
    }
  }

  // 반려동물 성격 칩
  const wrap3 = $('#pet-personalities');
  if (wrap3) {
    for (const p of ['활발한','얌전한','까칠한','애교많은','바보같은','도도한','겁많은','장난꾸러기']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.id = p;
      b.textContent = p;
      b.addEventListener('click', () => b.classList.toggle('on'));
      wrap3.appendChild(b);
    }
  }
}

function selectedChips(wrapId) {
  return $$(`#${wrapId} .chip.on`).map(c => c.dataset.id);
}

// ─── 인물 폼 ─────────────────────────
function initPersonForm() {
  const form = $('#person-form');
  if (!form) return;

  // 구분(신생아/개명) 변경 시 라벨·안내·플레이스홀더 동기화
  const 라벨들 = $$('#person-date-row label[data-신생아]');
  const 안내 = $('#person-date-hint');
  const sub = $('#person-sub');
  const 태명필드 = $('#person-taemyung-fields');
  const 본명필드들 = $$('.person-bonmyung-field');
  // 태명만 모드 — 본명 함께 받기 체크박스는 의미 없으니 숨김
  const 태명함께체크 = form.querySelector('input[name="태명함께"]')?.closest('label');

  function 구분동기화() {
    const v = (form.querySelector('input[name="구분"]:checked') || {}).value || '신생아';
    // 신생아 ↔ 개명 라벨 토글 (태명만은 신생아와 동일 라벨)
    const labelKey = v === '태명만' ? '신생아' : v;
    for (const l of 라벨들) l.textContent = l.dataset[labelKey];

    // 본명 전용 필드(성·항렬자·한자·음절)는 태명만 모드에서 숨김
    for (const f of 본명필드들) f.style.display = v === '태명만' ? 'none' : '';

    // 태명 옵션 — 신생아/태명만 모드에서만
    if (태명필드) 태명필드.style.display = (v === '신생아' || v === '태명만') ? '' : 'none';

    // "본명과 함께 태명도 받기" 체크박스 — 태명만 모드에선 숨김 (중복)
    if (태명함께체크) 태명함께체크.style.display = v === '태명만' ? 'none' : '';

    if (v === '신생아') {
      안내.textContent = '예정일은 변동될 수 있어 사주 결과가 실제 출생일과 다를 수 있습니다. 출산 후 정확한 생일로 다시 받아보시는 걸 권합니다.';
      안내.className = 'hint warn';
      sub.innerHTML = '<b>출산 예정일</b>로 입력해 주세요. 예정일 기준으로 사주를 추정해, 부족한 오행을 채울 글자 위주로 추천합니다. 본명과 함께 태명도 같이 받을 수 있어요.';
    } else if (v === '태명만') {
      안내.textContent = '본명은 작명소·할아버지·작명일에 따로 맡길 예정이거나, 이미 본명이 정해져 있을 때 추천합니다. 예정 월만 알려주시면 계절을 반영해 6개 태명을 골라요.';
      안내.className = 'hint ok';
      sub.innerHTML = '<b>태명만</b> 따로 짓는 모드예요. 9개월 동안 부르기 좋은 한 두 음절의 친근한 호칭을 골라드립니다. 예정 월·키워드·형제자매 여부만으로 충분해요.';
    } else {
      안내.textContent = '실제 생년월일을 그대로 입력해 주세요. 출생 시간을 알면 사주가 더 정확해져요.';
      안내.className = 'hint ok';
      sub.innerHTML = '<b>실제 생년월일</b>(필요시 출생 시간)을 넣으면 사주에 부족한 오행을 채울 글자 위주로 추천합니다. 모르면 비워도 됩니다.';
    }
  }
  form.querySelectorAll('input[name="구분"]').forEach(r => r.addEventListener('change', 구분동기화));
  구분동기화();

  // 부모 합성 체크 → 입력 두 칸 토글
  const 합성체크 = form.querySelector('input[name="부모합성"]');
  const 합성필드 = $('#parent-merge-fields');
  if (합성체크 && 합성필드) {
    합성체크.addEventListener('change', () => {
      합성필드.style.display = 합성체크.checked ? '' : 'none';
    });
  }

  // 외국인 모드 체크 → 본명 필드 토글
  const 외국인체크 = form.querySelector('input[name="외국인모드"]');
  const 외국인필드 = $('#foreign-fields');
  if (외국인체크 && 외국인필드) {
    외국인체크.addEventListener('change', () => {
      외국인필드.style.display = 외국인체크.checked ? '' : 'none';
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const input = {
      구분: fd.get('구분'),
      성: fd.get('성') || '',
      성별: fd.get('성별'),
      한자사용: fd.get('한자사용') === 'on',
      옛스러움제외: fd.get('옛스러움제외') === 'on',
      음절: Number(fd.get('음절')),
      키워드: selectedChips('person-keywords'),
    };
    const 생년 = fd.get('생년'), 생월 = fd.get('생월'), 생일 = fd.get('생일'), 생시 = fd.get('생시');
    if (생년) input.생년 = Number(생년);
    if (생월) input.생월 = Number(생월);
    if (생일) input.생일 = Number(생일);
    if (생시 !== '') input.생시 = Number(생시);
    const 항렬 = fd.get('항렬자')?.toString().trim();
    if (항렬) {
      input.항렬자 = 항렬[0];
      input.항렬위치 = fd.get('항렬위치') || '뒤';
    }
    // 태명 옵션 (신생아·태명만 모드에서 의미 있음)
    if (input.구분 === '신생아' || input.구분 === '태명만') {
      input.태명함께 = input.구분 === '태명만' ? true : (fd.get('태명함께') === 'on');
      input.형제자매 = fd.get('형제자매') === 'on';
      input.윗아이 = (fd.get('윗아이') || '').toString().trim();
    }

    // 부모 합성 모드
    if (input.구분 !== '태명만') {
      input.부모합성 = fd.get('부모합성') === 'on';
      input.아빠글자 = (fd.get('아빠글자') || '').toString().trim();
      input.엄마글자 = (fd.get('엄마글자') || '').toString().trim();
      input.합성어순 = fd.get('합성어순') || '아빠먼저';

      // 외국인 귀화 모드
      input.외국인모드 = fd.get('외국인모드') === 'on';
      input.본명원어 = (fd.get('본명원어') || '').toString().trim();
      input.본명한국음 = (fd.get('본명한국음') || '').toString().trim();
      input.본명뜻 = (fd.get('본명뜻') || '').toString().trim();
      input.변환방식 = fd.get('변환방식') || 'mix';
    }

    lastPersonInput = input;
    renderLoading('out-person', input.구분 === '태명만'
      ? '9개월 동안 부를 한두 음절을 고르는 중…'
      : '먹을 갈고 종이를 펴는 중…');
    setTimeout(() => {
      let result;
      if (input.구분 === '태명만') {
        // 본명 생성 스킵 — 태명만
        result = { 후보들: [], 사주: null };
      } else {
        result = 인물작명(input);
      }
      // 신생아 + 태명 함께 선택이거나 태명만 모드면 태명 생성
      if ((input.구분 === '신생아' && input.태명함께) || input.구분 === '태명만') {
        result.태명 = 태명작명({
          예정월: input.생월,
          키워드: input.키워드,
          형제자매: input.형제자매,
          윗아이: input.윗아이,
          개수: input.구분 === '태명만' ? 10 : 6,   // 태명만 모드는 더 많이
        });
      }
      result._구분 = input.구분;
      renderPersonResult(result, input);
    }, 380);
  });
}

function renderLoading(outId, msg) {
  const el = $(`#${outId}`);
  el.dataset.populated = '1';
  el.innerHTML = `<div class="loading"><div class="brush"></div><p>${msg}</p></div>`;
}

function renderPersonResult(result, input) {
  const el = $('#out-person');
  const 사주 = result.사주;
  const 태명만모드 = result._구분 === '태명만';
  let html = `<section class="result-block">`;
  html += renderResultActions();
  if (!태명만모드) {
    let extraBadges = '';
    if (result._보강운세?.length && result.운세) {
      const labels = result._보강운세.map(k => result.운세.운세[k]?.이름 || k).join('·');
      extraBadges += ` <span class="pill ok boost-badge" title="이 운을 받치는 한자에 가중치를 추가했어요">✦ 보강 · ${labels}</span>`;
    }
    if (result.부모합성) {
      extraBadges += ` <span class="pill warn boost-badge">👨‍👩‍👧 부모 합성 · ${result.부모합성.어순}</span>`;
    }
    if (result.외국인) {
      extraBadges += ` <span class="pill ok boost-badge">🌐 본명 기반 · ${result.외국인.본명원어 || result.외국인.본명한국음}</span>`;
    }
    html += `<h3 class="result-h">받아 든 이름들${extraBadges}</h3>`;

    // 외국인 모드 — 본명 정보 박스
    if (result.외국인) {
      const f = result.외국인;
      const 방식라벨 = { phonetic: '음역 위주', meaning: '의역 위주', mix: '음·뜻 함께' };
      html += `<div class="foreign-card">
        <div class="fc-row"><span class="lbl">본명</span><b>${f.본명원어 || '—'}</b></div>
        ${f.본명한국음 ? `<div class="fc-row"><span class="lbl">한국 음</span><span>${f.본명한국음}</span></div>` : ''}
        ${f.본명뜻 ? `<div class="fc-row"><span class="lbl">본명 뜻</span><span>${f.본명뜻}</span></div>` : ''}
        ${f.매칭훈?.length ? `<div class="fc-row"><span class="lbl">매칭 한자 훈</span><span class="fc-tags">${f.매칭훈.slice(0, 8).map(t => `<span>${t}</span>`).join('')}</span></div>` : ''}
        <div class="fc-row"><span class="lbl">변환</span><span>${방식라벨[f.변환방식] || f.변환방식}</span></div>
      </div>`;
    }
  }

  if (사주 && !태명만모드) {
    html += `<div class="saju-card">`;
    html += `<div class="saju-row"><span class="lbl">사주</span><span>${[사주.연주, 사주.월주, 사주.일주, 사주.시주].filter(Boolean).map(p => `<b>${p.천.자}${p.지.자}</b>`).join(' · ')}</span></div>`;
    if (result.띠) {
      html += `<div class="saju-row"><span class="lbl">띠</span><span>${result.띠.이모지} ${result.띠.띠}띠</span></div>`;
    }
    html += `<div class="saju-row"><span class="lbl">오행</span><span class="oh-bars">`;
    for (const o of ['木','火','土','金','水']) {
      const n = 사주.count[o] || 0;
      html += `<span class="oh-bar" style="--c:${OHAENG_COLOR[o]}" title="${OHAENG_KO[o]}: ${n}"><i style="height:${10 + n * 14}px"></i><b>${OHAENG_KO[o]}</b></span>`;
    }
    html += `</span></div>`;
    if (사주.부족.length) {
      html += `<div class="saju-row"><span class="lbl">보충</span><span>부족한 <b>${사주.부족.map(o => OHAENG_KO[o]).join('·')}</b> 기운을 채워줄 글자 위주로 추천했어요.</span></div>`;
    }
    html += `</div>`;

    // 운세 게이지 섹션
    if (result.운세) {
      html += renderUnse(result.운세);
    }
  }

  if (!태명만모드) {
    html += `<div class="cards">`;
    for (const c of result.후보들) {
      html += renderPersonCard(c);
    }
    html += `</div>`;
  }

  // 태명 섹션 (신생아 + 태명함께 체크, 또는 태명만 모드)
  if (result.태명 && result.태명.후보들?.length) {
    const t = result.태명;
    const 헤더 = 태명만모드
      ? '받아 든 태명'
      : '태명 — 9개월 동안 부를 이름';
    html += `<section class="taemyung-block${태명만모드 ? ' taemyung-solo' : ''}">
      <header class="tm-head">
        <h3 class="result-h tm-h">${헤더}</h3>
        <p class="result-sub">
          ${t.계절 ? `<b>${t.계절}</b>에 만날 아기에게 어울리는 톤으로 골랐어요. ` : ''}
          ${태명만모드
            ? '사주·한자는 빼고 부르기 좋음·따뜻함·계절감만 보고 추렸어요.'
            : '본명과 다르게 사주·한자보단 부르기 좋고 따뜻한 느낌을 우선했어요.'}
          ${t.형제자매 ? '윗아이 이름과 운율이 맞는 것도 한두 개 섞였어요.' : ''}
        </p>
      </header>
      <div class="cards tm-cards">
        ${t.후보들.map(renderTaemyungCard).join('')}
      </div>
      <div class="tm-boost">
        <h4 class="boost-h tm-boost-h">이 결을 더 받쳐주는 태명으로 다시 받기</h4>
        <div class="boost-chips">
          <button type="button" class="chip tm-chip" data-tm="food">🍯 콩알·간식</button>
          <button type="button" class="chip tm-chip" data-tm="nature">🌿 자연·하늘</button>
          <button type="button" class="chip tm-chip" data-tm="cute">🧸 귀여움·동글</button>
          <button type="button" class="chip tm-chip" data-tm="hope">💗 복덩이·바람</button>
          <button type="button" class="chip tm-chip" data-tm="jewel">💎 보석·반짝</button>
          <button type="button" class="chip tm-chip" data-tm="meeting">🎁 깜짝·만남</button>
          <button type="button" class="chip tm-chip" data-tm="sibling">👯 형제자매 운율</button>
        </div>
        <button type="button" class="boost-go tm-boost-go" id="tm-boost-go">고른 결로 태명 다시 받기</button>
      </div>
      <p class="tm-note">태명은 보통 임신 5~7주차부터 부르기 시작해 출산 후 한동안 그대로 부르는 경우도 많아요. 너무 길게 짓기보단 한두 음절, 모음으로 끝나는 게 가장 부르기 좋습니다.</p>
    </section>`;
  }

  html += `<div class="actions"><button class="redo-btn" id="person-redo">다른 이름 다시 받기</button></div>`;
  html += `</section>`;

  el.innerHTML = html;
  $('#person-redo')?.addEventListener('click', () => $('#person-form')?.requestSubmit());

  // 보강 칩 토글 + 재추천
  $$('#out-person .boost-chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('on'));
  });
  // 태명 보강 칩 토글
  $$('#out-person .tm-chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('on'));
  });
  // 태명만 재추천
  $('#tm-boost-go')?.addEventListener('click', () => {
    const selected = $$('#out-person .tm-chip.on').map(c => c.dataset.tm);
    if (!selected.length) {
      const go = $('#tm-boost-go');
      go.textContent = '먼저 결을 한 개 이상 골라주세요';
      setTimeout(() => { go.textContent = '고른 결로 태명 다시 받기'; }, 1600);
      return;
    }
    if (!lastPersonInput) return;
    const next = { ...lastPersonInput };
    lastPersonInput = next;
    // 태명만 새로 받기
    const tm = 태명작명({
      예정월: next.생월,
      키워드: next.키워드,
      형제자매: next.형제자매,
      윗아이: next.윗아이,
      개수: next.구분 === '태명만' ? 10 : 6,
      보강컨셉: selected,
    });
    // 결과의 태명 부분만 재렌더
    const oldTmBlock = $('#out-person .taemyung-block');
    if (!oldTmBlock) return;
    // 재렌더하면서 보강 표시
    const labels = {
      food: '콩알·간식', nature: '자연·하늘', cute: '귀여움·동글',
      hope: '복덩이·바람', jewel: '보석·반짝', meeting: '깜짝·만남', sibling: '형제자매 운율',
    };
    const boostLabel = selected.map(k => labels[k] || k).join('·');
    const newHeader = `받아 든 태명 <span class="pill warn boost-badge">🌱 보강 · ${boostLabel}</span>`;
    const isSolo = oldTmBlock.classList.contains('taemyung-solo');
    const html = `
      <header class="tm-head">
        <h3 class="result-h tm-h">${isSolo ? newHeader : '태명 — 9개월 동안 부를 이름'}</h3>
        ${!isSolo ? `<p class="result-sub"><span class="pill warn boost-badge">🌱 보강 · ${boostLabel}</span> 고른 결이 가산된 태명입니다.</p>` : ''}
      </header>
      <div class="cards tm-cards">${tm.후보들.map(renderTaemyungCard).join('')}</div>
      <div class="tm-boost">
        <h4 class="boost-h tm-boost-h">이 결을 더 받쳐주는 태명으로 다시 받기</h4>
        <div class="boost-chips">
          <button type="button" class="chip tm-chip ${selected.includes('food') ? 'on' : ''}" data-tm="food">🍯 콩알·간식</button>
          <button type="button" class="chip tm-chip ${selected.includes('nature') ? 'on' : ''}" data-tm="nature">🌿 자연·하늘</button>
          <button type="button" class="chip tm-chip ${selected.includes('cute') ? 'on' : ''}" data-tm="cute">🧸 귀여움·동글</button>
          <button type="button" class="chip tm-chip ${selected.includes('hope') ? 'on' : ''}" data-tm="hope">💗 복덩이·바람</button>
          <button type="button" class="chip tm-chip ${selected.includes('jewel') ? 'on' : ''}" data-tm="jewel">💎 보석·반짝</button>
          <button type="button" class="chip tm-chip ${selected.includes('meeting') ? 'on' : ''}" data-tm="meeting">🎁 깜짝·만남</button>
          <button type="button" class="chip tm-chip ${selected.includes('sibling') ? 'on' : ''}" data-tm="sibling">👯 형제자매 운율</button>
        </div>
        <button type="button" class="boost-go tm-boost-go" id="tm-boost-go">고른 결로 태명 다시 받기</button>
      </div>
      <p class="tm-note">태명은 보통 임신 5~7주차부터 부르기 시작해 출산 후 한동안 그대로 부르는 경우도 많아요.</p>
    `;
    oldTmBlock.innerHTML = html;
    // 핸들러 재바인딩
    oldTmBlock.querySelectorAll('.tm-chip').forEach(c => c.addEventListener('click', () => c.classList.toggle('on')));
    oldTmBlock.querySelector('#tm-boost-go')?.addEventListener('click', () => $('#tm-boost-go')?.click());
    oldTmBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 즐겨찾기 버튼도 재마운트
    mountFavoriteButtons();
  });
  $('#boost-go')?.addEventListener('click', () => {
    const selected = $$('#out-person .boost-chip.on').map(c => c.dataset.unse);
    if (!selected.length) {
      const go = $('#boost-go');
      go.textContent = '먼저 운을 한 개 이상 골라주세요';
      setTimeout(() => { go.textContent = '고른 운으로 이름 다시 받기'; }, 1600);
      return;
    }
    if (!lastPersonInput) return;
    const next = { ...lastPersonInput, 보강운세: selected };
    lastPersonInput = next;
    renderLoading('out-person', `${selected.length}가지 운을 받치는 이름을 새로 골라보는 중…`);
    setTimeout(() => {
      const result = 인물작명(next);
      if ((next.구분 === '신생아' && next.태명함께) || next.구분 === '태명만') {
        result.태명 = 태명작명({
          예정월: next.생월,
          키워드: next.키워드,
          형제자매: next.형제자매,
          윗아이: next.윗아이,
          개수: next.구분 === '태명만' ? 10 : 6,
        });
      }
      result._구분 = next.구분;
      result._보강운세 = selected;
      renderPersonResult(result, next);
      // 결과로 이동
      $('#out-person')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 380);
  });

  // AI 추천 더 받기 — 본명 추천이 있는 모드에서만
  if (태명만모드) return;
  mountExtraButton(el, {
    type: 'person',
    input: () => lastPersonInput || {},
    getExisting: () => [...el.querySelectorAll('.name-card .kor')].map(n => n.textContent.replace(/^[^가-힣]+/, '')),
    renderExtra: (names) => `<div class="cards">${
      names.map(n => `
        <article class="name-card ai-card">
          <header class="nc-head">
            <h4 class="nc-han">${n.한자 ? `<span class="hanja">${n.한자}</span>` : ''}<span class="kor">${n.한글 || n.이름 || ''}</span></h4>
            <span class="nc-score ai-tag">AI</span>
          </header>
          ${n.뜻 ? `<p class="nc-meaning">${n.뜻}</p>` : ''}
          ${n.코멘트 ? `<p class="nc-first">${n.코멘트}</p>` : ''}
        </article>
      `).join('')
    }</div>`,
  });
}

function renderResultActions() {
  return `<div class="result-actions no-print">
    <button type="button" class="result-act" data-act="print">📄 PDF로 저장</button>
    <button type="button" class="result-act" data-act="open-fav">♡ 저장함 열기</button>
  </div>`;
}

// 액션 버튼 이벤트 위임 (한 번만 등록)
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  if (t.dataset.act === 'print') {
    window.print();
  } else if (t.dataset.act === 'open-fav') {
    $('#favorites-btn')?.click();
  }
});

function renderUnse(u) {
  const 색 = (s) => s >= 75 ? 'var(--teal)' : s >= 55 ? 'var(--gold)' : s >= 35 ? 'var(--accent-soft)' : 'var(--muted)';
  const 톤 = (s) => s >= 75 ? '강함' : s >= 55 ? '있음' : s >= 35 ? '평이' : '약함';

  let html = `<section class="unse-block">
    <header class="unse-head">
      <h3 class="result-h unse-h">이름이 부를 운 — 사주 8가지 결</h3>
      <p class="result-sub">일간을 중심으로 십성(十星)과 신살(神煞)을 단순화해 8가지 결을 점수화했어요. 학파마다 해석이 달라 절대값이 아니라 <b>상대적 기운의 흐름</b>으로 봐주세요.</p>
    </header>`;

  // 신살 뱃지
  if (u.신살?.length) {
    html += `<div class="sinsal-row">`;
    for (const s of u.신살) {
      html += `<span class="sinsal-tag" title="${s.설명}">${s.이름}</span>`;
    }
    html += `</div>`;
  }

  // 8개 운세 막대
  html += `<div class="unse-grid">`;
  for (const k of Object.keys(u.운세)) {
    const it = u.운세[k];
    const c = 색(it.점수);
    html += `<article class="unse-card">
      <div class="unse-line">
        <span class="unse-ico">${it.아이콘}</span>
        <span class="unse-name">${it.이름}</span>
        <span class="unse-num" style="color:${c}">${it.점수}<small>· ${톤(it.점수)}</small></span>
      </div>
      <div class="unse-bar"><i style="width:${it.점수}%; background:${c}"></i></div>
      <p class="unse-cm">${it.코멘트}</p>
    </article>`;
  }
  html += `</div>`;

  // 종합 한 줄
  html += `<p class="unse-summary">${u.종합}</p>`;

  // 보강 모드 — "이 운 받쳐서 다시 받기"
  html += `<div class="unse-boost">
    <h4 class="boost-h">이 운을 더 받치는 이름으로 다시 받기</h4>
    <p class="boost-sub">보강하고 싶은 운을 골라주세요(여러 개). 해당 의미의 한자에 가중치가 추가돼 이름이 다시 추천됩니다.</p>
    <div class="boost-chips">`;
  for (const k of Object.keys(u.운세)) {
    const it = u.운세[k];
    html += `<button type="button" class="chip boost-chip" data-unse="${k}">${it.아이콘} ${it.이름}</button>`;
  }
  html += `</div>
    <button type="button" class="boost-go" id="boost-go">고른 운으로 이름 다시 받기</button>
  </div>`;

  html += `</section>`;
  return html;
}

function renderTaemyungCard(c) {
  return `
    <article class="tm-card">
      <header>
        <h4 class="tm-name">${c.이름}</h4>
        <span class="tm-badge">${c.컨셉라벨}</span>
      </header>
      <p class="tm-comment">${c.코멘트}</p>
      <div class="tm-score"><span>부르기 좋음</span><b>${c.부르기점수}</b></div>
    </article>
  `;
}

function renderPersonCard(c) {
  return `
    <article class="name-card">
      <header class="nc-head">
        <h4 class="nc-han">${c.한자 ? `<span class="hanja">${c.한자}</span>` : ''}<span class="kor">${c.풀네임 || c.한글}</span></h4>
        <span class="nc-score" title="발음·시대성·희소성 종합">${c.종합점수}<small>/100</small></span>
      </header>
      <p class="nc-meaning">${c.뜻}</p>
      <p class="nc-first">${c.첫인상}</p>
      <div class="nc-grid">
        <div><span>발음</span><b>${c.발음점수}</b></div>
        <div><span>시대성</span><b>${c.시대성}</b></div>
        <div><span>희소성</span><b>${c.희소성}</b></div>
        <div><span>오행</span><b>${typeof c.오행 === 'string' ? c.오행 : c.오행}</b></div>
      </div>
      <details class="nc-detail">
        <summary>더 보기</summary>
        <ul>
          <li><b>영문</b> ${c.영문표기}</li>
          <li><b>별명</b> ${c.별명}</li>
          <li><b>동명이인</b> ${c.동명이인.단계} — ${c.동명이인.코멘트}</li>
          ${c.수리 ? `<li><b>수리길흉</b> ${c.수리.수}수 (${c.수리.길흉})</li>` : ''}
        </ul>
      </details>
    </article>
  `;
}

// ─── 반려동물 폼 ─────────────────────
function initPetForm() {
  const form = $('#pet-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const input = {
      종류: fd.get('종류'),
      성별: fd.get('성별'),
      품종: fd.get('품종') || '',
      털색: fd.get('털색') || '',
      성격: selectedChips('pet-personalities'),
      스타일: fd.get('스타일'),
      병원친화: fd.get('병원친화') === 'on',
      개수: 8,
    };
    lastPetInput = input;
    renderLoading('out-pet', '강아지/고양이 분위기를 살피는 중…');
    setTimeout(() => renderPetResult(반려동물작명(input)), 380);
  });
}

function renderPetResult(r) {
  const el = $('#out-pet');
  let html = `<section class="result-block">`;
  html += renderResultActions();
  html += `<h3 class="result-h">우리 ${r.종류}에게 어울리는 이름들</h3>`;
  html += `<p class="result-sub">부르기 좋은 순으로 정렬했어요. 끝에 "이"가 붙은 친근형도 같이.</p>`;
  html += `<div class="cards pet-cards">`;
  for (const c of r.후보들) {
    html += `
      <article class="pet-card">
        <header><h4>${c.이름}${c.친근형 && c.친근형 !== c.이름 ? `<small>· ${c.친근형}</small>` : ''}</h4><span class="badge">${c.컨셉}</span></header>
        <p class="pet-yulae">${c.유래}</p>
        <div class="nc-grid">
          <div><span>부르기</span><b>${c.부르기점수}</b></div>
          <div><span>발음</span><b>${c.발음점수}</b></div>
        </div>
      </article>`;
  }
  html += `</div>`;
  html += `<div class="actions"><button class="redo-btn" id="pet-redo">다른 이름 다시 받기</button></div>`;
  html += `</section>`;
  el.dataset.populated = '1';
  el.innerHTML = html;
  $('#pet-redo')?.addEventListener('click', () => $('#pet-form')?.requestSubmit());

  mountExtraButton(el, {
    type: 'pet',
    input: () => lastPetInput || {},
    getExisting: () => [...el.querySelectorAll('.pet-card h4')].map(n => (n.textContent || '').split('·')[0].trim()),
    renderExtra: (names) => `<div class="cards pet-cards">${
      names.map(n => `
        <article class="pet-card ai-card">
          <header><h4>${n.이름 || ''}</h4><span class="badge ai-tag">AI</span></header>
          ${n.유래 ? `<p class="pet-yulae">${n.유래}</p>` : ''}
          ${n.코멘트 ? `<p class="pet-yulae">${n.코멘트}</p>` : ''}
        </article>
      `).join('')
    }</div>`,
  });
}

// ─── 회사·팀 폼 ─────────────────────
function initCompanyForm() {
  const form = $('#company-form');
  if (!form) return;

  const 상황sel = $('#company-situation');
  const 팀필드 = $('#company-team-fields');
  const 일반필드 = $('#company-normal-fields');
  const 닉필드 = $('#company-nick-fields');
  function 토글() {
    const v = 상황sel.value;
    팀필드.style.display = v === '팀' ? '' : 'none';
    닉필드.style.display = v === '닉네임' ? '' : 'none';
    일반필드.style.display = (v === '팀' || v === '닉네임') ? 'none' : '';
  }
  상황sel.addEventListener('change', 토글);
  토글();

  // 게임명 입력 실시간 매칭 힌트
  const 게임입력 = $('#game-name-input');
  const 매칭힌트 = $('#game-match-hint');
  if (게임입력 && 매칭힌트) {
    const 매칭찾기 = (name) => {
      if (!name) return null;
      const k = name.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
      if (GAME_ALIASES[k]) return GAME_ALIASES[k];
      for (const key of Object.keys(GAME_ALIASES)) {
        if (k.includes(key) || (key.length >= 2 && key.includes(k))) return GAME_ALIASES[key];
      }
      return null;
    };
    게임입력.addEventListener('input', () => {
      const cat = 매칭찾기(게임입력.value);
      if (!게임입력.value.trim()) {
        매칭힌트.textContent = '알려진 게임이면 자동으로 풀을 매칭하고, 모르는 게임이면 아래 장르를 사용합니다.';
        매칭힌트.className = 'hint';
      } else if (cat) {
        매칭힌트.textContent = `✓ "${카테고리라벨[cat] || cat}" 풀로 자동 매칭됨`;
        매칭힌트.className = 'hint ok';
      } else {
        매칭힌트.textContent = `· 알려진 게임 목록에 없음 — 아래 장르 선택을 따릅니다.`;
        매칭힌트.className = 'hint warn';
      }
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const 상황 = fd.get('상황');

    if (상황 === '닉네임') {
      const input = {
        게임명: (fd.get('게임명') || '').toString().trim(),
        장르: fd.get('장르') || 'auto',
        스타일: fd.get('닉스타일') || 'auto',
        핵심키워드: (fd.get('닉키워드') || '').toString().split(/[ ,]+/).filter(Boolean),
        개수: 12,
      };
      lastNickInput = input;
      renderLoading('out-company', '닉네임 한 줄씩 손글씨로 적어보는 중…');
      setTimeout(() => renderNickResult(닉네임작명(input)), 380);
      return;
    }

    const input = {
      상황,
      업종: fd.get('업종') || '',
      이미지: selectedChips('company-images'),
      핵심키워드: (fd.get('핵심키워드') || '').toString().split(/[ ,]+/).filter(Boolean),
      스타일: fd.get('스타일'),
      분위기: fd.get('분위기') || 'mid',
      개수: 상황 === '팀' ? 12 : 8,
    };
    lastCompanyInput = input;
    renderLoading('out-company', '간판 위에 글자를 올려보는 중…');
    setTimeout(() => renderCompanyResult(회사작명(input)), 380);
  });
}

function renderNickResult(r) {
  const el = $('#out-company');
  // PDF 액션은 닉네임에선 생략
  const 헤더타이틀 = r.게임명
    ? `${r.게임명} 닉네임 후보`
    : `${r.후보들[0]?.카테고리라벨 || '게임'} 닉네임 후보`;
  let html = `<section class="result-block">`;
  html += `<h3 class="result-h">${헤더타이틀}</h3>`;
  // 매칭 정보
  let 매칭정보 = '';
  if (r.게임명) {
    if (r.자동매칭) {
      매칭정보 = `<span class="pill ok">자동 매칭 — ${r.후보들[0]?.카테고리라벨} 풀</span>`;
    } else {
      매칭정보 = `<span class="pill warn">알려진 게임 목록에 없어 — ${r.후보들[0]?.카테고리라벨} 풀로 생성</span>`;
    }
  }
  html += `<p class="result-sub">${매칭정보} 로비/서버에서 한 번 외쳤을 때 어색하지 않은 톤으로 골랐어요. 각 카드 안에 변형(_99, _kr 등)도 함께.</p>`;
  html += `<div class="cards comp-cards">`;
  for (const c of r.후보들) {
    html += `<article class="comp-card">
      <header><h4>${c.이름}</h4><span class="badge">${c.길이}자</span></header>
      <p class="slogan">${c.코멘트}</p>
      <details><summary>변형 보기</summary><ul>${c.변형.map(v => `<li>${v}</li>`).join('')}</ul></details>
    </article>`;
  }
  html += `</div>`;
  html += `<div class="actions"><button class="redo-btn" id="nick-redo">다른 닉네임 받기</button></div>`;
  html += `</section>`;
  el.dataset.populated = '1';
  el.innerHTML = html;
  $('#nick-redo')?.addEventListener('click', () => $('#company-form')?.requestSubmit());

  mountExtraButton(el, {
    type: 'nickname',
    input: () => lastNickInput || {},
    getExisting: () => [...el.querySelectorAll('.comp-card h4')].map(n => (n.textContent || '').trim()),
    renderExtra: (names) => `<div class="cards comp-cards">${
      names.map(n => `
        <article class="comp-card ai-card">
          <header><h4>${n.이름 || ''}</h4><span class="badge ai-tag">AI</span></header>
          ${n.코멘트 ? `<p class="slogan">${n.코멘트}</p>` : ''}
        </article>
      `).join('')
    }</div>`,
  });
}

function renderCompanyResult(r) {
  const el = $('#out-company');
  let html = `<section class="result-block">`;
  html += renderResultActions();
  html += `<h3 class="result-h">간판 위에 올려본 이름들</h3>`;
  html += `<div class="cards comp-cards">`;
  for (const c of r.후보들) {
    html += `<article class="comp-card">
      <header><h4>${c.이름}</h4>${c.톤라벨 ? `<span class="badge">${c.톤라벨}</span>` : `<span class="badge">${c.위트 || ''}</span>`}</header>
      ${c.슬로건 ? `<p class="slogan">"${c.슬로건}"</p>` : ''}
      ${c.코멘트 ? `<p class="slogan">${c.코멘트}</p>` : ''}
      ${c.로고모티프 ? `<p class="motif">로고 모티프 · ${c.로고모티프}</p>` : ''}
      ${c.도메인후보 ? `<details><summary>도메인 후보</summary><ul>${c.도메인후보.map(d => `<li>${d.도메인}</li>`).join('')}</ul></details>` : ''}
    </article>`;
  }
  html += `</div>`;
  html += `<div class="actions"><button class="redo-btn" id="comp-redo">다른 이름 다시 받기</button></div>`;
  html += `</section>`;
  el.dataset.populated = '1';
  el.innerHTML = html;
  $('#comp-redo')?.addEventListener('click', () => $('#company-form')?.requestSubmit());

  mountExtraButton(el, {
    type: 'company',
    input: () => lastCompanyInput || {},
    getExisting: () => [...el.querySelectorAll('.comp-card h4')].map(n => (n.textContent || '').trim()),
    renderExtra: (names) => `<div class="cards comp-cards">${
      names.map(n => `
        <article class="comp-card ai-card">
          <header><h4>${n.이름 || ''}</h4><span class="badge ai-tag">AI</span></header>
          ${n.슬로건 ? `<p class="slogan">"${n.슬로건}"</p>` : ''}
          ${n.코멘트 ? `<p class="motif">${n.코멘트}</p>` : ''}
        </article>
      `).join('')
    }</div>`,
  });
}

// ─── init ────────────────────────────
// ─── 즐겨찾기 + 공유 ────────────────
export function mountFavoriteButtons() {
  // 모든 결과 카드에 ♡ 버튼 마운트 (이미 있으면 스킵)
  document.querySelectorAll('.name-card, .pet-card, .comp-card, .tm-card').forEach(card => {
    if (card.querySelector('.card-actions')) return;
    const data = extractCardData(card);
    if (!data) return;
    const id = makeId(data.type, data.이름, data.한자 || '');
    const fav = isFavorite(id);

    const wrap = document.createElement('div');
    wrap.className = 'card-actions';
    wrap.innerHTML = `
      <button class="card-act fav ${fav ? 'on' : ''}" data-act="fav" data-id="${id}" aria-label="저장">
        ${fav ? '♥' : '♡'}
      </button>
      <button class="card-act share" data-act="share" aria-label="이미지로 저장">📷</button>
    `;
    card.appendChild(wrap);

    wrap.querySelector('[data-act="fav"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const added = toggleFavorite({ id, ...data });
      const btn = e.currentTarget;
      btn.classList.toggle('on', added);
      btn.textContent = added ? '♥' : '♡';
      updateFavCount();
    });
    wrap.querySelector('[data-act="share"]').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadShareCard(data);
    });
  });
}

function extractCardData(card) {
  if (card.classList.contains('name-card')) {
    return {
      type: 'person',
      이름: card.querySelector('.kor')?.textContent || '',
      한자: card.querySelector('.hanja')?.textContent || '',
      의미: card.querySelector('.nc-meaning')?.textContent || '',
      코멘트: card.querySelector('.nc-first')?.textContent || '',
    };
  }
  if (card.classList.contains('pet-card')) {
    return {
      type: 'pet',
      이름: card.querySelector('h4')?.textContent?.split('·')[0].trim() || '',
      의미: card.querySelector('.pet-yulae')?.textContent?.slice(0, 80) || '',
      코멘트: card.querySelector('.badge')?.textContent || '',
    };
  }
  if (card.classList.contains('comp-card')) {
    return {
      type: 'company',
      이름: card.querySelector('h4')?.textContent || '',
      의미: card.querySelector('.slogan')?.textContent || '',
      코멘트: card.querySelector('.badge')?.textContent || '',
    };
  }
  if (card.classList.contains('tm-card')) {
    return {
      type: 'taemyung',
      이름: card.querySelector('.tm-name')?.textContent || '',
      의미: card.querySelector('.tm-badge')?.textContent || '',
      코멘트: card.querySelector('.tm-comment')?.textContent || '',
    };
  }
  return null;
}

function updateFavCount() {
  const el = $('#fav-count');
  if (!el) return;
  const n = getFavorites().length;
  el.textContent = n;
  el.style.display = n > 0 ? '' : 'none';
}

function initFavorites() {
  updateFavCount();
  const btn = $('#favorites-btn');
  const modal = $('#fav-modal');
  if (!btn || !modal) return;

  btn.addEventListener('click', () => openFavModal());
  modal.querySelectorAll('[data-close]').forEach(c => c.addEventListener('click', () => modal.hidden = true));
  $('#fav-clear')?.addEventListener('click', () => {
    if (confirm('저장한 이름을 전부 비울까요?')) {
      clearAll();
      updateFavCount();
      renderFavList();
    }
  });
}

function openFavModal() {
  const modal = $('#fav-modal');
  if (!modal) return;
  renderFavList();
  modal.hidden = false;
}

function renderFavList() {
  const list = $('#fav-list');
  if (!list) return;
  const items = getFavorites();
  if (!items.length) {
    list.innerHTML = `<p class="fav-empty">아직 저장한 이름이 없어요. 결과 카드의 <b>♡</b>를 눌러 마음에 든 이름을 모아보세요.</p>`;
    return;
  }
  const typeLabel = { person: '인물·개명', pet: '반려동물', company: '회사·팀', taemyung: '태명' };
  list.innerHTML = items.map(f => `
    <article class="fav-item">
      <div class="fav-main">
        <span class="fav-type">${typeLabel[f.type] || f.type}</span>
        <h4>${f.한자 ? `<span class="fav-han">${f.한자}</span>` : ''}<span>${f.이름}</span></h4>
        ${f.의미 ? `<p class="fav-meaning">${f.의미}</p>` : ''}
      </div>
      <div class="fav-acts">
        <button class="card-act share" data-share-id="${f.id}" aria-label="이미지">📷</button>
        <button class="card-act remove" data-remove="${f.id}" aria-label="제거">×</button>
      </div>
    </article>
  `).join('');
  list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', e => {
    removeFavorite(e.currentTarget.dataset.remove);
    updateFavCount();
    renderFavList();
    // 결과 페이지의 ♡ 상태도 갱신
    document.querySelectorAll('.card-act.fav').forEach(btn => {
      if (btn.dataset.id === e.currentTarget.dataset.remove) {
        btn.classList.remove('on');
        btn.textContent = '♡';
      }
    });
  }));
  list.querySelectorAll('[data-share-id]').forEach(b => b.addEventListener('click', e => {
    const id = e.currentTarget.dataset.shareId;
    const item = getFavorites().find(f => f.id === id);
    if (item) downloadShareCard(item);
  }));
}

// 전역 공개 (재렌더 시 호출)
window._mountFavoriteButtons = mountFavoriteButtons;

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initKeywordChips();
  initPersonForm();
  initPetForm();
  initCompanyForm();
  initFavorites();
  // 결과 렌더 후 자동으로 ♡ 마운트되도록 MutationObserver
  const observer = new MutationObserver(() => {
    mountFavoriteButtons();
  });
  ['out-person', 'out-pet', 'out-company'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { childList: true, subtree: true });
  });
  // 첫 진입 시 홈 탭 활성
  $('.tab-btn[data-tab="home"]')?.click();
});
