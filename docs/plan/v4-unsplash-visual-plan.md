---
goal: Copy Gacha v4.0 — 카피에 어울리는 Unsplash 중심 이미지 페어링 + 프리미엄 비주얼 컴포지션
feature: v4.0 (F20 Unsplash 연동 · F21 카피-이미지 페어링 · F22 프리미엄 비주얼)
version: 1.0
date_created: 2026-07-07
last_updated: 2026-07-07
status: Planned
source_docs:
  - ref/day01-final_project_PRD_upgrade-03.md
  - ref/day01-final_project_TECH-SPEC_upgrade-03.md
---

# Copy Gacha v4.0 구현 계획

## 0. ⚠️ 사전 결정 (P0 — 구현 착수 전 필수)

PRD §2.3가 요구하는 **제약 개정 승인**이 필요합니다.

- **개정 내용**: 기존 "서버 없음·클라이언트 단독" 원칙 → **"상태를 저장하지 않는 서버리스 프록시 1개(Unsplash 키 서명·검색 중계 전용)만 허용"**.
- **불변 유지**: DB 없음 · 사용자 이력/피드백 외부 미전송 · 전 데이터 로컬 · v1~v3 데이터 무손실.
- **로컬 검증 한계**: `api/` 서버리스 함수는 Vite(`npm run dev`)가 실행하지 않음 → 로컬에서는 이미지가 **폴백(글래스)으로 표시**됨(설계된 동작). 실제 이미지는 **Vercel 배포 + `UNSPLASH_ACCESS_KEY` 설정** 후 동작. (사용자 계획: 로컬 폴백 확인 → 푸시 → Vercel 배포)

## 1. 목표 (Goal)

텍스트-only 결과의 추상성을 없애고, 각 카피 카드에 **입력에서 도출한 문맥 적합 중심 이미지**를 자동 페어링해 "바로 쓸 수 있는 비주얼 시안"으로 격상한다(R11). 이미지×글래스 결합으로 화면 전체에 **생동감·고급감**을 부여한다(R12). 이미지는 opt-in·비동기·폴백 우선 — 실패해도 v3.0 글래스 화면으로 무손실 폴백.

## 2. 요구사항 & 제약 (Requirements & Constraints)

| ID | 내용 | 출처 |
|----|------|------|
| REQ-1 (F20) | 무상태 서버리스 프록시로 Unsplash 검색·다운로드 트리거 중계, 키 미노출 | PRD §5 F20 |
| REQ-2 (F20) | 핫링크(CDN URL 직접) + 어트리뷰션 + 다운로드 트리거 4종 컴플라이언스 | PRD §5 F20 |
| REQ-3 (F21) | 입력→검색쿼리 도출(keyword 우선, 한→영 사전+영문 폴백), 후보 1장 선택·엔트리 캐싱 | PRD §5 F21 |
| REQ-4 (F21) | 이력/재방문 시 동일 이미지 재현, 재생성(🔄) 시에만 갱신 | PRD §5 F21 |
| REQ-5 (F22) | photo×글래스 컴포지션 + 대비 스크림(AA) + blur-up + 반응형 | PRD §5 F22 |
| CON-1 | 서버리스 프록시는 상태 저장·로깅 없음, 검색어만 통과 | PRD §2.3 |
| CON-2 | Access Key는 서버(Vercel env)에만, 클라이언트 미노출 | PRD §2.3 |
| CON-3 | 신규 런타임 의존성 최소화(원칙: 무의존 blur-up = urls.thumb CSS blur). blurhash는 선택 | SPEC §12 |
| CON-4 | 이미지 원본 미저장 — URL·메타만 캐싱. 사용자 데이터 외부 미전송 | PRD §6 |
| CON-5 | 기존 파일 경계·디자인 토큰 유지, 프로젝트 규칙 준수 | Project_rules |

## 3. 프로젝트 매핑 (영향 계층)

- **api/** [신규 계층]: `unsplash/search.js`, `unsplash/download.js` (Vercel Functions)
- **data/**: 변경 없음
- **utils/**: `imageQuery.js`(도출·URL빌드), `unsplash.js`(프록시 클라이언트), `generator.js`(MOD: image 기본값), (선택)`imageFallback.js`
- **hooks/**: `useCopyImages.js`(신규·타이밍), `useHeadlineGenerator.js`(MOD: 페어링 트리거), `useHistory.js`(선택 편의 액션)
- **components/**: `CardMedia.jsx`(신규), `HeadlineCard.jsx`(MOD: CardMedia 렌더+다운로드 트리거), `ResultsGrid.jsx`(MOD: props 패스스루)
- **styles/**: `CardMedia.css`(신규), `index.css`·`HeadlineCard.css`(MOD: 토큰·레이어)
- **설정**: `.env.example`(VITE_IMAGE_ENABLED, UNSPLASH_ACCESS_KEY 안내)

## 4. 구현 단계 (Phases)

### Phase 1 — F20 연동 기반
| TASK | 작업 | 대상 파일 · 함수 | 완료 |
|------|------|------------------|------|
| TASK-1 | 데이터 모델 +2필드 기본값 | `src/utils/generator.js` `createEntry()` → `image:null, imageStatus:'none'` | ☐ |
| TASK-2 | 검색 프록시 | `api/unsplash/search.js` (query/per_page/orientation, content_filter=high, 키 미노출, 429 전달, Cache-Control 60s) | ☐ |
| TASK-3 | 다운로드 트리거 프록시 | `api/unsplash/download.js` (loc 호스트 화이트리스트=api.unsplash.com, 204) | ☐ |
| TASK-4 | 프록시 클라이언트+정규화 | `src/utils/unsplash.js` `searchPhotos/triggerDownload/normalizePhoto`, `IMAGE_ENABLED` | ☐ |
| TASK-5 | 환경변수 안내 | `.env.example` | ☐ |

### Phase 2 — F21 페어링
| TASK | 작업 | 대상 파일 · 함수 | 완료 |
|------|------|------------------|------|
| TASK-6 | 쿼리 도출·URL 빌드 | `src/utils/imageQuery.js` `deriveQuery/buildImageUrl` (한→영 사전, ASCII 폴백) | ☐ |
| TASK-7 | 타이밍 오케스트레이터 | `src/hooks/useCopyImages.js` `fetchForSet/fetchForEntry` (동시성3, pickBest, 실패→failed) | ☐ |
| TASK-8 | 생성 흐름 연결 | `src/hooks/useHeadlineGenerator.js` (addMany 후 fetchForSet, 재생성 후 fetchForEntry, 논블로킹) | ☐ |

### Phase 3 — F22 프리미엄 비주얼
| TASK | 작업 | 대상 파일 · 함수 | 완료 |
|------|------|------------------|------|
| TASK-9 | CardMedia 컴포넌트 | `src/components/CardMedia.jsx` (img+srcSet+scrim+skeleton+어트리뷰션, status별 분기) | ☐ |
| TASK-10 | 카드 연결+다운로드 트리거 | `src/components/HeadlineCard.jsx` (CardMedia 렌더, "사용" 시 triggerDownload 1회, onImageUsed) | ☐ |
| TASK-11 | props 패스스루 | `src/components/ResultsGrid.jsx` (F16 정렬 유지) | ☐ |
| TASK-12 | 스타일·토큰 | `src/styles/CardMedia.css`(신규), `src/styles/index.css`·`HeadlineCard.css` (--surface-2/solid, z-index, aspect-ratio, reduced-motion/transparency) | ☐ |

### Phase 4 — 파인딩 & 검증
| TASK | 작업 | 대상 파일 · 함수 | 완료 |
|------|------|------------------|------|
| TASK-13 | (선택) 로컬 플레이스 폴백 | `src/utils/imageFallback.js` | ☐ |
| TASK-14 | 빌드+린트 무오류, 폴백 회귀 검증 | 로컬 `npm run build` + Playwright 폴백 확인 | ☐ |

## 5. 인수조건 & 검증 (Acceptance & Verification)

| AC | Given-When-Then | REQ | 검증 |
|----|-----------------|-----|------|
| AC-1 | 키 없는 로컬에서 생성 시 → 카드 즉시 표시, 이미지는 글래스 폴백, 앱 정상 | REQ-1,5 | Playwright 생성→폴백 확인, 콘솔 에러 0 |
| AC-2 | (배포 후) 키워드별 적합 이미지 ≥90%, 어트리뷰션 DOM 존재 | REQ-2,3 | Vercel 배포 후 수동/web-design-reviewer |
| AC-3 | 이력 재방문 시 동일 이미지, 재생성 시에만 변경 | REQ-4 | 수동/Playwright |
| AC-4 | 이미지 위 카피 대비 ≥AA, reduced-motion/transparency 동작 | REQ-5 | web-design-reviewer 측정 |
| AC-5 | v1~v3 이력 무손실, 기존 기능 회귀 없음 | CON-4 | 빌드+생성 스모크 |

## 6. 의존성 (Dependencies)

- 기존 코드: `useHistory`(update), `generator.js`, `HeadlineCard`, `index.css` 토큰 체계.
- 신규 라이브러리: **없음(원칙)**. blur-up은 `urls.thumb` CSS blur(무의존). `blurhash`는 여력 시 선택 — 도입 시 승인 요청.
- 배포 의존: Vercel `api/` 함수 런타임 + `UNSPLASH_ACCESS_KEY`(Vercel Secret).

## 7. 리스크 & 가정

- RISK-1: 로컬에서 실제 이미지 검증 불가(Vite가 api/ 미실행) → 로컬은 폴백 검증, 실이미지는 배포 후. (완화: 사용자 배포 플로우와 일치)
- RISK-2: Unsplash 개발모드 50req/h 쿼터 → 엔트리 캐싱·동시성 제한·프록시 60s 캐시.
- RISK-3: 한국어 키워드 사전 미스 → 영문 지정 폴백, 그래도 실패면 글래스 폴백.
- ASSUMPTION-1: Vercel 배포 대상 repo에 키가 설정될 것(사용자 담당).
- ASSUMPTION-2: P0 제약 개정 승인됨(사용자 지시로 간주, 명시 확인 필요).

## 8. 완료 추적 (Progress)

- P0 승인: ☐ / P1: ☐ / P2: ☐ / P3: ☐ / P4: ☐
- 전체 상태: Planned
