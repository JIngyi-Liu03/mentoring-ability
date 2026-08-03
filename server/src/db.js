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
// 写锁等待超时（毫秒）：避免并发写入时同步 API 长时间阻塞导致整个进程“假死”不响应
db.exec('PRAGMA busy_timeout = 5000;')

// 已存在的库可能缺少 email 列，安全补列（列已存在时会抛错，忽略即可）
try {
  db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run()
} catch (e) {
  // column already exists
}

// 短信验证码登录：安全补列 phone
try {
  db.prepare('ALTER TABLE users ADD COLUMN phone TEXT').run()
} catch (e) {
  // column already exists
}

// 注册时填写的真实姓名
try {
  db.prepare('ALTER TABLE users ADD COLUMN name TEXT').run()
} catch (e) {
  // column already exists
}

// phone 唯一索引（一个手机号一个用户）
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL')
} catch (e) {
  // index already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    email TEXT,
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

  CREATE TABLE IF NOT EXISTS sms_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone);
`)

// 首次启动：创建管理员账号
function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const exists = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username)
  if (!exists) {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username, cryptoHash.hash(password), 'admin')
    console.log(`[seed] 已创建管理员账号: ${username} / ${password}`)
  } else if (!cryptoHash.verify(password, exists.password_hash)) {
    // .env 中的管理员密码与库中不一致时，以 .env 为准同步更新，确保可用
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(cryptoHash.hash(password), exists.id)
    console.log(`[seed] 已按 .env 同步更新管理员密码: ${username} / ${password}`)
  }
}
ensureAdmin()

export default db
