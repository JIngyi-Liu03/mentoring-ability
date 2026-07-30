// 轻量 API 客户端：自动附带 token，统一处理错误。
import { useUserStore } from '../stores/assessment.js'

const BASE = '/api'

async function request(method, url, body) {
  const user = useUserStore()
  const headers = { 'Content-Type': 'application/json' }
  if (user.token) headers.Authorization = `Bearer ${user.token}`

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
