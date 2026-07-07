import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { historyStore } from '../utils/db';
import { scoreHeadline } from '../utils/quality';
import { formulaById } from '../data/formulas';

// 이력 상한 (초과 시 즐겨찾기·리액션 없는 오래된 항목부터 자동 정리) — PRD §9
const HISTORY_CAP = 500;
const V1_FAVORITES_KEY = 'headline_favorites';
const MIGRATION_FLAG = 'hr_migrated_v1';

// v1.0 즐겨찾기(LocalStorage) → v2 GenerationEntry 스키마 변환
const migrateV1Favorite = (fav) => {
  const inputs = {
    keyword: fav.inputs?.keyword ?? fav.keyword ?? '',
    target: fav.inputs?.target ?? '',
    benefit: fav.inputs?.benefit ?? '',
    tone: 'professional',
  };
  const formula = formulaById[fav.formula];
  return {
    id: fav.id ? String(fav.id) : `gen_migrated_${fav.savedAt || fav.headline}`,
    headline: fav.headline,
    formula: fav.formula,
    formulaName: fav.formulaName || formula?.name || '',
    formulaEmoji: fav.formulaEmoji || formula?.emoji || '',
    formulaFramework: formula?.framework || '',
    formulaDescription: fav.formulaDescription || formula?.description || '',
    qualityScore: scoreHeadline(fav.headline, { inputs }).score,
    inputs,
    variationSeed: 0,
    isFavorite: true,
    reaction: null,
    comment: '',
    copyCount: 0,
    generatedAt: fav.savedAt || fav.generatedAt || new Date().toISOString(),
  };
};

// 상한 초과 시 정리 대상(즐겨찾기·리액션·코멘트 없는 오래된 항목)
const enforceCap = (entries) => {
  if (entries.length <= HISTORY_CAP) return entries;
  // 보호 대상: 즐겨찾기·리액션·코멘트가 있는 항목
  const isProtected = (e) => e.isFavorite || e.reaction || (e.comment && e.comment.trim());
  const protectedEntries = entries.filter(isProtected);
  const disposable = entries
    .filter((e) => !isProtected(e))
    .sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1)); // 최신 우선 보존
  const keepDisposable = disposable.slice(0, Math.max(0, HISTORY_CAP - protectedEntries.length));
  return [...protectedEntries, ...keepDisposable].sort((a, b) =>
    a.generatedAt < b.generatedAt ? 1 : -1
  );
};

export const useHistory = () => {
  const [entries, setEntries] = useState([]);
  const [storageError, setStorageError] = useState(null);
  const loadedRef = useRef(false);

  // 최초 로드 + v1 마이그레이션
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        // v1 즐겨찾기 1회 마이그레이션
        if (!localStorage.getItem(MIGRATION_FLAG)) {
          try {
            const raw = localStorage.getItem(V1_FAVORITES_KEY);
            if (raw) {
              const oldFavs = JSON.parse(raw);
              if (Array.isArray(oldFavs) && oldFavs.length) {
                await historyStore.put(oldFavs.map(migrateV1Favorite));
              }
            }
          } catch (e) {
            console.warn('v1 마이그레이션 건너뜀:', e);
          }
          localStorage.setItem(MIGRATION_FLAG, '1'); // 원본은 백업으로 보존
        }

        const all = await historyStore.getAll();
        setEntries(all);
      } catch (err) {
        console.error('이력 로드 실패:', err);
        setStorageError('이력을 불러오지 못했어요');
      }
    })();
  }, []);

  const byId = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [entries]);

  // 다건 추가(생성 결과 세트)
  const addMany = useCallback((newEntries) => {
    setEntries((prev) => {
      const merged = enforceCap([...newEntries, ...prev]);
      historyStore.put(newEntries).catch(() => setStorageError('저장 공간이 부족해요'));
      // 상한 정리로 사라진 항목은 저장소에서도 제거
      const keptIds = new Set(merged.map((e) => e.id));
      prev.forEach((e) => {
        if (!keptIds.has(e.id)) historyStore.remove(e.id).catch(() => {});
      });
      return merged;
    });
  }, []);

  // 부분 갱신
  const update = useCallback((id, patch) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const updated = next.find((e) => e.id === id);
      if (updated) historyStore.put(updated).catch(() => setStorageError('변경을 저장하지 못했어요'));
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    historyStore.remove(id).catch(() => setStorageError('삭제를 저장하지 못했어요'));
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    historyStore.clear().catch(() => setStorageError('초기화에 실패했어요'));
  }, []);

  // 편의 액션 (F11)
  const toggleFavorite = useCallback(
    (id) => {
      const e = byId[id];
      if (e) update(id, { isFavorite: !e.isFavorite });
    },
    [byId, update]
  );

  const setReaction = useCallback(
    (id, reaction) => {
      const e = byId[id];
      if (!e) return;
      update(id, { reaction: e.reaction === reaction ? null : reaction }); // 같은 것 재클릭 시 해제
    },
    [byId, update]
  );

  const setComment = useCallback((id, comment) => update(id, { comment }), [update]);

  const incrementCopy = useCallback(
    (id) => {
      const e = byId[id];
      if (e) update(id, { copyCount: (e.copyCount || 0) + 1 });
    },
    [byId, update]
  );

  return {
    entries,
    byId,
    storageError,
    addMany,
    update,
    remove,
    clear,
    toggleFavorite,
    setReaction,
    setComment,
    incrementCopy,
  };
};
