import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { vnDay } from './time.js';

// Nhắc học bằng Web Push (chuẩn VAPID, không cần dịch vụ trả phí).
// Khóa VAPID lấy từ env; nếu chưa có thì tự tạo một lần và lưu ở DATA_DIR/vapid.json.
db.exec(`
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function loadVapid() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const file = path.join(process.env.DATA_DIR || path.resolve('data'), 'vapid.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    const keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(file, JSON.stringify(keys));
    return keys;
  }
}
const VAPID = loadVapid();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@matong.local', VAPID.publicKey, VAPID.privateKey);

/** Giờ hiện tại theo giờ Việt Nam dạng HH:MM */
export function vnClock(date = new Date()) {
  return new Date(date.getTime() + 7 * 3600e3).toISOString().slice(11, 16);
}

export function reminderPayload(uid) {
  const now = new Date().toISOString();
  const due = db.prepare('SELECT COUNT(*) AS n FROM vocabularies WHERE user_id = ? AND srs_level > 0 AND srs_level < 5 AND next_review_at <= ?').get(uid, now).n;
  const fresh = db.prepare('SELECT word FROM vocabularies WHERE user_id = ? AND is_learned = 0 AND srs_level < 5 ORDER BY RANDOM() LIMIT 5').all(uid).map((r) => r.word);
  const parts = [];
  if (due) parts.push(`${due} từ đến hạn ôn`);
  if (fresh.length) parts.push(`Học tiếp: ${fresh.join(', ')}`);
  return {
    title: '🍯 Đến giờ học từ vựng rồi!',
    body: parts.length ? parts.join(' · ') : 'Thêm vài từ mới và giữ chuỗi ngày học nhé!',
    url: due ? '/practice?srs=1' : '/practice',
  };
}

export async function sendToUser(uid, payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(uid);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: JSON.parse(s.keys_json) }, JSON.stringify(payload), { TTL: 3600 });
      sent += 1;
    } catch (e) {
      // trình duyệt đã hủy đăng ký → xóa
      if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(s.id);
      else console.error('web-push', e.statusCode || e.message);
    }
  }
  return sent;
}

/** Gửi nhắc cho những ai bật nhắc đúng giờ hiện tại và hôm nay chưa được nhắc */
export async function runReminders(date = new Date()) {
  const clock = vnClock(date);
  const today = vnDay(date);
  const users = db.prepare('SELECT DISTINCT u.* FROM users u JOIN push_subscriptions p ON p.user_id = u.id').all();
  let n = 0;
  for (const u of users) {
    const s = JSON.parse(u.settings_json || '{}');
    if (!s.remindOn || (s.remindAt || '08:00') !== clock || s.lastRemindDay === today) continue;
    s.lastRemindDay = today;
    db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify(s), u.id);
    n += await sendToUser(u.id, reminderPayload(u.id));
  }
  return n;
}

export function registerPushRoutes(app) {
  app.get('/api/push/key', (req, res) => res.json({ publicKey: VAPID.publicKey }));

  app.post('/api/push/subscribe', requireAuth, (req, res) => {
    const sub = req.body?.subscription;
    const endpoint = String(sub?.endpoint || '');
    if (!/^https:\/\//.test(endpoint) || !sub?.keys?.p256dh || !sub?.keys?.auth) return res.status(400).json({ error: 'Đăng ký thông báo không hợp lệ' });
    db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, keys_json) VALUES (?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys_json = excluded.keys_json`)
      .run(req.user.id, endpoint, JSON.stringify({ p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) }));
    res.json({ ok: true });
  });

  app.post('/api/push/unsubscribe', requireAuth, (req, res) => {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(req.user.id, String(req.body?.endpoint || ''));
    res.json({ ok: true });
  });

  app.post('/api/push/test', requireAuth, async (req, res) => {
    const sent = await sendToUser(req.user.id, reminderPayload(req.user.id));
    if (!sent) return res.status(400).json({ error: 'Trình duyệt này chưa bật thông báo cho Mật Ong' });
    res.json({ sent });
  });

  // kiểm tra mỗi phút (bỏ qua khi chạy kiểm thử muốn tự gọi)
  if (process.env.DISABLE_REMINDER_CRON !== '1') {
    setInterval(() => { runReminders().catch((e) => console.error('reminders', e)); }, 60 * 1000).unref();
  }
}
