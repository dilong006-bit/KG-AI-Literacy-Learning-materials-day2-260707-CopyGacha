/**
 * 한국어 조사(助詞) 자동 선택 유틸리티.
 *
 * 단어의 마지막 글자에 받침(종성)이 있는지에 따라 알맞은 조사를 골라준다.
 * 예) josa('이어폰', '을/를') → '을',  josa('가방', '을/를') → '을'
 *     josa('사과', '을/를')   → '를',  josa('이어폰', '로/으로') → '으로'
 *
 * 한글 음절이 아닌 경우(영문/숫자)는 받침이 없는 형태로 처리한다.
 * (예: "Pro를" — 대부분의 외래어에서 자연스럽게 읽히는 기본값)
 */

// 한글 음절 유니코드 범위: 가(0xAC00) ~ 힣(0xD7A3)
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

// 마지막 글자의 종성(받침) 정보. { hasBatchim, isRieul }
const analyzeLastChar = (word) => {
  const text = String(word ?? '').trim();
  if (!text) return { hasBatchim: false, isRieul: false, isHangul: false };

  const code = text.charCodeAt(text.length - 1);
  if (code < HANGUL_START || code > HANGUL_END) {
    return { hasBatchim: false, isRieul: false };
  }

  const jongseong = (code - HANGUL_START) % 28; // 0이면 받침 없음, 8이면 ㄹ받침
  return {
    hasBatchim: jongseong !== 0,
    isRieul: jongseong === 8,
  };
};

/**
 * 단어에 맞는 조사만 반환한다.
 * @param {string} word - 앞 단어
 * @param {string} pair - '받침형/무받침형' (예: '을/를', '이/가', '은/는', '과/와', '로/으로', '이라면/라면')
 * @returns {string} 선택된 조사
 */
export const josa = (word, pair) => {
  const [withBatchim, withoutBatchim] = pair.split('/');
  const { hasBatchim, isRieul } = analyzeLastChar(word);

  // '로/으로'는 특수 규칙: 받침이 없거나 ㄹ받침이면 '로', 그 외에는 '으로'
  if (pair === '로/으로') {
    return !hasBatchim || isRieul ? '로' : '으로';
  }

  return hasBatchim ? withBatchim : withoutBatchim;
};

/** 단어 + 조사를 붙여서 반환한다. 예) appendJosa('이어폰', '을/를') → '이어폰을' */
export const appendJosa = (word, pair) => `${word}${josa(word, pair)}`;
