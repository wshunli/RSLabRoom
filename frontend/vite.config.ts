import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发期将 /api 代理到本地 NestJS（默认 http://localhost:3000）。
// 生产环境由 NestJS 在同一端口提供前端静态文件与 /api。
export default defineConfig({
  plugins: [vue()],
  server: {
    // 监听所有网卡，使同一局域网内的设备可以访问开发服务器。
    host: '0.0.0.0',
    // 固定端口，避免与本机其他 Vite 项目（5173/5174/5175）混淆。
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
