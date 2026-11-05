export const REWARD = { flashcard: 5, quiz: 10, match: 10, typing: 10, listening: 15, mixed: 20, srs: 10, translate: 20, sentence: 20, flappy: 20, meteor: 20 };
export const DEFAULT_SRS_MODES = { 0: 'quiz', 1: 'quiz', 2: 'typing', 3: 'listening', 4: 'listening' };

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const stripMarks = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// Chuẩn hóa câu trả lời gõ tay: bỏ hoa/thường, khoảng trắng thừa, dấu câu đầu/cuối, thống nhất dấu nháy
export function normalizeAnswer(s, { dropMarks = false } = {}) {
  let t = String(s || '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.,!?;:"]+|[\s.,!?;:"]+$/g, '');
  if (dropMarks) t = stripMarks(t);
  return t;
}

export const isCorrectWord = (input, word) => normalizeAnswer(input) === normalizeAnswer(word);

// Nghĩa tiếng Việt: chấp nhận khi khớp một trong các nghĩa (tách bởi , ; /), không phân biệt dấu
export function isCorrectMeaning(input, meaning) {
  const a = normalizeAnswer(input, { dropMarks: true });
  if (!a) return false;
  const parts = String(meaning || '')
    .split(/[,;/]|\bhoặc\b/)
    .map((p) => normalizeAnswer(p.replace(/\(.*?\)/g, ''), { dropMarks: true }))
    .filter(Boolean);
  return parts.some((p) => p === a) || normalizeAnswer(meaning, { dropMarks: true }) === a;
}

// Che từ trong câu ví dụ cho chế độ "Ngữ cảnh"
export function maskWord(example, word) {
  if (!example || !word) return null;
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${esc}\\w*`, 'gi');
  if (!re.test(example)) return null;
  return example.replace(re, '_____');
}

// Tạo 4 đáp án (1 đúng + 3 nhiễu khác nhau)
export function buildOptions(item, candidates, field) {
  const right = item[field];
  const seen = new Set([right.toLowerCase()]);
  const wrong = [];
  for (const c of shuffle(candidates)) {
    const v = c[field];
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      wrong.push(v);
    }
    if (wrong.length === 3) break;
  }
  return shuffle([right, ...wrong]);
}

// Gợi ý gõ từ: "_ _ s _ _" – mở dần từng chữ cái ngẫu nhiên
export function hintPattern(word, revealed) {
  return [...word].map((ch, i) => (ch === ' ' ? ' ' : /[a-z0-9]/i.test(ch) && !revealed.has(i) ? '_' : ch)).join(' ');
}
export function revealOne(word, revealed) {
  const hidden = [...word].map((ch, i) => i).filter((i) => /[a-z0-9]/i.test(word[i]) && !revealed.has(i));
  if (!hidden.length) return revealed;
  const next = new Set(revealed);
  next.add(hidden[Math.floor(Math.random() * hidden.length)]);
  return next;
}
