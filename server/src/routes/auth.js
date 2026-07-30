import { Router } from 'express'
import crypto from 'node:crypto'
import db from '../db.js'
import cryptoHash from '../crypto-hash.js'
import { createSession, destroySession, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { username, password, email } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' })
  if (String(username).length < 2) return res.status(400).json({ error: '用户名至少 2 个字符' })
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少 6 个字符' })

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return res.status(409).json({ error: '该用户名已被注册' })

  const info = db.prepare('INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)')
    .run(username, cryptoHash.hash(password), 'user', email ? String(email).trim() : null)
  const user = db.prepare('SELECT id, username, role, email, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = createSession(user.id)
  res.json({ token, user })
})

router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' })
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !cryptoHash.verify(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  const token = createSession(user.id)
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
})

router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  destroySession(token)
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// 找回密码：校验用户名 + 邮箱，匹配则生成重置码（演示环境直接返回，生产可改为邮件发送）
router.post('/forgot-password', (req, res) => {
  const { username, email } = req.body || {}
  if (!username || !email) return res.status(400).json({ error: '请填写用户名和注册邮箱' })
  const user = db.prepare('SELECT id, email FROM users WHERE username = ?').get(username)
  if (!user || !user.email || String(user.email).toLowerCase() !== String(email).toLowerCase()) {
    return res.status(404).json({ error: '用户名与邮箱不匹配，或该账号未绑定邮箱' })
  }
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 分钟有效
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id)
  db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, user.id, expiresAt)
  console.log(`[auth] 找回密码重置码（演示环境直接返回）: ${token}`)
  res.json({ ok: true, resetToken: token, message: '验证通过，请使用下方重置码设置新密码' })
})

// 用重置码设置新密码
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {}
  if (!token || !newPassword) return res.status(400).json({ error: '重置码和新密码必填' })
  if (String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少 6 个字符' })
  const row = db.prepare('SELECT user_id, expires_at FROM password_resets WHERE token = ?').get(token)
  if (!row) return res.status(400).json({ error: '重置码无效或不存在' })
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(token)
    return res.status(400).json({ error: '重置码已过期，请重新获取' })
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(cryptoHash.hash(newPassword), row.user_id)
  db.prepare('DELETE FROM password_resets WHERE token = ?').run(token)
  res.json({ ok: true })
})

export default router
