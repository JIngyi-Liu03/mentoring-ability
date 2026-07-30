import { Router } from 'express'
import { dimensions } from '../../../shared/dimensions.js'
import { questions } from '../../../shared/questions.js'
import { levels } from '../../../shared/levels.js'

// 公开接口：返回答题所需的静态元数据（维度 / 题目 / 等级）
const router = Router()

router.get('/', (req, res) => {
  const questionsByDim = dimensions.reduce((acc, d) => {
    acc[d.id] = questions.filter(q => q.dim === d.id)
    return acc
  }, {})
  res.json({ dimensions, questions, questionsByDim, levels })
})

export default router
