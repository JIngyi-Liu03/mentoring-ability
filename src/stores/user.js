// ============================================================
// src/stores/user.js —— 用户登录态 Store（useUserStore）
//
// 职责：
//   - 登录态：token / 用户信息 / 角色
//   - isLoggedIn / isAdmin 计算属性
//   - setSession / logout 动作
//
// 依赖：src/utils/token.js（localStorage 读写），消除与 client.js 的循环依赖
// ============================================================

import { defineStore } from 'pinia'
import { getToken, getUser, setSession, clearSession } from '../utils/token.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    user: getUser()
  }),
  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === 'admin'
  },
  actions: {
    setSession(token, user) {
      this.token = token
      this.user = user
      setSession(token, user)
    },
    logout() {
      this.token = ''
      this.user = null
      clearSession()
    }
  }
})
