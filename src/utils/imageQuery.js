/**
 * [NEW] 이미지 검색 쿼리 도출 + URL 빌드 (F21, 기술명세서 §4.1 / PRD D7·D8).
 * LLM 없이 클라이언트에서 한국어 키워드를 영문 검색어로 매핑한다.
 */

/** 마케팅 자주 쓰는 한→영 카테고리 사전 (확장 가능). 미스 시 영문 폴백. */
const KO_EN_CATEGORY = {
  '무선 이어폰': 'wireless earbuds',
  '이어폰': 'earbuds',
  '헤드폰': 'headphones',
  '노트북': 'laptop',
  '스마트폰': 'smartphone',
  '커피': 'coffee',
  '카페': 'cafe interior',
  '운동화': 'sneakers',
  '여행': 'travel',
  '화장품': 'cosmetics skincare',
  '스킨케어': 'skincare',
  '향수': 'perfume',
  '가방': 'handbag',
  '시계': 'watch',
  '자동차': 'car',
  '책': 'book reading',
  '요가': 'yoga',
  '헬스': 'fitness gym',
  '음식': 'food',
  '반려동물': 'pet',
  '인테리어': 'interior design',
  '패션': 'fashion',
};

/**
 * 생성 입력에서 이미지 검색 쿼리와 방향을 도출한다.
 * 규칙: keyword 우선. 사전 매핑 → 영문. ASCII면 그대로. 그 외(한글 등) 사전 미스면 원문 지정.
 * @param {{keyword:string, benefit?:string, tone?:string}} inputs
 * @returns {{ query:string, orientation:'landscape'|'portrait'|'squarish' }}
 */
export const deriveQuery = (inputs) => {
  const kw = (inputs?.keyword || '').trim();
  const mapped = KO_EN_CATEGORY[kw];
  const isAscii = /^[\x00-\x7F]+$/.test(kw);
  const query = mapped || kw; // 매핑 있으면 영문, 없으면 원문(ASCII는 그대로)
  void isAscii; // (향후 비ASCII 처리 확장 지점)
  return { query, orientation: 'landscape' }; // 카드 배너 기본 가로
};

/**
 * Unsplash 동적 URL 파라미터로 반응형/경량 이미지 URL 생성.
 * @param {string} baseUrl - urls.small | urls.regular 등
 */
export const buildImageUrl = (baseUrl, { w = 800, dpr = 1, q = 78, fm = 'webp' } = {}) =>
  `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}w=${w}&dpr=${dpr}&q=${q}&fm=${fm}&fit=crop`;
