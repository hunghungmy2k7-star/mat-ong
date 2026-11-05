import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'matong.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  coins INTEGER NOT NULL DEFAULT 0,
  pro_until TEXT,
  referral_code TEXT UNIQUE,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📚',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vocabularies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  ipa TEXT,
  pos TEXT,
  meaning TEXT NOT NULL,
  example TEXT,
  note TEXT,
  is_learned INTEGER NOT NULL DEFAULT 0,
  srs_level INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocabularies(user_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,              -- YYYY-MM-DD theo giờ Việt Nam
  mode TEXT NOT NULL,             -- flashcard | quiz | match | typing | listening | special | srs
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user_day ON activity_log(user_id, day);

CREATE TABLE IF NOT EXISTS path_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS paths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES path_groups(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS word_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path_id INTEGER NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS path_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_set_id INTEGER NOT NULL REFERENCES word_sets(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  ipa TEXT,
  pos TEXT,
  meaning TEXT NOT NULL,
  example TEXT
);

CREATE TABLE IF NOT EXISTS pinned_paths (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id INTEGER NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, path_id)
);
`);

// Nhóm lộ trình giữ đúng cấu trúc của site mẫu; nội dung từ vựng sẽ được nhập sau.
const GROUPS = [
  'Theo level', 'THPT', 'IELTS Nâng cao', 'IELTS', 'TOEIC',
  'Người nổi tiếng khuyên dùng', 'Người đi làm & Chuyên ngành', 'THCS & Tiểu học',
];
const insertGroup = db.prepare('INSERT OR IGNORE INTO path_groups (name, sort) VALUES (?, ?)');
GROUPS.forEach((g, i) => insertGroup.run(g, i));


// ---- Migration nhẹ: thêm cột nếu chưa có ----
function addColumn(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
addColumn('categories', 'path_id', 'INTEGER REFERENCES paths(id) ON DELETE SET NULL');
addColumn('categories', 'word_set_id', 'INTEGER REFERENCES word_sets(id) ON DELETE SET NULL');
addColumn('categories', 'is_public', 'INTEGER NOT NULL DEFAULT 0');
addColumn('categories', 'share_token', 'TEXT');
addColumn('vocabularies', 'path_word_id', 'INTEGER');
addColumn('folders', 'share_token', 'TEXT');
