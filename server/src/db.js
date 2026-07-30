// 使用 Node 24 内置的 node:sqlite（DatabaseSync），零原生编译依赖。
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cryptoHash from './crypto-hash.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'mentor.db')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    overall REAL NOT NULL,
    overall_level INTEGER NOT NULL,
    dimension_scores TEXT NOT NULL,
    answers TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
  CREATE INDEX IF NOT EXISTS idx_results_created ON results(created_at);
`)

// 首次启动：创建管理员账号
function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (!exists) {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username, cryptoHash.hash(password), 'admin')
    console.log(`[seed] 已创建管理员账号: ${username} / ${password}`)
  }
}
ensureAdmin()

export default db
