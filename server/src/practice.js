import { db } from './db.js';
import { requireAuth, publicUser } from './auth.js';
import { vnDay } from './time.js';

// Xu thưởng cho mỗi câu đúng, theo dạng bài (giống site mẫu)
export const REWARD = { flashcard: 50, quiz: 100, match: 100, typing: 100, listening: 150, mixed: 200, srs: 100, translate: 200, sentence: 200, flappy: 200, meteor: 200 };
export const MODE_LABEL = {
  flashcard: 'Flashcard', quiz: 'Trắc nghiệm', match: 'Nối từ với nghĩa', typing: 'Gõ từ vựng', listening: 'Nghe viết', mixed: 'Luyện tập Hỗn hợp', srs: 'Ôn tập SRS', translate: 'Dịch câu', sentence: 'Luyện đặt câu', flappy: 'Chim Chăm Chỉ', meteor: 'Bắn thiên thạch',
};

// Lịch ôn SRS: Lv1 +1 ngày, Lv2 +3, Lv3 +7, Lv4 +14, Lv5 = đã thuộc (không còn lịch, trừ khi đặt chu kỳ Lv5)
const SRS_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14 };

export function nextSrs(level, correct, level5CycleDays = 0, now = new Date()) {
  if (!correct) return { level: Math.max(0, level - 1), next: now.toISOString() };
  const lv = Math.min(5, level + 1);
  if (lv === 5) {
    return { level: 5, next: level5CycleDays ? new Date(now.getTime() + level5CycleDays * 864e5).toISOString() : null };
  }
  return { level: lv, next: new Date(now.getTime() + SRS_DAYS[lv] * 864e5).toISOString() };
}

function buildFilter(uid, q) {
  const where = ['v.user_id = ?'];
  const params = [uid];
  const ids = String(q.categoryIds || '')
    .split(',')
    .map(Number)
    .filter(Boolean);
  if (ids.length) {
    where.push(`v.category_id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  if (q.filter === 'notLearned') where.push('v.is_learned = 0 AND v.srs_level < 5');
  if (q.filter === 'learned') where.push('(v.is_learned = 1 OR v.srs_level >= 5)');
  if (q.withExample === '1') where.push("v.example IS NOT NULL AND TRIM(v.example) <> ''");
  return { where: where.join(' AND '), params };
}

const mapWord = (v) => ({
  id: v.id, word: v.word, ipa: v.ipa, pos: v.pos, meaning: v.meaning, example: v.example, note: v.note, exampleVi: v.example_vi || null, srsLevel: v.srs_level,
});

export function registerPracticeRoutes(app) {
  app.get('/api/practice/ready-count', requireAuth, (req, res) => {
    const { where, params } = buildFilter(req.user.id, req.query);
    res.json({ count: db.prepare(`SELECT COUNT(*) AS n FROM vocabularies v WHERE ${where}`).get(...params).n });
  });

  // Lấy từ cho một lượt học + "pool" từ khác để làm đáp án nhiễu
  app.get('/api/practice/batch', requireAuth, (req, res) => {
    const { where, params } = buildFilter(req.user.id, req.query);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const order = req.query.order === 'ordered' ? 'v.id ASC' : 'RANDOM()';
    const items = db.prepare(`SELECT * FROM vocabularies v WHERE ${where} ORDER BY ${order} LIMIT ?`).all(...params, limit).map(mapWord);
    const ids = new Set(items.map((i) => i.id));
    const pool = db
      .prepare('SELECT * FROM vocabularies WHERE user_id = ? ORDER BY RANDOM() LIMIT 120')
      .all(req.user.id)
      .filter((v) => !ids.has(v.id))
      .map(mapWord);
    res.json({ items, pool });
  });

  // Lưu kết quả một lượt: cập nhật SRS từng từ, đánh dấu đã thuộc, ghi lịch sử, cộng xu
  app.post('/api/practice/sessions', requireAuth, (req, res) => {
    const mode = String(req.body?.mode || '');
    if (!REWARD[mode]) return res.status(400).json({ error: 'Dạng bài không hợp lệ' });
    const results = (Array.isArray(req.body?.results) ? req.body.results : []).filter((r) => Number(r.id));
    if (!results.length) return res.status(400).json({ error: 'Chưa có kết quả để lưu' });
    const markLearned = new Set((req.body?.markLearned || []).map(Number));
    const settings = JSON.parse(req.user.settings_json || '{}');
    const cycle = Number(settings.level5CycleDays) || 0;

    const getWord = db.prepare('SELECT id, srs_level, is_learned FROM vocabularies WHERE id = ? AND user_id = ?');
    const upd = db.prepare('UPDATE vocabularies SET srs_level = ?, next_review_at = ?, last_reviewed_at = ?, is_learned = ? WHERE id = ?');
    const now = new Date();
    let correct = 0;
    db.exec('BEGIN');
    try {
      for (const r of results) {
        const w = getWord.get(Number(r.id), req.user.id);
        if (!w) continue;
        const ok = Boolean(r.correct);
        if (ok) correct += 1;
        const s = nextSrs(w.srs_level, ok, cycle, now);
        // Đúng: giữ "đã thuộc" cũ, hoặc đánh dấu mới nếu người dùng tick ở màn kết quả / lên Lv5. Sai: bỏ "đã thuộc".
        const learned = ok && (markLearned.has(w.id) || s.level >= 5 || w.is_learned) ? 1 : 0;
        upd.run(s.level, s.next, now.toISOString(), learned, w.id);
      }
      const coins = correct * REWARD[mode];
      db.prepare('INSERT INTO activity_log (user_id, day, mode, correct, total, score, coins) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(req.user.id, vnDay(now), mode, correct, results.length, coins, coins);
      db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coins, req.user.id);
      db.exec('COMMIT');
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      res.json({ correct, total: results.length, coins, balance: user.coins, user: publicUser(user) });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });

  app.get('/api/practice/history', requireAuth, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM activity_log WHERE user_id = ? AND mode <> \'freeze\' ORDER BY id DESC LIMIT 30')
      .all(req.user.id)
      .map((r) => ({
        id: r.id, mode: r.mode, label: MODE_LABEL[r.mode] || r.mode, correct: r.correct, total: r.total,
        accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0, score: r.score, createdAt: r.created_at,
      }));
    res.json(rows);
  });

  app.get('/api/practice/stats', requireAuth, (req, res) => {
    const all = db
      .prepare('SELECT COUNT(*) AS n, SUM(correct) AS c, SUM(total) AS t, SUM(score) AS s, MAX(score) AS m FROM activity_log WHERE user_id = ? AND mode <> \'freeze\'')
      .get(req.user.id);
    const byMode = db
      .prepare('SELECT mode, COUNT(*) AS n, SUM(correct) AS c, SUM(total) AS t FROM activity_log WHERE user_id = ? AND mode <> \'freeze\' GROUP BY mode ORDER BY n DESC')
      .all(req.user.id)
      .map((r) => ({ mode: r.mode, label: MODE_LABEL[r.mode] || r.mode, sessions: r.n, accuracy: r.t ? Math.round((r.c / r.t) * 100) : 0 }));
    res.json({
      sessions: all.n || 0,
      accuracy: all.t ? Math.round((all.c / all.t) * 100) : 0,
      totalScore: all.s || 0,
      bestScore: all.m || 0,
      byMode,
    });
  });
}
