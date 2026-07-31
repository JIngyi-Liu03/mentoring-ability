// 计分逻辑：由 answers（{ questionId: 1-5 }）算出各维度平均分、总平均分与成熟度等级。
import { dimensions } from '../../shared/dimensions.js'
import { questions } from '../../shared/questions.js'
import { getLevel } from '../../shared/levels.js'

// 返回 { overall, overallLevel, dimensionScores:[{id,name,avg,level}] }
export function computeScores(answers) {
  const questionDim = Object.fromEntries(questions.map(q => [q.id, q.dim]))

  const sums = {}
  const counts = {}
  for (const d of dimensions) {
    sums[d.id] = 0
    counts[d.id] = 0
  }

  for (const [qid, score] of Object.entries(answers || {})) {
    const dimId = questionDim[qid]
    if (!dimId) continue
    const v = Number(score)
    if (!Number.isFinite(v) || v < 1 || v > 5) continue
    sums[dimId] += v
    counts[dimId] += 1
  }

  const dimensionScores = dimensions.map(d => {
    const sum = sums[d.id]
    const count = counts[d.id]
    const avg = count ? sum / count : 0
    const level = getLevel(avg)
    return {
      id: d.id, name: d.name, short: d.short,
      sum, count, avg: round(avg),
      level: level.level, levelName: level.name
    }
  })

  const totalSum = Object.values(sums).reduce((a, b) => a + b, 0)
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const overall = totalCount ? totalSum / totalCount : 0
  const overallLevel = getLevel(overall)

  return {
    overall: round(overall),
    overallLevel: overallLevel.level,
    overallLevelName: overallLevel.name,
    dimensionScores
  }
}

function round(n) {
  return Math.round(n * 100) / 100
}
