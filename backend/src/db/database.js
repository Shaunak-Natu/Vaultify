const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'vaultify.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    vault_salt  TEXT NOT NULL,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    last_login  INTEGER
  );

  CREATE TABLE IF NOT EXISTS vault_entries (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'password',
    title       TEXT NOT NULL,
    username    TEXT,
    password_enc TEXT,
    url         TEXT,
    notes_enc   TEXT,
    category    TEXT DEFAULT 'General',
    is_favorite INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    updated_at  INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_user ON vault_entries(user_id);
  CREATE INDEX IF NOT EXISTS idx_entries_category ON vault_entries(category);
`);

module.exports = db;
