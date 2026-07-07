/**
 * 카피 엔진 v2용 어휘 사전 (PRD §7.3 파워워드/감정 트리거, §7.6 클리셰 블랙리스트).
 */

// 감정 트리거 / 파워워드 (카테고리별)
export const POWER_TRIGGERS = {
  trust: ['검증된', '보장', '실제', '전문가의'],
  urgency: ['지금', '오늘까지', '단 하루', '마감 임박'],
  gain: ['무료', '절약', '2배', '되찾는'],
  curiosity: ['비밀', '아무도 모르는', '진짜 이유', '반전'],
  loss: ['실수', '놓치는', '후회', '뒤처지는'],
};

// 톤별 정의 (F10/F14) — 어투/장식 성향
export const TONES = [
  {
    id: 'professional',
    name: '전문적',
    emoji: '💼',
    // 문장 끝 장식(이모지 등) / 느낌표 여부
    suffixEmoji: '',
    exclaim: false,
  },
  {
    id: 'casual',
    name: '친근한',
    emoji: '☕',
    suffixEmoji: '',
    exclaim: false,
  },
  {
    id: 'playful',
    name: '재미있는',
    emoji: '🎉',
    suffixEmoji: ' ✨',
    exclaim: false,
  },
  {
    id: 'urgent',
    name: '긴급',
    emoji: '🔥',
    suffixEmoji: '',
    exclaim: true,
  },
];

export const DEFAULT_TONE = 'professional';
export const toneById = Object.fromEntries(TONES.map((t) => [t.id, t]));

/**
 * 클리셰(진부한 낚시성) 블랙리스트 (PRD §7.6).
 * 결과에 포함되면 품질 점수를 깎고 재생성을 유도한다.
 */
export const CLICHE_BLACKLIST = [
  '당신의 인생을 바꿀',
  '상상 그 이상',
  '최고의 선택',
  '놓치면 후회', // (fear 공식의 자연스러운 표현과 겹치지 않도록 '놓치면 후회하는 이유'는 허용 범위)
  '지금 바로 클릭',
  '믿기지 않는',
  '충격적인',
];

// 품질 점수에서 "구체성" 판단에 쓰는 신호
export const SPECIFIC_HINTS = ['분', '시간', '%', '배', '가지', '년', '위'];

// 품질 점수에서 "혜택 지향" 판단에 쓰는 신호
export const BENEFIT_HINTS = [
  '누리',
  '절약',
  '해결',
  '손에 넣',
  '현실',
  '되찾',
  '끝내',
  '활용',
  '사랑',
];
