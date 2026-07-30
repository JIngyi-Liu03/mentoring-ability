// 成熟度等级（依据《导师辅导能力成熟度自评》最终版的分制）
// 综合得分（各维度均值，1-5 分制）映射到四档导师成熟度等级
export const levels = [
  { level: 1, name: '助理级导师', short: '助理级', min: 1.0, max: 2.4, color: '#94a3b8',
    desc: '能开展基本辅导动作，关系、倾听与目标设定尚在建立中，需更多刻意练习与指引。' },
  { level: 2, name: '专业级导师', short: '专业级', min: 2.5, max: 3.4, color: '#3b82f6',
    desc: '辅导流程稳定可靠，能独立支持学员达成目标，核心能力已具专业水准。' },
  { level: 3, name: '高级导师', short: '高级', min: 3.5, max: 4.2, color: '#8b5cf6',
    desc: '能因材施教、启发思考并推动学员自主成长，辅导具有个人风格与深度。' },
  { level: 4, name: '大师级导师', short: '大师级', min: 4.3, max: 5.0, color: '#f59e0b',
    desc: '辅导已成为一种艺术：安全容器、深度启发与持续精进兼具，可赋能其他导师。' }
]

export function getLevel(score) {
  for (const lv of levels) {
    if (score >= lv.min && score <= lv.max) return lv
  }
  return levels[levels.length - 1]
}
