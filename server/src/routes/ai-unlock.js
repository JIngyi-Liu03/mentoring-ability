// ============================================================
// server/src/routes/ai-unlock.js —— AI 深度解读解锁路由
// ============================================================

import { Router } from 'express'
import { createHash } from 'node:crypto'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// 生成 8 位大写字母+数字解锁码（排除 0/O/1/I/L）
function generateCode() {
  const pool = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) s += '-'
    s += pool[Math.floor(Math.random() * pool.length)]
  }
  return s
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

// ==================== 用户端 ====================

// GET /api/ai-report/access — 查询当前用户是否已解锁
router.get('/access', requireAuth, (req, res) => {
  const user = db.prepare('SELECT ai_unlocked_at FROM users WHERE id = ?').get(req.userId)
  const unlocked = !!(user && user.ai_unlocked_at)
  res.json({ unlocked })
})

// POST /api/ai-report/unlock — 用户输入解锁码解锁
router.post('/unlock', requireAuth, (req, res) => {
  const { code } = req.body || {}
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '请输入解锁码' })
  }

  const normalized = code.toUpperCase().trim().replace(/\s+/g, '')
  const codeHash = sha256(normalized)

  // 查该用户的未使用、未过期的码
  const row = db.prepare(`
    SELECT id, expires_at FROM ai_unlock_codes
    WHERE user_id = ? AND code_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(req.userId, codeHash)

  if (!row) {
    return res.status(400).json({ error: '解锁码无效或已过期' })
  }

  // 标记码已使用
  db.prepare('UPDATE ai_unlock_codes SET used_at = datetime(\'now\') WHERE id = ?').run(row.id)
  // 标记用户已解锁
  db.prepare('UPDATE users SET ai_unlocked_at = datetime(\'now\') WHERE id = ?').run(req.userId)

  res.json({ unlocked: true })
})

// ==================== 管理端 ====================

// POST /api/admin/generate-unlock-code — 管理员按手机号生成解锁码
router.post('/generate-unlock-code', requireAdmin, (req, res) => {
  const { phone } = req.body || {}
  if (!phone || typeof phone !== 'string' || phone.trim().length < 11) {
    return res.status(400).json({ error: '请输入正确的手机号' })
  }

  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone.trim())
  if (!user) {
    return res.status(404).json({ error: '未找到该手机号对应的用户' })
  }

  const code = generateCode()
  const codeHash = sha256(code)
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)

  db.prepare(`
    INSERT INTO ai_unlock_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)
  `).run(user.id, codeHash, expiresAt)

  res.json({
    code,
    userId: user.id,
    phone: phone.trim(),
    expiresAt,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
  })
})

// GET /api/admin/unlock-codes — 解锁码历史
router.get('/unlock-codes', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.user_id, c.created_at, c.expires_at, c.used_at,
           u.username, u.name, u.phone
    FROM ai_unlock_codes c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT 200
  `).all()

  const list = rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    name: r.name || '—',
    phone: r.phone ? r.phone.slice(0, 3) + '****' + r.phone.slice(-4) : '—',
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    usedAt: r.used_at || null,
    status: r.used_at ? 'used' : (r.expires_at < new Date().toISOString() ? 'expired' : 'active')
  }))

  res.json({ codes: list })
})

export default router