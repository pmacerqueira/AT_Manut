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
    // Alertar quando chunk > 600KB (após splitting, nenhum deve exceder)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — sempre carregado
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Gráficos KPIs — apenas em /metricas (lazy), ~300KB separados do bundle principal
          'vendor-charts': ['recharts'],
          // QR Code — geração de etiquetas
          'vendor-qr': ['qrcode'],
          // Sanitização HTML
          'vendor-purify': ['dompurify'],
        },
      },
    },
  },
})
