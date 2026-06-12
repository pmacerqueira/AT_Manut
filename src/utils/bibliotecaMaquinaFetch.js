import { apiDocumentosBibliotecaSearch } from '../services/apiService'

/** Itens da biblioteca NAVEL associados a um equipamento (sem UI). */
export async function fetchBibliotecaItemsForMaquina(maquinaId) {
  if (!maquinaId) return []
  try {
    const data = await apiDocumentosBibliotecaSearch({ machineId: String(maquinaId) })
    return Array.isArray(data?.items) ? data.items : []
  } catch {
    return []
  }
}
