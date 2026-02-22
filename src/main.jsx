import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { GlobalLoadingProvider } from './context/GlobalLoadingContext'
import { ToastProvider } from './components/Toast'
import { logEntry } from './utils/logger'
import './index.css'
import App from './App.jsx'

// ── Captura global de erros JavaScript não tratados ─────────────────────────
window.addEventListener('error', (e) => {
  logEntry('error', 'Global', 'uncaughtError', e.message || 'Erro desconhecido', {
    filename: e.filename,
    line:     e.lineno,
    col:      e.colno,
    stack:    e.error?.stack?.slice(0, 600),
  })
})

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason) || 'Promise rejeitada'
  logEntry('error', 'Global', 'unhandledRejection', msg, {
    stack: e.reason?.stack?.slice(0, 600),
  })
})

// ── Versão da aplicação ───────────────────────────────────────────────────────
import { APP_VERSION } from './config/version'

// ── Limpeza de caches obsoletos no arranque ───────────────────────────────────
// Se a versão gravada no localStorage for diferente da versão actual:
//  • limpa caches de Service Worker (ficheiros JS/CSS de builds anteriores)
//  • limpa sessionStorage (dados de sessão stale)
//  • NÃO apaga dados do utilizador (clientes, manutenções, etc.)
;(async () => {
  try {
    const storedVersion = localStorage.getItem('atm_app_version')
    if (storedVersion !== APP_VERSION) {
      // Apaga todos os caches de Service Worker
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      // Limpa sessionStorage (dados de sessão temporários)
      sessionStorage.clear()
      // Regista nova versão
      localStorage.setItem('atm_app_version', APP_VERSION)
      logEntry('info', 'App', 'versionUpdate', `Versão actualizada para ${APP_VERSION}. Caches limpos.`)
    } else {
      logEntry('info', 'App', 'startup', `App iniciada (v${APP_VERSION})`)
    }
  } catch (err) {
    logEntry('warn', 'App', 'versionUpdate', 'Falha ao limpar caches ou actualizar versão', { msg: err?.message })
  }
})()

// ── Service Worker (PWA) — permite "Adicionar ao ecrã inicial" ─────────────────
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL })
    .then((reg) => logEntry('info', 'App', 'swRegistered', 'Service Worker registado', {}))
    .catch(() => { /* falha silenciosa */ })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/manut">
      <ToastProvider>
        <GlobalLoadingProvider>
          <AuthProvider>
            <DataProvider>
              <App />
            </DataProvider>
          </AuthProvider>
        </GlobalLoadingProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
