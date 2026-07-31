// 成熟度等级（依据《导师辅导能力成熟度自评》最终版的分制）
// 综合得分（各维度均值，1-5 分制）映射到四档导师成熟度等级
// 配色策略：只用商标双色调（青蓝主色 + 橙强调色）
export const levels = [
  { level: 1, name: '助理级（Associate Mentor）', short: '助理级', min: 1.0, max: 2.4, color: '#a8dad0',
    desc: '具备导师辅导的基本认知，但核心技能尚需系统学习和实践。建议参加专业培训，在资深导师指导下开展实践，并建立初步的反思习惯。' },
  { level: 2, name: '专业级（Professional Mentor）', short: '专业级', min: 2.5, max: 3.4, color: '#3aa9aa',
    desc: '能够独立开展导师辅导工作，在常规情境中运用核心技能。建议增加辅导对象的多样性，建立稳定的督导关系，系统化记录实践与反思。' },
  { level: 3, name: '高级（Senior Mentor）', short: '高级', min: 3.5, max: 4.2, color: '#1c8a8b',
    desc: '能够处理复杂辅导情境，灵活运用多种模型和工具，并开始辅导他人。建议深化某一专业领域（如隐性知识管理、跨文化辅导），对同行进行督导，参与行业发展活动。' },
  { level: 4, name: '大师级（Master Mentor）', short: '大师级', min: 4.3, max: 5.0, color: '#ea7c2a',
    desc: '能够创造性地整合多元框架，在专业领域有独特贡献和影响力。建议持续创新，为行业发展做出贡献（如撰写文章、开发模型、培训下一代导师）。' }
]

export function getLevel(score) {
  for (const lv of levels) {
    if (score >= lv.min && score <= lv.max) return lv
  }
  return levels[levels.length - 1]
}