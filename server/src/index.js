import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.js'
import metaRoutes from './routes/meta.js'
import assessmentRoutes from './routes/assessment.js'
import adminRoutes from './routes/admin.js'
import yuanqiRoutes from './routes/yuanqi.js'
import aiUnlockRoutes from './routes/ai-unlock.js'

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
  app.use('/api/coach', yuanqiRoutes)
  app.use('/api/ai-report', aiUnlockRoutes)
  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: '服务器内部错误' })
  })
  return app
}

// 生产模式：托管前端构建产物（用户端 dist/user / 后台端 dist/admin）
function attachStatic(app, dir) {
  if (SERVE_DIST && fs.existsSync(dir)) {
    // 对静态资源做差异化缓存：
    //   - HTML：no-store，避免用户磁盘缓存了引用"旧 hash chunk"的旧 html 造成 ESM 404
    //           （chunk 名已关掉 hash、文件名稳定，配合此设置可让用户纯刷新即可生效）
    //   - JS/CSS/其它：短缓存 1 小时（vite 输出文件名稳定，缓存安全）
    app.use(
      express.static(dir, {
        setHeaders: (res, filePath) => {
          const lower = filePath.toLowerCase()
          if (lower.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
            res.setHeader('Pragma', 'no-cache')
            res.setHeader('Expires', '0')
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600')
          }
        }
      })
    )
    // SPA history 兜底：仅对"无扩展名 / 不像资源文件"的路径返回 index.html，
    // 避免将来出现 .js / .css 404 时被 index.html 顶替成 text/html 进而破坏 ESM 严格 MIME 检查。
    app.get(/^\/(?!assets\/).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      res.sendFile(path.join(dir, 'index.html'))
    })
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
