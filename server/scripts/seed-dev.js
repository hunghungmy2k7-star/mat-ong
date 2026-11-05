// Dữ liệu thử cho tài khoản dev (user id 1) – chỉ dùng khi phát triển.
import { db } from '../src/db.js';
import { vnDay, addDays } from '../src/time.js';

const uid = Number(process.argv[2] || 1);
const today = vnDay();
for (const d of [0, 1, 2, 4]) {
  db.prepare('INSERT INTO activity_log (user_id, day, mode, correct, total, score, coins) VALUES (?, ?, ?, 8, 10, 80, 10)')
    .run(uid, addDays(today, -d), 'quiz');
}
const past = new Date(Date.now() - 3600e3).toISOString();
const words = [
  ['consequence', 'hậu quả', 'noun', 1, 0],
  ['menace', 'mối đe dọa', 'noun', 0, 2],
  ['destruction', 'sự tàn phá', 'noun', 0, 1],
  ['damage', 'thiệt hại', 'noun', 0, 0],
  ['refine', 'tinh chỉnh', 'verb', 1, 5],
];
for (const [w, m, p, l, s] of words) {
  db.prepare('INSERT INTO vocabularies (user_id, word, meaning, pos, is_learned, srs_level, next_review_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uid, w, m, p, l, s, past);
}
db.prepare('INSERT OR IGNORE INTO pinned_paths (user_id, path_id) VALUES (?, 1)').run(uid);
console.log('Đã thêm dữ liệu thử cho user', uid);
