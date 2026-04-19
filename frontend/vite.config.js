import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    // Dev proxy: forwards /api to local backend
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    } : undefined,
  },
}))
