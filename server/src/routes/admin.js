import { Router } from 'express'
import db from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { dimensions } from '../../../shared/dimensions.js'

const router = Router()

// 概览：总量、整体均值、各维度均值、等级分布
router.get('/overview', requireAdmin, (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c
  const resultCount = db.prepare("SELECT COUNT(*) c FROM results").get().c
  const overallAvgRow = db.prepare('SELECT AVG(overall) a FROM results').get()

  // 各维度均值（遍历每次测评的 dimension_scores）
  const all = db.prepare('SELECT dimension_scores FROM results').all()
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

  const levelDist = db.prepare(
    'SELECT overall_level l, COUNT(*) c FROM results GROUP BY overall_level ORDER BY l'
  ).all()

  res.json({
    userCount,
    resultCount,
    overallAvg: overallAvgRow.a ? Math.round(overallAvgRow.a * 100) / 100 : 0,
    dimensionAverages,
    levelDist
  })
})

// 用户列表：含测评次数与最新得分
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.created_at,
      (SELECT COUNT(*) FROM results r WHERE r.user_id = u.id) AS assessments,
      (SELECT overall FROM results r WHERE r.user_id = u.id ORDER BY r.created_at DESC LIMIT 1) AS latest_overall,
      (SELECT overall_level FROM results r WHERE r.user_id = u.id ORDER BY r.created_at DESC LIMIT 1) AS latest_level
    FROM users u
    ORDER BY u.created_at DESC
  `).all()
  res.json({ users })
})

// 全部测评记录
router.get('/results', requireAdmin, (req, res) => {
  const results = db.prepare(`
    SELECT r.id, r.user_id, u.username, r.overall, r.overall_level, r.created_at
    FROM results r JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
    LIMIT 500
  `).all()
  res.json({ results })
})

export default router
