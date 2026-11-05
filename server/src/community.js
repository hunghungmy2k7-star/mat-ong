import crypto from 'node:crypto';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { classCanReadFolder, classCanReadCategory } from './classes.js';

db.exec(`
CREATE TABLE IF NOT EXISTS folder_votes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, folder_id)
);
CREATE INDEX IF NOT EXISTS idx_folder_votes_folder ON folder_votes(folder_id);
`);

const PAGE_SIZE = 20;
const WORD_LIMIT = Number(process.env.WORD_LIMIT || 20000);
const roomFor = (uid, n) => db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE user_id = ?').get(uid).n + n <= WORD_LIMIT;
const LIMIT_MSG = `Sao chép sẽ vượt giới hạn ${WORD_LIMIT.toLocaleString('vi-VN')} từ của tài khoản`;
const newToken = () => crypto.randomBytes(9).toString('base64url');

const getFolder = (id) => db.prepare('SELECT f.*, u.name AS author FROM folders f JOIN users u ON u.id = f.user_id WHERE f.id = ?').get(Number(id));
const getCategory = (id) => db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));

function canReadFolder(f, uid, token) {
  return Boolean(f) && (f.user_id === uid || f.is_public === 1 || (token && f.share_token === token) || classCanReadFolder(f.id, uid));
}
function canReadCategory(c, uid, token) {
  if (!c || c.path_id) return false;
  if (c.user_id === uid || (token && c.share_token === token)) return true;
  if (classCanReadCategory(c, uid)) return true;
  if (!c.folder_id) return false;
  return canReadFolder(db.prepare('SELECT * FROM folders WHERE id = ?').get(c.folder_id), uid, token);
}

const folderCategories = (fid) => db.prepare(
  `SELECT c.id, c.name, c.description, c.icon, (SELECT COUNT(*) FROM vocabularies v WHERE v.category_id = c.id) AS wordCount
     FROM categories c WHERE c.folder_id = ? AND c.path_id IS NULL ORDER BY c.created_at DESC, c.id DESC`,
).all(fid);

const folderOut = (f, uid) => ({
  id: f.id, name: f.name, author: f.author, isMine: f.user_id === uid, isPublic: Boolean(f.is_public),
  categoryCount: f.category_count ?? folderCategories(f.id).length,
  upvotes: f.votes ?? db.prepare('SELECT COUNT(*) AS n FROM folder_votes WHERE folder_id = ?').get(f.id).n,
  voted: Boolean(db.prepare('SELECT 1 FROM folder_votes WHERE folder_id = ? AND user_id = ?').get(f.id, uid)),
  createdAt: f.created_at,
});

function copyCategory(uid, cat, folderId) {
  const r = db.prepare('INSERT INTO categories (user_id, folder_id, name, description, icon) VALUES (?, ?, ?, ?, ?)')
    .run(uid, folderId, cat.name, cat.description, cat.icon || '📚');
  const newId = Number(r.lastInsertRowid);
  db.prepare(`INSERT INTO vocabularies (user_id, category_id, word, ipa, pos, meaning, example, note)
              SELECT ?, ?, word, ipa, pos, meaning, example, note FROM vocabularies WHERE category_id = ? ORDER BY id`).run(uid, newId, cat.id);
  return newId;
}

function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function registerCommunityRoutes(app) {
  // ---- Chia sẻ: thư mục (công khai + link) và bộ từ (link) ----
  app.post('/api/folders/:id/share', requireAuth, (req, res) => {
    const f = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
    if (!f) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    const token = f.share_token || newToken();
    const isPublic = typeof req.body?.isPublic === 'boolean' ? req.body.isPublic : Boolean(f.is_public);
    db.prepare('UPDATE folders SET share_token = ?, is_public = ? WHERE id = ?').run(token, isPublic ? 1 : 0, f.id);
    res.json({ token, isPublic });
  });

  app.post('/api/categories/:id/share', requireAuth, (req, res) => {
    const c = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ? AND path_id IS NULL').get(Number(req.params.id), req.user.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });
    const token = c.share_token || newToken();
    if (!c.share_token) db.prepare('UPDATE categories SET share_token = ? WHERE id = ?').run(token, c.id);
    res.json({ token });
  });

  app.get('/api/share/:token', requireAuth, (req, res) => {
    const t = String(req.params.token);
    const f = db.prepare('SELECT f.*, u.name AS author FROM folders f JOIN users u ON u.id = f.user_id WHERE f.share_token = ?').get(t);
    if (f) return res.json({ type: 'folder', folder: folderOut(f, req.user.id), categories: folderCategories(f.id) });
    const c = db.prepare('SELECT c.*, u.name AS author FROM categories c JOIN users u ON u.id = c.user_id WHERE c.share_token = ?').get(t);
    if (c) {
      const wordCount = db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE category_id = ?').get(c.id).n;
      return res.json({ type: 'category', category: { id: c.id, name: c.name, description: c.description, icon: c.icon, author: c.author, isMine: c.user_id === req.user.id, wordCount } });
    }
    res.status(404).json({ error: 'Link chia sẻ không tồn tại hoặc đã bị xóa' });
  });

  // ---- Thư viện cộng đồng ----
  app.get('/api/community/folders', requireAuth, (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const sort = req.query.sort === 'newest' ? 'newest' : 'trending';
    const page = Math.max(1, Number(req.query.page) || 1);
    const where = `f.is_public = 1 ${q ? 'AND f.name LIKE ?' : ''}`;
    const params = q ? [`%${q}%`] : [];
    const total = db.prepare(`SELECT COUNT(*) AS n FROM folders f WHERE ${where}`).get(...params).n;
    const order = sort === 'newest' ? 'f.created_at DESC, f.id DESC' : 'votes DESC, f.created_at DESC, f.id DESC';
    const rows = db.prepare(
      `SELECT f.*, u.name AS author,
              (SELECT COUNT(*) FROM folder_votes v WHERE v.folder_id = f.id) AS votes,
              (SELECT COUNT(*) FROM categories c WHERE c.folder_id = f.id AND c.path_id IS NULL) AS category_count
         FROM folders f JOIN users u ON u.id = f.user_id WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    ).all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);
    res.json({ items: rows.map((f) => folderOut(f, req.user.id)), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  });

  app.get('/api/community/folders/:id', requireAuth, (req, res) => {
    const f = getFolder(req.params.id);
    if (!canReadFolder(f, req.user.id, req.query.token)) return res.status(404).json({ error: 'Thư mục không tồn tại hoặc không còn công khai' });
    res.json({ folder: folderOut(f, req.user.id), categories: folderCategories(f.id) });
  });

  app.post('/api/community/folders/:id/vote', requireAuth, (req, res) => {
    const f = getFolder(req.params.id);
    if (!f || !f.is_public) return res.status(404).json({ error: 'Thư mục không tồn tại hoặc không còn công khai' });
    const had = db.prepare('DELETE FROM folder_votes WHERE folder_id = ? AND user_id = ?').run(f.id, req.user.id).changes > 0;
    if (!had) db.prepare('INSERT INTO folder_votes (user_id, folder_id) VALUES (?, ?)').run(req.user.id, f.id);
    res.json(folderOut(f, req.user.id));
  });

  app.post('/api/community/folders/:id/copy', requireAuth, (req, res) => {
    const f = getFolder(req.params.id);
    if (!canReadFolder(f, req.user.id, req.body?.token)) return res.status(404).json({ error: 'Thư mục không tồn tại hoặc không còn công khai' });
    const cats = db.prepare('SELECT * FROM categories WHERE folder_id = ? AND path_id IS NULL ORDER BY id').all(f.id);
    const need = cats.reduce((a, c) => a + db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE category_id = ?').get(c.id).n, 0);
    if (!roomFor(req.user.id, need)) return res.status(400).json({ error: LIMIT_MSG });
    const out = tx(() => {
      const fid = Number(db.prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)').run(req.user.id, f.name).lastInsertRowid);
      let words = 0;
      for (const c of cats) {
        copyCategory(req.user.id, c, fid);
        words += db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE category_id = ?').get(c.id).n;
      }
      return { folderId: fid, categories: cats.length, words };
    });
    res.json(out);
  });

  app.get('/api/community/categories/:id/words', requireAuth, (req, res) => {
    const c = getCategory(req.params.id);
    if (!canReadCategory(c, req.user.id, req.query.token)) return res.status(404).json({ error: 'Bộ từ không tồn tại hoặc không được chia sẻ' });
    const items = db.prepare('SELECT id, word, ipa, pos, meaning, example FROM vocabularies WHERE category_id = ? ORDER BY id').all(c.id);
    res.json({ id: c.id, name: c.name, description: c.description, items });
  });

  app.post('/api/community/categories/:id/copy', requireAuth, (req, res) => {
    const c = getCategory(req.params.id);
    if (!canReadCategory(c, req.user.id, req.body?.token)) return res.status(404).json({ error: 'Bộ từ không tồn tại hoặc không được chia sẻ' });
    const need = db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE category_id = ?').get(c.id).n;
    if (!roomFor(req.user.id, need)) return res.status(400).json({ error: LIMIT_MSG });
    const id = tx(() => copyCategory(req.user.id, c, null));
    res.json({ categoryId: id, words: db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE category_id = ?').get(id).n });
  });
}
