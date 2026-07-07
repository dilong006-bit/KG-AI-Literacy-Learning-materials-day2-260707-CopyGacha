# 🎰 Copy Gacha

**검증된 6가지 공식으로 마케팅 카피를 뽑고, 추적하고, 학습하는 웹앱 — 카피에 어울리는 중심 이미지까지 자동 페어링**

제품 키워드 하나만 넣으면 검증된 카피라이팅 프레임워크 기반 헤드라인 6종을 즉시 생성하고,
각 카피에 문맥이 맞는 Unsplash 중심 이미지를 붙여 "바로 쓸 수 있는 비주얼 시안"으로 보여줍니다.

> 사용자 데이터(이력·피드백)는 서버·DB 없이 **100% 브라우저에만** 저장됩니다.
> v4.0의 이미지 기능만 예외로, Unsplash 키를 서명하는 **무상태 서버리스 프록시**(저장·로깅 없음)를 경유합니다.

---

## ✨ 주요 기능

### 카피 생성 (v1.0)
- **6가지 검증 공식** — 숫자형(4U) · 질문형(AIDA) · 혜택형(FAB) · 공포소구형(PAS) · 호기심형(Curiosity Gap) · 트렌드형(4C)
- **한국어 조사 자동 처리** — 받침을 계산해 `을/를`, `이/가`, `로/으로` 등을 정확히 부착
- **톤앤매너 4종** · **룰렛(가챠) 애니메이션** · 복사 / 즐겨찾기 / 같은 공식 다시 생성

### 워크스페이스 고도화 (v2.0)
- **F10 생성 이력**(IndexedDB, 검색·필터·재생성·불러오기) · **F11 리액션 & 코멘트**
- **F12 인기 스타일 학습**(규칙 기반 집계, `🔥 인기` 배지) · **F13 KPI 대시보드**
- **F14 카피 엔진 v2** — 파워워드·감정 트리거, **품질 스코어링(0~100)**, 클리셰 블랙리스트

### 프리미엄 비주얼 (v4.0) 🆕
- **F20 Unsplash 연동** — 무상태 서버리스 프록시(키 미노출·SSRF 방지·다운로드 트리거·어트리뷰션)
- **F21 카피-이미지 페어링** — 입력에서 검색어 도출(한→영), 카드별 문맥 적합 중심 이미지를 비동기 페어링·캐싱(이력 재현, 재생성 시에만 갱신)
- **F22 프리미엄 비주얼** — 카드 상단 이미지 배너 + 대비 스크림(WCAG AA) + 무의존 blur-up + `prefers-reduced-motion/transparency` 대응
- 이미지 실패·키 없음 시 **글래스 카드로 무손실 폴백**(기능 저하 없음)

### 접근성 · 품질
- 전역 키보드 포커스 링, 오류 텍스트 AA 대비, 모바일 터치 타깃 ≥44px, reduced-motion 대응

---

## 🛠 기술 스택

| 구분 | 내용 |
|------|------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Vanilla CSS (디자인 토큰) |
| Storage | IndexedDB (LocalStorage 폴백) |
| Serverless | Vercel Functions (`api/unsplash/*`) — Unsplash 무상태 프록시 |
| Image | Unsplash API (프록시 경유, 핫링크) |
| Deps | clsx (런타임 의존성 최소) |

---

## 🚀 로컬 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 프로덕션 빌드
```

> Node.js 18+ 필요.
> ⚠️ `npm run dev`(Vite)는 `api/` 서버리스 함수를 실행하지 않으므로, 로컬에서는 **이미지가 글래스로 폴백**됩니다(정상). 실제 이미지는 아래 배포 또는 `vercel dev`에서 확인됩니다.

---

## 🔑 환경변수

`.env.example`을 복사해 `.env`를 만드세요. **`.env`는 커밋 금지(.gitignore 처리됨).**

| 변수 | 위치 | 설명 |
|------|------|------|
| `UNSPLASH_ACCESS_KEY` | **서버 전용** | Unsplash Access Key. **`VITE_` 접두사 금지**(붙이면 클라이언트에 노출됨) |
| `VITE_IMAGE_ENABLED` | 클라이언트 | 이미지 기능 on/off (기본 `true`, `false`면 글래스 폴백) |

---

## ▲ Vercel 배포 (목표)

1. 이 저장소를 Vercel에 Import (Framework: **Vite** 자동 감지, Root Directory: 저장소 루트).
2. **Settings → Environment Variables**에 `UNSPLASH_ACCESS_KEY`를 **Secret**으로 추가.
   (선택) `VITE_IMAGE_ENABLED=true`.
3. Deploy. `api/unsplash/{search,download}`는 서버리스 함수로 자동 배포됩니다.

> 로컬에서 실제 이미지까지 확인하려면 `vercel dev` + 위 환경변수를 사용하세요.

---

## 📁 프로젝트 구조

```
api/unsplash/
├── search.js            # Unsplash 검색 무상태 프록시 (F20)
└── download.js          # 다운로드 트리거 프록시 (F20)
src/
├── components/
│   ├── CardMedia.jsx     # 중심 이미지 배너·스크림·어트리뷰션 (F22)
│   ├── HeadlineCard.jsx  # 카피 카드
│   ├── ResultsGrid.jsx · RouletteReel.jsx · ReactionBar.jsx · …
├── hooks/
│   ├── useHeadlineGenerator.js  # 생성 흐름·룰렛·이미지 페어링 연결
│   ├── useCopyImages.js         # 이미지 페어링 타이밍 오케스트레이터 (F21)
│   └── useHistory.js            # 이력 단일 소스 (IndexedDB)
├── utils/
│   ├── unsplash.js       # 프록시 클라이언트·정규화 (F20)
│   ├── imageQuery.js     # 검색어 도출(한→영)·URL 빌드 (F21)
│   ├── generator.js · quality.js · josa.js · stats.js · db.js · …
├── data/  ·  styles/  ·  App.jsx  ·  main.jsx
docs/plan/               # 구현 계획 문서
ref/                     # PRD·기술명세서·디자인 참고
```

---

## 🏗 아키텍처 노트

- **이력이 단일 소스** — `GenerationEntry`가 헤드라인 + 입력 메타 + 피드백 + **중심 이미지(v4)**를 보유. 즐겨찾기·현재 결과는 파생 뷰.
- **저장소 추상화** — IndexedDB 기본, 미지원/차단 시 LocalStorage 폴백. 이미지는 URL·메타만 캐싱(원본 미저장).
- **이미지 = opt-in·비동기·폴백 우선** — 실패해도 글래스 화면으로 무손실. 사용자 데이터는 외부로 전송되지 않음(프록시엔 검색어만 통과).
- **"학습" = 규칙 기반 통계**(ML 아님). v1.0 즐겨찾기는 최초 실행 시 v2 스키마로 1회 자동 마이그레이션.

---

## 📌 문서

- 기획(PRD): `ref/day01-final_project_PRD*.md` (v1.0 → upgrade-01~03)
- 기술명세서: `ref/day01-final_project_TECH-SPEC_upgrade-03.md` (v4.0)
- 구현 계획: `docs/plan/v4-unsplash-visual-plan.md`

---

_KG AI Literacy 학습 프로젝트 · Copy Gacha_
