import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发时前端跑在 5173，后端跑在 3001；通过 proxy 把 /api 转发到后端。
// 生产构建后由 Express 托管 dist，前后端同源，无需代理。
export default defineConfig({
  plugins: [vue()],
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
    emptyOutDir: true
  }
})
