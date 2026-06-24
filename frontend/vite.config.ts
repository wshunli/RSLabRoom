import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发期将 /api 代理到本地后端（默认 http://localhost:3001）。
// 生产环境前后端同域部署，由网关把 /api 转发给后端服务。
export default defineConfig({
  plugins: [vue()],
  server: {
    // 固定端口，避免与本机其他 Vite 项目（5173/5174/5175）混淆。
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
