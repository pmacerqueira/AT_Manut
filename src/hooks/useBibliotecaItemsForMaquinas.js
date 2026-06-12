import { useState, useEffect } from 'react'
import { fetchBibliotecaItemsForMaquina } from '../utils/bibliotecaMaquinaFetch'

/**
 * Carrega biblioteca NAVEL para vários equipamentos (cache por id).
 * Usado em listas onde badges de documentação precisam de contar associações externas.
 */
export function useBibliotecaItemsForMaquinas(maquinaIds) {
  const [map, setMap] = useState({})
  const idsKey = [...new Set((maquinaIds ?? []).map(id => String(id)).filter(Boolean))].sort().join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (!ids.length) return undefined

    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        ids.map(async id => [id, await fetchBibliotecaItemsForMaquina(id)]),
      )
      if (cancelled) return
      setMap(prev => {
        const next = { ...prev }
        for (const [id, items] of entries) next[id] = items
        return next
      })
    })()

    return () => { cancelled = true }
  }, [idsKey])

  return map
}
