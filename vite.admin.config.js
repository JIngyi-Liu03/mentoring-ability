import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

// 后台管理前端：独立入口，构建产物输出到 dist-admin，由后端在 3002 端口托管
export default defineConfig({
  plugins: [vue()],
  root: resolve(root, 'src/admin'),
  base: './',
  build: {
    outDir: resolve(root, 'dist-admin'),
    emptyOutDir: true
  }
})
