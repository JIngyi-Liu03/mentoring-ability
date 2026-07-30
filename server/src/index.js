import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.js'
import metaRoutes from './routes/meta.js'
import assessmentRoutes from './routes/assessment.js'
import adminRoutes from './routes/admin.js'

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

// 生产模式：托管前端构建产物（用户端 dist / 后台端 dist-admin）
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
const userApp = buildApiApp()
attachStatic(userApp, path.resolve(__dirname, '..', '..', 'dist'))
userApp.listen(PORT, () => {
  console.log(`[server] 用户端已启动: http://localhost:${PORT}`)
})

// 3002：后台管理端（管理看板 / API）
const adminApp = buildApiApp()
attachStatic(adminApp, path.resolve(__dirname, '..', '..', 'dist-admin'))
adminApp.listen(ADMIN_PORT, () => {
  console.log(`[server] 后台端已启动: http://localhost:${ADMIN_PORT}`)
})
