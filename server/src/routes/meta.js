import { Router } from 'express'
import { dimensions } from '../../../shared/dimensions.js'
import { questions, questionsByDimension } from '../../../shared/questions.js'
import { LEVELS } from '../../../shared/levels.js'

// 公开接口：返回答题所需的静态元数据（维度 / 题目 / 等级）
const router = Router()

router.get('/', (req, res) => {
  res.json({
    dimensions,
    questions,
    questionsByDim: questionsByDimension(dimensions),
    levels: LEVELS
  })
})

export default router
