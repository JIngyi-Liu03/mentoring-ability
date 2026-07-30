// 六个导师辅导能力维度（同时被前端与后端引用，作为唯一的口径来源）
export const dimensions = [
  {
    id: 'relationship',
    name: '辅导关系建立',
    short: '关系',
    desc: '与学员建立信任、安全、平等的心理契约，让辅导有一个稳固的容器。'
  },
  {
    id: 'listen',
    name: '倾听与提问',
    short: '倾听',
    desc: '通过积极倾听与有力提问，启发学员自我觉察，而非直接给答案。'
  },
  {
    id: 'goal',
    name: '目标与计划',
    short: '目标',
    desc: '协助学员澄清发展目标，并将其拆解为可执行、可检验的行动计划。'
  },
  {
    id: 'feedback',
    name: '反馈与激励',
    short: '反馈',
    desc: '给予及时、具体、建设性的反馈，并持续赋能与正向激励。'
  },
  {
    id: 'growth',
    name: '成长引导',
    short: '成长',
    desc: '激发学员潜能，陪伴其探索多元发展路径，培养独立成长的能力。'
  },
  {
    id: 'reflection',
    name: '自我反思与迭代',
    short: '反思',
    desc: '对辅导过程持续复盘，依据反馈迭代自身辅导方法，追求精益求精。'
  }
]

export const dimensionMap = Object.fromEntries(dimensions.map(d => [d.id, d]))
