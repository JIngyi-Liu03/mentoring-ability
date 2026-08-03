// ============================================================
// server/src/routes/admin.js —— 管理路由（薄层）
// ============================================================

import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { dimensions } from '../../../shared/dimensions.js'
import * as userRepo from '../repositories/user.repo.js'
import * as resultRepo from '../repositories/result.repo.js'

const router = Router()

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

export default router
