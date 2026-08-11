import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// 开发时前端跑在 5173，后端跑在 3001；通过 proxy 把 /api 转发到后端。
// 生产构建后由 Express 托管 dist，前后端同源，无需代理。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/user',
    emptyOutDir: true,
    rollupOptions: {
      // 【关键修复】关闭 chunk 文件名 hash：
      // 原因：浏览器磁盘缓存的旧 index.html 引用旧 hash 的 .js，新构建后旧 hash 已被
      //       新 build 清掉，旧缓存的入口就会去 fetch 一个不存在的 hash，被 SPA fallback
      //       顶替成 index.html (text/html)，ESM 模块加载失败 → SPA 部分功能罢工 → 用户
      //       看到"AI 请求失败 (404)"。改成 [name].js 后文件名稳定，无论缓存了哪个版本
      //       的 index.html，刷新后都能命中同名的真实 chunk，无需用户手动清缓存。
      // （同源部署没有 CDN 缓存收益，文件名稳定反而显著提升本地/部署调试体验）
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
})
