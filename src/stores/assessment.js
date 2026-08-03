// ============================================================
// src/stores/assessment.js —— 答题进度 Store（useAssessmentStore）
//
// 职责：
//   - 答题进度与答案（单题平铺模式）
//   - 提交测评并保存最近一次结果
//
// 注意：用户登录态 useUserStore 已拆分到 ./user.js
// ============================================================

import { defineStore } from 'pinia'
import { questions } from '../../shared/questions.js'
import { api } from '../api/client.js'

// 答题进度与结果（单题平铺模式）
export const useAssessmentStore = defineStore('assessment', {
  state: () => ({
    answers: questions.map(q => ({ qid: q.id, dim: q.dim, value: null })),
    currentIndex: 0,
    lastResult: null
  }),
  getters: {
    total: (s) => s.answers.length,
    answeredCount: (s) => s.answers.filter(a => a.value !== null).length,
    answersMap: (s) => Object.fromEntries(s.answers.map(a => [a.qid, a.value]))
  },
  actions: {
    setAnswer(index, value) {
      if (this.answers[index]) this.answers[index].value = value
    },
    resetAnswers() {
      this.answers = questions.map(q => ({ qid: q.id, dim: q.dim, value: null }))
      this.currentIndex = 0
    },
    setResult(r) { this.lastResult = r },
    restoreResult(r) { this.lastResult = r },
    async submit() {
      const payload = {}
      for (const a of this.answers) if (a.value != null) payload[a.qid] = a.value
      const data = await api.post('/assessment/submit', { answers: payload })
      this.lastResult = data
      return data
    }
  }
})
