// 앱 셸 — 탭 라우팅, 입력 폼, 결과 렌더링

import { 인물작명 } from './naming/person.js';
import { 반려동물작명 } from './naming/pet.js';
import { 회사작명 } from './naming/company.js';
import { 닉네임작명 } from './naming/nickname.js';
import { GAME_ALIASES } from './data/nickname.js';
import { mountExtraButton } from './ai.js';

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
  function 구분동기화() {
    const v = (form.querySelector('input[name="구분"]:checked') || {}).value || '신생아';
    for (const l of 라벨들) l.textContent = l.dataset[v];
    if (v === '신생아') {
      안내.textContent = '예정일은 변동될 수 있어 사주 결과가 실제 출생일과 다를 수 있습니다. 출산 후 정확한 생일로 다시 받아보시는 걸 권합니다.';
      안내.className = 'hint warn';
      sub.innerHTML = '<b>출산 예정일</b>로 입력해 주세요. 예정일 기준으로 사주를 추정해, 부족한 오행을 채울 글자 위주로 추천합니다. 모르면 비워도 됩니다.';
    } else {
      안내.textContent = '실제 생년월일을 그대로 입력해 주세요. 출생 시간을 알면 사주가 더 정확해져요.';
      안내.className = 'hint ok';
      sub.innerHTML = '<b>실제 생년월일</b>(필요시 출생 시간)을 넣으면 사주에 부족한 오행을 채울 글자 위주로 추천합니다. 모르면 비워도 됩니다.';
    }
  }
  form.querySelectorAll('input[name="구분"]').forEach(r => r.addEventListener('change', 구분동기화));
  구분동기화();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const input = {
      구분: fd.get('구분'),
      성: fd.get('성') || '',
      성별: fd.get('성별'),
      한자사용: fd.get('한자사용') === 'on',
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
    lastPersonInput = input;
    renderLoading('out-person', '먹을 갈고 종이를 펴는 중…');
    setTimeout(() => {
      const result = 인물작명(input);
      renderPersonResult(result);
    }, 380);
  });
}

function renderLoading(outId, msg) {
  const el = $(`#${outId}`);
  el.dataset.populated = '1';
  el.innerHTML = `<div class="loading"><div class="brush"></div><p>${msg}</p></div>`;
}

function renderPersonResult(result) {
  const el = $('#out-person');
  const 사주 = result.사주;
  let html = `<section class="result-block">`;
  html += `<h3 class="result-h">받아 든 이름들</h3>`;

  if (사주) {
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
  }

  html += `<div class="cards">`;
  for (const c of result.후보들) {
    html += renderPersonCard(c);
  }
  html += `</div>`;

  html += `<div class="actions"><button class="redo-btn" id="person-redo">다른 이름 다시 받기</button></div>`;
  html += `</section>`;

  el.innerHTML = html;
  $('#person-redo')?.addEventListener('click', () => $('#person-form')?.requestSubmit());

  // AI 추천 더 받기
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
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initKeywordChips();
  initPersonForm();
  initPetForm();
  initCompanyForm();
  // 첫 진입 시 홈 탭 활성
  $('.tab-btn[data-tab="home"]')?.click();
});
