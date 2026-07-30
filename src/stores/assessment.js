import { defineStore } from 'pinia'

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

// 答题进度与结果
export const useAssessmentStore = defineStore('assessment', {
  state: () => ({
    meta: null,        // { dimensions, questions, questionsByDim, levels }
    answers: {},       // { questionId: 1-5 }
    step: 0,           // 当前维度步序
    lastResult: null   // 最近一次提交返回的结果
  }),
  getters: {
    dimensions: (s) => s.meta?.dimensions || [],
    totalSteps: (s) => s.meta?.dimensions?.length || 0,
    answeredCount: (s) => Object.keys(s.answers).length
  },
  actions: {
    setMeta(meta) { this.meta = meta },
    setAnswer(qid, value) { this.answers[qid] = value },
    resetAnswers() { this.answers = {}; this.step = 0 },
    setResult(r) { this.lastResult = r },
    restoreResult(r) { this.lastResult = r }
  }
})
