// Phát âm bằng Web Speech API (miễn phí, chạy trên trình duyệt)
export function getEnglishVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'));
}

export function speak(text, { voiceURI, rate = 1 } = {}) {
  if (!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  const voices = getEnglishVoices();
  const chosen = voices.find((v) => v.voiceURI === voiceURI) || voices.find((v) => /Google US|Aria|Samantha|Zira/i.test(v.name)) || voices[0];
  if (chosen) u.voice = chosen;
  window.speechSynthesis.speak(u);
}

/** Tự đọc từ sau mỗi câu trả lời (đúng hay sai), chậm hơn tốc độ đọc đã chọn một chút */
export const AUTO_SPEAK_FACTOR = 0.85;
export function speakWord(word, settings = {}) {
  speak(word, { voiceURI: settings.voiceURI, rate: Math.max(0.5, (settings.speechRate || 1) * AUTO_SPEAK_FACTOR) });
}
