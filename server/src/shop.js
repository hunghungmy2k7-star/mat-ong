import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from './db.js';
import { requireAuth, publicUser } from './auth.js';
import { vnDay, addDays } from './time.js';
import { CATALOG } from './catalog.js';

export { CATALOG };

db.exec(`
CREATE TABLE IF NOT EXISTS user_items (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS daily_rewards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  coins INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
`);

export const UPLOAD_DIR = path.join(process.env.DATA_DIR || path.resolve('data'), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DAILY_REWARD = 50;

const owned = (uid) => new Set(db.prepare('SELECT item_id FROM user_items WHERE user_id = ?').all(uid).map((r) => r.item_id));
const settingsOf = (u) => JSON.parse(u.settings_json || '{}');
const saveSettings = (uid, s) => db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify(s), uid);
const fresh = (uid) => db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
const isFree = (it) => it.price === 0;

function spend(uid, amount) {
  const r = db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?').run(amount, uid, amount);
  return r.changes > 0;
}

export function registerShopRoutes(app) {
  app.get('/api/shop/items', requireAuth, (req, res) => {
    const mine = owned(req.user.id);
    const eq = settingsOf(req.user).equipped || {};
    res.json({
      coins: req.user.coins,
      dailyClaimed: Boolean(db.prepare('SELECT 1 FROM daily_rewards WHERE user_id = ? AND day = ?').get(req.user.id, vnDay())),
      dailyReward: DAILY_REWARD,
      items: CATALOG.map((it) => ({
        ...it,
        owned: isFree(it) || mine.has(it.id),
        equipped: Object.values(eq).includes(it.id),
        uploadUrl: it.upload ? settingsOf(req.user).uploads?.[it.id] || null : undefined,
      })),
    });
  });

  app.post('/api/shop/purchase/:id', requireAuth, (req, res) => {
    const it = CATALOG.find((x) => x.id === req.params.id);
    if (!it || it.type === 'consumable') return res.status(404).json({ error: 'Không tìm thấy vật phẩm' });
    if (isFree(it) || owned(req.user.id).has(it.id)) return res.status(400).json({ error: 'Bạn đã có vật phẩm này' });
    if (!spend(req.user.id, it.price)) return res.status(400).json({ error: 'Bạn chưa đủ xu. Học thêm để kiếm xu nhé!' });
    db.prepare('INSERT INTO user_items (user_id, item_id) VALUES (?, ?)').run(req.user.id, it.id);
    res.json({ user: publicUser(fresh(req.user.id)) });
  });

  app.post('/api/shop/equip/:id', requireAuth, (req, res) => {
    const it = CATALOG.find((x) => x.id === req.params.id);
    if (!it || it.type === 'consumable') return res.status(404).json({ error: 'Không tìm thấy vật phẩm' });
    if (!isFree(it) && !owned(req.user.id).has(it.id)) return res.status(403).json({ error: 'Bạn cần mua vật phẩm trước' });
    const s = settingsOf(req.user);
    if (it.upload && !s.uploads?.[it.id]) return res.status(400).json({ error: 'Hãy tải ảnh lên trước' });
    s.equipped = { ...(s.equipped || {}), [it.type]: it.id };
    saveSettings(req.user.id, s);
    res.json({ user: publicUser(fresh(req.user.id)) });
  });

  app.post('/api/shop/unequip/:type', requireAuth, (req, res) => {
    const s = settingsOf(req.user);
    if (s.equipped) delete s.equipped[req.params.type];
    saveSettings(req.user.id, s);
    res.json({ user: publicUser(fresh(req.user.id)) });
  });

  // Tải ảnh cho ô tự upload (base64, tối đa 3MB, chỉ PNG/JPEG/WEBP/GIF)
  app.post('/api/shop/upload/:id', requireAuth, (req, res) => {
    const it = CATALOG.find((x) => x.id === req.params.id && x.upload);
    if (!it) return res.status(404).json({ error: 'Không tìm thấy ô upload' });
    if (!owned(req.user.id).has(it.id)) return res.status(403).json({ error: 'Bạn cần mua ô upload trước' });
    const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(String(req.body?.dataUrl || ''));
    if (!m) return res.status(400).json({ error: 'Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Ảnh tối đa 3MB' });
    const magic = buf.subarray(0, 12).toString('hex');
    const ok = magic.startsWith('89504e47') || magic.startsWith('ffd8ff') || magic.startsWith('47494638') || (magic.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP');
    if (!ok) return res.status(400).json({ error: 'File không phải ảnh hợp lệ' });
    const s = settingsOf(req.user);
    const isChange = Boolean(s.uploads?.[it.id]);
    if (isChange && !spend(req.user.id, it.changeCost)) return res.status(400).json({ error: `Đổi ảnh cần ${it.changeCost.toLocaleString('vi-VN')} xu` });
    const name = `${req.user.id}-${it.id}-${crypto.randomBytes(6).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    const old = s.uploads?.[it.id];
    if (old) fs.rm(path.join(UPLOAD_DIR, path.basename(old)), () => {});
    const s2 = settingsOf(fresh(req.user.id));
    s2.uploads = { ...(s2.uploads || {}), [it.id]: `/uploads/${name}` };
    s2.equipped = { ...(s2.equipped || {}), [it.type]: it.id };
    saveSettings(req.user.id, s2);
    res.json({ user: publicUser(fresh(req.user.id)) });
  });

  // Đá streak: lấp ngày trống gần nhất trong 14 ngày qua (không tính hôm nay)
  app.post('/api/shop/streak-freeze', requireAuth, (req, res) => {
    const today = vnDay();
    const days = new Set(db.prepare('SELECT DISTINCT day FROM activity_log WHERE user_id = ? AND day >= ?').all(req.user.id, addDays(today, -14)).map((r) => r.day));
    let target = null;
    for (let i = 1; i <= 14; i += 1) {
      const d = addDays(today, -i);
      if (!days.has(d)) { target = d; break; }
    }
    if (!target) return res.status(400).json({ error: 'Chuỗi 14 ngày qua của bạn không có ngày trống nào 🎉' });
    if (!spend(req.user.id, 2000)) return res.status(400).json({ error: 'Bạn chưa đủ xu (cần 2.000 xu)' });
    db.prepare("INSERT INTO activity_log (user_id, day, mode, correct, total, score, coins) VALUES (?, ?, 'freeze', 0, 0, 0, 0)").run(req.user.id, target);
    res.json({ day: target, user: publicUser(fresh(req.user.id)) });
  });

  app.post('/api/shop/daily-reward', requireAuth, (req, res) => {
    const day = vnDay();
    if (db.prepare('SELECT 1 FROM daily_rewards WHERE user_id = ? AND day = ?').get(req.user.id, day)) {
      return res.status(400).json({ error: 'Hôm nay bạn đã nhận quà rồi, quay lại vào ngày mai nhé!' });
    }
    db.prepare('INSERT INTO daily_rewards (user_id, day, coins) VALUES (?, ?, ?)').run(req.user.id, day, DAILY_REWARD);
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(DAILY_REWARD, req.user.id);
    res.json({ coins: DAILY_REWARD, user: publicUser(fresh(req.user.id)) });
  });
}
