import crypto from 'node:crypto';
import { db } from './db.js';
import { requireAuth, publicUser } from './auth.js';
import { avatarOf } from './catalog.js';
import { calendarFor } from './social.js';
import { REWARD } from './practice.js';
import { vnDay } from './time.js';

db.exec(`
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  slots INTEGER NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS class_members (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (class_id, user_id)
);
CREATE TABLE IF NOT EXISTS class_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,              -- folder | category
  ref_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, kind, ref_id)
);
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  required INTEGER NOT NULL,
  deadline TEXT NOT NULL,          -- ISO UTC
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS assignment_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_assignment ON assignment_attempts(assignment_id, user_id);
`);

const MAX_SLOTS = Number(process.env.CLASS_SLOTS || 30);
export const ASSIGNMENT_MODES = { quiz: 'Trắc nghiệm', typing: 'Gõ từ', listening: 'Nghe viết', match: 'Nối từ', flashcard: 'Flashcard' };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  for (;;) {
    const code = Array.from(crypto.randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    if (!db.prepare('SELECT 1 FROM classes WHERE code = ?').get(code)) return code;
  }
}

const getClass = (id) => db.prepare('SELECT c.*, u.name AS teacher FROM classes c JOIN users u ON u.id = c.owner_id WHERE c.id = ?').get(Number(id));
const memberCount = (cid) => db.prepare('SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?').get(cid).n;
const isMember = (cid, uid) => Boolean(db.prepare('SELECT 1 FROM class_members WHERE class_id = ? AND user_id = ?').get(cid, uid));
const wordCount = (catId) => db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE category_id = ?').get(catId).n;

function roleOf(c, uid) {
  if (!c) return null;
  if (c.owner_id === uid) return 'teacher';
  return isMember(c.id, uid) ? 'student' : null;
}

/** Người dùng có quyền đọc thư mục/bộ từ vì nó được chia sẻ trong lớp của họ? (dùng ở community.js) */
export function classCanReadFolder(folderId, uid) {
  return Boolean(db.prepare(`SELECT 1 FROM class_resources r JOIN classes c ON c.id = r.class_id
    WHERE r.kind = 'folder' AND r.ref_id = ? AND (c.owner_id = ? OR EXISTS (SELECT 1 FROM class_members m WHERE m.class_id = c.id AND m.user_id = ?))`).get(folderId, uid, uid));
}
export function classCanReadCategory(cat, uid) {
  const inClass = `(c.owner_id = ? OR EXISTS (SELECT 1 FROM class_members m WHERE m.class_id = c.id AND m.user_id = ?))`;
  if (db.prepare(`SELECT 1 FROM class_resources r JOIN classes c ON c.id = r.class_id WHERE r.kind = 'category' AND r.ref_id = ? AND ${inClass}`).get(cat.id, uid, uid)) return true;
  if (db.prepare(`SELECT 1 FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.category_id = ? AND ${inClass}`).get(cat.id, uid, uid)) return true;
  return Boolean(cat.folder_id) && classCanReadFolder(cat.folder_id, uid);
}

const classOut = (c, uid) => ({
  id: c.id, name: c.name, code: c.code, teacher: c.teacher, role: roleOf(c, uid),
  students: memberCount(c.id), slots: c.slots, createdAt: c.created_at,
});

function resourceOut(r) {
  if (r.kind === 'folder') {
    const f = db.prepare('SELECT * FROM folders WHERE id = ?').get(r.ref_id);
    if (!f) return null;
    const n = db.prepare('SELECT COUNT(*) AS n FROM categories WHERE folder_id = ? AND path_id IS NULL').get(f.id).n;
    return { id: r.id, kind: 'folder', refId: f.id, name: f.name, count: n, createdAt: r.created_at };
  }
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(r.ref_id);
  if (!c) return null;
  return { id: r.id, kind: 'category', refId: c.id, name: c.name, icon: c.icon, count: wordCount(c.id), createdAt: r.created_at };
}

function assignmentOut(a, uid, role) {
  const cat = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(a.category_id);
  const total = wordCount(a.category_id);
  const base = {
    id: a.id, categoryId: a.category_id, categoryName: cat?.name || '(đã xóa)', mode: a.mode, modeLabel: ASSIGNMENT_MODES[a.mode],
    required: a.required, totalWords: total, deadline: a.deadline, expired: new Date(a.deadline) < new Date(), createdAt: a.created_at,
  };
  if (role === 'teacher') {
    const s = db.prepare(`SELECT COUNT(*) AS attempts, COUNT(DISTINCT user_id) AS students, MAX(CASE WHEN total > 0 THEN correct * 100 / total ELSE 0 END) AS best
                            FROM assignment_attempts WHERE assignment_id = ?`).get(a.id);
    const passed = db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM assignment_attempts WHERE assignment_id = ? AND correct >= ?').get(a.id, a.required).n;
    return { ...base, attempts: s.attempts, students: s.students, best: s.best || 0, passed };
  }
  const m = db.prepare('SELECT COUNT(*) AS attempts, MAX(correct) AS best, MAX(coins) AS coins FROM assignment_attempts WHERE assignment_id = ? AND user_id = ?').get(a.id, uid);
  return { ...base, attempts: m.attempts, bestCorrect: m.best || 0, passed: (m.best || 0) >= a.required };
}

function parseAssignment(body, classId, ownerId) {
  const categoryId = Number(body?.categoryId);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ? AND path_id IS NULL').get(categoryId, ownerId);
  if (!cat) return { error: 'Hãy chọn một bộ từ của bạn' };
  const total = wordCount(cat.id);
  if (!total) return { error: 'Bộ từ này chưa có từ nào' };
  const mode = String(body?.mode || '');
  if (!ASSIGNMENT_MODES[mode]) return { error: 'Dạng bài không hợp lệ' };
  const required = Math.round(Number(body?.required));
  if (!(required >= 1 && required <= total)) return { error: `Số câu đúng phải từ 1 đến ${total}` };
  const d = new Date(String(body?.deadline || ''));
  if (Number.isNaN(d.getTime())) return { error: 'Hạn nộp không hợp lệ' };
  if (d < new Date()) return { error: 'Hạn nộp phải ở tương lai' };
  return { categoryId: cat.id, mode, required, deadline: d.toISOString(), classId };
}

export function registerClassRoutes(app) {
  const load = (req, res, needTeacher) => {
    const c = getClass(req.params.id);
    const role = roleOf(c, req.user.id);
    if (!role) { res.status(404).json({ error: 'Không tìm thấy lớp học' }); return null; }
    if (needTeacher && role !== 'teacher') { res.status(403).json({ error: 'Chỉ giáo viên mới làm được thao tác này' }); return null; }
    return { c, role };
  };

  app.get('/api/classes', requireAuth, (req, res) => {
    const rows = db.prepare(`SELECT c.*, u.name AS teacher FROM classes c JOIN users u ON u.id = c.owner_id
      WHERE c.owner_id = ? OR c.id IN (SELECT class_id FROM class_members WHERE user_id = ?) ORDER BY c.created_at DESC, c.id DESC`).all(req.user.id, req.user.id);
    res.json(rows.map((c) => classOut(c, req.user.id)));
  });

  app.post('/api/classes', requireAuth, (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên lớp' });
    const r = db.prepare('INSERT INTO classes (owner_id, name, code, slots) VALUES (?, ?, ?, ?)').run(req.user.id, name, newCode(), MAX_SLOTS);
    res.json(classOut(getClass(r.lastInsertRowid), req.user.id));
  });

  app.post('/api/classes/join', requireAuth, (req, res) => {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const c = db.prepare('SELECT c.*, u.name AS teacher FROM classes c JOIN users u ON u.id = c.owner_id WHERE c.code = ?').get(code);
    if (!c) return res.status(404).json({ error: 'Mã lớp không đúng' });
    if (c.owner_id === req.user.id) return res.status(400).json({ error: 'Bạn là giáo viên của lớp này' });
    if (isMember(c.id, req.user.id)) return res.json(classOut(c, req.user.id));
    if (memberCount(c.id) >= c.slots) return res.status(400).json({ error: 'Lớp đã đủ học sinh' });
    db.prepare('INSERT INTO class_members (class_id, user_id) VALUES (?, ?)').run(c.id, req.user.id);
    res.json(classOut(c, req.user.id));
  });

  app.get('/api/classes/:id', requireAuth, (req, res) => {
    const x = load(req, res);
    if (x) res.json(classOut(x.c, req.user.id));
  });

  app.patch('/api/classes/:id', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    const name = String(req.body?.name || '').trim().slice(0, 80);
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên lớp' });
    db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(name, x.c.id);
    res.json(classOut(getClass(x.c.id), req.user.id));
  });

  app.delete('/api/classes/:id', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    db.prepare('DELETE FROM classes WHERE id = ?').run(x.c.id);
    res.json({ ok: true });
  });

  app.post('/api/classes/:id/leave', requireAuth, (req, res) => {
    const x = load(req, res);
    if (!x) return;
    if (x.role === 'teacher') return res.status(400).json({ error: 'Giáo viên không thể rời lớp, hãy xóa lớp' });
    db.prepare('DELETE FROM class_members WHERE class_id = ? AND user_id = ?').run(x.c.id, req.user.id);
    res.json({ ok: true });
  });

  // ---- Thành viên ----
  app.get('/api/classes/:id/members', requireAuth, (req, res) => {
    const x = load(req, res);
    if (!x) return;
    const rows = db.prepare(`SELECT u.*, m.joined_at FROM class_members m JOIN users u ON u.id = m.user_id WHERE m.class_id = ? ORDER BY m.joined_at, u.id`).all(x.c.id);
    res.json(rows.map((u) => ({
      id: u.id, name: u.name, avatarUrl: avatarOf(u), joinedAt: u.joined_at, isMe: u.id === req.user.id,
      ...(x.role === 'teacher' ? { email: u.email } : {}),
    })));
  });

  app.delete('/api/classes/:id/members/:uid', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    db.prepare('DELETE FROM class_members WHERE class_id = ? AND user_id = ?').run(x.c.id, Number(req.params.uid));
    res.json({ ok: true });
  });

  app.get('/api/classes/:id/members/:uid/progress', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    const uid = Number(req.params.uid);
    if (!isMember(x.c.id, uid)) return res.status(404).json({ error: 'Học sinh không thuộc lớp này' });
    const s = db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN is_learned = 1 OR srs_level >= 5 THEN 1 ELSE 0 END) AS learned
                            FROM vocabularies WHERE user_id = ?`).get(uid);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    res.json({ name: u.name, total: s.total || 0, learned: s.learned || 0, notLearned: (s.total || 0) - (s.learned || 0), calendar: calendarFor(uid) });
  });

  // ---- Tài liệu ----
  app.get('/api/classes/:id/resources', requireAuth, (req, res) => {
    const x = load(req, res);
    if (!x) return;
    const rows = db.prepare('SELECT * FROM class_resources WHERE class_id = ? ORDER BY id DESC').all(x.c.id);
    res.json(rows.map(resourceOut).filter(Boolean));
  });

  app.post('/api/classes/:id/resources', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    const kind = req.body?.kind === 'folder' ? 'folder' : 'category';
    const refId = Number(req.body?.refId);
    const own = kind === 'folder'
      ? db.prepare('SELECT 1 FROM folders WHERE id = ? AND user_id = ?').get(refId, req.user.id)
      : db.prepare('SELECT 1 FROM categories WHERE id = ? AND user_id = ? AND path_id IS NULL').get(refId, req.user.id);
    if (!own) return res.status(400).json({ error: kind === 'folder' ? 'Hãy chọn một thư mục của bạn' : 'Hãy chọn một bộ từ của bạn' });
    db.prepare('INSERT OR IGNORE INTO class_resources (class_id, kind, ref_id) VALUES (?, ?, ?)').run(x.c.id, kind, refId);
    res.json({ ok: true });
  });

  app.delete('/api/classes/:id/resources/:rid', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    db.prepare('DELETE FROM class_resources WHERE id = ? AND class_id = ?').run(Number(req.params.rid), x.c.id);
    res.json({ ok: true });
  });

  // ---- Bài tập ----
  app.get('/api/classes/:id/assignments', requireAuth, (req, res) => {
    const x = load(req, res);
    if (!x) return;
    const rows = db.prepare('SELECT * FROM assignments WHERE class_id = ? ORDER BY deadline ASC, id DESC').all(x.c.id);
    res.json(rows.map((a) => assignmentOut(a, req.user.id, x.role)));
  });

  app.post('/api/classes/:id/assignments', requireAuth, (req, res) => {
    const x = load(req, res, true);
    if (!x) return;
    const a = parseAssignment(req.body, x.c.id, req.user.id);
    if (a.error) return res.status(400).json({ error: a.error });
    const r = db.prepare('INSERT INTO assignments (class_id, category_id, mode, required, deadline) VALUES (?, ?, ?, ?, ?)').run(a.classId, a.categoryId, a.mode, a.required, a.deadline);
    res.json(assignmentOut(db.prepare('SELECT * FROM assignments WHERE id = ?').get(r.lastInsertRowid), req.user.id, 'teacher'));
  });

  const loadAssignment = (req, res, needTeacher) => {
    const a = db.prepare('SELECT * FROM assignments WHERE id = ?').get(Number(req.params.aid));
    if (!a) { res.status(404).json({ error: 'Không tìm thấy bài tập' }); return null; }
    req.params.id = String(a.class_id);
    const x = load(req, res, needTeacher);
    return x ? { ...x, a } : null;
  };

  app.patch('/api/assignments/:aid', requireAuth, (req, res) => {
    const x = loadAssignment(req, res, true);
    if (!x) return;
    const a = parseAssignment({ categoryId: x.a.category_id, mode: x.a.mode, required: x.a.required, deadline: x.a.deadline, ...req.body }, x.c.id, req.user.id);
    if (a.error) return res.status(400).json({ error: a.error });
    db.prepare('UPDATE assignments SET category_id = ?, mode = ?, required = ?, deadline = ? WHERE id = ?').run(a.categoryId, a.mode, a.required, a.deadline, x.a.id);
    res.json(assignmentOut(db.prepare('SELECT * FROM assignments WHERE id = ?').get(x.a.id), req.user.id, 'teacher'));
  });

  app.delete('/api/assignments/:aid', requireAuth, (req, res) => {
    const x = loadAssignment(req, res, true);
    if (!x) return;
    db.prepare('DELETE FROM assignments WHERE id = ?').run(x.a.id);
    res.json({ ok: true });
  });

  app.get('/api/assignments/:aid/results', requireAuth, (req, res) => {
    const x = loadAssignment(req, res, true);
    if (!x) return;
    const total = wordCount(x.a.category_id);
    const rows = db.prepare(`SELECT u.id, u.name, u.email, COUNT(t.id) AS attempts, MAX(t.correct) AS best, MAX(t.coins) AS coins
        FROM class_members m JOIN users u ON u.id = m.user_id
        LEFT JOIN assignment_attempts t ON t.user_id = u.id AND t.assignment_id = ?
        WHERE m.class_id = ? GROUP BY u.id ORDER BY best DESC, coins DESC, u.name`).all(x.a.id, x.c.id);
    res.json({
      assignment: assignmentOut(x.a, req.user.id, 'teacher'),
      rows: rows.map((r, i) => ({
        rank: i + 1, id: r.id, name: r.name, email: r.email, attempts: r.attempts, coins: r.coins || 0, best: r.best || 0,
        rate: total ? Math.round(((r.best || 0) / total) * 100) : 0, passed: (r.best || 0) >= x.a.required,
      })),
    });
  });

  // Học sinh làm bài: lấy toàn bộ từ của bộ từ được giao
  app.get('/api/assignments/:aid/play', requireAuth, (req, res) => {
    const x = loadAssignment(req, res);
    if (!x) return;
    const items = db.prepare('SELECT id, word, ipa, pos, meaning, example, note FROM vocabularies WHERE category_id = ? ORDER BY RANDOM() LIMIT 200').all(x.a.category_id);
    res.json({ assignment: assignmentOut(x.a, req.user.id, x.role), items, pool: items });
  });

  app.post('/api/assignments/:aid/attempts', requireAuth, (req, res) => {
    const x = loadAssignment(req, res);
    if (!x) return;
    if (x.role !== 'student') return res.status(400).json({ error: 'Giáo viên làm thử bài sẽ không được lưu kết quả' });
    if (new Date(x.a.deadline) < new Date()) return res.status(400).json({ error: 'Bài tập đã hết hạn nộp' });
    const valid = new Set(db.prepare('SELECT id FROM vocabularies WHERE category_id = ?').all(x.a.category_id).map((r) => r.id));
    const seen = new Set();
    const results = (Array.isArray(req.body?.results) ? req.body.results : []).filter((r) => {
      const id = Number(r?.id);
      if (!valid.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (!results.length) return res.status(400).json({ error: 'Chưa có kết quả để lưu' });
    const correct = results.filter((r) => r.correct).length;
    const coins = correct * (REWARD[x.a.mode] || 100);
    db.prepare('INSERT INTO assignment_attempts (assignment_id, user_id, correct, total, coins) VALUES (?, ?, ?, ?, ?)').run(x.a.id, req.user.id, correct, results.length, coins);
    db.prepare('INSERT INTO activity_log (user_id, day, mode, correct, total, score, coins) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.id, vnDay(), x.a.mode, correct, results.length, coins, coins);
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coins, req.user.id);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ coins, balance: u.coins, user: publicUser(u), passed: correct >= x.a.required, correct, required: x.a.required });
  });
}
