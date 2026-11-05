import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { db } from './db.js';
import { registerAuthRoutes, requireAuth } from './auth.js';
import { vnDay, addDays, weekdayLabel } from './time.js';
import { registerVocabRoutes } from './vocab.js';
import { registerPracticeRoutes } from './practice.js';
import { registerSrsRoutes } from './srs.js';
import { registerPathRoutes } from './paths.js';
import { registerSocialRoutes } from './social.js';
import { registerShopRoutes, UPLOAD_DIR } from './shop.js';
import { registerCommunityRoutes } from './community.js';
import { registerClassRoutes } from './classes.js';
import { registerAiRoutes } from './ai.js';
import { registerPushRoutes } from './push.js';

const app = express();
app.use(express.json({ limit: '6mb' }));
app.use(cookieParser());

registerAuthRoutes(app);
registerVocabRoutes(app);
registerPracticeRoutes(app);
registerSrsRoutes(app);
registerPathRoutes(app);
registerSocialRoutes(app);
registerShopRoutes(app);
registerCommunityRoutes(app);
registerClassRoutes(app);
registerAiRoutes(app);
registerPushRoutes(app);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));

// ---- Thống kê từ vựng (card thống kê trang chủ & /words) ----
app.get('/api/vocabularies/stats', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  const s = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN is_learned = 1 OR srs_level >= 5 THEN 1 ELSE 0 END) AS learned,
              SUM(CASE WHEN srs_level > 0 AND srs_level < 5 AND next_review_at <= ? THEN 1 ELSE 0 END) AS due
         FROM vocabularies WHERE user_id = ?`
    )
    .get(now, req.user.id);
  const total = s.total || 0;
  const learned = s.learned || 0;
  res.json({ total, learned, notLearned: total - learned, due: s.due || 0, progress: total ? Math.round((learned / total) * 100) : 0 });
});

// ---- Streak: số ngày liên tiếp có hoạt động + 7 chấm tuần ----
app.get('/api/activity/streak', requireAuth, (req, res) => {
  const today = vnDay();
  const rows = db
    .prepare('SELECT DISTINCT day FROM activity_log WHERE user_id = ? AND day >= ? ORDER BY day DESC')
    .all(req.user.id, addDays(today, -400));
  const days = new Set(rows.map((r) => r.day));

  // Chuỗi vẫn còn nếu hôm nay chưa học nhưng hôm qua có học.
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, label: weekdayLabel(day), active: days.has(day), isToday: day === today };
  });
  res.json({ streak, activeToday: days.has(today), week });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Không tìm thấy API' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại' });
});

// Production: phục vụ bản build của client
const dist = path.resolve('../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`Mật Ong API chạy tại http://localhost:${PORT}`));
