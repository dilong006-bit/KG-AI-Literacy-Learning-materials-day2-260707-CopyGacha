# 기술명세서 (Technical Spec): Copy Gacha v4.0 — 카피×실사 이미지 & 프리미엄 비주얼

| 항목 | 내용 |
|------|------|
| **Spec Version** | 1.0 |
| **근거 PRD** | `day01-final_project_PRD_upgrade-03.md` (v4.0, F20~F22) |
| **대상 기능** | F20 Unsplash 연동 기반 · F21 카피-이미지 페어링 · F22 프리미엄 비주얼 컴포지션 |
| **작성자** | Senior Engineer |
| **작성일** | 2026-07-07 |
| **선행 조건** | PRD §2.3 제약 개정(무상태 서버리스 프록시) 승인 |
| **기존 스택** | React 18 + Vite 5, IndexedDB(폴백 LocalStorage), Vercel 배포 |

> 표기 규칙: 파일 경로는 레포 루트 기준. 시그니처는 프로젝트의 JS + JSDoc 관례를 따른다. **[NEW]** = 신규 파일, **[MOD]** = 기존 파일 수정.

---

## 1. 아키텍처 개요

```
[Browser SPA (React)]                        [Vercel Serverless]           [Unsplash]
  InputForm                                                                
   └▶ useHeadlineGenerator                                                 
        generateHeadlineSet(inputs) ──▶ useHistory.addMany(set)            
        └▶ useCopyImages.fetchForSet(ids)                                  
             └▶ utils/unsplash.searchPhotos(query) ──HTTP──▶ /api/unsplash/search ──▶ GET api.unsplash.com/search/photos
                     ◀── trimmed candidates ───────────────◀── (Client-ID 서명, content_filter=high)
             └▶ history.update(id,{image,imageStatus})                    
  HeadlineCard                                                            
   └▶ CardMedia (photo + scrim + glass panel + attribution)              
   └▶ "사용" 액션 시 unsplash.triggerDownload ──▶ /api/unsplash/download ──▶ GET download_location
```

**핵심 원칙 (PRD §2.3 계승)**
- Access Key는 **서버(Vercel env)에만** 존재. 클라이언트로 절대 노출 금지.
- 프록시는 **무상태**: 저장·로깅 없음, 통과하는 것은 검색 키워드뿐.
- 이미지 기능은 **opt-in·비동기·폴백 우선**. 실패해도 v3.0 글래스 표면으로 무손실 폴백.
- 사용자 이력/피드백(리액션·코멘트)은 **외부 미전송** 불변.

---

## 2. 데이터 모델 (GenerationEntry v4)

기존 스키마(v3)에 **이미지 필드 2개만 추가**. IndexedDB는 keyPath 기반 schema-less object store이므로 `DB_VERSION` 상향 불필요.

```js
/**
 * @typedef {Object} CopyImage
 * @property {string} id                     - Unsplash 사진 ID
 * @property {{thumb:string, small:string, regular:string, raw:string}} urls - 핫링크 CDN 원본 URL(재호스팅 금지)
 * @property {string} blurHash               - blur-up 로딩용 (nullable)
 * @property {string} color                  - 대표색 (플레이스홀더 배경)
 * @property {string} altText                - 접근성 alt (photo.alt_description)
 * @property {string} query                  - 실제 사용된 검색 쿼리(재현/디버깅)
 * @property {{name:string, profileUrl:string}} photographer - 어트리뷰션(필수)
 * @property {string} downloadLocation       - 다운로드 트리거 엔드포인트(필수)
 * @property {boolean} downloadTriggered      - 다운로드 트리거 1회 실행 여부
 */

/**
 * @typedef {'none'|'loading'|'ready'|'failed'} ImageStatus
 */

// GenerationEntry v4 = v3 + { image: CopyImage|null, imageStatus: ImageStatus }
```

**기본값 / 마이그레이션**
- 신규 엔트리 생성 시: `image: null`, `imageStatus: 'none'`.
- 기존 이력(v1~v3): 읽는 시점에 `image`/`imageStatus` 미존재 → `null`/`'none'`으로 취급(일괄 변환 불필요).
- **[MOD] `src/utils/generator.js`** `createEntry()` 반환 객체에 `image: null, imageStatus: 'none'` 추가.

---

## 3. 서버리스 프록시 명세 (F20)

Vercel는 레포 루트 `api/` 하위 파일을 서버리스 함수로 배포한다. 환경변수 `UNSPLASH_ACCESS_KEY`(Vercel 대시보드 Secret)만 사용.

### 3.1 [NEW] `api/unsplash/search.js`

- **Method/Path:** `GET /api/unsplash/search`
- **Query:** `query`(필수, string) · `per_page`(기본 5, 최대 10) · `orientation`(옵션: `landscape|portrait|squarish`)
- **동작:** `https://api.unsplash.com/search/photos` 호출. 헤더 `Authorization: Client-ID <UNSPLASH_ACCESS_KEY>`, 파라미터 `query, per_page, orientation, content_filter=high`.
- **응답(200):** 필요한 필드만 트리밍하여 반환
  ```json
  { "results": [ {
    "id": "…", "blur_hash": "…", "color": "#…", "alt_description": "…",
    "width": 5245, "height": 3497,
    "urls": { "thumb": "…", "small": "…", "regular": "…", "raw": "…" },
    "user": { "name": "…", "links": { "html": "https://unsplash.com/@…" } },
    "links": { "download_location": "https://api.unsplash.com/photos/…/download?ixid=…" }
  } ] }
  ```
- **에러:** query 누락 → 400. Unsplash 403/429 → 동일 status + `{ "error": "rate_limited" }` 전달(클라이언트 폴백 트리거).
- **헤더:** `Cache-Control: public, max-age=60`(동일 쿼리 단시간 캐시로 쿼터 절약). **Access Key는 응답 어디에도 포함 금지.**

### 3.2 [NEW] `api/unsplash/download.js`

- **Method/Path:** `GET /api/unsplash/download?loc=<URL-encoded download_location>`
- **동작:** `loc` 호스트가 `api.unsplash.com` 인지 검증(오픈 리다이렉트/SSRF 방지) 후, `Authorization: Client-ID …` 로 GET 호출(ixid 등 쿼리 보존). 응답 본문 무시.
- **응답:** `204 No Content`. 클라이언트는 fire-and-forget(비동기, 실패 무시).
- **근거:** Unsplash 가이드라인 — 사용자가 사진을 "사용"할 때 `download_location` 호출 의무.

### 3.3 보안 체크리스트
- [ ] Access Key는 `process.env.UNSPLASH_ACCESS_KEY` 로만 접근, 번들 미포함.
- [ ] `download` 프록시는 대상 호스트 화이트리스트(`api.unsplash.com`) 검증.
- [ ] 프록시는 요청/응답을 **저장·로깅하지 않음**.
- [ ] (옵션) `Origin` 동일 출처 확인.

---

## 4. 클라이언트 모듈 설계

### 4.1 [NEW] `src/utils/imageQuery.js` — 쿼리 도출 (F21, D7·D8)

```js
/** 마케팅 상용어 한→영 소사전 (확장 가능). 미스 시 원문 폴백. */
const KO_EN_CATEGORY = {
  '무선 이어폰': 'wireless earbuds', '이어폰': 'earbuds',
  '노트북': 'laptop', '커피': 'coffee', '운동화': 'sneakers',
  '여행': 'travel', '화장품': 'cosmetics skincare', '카페': 'cafe interior',
  // … 실습 범위 내 상용 키워드 위주로 점진 확장
};

/**
 * 생성 입력에서 이미지 검색 쿼리와 방향을 도출한다.
 * 규칙: keyword 우선. 사전 매핑 → 영문 사용. ASCII면 원문. 그 외(한글 등) 원문 질의(Unsplash 다국어 beta).
 * @param {{keyword:string, benefit?:string, tone?:string}} inputs
 * @returns {{ query:string, orientation:'landscape'|'portrait'|'squarish' }}
 */
export const deriveQuery = (inputs) => {
  const kw = (inputs.keyword || '').trim();
  const mapped = KO_EN_CATEGORY[kw];
  const isAscii = /^[\x00-\x7F]+$/.test(kw);
  const query = mapped || (isAscii ? kw : kw); // 매핑 없으면 원문
  return { query, orientation: 'landscape' }; // 카드 배너 기본 가로
};

/** Unsplash 동적 URL 파라미터로 반응형/경량 이미지 URL 생성 */
export const buildImageUrl = (baseUrl, { w = 800, dpr = 1, q = 78, fm = 'webp' } = {}) =>
  `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}w=${w}&dpr=${dpr}&q=${q}&fm=${fm}&fit=crop`;
```

### 4.2 [NEW] `src/utils/unsplash.js` — 프록시 클라이언트 (F20)

```js
/** 이미지 기능 on/off (환경변수 주입, 미설정 시 자동 off → 폴백) */
export const IMAGE_ENABLED = import.meta.env.VITE_IMAGE_ENABLED !== 'false';

/**
 * 프록시를 통해 후보 사진을 검색한다.
 * @returns {Promise<CopyImage[]>} 정규화된 후보(실패 시 throw)
 */
export const searchPhotos = async (query, { perPage = 5, orientation } = {}) => {
  const url = new URL('/api/unsplash/search', location.origin);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  if (orientation) url.searchParams.set('orientation', orientation);
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`unsplash_${res.status}`);
  const { results } = await res.json();
  return (results || []).map(normalizePhoto);
};

/** 다운로드 트리거(가이드라인 준수). 비동기 fire-and-forget. */
export const triggerDownload = (downloadLocation) => {
  if (!downloadLocation) return;
  const url = new URL('/api/unsplash/download', location.origin);
  url.searchParams.set('loc', downloadLocation);
  fetch(url).catch(() => {}); // 실패 무시(사용자 흐름 방해 금지)
};

/** Unsplash raw 응답 → CopyImage 정규화 + 어트리뷰션 UTM 링크 구성 */
const normalizePhoto = (p) => ({
  id: p.id,
  urls: p.urls,
  blurHash: p.blur_hash || null,
  color: p.color || '#e5e7eb',
  altText: p.alt_description || '',
  photographer: {
    name: p.user?.name || 'Unknown',
    profileUrl: `${p.user?.links?.html}?utm_source=copy_gacha&utm_medium=referral`,
  },
  downloadLocation: p.links?.download_location || null,
  downloadTriggered: false,
});
```

### 4.3 [NEW] `src/hooks/useCopyImages.js` — 페어링 오케스트레이션 (F21)

```js
/**
 * 생성 세트/재생성 엔트리에 이미지를 비동기로 붙인다.
 * - 이미 image가 있는 엔트리는 스킵(재현성/쿼터 절약)
 * - 동시성 상한으로 성능/레이트리밋 보호
 * @param {object} history - useHistory() 반환값(update 사용)
 */
export const useCopyImages = (history) => {
  const CONCURRENCY = 3;

  const fetchForEntry = useCallback(async (entry) => {
    if (!IMAGE_ENABLED || !entry || entry.image) return;
    history.update(entry.id, { imageStatus: 'loading' });
    try {
      const { query, orientation } = deriveQuery(entry.inputs);
      const candidates = await searchPhotos(query, { perPage: 5, orientation });
      const picked = pickBest(candidates, entry); // 방향/중복 회피 기준
      if (!picked) throw new Error('no_match');
      history.update(entry.id, { image: { ...picked, query }, imageStatus: 'ready' });
    } catch {
      history.update(entry.id, { imageStatus: 'failed' }); // 폴백(글래스) 렌더
    }
  }, [history]);

  const fetchForSet = useCallback(async (entries) => {
    // 간단한 동시성 제한 풀
    const queue = [...entries];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) await fetchForEntry(queue.shift());
    });
    await Promise.all(workers);
  }, [fetchForEntry]);

  return { fetchForSet, fetchForEntry };
};

/** 후보 중 1장 선택: 세트 내 이미 쓰인 id 회피 + 첫 적합 */
const pickBest = (candidates, entry) => candidates.find(Boolean) || null;
```

### 4.4 [MOD] `src/hooks/useHeadlineGenerator.js` — 생성 흐름에 페어링 연결

- `useCopyImages(history)`를 받아서:
  - `generateHeadlines`의 `addMany(set)` 직후 → `imageOrchestrator.fetchForSet(set)` 호출(룰렛 종료 후, 비블로킹).
  - `regenerateFormula`의 새 엔트리 생성 직후 → `fetchForEntry(newEntry)` 호출(재생성 시 새 이미지).
- **비블로킹 원칙:** 이미지 페치는 카피 표시를 지연시키지 않는다. 카드는 먼저 뜨고, 이미지는 `imageStatus` 전이에 따라 채워진다.

### 4.5 [MOD] `src/hooks/useHistory.js` — (선택) 편의 액션

- 기존 `update(id, patch)`로 충분. 필요 시 `setImage(id, image)` 얇은 래퍼 추가.
- `enforceCap`의 보호 대상 판단에 이미지 유무는 포함하지 않음(이미지는 파생 자산).

---

## 5. 페어링 & 컴플라이언스 플로우

### 5.1 시퀀스 (신규 생성)
1. 사용자 생성 → 룰렛(1.6s) → `generateHeadlineSet` → `addMany(set)` (카드 즉시 표시, `imageStatus:'none'`).
2. `fetchForSet(set)`: 엔트리별 `deriveQuery` → `searchPhotos`(프록시) → `pickBest` → `update({image, imageStatus:'ready'})`.
3. 카드 `CardMedia`가 `imageStatus` 전이를 구독해 blur-up으로 이미지 등장.
4. 실패/오프라인/429 → `imageStatus:'failed'` → 글래스 폴백 렌더.

### 5.2 다운로드 트리거 (가이드라인 준수)
- **[MOD] `HeadlineCard.jsx`**: 사용자가 이미지가 붙은 카피를 **"사용"**(복사 📋 또는 즐겨찾기 ⭐) 할 때:
  ```js
  if (entry.image && !entry.image.downloadTriggered) {
    triggerDownload(entry.image.downloadLocation);
    onImageUsed(entry.id); // history.update(id, { image: {...entry.image, downloadTriggered:true} })
  }
  ```
- 1회만 트리거(중복 방지), 비동기.

### 5.3 재현성
- 엔트리에 `image`가 저장되므로 이력/재방문 시 **동일 이미지**. 재페치 없음.
- 재생성(🔄)만 새 이미지(§4.4).

---

## 6. 프리미엄 비주얼 컴포지션 (F22)

### 6.1 [NEW] `src/components/CardMedia.jsx` — DOM 구조

```jsx
<div className="card-media" style={{ backgroundColor: image?.color || 'var(--surface-2)' }}>
  {status === 'ready' && image && (
    <>
      <img
        className="card-media__img"
        src={buildImageUrl(image.urls.regular, { w: 800, dpr: window.devicePixelRatio })}
        srcSet={`${buildImageUrl(image.urls.small,{w:400})} 400w, ${buildImageUrl(image.urls.regular,{w:800})} 800w`}
        sizes="(max-width:600px) 100vw, 400px"
        alt={image.altText || query}
        loading="lazy" decoding="async"
      />
      <div className="card-media__scrim" aria-hidden="true" />
    </>
  )}
  {status === 'loading' && <div className="card-media__skeleton" aria-hidden="true" />}
  {/* status 'none'|'failed' → 이미지 레이어 없음: 글래스 그라데이션 폴백 */}
</div>
```
- 카피 텍스트/버튼은 이 위에 **글래스 패널**(기존 F19 표면)로 얹는다.
- 어트리뷰션: 카드 하단에 소형 링크 — `Photo by <a href=profileUrl>{name}</a> on <a href="https://unsplash.com/?utm_source=copy_gacha&utm_medium=referral">Unsplash</a>`.

### 6.2 대비 스크림 (D9 — 접근성 우선)
- `.card-media__scrim`: `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.55) 100%)` — 텍스트가 놓이는 영역을 어둡게.
- 글래스 카피 패널은 반투명 + 배경 블러 → 스크림과 합쳐 **본문 대비 ≥ AA(4.5:1)** 보장.
- `@media (prefers-reduced-transparency: reduce)` → 패널 불투명화(`background: var(--surface-solid)`), 스크림 강화.

### 6.3 blur-up 로딩 (생동감)
- 1차: `image.color` 단색 배경 즉시 표시(레이아웃 안정, CLS 0).
- 2차: `blurHash` 디코드(옵션 의존성 `blurhash`) 또는 `urls.thumb`(초저해상)를 CSS `filter: blur(20px)`로 표시.
- 3차: 원본 로드 완료 → `opacity` 트랜지션으로 교체.
- `@media (prefers-reduced-motion: reduce)` → 트랜지션 제거, 즉시 표시.

### 6.4 [MOD] 디자인 토큰 & CSS
- **[MOD] `src/styles/index.css`**: `--surface-2`, `--surface-solid`, 스크림/미디어 높이 토큰 추가(F18 토큰 체계 확장).
- **[NEW] `src/styles/CardMedia.css`** + **[MOD] `HeadlineCard.css`**: 카드에 `position:relative`, 미디어/스크림/글래스 레이어 z-index 정리, `aspect-ratio` 로 미디어 영역 확보.

---

## 7. 폴백 & 회복 탄력성

| 상황 | 감지 | 처리 |
|------|------|------|
| 이미지 기능 off | `IMAGE_ENABLED=false` | 페치 스킵, `imageStatus:'none'`, 글래스 표면 |
| 오프라인 / 타임아웃 | fetch reject / AbortSignal | `imageStatus:'failed'`, 폴백, (선택) 재시도 버튼 |
| 레이트리밋 429 / 403 | 프록시가 status 전달 | `imageStatus:'failed'`, 폴백, 사용자 안내 토스트 |
| 적합 이미지 없음 | `pickBest`→null | 억지 매칭 금지, 폴백 |
| 키 미설정(배포 누락) | 프록시 500 | 폴백, 콘솔 경고(사용자 흐름 무해) |

- (선택 · Should) **[NEW] `src/utils/imageFallback.js`**: 카테고리별 로컬 큐레이션 이미지 소량 번들 → 오프라인에서도 실사감 유지.

---

## 8. 성능 · 접근성 요건

**성능**
- `loading="lazy"`, `decoding="async"`, `srcSet/sizes`로 뷰포트 적합 사이즈. 원본은 `regular` 이하만 사용(raw/full 금지).
- Unsplash URL 파라미터 `w/dpr/q=78/fm=webp/fit=crop`로 경량화.
- 페치 동시성 상한(3), 동일 쿼리 프록시 60s 캐시.
- 단색/블러 플레이스홀더로 CLS 0 목표.

**접근성**
- `alt`: `image.altText` 우선, 없으면 쿼리 텍스트. 순수 장식 스크림은 `aria-hidden`.
- 본문 대비 ≥ AA(스크림+글래스로 보장). `prefers-reduced-transparency` 대응.
- `prefers-reduced-motion`: blur-up/페이드 최소화.
- 어트리뷰션 링크는 키보드 포커스 가능.

---

## 9. 엣지 케이스 처리표

| # | 케이스 | 기대 동작 |
|---|--------|-----------|
| E1 | 한글 키워드 + 사전 미스 | 원문 질의 → 실패 시 폴백(오류 아님) |
| E2 | 세트 내 이미지 중복 | `pickBest`가 사용된 id 회피 |
| E3 | 다운로드 트리거 중복 클릭 | `downloadTriggered` 가드로 1회만 |
| E4 | 재생성 후 옛 이미지 잔존 | 새 엔트리는 `image:null`로 시작 → 재페치 |
| E5 | 이력 상한 정리 | 이미지 유무는 보호 기준 아님(파생 자산) |
| E6 | 저사양/저대비 | 스크림 강화 + 불투명 패널 |
| E7 | 프록시 다운 | 전 카드 폴백, 카피 기능은 정상 |

---

## 10. 파일 변경 맵

**[NEW]**
- `api/unsplash/search.js` — 검색 프록시
- `api/unsplash/download.js` — 다운로드 트리거 프록시
- `src/utils/imageQuery.js` — 쿼리 도출 + URL 빌더
- `src/utils/unsplash.js` — 프록시 클라이언트 + 정규화
- `src/hooks/useCopyImages.js` — 페어링 오케스트레이션
- `src/components/CardMedia.jsx` — 이미지×스크림×어트리뷰션
- `src/styles/CardMedia.css`
- (선택) `src/utils/imageFallback.js` — 로컬 큐레이션

**[MOD]**
- `src/utils/generator.js` — `createEntry`에 `image/imageStatus` 기본값
- `src/hooks/useHeadlineGenerator.js` — 생성/재생성 후 페어링 트리거
- `src/components/HeadlineCard.jsx` — CardMedia 렌더 + "사용" 시 다운로드 트리거
- `src/components/ResultsGrid.jsx` — props 패스스루(순서는 F16 스냅샷 유지)
- `src/styles/HeadlineCard.css`, `src/styles/index.css` — 레이어/토큰
- `.env.example` — `VITE_IMAGE_ENABLED`, 서버 `UNSPLASH_ACCESS_KEY` 안내(값 미포함)

**환경변수**
- 서버(Vercel): `UNSPLASH_ACCESS_KEY` (Secret, 클라이언트 미노출)
- 클라이언트: `VITE_IMAGE_ENABLED`(기본 true)

---

## 11. F-ID별 수용 기준 검증

| F-ID | 검증 방법 |
|------|-----------|
| **F20** | 네트워크 탭에 Access Key 미노출 확인 · 어트리뷰션 DOM 존재 · "사용" 시 `/api/unsplash/download` 204 호출 · 429 주입 시 폴백 |
| **F21** | 키워드별 적합 이미지 표시(≥90%) · 이력 재방문 시 동일 이미지 · 재생성 시 이미지 변경 · 사전 미스 시 폴백 |
| **F22** | 이미지 위 카피 대비 ≥AA(측정) · blur-up 자연스러움 · reduced-motion/transparency 대응 · 폴백 시에도 글래스 미감 유지 · CLS≈0 |

---

## 12. 오픈 이슈 / 결정 필요

1. **blur-up 방식:** `blurhash` 의존성 추가 vs `urls.thumb` CSS 블러(무의존). → 무의존 권장, 여력 시 blurhash.
2. **로컬 큐레이션 폴백(E안) 도입 범위:** 실습 시간 내 최소 셋만 vs 생략. → 최소 셋 권장.
3. **한↔영 사전 규모:** 실습 키워드 위주 소사전으로 시작, 미스는 폴백으로 안전.
4. **프록시 캐시 TTL:** 60s 기본, 쿼터 압박 시 상향.

---

## 다음 단계 (Handoff → prompt-builder)
본 기술명세의 **파일 변경 맵 · 함수 시그니처 · F-ID 수용 기준**을 입력으로, P1~P4(연동기반→페어링→비주얼→하드닝) 순서의 **Claude Code 구현 프롬프트**를 F-ID 단위로 생성한다. 각 프롬프트에 컴플라이언스 체크리스트(§3.3)와 수용 기준(§11)을 포함한다.
