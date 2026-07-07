/**
 * 인기 스타일 학습(F12)과 KPI 대시보드(F13) 집계 로직.
 * ML이 아니라 로컬 행동 신호의 규칙 기반 통계 집계 (PRD §2.3, §7.4).
 */
import { formulas } from '../data/formulas';
import { TONES } from '../data/lexicon';

// 신호 가중치 (PRD §7.4)
const W_COPY = 3;
const W_FAV = 2;
const REACTION_WEIGHT = { fire: 2, love: 2, like: 1, hmm: -1 };

// 추천을 켜기 위한 최소 신호 수 (콜드 스타트 방지, F12)
const MIN_SIGNALS_FOR_RECO = 5;

const reactionScoreOf = (reaction) => REACTION_WEIGHT[reaction] || 0;

/**
 * 공식별 StyleScore와 랭킹을 계산한다.
 * @returns {{ perFormula, ranking, topFormulas:Set, hasEnoughData:boolean }}
 */
export const computeStyleStats = (entries = []) => {
  const perFormula = {};
  formulas.forEach((f) => {
    perFormula[f.id] = { exposed: 0, copied: 0, favorited: 0, reactionScore: 0, score: 0 };
  });

  let totalSignals = 0;

  entries.forEach((e) => {
    const stat = perFormula[e.formula];
    if (!stat) return;
    stat.exposed += 1;
    const copies = e.copyCount || 0;
    if (copies > 0) {
      stat.copied += copies;
      totalSignals += copies;
    }
    if (e.isFavorite) {
      stat.favorited += 1;
      totalSignals += 1;
    }
    if (e.reaction) {
      stat.reactionScore += reactionScoreOf(e.reaction);
      totalSignals += 1;
    }
  });

  // 노출수로 정규화 (볼륨 편향 방지)
  Object.values(perFormula).forEach((s) => {
    const weighted = W_COPY * s.copied + W_FAV * s.favorited + s.reactionScore;
    s.score = s.exposed > 0 ? weighted / s.exposed : 0;
  });

  const ranking = formulas
    .map((f) => f.id)
    .sort((a, b) => perFormula[b].score - perFormula[a].score);

  const hasEnoughData = totalSignals >= MIN_SIGNALS_FOR_RECO;
  // 점수가 양(+)인 상위 2개만 '인기' 배지 대상
  const topFormulas = new Set(
    hasEnoughData ? ranking.filter((id) => perFormula[id].score > 0).slice(0, 2) : []
  );

  return { perFormula, ranking, topFormulas, hasEnoughData };
};

// "채택" = 복사되었거나 즐겨찾기이거나 긍정 리액션
const isAdopted = (e) =>
  (e.copyCount || 0) > 0 || e.isFavorite || ['like', 'love', 'fire'].includes(e.reaction);

/**
 * KPI 대시보드용 지표 (F13 / PRD §3.2).
 */
export const computeKpis = (entries = []) => {
  const total = entries.length;
  const adopted = entries.filter(isAdopted).length;
  const favoriteCount = entries.filter((e) => e.isFavorite).length;

  const formulaDistribution = {};
  formulas.forEach((f) => {
    formulaDistribution[f.id] = { name: f.name, emoji: f.emoji, count: 0, adopted: 0 };
  });
  const toneDistribution = {};
  TONES.forEach((t) => {
    toneDistribution[t.id] = { name: t.name, emoji: t.emoji, count: 0 };
  });
  const reactionComposition = { like: 0, love: 0, fire: 0, hmm: 0 };

  let qualitySum = 0;
  let qualityCount = 0;

  entries.forEach((e) => {
    if (formulaDistribution[e.formula]) {
      formulaDistribution[e.formula].count += 1;
      if (isAdopted(e)) formulaDistribution[e.formula].adopted += 1;
    }
    const tone = e.inputs?.tone;
    if (tone && toneDistribution[tone]) toneDistribution[tone].count += 1;
    if (e.reaction && reactionComposition[e.reaction] !== undefined) {
      reactionComposition[e.reaction] += 1;
    }
    if (typeof e.qualityScore === 'number') {
      qualitySum += e.qualityScore;
      qualityCount += 1;
    }
  });

  // 품질 추이: 오래된→최신 순 최근 20개
  const qualityTrend = [...entries]
    .sort((a, b) => (a.generatedAt < b.generatedAt ? -1 : 1))
    .slice(-20)
    .map((e) => e.qualityScore || 0);

  return {
    total,
    adopted,
    adoptRate: total > 0 ? Math.round((adopted / total) * 100) : 0,
    favoriteCount,
    avgQuality: qualityCount > 0 ? Math.round(qualitySum / qualityCount) : 0,
    formulaDistribution,
    toneDistribution,
    reactionComposition,
    qualityTrend,
  };
};
