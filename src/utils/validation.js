/**
 * 입력값 검증 로직. 폼(InputForm)과 생성 훅에서 공통으로 사용한다.
 */
export const KEYWORD_MAX = 50;
export const OPTIONAL_MAX = 30;

/**
 * 키워드(필수) 검증. 문제가 없으면 null, 있으면 에러 메시지를 반환한다.
 */
export const validateKeyword = (keyword) => {
  const value = String(keyword ?? '').trim();

  if (!value) return '키워드를 입력해주세요';
  if (value.length > KEYWORD_MAX) return `키워드는 ${KEYWORD_MAX}자 이내로 입력해주세요`;
  // 특수문자/공백만 있는 경우 방지 (의미 있는 글자가 최소 1개 필요)
  if (!/[가-힣a-zA-Z0-9]/.test(value)) {
    return '의미 있는 키워드를 입력해주세요 (특수문자만으로는 만들 수 없어요)';
  }
  return null;
};

/**
 * 폼 전체 검증. 필드명 → 에러 메시지 객체를 반환한다. (에러 없으면 빈 객체)
 */
export const validateForm = ({ keyword, target, benefit }) => {
  const errors = {};

  const keywordError = validateKeyword(keyword);
  if (keywordError) errors.keyword = keywordError;

  if (String(target ?? '').length > OPTIONAL_MAX) {
    errors.target = `${OPTIONAL_MAX}자 이내로 입력해주세요`;
  }
  if (String(benefit ?? '').length > OPTIONAL_MAX) {
    errors.benefit = `${OPTIONAL_MAX}자 이내로 입력해주세요`;
  }

  return errors;
};
