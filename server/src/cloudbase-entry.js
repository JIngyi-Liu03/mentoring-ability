// CloudBase 云托管/云函数专用入口：单端口，托管用户端 dist/user
// 复用 v002 全部业务逻辑；不改动 index.js（原 Ubuntu 部署不受影响）
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.js'
import metaRoutes from './routes/meta.js'
import assessmentRoutes from './routes/assessment.js'
import adminRoutes from './routes/admin.js'
import { createCoachRouter, ensureCoachTables } from './coach/index.js'

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason)
  process.exit(1)
})

// 启动前确保 coach 相关表存在
ensureCoachTables()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const SERVE_DIST = String(process.env.SERVE_DIST) !== 'false'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/meta', metaRoutes)
app.use('/api/assessment', assessmentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/coach', createCoachRouter())

// 兜底错误处理
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

// 托管前端构建产物（用户端）
const userDist = path.resolve(__dirname, '..', '..', 'dist', 'user')
if (SERVE_DIST && fs.existsSync(userDist)) {
  app.use(express.static(userDist))
  app.get('*', (_req, res) => res.sendFile(path.join(userDist, 'index.html')))
  console.log('[static] 托管前端构建产物:', userDist)
} else if (SERVE_DIST) {
  console.warn('[static] 未找到目录，请先运行 npm run build:', userDist)
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[cloudbase] 用户端已启动: http://0.0.0.0:${PORT}`)
})
