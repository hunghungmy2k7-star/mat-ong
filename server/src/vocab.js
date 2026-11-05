import { db } from './db.js';
import { requireAuth } from './auth.js';

// Không còn phân biệt Free/PRO: mọi tài khoản dùng chung một giới hạn an toàn (chống lạm dụng)
const WORD_LIMIT = Number(process.env.WORD_LIMIT || 20000);
const ICONS = ['📚', '📖', '📝', '✏️', '📕', '⭐', '🎯', '💡', '🔥', '💎', '🎓', '🌟'];

const wordLimit = () => WORD_LIMIT;
const wordCount = (uid) => db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE user_id = ?').get(uid).n;

const clean = (v, max = 500) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);

function normalizeWord(w) {
  return {
    word: clean(w.word, 200),
    ipa: clean(w.ipa, 120),
    pos: clean(w.pos, 40)?.toLowerCase() || null,
    meaning: clean(w.meaning, 500),
    example: clean(w.example, 1000),
    note: clean(w.note, 1000),
  };
}

const mapVocab = (v) => ({
  id: v.id,
  categoryId: v.category_id,
  categoryName: v.category_name,
  word: v.word,
  ipa: v.ipa,
  pos: v.pos,
  meaning: v.meaning,
  example: v.example,
  note: v.note,
  isLearned: Boolean(v.is_learned) || v.srs_level >= 5,
  srsLevel: v.srs_level,
  nextReviewAt: v.next_review_at,
});

function ownCategory(uid, id) {
  return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(Number(id), uid);
}
function ownFolder(uid, id) {
  return db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(Number(id), uid);
}

function categoryRows(uid, where = '', params = []) {
  return db
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM vocabularies v WHERE v.category_id = c.id) AS word_count,
         (SELECT COUNT(*) FROM vocabularies v WHERE v.category_id = c.id AND (v.is_learned = 1 OR v.srs_level >= 5)) AS learned_count
       FROM categories c WHERE c.user_id = ? ${where} ORDER BY c.created_at DESC, c.id DESC`
    )
    .all(uid, ...params)
    .map((c) => ({
      id: c.id,
      folderId: c.folder_id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      isPath: Boolean(c.path_id),
      isPublic: Boolean(c.is_public),
      wordCount: c.word_count,
      learnedCount: c.learned_count,
      createdAt: c.created_at,
    }));
}

function insertWords(uid, categoryId, items) {
  const stmt = db.prepare(
    'INSERT INTO vocabularies (user_id, category_id, word, ipa, pos, meaning, example, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  let n = 0;
  db.exec('BEGIN');
  try {
    for (const raw of items) {
      const w = normalizeWord(raw);
      if (!w.word || !w.meaning) continue;
      stmt.run(uid, categoryId, w.word, w.ipa, w.pos, w.meaning, w.example, w.note);
      n += 1;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return n;
}

export function registerVocabRoutes(app) {
  // ===== Thư mục =====
  app.get('/api/folders', requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT f.*, (SELECT COUNT(*) FROM categories c WHERE c.folder_id = f.id) AS category_count
           FROM folders f WHERE f.user_id = ? ORDER BY f.created_at DESC, f.id DESC`
      )
      .all(req.user.id);
    res.json(rows.map((f) => ({ id: f.id, name: f.name, categoryCount: f.category_count, isPublic: Boolean(f.is_public) })));
  });

  app.post('/api/folders', requireAuth, (req, res) => {
    const name = clean(req.body?.name, 80);
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên thư mục' });
    const r = db.prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)').run(req.user.id, name);
    res.json({ id: Number(r.lastInsertRowid), name, categoryCount: 0 });
  });

  app.patch('/api/folders/:id', requireAuth, (req, res) => {
    if (!ownFolder(req.user.id, req.params.id)) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    const name = clean(req.body?.name, 80);
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên thư mục' });
    db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, Number(req.params.id));
    res.json({ ok: true });
  });

  // Xóa thư mục: các bộ từ bên trong được giữ lại và chuyển ra ngoài
  app.delete('/api/folders/:id', requireAuth, (req, res) => {
    if (!ownFolder(req.user.id, req.params.id)) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    db.prepare('UPDATE categories SET folder_id = NULL WHERE folder_id = ?').run(Number(req.params.id));
    db.prepare('DELETE FROM folders WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== Bộ từ =====
  app.get('/api/categories', requireAuth, (req, res) => {
    const { folderId, all } = req.query;
    if (all) return res.json(categoryRows(req.user.id));
    if (folderId) return res.json(categoryRows(req.user.id, 'AND c.folder_id = ? AND c.path_id IS NULL', [Number(folderId)]));
    // bộ từ ẩn của lộ trình không hiện ở "Bộ từ của tôi"
    res.json(categoryRows(req.user.id, 'AND c.folder_id IS NULL AND c.path_id IS NULL'));
  });

  app.post('/api/categories', requireAuth, (req, res) => {
    const name = clean(req.body?.name, 120);
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên bộ từ' });
    const icon = ICONS.includes(req.body?.icon) ? req.body.icon : '📚';
    let folderId = req.body?.folderId ? Number(req.body.folderId) : null;
    if (folderId && !ownFolder(req.user.id, folderId)) folderId = null;
    const r = db
      .prepare('INSERT INTO categories (user_id, folder_id, name, description, icon) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, folderId, name, clean(req.body?.description, 500), icon);
    res.json(categoryRows(req.user.id, 'AND c.id = ?', [Number(r.lastInsertRowid)])[0]);
  });

  app.patch('/api/categories/:id', requireAuth, (req, res) => {
    const c = ownCategory(req.user.id, req.params.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    const b = req.body || {};
    const name = b.name !== undefined ? clean(b.name, 120) : c.name;
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên bộ từ' });
    const icon = b.icon && ICONS.includes(b.icon) ? b.icon : c.icon;
    const description = b.description !== undefined ? clean(b.description, 500) : c.description;
    db.prepare('UPDATE categories SET name = ?, description = ?, icon = ? WHERE id = ?').run(name, description, icon, c.id);
    res.json(categoryRows(req.user.id, 'AND c.id = ?', [c.id])[0]);
  });

  app.delete('/api/categories/:id', requireAuth, (req, res) => {
    const c = ownCategory(req.user.id, req.params.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    db.prepare('DELETE FROM vocabularies WHERE category_id = ?').run(c.id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(c.id);
    res.json({ ok: true });
  });

  // Chuyển nhiều bộ từ vào thư mục (folderId = null: bỏ khỏi thư mục)
  app.post('/api/categories/move', requireAuth, (req, res) => {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    const folderId = req.body?.folderId ? Number(req.body.folderId) : null;
    if (folderId && !ownFolder(req.user.id, folderId)) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    const stmt = db.prepare('UPDATE categories SET folder_id = ? WHERE id = ? AND user_id = ?');
    ids.forEach((id) => stmt.run(folderId, id, req.user.id));
    res.json({ ok: true, moved: ids.length });
  });

  app.get('/api/categories/:id/vocabularies', requireAuth, (req, res) => {
    const c = ownCategory(req.user.id, req.params.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    const items = db.prepare('SELECT * FROM vocabularies WHERE category_id = ? ORDER BY id').all(c.id).map(mapVocab);
    res.json({ category: categoryRows(req.user.id, 'AND c.id = ?', [c.id])[0], items });
  });

  // Lưu chế độ "Chỉnh sửa" của modal xem bộ từ: cập nhật các từ đã đổi + xóa các từ bị bỏ
  app.put('/api/categories/:id/vocabularies', requireAuth, (req, res) => {
    const c = ownCategory(req.user.id, req.params.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    const { updates = [], deletes = [] } = req.body || {};
    const upd = db.prepare(
      'UPDATE vocabularies SET word = ?, ipa = ?, pos = ?, meaning = ?, example = ?, note = ? WHERE id = ? AND category_id = ?'
    );
    const del = db.prepare('DELETE FROM vocabularies WHERE id = ? AND category_id = ?');
    for (const u of updates) {
      const w = normalizeWord(u);
      if (!w.word || !w.meaning) return res.status(400).json({ error: 'Từ vựng và nghĩa không được để trống' });
    }
    db.exec('BEGIN');
    try {
      updates.forEach((u) => {
        const w = normalizeWord(u);
        upd.run(w.word, w.ipa, w.pos, w.meaning, w.example, w.note, Number(u.id), c.id);
      });
      deletes.map(Number).forEach((id) => del.run(id, c.id));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ ok: true });
  });

  // ===== Từ vựng =====
  app.get('/api/vocabularies', requireAuth, (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 40));
    const where = ['v.user_id = ?'];
    const params = [req.user.id];
    if (req.query.categoryId) {
      where.push('v.category_id = ?');
      params.push(Number(req.query.categoryId));
    }
    if (req.query.search) {
      where.push('(v.word LIKE ? OR v.meaning LIKE ?)');
      const q = `%${String(req.query.search).trim()}%`;
      params.push(q, q);
    }
    const w = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) AS n FROM vocabularies v WHERE ${w}`).get(...params).n;
    const items = db
      .prepare(
        `SELECT v.*, c.name AS category_name FROM vocabularies v LEFT JOIN categories c ON c.id = v.category_id
          WHERE ${w} ORDER BY v.id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize)
      .map(mapVocab);
    res.json({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  });

  // Thêm nhiều từ vào một bộ từ (modal "Thêm nhiều từ", nhập file, thêm nhanh)
  app.post('/api/vocabularies/bulk', requireAuth, (req, res) => {
    const c = ownCategory(req.user.id, req.body?.categoryId);
    if (!c) return res.status(400).json({ error: 'Vui lòng chọn bộ từ' });
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const valid = items.filter((w) => clean(w.word) && clean(w.meaning));
    if (!valid.length) return res.status(400).json({ error: 'Chưa có từ hợp lệ (cần có Từ vựng và Nghĩa)' });
    const limit = wordLimit(req.user);
    const remaining = limit - wordCount(req.user.id);
    if (valid.length > remaining) {
      return res.status(403).json({
        error: `Vượt giới hạn ${limit.toLocaleString('vi-VN')} từ mỗi tài khoản. Bạn còn thêm được ${Math.max(0, remaining)} từ.`,
      });
    }
    const added = insertWords(req.user.id, c.id, valid);
    res.json({ added, skipped: items.length - added });
  });

  app.patch('/api/vocabularies/:id', requireAuth, (req, res) => {
    const v = db.prepare('SELECT * FROM vocabularies WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
    if (!v) return res.status(404).json({ error: 'Không tìm thấy từ' });
    const b = req.body || {};
    if (b.isLearned !== undefined && Object.keys(b).length === 1) {
      db.prepare('UPDATE vocabularies SET is_learned = ? WHERE id = ?').run(b.isLearned ? 1 : 0, v.id);
    } else {
      const w = normalizeWord({ ...v, ...b });
      if (!w.word || !w.meaning) return res.status(400).json({ error: 'Từ vựng và nghĩa không được để trống' });
      db.prepare('UPDATE vocabularies SET word = ?, ipa = ?, pos = ?, meaning = ?, example = ?, note = ? WHERE id = ?')
        .run(w.word, w.ipa, w.pos, w.meaning, w.example, w.note, v.id);
    }
    const row = db.prepare('SELECT v.*, c.name AS category_name FROM vocabularies v LEFT JOIN categories c ON c.id = v.category_id WHERE v.id = ?').get(v.id);
    res.json(mapVocab(row));
  });

  app.post('/api/vocabularies/bulk-update', requireAuth, (req, res) => {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    const learned = req.body?.isLearned ? 1 : 0;
    const stmt = db.prepare('UPDATE vocabularies SET is_learned = ?, srs_level = CASE WHEN ? = 0 AND srs_level >= 5 THEN 4 ELSE srs_level END WHERE id = ? AND user_id = ?');
    ids.forEach((id) => stmt.run(learned, learned, id, req.user.id));
    res.json({ ok: true, updated: ids.length });
  });

  app.post('/api/vocabularies/bulk-delete', requireAuth, (req, res) => {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    const stmt = db.prepare('DELETE FROM vocabularies WHERE id = ? AND user_id = ?');
    ids.forEach((id) => stmt.run(id, req.user.id));
    res.json({ ok: true, deleted: ids.length });
  });

  app.get('/api/vocabularies/limit', requireAuth, (req, res) => {
    res.json({ used: wordCount(req.user.id), limit: wordLimit(req.user) });
  });
}
