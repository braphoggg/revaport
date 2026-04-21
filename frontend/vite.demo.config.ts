/* Demo-instance Vite config: runs on port 5174 and proxies /api to a
 * separate backend on :8001 (which serves backend/data/demo.db).
 * Used by `python scripts/dev_demo.py` for screenshots/demos so the real
 * dev server on :5173 / :8000 is left untouched. */
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
