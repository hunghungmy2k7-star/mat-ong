// Bắn sự kiện để MemeHost (trong Cosmetics) hiện meme đang trang bị khi trả lời đúng/sai.
export function showMeme(correct) {
  window.dispatchEvent(new CustomEvent('matong:meme', { detail: { correct: Boolean(correct) } }));
}
