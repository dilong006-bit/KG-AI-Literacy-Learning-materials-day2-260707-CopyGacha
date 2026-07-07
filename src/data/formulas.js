/**
 * 6가지 마케팅 헤드라인 공식 데이터 (카피 엔진 v2 / F14).
 *
 * 각 공식은 검증된 카피라이팅 프레임워크에 매핑된다.
 * 템플릿 토큰 문법:
 *   {keyword}          → 값 그대로 치환
 *   {keyword:을/를}    → 값 뒤에 받침에 맞는 조사 자동 부착
 *   {number}           → 랜덤 숫자
 *   {benefit}          → 핵심 혜택(빈 값이면 기본값)
 * 지원 조사: 을/를, 이/가, 은/는, 과/와, 로/으로, 이라면/라면
 */
export const formulas = [
  {
    id: 'numbers',
    name: '숫자형',
    emoji: '🔢',
    framework: '4U',
    description:
      '4U 프레임워크의 "Ultra-specific(초구체성)"을 적용합니다. 두루뭉술한 표현을 죽이고 숫자·기간·비율로 구체화하면 신뢰도와 클릭률이 함께 올라가요.',
    templates: [
      '{number}가지 이유로 당신이 {keyword:을/를} 사랑하게 될 거예요',
      '{keyword:을/를} 200% 활용하는 {number}가지 방법',
      '단 {number}분, {keyword:로/으로} {benefit:을/를} 끝내는 법',
      '상위 1%만 아는 {keyword}의 비밀 {number}가지',
      '전문가가 뽑은 {keyword} 핵심 {number}가지',
    ],
  },
  {
    id: 'question',
    name: '질문형',
    emoji: '❓',
    framework: 'AIDA',
    description:
      'AIDA의 첫 단계 "Attention(주의)"을 노립니다. 독자의 현재 고민을 되묻는 질문으로 "나도 그런데?"라는 몰입을 끌어내요.',
    templates: [
      '{target:이라면/라면} 꼭 알아야 할 {keyword}의 비밀',
      '혹시 {keyword:을/를} 잘못 쓰고 계신 건 아닐까요?',
      '{target}도 아직 모르는 {keyword}의 숨은 기능',
      '{benefit}, {keyword:로/으로} 해결해본 적 있으세요?',
      '왜 {target:은/는} {keyword:을/를} 선택할까요?',
    ],
  },
  {
    id: 'benefit',
    name: '혜택형',
    emoji: '🎁',
    framework: 'FAB',
    description:
      'FAB 프레임워크로 기능(Feature)이 아니라 고객이 얻는 결과·감정(Benefit)을 앞세웁니다. "그래서 나한테 뭐가 좋은데?"에 곧바로 답해요.',
    templates: [
      '{keyword} 하나로 {benefit:을/를} 손에 넣으세요',
      '이제 {keyword:로/으로} {benefit:이/가} 현실이 됩니다',
      '{keyword:로/으로} {benefit:을/를} 마음껏 누려보세요',
      '{target}처럼 {benefit:을/를} 원한다면, 답은 {keyword}',
      '{benefit:을/를} 원하세요? 그렇다면 {keyword}입니다',
    ],
  },
  {
    id: 'fear',
    name: '공포소구형',
    emoji: '⚠️',
    framework: 'PAS',
    description:
      'PAS 프레임워크로 문제를 짚고(과하지 않게) 손실 회피 심리를 자극한 뒤 해결책을 제시합니다. 지금 행동하지 않으면 놓칠 것을 강조해요.',
    templates: [
      '아직도 {keyword} 없이 버티고 계세요?',
      '{keyword} 없는 {target:은/는} 뒤처집니다',
      '다른 {target:은/는} 이미 시작했어요, 당신은요?',
      '{keyword:을/를} 모르면 {benefit:을/를} 놓칩니다',
      '지금 {keyword:을/를} 놓치면 후회하는 이유',
    ],
  },
  {
    id: 'curiosity',
    name: '호기심형',
    emoji: '💡',
    framework: 'Curiosity Gap',
    description:
      '핵심 정보를 살짝만 흘려 "더 알고 싶다"는 정보 격차를 만듭니다. 단, 과장·낚시는 배제해 신뢰를 지켜요.',
    templates: [
      '{keyword}의 숨겨진 기능, 지금 공개합니다',
      '전문가만 아는 {keyword}의 진짜 가치',
      '{keyword}, 이 정도일 줄은 몰랐어요',
      '{keyword:을/를} 제대로 쓰는 {target}들의 공통점',
      '{target}도 몰랐던 {keyword}의 반전 매력',
    ],
  },
  {
    id: 'trend',
    name: '트렌드형',
    emoji: '📈',
    framework: '4C',
    description:
      '4C의 "Credible(신뢰성)"을 최신성과 결합합니다. 시의성과 근거로 "지금·여기" 당위를 부여해 앞서가는 선택이라는 인상을 줘요.',
    templates: [
      '2026년 {target:이/가} 주목한 {keyword}',
      '요즘 뜨는 {keyword}, {benefit}까지 잡았다',
      '2026년, {target:은/는} {keyword:로/으로} 시작합니다',
      '{keyword}, 이제 {benefit}까지 진화했습니다',
      '지금 가장 핫한 {keyword} 트렌드 {number}가지',
    ],
  },
];

export const formulaById = Object.fromEntries(formulas.map((f) => [f.id, f]));
