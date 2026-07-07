/**
 * [NEW] Unsplash 다운로드 트리거 무상태 프록시 (F20, 기술명세서 §3.2).
 * GET /api/unsplash/download?loc=<URL-encoded download_location>
 *
 * - Unsplash 가이드라인: 사용자가 사진을 "사용"할 때 download_location 호출 의무.
 * - loc 호스트를 api.unsplash.com으로 화이트리스트 검증(오픈 리다이렉트/SSRF 방지).
 * - fire-and-forget. 응답 본문 무시. 항상 204.
 */
export default async function handler(req, res) {
  const { loc } = req.query || {};

  if (!loc) {
    return res.status(400).json({ error: 'loc_required' });
  }

  let target;
  try {
    target = new URL(String(loc));
  } catch {
    return res.status(400).json({ error: 'bad_loc' });
  }

  // 호스트 화이트리스트 (SSRF/오픈 리다이렉트 방지)
  if (target.hostname !== 'api.unsplash.com') {
    return res.status(400).json({ error: 'forbidden_host' });
  }

  const key = (process.env.UNSPLASH_ACCESS_KEY || '').trim().split(/\s+/)[0];
  if (key) {
    try {
      // ixid 등 쿼리 보존한 채 GET (본문 무시)
      await fetch(target, { headers: { Authorization: `Client-ID ${key}` } });
    } catch {
      // fire-and-forget — 실패해도 사용자 흐름 방해 금지
    }
  }

  return res.status(204).end();
}
