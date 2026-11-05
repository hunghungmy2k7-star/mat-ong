import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE = 'matong_session';
const CODE_TTL_MS = 10 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

import { resolveCosmetics } from './catalog.js';

export function publicUser(u) {
  if (!u) return null;
  const settings = JSON.parse(u.settings_json || '{}');
  const cosmetics = resolveCosmetics(settings);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: cosmetics.avatar || u.avatar_url,
    cosmetics,
    coins: u.coins,
    referralCode: u.referral_code,
    settings,
    createdAt: u.created_at,
  };
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    const { uid } = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' });
  }
}

async function sendCodeEmail(email, code) {
  // Gửi mail thật khi có RESEND_API_KEY; nếu chưa cấu hình thì in mã ra console (chế độ dev).
  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Mật Ong <onboarding@resend.dev>',
        to: email,
        subject: `Mã đăng nhập Mật Ong: ${code}`,
        html: `<p>Mã đăng nhập của bạn là <b style="font-size:20px">${code}</b>. Mã có hiệu lực trong 10 phút.</p>`,
      }),
    });
    if (!r.ok) throw new Error('Không gửi được email');
    return false;
  }
  console.log(`[DEV] Mã đăng nhập cho ${email}: ${code}`);
  return true;
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/email/request-code', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email không hợp lệ' });
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    db.prepare(
      'INSERT INTO email_codes (email, code, attempts, expires_at) VALUES (?, ?, 0, ?) ' +
        'ON CONFLICT(email) DO UPDATE SET code = excluded.code, attempts = 0, expires_at = excluded.expires_at'
    ).run(email, code, Date.now() + CODE_TTL_MS);
    try {
      const devMode = await sendCodeEmail(email, code);
      res.json({ ok: true, ...(devMode && !IS_PROD ? { devCode: code } : {}) });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  app.post('/api/auth/email/verify-code', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const row = db.prepare('SELECT * FROM email_codes WHERE email = ?').get(email);
    if (!row || row.expires_at < Date.now()) return res.status(400).json({ error: 'Mã đã hết hạn, vui lòng gửi lại' });
    if (row.attempts >= 5) return res.status(429).json({ error: 'Nhập sai quá nhiều lần, vui lòng gửi lại mã' });
    if (row.code !== code) {
      db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
      return res.status(400).json({ error: 'Mã xác nhận không đúng' });
    }
    db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const name = email.split('@')[0];
      const referral = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
      const r = db.prepare('INSERT INTO users (email, name, referral_code) VALUES (?, ?, ?)').run(email, name, referral);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
    }
    const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '60d' });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 60 * 24 * 3600 * 1000 });
    res.json({ user: publicUser(user) });
  });

  // Đăng nhập Google: client gửi ID token từ Google Identity Services, server xác minh với Google.
  app.post('/api/auth/google', async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Đăng nhập Google chưa được cấu hình' });
    const credential = String(req.body?.credential || '');
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const info = await r.json().catch(() => ({}));
    if (!r.ok || info.aud !== clientId || info.email_verified !== 'true') {
      return res.status(401).json({ error: 'Không xác minh được tài khoản Google' });
    }
    const email = info.email.toLowerCase();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const referral = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
      const ins = db
        .prepare('INSERT INTO users (email, name, avatar_url, referral_code) VALUES (?, ?, ?, ?)')
        .run(email, info.name || email.split('@')[0], info.picture || null, referral);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(ins.lastInsertRowid);
    }
    const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '60d' });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 60 * 24 * 3600 * 1000 });
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  // Xóa tài khoản vĩnh viễn (cần gõ email để xác nhận). Dữ liệu liên quan bị xóa theo ON DELETE CASCADE.
  app.delete('/api/auth/account', requireAuth, (req, res) => {
    if (String(req.body?.confirm || '').trim().toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Email xác nhận không khớp' });
    }
    const uploads = Object.values(JSON.parse(req.user.settings_json || '{}').uploads || {});
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    db.prepare('DELETE FROM email_codes WHERE email = ?').run(req.user.email);
    db.prepare('DELETE FROM streak_invitations WHERE to_email = ?').run(req.user.email);
    for (const u of uploads) {
      const f = path.join(process.env.DATA_DIR || path.resolve('data'), 'uploads', path.basename(String(u)));
      fs.rm(f, () => {});
    }
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/profile', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

  app.patch('/api/auth/profile', requireAuth, (req, res) => {
    const { name, settings } = req.body || {};
    if (name !== undefined) {
      const n = String(name).trim().slice(0, 60);
      if (!n) return res.status(400).json({ error: 'Tên không được để trống' });
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(n, req.user.id);
    }
    if (settings && typeof settings === 'object') {
      const merged = { ...JSON.parse(req.user.settings_json || '{}'), ...settings };
      db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify(merged), req.user.id);
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: publicUser(user) });
  });
}
