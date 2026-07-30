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
const SERVE_DIST = String(process.env.SERVE_DIST) === 'true'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/meta', metaRoutes)
app.use('/api/assessment', assessmentRoutes)
app.use('/api/admin', adminRoutes)

// 生产模式：托管前端构建产物（dist）
if (SERVE_DIST) {
  const distDir = path.resolve(__dirname, '..', '..', 'dist')
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')))
    console.log('[static] 托管前端构建产物:', distDir)
  } else {
    console.warn('[static] 未找到 dist 目录，请先运行 npm run build')
  }
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[server] 导师辅导能力成熟度自评 - 后端已启动: http://localhost:${PORT}`)
})
