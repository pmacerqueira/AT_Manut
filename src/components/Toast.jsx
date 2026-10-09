/**
 * Toast — sistema global de notificações centradas no ecrã.
 *
 * Uso:
 *   const { showToast } = useToast()
 *   showToast('Guardado com sucesso!', 'success')      // verde, fecha sozinho
 *   showToast('Erro ao enviar email.', 'error')        // vermelho, fecha sozinho
 *   showToast('Preencha o ponto.', 'warning')          // amarelo, fica até OK
 *
 * Tipos: 'success' | 'error' | 'warning' | 'info'
 * O aviso (warning) não desaparece sozinho: o técnico fecha com OK.
 *
 * `clearToasts()` fecha tudo o que estiver aberto; os assistentes de execução chamam-no ao mudar
 * de passo e ao fechar, para que avisos antigos não fiquem a tapar o passo seguinte.
 * Regra (v1.17.32): bloqueios de validação dentro de um assistente mostram-se inline (`.form-erro`),
 * não em toast — o toast amarelo fica reservado a regras de negócio fora dos passos.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timerRef = useRef({})
  const avisosAbertos = useRef(new Set())

  const showToast = useCallback((message, type = 'info', duration) => {
    const sticky = type === 'warning'
    if (sticky) {
      if (avisosAbertos.current.has(message)) return
      avisosAbertos.current.add(message)
    }
    const d = duration ?? (type === 'success' || type === 'error' ? 4000 : 2500)
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, sticky }])

    if (!sticky) {
      timerRef.current[id] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        delete timerRef.current[id]
      }, d)
    }
  }, [])

  const dismiss = useCallback((id) => {
    clearTimeout(timerRef.current[id])
    delete timerRef.current[id]
    setToasts(prev => prev.filter(t => {
      if (t.id !== id) return true
      if (t.sticky) avisosAbertos.current.delete(t.message)
      return false
    }))
  }, [])

  /**
   * Fecha todos os toasts abertos (ex.: ao mudar de passo num assistente ou ao fechar um modal),
   * para que avisos de um contexto anterior não fiquem a tapar o conteúdo do seguinte.
   * `onlySticky: true` fecha só os avisos amarelos (que de outro modo ficam até OK).
   */
  const clearToasts = useCallback(({ onlySticky = false } = {}) => {
    setToasts(prev => {
      const keep = prev.filter(t => onlySticky && !t.sticky)
      prev.forEach(t => {
        if (keep.includes(t)) return
        clearTimeout(timerRef.current[t.id])
        delete timerRef.current[t.id]
        if (t.sticky) avisosAbertos.current.delete(t.message)
      })
      return keep
    })
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, clearToasts }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast--${t.type}`}
            role={t.sticky ? 'alert' : 'status'}
            onClick={t.sticky ? undefined : () => dismiss(t.id)}
          >
            <span className="toast-icon">{ICONS[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
            {t.sticky && (
              <button type="button" className="toast-ok" onClick={() => dismiss(t.id)}>
                OK
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
