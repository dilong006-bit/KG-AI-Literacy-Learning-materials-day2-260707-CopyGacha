/**
 * [NEW] Unsplash 프록시 클라이언트 (F20, 기술명세서 §4.2).
 * 모든 요청은 무상태 서버리스 프록시(/api/unsplash/*)를 경유한다.
 * Access Key는 클라이언트에 존재하지 않는다.
 */

/** 이미지 기능 on/off (환경변수 주입, 'false'면 off → 글래스 폴백) */
export const IMAGE_ENABLED = import.meta.env.VITE_IMAGE_ENABLED !== 'false';

/**
 * 프록시를 통해 후보 사진을 검색한다.
 * @param {string} query
 * @param {{perPage?:number, orientation?:string}} [opts]
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

/**
 * 다운로드 트리거(가이드라인 준수). 비동기 fire-and-forget.
 * @param {string} downloadLocation
 */
export const triggerDownload = (downloadLocation) => {
  if (!downloadLocation) return;
  const url = new URL('/api/unsplash/download', location.origin);
  url.searchParams.set('loc', downloadLocation);
  fetch(url).catch(() => {}); // 실패 무시(사용자 흐름 방해 금지)
};

/** Unsplash 트리밍 응답 → CopyImage 정규화 + 어트리뷰션 UTM 링크 구성 */
const normalizePhoto = (p) => ({
  id: p.id,
  urls: p.urls,
  blurHash: p.blur_hash || null,
  color: p.color || '#e5e7eb',
  altText: p.alt_description || '',
  photographer: {
    name: p.user?.name || 'Unknown',
    profileUrl: `${p.user?.links?.html || 'https://unsplash.com'}?utm_source=copy_gacha&utm_medium=referral`,
  },
  downloadLocation: p.links?.download_location || null,
  downloadTriggered: false,
});
