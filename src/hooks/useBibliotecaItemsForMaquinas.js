import { useState, useEffect } from 'react'
import { apiDocumentosBibliotecaSearchMany } from '../services/apiService'
import { fetchBibliotecaItemsForMaquina } from '../utils/bibliotecaMaquinaFetch'

/**
 * Carrega biblioteca NAVEL para vários equipamentos num só pedido (`search_many`).
 * Usado em listas onde badges de documentação precisam de contar associações externas.
 * Fallback por equipamento se o servidor ainda não suportar o batch.
 */
export function useBibliotecaItemsForMaquinas(maquinaIds) {
  const [map, setMap] = useState({})
  const idsKey = [...new Set((maquinaIds ?? []).map(id => String(id)).filter(Boolean))].sort().join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (!ids.length) return undefined

    let cancelled = false
    ;(async () => {
      let byMachine = null
      try {
        const res = await apiDocumentosBibliotecaSearchMany(ids)
        if (res?.itemsByMachine && typeof res.itemsByMachine === 'object') {
          byMachine = res.itemsByMachine
        }
      } catch {
        byMachine = null
      }
      if (byMachine == null) {
        const entries = await Promise.all(
          ids.map(async id => [id, await fetchBibliotecaItemsForMaquina(id)]),
        )
        byMachine = Object.fromEntries(entries)
      }
      if (cancelled) return
      setMap(prev => {
        const next = { ...prev }
        for (const id of ids) {
          next[id] = Array.isArray(byMachine[id]) ? byMachine[id] : []
        }
        return next
      })
    })()

    return () => { cancelled = true }
  }, [idsKey])

  return map
}
