import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: '/manut/' — app em https://navel.pt/manut/ ou http://navel.pt/manut/
// Para deploy na raiz (navel.pt/), use: VITE_BASE_URL=/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL || '/manut/',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
