/**
 * GlobalLoadingContext — overlay de carregamento global.
 * Mostra o ícone "N" a rodar ao centro do ecrã durante operações assíncronas
 * (enviar email, gerar PDF, ver relatórios, backup, etc.).
 *
 * Uso:
 *   const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
 *   showGlobalLoading()
 *   try {
 *     await operacaoPesada()
 *   } finally {
 *     hideGlobalLoading()
 *   }
 *
 * Usa contador interno: múltiplas operações podem chamar show/hide;
 * o overlay só desaparece quando todas terminarem.
 */
import { createContext, useContext, useState, useCallback } from 'react'
import { ASSETS } from '../constants/assets'
import './GlobalLoadingOverlay.css'

const GlobalLoadingContext = createContext(null)

export function GlobalLoadingProvider({ children }) {
  const [count, setCount] = useState(0)

  const showGlobalLoading = useCallback(() => {
    setCount(c => c + 1)
  }, [])

  const hideGlobalLoading = useCallback(() => {
    setCount(c => Math.max(0, c - 1))
  }, [])

  return (
    <GlobalLoadingContext.Provider value={{ showGlobalLoading, hideGlobalLoading }}>
      {children}
      {count > 0 && (
        <div className="global-loading-overlay" role="status" aria-live="polite" aria-label="A processar">
          <div className="global-loading-content">
            <img src={ASSETS.LOGO_ICON} alt="" className="global-loading-icon" />
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const ctx = useContext(GlobalLoadingContext)
  if (!ctx) throw new Error('useGlobalLoading deve ser usado dentro de GlobalLoadingProvider')
  return ctx
}
