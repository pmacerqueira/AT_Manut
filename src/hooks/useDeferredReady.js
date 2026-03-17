import { useState, useEffect, useRef } from 'react'

/**
 * useDeferredReady — Adia o rendering de conteúdo pesado por um frame,
 * permitindo ao browser pintar o spinner antes de bloquear com o render.
 *
 * @param {boolean} dataReady — true quando os dados estão disponíveis
 * @param {number}  delay     — ms adicionais de delay (default: 0, usa requestAnimationFrame)
 * @returns {boolean} ready — true quando pode renderizar o conteúdo pesado
 */
export function useDeferredReady(dataReady, delay = 0) {
  const [ready, setReady] = useState(false)
  const prevReady = useRef(dataReady)

  useEffect(() => {
    if (!dataReady) {
      setReady(false)
      prevReady.current = false
      return
    }
    if (prevReady.current) {
      setReady(true)
      return
    }
    prevReady.current = true

    const raf = requestAnimationFrame(() => {
      if (delay > 0) {
        const timer = setTimeout(() => setReady(true), delay)
        return () => clearTimeout(timer)
      }
      setReady(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [dataReady, delay])

  return ready
}
