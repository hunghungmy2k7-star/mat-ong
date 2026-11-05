import { avatarOf } from './catalog.js';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { STARTER_PATHS } from './seed/starter-paths.js';

// ---- Quyền quản trị lộ trình: ADMIN_EMAILS (cách nhau bằng dấu phẩy). Chế độ dev chưa cấu hình: ai cũng là admin.
export function isAdmin(user) {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return process.env.NODE_ENV !== 'production';
  return list.includes(String(user.email).toLowerCase());
}
const requireAdmin = (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: 'Chỉ quản trị viên mới thực hiện được' }));

const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'lo-trinh';

function groupId(name) {
  const g = db.prepare('SELECT id FROM path_groups WHERE name = ?').get(name);
  if (g) return g.id;
  const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM path_groups').get().s;
  return Number(db.prepare('INSERT INTO path_groups (name, sort) VALUES (?, ?)').run(name, sort).lastInsertRowid);
}

/** Tạo lộ trình từ danh sách {setName, word, ipa, pos, meaning, example} */
export function createPath({ group, slug, name, description, difficulty }, rows) {
  let finalSlug = slug || slugify(name);
  while (db.prepare('SELECT 1 FROM paths WHERE slug = ?').get(finalSlug)) finalSlug += '-2';
  const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM paths').get().s;
  const pathId = Number(db.prepare('INSERT INTO paths (group_id, slug, name, description, difficulty, sort) VALUES (?, ?, ?, ?, ?, ?)')
    .run(groupId(group), finalSlug, name, description || null, Math.min(5, Math.max(1, Number(difficulty) || 1)), sort).lastInsertRowid);
  const setIds = {};
  const insSet = db.prepare('INSERT INTO word_sets (path_id, name, sort) VALUES (?, ?, ?)');
  const insWord = db.prepare('INSERT INTO path_words (word_set_id, word, ipa, pos, meaning, example) VALUES (?, ?, ?, ?, ?, ?)');
  rows.forEach((r) => {
    const setName = String(r.setName || 'Bộ 1').trim();
    if (!setIds[setName]) {
      const n = Object.keys(setIds).length + 1;
      setIds[setName] = Number(insSet.run(pathId, `${n}. ${setName.replace(/^\d+\.\s*/, '')}`, n).lastInsertRowid);
    }
    if (r.word && r.meaning) insWord.run(setIds[setName], r.word.trim(), r.ipa || null, r.pos || null, r.meaning.trim(), r.example || null);
  });
  return { id: pathId, slug: finalSlug };
}

// Nạp bộ lộ trình khởi đầu nếu chưa có
(function seedStarter() {
  db.exec('BEGIN');
  for (const p of STARTER_PATHS) {
    if (db.prepare('SELECT 1 FROM paths WHERE slug = ?').get(p.slug)) continue;
    const rows = [];
    Object.entries(p.sets).forEach(([setName, text]) => {
      text.trim().split('\n').forEach((line) => {
        const [word, ipa, pos, meaning, example] = line.split('|').map((x) => x.trim());
        rows.push({ setName, word, ipa, pos, meaning, example });
      });
    });
    createPath(p, rows);
  }
  // dọn các lộ trình rỗng do bản cũ tạo
  db.exec('DELETE FROM paths WHERE id NOT IN (SELECT DISTINCT path_id FROM word_sets)');
  db.exec('COMMIT');
})();

const PATH_STATS = `
  (SELECT COUNT(*) FROM word_sets w WHERE w.path_id = p.id) AS set_count,
  (SELECT COUNT(*) FROM path_words pw JOIN word_sets w ON w.id = pw.word_set_id WHERE w.path_id = p.id) AS word_count,
  (SELECT COUNT(*) FROM vocabularies v JOIN categories c ON c.id = v.category_id
     WHERE c.path_id = p.id AND v.user_id = ? AND (v.is_learned = 1 OR v.srs_level >= 5)) AS learned_count,
  EXISTS(SELECT 1 FROM pinned_paths pp WHERE pp.path_id = p.id AND pp.user_id = ?) AS pinned`;

const mapPath = (p) => ({
  id: p.id, slug: p.slug, name: p.name, description: p.description, difficulty: p.difficulty, setCount: p.set_count,
  wordCount: p.word_count, learned: p.learned_count, progress: p.word_count ? Math.round((p.learned_count / p.word_count) * 100) : 0,
  pinned: Boolean(p.pinned), groupId: p.group_id,
});

// Bảo đảm người dùng có "bộ từ ẩn" chứa các từ của word set (để dùng chung game, SRS, thống kê)
export function ensureSetCategory(uid, setId) {
  const set = db.prepare('SELECT w.*, p.name AS path_name FROM word_sets w JOIN paths p ON p.id = w.path_id WHERE w.id = ?').get(setId);
  if (!set) return null;
  let cat = db.prepare('SELECT id FROM categories WHERE user_id = ? AND word_set_id = ?').get(uid, setId);
  if (!cat) {
    cat = { id: Number(db.prepare('INSERT INTO categories (user_id, name, description, icon, path_id, word_set_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uid, `${set.path_name} · ${set.name}`, 'Bộ từ trong lộ trình', '🗺️', set.path_id, setId).lastInsertRowid) };
  }
  db.prepare(`INSERT INTO vocabularies (user_id, category_id, word, ipa, pos, meaning, example, path_word_id)
              SELECT ?, ?, pw.word, pw.ipa, pw.pos, pw.meaning, pw.example, pw.id FROM path_words pw
              WHERE pw.word_set_id = ? AND pw.id NOT IN (SELECT path_word_id FROM vocabularies WHERE user_id = ? AND path_word_id IS NOT NULL)`)
    .run(uid, cat.id, setId, uid);
  return cat.id;
}

export function registerPathRoutes(app) {
  app.get('/api/paths/summary', requireAuth, (req, res) => {
    const uid = req.user.id;
    const groups = db.prepare('SELECT * FROM path_groups ORDER BY sort').all();
    const paths = db.prepare(`SELECT p.*, ${PATH_STATS} FROM paths p ORDER BY p.sort`).all(uid, uid).map(mapPath);
    res.json({
      isAdmin: isAdmin(req.user),
      pinned: paths.filter((p) => p.pinned),
      groups: groups.map((g) => ({ id: g.id, name: g.name, paths: paths.filter((p) => p.groupId === g.id) })),
    });
  });

  app.get('/api/paths/:slug', requireAuth, (req, res) => {
    const uid = req.user.id;
    const p = db.prepare(`SELECT p.*, ${PATH_STATS} FROM paths p WHERE p.slug = ?`).get(uid, uid, req.params.slug);
    if (!p) return res.status(404).json({ error: 'Không tìm thấy lộ trình' });
    const sets = db.prepare(`
      SELECT w.*, (SELECT COUNT(*) FROM path_words pw WHERE pw.word_set_id = w.id) AS word_count,
        (SELECT COUNT(*) FROM vocabularies v JOIN categories c ON c.id = v.category_id
           WHERE c.word_set_id = w.id AND v.user_id = ? AND (v.is_learned = 1 OR v.srs_level >= 5)) AS learned_count
      FROM word_sets w WHERE w.path_id = ? ORDER BY w.sort`).all(uid, p.id)
      .map((w) => ({ id: w.id, name: w.name, sort: w.sort, wordCount: w.word_count, learned: w.learned_count }));
    res.json({ path: { ...mapPath(p), isAdmin: isAdmin(req.user) }, sets });
  });

  app.post('/api/paths/:id/pin', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const exists = db.prepare('SELECT 1 FROM pinned_paths WHERE user_id = ? AND path_id = ?').get(req.user.id, id);
    if (exists) db.prepare('DELETE FROM pinned_paths WHERE user_id = ? AND path_id = ?').run(req.user.id, id);
    else db.prepare('INSERT INTO pinned_paths (user_id, path_id) VALUES (?, ?)').run(req.user.id, id);
    res.json({ pinned: !exists });
  });

  // BXH theo % hoàn thành lộ trình
  app.get('/api/paths/:id/leaderboard', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const total = db.prepare('SELECT COUNT(*) AS n FROM path_words pw JOIN word_sets w ON w.id = pw.word_set_id WHERE w.path_id = ?').get(id).n;
    const rows = db.prepare(`
      SELECT u.id, u.name, u.avatar_url, u.settings_json, COUNT(*) AS learned FROM vocabularies v
      JOIN categories c ON c.id = v.category_id JOIN users u ON u.id = v.user_id
      WHERE c.path_id = ? AND (v.is_learned = 1 OR v.srs_level >= 5)
      GROUP BY u.id ORDER BY learned DESC, u.id LIMIT 100`).all(id)
      .map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, avatarUrl: avatarOf(r), learned: r.learned,
        progress: total ? Math.round((r.learned / total) * 100) : 0, isMe: r.id === req.user.id }));
    res.json({ total, rows });
  });

  app.get('/api/word-sets/:id', requireAuth, (req, res) => {
    const uid = req.user.id;
    const set = db.prepare('SELECT w.*, p.slug, p.name AS path_name, p.id AS pid FROM word_sets w JOIN paths p ON p.id = w.path_id WHERE w.id = ?')
      .get(Number(req.params.id));
    if (!set) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    const cat = db.prepare('SELECT id FROM categories WHERE user_id = ? AND word_set_id = ?').get(uid, set.id);
    const words = db.prepare(`
      SELECT pw.*, v.id AS vid, v.is_learned, v.srs_level FROM path_words pw
      LEFT JOIN vocabularies v ON v.path_word_id = pw.id AND v.user_id = ?
      WHERE pw.word_set_id = ? ORDER BY pw.id`).all(uid, set.id)
      .map((w) => ({ id: w.id, vocabId: w.vid, word: w.word, ipa: w.ipa, pos: w.pos, meaning: w.meaning, example: w.example,
        isLearned: Boolean(w.is_learned) || w.srs_level >= 5 }));
    res.json({ set: { id: set.id, name: set.name, pathId: set.pid, pathSlug: set.slug, pathName: set.path_name, categoryId: cat?.id || null }, words });
  });

  app.post('/api/word-sets/:id/start', requireAuth, (req, res) => {
    const catId = ensureSetCategory(req.user.id, Number(req.params.id));
    if (!catId) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    res.json({ categoryId: catId });
  });

  // ---- Quản trị: nhập lộ trình từ file / xóa lộ trình ----
  app.post('/api/admin/paths', requireAuth, requireAdmin, (req, res) => {
    const b = req.body || {};
    if (!String(b.name || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập tên lộ trình' });
    if (!String(b.group || '').trim()) return res.status(400).json({ error: 'Vui lòng chọn nhóm' });
    const rows = (Array.isArray(b.rows) ? b.rows : []).filter((r) => r.word && r.meaning);
    if (!rows.length) return res.status(400).json({ error: 'File chưa có dòng từ vựng hợp lệ' });
    db.exec('BEGIN');
    try {
      const r = createPath({ group: b.group.trim(), name: b.name.trim(), description: b.description, difficulty: b.difficulty }, rows);
      db.exec('COMMIT');
      res.json({ ...r, words: rows.length });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });

  app.delete('/api/admin/paths/:id', requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    db.prepare('UPDATE categories SET path_id = NULL, word_set_id = NULL WHERE path_id = ?').run(id);
    db.prepare('DELETE FROM paths WHERE id = ?').run(id);
    res.json({ ok: true });
  });
}
