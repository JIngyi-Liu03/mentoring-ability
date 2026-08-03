// ============================================================
// src/utils/token.js —— Token / 用户信息 的 localStorage 读写
//
// 职责：
//   - 统一封装 token 与用户信息的存取（get / set / clear）
//   - src/api/client.js 与 src/stores/user.js 都依赖本模块，
//     消除 client.js ↔ store 之间的循环依赖
// ============================================================

const TOKEN_KEY = 'mentor_token'
const USER_KEY = 'mentor_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
