import { useCallback } from 'react';
import { deriveQuery } from '../utils/imageQuery';
import { searchPhotos, IMAGE_ENABLED } from '../utils/unsplash';

/**
 * [NEW] 이미지 페어링 타이밍 오케스트레이터 (F21, 기술명세서 §4.3).
 * 생성 세트/재생성 엔트리에 이미지를 비동기로 붙인다.
 * - 이미 image가 있는 엔트리는 스킵(재현성/쿼터 절약)
 * - 세트 내에서 이미 쓴 이미지 id를 공유해 **카드마다 다른 이미지** 배정
 * - 동시성 상한으로 성능/레이트리밍 보호
 * @param {object} history - useHistory() 반환값(update 사용)
 */
export const useCopyImages = (history) => {
  const CONCURRENCY = 3;

  const fetchForEntry = useCallback(
    async (entry, usedIds) => {
      if (!IMAGE_ENABLED || !entry || entry.image) return;
      history.update(entry.id, { imageStatus: 'loading' });
      try {
        const { query, orientation } = deriveQuery(entry.inputs);
        // 후보를 넉넉히 받아 세트 내 분배 여지를 확보
        const candidates = await searchPhotos(query, { perPage: 10, orientation });
        const picked = pickBest(candidates, usedIds);
        if (!picked) throw new Error('no_match');
        if (usedIds) usedIds.add(picked.id); // 다음 카드가 이 이미지를 피하도록
        history.update(entry.id, { image: { ...picked, query }, imageStatus: 'ready' });
      } catch {
        history.update(entry.id, { imageStatus: 'failed' }); // 글래스 폴백 렌더
      }
    },
    [history]
  );

  const fetchForSet = useCallback(
    async (entries) => {
      const usedIds = new Set(); // 세트 내 이미지 중복 방지(카드별 다른 이미지)
      const queue = [...entries];
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) await fetchForEntry(queue.shift(), usedIds);
      });
      await Promise.all(workers);
    },
    [fetchForEntry]
  );

  return { fetchForSet, fetchForEntry };
};

/**
 * 후보 중 1장 선택.
 * - 세트 모드(usedIds 있음): 아직 안 쓴 첫 장(결정적 분배로 중복 방지)
 * - 단건/재생성(usedIds 없음): 랜덤(재생성 때 이미지가 바뀌도록)
 */
const pickBest = (candidates, usedIds) => {
  const list = (candidates || []).filter(Boolean);
  if (!list.length) return null;
  if (usedIds) {
    const fresh = list.filter((c) => !usedIds.has(c.id));
    return (fresh.length ? fresh : list)[0];
  }
  return list[Math.floor(Math.random() * list.length)];
};
