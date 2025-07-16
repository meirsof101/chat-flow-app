import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/upload': {
        target: 'https://week-5-web-sockets-assignment-meirsof101.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})