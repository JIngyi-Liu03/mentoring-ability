// ============================================================
// server/src/routes/assessment.js —— 测评路由（薄层）
// ============================================================

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { computeScores } from '../services/scoring.service.js'
import * as resultRepo from '../repositories/result.repo.js'

const router = Router()

// 提交一次测评，落库并返回计分结果
router.post('/submit', requireAuth, (req, res) => {
  const { answers } = req.body || {}
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'answers 字段缺失或格式错误' })
  }
  const scores = computeScores(answers)
  const id = resultRepo.insert({
    userId: req.user.id,
    overall: scores.overall,
    overallLevel: scores.overallLevel,
    dimensionScores: scores.dimensionScores,
    answers
  })
  res.json({ id, ...scores })
})

// 当前用户的历史测评
router.get('/history', requireAuth, (req, res) => {
  res.json({ results: resultRepo.listByUser(req.user.id) })
})

// 查看某次测评详情（仅本人）
router.get('/:id', requireAuth, (req, res) => {
  const row = resultRepo.findByIdAndUser(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: '测评记录不存在' })
  res.json({
    id: row.id,
    overall: row.overall,
    overallLevel: row.overall_level,
    dimensionScores: JSON.parse(row.dimension_scores),
    answers: JSON.parse(row.answers),
    createdAt: row.created_at
  })
})

export default router
