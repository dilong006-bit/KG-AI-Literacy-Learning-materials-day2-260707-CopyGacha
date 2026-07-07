import { useState, useCallback, useEffect, useRef } from 'react';
import { generateHeadlineSet, regenerateEntry } from '../utils/generator';
import { validateKeyword } from '../utils/validation';
import { useCopyImages } from './useCopyImages';

// 룰렛 애니메이션 시간(ms)
const ROLL_DURATION = 1600;

/**
 * 헤드라인 생성 흐름을 담당한다. 생성 결과는 history(단일 소스)에 적재하고,
 * 현재 세션에 노출 중인 엔트리 id 목록(currentIds)만 로컬로 관리한다.
 * @param {object} history - useHistory() 반환값
 */
export const useHeadlineGenerator = (history) => {
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  const [currentIds, setCurrentIds] = useState([]);
  const timerRef = useRef(null);

  // 이벤트 콜백에서 항상 최신 값을 참조하기 위한 ref 미러
  const historyRef = useRef(history);
  historyRef.current = history;
  const currentIdsRef = useRef(currentIds);
  currentIdsRef.current = currentIds;

  // 이미지 페어링 오케스트레이터(setTimeout 콜백에서 최신 참조 위해 ref 미러)
  const imageOrchestrator = useCopyImages(history);
  const imageOrchestratorRef = useRef(imageOrchestrator);
  imageOrchestratorRef.current = imageOrchestrator;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const generateHeadlines = useCallback((keyword, target = '', benefit = '', tone = 'professional') => {
    const inputs = {
      keyword: keyword.trim(),
      target: target.trim(),
      benefit: benefit.trim(),
      tone,
    };

    const validationError = validateKeyword(inputs.keyword);
    if (validationError) {
      setError(validationError);
      setCurrentIds([]);
      setRolling(false);
      return;
    }

    setError(null);
    setLastInputs(inputs);
    setRolling(true);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const set = generateHeadlineSet(inputs);
        historyRef.current.addMany(set);
        setCurrentIds(set.map((e) => e.id));
        // 카드는 먼저 뜨고, 중심 이미지는 비동기로 채워진다(논블로킹)
        imageOrchestratorRef.current.fetchForSet(set);
      } catch {
        setError('헤드라인 생성 중 오류가 발생했어요. 다시 시도해주세요.');
      } finally {
        setRolling(false);
      }
    }, ROLL_DURATION);
  }, []);

  // 특정 공식 카드만 다시 생성 (같은 입력, 직전과 다른 표현)
  const regenerateFormula = useCallback((formulaId) => {
    const byId = historyRef.current.byId;
    const curId = currentIdsRef.current.find((id) => byId[id]?.formula === formulaId);
    const cur = byId[curId];
    const inputs = cur?.inputs || lastInputs;
    if (!inputs) return;

    const newEntry = regenerateEntry(formulaId, inputs, cur?.headline);
    if (!newEntry) return;

    historyRef.current.addMany([newEntry]);
    setCurrentIds((prev) => prev.map((id) => (id === curId ? newEntry.id : id)));
    // 재생성 시 새 엔트리에 새 이미지 페어링
    imageOrchestratorRef.current.fetchForEntry(newEntry);
  }, [lastInputs]);

  return {
    rolling,
    error,
    lastInputs,
    currentIds,
    generateHeadlines,
    regenerateFormula,
  };
};
