import { useState, useEffect, useCallback } from 'react'
import { apiDocumentosBibliotecaSearch } from '../services/apiService'

/**
 * Documentos da biblioteca NAVEL associados a um equipamento (machineId).
 */
export function useBibliotecaMaquina(maquinaId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!maquinaId) {
      setItems([])
      setLoading(false)
      return []
    }
    setLoading(true)
    try {
      const data = await apiDocumentosBibliotecaSearch({ machineId: String(maquinaId) })
      const list = Array.isArray(data?.items) ? data.items : []
      setItems(list)
      return list
    } catch {
      setItems([])
      return []
    } finally {
      setLoading(false)
    }
  }, [maquinaId])

  useEffect(() => {
    reload()
  }, [reload])

  return { items, loading, reload, setItems }
}
