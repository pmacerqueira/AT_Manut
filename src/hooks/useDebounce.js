import { useState, useEffect, useRef } from 'react'

/**
 * Hook que debounce um valor (ex.: input de pesquisa).
 * Útil para evitar chamadas excessivas durante a digitação.
 * @param {any} value - Valor a debounce
 * @param {number} delay - Atraso em ms (default 300)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const timeoutRef = useRef(null)

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timeoutRef.current)
  }, [value, delay])

  return debouncedValue
}
