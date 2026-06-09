# 작명연구소 (naming-lab)

사람·반려동물·회사·가게·팀 — 무엇이든 이름을 짓는 종합 작명 웹사이트.

## 비용 0원 구조 (Cloud Run)

- **Cloud Run 무료 한도 안에서 운영** — 월 200만 요청, 360,000 vCPU-초, 180,000 GiB-초.
- 모든 작명 로직은 클라이언트에서 실행 — 서버는 단순 정적 파일 서빙만 (Caddy).
- `--min-instances=0` → 트래픽 없을 때 인스턴스 0개, 진짜 0원.
- `--max-instances=3` → 트래픽 폭주로 무료 한도 초과해도 과금 폭탄 방지 (cost cap).
- 서울 리전(asia-northeast3)으로 한국 사용자 latency 최소.

## 구조

```
naming-lab/
  index.html               메인 페이지 (인라인 CSS, 탭 UI)
  favicon.svg
  .github/workflows/deploy.yml  Cloudflare Pages 자동 배포
  js/
    app.js                 앱 셸 — 라우팅·폼·렌더링
    data/
      hanja.js             인명용 한자 ~150자 (음/훈/획/오행/성별)
      ohaeng.js            오행 상생상극, 천간·지지, 음오행, 수리길흉
      keywords.js          느낌 키워드 / 반려동물 컨셉 / 회사 톤 풀
      syllables.js         순한글 음절·인기 한국 이름 풀
    util/
      hangul.js            한글 자모 분리·자음 충돌·모음 종결
      saju.js              사주(연월일시) 60갑자 환산 + 오행 비중
      score.js             발음·시대성·희소성·부르기·외국인친화 점수
    naming/
      person.js            인물·개명 — 사주 부족 오행 기반 한자 조합
      pet.js               반려동물 — 품종·털색·성격 매핑된 컨셉 추출
      company.js           회사·가게·팀 — 어근+어미 합성, 슬로건/도메인
```

## 작명 로직 요약

### 인물·개명
1. 양력 생년월일시 → 60갑자(천간·지지) 환산
2. 각 기둥의 천간·지지 오행 카운트 → 가장 적은 오행을 "보충 대상" 선정
3. 보충 오행 한자에 가중치 +10, 키워드 매칭 +8, 성별 일치 +5
4. 가중 샘플링으로 첫 글자/둘째 글자 후보 추출 → 조합
5. 한글 발음 점수(자음 충돌·받침)·시대성·희소성 종합
6. 항렬자(돌림자) 지정 시 한 자리 고정
7. 한자 미사용 모드: 순한글 풀에서 추출 (첫 자음 음오행 매칭 가산)

### 반려동물
- 견종/묘종 × 톤 매핑 테이블 (말티즈 → cute·food_west, 시바견 → food_kor·nature)
- 외모(흰색·검정·갈색·치즈) × 톤 가산
- 성격(까칠·바보·도도·겁많음) × 톤 가산
- 컨셉 풀: 한식간식·디저트·자연우주·히어로·90년대·귀여움·쿨함·한국식 옛이름·웃긴·영어
- 끝 글자가 모음이면 "이" 자동 추가 (콩 → 콩이)
- 부르기 점수(2~3음절·모음 종결·받침 적음) 정렬
- "병원 호명 친화" 필터로 민망한 단어 제외

### 회사·가게·팀
- 업종 × 톤 매핑 (카페→warm·food, IT→tech·trendy)
- 이미지(신뢰·트렌디·따뜻함·강렬함·기술감) × 가산
- 어근 + 어미 합성. 한글/영문/약자형 스타일
- 슬로건 자동 생성 (8개 템플릿 × 핵심 키워드 풀)
- 도메인 후보 (.com / .co.kr / .io / .kr) — 가용성은 별도 확인 안내
- 로고 모티프 한 줄 제안
- 팀명: 진지/적당/대놓고웃김 위트 3단계, 25개 위트 풀

## 기발한 트위스트

- **첫인상 코멘트**: "교실 뒷자리에서 누가 부르면 돌아볼 이름" 처럼 이름의 분위기를 한 줄로 묘사
- **별명 자동**: 한글 마지막 음절을 변형해 친구가 부를 호칭 생성
- **영문 표기**: 개정 로마자 자동 변환
- **동명이인 흔함도**: 2024 신생아 인기 풀 vs 클래식 풀 비교
- **수리길흉**: 81 수리 길수/흉수 표 자동 매칭
- **사주 오행 막대**: 결과 카드 위에 오행 5개 비중을 컬러 막대로 시각화
- **시간 모르면 비워도 OK**: 시주 없이 연·월·일 3주만으로 추정
- **다크/라이트 토글**: 먹(다크) ↔ 한지(라이트) 테마

## 디자인 톤

- 한지 결 텍스처(repeating-linear-gradient) + 단청 코랄·청록 강조
- 손글씨(Nanum Pen Script)로 첫인상 카피 표시
- 직인(seal) 모티프: 헤더의 `名` 도장
- 사무적·식상한 표현 금지. 가격·할인 호객 금지.

## 로컬에서 실행

브라우저에서 ES Modules를 쓰므로 `file://` 직접 열기는 안 되고 정적 서버 필요:

```bash
# Python
python -m http.server 8000

# 또는 Node
npx serve .
```

`http://localhost:8000` 접속.

## 배포 — Cloud Run

### 한 번만: GCP 프로젝트 셋업

```bash
# 1) 프로젝트 만들기 (또는 기존 프로젝트 사용)
gcloud projects create my-naming-lab --name="작명연구소"
gcloud config set project my-naming-lab

# 2) 결제 계정 연결 — 무료 한도 안에서는 청구되지 않지만 필요함
#    https://console.cloud.google.com/billing 에서 본인 계정 연결

# 3) 필요한 API 활성화
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### 가장 간편한 배포 (로컬에서 한 줄)

```bash
cd naming-lab

gcloud run deploy naming-lab \
  --source=. \
  --region=asia-northeast3 \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --cpu=1 \
  --memory=512Mi \
  --port=8080 \
  --concurrency=80 \
  --execution-environment=gen2
```

처음 실행 시 Cloud Build로 컨테이너 빌드 → Artifact Registry 저장 → Cloud Run 배포까지 자동. 끝나면 `https://naming-lab-xxxxx-an.a.run.app` URL이 나옵니다.

### GitHub Actions 자동 배포 (push만으로 배포)

`.github/workflows/deploy-cloud-run.yml`이 main 브랜치 push 때 자동 동작. **Workload Identity Federation**으로 서비스 계정 JSON 키를 GitHub에 올리지 않고 안전하게 인증합니다.

1) **Workload Identity Pool/Provider 만들기** (한 번):

```bash
# 변수
export PROJECT_ID=$(gcloud config get-value project)
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export POOL=github-pool
export PROVIDER=github-provider
export REPO=내GitHub아이디/저장소이름            # ← 본인 GitHub repo로 변경

# 풀 생성
gcloud iam workload-identity-pools create $POOL \
  --location=global \
  --display-name="GitHub Actions Pool"

# OIDC provider 생성 (GitHub Actions의 토큰을 신뢰)
gcloud iam workload-identity-pools providers create-oidc $PROVIDER \
  --location=global \
  --workload-identity-pool=$POOL \
  --display-name="GitHub Actions" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == '$REPO'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 배포 전용 서비스 계정
gcloud iam service-accounts create naming-lab-deployer \
  --display-name="Cloud Run Deployer for naming-lab"

# 필요한 권한만 (최소 권한 원칙)
SA="naming-lab-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
for role in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer roles/iam.serviceAccountUser roles/storage.admin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="$role"
done

# WIF를 통해 이 SA로 임퍼소네이트 허용
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"

# GitHub에 넣을 값 출력
echo "WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "WIF_SERVICE_ACCOUNT=${SA}"
echo "GCP_PROJECT_ID=${PROJECT_ID}"
```

2) **GitHub 저장소 → Settings → Secrets and variables → Actions** 에 3개 시크릿 등록:
   - `WIF_PROVIDER` — 위 출력값
   - `WIF_SERVICE_ACCOUNT` — 위 출력값
   - `GCP_PROJECT_ID` — 프로젝트 ID

3) `main`에 push하면 자동 배포. 워크플로우 끝부분에 URL이 찍힙니다.

## 보안 설정 (적용된 항목)

| 항목 | 설정 | 값/방법 |
|---|---|---|
| TLS / HTTPS | Cloud Run 기본 제공 | 자동 (`*.run.app` 또는 커스텀 도메인) |
| HSTS | 응답 헤더 | `max-age=31536000; includeSubDomains; preload` |
| 클릭재킹 | 응답 헤더 | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| MIME 스니핑 | 응답 헤더 | `X-Content-Type-Options: nosniff` |
| 리퍼러 | 응답 헤더 | `Referrer-Policy: strict-origin-when-cross-origin` |
| 브라우저 권한 | 응답 헤더 | `Permissions-Policy` — 카메라/마이크/위치/USB 등 모두 차단 |
| CSP | 응답 헤더 | `default-src 'self'`, Google Fonts만 화이트리스트 |
| CORP / COOP | 응답 헤더 | `same-origin` — 다른 오리진의 임베드/공유 차단 |
| 서버 정보 | 응답 헤더 | `Server`·`X-Powered-By` 제거 |
| 컨테이너 권한 | Dockerfile | 비루트 사용자(`caddy-user` uid=10001) |
| Caddy admin API | 비활성화 | `admin off` |
| 인증 | Cloud Run | `--allow-unauthenticated` (정적 사이트라 public) |
| 비용 cap | Cloud Run | `--max-instances=3` (DDoS·트래픽 폭주 자연 제한) |
| 인그레스 | Cloud Run | `all` (public). 내부 전용 필요 시 `internal`로 변경 가능 |

### 커스텀 도메인 연결 (선택)

```bash
gcloud run domain-mappings create \
  --service=naming-lab \
  --domain=jakmyung.example.com \
  --region=asia-northeast3
```

DNS에 CNAME 추가하면 Cloud Run이 자동으로 TLS 인증서 발급합니다.

### 로컬에서 컨테이너 미리 보기

```bash
docker build -t naming-lab .
docker run --rm -p 8080:8080 -e PORT=8080 naming-lab
# 브라우저에서 http://localhost:8080
```

### 정적 사이트 그대로 무료 호스팅도 가능 (옵션)

Cloud Run 안 쓰고 GitHub Pages·Netlify·Cloudflare Pages 어디든 폴더째 올라가는 순수 정적 사이트입니다. `Dockerfile`·`Caddyfile`은 무시되고 정적 자산만 서빙됩니다.

---

## 🤖 AI 추천 (Gemini) 백엔드 — 선택

기본 작명은 규칙 + 5,034개 큐레이팅 풀로 동작하지만, 결과 페이지의 **"AI 추천 더 받기"** 버튼을 누르면 Gemini가 즉석에서 추가 후보를 생성해 카드로 추가합니다.

### 무료 한도
Gemini 1.5 Flash 무료 한도: **분당 15회, 일 1,500회**. 작명 사이트로 이 한도 다 못 씁니다.

### 1) API 키 발급
🔗 https://aistudio.google.com/apikey 접속 → **Get API key** → **Create API key** → 키 복사

### 2) Secret Manager에 키 저장 (안전)
Cloud Shell에서:

```bash
PROJECT_ID="naming-lab"
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# 키를 시크릿으로 저장 (값은 프롬프트에서 입력)
echo -n "여기에_복사한_GEMINI_API_KEY_붙여넣기" | \
  gcloud secrets create gemini-api-key --data-file=- --project=$PROJECT_ID

# 백엔드 SA가 시크릿 읽도록 권한 부여
SA="naming-lab-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID
```

### 3) 백엔드 Cloud Run 서비스 배포

```bash
cd ~/naming-lab/server   # Cloud Shell에서 clone한 위치 기준

# 프론트 URL을 ALLOWED_ORIGINS에 넣고 배포
FRONTEND_URL="https://naming-lab-360236514121.asia-northeast3.run.app"

gcloud run deploy naming-lab-api \
  --source=. \
  --region=asia-northeast3 \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=20 \
  --timeout=60s \
  --min-instances=0 \
  --max-instances=2 \
  --execution-environment=gen2 \
  --set-env-vars="ALLOWED_ORIGINS=${FRONTEND_URL},http://localhost:8775" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

배포 끝나면 출력에서 `Service URL: https://naming-lab-api-xxxxxx-an.a.run.app` 복사.

### 4) 프론트에 API URL 주입
`index.html`의 아래 줄에서 URL을 본인 백엔드 URL로 교체:

```html
<script>
  window.NAMING_LAB_API_URL = 'https://naming-lab-api-xxxxxx.asia-northeast3.run.app';
</script>
```

그리고 push:
```bash
git add index.html && git commit -m "feat: AI 백엔드 URL 연결" && git push
```

→ 1분 뒤 사이트에 **"AI 추천 더 받기"** 버튼이 활성화됩니다.

### 5) 동작 확인
- 결과 페이지에서 버튼 클릭 → 2~3초 후 "AI가 더 받아온 이름들" 카드 추가
- 에러 메시지가 빨간 줄로 뜨면 → Cloud Run 로그 확인:
  ```bash
  gcloud run services logs read naming-lab-api --region=asia-northeast3 --limit=20
  ```

### 보안
- **API 키는 절대 프론트 코드에 넣지 마세요** — Secret Manager에서 백엔드 컨테이너로만 주입됨
- **CORS**: `ALLOWED_ORIGINS` 환경변수의 도메인만 호출 가능. 다른 사이트가 백엔드 무단 호출 불가
- **Rate limiting**: 트래픽 폭주 시 Gemini 자체 한도 + Cloud Run `max-instances=2`로 자연 cap. 더 엄격한 제한 원하면 별도 미들웨어 추가 가능

## 면책

이름은 한 번 정하면 오래 부르는 일이라, 추천 결과를 그대로 쓰기보다 마음에 드는 글자 조합을 골라 직접 다듬어 보시는 걸 권합니다. 회사·상호명은 등록 전 KIPRIS 동일·유사 상표 검색 필수.

사주·오행 해석은 학파마다 다를 수 있으며, 본 사이트는 작명용 기준(자원오행 + 음오행 + 수리오행)을 단순화해 구현했습니다. 참고용으로만 활용해 주세요.
