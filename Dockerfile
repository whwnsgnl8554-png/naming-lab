# 작명연구소 — Cloud Run 컨테이너 (Caddy 기반 정적 서빙)
# 멀티스테이지로 빌드 컨텍스트와 런타임을 분리해 이미지를 작게 유지.

# ---- 1단계: 정적 자산만 추림 ----
FROM alpine:3.20 AS assets
WORKDIR /srv
# .dockerignore가 .git·README·deploy.yml 등 불필요 파일을 거른다.
COPY . .

# ---- 2단계: 런타임 (Caddy) ----
FROM caddy:2.8-alpine AS runtime

# 비루트 사용자로 실행 (보안). caddy 이미지는 기본적으로 root이지만 setcap을 통해 비루트 실행 가능.
# Cloud Run은 컨테이너를 비루트로 권장하므로 명시.
RUN adduser -D -u 10001 caddy-user

WORKDIR /srv
COPY --from=assets --chown=caddy-user:caddy-user /srv /srv
COPY --chown=caddy-user:caddy-user Caddyfile /etc/caddy/Caddyfile

# Cloud Run이 주입하는 PORT 환경 변수에 맞춰 Caddy가 듣게 한다.
# Caddyfile에서 {$PORT:8080} 으로 치환.
ENV PORT=8080
EXPOSE 8080

USER caddy-user

# 헬스체크는 Cloud Run 측에서 처리. Caddy를 포그라운드로 실행.
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
