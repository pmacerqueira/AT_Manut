import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: '/manut/' — app em https://navel.pt/manut/ ou http://navel.pt/manut/
// Para deploy na raiz (navel.pt/), use: VITE_BASE_URL=/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL || '/manut/',
  server: {
    proxy: {
      '/api': {
        target: 'https://www.navel.pt',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    target: 'es2020',
    // Limiar para o bundle principal (DataContext é grande por design — gzip real: ~190KB)
    chunkSizeWarningLimit: 700,
    // Não calcular tamanho gzip no output — poupa 6-8s por build
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-qr': ['qrcode'],
          'vendor-purify': ['dompurify'],
          'vendor-pdf': ['jspdf'],
          'vendor-canvas': ['html2canvas'],
          'vendor-zxing': ['@zxing/browser'],
          'vendor-datefns': ['date-fns'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
