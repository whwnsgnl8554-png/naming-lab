// 작명연구소 AI 추천 백엔드
// - Gemini 1.5 Flash (무료 한도: 분당 15회, 일 1500회)
// - 단일 엔드포인트 POST /api/extra-names
// - 4가지 타입(person/pet/company/nickname)별 프롬프트 구성
// - CORS: 작명연구소 프론트엔드 origin만 허용
// - 응답은 JSON 배열로 강제

import { createServer } from 'node:http';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.GEMINI_API_KEY;
// 허용 origin — Cloud Run 프론트 도메인, 로컬 개발용 localhost
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://naming-lab-360236514121.asia-northeast3.run.app,http://localhost:8775,http://localhost:8080'
).split(',').map(s => s.trim());

if (!API_KEY) {
  console.error('[FATAL] GEMINI_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 1.1,        // 다양성 ↑
    topP: 0.95,
    maxOutputTokens: 1024,
  },
});

// ─── 프롬프트 빌더 ────────────────────────
function buildPrompt(type, input, existing = []) {
  const 회피 = existing.length
    ? `\n\n다음은 이미 추천된 이름이라 절대 중복되면 안 됩니다:\n${existing.slice(0, 30).join(', ')}\n`
    : '';

  switch (type) {
    case 'person': {
      const { 성 = '', 성별 = 'u', 생년 = '', 키워드 = [], 한자사용 = true } = input;
      const 성별라벨 = 성별 === 'm' ? '남' : 성별 === 'f' ? '여' : '자유';
      return `너는 한국 전통 작명 전문가다. 한국식 이름 후보 8개를 제안하라.
- 성: ${성 || '(미지정)'}
- 성별: ${성별라벨}
- 출생/예정 연도: ${생년 || '(미지정)'}
- 사용자가 원하는 느낌: ${키워드.length ? 키워드.join(', ') : '(없음)'}
- 한자 사용: ${한자사용 ? '한자 조합 포함' : '순한글 위주'}

규칙:
- 이름은 1~3음절. 발음이 자연스럽고 어울려야 한다.
- 너무 흔한 이름(서연·민준·서윤 등)은 1개 이하로만.
- 시적이거나 의미 있는 조합 위주. 김아무개·이아무개 같은 placeholder 금지.
- 가능하면 의외성과 신선함이 있는 조합을 1~2개 포함.
${한자사용 ? '- 한자 조합과 그 뜻을 같이 제시.' : ''}${회피}

JSON 배열로만 응답:
[
  {"한글":"...", ${한자사용 ? '"한자":"...", ' : ''}"뜻":"한 줄 의미", "코멘트":"이름에 어울리는 분위기 한 줄"}
]
다른 텍스트 금지.`;
    }
    case 'pet': {
      const { 종류 = '강아지', 품종 = '', 털색 = '', 성격 = [], 스타일 = 'auto' } = input;
      return `너는 한국 반려인 닉네임/이름 문화에 정통한 작명가다. 반려동물 이름 10개 추천.
- 종류: ${종류}
- 품종: ${품종 || '(미지정)'}
- 털색: ${털색 || '(미지정)'}
- 성격: ${성격.length ? 성격.join(', ') : '(미지정)'}
- 스타일 선호: ${스타일}

규칙:
- 2~3음절 위주, 부르기 좋게.
- 한식 간식·디저트·자연·캐릭터·옛이름 다양하게 섞기.
- 평범한 "뽀삐·초코"만 나오면 NG. 의외의 조합 30% 이상.
- 동물병원 호명에 부끄러운 이름 제외.
${회피}

JSON 배열로만:
[
  {"이름":"...", "유래":"한 줄 어디서 왔는지", "코멘트":"분위기 한 줄"}
]`;
    }
    case 'company': {
      const { 상황 = '회사', 업종 = '', 이미지 = [], 핵심키워드 = [], 스타일 = 'auto' } = input;
      return `너는 한국 브랜드 네이밍 전문가다. ${상황}명 후보 10개 추천.
- 업종: ${업종 || '(미지정)'}
- 추구 이미지: ${이미지.length ? 이미지.join(', ') : '(미지정)'}
- 핵심 키워드: ${핵심키워드.length ? 핵심키워드.join(', ') : '(없음)'}
- 스타일 선호: ${스타일}

규칙:
- 한글 / 영문 / 합성 / 약자 다양하게.
- 상표 충돌 가능성 낮은 신선한 합성 위주. "OO컴퍼니" 같은 뻔한 어미 절제.
- 발음 명료, 외국인도 부르기 쉽게.
- 각 이름에 한 줄 슬로건도 제시.
${회피}

JSON 배열로만:
[
  {"이름":"...", "슬로건":"한 줄", "코멘트":"톤 한 줄"}
]`;
    }
    case 'nickname': {
      const { 게임명 = '', 장르 = 'auto', 스타일 = 'auto', 핵심키워드 = [] } = input;
      return `너는 한국 게이머·인터넷 닉네임 문화에 정통한 작명가다. "${게임명 || '범용 인터넷'}" 닉네임 12개 추천.
- 게임/플랫폼: ${게임명 || '(미지정 — 범용)'}
- 장르: ${장르}
- 스타일 선호: ${스타일}
- 꼭 들어갔으면 하는 단어: ${핵심키워드.length ? 핵심키워드.join(', ') : '(없음)'}

규칙:
- 2~16자.
- 영문 캐멀케이스, 한글, 합성 다양하게.
- 평균값으로 회귀하지 말 것 — 의외의 단어 조합, 시적 표현, 한국 밈, 게임 컬처 정확히 반영.
- 욕설·혐오·정치·외설 제외.
- "GamerName123" 같은 placeholder 절대 금지.
${회피}

JSON 배열로만:
[
  {"이름":"...", "코멘트":"어디서 쓰면 어울리는지 한 줄"}
]`;
    }
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

// ─── Gemini 호출 + JSON 파싱 ──────────────
async function generateNames(type, input, existing) {
  const prompt = buildPrompt(type, input, existing);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // 코드펜스 제거 + JSON 추출
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('Gemini가 JSON 배열을 반환하지 않음');
  }
  const json = cleaned.slice(start, end + 1);
  return JSON.parse(json);
}

// ─── HTTP 서버 ──────────────────────────
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  cors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // 헬스체크
  if (req.method === 'GET' && req.url === '/healthz') {
    return send(res, 200, { ok: true });
  }

  if (req.method !== 'POST' || req.url !== '/api/extra-names') {
    return send(res, 404, { error: 'Not Found' });
  }

  try {
    const body = await readBody(req);
    const { type, input = {}, existing = [] } = body;
    if (!['person', 'pet', 'company', 'nickname'].includes(type)) {
      return send(res, 400, { error: 'Invalid type. person|pet|company|nickname.' });
    }

    const names = await generateNames(type, input, existing);
    return send(res, 200, { names, source: 'gemini-1.5-flash' });
  } catch (err) {
    console.error('[generate] error:', err.message);
    return send(res, 500, { error: 'Generation failed', detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[naming-lab-api] listening on :${PORT}`);
  console.log(`[naming-lab-api] allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
