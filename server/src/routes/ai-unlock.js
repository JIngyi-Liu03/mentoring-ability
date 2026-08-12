// ============================================================
// server/src/routes/ai-unlock.js —— AI 深度解读解锁路由（仅用户端）
// ============================================================

import { Router } from 'express'
import { createHash } from 'node:crypto'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

// GET /api/ai-report/access — 查询当前用户是否已解锁
router.get('/access', requireAuth, (req, res) => {
  const user = db.prepare('SELECT ai_unlocked_at FROM users WHERE id = ?').get(req.user.id)
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
  `).get(req.user.id, codeHash)

  if (!row) {
    return res.status(400).json({ error: '解锁码无效或已过期' })
  }

  // 标记码已使用
  db.prepare('UPDATE ai_unlock_codes SET used_at = datetime(\'now\') WHERE id = ?').run(row.id)
  // 标记用户已解锁
  db.prepare('UPDATE users SET ai_unlocked_at = datetime(\'now\') WHERE id = ?').run(req.user.id)

  res.json({ unlocked: true })
})

export default router