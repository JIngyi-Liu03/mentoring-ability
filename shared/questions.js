// 题目按维度分组，每题 1–5 分（李克特量表：从不 / 很少 / 有时 / 经常 / 总是）
// 前端答题与后端计分共用同一份题目定义。
export const questions = [
  // 1. 辅导关系建立
  { id: 'q_rel_1', dimId: 'relationship', text: '我能主动与学员建立平等、开放的沟通氛围。' },
  { id: 'q_rel_2', dimId: 'relationship', text: '学员愿意向我坦诚表达真实困惑与顾虑。' },
  { id: 'q_rel_3', dimId: 'relationship', text: '我会保护学员的隐私与自尊，不评判其弱点。' },
  { id: 'q_rel_4', dimId: 'relationship', text: '我能清晰界定辅导关系边界（角色、频率、目标）。' },

  // 2. 倾听与提问
  { id: 'q_lis_1', dimId: 'listen', text: '辅导时我会专注倾听，不急于打断或下结论。' },
  { id: 'q_lis_2', dimId: 'listen', text: '我常用开放式提问引导学员自己思考，而非直接给建议。' },
  { id: 'q_lis_3', dimId: 'listen', text: '我能捕捉学员话语背后的情绪与隐含需求。' },
  { id: 'q_lis_4', dimId: 'listen', text: '我会复述/总结学员的表达，确认自己理解无误。' },

  // 3. 目标与计划
  { id: 'q_goal_1', dimId: 'goal', text: '我会与学员共同澄清其真正想达成的辅导目标。' },
  { id: 'q_goal_2', dimId: 'goal', text: '我能帮助学员将模糊目标拆解为具体、可衡量的行动。' },
  { id: 'q_goal_3', dimId: 'goal', text: '我会与学员约定阶段性里程碑与检查节点。' },
  { id: 'q_goal_4', dimId: 'goal', text: '当目标偏离时，我会与学员重新对齐而非强行推进。' },

  // 4. 反馈与激励
  { id: 'q_fb_1', dimId: 'feedback', text: '我能提供及时、具体、基于事实的反馈。' },
  { id: 'q_fb_2', dimId: 'feedback', text: '我习惯先肯定再提改进点（正向—建设性结构）。' },
  { id: 'q_fb_3', dimId: 'feedback', text: '我会识别并放大学员的优势与微小进步。' },
  { id: 'q_fb_4', dimId: 'feedback', text: '面对学员挫折，我能以赋能方式激发其内在动力。' },

  // 5. 成长引导
  { id: 'q_gr_1', dimId: 'growth', text: '我会引导学员探索多种可能的发展路径。' },
  { id: 'q_gr_2', dimId: 'growth', text: '我注重培养学员独立解决问题的能力，而非依赖我。' },
  { id: 'q_gr_3', dimId: 'growth', text: '我会结合学员特质推荐资源、人脉或挑战性任务。' },
  { id: 'q_gr_4', dimId: 'growth', text: '我能帮助学员把辅导收获迁移到真实工作场景中。' },

  // 6. 自我反思与迭代
  { id: 'q_rf_1', dimId: 'reflection', text: '每次辅导后我会复盘哪些做法有效、哪些需改进。' },
  { id: 'q_rf_2', dimId: 'reflection', text: '我会主动收集学员对我辅导方式的反馈。' },
  { id: 'q_rf_3', dimId: 'reflection', text: '我持续学习辅导方法论（教练、心理学等）并实践。' },
  { id: 'q_rf_4', dimId: 'reflection', text: '我能觉察自身盲区，并据此调整辅导风格。' }
]

export const questionsByDimension = dimensions => {
  const map = {}
  for (const d of dimensions) map[d.id] = []
  for (const q of questions) {
    if (map[q.dimId]) map[q.dimId].push(q)
  }
  return map
}
