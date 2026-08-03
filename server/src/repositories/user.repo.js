// ============================================================
// server/src/repositories/user.repo.js —— 用户数据访问层
//
// 职责：users 表的增删改查，仅负责存取数据，不含业务规则
// ============================================================

import db from '../db.js'

// 按手机号查用户（仅 id）
export function findIdByPhone(phone) {
  return db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
}

// 按手机号查完整用户
export function findFullByPhone(phone) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
}

// 按用户名查完整用户
export function findFullByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

// 按 id 查指定字段
export function findById(id, fields = 'id, username, role, phone, name, created_at') {
  return db.prepare(`SELECT ${fields} FROM users WHERE id = ?`).get(id)
}

// 按用户名查管理员 id
export function findAdminIdByName(adminName) {
  return db.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').get(adminName)?.id
}

// 非管理员用户数
export function countNonAdmin(adminName) {
  return db.prepare("SELECT COUNT(*) c FROM users WHERE role != 'admin' AND username != ?").get(adminName).c
}

// 创建用户（可带 phone/name/email）
export function create({ username, passwordHash, role, phone = null, name = null, email = null }) {
  const info = db.prepare(
    'INSERT INTO users (username, password_hash, role, phone, name, email) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username, passwordHash, role, phone, name, email)
  return info.lastInsertRowid
}

// 更新密码
export function updatePassword(id, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
}

// 用户列表（含测评次数与最新得分，排除管理员）
export function listWithStats(adminName) {
  return db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.created_at,
      (SELECT COUNT(*) FROM results r WHERE r.user_id = u.id) AS assessments,
      (SELECT overall FROM results r WHERE r.user_id = u.id ORDER BY r.created_at DESC LIMIT 1) AS latest_overall,
      (SELECT overall_level FROM results r WHERE r.user_id = u.id ORDER BY r.created_at DESC LIMIT 1) AS latest_level
    FROM users u
    WHERE u.role != 'admin' AND u.username != ?
    ORDER BY u.created_at DESC
  `).all(adminName)
}
