// Gemini 백엔드 호출 + 결과 카드 렌더

import { API_URL, aiEnabled } from './config.js';

export async function fetchExtra(type, input, existing) {
  if (!API_URL) throw new Error('AI 추천 백엔드가 설정되지 않았습니다.');
  const res = await fetch(`${API_URL}/api/extra-names`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input, existing }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || detail.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.names || [];
}

// 버튼 마운트 헬퍼
export function mountExtraButton(container, { type, input, getExisting, renderExtra }) {
  if (!aiEnabled()) return;            // API URL 없으면 버튼 자체를 안 보이게
  if (container.querySelector('.ai-extra-wrap')) return;  // 중복 방지

  const wrap = document.createElement('div');
  wrap.className = 'ai-extra-wrap';
  wrap.innerHTML = `
    <button class="ai-btn" type="button">
      <span class="ai-spark">✦</span>
      AI 추천 더 받기
      <small>Gemini가 즉석에서 추가 생성</small>
    </button>
    <div class="ai-extra-out" aria-live="polite"></div>
  `;
  container.appendChild(wrap);

  const btn = wrap.querySelector('.ai-btn');
  const out = wrap.querySelector('.ai-extra-out');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.classList.add('loading');
    out.innerHTML = `<p class="ai-status">먹을 한 번 더 갈고, 종이 한 장 더 펴는 중…</p>`;
    try {
      const names = await fetchExtra(type, input(), getExisting());
      if (!names.length) {
        out.innerHTML = `<p class="ai-status err">결과가 비어 있어요. 다시 시도해 주세요.</p>`;
        return;
      }
      out.innerHTML = `<h4 class="ai-h">AI가 더 받아온 이름들</h4>` + renderExtra(names);
    } catch (e) {
      out.innerHTML = `<p class="ai-status err">${e.message}</p>`;
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });
}
