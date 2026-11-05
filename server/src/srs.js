import { db } from './db.js';
import { requireAuth, publicUser } from './auth.js';

export const DEFAULT_SRS_MODES = { 0: 'quiz', 1: 'quiz', 2: 'typing', 3: 'listening', 4: 'listening' };

// Từ "cần ôn": chưa đạt Lv5 và đã tới hạn (hoặc chưa có lịch = từ mới), hoặc Lv5 có chu kỳ ôn đã tới hạn
const DUE_SQL = `((v.srs_level < 5 AND (v.next_review_at IS NULL OR v.next_review_at <= ?))
                 OR (v.srs_level >= 5 AND v.next_review_at IS NOT NULL AND v.next_review_at <= ?))`;

function scope(uid, q) {
  const where = ['v.user_id = ?'];
  const params = [uid];
  const ids = String(q.categoryIds || '').split(',').map(Number).filter(Boolean);
  if (ids.length) {
    where.push(`v.category_id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  if (q.pathId) {
    where.push('v.category_id IN (SELECT id FROM categories WHERE path_id = ?)');
    params.push(Number(q.pathId));
  }
  return { where, params };
}

export function registerSrsRoutes(app) {
  app.get('/api/srs/overview', requireAuth, (req, res) => {
    const now = new Date().toISOString();
    const { where, params } = scope(req.user.id, req.query);
    const w = where.join(' AND ');
    const levels = [0, 0, 0, 0, 0, 0];
    db.prepare(`SELECT srs_level AS l, COUNT(*) AS n FROM vocabularies v WHERE ${w} GROUP BY srs_level`).all(...params)
      .forEach((r) => { levels[Math.min(5, r.l)] = r.n; });
    const due = db.prepare(`SELECT COUNT(*) AS n FROM vocabularies v WHERE ${w} AND ${DUE_SQL}`).get(...params, now, now).n;

    // Danh sách từ (lọc theo level / cần ôn / tìm kiếm), tối đa 300 dòng
    const lw = [...where];
    const lp = [...params];
    if (req.query.level === 'due') { lw.push(DUE_SQL); lp.push(now, now); }
    else if (req.query.level !== undefined && req.query.level !== '' && req.query.level !== 'all') { lw.push('v.srs_level = ?'); lp.push(Number(req.query.level)); }
    if (req.query.search) { lw.push('(v.word LIKE ? OR v.meaning LIKE ?)'); lp.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    const words = db
      .prepare(`SELECT v.id, v.word, v.meaning, v.srs_level, v.next_review_at FROM vocabularies v WHERE ${lw.join(' AND ')}
                ORDER BY CASE WHEN v.next_review_at IS NULL THEN 0 ELSE 1 END, v.next_review_at, v.id LIMIT 300`)
      .all(...lp)
      .map((v) => ({
        id: v.id, word: v.word, meaning: v.meaning, level: v.srs_level, nextReviewAt: v.next_review_at,
        isDue: (v.srs_level < 5 && (!v.next_review_at || v.next_review_at <= now)) || (v.srs_level >= 5 && v.next_review_at && v.next_review_at <= now),
      }));
    const total = db.prepare(`SELECT COUNT(*) AS n FROM vocabularies v WHERE ${lw.join(' AND ')}`).get(...lp).n;
    res.json({ levels, due, words, total });
  });

  // Lấy từ cần ôn cho một phiên (ưu tiên quá hạn lâu nhất), kèm pool đáp án nhiễu
  app.get('/api/srs/candidates', requireAuth, (req, res) => {
    const now = new Date().toISOString();
    const { where, params } = scope(req.user.id, req.query);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const items = db
      .prepare(`SELECT * FROM vocabularies v WHERE ${where.join(' AND ')} AND ${DUE_SQL}
                ORDER BY CASE WHEN v.next_review_at IS NULL THEN 1 ELSE 0 END, v.next_review_at, RANDOM() LIMIT ?`)
      .all(...params, now, now, limit)
      .map((v) => ({ id: v.id, word: v.word, ipa: v.ipa, pos: v.pos, meaning: v.meaning, example: v.example, note: v.note, srsLevel: v.srs_level }));
    const ids = new Set(items.map((i) => i.id));
    const pool = db.prepare('SELECT id, word, meaning FROM vocabularies WHERE user_id = ? ORDER BY RANDOM() LIMIT 120')
      .all(req.user.id).filter((v) => !ids.has(v.id));
    res.json({ items, pool });
  });

  app.put('/api/srs/settings', requireAuth, (req, res) => {
    const modes = { ...DEFAULT_SRS_MODES };
    const allowed = ['flashcard', 'quiz', 'typing', 'listening'];
    Object.entries(req.body?.modes || {}).forEach(([k, v]) => { if (k in modes && allowed.includes(v)) modes[k] = v; });
    const cycle = [0, 15, 30, 45, 60].includes(Number(req.body?.level5CycleDays)) ? Number(req.body.level5CycleDays) : 0;
    const settings = { ...JSON.parse(req.user.settings_json || '{}'), srsModes: modes, level5CycleDays: cycle };
    db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify(settings), req.user.id);
    // Đổi chu kỳ Lv5: áp dụng ngay cho các từ Lv5 hiện có
    db.prepare('UPDATE vocabularies SET next_review_at = ? WHERE user_id = ? AND srs_level >= 5')
      .run(cycle ? new Date(Date.now() + cycle * 864e5).toISOString() : null, req.user.id);
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  });
}
