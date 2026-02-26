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
    // Limiar para o bundle principal (DataContext é grande por design — gzip real: ~190KB)
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — sempre carregado
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Gráficos KPIs — apenas em /metricas (lazy)
          'vendor-charts': ['recharts'],
          // QR Code — geração de etiquetas
          'vendor-qr': ['qrcode'],
          // Sanitização HTML
          'vendor-purify': ['dompurify'],
          // Geração de PDF — apenas quando solicitado
          'vendor-pdf': ['jspdf'],
          // Captura de ecrã para PDF
          'vendor-canvas': ['html2canvas'],
        },
      },
    },
  },
})
