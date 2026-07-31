import { Router } from 'express'
import crypto from 'node:crypto'
import db from '../db.js'
import cryptoHash from '../crypto-hash.js'
import { sendSmsCode } from '../sms.js'
import { createSession, destroySession, requireAuth } from '../middleware/auth.js'

const router = Router()

// 手机号格式：中国大陆 11 位
const PHONE_RE = /^1[3-9]\d{9}$/
const CODE_TTL = Number(process.env.SMS_CODE_TTL || 5) * 60 * 1000
const SEND_INTERVAL = Number(process.env.SMS_SEND_INTERVAL || 60) * 1000

function genCode() {
  return String(crypto.randomInt(100000, 1000000))
}

// 校验验证码，消费后返回 true
function consumeCode(phone, code) {
  const row = db.prepare('SELECT * FROM sms_codes WHERE phone = ? ORDER BY id DESC LIMIT 1').get(phone)
  if (!row) return { ok: false, error: '请先获取验证码' }
  if (row.consumed) return { ok: false, error: '验证码已使用，请重新获取' }
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: '验证码已过期，请重新获取' }
  if (row.code !== String(code)) return { ok: false, error: '验证码错误' }
  db.prepare('UPDATE sms_codes SET consumed = 1 WHERE id = ?').run(row.id)
  return { ok: true }
}

// ========== 通用 ==========

// 检查手机号是否已注册
router.post('/check-phone', (req, res) => {
  const { phone } = req.body || {}
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: '手机号格式不正确' })
  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
  res.json({ exists: !!user })
})

// 发送短信验证码 —— purpose: login | register | reset
router.post('/sms/send', async (req, res) => {
  const { phone, purpose } = req.body || {}
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })

  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)

  // 按场景校验手机号是否存在
  if (purpose === 'login' || purpose === 'reset') {
    if (!user) return res.status(400).json({ error: '该手机号未注册，请先注册账号' })
  } else if (purpose === 'register') {
    if (user) return res.status(400).json({ error: '该手机号已注册，请直接登录' })
  }

  // 限频
  const recent = db.prepare('SELECT created_at FROM sms_codes WHERE phone = ? ORDER BY id DESC LIMIT 1').get(phone)
  if (recent) {
    const createdMs = new Date(recent.created_at.replace(' ', 'T') + 'Z').getTime()
    if (Date.now() - createdMs < SEND_INTERVAL) {
      return res.status(429).json({ error: '发送过于频繁，请稍后再试' })
    }
  }

  const code = genCode()
  try {
    await sendSmsCode(phone, code)
  } catch (e) {
    return res.status(502).json({ error: e.message || '短信发送失败' })
  }
  const expiresAt = new Date(Date.now() + CODE_TTL).toISOString()
  db.prepare('INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, ?)').run(phone, code, expiresAt)
  res.json({ ok: true })
})

// ========== 密码登录（手机号 + 密码 或 用户名 + 密码） ==========

router.post('/login', (req, res) => {
  const { phone, username, password } = req.body || {}
  const identifier = phone || username
  const isPhone = !!phone
  if (!identifier || !password) {
    return res.status(400).json({ error: isPhone ? '请输入手机号和密码' : '请输入用户名和密码' })
  }

  // 优先按 phone 列查找，再按 username 查找
  let user
  if (phone) {
    user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
  }
  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE username = ?').get(identifier)
  }

  if (!user || !cryptoHash.verify(password, user.password_hash)) {
    return res.status(401).json({ error: isPhone ? '手机号或密码错误' : '用户名或密码错误' })
  }
  const token = createSession(user.id)
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, phone: user.phone, name: user.name } })
})

// ========== 验证码登录（手机号必须已注册） ==========

router.post('/sms/login', (req, res) => {
  const { phone, code } = req.body || {}
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  if (!code) return res.status(400).json({ error: '请输入验证码' })

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
  if (!user) return res.status(400).json({ error: '该手机号未注册，请先注册账号' })

  const result = consumeCode(phone, code)
  if (!result.ok) return res.status(400).json({ error: result.error })

  const token = createSession(user.id)
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, phone: user.phone, name: user.name } })
})

// ========== 注册（手机号 + 验证码 + 密码 + 姓名） ==========

router.post('/sms/register', (req, res) => {
  const { phone, code, password, name } = req.body || {}
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  if (!code) return res.status(400).json({ error: '请输入验证码' })
  if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少 6 个字符' })
  if (!name || !String(name).trim()) return res.status(400).json({ error: '请输入姓名' })

  // 手机号必须未注册
  const exists = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
  if (exists) return res.status(409).json({ error: '该手机号已注册，请直接登录' })

  const result = consumeCode(phone, code)
  if (!result.ok) return res.status(400).json({ error: result.error })

  const username = phone
  const info = db.prepare(
    'INSERT INTO users (username, password_hash, role, phone, name) VALUES (?, ?, ?, ?, ?)'
  ).run(username, cryptoHash.hash(password), 'user', phone, String(name).trim())

  const user = db.prepare('SELECT id, username, role, phone, name, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = createSession(user.id)
  res.json({ token, user })
})

// ========== 找回密码（手机号 + 验证码 + 新密码 —— 仅更新密码，保留全部历史数据） ==========

router.post('/sms/reset-password', (req, res) => {
  const { phone, code, password } = req.body || {}
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  if (!code) return res.status(400).json({ error: '请输入验证码' })
  if (!password || String(password).length < 6) return res.status(400).json({ error: '新密码至少 6 个字符' })

  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
  if (!user) return res.status(400).json({ error: '该手机号未注册' })

  const result = consumeCode(phone, code)
  if (!result.ok) return res.status(400).json({ error: result.error })

  // 仅更新密码，保留 name / phone / 历史评测数据等全部不变
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(cryptoHash.hash(password), user.id)
  res.json({ ok: true })
})

// ========== 旧版注册（保留兼容） ==========

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

// ========== 登出 / 会话 ==========

router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  destroySession(token)
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// ========== 旧版找回密码（邮箱）保留兼容 ==========

router.post('/forgot-password', (req, res) => {
  const { username, email } = req.body || {}
  if (!username || !email) return res.status(400).json({ error: '请填写用户名和注册邮箱' })
  const user = db.prepare('SELECT id, email FROM users WHERE username = ?').get(username)
  if (!user || !user.email || String(user.email).toLowerCase() !== String(email).toLowerCase()) {
    return res.status(404).json({ error: '用户名与邮箱不匹配，或该账号未绑定邮箱' })
  }
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id)
  db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, user.id, expiresAt)
  console.log(`[auth] 找回密码重置码: ${token}`)
  res.json({ ok: true, resetToken: token, message: '验证通过，请使用下方重置码设置新密码' })
})

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
