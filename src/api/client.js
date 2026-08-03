// ============================================================
// src/api/client.js —— 轻量 API 客户端
//
// 职责：
//   - 自动附带 token（来自 utils/token.js，不再依赖 store，避免循环依赖）
//   - 统一处理错误，返回 JSON
// ============================================================

import { getToken } from '../utils/token.js'

const BASE = '/api'

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `请求失败 (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  del: (url) => request('DELETE', url)
}
