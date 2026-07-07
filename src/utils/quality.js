/**
 * 헤드라인 품질 스코어링 (F14 / PRD §7.5).
 * 5개 축을 가중 합산해 0~100 점수를 낸다. 임계(60점) 미만이면 노출 전 재생성 대상.
 */
import {
  POWER_TRIGGERS,
  CLICHE_BLACKLIST,
  SPECIFIC_HINTS,
  BENEFIT_HINTS,
} from '../data/lexicon';

export const QUALITY_THRESHOLD = 60;

const ALL_TRIGGERS = Object.values(POWER_TRIGGERS).flat();

// 축별 배점 (합계 100)
const WEIGHTS = {
  clarity: 25,
  specific: 20,
  benefit: 25,
  compelling: 15,
  distinct: 15,
};

const includesAny = (text, list) => list.some((w) => text.includes(w));

/**
 * @returns {{ score:number, breakdown:object, hasCliche:boolean }}
 */
export const scoreHeadline = (headline, { inputs } = {}) => {
  const text = String(headline ?? '');
  const len = text.length;
  const benefit = inputs?.benefit?.trim();

  // 1) 명확성(Clarity): 모바일 가독 길이(권장 ≤30자)와 문장 복잡도
  let clarity = WEIGHTS.clarity;
  if (len > 40) clarity -= 12;
  else if (len > 30) clarity -= 5;
  if (len < 8) clarity -= 8;
  const commaCount = (text.match(/,/g) || []).length;
  if (commaCount >= 2) clarity -= 5; // 쉼표 남발 = 메시지 분산
  clarity = Math.max(0, clarity);

  // 2) 구체성(Specific): 숫자/기간/비율/고유명 포함
  const hasNumber = /\d/.test(text);
  const hasSpecificHint = includesAny(text, SPECIFIC_HINTS);
  let specific = 0;
  if (hasNumber) specific += 14;
  if (hasSpecificHint) specific += 6;
  specific = Math.min(WEIGHTS.specific, specific);

  // 3) 혜택 지향(Benefit-led): 결과·감정 어휘 또는 사용자 혜택 키워드
  let benefitScore = 0;
  if (benefit && text.includes(benefit)) benefitScore += 15;
  if (includesAny(text, BENEFIT_HINTS)) benefitScore += 12;
  benefitScore = Math.min(WEIGHTS.benefit, benefitScore);

  // 4) 긴급/매력(Compelling): 파워워드·감정 트리거 포함
  const triggerHits = ALL_TRIGGERS.filter((w) => text.includes(w)).length;
  const compelling = Math.min(WEIGHTS.compelling, triggerHits * 8);

  // 5) 차별성(Distinct): 클리셰 미포함이면 만점
  const hasCliche = includesAny(text, CLICHE_BLACKLIST);
  const distinct = hasCliche ? 3 : WEIGHTS.distinct;

  const breakdown = { clarity, specific, benefit: benefitScore, compelling, distinct };
  const score = Math.round(
    breakdown.clarity +
      breakdown.specific +
      breakdown.benefit +
      breakdown.compelling +
      breakdown.distinct
  );

  return { score: Math.max(0, Math.min(100, score)), breakdown, hasCliche };
};
