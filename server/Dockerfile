# 작명연구소 AI 백엔드 — Node.js + Gemini API
# 멀티스테이지: 의존성 분리해 이미지 작게 유지.

# ---- 1단계: 의존성 ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
# package-lock.json 없이도 동작하도록 npm install (의존성 한 개라 잠금 안 해도 무방)
RUN npm install --omit=dev --no-audit --no-fund

# ---- 2단계: 런타임 ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# 비루트 사용자 (node:22-alpine 이미지에 node 유저 기본 포함)
USER node

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node index.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
