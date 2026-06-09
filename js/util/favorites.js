// 즐겨찾기 — localStorage 기반
//   {id, type, 이름, 한자, 의미, 시각, ...}

const KEY = 'naming-lab:favorites';

export function getFavorites() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function isFavorite(id) {
  return getFavorites().some(f => f.id === id);
}

export function toggleFavorite(item) {
  const list = getFavorites();
  const idx = list.findIndex(f => f.id === item.id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift({ ...item, savedAt: Date.now() });
  }
  // 최대 100개 보관
  while (list.length > 100) list.pop();
  localStorage.setItem(KEY, JSON.stringify(list));
  return idx < 0; // true면 추가됨
}

export function removeFavorite(id) {
  const list = getFavorites().filter(f => f.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearAll() {
  localStorage.removeItem(KEY);
}

// 카드에서 고유 id 생성 — type + 이름 + 한자(있으면)
export function makeId(type, name, hanja = '') {
  return `${type}:${name}${hanja ? '|' + hanja : ''}`;
}
