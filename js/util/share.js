// SNS용 정사각 이미지 카드 다운로드
//   - 외부 라이브러리 X (SVG → Canvas → PNG)
//   - 1080×1080, 작명연구소 시그니처 포함

const SIZE = 1080;

function escapeXml(s) {
  return String(s || '').replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c]));
}

function pickTheme(type) {
  switch (type) {
    case 'pet':       return { fg: '#b89043', bg1: '#fdf5dd', bg2: '#f8edcb', label: '반려동물' };
    case 'company':   return { fg: '#2f7a5e', bg1: '#fdf5dd', bg2: '#e8f0e2', label: '회사·팀' };
    case 'taemyung':  return { fg: '#b89043', bg1: '#fdf5dd', bg2: '#f5e9c0', label: '태명' };
    case 'person':
    default:          return { fg: '#b94527', bg1: '#fdf5dd', bg2: '#f8e1d5', label: '인물·개명' };
  }
}

function makeSVG(item) {
  const theme = pickTheme(item.type);
  const 한자 = escapeXml(item.한자 || '');
  const 이름 = escapeXml(item.이름 || '');
  const 의미 = escapeXml((item.의미 || '').slice(0, 40));
  const 코멘트 = escapeXml((item.코멘트 || '').slice(0, 80));

  // 글자 크기 자동 조정
  const 한자크기 = 한자.length <= 2 ? 280 : 한자.length === 3 ? 220 : 170;
  const 이름크기 = 이름.length <= 3 ? 130 : 이름.length === 4 ? 110 : 90;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
    <pattern id="hanji" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#b89043" stroke-width="0.5" stroke-opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#hanji)"/>
  <!-- 모서리 마크 -->
  <rect x="60" y="60" width="${SIZE-120}" height="${SIZE-120}" fill="none" stroke="${theme.fg}" stroke-width="1.5" stroke-opacity="0.18" rx="20"/>
  <!-- 좌상단 도장 -->
  <g transform="translate(120,120)">
    <rect width="80" height="80" rx="12" fill="${theme.fg}"/>
    <rect x="6" y="6" width="68" height="68" rx="8" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/>
    <text x="40" y="60" font-family="Gowun Batang, Noto Serif KR, serif" font-size="48" font-weight="700" fill="#fbf5e3" text-anchor="middle">名</text>
  </g>
  <!-- 카테고리 -->
  <text x="220" y="155" font-family="Noto Sans KR, sans-serif" font-size="22" fill="${theme.fg}" font-weight="600" letter-spacing="0.06em">${theme.label.toUpperCase()}</text>
  <text x="220" y="188" font-family="Gowun Batang, Noto Serif KR, serif" font-size="26" fill="#25180e" font-weight="700">작명연구소</text>

  <!-- 메인: 한자 -->
  ${한자 ? `<text x="${SIZE/2}" y="${SIZE/2 - 40}" font-family="Gowun Batang, Noto Serif KR, serif" font-size="${한자크기}" font-weight="700" fill="${theme.fg}" text-anchor="middle" letter-spacing="0.08em">${한자}</text>` : ''}
  <!-- 한글 이름 -->
  <text x="${SIZE/2}" y="${한자 ? SIZE/2 + 130 : SIZE/2 + 20}" font-family="Gowun Batang, Noto Serif KR, serif" font-size="${이름크기}" font-weight="700" fill="#25180e" text-anchor="middle" letter-spacing="-0.02em">${이름}</text>
  <!-- 의미 -->
  ${의미 ? `<text x="${SIZE/2}" y="${SIZE/2 + 230}" font-family="Noto Sans KR, sans-serif" font-size="34" fill="#5b4836" text-anchor="middle">${의미}</text>` : ''}
  <!-- 코멘트(손글씨 느낌) -->
  ${코멘트 ? `<text x="${SIZE/2}" y="${SIZE - 180}" font-family="Nanum Pen Script, cursive" font-size="40" fill="#8a7a60" text-anchor="middle">${코멘트}</text>` : ''}

  <!-- 푸터 -->
  <line x1="${SIZE/2 - 60}" y1="${SIZE - 100}" x2="${SIZE/2 + 60}" y2="${SIZE - 100}" stroke="${theme.fg}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="${SIZE/2}" y="${SIZE - 65}" font-family="Gowun Batang, Noto Serif KR, serif" font-size="22" fill="${theme.fg}" text-anchor="middle" letter-spacing="0.1em" font-weight="700">名 작명연구소</text>
</svg>`;
}

export async function downloadShareCard(item) {
  try {
    const svg = makeSVG(item);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // SVG → PNG 변환
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    URL.revokeObjectURL(url);

    canvas.toBlob(b => {
      const a = document.createElement('a');
      const dlUrl = URL.createObjectURL(b);
      a.href = dlUrl;
      const safe = (item.이름 || 'name').replace(/[^가-힣a-zA-Z0-9]/g, '_');
      a.download = `작명연구소_${safe}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
    }, 'image/png');
  } catch (e) {
    console.error('share card failed', e);
    alert('이미지 생성에 실패했어요: ' + e.message);
  }
}
