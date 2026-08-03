// ============================================================
// server/src/repositories/session.repo.js —— 会话数据访问层
//
// 职责：sessions 表的增删查，仅负责存取数据
// ============================================================

import db from '../db.js'

// 创建会话
export function create({ token, userId, expiresAt }) {
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt)
}

// 销毁会话
export function destroy(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

// 按 token 查会话
export function findByToken(token) {
  if (!token) return null
  return db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token)
}

// 按 token 删除（过期清理）
export function deleteByToken(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

// 按 id 查用户（会话所属）
export function findUserById(id) {
  return db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id)
}
