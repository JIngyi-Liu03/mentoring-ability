import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.js'
import metaRoutes from './routes/meta.js'
import assessmentRoutes from './routes/assessment.js'
import adminRoutes from './routes/admin.js'

// 全局兜底：捕获未处理的异常 / Promise 拒绝，记录后退出，
// 由 systemd 的 Restart=always 自动拉起，避免进程“静默假死”导致端口长期打不开。
// 注意：node:sqlite 同步崩溃后进程状态不可靠，故直接退出让守护进程重启（WAL 保证崩溃恢复）。
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason)
  process.exit(1)
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const ADMIN_PORT = process.env.ADMIN_PORT || 3002
const SERVE_DIST = String(process.env.SERVE_DIST) === 'true'

// 共用一套 API 路由（两个端口都生效，后台端同源调用无需 CORS）
function buildApiApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))
  app.use('/api/auth', authRoutes)
  app.use('/api/meta', metaRoutes)
  app.use('/api/assessment', assessmentRoutes)
  app.use('/api/admin', adminRoutes)

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: '服务器内部错误' })
  })
  return app
}

// 生产模式：托管前端构建产物（用户端 dist/user / 后台端 dist/admin）
function attachStatic(app, dir) {
  if (SERVE_DIST && fs.existsSync(dir)) {
    app.use(express.static(dir))
    app.get('*', (req, res) => res.sendFile(path.join(dir, 'index.html')))
    console.log('[static] 托管前端构建产物:', dir)
  } else if (SERVE_DIST) {
    console.warn('[static] 未找到目录，请先运行 npm run build:', dir)
  }
}

// 3001：用户端（测评 / 结果 / API）
// 显式绑定 0.0.0.0，确保公网 IPv4 与本地回环都能命中同一进程（避免 IPv4/IPv6 双栈导致的“双进程”假象）
const userApp = buildApiApp()
attachStatic(userApp, path.resolve(__dirname, '..', '..', 'dist', 'user'))
userApp.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] 用户端已启动: http://0.0.0.0:${PORT}`)
})

// 3002：后台管理端（管理看板 / API）
const adminApp = buildApiApp()
attachStatic(adminApp, path.resolve(__dirname, '..', '..', 'dist', 'admin'))
adminApp.listen(ADMIN_PORT, '0.0.0.0', () => {
  console.log(`[server] 后台端已启动: http://0.0.0.0:${ADMIN_PORT}`)
})
