import { useState, useEffect, useRef } from 'react'
import './ContentLoader.css'

/**
 * ContentLoader — Indicador de carregamento reutilizável com spinner + timer.
 *
 * Uso:
 *   <ContentLoader loading={isLoading} message="A carregar equipamentos…">
 *     <TabelaPesada />
 *   </ContentLoader>
 *
 * Props:
 *   loading    — boolean: se true, mostra o spinner em vez dos children
 *   message    — texto principal (default: "A carregar dados…")
 *   hint       — texto secundário (default: "Por favor aguarde.")
 *   showTimer  — mostra o contador de segundos (default: true)
 *   minHeight  — altura mínima do contentor (default: '200px')
 *   inline     — versão compacta/inline sem padding extra (default: false)
 */
export default function ContentLoader({
  loading,
  message = 'A carregar dados…',
  hint = 'Por favor aguarde.',
  showTimer = true,
  minHeight = '200px',
  inline = false,
  children,
}) {
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [loading])

  if (!loading) return children

  return (
    <div
      className={`content-loader${inline ? ' content-loader--inline' : ''}`}
      style={{ minHeight }}
    >
      <div className="content-loader-spinner" />
      <p className="content-loader-msg">{message}</p>
      {showTimer && elapsed > 0 && (
        <p className="content-loader-timer">{elapsed}s</p>
      )}
      {hint && <p className="content-loader-hint">{hint}</p>}
    </div>
  )
}
