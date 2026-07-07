/**
 * 클립보드 복사 (Clipboard API → execCommand 폴백).
 * @returns {Promise<{success:boolean, message:string}>}
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true, message: '복사되었어요! 📋' };
    }
    throw new Error('Clipboard API unavailable');
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) return { success: true, message: '복사되었어요! 📋' };
      throw new Error('execCommand copy failed');
    } catch (err) {
      console.error('복사 실패:', err);
      return { success: false, message: '복사에 실패했어요. 직접 복사해주세요.' };
    }
  }
};
