/**
 * [NEW] Unsplash 검색 무상태 프록시 (F20, 기술명세서 §3.1).
 * GET /api/unsplash/search?query=&per_page=&orientation=
 *
 * - Access Key는 서버 env(UNSPLASH_ACCESS_KEY)에서만 사용, 응답에 절대 미포함.
 * - 저장·로깅 없음. 검색어만 Unsplash로 통과.
 */

// 응답에 필요한 필드만 트리밍(불필요 데이터·키 유출 방지)
const trimPhoto = (p) => ({
  id: p.id,
  blur_hash: p.blur_hash ?? null,
  color: p.color ?? null,
  alt_description: p.alt_description ?? null,
  width: p.width,
  height: p.height,
  urls: {
    thumb: p.urls?.thumb,
    small: p.urls?.small,
    regular: p.urls?.regular,
    raw: p.urls?.raw,
  },
  user: {
    name: p.user?.name ?? 'Unknown',
    links: { html: p.user?.links?.html ?? null },
  },
  links: { download_location: p.links?.download_location ?? null },
});

export default async function handler(req, res) {
  const { query, per_page = '5', orientation } = req.query || {};

  if (!query) {
    return res.status(400).json({ error: 'query_required' });
  }

  // 공백/개행으로 오염된 값 방어: 첫 토큰만 사용(붙여넣기 사고 대비)
  const key = (process.env.UNSPLASH_ACCESS_KEY || '').trim().split(/\s+/)[0];
  if (!key) {
    // 키 미설정(로컬/미배포) — 클라이언트는 이를 실패로 보고 글래스 폴백
    return res.status(500).json({ error: 'key_missing' });
  }

  const perPage = Math.min(Math.max(Number(per_page) || 5, 1), 10);
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', String(query));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('content_filter', 'high');
  if (orientation) url.searchParams.set('orientation', String(orientation));

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });

    // 레이트리밋/거부는 동일 status로 전달 → 클라이언트 폴백 트리거
    if (upstream.status === 403 || upstream.status === 429) {
      return res.status(upstream.status).json({ error: 'rate_limited' });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: 'upstream_error', upstream_status: upstream.status });
    }

    const data = await upstream.json();
    const results = (data.results || []).map(trimPhoto);

    // 동일 쿼리 단시간 캐시로 쿼터 절약
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ results });
  } catch (e) {
    // 키·본문은 노출하지 않음(예외 유형만)
    return res.status(502).json({ error: 'upstream_error', reason: (e && e.name) || 'fetch_failed' });
  }
}
