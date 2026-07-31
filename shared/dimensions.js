// 12 个能力维度（依据《导师辅导能力成熟度诊断报告》模板）
// 配色策略：只用商标双色调（青蓝主色 #1c8a8b + 橙强调色 #ea7c2a）
export const dimensions = [
  { id: 'self',          short: '自我认知', name: '维度一：自我认知与自我发展',         color: '#1c8a8b', desc: '觉察自身优势与短板，持续规划个人作为导师的成长。' },
  { id: 'goal',          short: '目标设定', name: '维度二：导师辅导方向的明确与目标设定', color: '#1c8a8b', desc: '与学员共同澄清辅导方向，将目标转化为可衡量、可落地的行动。' },
  { id: 'relationship',  short: '关系建立', name: '维度三：导师辅导关系建立与维护',       color: '#1c8a8b', desc: '与学员建立信任、安全、稳定的辅导关系，并持续维护。' },
  { id: 'coaching',      short: '教练技术', name: '维度四：教练技术运用与促进洞察',         color: '#1c8a8b', desc: '运用开放式提问与教练技术，促进学员自我洞察与发现答案。' },
  { id: 'resource',      short: '资源激活', name: '维度五：发现并激活身边的资源',           color: '#1c8a8b', desc: '识别学员需求，链接并激活内外部资源与机会。' },
  { id: 'knowledge',     short: '知识传承', name: '维度六：知识传承与隐性知识管理',         color: '#1c8a8b', desc: '有效传递显性知识，萃取并管理隐性经验与方法。' },
  { id: 'tool',          short: '技术应用', name: '维度七：技术与工具的运用',               color: '#1c8a8b', desc: '熟练运用辅导模型、工具与数字化手段提升辅导效能。' },
  { id: 'outcome',       short: '成果检验', name: '维度八：成果检验（KPI & KBI）与行动推动', color: '#1c8a8b', desc: '设定检验标准，推动学员行动落地并检验辅导成效。' },
  { id: 'communication', short: '沟通推广', name: '维度九：沟通、倡导与推广',               color: '#1c8a8b', desc: '清晰沟通、有效倡导，并推广导师辅导的价值与文化。' },
  { id: 'reflection',    short: '评估反思', name: '维度十：评估与反思',                     color: '#1c8a8b', desc: '系统评估辅导过程，在复盘与反思中持续迭代方法。' },
  { id: 'system',        short: '系统思维', name: '维度十一：全局视野与系统思维',           color: '#1c8a8b', desc: '以全局视野与系统思维看待学员成长与组织环境。' },
  { id: 'ethic',         short: '职业道德', name: '维度十二：职业道德与行为准则',           color: '#ea7c2a', desc: '恪守职业伦理与行为准则，保护学员并守住边界。' }
]

export const dimensionMap = Object.fromEntries(dimensions.map(d => [d.id, d]))