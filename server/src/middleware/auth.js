// ============================================================
// server/src/middleware/auth.js —— 鉴权中间件
//
// 职责：
//   - 会话 token 的创建 / 销毁（数据存取委托 repositories/session.repo.js）
//   - requireAuth（需登录）/ requireAdmin（需管理员）守卫
// ============================================================

import crypto from 'node:crypto'
import * as sessionRepo from '../repositories/session.repo.js'

const TOKEN_TTL_DAYS = 7

// 生成并持久化一个会话 token
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 864e5).toISOString()
  sessionRepo.create({ token, userId, expiresAt })
  return token
}

export function destroySession(token) {
  sessionRepo.destroy(token)
}

function getUserByToken(token) {
  if (!token) return null
  const session = sessionRepo.findByToken(token)
  if (!session) return null
  if (new Date(session.expires_at).getTime() < Date.now()) {
    sessionRepo.deleteByToken(token)
    return null
  }
  return sessionRepo.findUserById(session.user_id) || null
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
