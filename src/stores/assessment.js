import { defineStore } from 'pinia'
import { questions } from '../../shared/questions.js'
import { api } from '../api/client.js'

const TOKEN_KEY = 'mentor_token'
const USER_KEY = 'mentor_user'

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

// 用户与登录态
export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: load(USER_KEY)
  }),
  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === 'admin'
  },
  actions: {
    setSession(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }
})

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
