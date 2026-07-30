import crypto from 'node:crypto'
import db from '../db.js'

const TOKEN_TTL_DAYS = 7

// 生成并持久化一个会话 token
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 864e5).toISOString()
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expiresAt)
  return token
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

function getUserByToken(token) {
  if (!token) return null
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token)
  if (!session) return null
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(session.user_id)
  return user || null
}

function extractToken(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}

export function requireAuth(req, res, next) {
  const user = getUserByToken(extractToken(req))
  if (!user) return res.status(401).json({ error: '未登录或登录已过期' })
  req.user = user
  next()
}

export function requireAdmin(req, res, next) {
  const user = getUserByToken(extractToken(req))
  if (!user) return res.status(401).json({ error: '未登录或登录已过期' })
  if (user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' })
  req.user = user
  next()
}
