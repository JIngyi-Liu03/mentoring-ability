// 81 道自评题（依据《导师辅导能力成熟度诊断报告》模板的 12 维度体系，题数合计 81）
// 每题 5 级李克特量表：1 从不 / 2 很少 / 3 有时 / 4 经常 / 5 总是
// 维度题数分布（与模板一致）：7 / 10 / 9 / 6 / 4 / 8 / 4 / 6 / 5 / 6 / 4 / 12 = 81
export const questions = [
  // 维度一：自我认知与自我发展（7）
  { id: 'q49', dim: 'self', text: '我的辅导方法会因复盘而持续迭代。' },
  { id: 'q76', dim: 'self', text: '我会主动学习辅导相关的理论与方法。' },
  { id: 'q77', dim: 'self', text: '我会向其他优秀导师借鉴经验。' },
  { id: 'q78', dim: 'self', text: '我会记录并沉淀自己的辅导案例与方法。' },
  { id: 'q79', dim: 'self', text: '我会参加相关培训或社群以保持专业成长。' },
  { id: 'q80', dim: 'self', text: '我能清晰说出自己作为导师的短板并补强。' },
  { id: 'q81', dim: 'self', text: '我把「成为更好的导师」视为持续目标而非一次达标。' },

  // 维度二：导师辅导方向的明确与目标设定（10）
  { id: 'q22', dim: 'goal', text: '辅导开始时，我会与学员共同澄清他真正想要达成的目标。' },
  { id: 'q23', dim: 'goal', text: '我会帮学员把模糊目标转化为具体、可衡量的目标。' },
  { id: 'q24', dim: 'goal', text: '我会用 SMART 等框架梳理目标的合理性。' },
  { id: 'q25', dim: 'goal', text: '我会把大目标拆解为可执行的阶段性里程碑。' },
  { id: 'q26', dim: 'goal', text: '我会和学员约定目标达成的检验方式。' },
  { id: 'q27', dim: 'goal', text: '当目标偏离时，我会和学员一起重新校准。' },
  { id: 'q28', dim: 'goal', text: '我鼓励学员自己设定有挑战性的目标。' },
  { id: 'q40', dim: 'goal', text: '我会设计略高于学员当前水平的挑战性任务。' },
  { id: 'q41', dim: 'goal', text: '我关注学员的长线成长，而非单次问题。' },
  { id: 'q42', dim: 'goal', text: '我会帮助学员把辅导收获迁移到真实工作场景。' },

  // 维度三：导师辅导关系建立与维护（9）
  { id: 'q1', dim: 'relationship', text: '我会与学员约定固定的辅导时间，并保持稳定出席。' },
  { id: 'q2', dim: 'relationship', text: '我会在辅导之初与学员明确保密原则与边界。' },
  { id: 'q3', dim: 'relationship', text: '我能营造安全、不被评判的氛围，让学员敢于袒露真实想法。' },
  { id: 'q4', dim: 'relationship', text: '我会主动了解学员的背景、处境与诉求，建立信任。' },
  { id: 'q5', dim: 'relationship', text: '当关系出现张力时，我会主动修复而非回避。' },
  { id: 'q6', dim: 'relationship', text: '我能让学员感受到被尊重、被看见，而非被评判。' },
  { id: 'q53', dim: 'relationship', text: '我可以用恰当的语言为学员的情绪命名与镜映。' },
  { id: 'q55', dim: 'relationship', text: '我会在学员受挫时给予恰如其分的鼓励。' },
  { id: 'q56', dim: 'relationship', text: '我不会因为学员的情绪而失去自己的稳定。' },

  // 维度四：教练技术运用与促进洞察（6）
  { id: 'q15', dim: 'coaching', text: '我常用开放式问题引导学员自己思考。' },
  { id: 'q16', dim: 'coaching', text: '我的问题能帮助学员看到新的视角。' },
  { id: 'q17', dim: 'coaching', text: '我较少直接给答案，而是用提问让学员自己找到答案。' },
  { id: 'q18', dim: 'coaching', text: '我会用「假如……会怎样」等假设式提问拓展可能性。' },
  { id: 'q19', dim: 'coaching', text: '我的问题能帮学员澄清真正的问题所在。' },
  { id: 'q20', dim: 'coaching', text: '我能根据学员状态把握提问的节奏与深度。' },

  // 维度五：发现并激活身边的资源（4）
  { id: 'q63', dim: 'resource', text: '我会主动识别学员完成目标所需的资源缺口。' },
  { id: 'q64', dim: 'resource', text: '我能链接到合适的内部人脉/导师/同事支持学员。' },
  { id: 'q67', dim: 'resource', text: '我能在组织内为学员牵线搭桥。' },
  { id: 'q69', dim: 'resource', text: '我链接的资源能与学员的真实目标对齐。' },

  // 维度六：知识传承与隐性知识管理（8）
  { id: 'q38', dim: 'knowledge', text: '我会用「你还能怎么做」引导学员自主探索解法。' },
  { id: 'q39', dim: 'knowledge', text: '我会有意识地培养学员独立解决问题的能力。' },
  { id: 'q43', dim: 'knowledge', text: '我能识别并肯定学员自身的成长资源与优势。' },
  { id: 'q44', dim: 'knowledge', text: '每次辅导后，我会花时间回顾本次的有效性。' },
  { id: 'q45', dim: 'knowledge', text: '我会引导学员定期复盘自己的进展与卡点。' },
  { id: 'q46', dim: 'knowledge', text: '我能把复盘结论转化为可执行的改进动作。' },
  { id: 'q47', dim: 'knowledge', text: '我鼓励学员记录与沉淀自己的成长历程。' },
  { id: 'q48', dim: 'knowledge', text: '我会主动收集学员对我辅导方式的反馈。' },

  // 维度七：技术与工具的运用（4）
  { id: 'q57', dim: 'tool', text: '我会为不同成熟度的学员匹配不同的辅导方式。' },
  { id: 'q58', dim: 'tool', text: '我会根据学员节奏调整辅导的快慢与深度。' },
  { id: 'q59', dim: 'tool', text: '我能在「放手」与「扶持」之间灵活切换。' },
  { id: 'q60', dim: 'tool', text: '我会考虑学员所在的行业/岗位差异。' },

  // 维度八：成果检验（KPI & KBI）与行动推动（6）
  { id: 'q29', dim: 'outcome', text: '我会基于具体事实而非主观印象给予反馈。' },
  { id: 'q31', dim: 'outcome', text: '我会在合适的时机及时给予反馈。' },
  { id: 'q32', dim: 'outcome', text: '我给予反馈后，会确认学员是否理解。' },
  { id: 'q33', dim: 'outcome', text: '我能以不伤人的方式指出学员的问题。' },
  { id: 'q35', dim: 'outcome', text: '我的反馈能推动学员采取具体改进行动。' },
  { id: 'q37', dim: 'outcome', text: '我更在意学员「会做」，而非我「讲过」。' },

  // 维度九：沟通、倡导与推广（5）
  { id: 'q7', dim: 'communication', text: '辅导中我通常先听完学员表达，再回应。' },
  { id: 'q8', dim: 'communication', text: '我会用复述/总结确认我理解对了学员的意思。' },
  { id: 'q9', dim: 'communication', text: '我能听懂学员没有说出口的隐含需求。' },
  { id: 'q10', dim: 'communication', text: '我能捕捉学员表达中的情绪线索。' },
  { id: 'q11', dim: 'communication', text: '我会留出停顿，不急着填补沉默。' },

  // 维度十：评估与反思（6）
  { id: 'q12', dim: 'reflection', text: '我不打断学员，即使我不同意他的观点。' },
  { id: 'q13', dim: 'reflection', text: '我能区分学员的「事实」与「看法/感受」。' },
  { id: 'q14', dim: 'reflection', text: '我能在倾听中保持专注，不被自己的预设带跑。' },
  { id: 'q21', dim: 'reflection', text: '我会在合适时机用提问推动学员从「想」到「做」。' },
  { id: 'q34', dim: 'reflection', text: '我会邀请学员对自己的表现先做自我反馈。' },
  { id: 'q36', dim: 'reflection', text: '我能区分「评价」与「反馈」，减少评判语气。' },

  // 维度十一：全局视野与系统思维（4）
  { id: 'q50', dim: 'system', text: '我能觉察学员当下的情绪状态。' },
  { id: 'q51', dim: 'system', text: '我会在学员情绪激动时先处理情绪，再处理事情。' },
  { id: 'q52', dim: 'system', text: '我能接纳学员的负面情绪而不急于「解决」。' },
  { id: 'q54', dim: 'system', text: '我能在共情与保持专业边界之间取得平衡。' },

  // 维度十二：职业道德与行为准则（12）
  { id: 'q30', dim: 'ethic', text: '我能在反馈中兼顾肯定优势与指出改进点。' },
  { id: 'q61', dim: 'ethic', text: '我会先了解学员的学习与沟通风格再调整方式。' },
  { id: 'q62', dim: 'ethic', text: '我能识别学员的独特优势并据此设计辅导重点。' },
  { id: 'q65', dim: 'ethic', text: '我会推荐对学员有价值的书籍、课程或工具。' },
  { id: 'q66', dim: 'ethic', text: '我会帮学员争取实践或展示的机会。' },
  { id: 'q68', dim: 'ethic', text: '我会教学员「如何自己寻找资源」。' },
  { id: 'q70', dim: 'ethic', text: '我清楚辅导关系与上下级关系的区别并守住边界。' },
  { id: 'q71', dim: 'ethic', text: '我会保护学员的隐私与敏感信息。' },
  { id: 'q72', dim: 'ethic', text: '我不把学员当作满足自身需求的工具。' },
  { id: 'q73', dim: 'ethic', text: '当超出我的能力范围时，我会转介而非硬撑。' },
  { id: 'q74', dim: 'ethic', text: '我尊重学员的自主决定，不替他做重大决定。' },
  { id: 'q75', dim: 'ethic', text: '我能识别并回避辅导中的双重关系风险。' }
]
