import { avatarOf } from './catalog.js';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { vnDay, addDays } from './time.js';

db.exec(`
CREATE TABLE IF NOT EXISTS shared_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_a, user_b)
);
CREATE TABLE IF NOT EXISTS streak_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  reply_to INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Chuỗi ngày liên tiếp (tính tới hôm nay, hoặc hôm qua nếu hôm nay chưa học) từ tập ngày
export function streakFromDays(days, today = vnDay()) {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) { n += 1; cursor = addDays(cursor, -1); }
  return n;
}
const userDays = (uid) => new Set(db.prepare('SELECT DISTINCT day FROM activity_log WHERE user_id = ? AND day >= ?')
  .all(uid, addDays(vnDay(), -400)).map((r) => r.day));

export function calendarFor(uid) {
  const from = addDays(vnDay(), -7 * 20);
  const rows = db.prepare("SELECT day, COUNT(*) AS n FROM activity_log WHERE user_id = ? AND day >= ? AND mode <> 'freeze' GROUP BY day").all(uid, from);
  return { from, today: vnDay(), days: Object.fromEntries(rows.map((r) => [r.day, r.n])) };
}

const pub = (u) => ({ id: u.id, name: u.name, avatarUrl: avatarOf(u) });

function pairStreak(a, b) {
  const da = userDays(a);
  const db2 = userDays(b);
  return streakFromDays(new Set([...da].filter((d) => db2.has(d))));
}

export function registerSocialRoutes(app) {
  // BXH: lượt chơi game (30 ngày gần nhất) hoặc streak hiện tại
  app.get('/api/activity/leaderboard', requireAuth, (req, res) => {
    if (req.query.type === 'streak') {
      const users = db.prepare(`SELECT DISTINCT u.* FROM users u JOIN activity_log a ON a.user_id = u.id WHERE a.day >= ?`).all(addDays(vnDay(), -1));
      const rows = users.map((u) => ({ ...pub(u), value: streakFromDays(userDays(u.id)) }))
        .filter((r) => r.value > 0).sort((x, y) => y.value - x.value).slice(0, 100);
      return res.json(rows.map((r, i) => ({ ...r, rank: i + 1, isMe: r.id === req.user.id })));
    }
    const rows = db.prepare(`SELECT u.*, COUNT(a.id) AS value FROM activity_log a JOIN users u ON u.id = a.user_id
                             WHERE a.day >= ? AND a.mode != 'freeze' GROUP BY u.id ORDER BY value DESC, u.id LIMIT 100`).all(addDays(vnDay(), -29));
    res.json(rows.map((u, i) => ({ ...pub(u), value: u.value, rank: i + 1, isMe: u.id === req.user.id })));
  });

  // Heatmap hoạt động ~20 tuần
  // Lịch hoạt động của chính mình (giáo viên xem của học sinh qua /api/classes/:id/members/:uid/progress)
  app.get('/api/activity/calendar', requireAuth, (req, res) => res.json(calendarFor(req.user.id)));

  // ---- Chuỗi chung ----
  app.get('/api/shared-streak', requireAuth, (req, res) => {
    const uid = req.user.id;
    const pairs = db.prepare('SELECT * FROM shared_streaks WHERE user_a = ? OR user_b = ? ORDER BY id DESC').all(uid, uid);
    const list = pairs.map((p) => {
      const partner = db.prepare('SELECT * FROM users WHERE id = ?').get(p.user_a === uid ? p.user_b : p.user_a);
      return { id: p.id, partner: pub(partner), streak: pairStreak(p.user_a, p.user_b), since: p.created_at };
    });
    const received = db.prepare(`SELECT i.*, u.name, u.avatar_url, u.settings_json, u.id AS uid FROM streak_invitations i JOIN users u ON u.id = i.from_user
                                  WHERE i.to_email = ? AND i.status = 'pending' ORDER BY i.id DESC`).all(req.user.email)
      .map((i) => ({ id: i.id, from: { id: i.uid, name: i.name, avatarUrl: avatarOf(i) }, createdAt: i.created_at }));
    const sent = db.prepare(`SELECT * FROM streak_invitations WHERE from_user = ? ORDER BY id DESC LIMIT 20`).all(uid)
      .map((i) => ({ id: i.id, email: i.to_email, status: i.status, createdAt: i.created_at }));
    res.json({ list, received, sent });
  });

  app.post('/api/shared-streak/invite', requireAuth, (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email không hợp lệ' });
    if (email === req.user.email) return res.status(400).json({ error: 'Không thể mời chính mình' });
    const target = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng với email này' });
    const [a, b] = [req.user.id, target.id].sort((x, y) => x - y);
    if (db.prepare('SELECT 1 FROM shared_streaks WHERE user_a = ? AND user_b = ?').get(a, b)) return res.status(400).json({ error: 'Hai bạn đã có chuỗi chung' });
    if (db.prepare("SELECT 1 FROM streak_invitations WHERE from_user = ? AND to_email = ? AND status = 'pending'").get(req.user.id, email)) {
      return res.status(400).json({ error: 'Bạn đã gửi lời mời cho người này' });
    }
    db.prepare('INSERT INTO streak_invitations (from_user, to_email) VALUES (?, ?)').run(req.user.id, email);
    res.json({ ok: true, name: target.name });
  });

  app.post('/api/shared-streak/invitations/:id/:action', requireAuth, (req, res) => {
    const inv = db.prepare("SELECT * FROM streak_invitations WHERE id = ? AND to_email = ? AND status = 'pending'").get(Number(req.params.id), req.user.email);
    if (!inv) return res.status(404).json({ error: 'Không tìm thấy lời mời' });
    if (req.params.action === 'accept') {
      const [a, b] = [inv.from_user, req.user.id].sort((x, y) => x - y);
      db.prepare('INSERT OR IGNORE INTO shared_streaks (user_a, user_b) VALUES (?, ?)').run(a, b);
      db.prepare("UPDATE streak_invitations SET status = 'accepted' WHERE id = ?").run(inv.id);
    } else {
      db.prepare("UPDATE streak_invitations SET status = 'declined' WHERE id = ?").run(inv.id);
    }
    res.json({ ok: true });
  });

  app.delete('/api/shared-streak/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM shared_streaks WHERE id = ? AND (user_a = ? OR user_b = ?)').run(Number(req.params.id), req.user.id, req.user.id);
    res.json({ ok: true });
  });

  app.get('/api/shared-streak/leaderboard', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM shared_streaks').all().map((p) => {
      const a = db.prepare('SELECT * FROM users WHERE id = ?').get(p.user_a);
      const b = db.prepare('SELECT * FROM users WHERE id = ?').get(p.user_b);
      return { id: p.id, a: pub(a), b: pub(b), streak: pairStreak(p.user_a, p.user_b) };
    }).sort((x, y) => y.streak - x.streak).slice(0, 100);
    res.json(rows.map((r, i) => ({ ...r, rank: i + 1 })));
  });

  // ---- Trò chuyện cộng đồng ----
  const lastPost = new Map();
  app.get('/api/chat/messages', requireAuth, (req, res) => {
    const after = Number(req.query.after) || 0;
    const rows = db.prepare(`SELECT m.*, u.name, u.avatar_url, u.settings_json, r.body AS reply_body, ru.name AS reply_name
      FROM chat_messages m JOIN users u ON u.id = m.user_id
      LEFT JOIN chat_messages r ON r.id = m.reply_to LEFT JOIN users ru ON ru.id = r.user_id
      WHERE m.id > ? ORDER BY m.id DESC LIMIT 60`).all(after).reverse();
    res.json(rows.map((m) => ({
      id: m.id, body: m.body, createdAt: m.created_at, user: { id: m.user_id, name: m.name, avatarUrl: avatarOf(m) },
      isMe: m.user_id === req.user.id, reply: m.reply_to ? { id: m.reply_to, name: m.reply_name, body: m.reply_body } : null,
    })));
  });

  app.post('/api/chat/messages', requireAuth, (req, res) => {
    const body = String(req.body?.body || '').trim().slice(0, 500);
    if (!body) return res.status(400).json({ error: 'Tin nhắn trống' });
    const last = lastPost.get(req.user.id) || 0;
    if (Date.now() - last < 2000) return res.status(429).json({ error: 'Bạn gửi nhanh quá, chờ chút nhé' });
    lastPost.set(req.user.id, Date.now());
    const replyTo = req.body?.replyTo ? Number(req.body.replyTo) : null;
    const r = db.prepare('INSERT INTO chat_messages (user_id, body, reply_to) VALUES (?, ?, ?)').run(req.user.id, body, replyTo);
    res.json({ id: Number(r.lastInsertRowid) });
  });
}
