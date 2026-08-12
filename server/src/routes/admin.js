// ============================================================
// server/src/routes/admin.js —— 管理路由（薄层）
// ============================================================

import { Router } from 'express'
import { createHash } from 'node:crypto'
import db from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { dimensions } from '../../../shared/dimensions.js'
import * as userRepo from '../repositories/user.repo.js'
import * as resultRepo from '../repositories/result.repo.js'

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

// 管理员账号名（.env 配置，兜底 admin），统计时始终排除
const ADMIN_NAME = process.env.ADMIN_USERNAME || 'admin'

// 概览：总量、整体均值、各维度均值、等级分布（排除管理员自身）
router.get('/overview', requireAdmin, (req, res) => {
  const userCount = userRepo.countNonAdmin(ADMIN_NAME)
  const adminId = userRepo.findAdminIdByName(ADMIN_NAME)

  const resultCount = resultRepo.countExcluding(adminId)
  const overallAvg = resultRepo.avgOverallExcluding(adminId)

  // 各维度均值（遍历每次测评的 dimension_scores，排除管理员）
  const all = resultRepo.allDimensionScoresExcluding(adminId)
  const dimSum = {}
  const dimCnt = {}
  for (const d of dimensions) { dimSum[d.id] = 0; dimCnt[d.id] = 0 }
  for (const r of all) {
    let arr = []
    try { arr = JSON.parse(r.dimension_scores) } catch { continue }
    for (const s of arr) {
      if (dimSum[s.id] === undefined) continue
      dimSum[s.id] += s.avg
      dimCnt[s.id] += 1
    }
  }
  const dimensionAverages = dimensions.map(d => ({
    id: d.id,
    name: d.name,
    short: d.short,
    avg: dimCnt[d.id] ? Math.round((dimSum[d.id] / dimCnt[d.id]) * 100) / 100 : 0
  }))

  const levelDist = resultRepo.levelDistExcluding(adminId)

  res.json({
    userCount,
    resultCount,
    overallAvg: Math.round(overallAvg * 100) / 100,
    dimensionAverages,
    levelDist
  })
})

// 用户列表：含测评次数与最新得分（排除管理员）
router.get('/users', requireAdmin, (req, res) => {
  res.json({ users: userRepo.listWithStats(ADMIN_NAME) })
})

// 全部测评记录（排除管理员自身）
router.get('/results', requireAdmin, (req, res) => {
  res.json({ results: resultRepo.listWithUserExcluding(ADMIN_NAME) })
})

// 按手机号生成解锁码
router.post('/generate-unlock-code', requireAdmin, (req, res) => {
  const { phone } = req.body || {}
  if (!phone || typeof phone !== 'string' || phone.trim().length < 11) {
    return res.status(400).json({ error: '请输入正确的手机号' })
  }

  const user = userRepo.findIdByPhone(phone.trim())
  if (!user) {
    return res.status(404).json({ error: '未找到该手机号对应的用户' })
  }

  const code = generateCode()
  const codeHash = sha256(code)
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)

  db.prepare(`
    INSERT INTO ai_unlock_codes (user_id, code_hash, code, expires_at) VALUES (?, ?, ?, ?)
  `).run(user.id, codeHash, code, expiresAt)

  res.json({
    code,
    userId: user.id,
    phone: phone.trim(),
    expiresAt,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
  })
})

// 解锁码历史
router.get('/unlock-codes', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.user_id, c.code_hash, c.created_at, c.expires_at, c.used_at,
           u.username, u.name, u.phone
    FROM ai_unlock_codes c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT 200
  `).all()

  const now = new Date()
  const list = rows.map(r => {
    const used = !!r.used_at
    const expired = !used && (Date.parse(r.expires_at.replace(' ', 'T') + 'Z') < now.getTime())
    return {
      id: r.id,
      userId: r.user_id,
      username: r.username,
      name: r.name || '—',
      phone: r.phone ? r.phone.slice(0, 3) + '****' + r.phone.slice(-4) : '—',
      code: r.code || null,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      usedAt: r.used_at || null,
      status: used ? 'used' : (expired ? 'expired' : 'active')
    }
  })

  res.json({ codes: list })
})

export default router
