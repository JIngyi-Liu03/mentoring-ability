// 12 个能力维度（依据《导师辅导能力成熟度自评》最终版）
export const dimensions = [
  { id: 'relationship', short: '关系建立', name: '关系建立', color: '#6366f1', desc: '与学员建立信任、安全、稳定的辅导关系，奠定辅导基础。' },
  { id: 'listen', short: '倾听理解', name: '倾听理解', color: '#0ea5e9', desc: '专注、不带评判地倾听，准确理解学员的表达与隐含需求。' },
  { id: 'inquiry', short: '提问启发', name: '提问启发', color: '#10b981', desc: '用开放式、启发式提问引导学员自己思考与发现答案。' },
  { id: 'goal', short: '目标设定', name: '目标设定', color: '#f59e0b', desc: '与学员共同澄清目标，将其转化为可衡量、可落地的行动。' },
  { id: 'feedback', short: '反馈给予', name: '反馈给予', color: '#ef4444', desc: '基于事实给予具体、及时、建设性的反馈，助力学员成长。' },
  { id: 'growth', short: '成长引导', name: '成长引导', color: '#8b5cf6', desc: '激发学员潜能，培养其独立解决问题与持续成长的能力。' },
  { id: 'reflection', short: '反思复盘', name: '反思复盘', color: '#14b8a6', desc: '引导学员定期复盘，将经历转化为可迁移的经验与认知。' },
  { id: 'emotion', short: '情绪支持', name: '情绪支持', color: '#ec4899', desc: '识别并接纳学员情绪，在安全氛围中给予恰当的情绪疏导。' },
  { id: 'personalize', short: '个性化辅导', name: '个性化辅导', color: '#f97316', desc: '识别学员差异，因材施教，灵活调整辅导策略与节奏。' },
  { id: 'resource', short: '资源链接', name: '资源链接', color: '#22c55e', desc: '识别学员需求，链接并整合内外部资源与机会。' },
  { id: 'ethics', short: '边界与伦理', name: '边界与伦理', color: '#64748b', desc: '恪守辅导边界与职业伦理，保护学员隐私与自主。' },
  { id: 'improve', short: '持续精进', name: '持续精进', color: '#3b82f6', desc: '持续学习、反思并迭代自身辅导方法，追求专业精进。' }
]

export const dimensionMap = Object.fromEntries(dimensions.map(d => [d.id, d]))
