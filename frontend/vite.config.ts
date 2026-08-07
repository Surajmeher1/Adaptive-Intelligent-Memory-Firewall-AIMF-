import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@components': resolve(import.meta.dirname, './src/components'),
      '@pages': resolve(import.meta.dirname, './src/pages'),
      '@hooks': resolve(import.meta.dirname, './src/hooks'),
      '@store': resolve(import.meta.dirname, './src/store'),
      '@utils': resolve(import.meta.dirname, './src/utils'),
      '@mock': resolve(import.meta.dirname, './src/mock'),
      '@services': resolve(import.meta.dirname, './src/services'),
      '@layouts': resolve(import.meta.dirname, './src/layouts'),
      '@styles': resolve(import.meta.dirname, './src/styles'),
      '@assets': resolve(import.meta.dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
  },
})
