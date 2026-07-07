import { useCallback } from 'react';
import { deriveQuery } from '../utils/imageQuery';
import { searchPhotos, IMAGE_ENABLED } from '../utils/unsplash';

/**
 * [NEW] 이미지 페어링 타이밍 오케스트레이터 (F21, 기술명세서 §4.3).
 * 생성 세트/재생성 엔트리에 이미지를 비동기로 붙인다.
 * - 이미 image가 있는 엔트리는 스킵(재현성/쿼터 절약)
 * - 동시성 상한으로 성능/레이트리밍 보호
 * @param {object} history - useHistory() 반환값(update 사용)
 */
export const useCopyImages = (history) => {
  const CONCURRENCY = 3;

  const fetchForEntry = useCallback(
    async (entry) => {
      if (!IMAGE_ENABLED || !entry || entry.image) return;
      history.update(entry.id, { imageStatus: 'loading' });
      try {
        const { query, orientation } = deriveQuery(entry.inputs);
        const candidates = await searchPhotos(query, { perPage: 5, orientation });
        const picked = pickBest(candidates, entry); // 방향/중복 회피 기준
        if (!picked) throw new Error('no_match');
        history.update(entry.id, { image: { ...picked, query }, imageStatus: 'ready' });
      } catch {
        history.update(entry.id, { imageStatus: 'failed' }); // 글래스 폴백 렌더
      }
    },
    [history]
  );

  const fetchForSet = useCallback(
    async (entries) => {
      const queue = [...entries];
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) await fetchForEntry(queue.shift());
      });
      await Promise.all(workers);
    },
    [fetchForEntry]
  );

  return { fetchForSet, fetchForEntry };
};

/** 후보 중 1장 선택: 첫 적합(향후 세트 내 중복 id 회피 확장 지점) */
const pickBest = (candidates) => candidates.find(Boolean) || null;
