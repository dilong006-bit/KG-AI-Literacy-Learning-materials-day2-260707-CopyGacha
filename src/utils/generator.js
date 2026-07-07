/**
 * 카피 엔진 v2 (F14). 공식 + 조사 + 톤 + 품질 스코어링을 조합해
 * GenerationEntry(§5.1)를 만든다.
 */
import { formulas, formulaById } from '../data/formulas';
import { toneById, DEFAULT_TONE } from '../data/lexicon';
import { josa } from './josa';
import { scoreHeadline, QUALITY_THRESHOLD } from './quality';

const NUMBER_POOL = [3, 5, 7, 10, 15];
const DEFAULT_TARGET = '사람들';
const DEFAULT_BENEFIT = '특별함';
const MAX_TRIES = 12;

// 엔트리 id 충돌 방지용 세션 카운터 (performance.now() 클램핑으로 인한 동일 id 방지)
let entrySeq = 0;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomSeed = () => Math.floor(Math.random() * 1000);

// 템플릿의 {name} / {name:조사} 토큰을 실제 값으로 치환
const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)(?::([^}]+))?\}/g, (_, name, pair) => {
    const value = values[name] ?? '';
    if (pair) return `${value}${josa(value, pair)}`;
    return String(value);
  });

const buildValues = (inputs) => ({
  keyword: inputs.keyword,
  target: inputs.target?.trim() || DEFAULT_TARGET,
  benefit: inputs.benefit?.trim() || DEFAULT_BENEFIT,
});

// 톤 반영: 문법을 깨지 않는 선에서 장식/강조만 조정 (PRD §7 톤 프리셋)
const applyTone = (text, toneId) => {
  const tone = toneById[toneId] || toneById[DEFAULT_TONE];
  let result = text;

  if (tone.exclaim) {
    if (!result.endsWith('?')) {
      result = result.replace(/[.!]?$/, '!');
      // 이미 긴급 어휘가 없다면 문두에 '지금,' 부여 (평서문에 한함)
      if (!/지금|오늘|마감|단 하루/.test(result)) {
        result = `지금, ${result}`;
      }
    }
  }
  if (tone.suffixEmoji) result += tone.suffixEmoji;

  return result;
};

/**
 * 한 공식으로 GenerationEntry 후보를 여러 번 생성해 품질 기준을 통과한 것을 고른다.
 * 통과가 없으면 가장 높은 점수를 채택한다.
 * @param {object} formula
 * @param {object} inputs - { keyword, target, benefit, tone }
 * @param {string|null} exclude - 직전 문장(중복 방지)
 */
export const createEntry = (formula, inputs, exclude = null) => {
  const values = buildValues(inputs);
  const toneId = inputs.tone || DEFAULT_TONE;

  let best = null;
  for (let i = 0; i < MAX_TRIES; i += 1) {
    const template = pickRandom(formula.templates);
    const raw = fillTemplate(template, { ...values, number: pickRandom(NUMBER_POOL) });
    const headline = applyTone(raw, toneId);

    if (headline === exclude) continue;

    const { score, breakdown, hasCliche } = scoreHeadline(headline, { inputs });
    const candidate = { headline, score, breakdown };

    if (!best || score > best.score) best = candidate;
    // 클리셰 없고 임계 통과하면 즉시 채택
    if (!hasCliche && score >= QUALITY_THRESHOLD) break;
  }

  // 후보가 전무한 극단 상황 방어
  if (!best) {
    const template = pickRandom(formula.templates);
    const headline = applyTone(
      fillTemplate(template, { ...values, number: pickRandom(NUMBER_POOL) }),
      toneId
    );
    best = { ...scoreHeadline(headline, { inputs }), headline };
  }

  return {
    id: `gen_${Date.now()}_${Math.floor(performance.now() * 1000)}_${entrySeq++}`,
    headline: best.headline,
    formula: formula.id,
    formulaName: formula.name,
    formulaEmoji: formula.emoji,
    formulaFramework: formula.framework,
    formulaDescription: formula.description,
    qualityScore: best.score,
    qualityBreakdown: best.breakdown,
    inputs: {
      keyword: inputs.keyword,
      target: inputs.target || '',
      benefit: inputs.benefit || '',
      tone: toneId,
    },
    variationSeed: randomSeed(),
    // F11 피드백 / F12 학습 신호 필드
    isFavorite: false,
    reaction: null,
    comment: '',
    copyCount: 0,
    // F20/F21 중심 이미지 — 생성 시 비어 있고 비동기 페어링으로 채움
    image: null,
    imageStatus: 'none',
    generatedAt: new Date().toISOString(),
  };
};

/** 6가지 공식 전체에 대해 엔트리 세트를 생성한다. */
export const generateHeadlineSet = (inputs) =>
  formulas.map((formula) => createEntry(formula, inputs));

/** 특정 공식만 다시 생성(직전과 다른 표현). */
export const regenerateEntry = (formulaId, inputs, excludeHeadline) => {
  const formula = formulaById[formulaId];
  if (!formula) return null;
  return createEntry(formula, inputs, excludeHeadline);
};

/** 룰렛 애니메이션용 랜덤 문장 하나(장식용). */
export const randomSpinText = (inputs) => {
  const formula = pickRandom(formulas);
  const values = buildValues(inputs);
  return fillTemplate(pickRandom(formula.templates), {
    ...values,
    number: pickRandom(NUMBER_POOL),
  });
};
