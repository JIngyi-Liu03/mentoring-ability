// 成熟度五级模型（CMMI 风格）。维度平均分取 1–5，据此判定等级。
export const LEVELS = [
  {
    level: 1,
    name: '初始级',
    en: 'Initial',
    range: '1.0 – 1.8',
    min: 0,
    max: 1.8,
    summary: '辅导行为随机、依赖个人经验，缺乏系统性与一致性。',
    actions: [
      '先建立最基本的辅导节奏（固定时间、固定流程）。',
      '从「倾听」起步，减少直接给答案的习惯。',
      '记录每次辅导的关键事件，积累原始经验。'
    ]
  },
  {
    level: 2,
    name: '可重复级',
    en: 'Repeatable',
    range: '1.8 – 2.6',
    min: 1.8,
    max: 2.6,
    summary: '在熟悉场景下能稳定开展辅导，但尚未形成标准方法。',
    actions: [
      '把已奏效的辅导动作标准化为可复用的清单。',
      '明确每次辅导的目标与收尾，避免虎头蛇尾。',
      '开始有意识地在辅导中练习提问与反馈。'
    ]
  },
  {
    level: 3,
    name: '已定义级',
    en: 'Defined',
    range: '2.6 – 3.4',
    min: 2.6,
    max: 3.4,
    summary: '已建立相对完整的辅导流程与方法论，可跨场景稳定输出。',
    actions: [
      '沉淀自己的辅导框架（关系—目标—反馈—复盘）。',
      '针对不同学员类型微调辅导策略。',
      '引入更结构化的工具（GROW、SMART 等）。'
    ]
  },
  {
    level: 4,
    name: '已管理级',
    en: 'Managed',
    range: '3.4 – 4.2',
    min: 3.4,
    max: 4.2,
    summary: '辅导过程可度量、可评估，能依据数据持续改进效果。',
    actions: [
      '为辅导效果建立可量化的指标并定期回顾。',
      '系统性收集学员反馈，形成改进闭环。',
      '开始辅导其他导师，输出方法论。'
    ]
  },
  {
    level: 5,
    name: '优化级',
    en: 'Optimizing',
    range: '4.2 – 5.0',
    min: 4.2,
    max: 5.01,
    summary: '辅导能力持续优化、创新，并能规模化赋能组织与他人。',
    actions: [
      '将个人经验产品化/课程化，赋能更大范围。',
      '推动组织层面的导师培养机制建设。',
      '持续研究前沿方法并反哺自身实践。'
    ]
  }
]

export function getLevel(avg) {
  for (const l of LEVELS) {
    if (avg >= l.min && avg < l.max) return l
  }
  return LEVELS[LEVELS.length - 1]
}
