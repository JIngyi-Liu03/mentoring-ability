import { Router } from 'express'
import db from '../db.js'
import cryptoHash from '../crypto-hash.js'
import { createSession, destroySession, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' })
  if (String(username).length < 2) return res.status(400).json({ error: '用户名至少 2 个字符' })
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少 6 个字符' })

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return res.status(409).json({ error: '该用户名已被注册' })

  const info = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, cryptoHash.hash(password), 'user')
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
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

export default router
