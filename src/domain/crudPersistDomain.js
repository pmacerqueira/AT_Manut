/**
 * crudPersistDomain — helpers para persistir via apiService + fila offline.
 */

/** Mapa recurso MySQL → export apiService. */
export const API_RESOURCE_MAP = Object.freeze({
  clientes: 'apiClientes',
  categorias: 'apiCategorias',
  subcategorias: 'apiSubcategorias',
  checklistItems: 'apiChecklistItems',
  maquinas: 'apiMaquinas',
  marcas: 'apiMarcas',
  manutencoes: 'apiManutencoes',
  relatorios: 'apiRelatorios',
  reparacoes: 'apiReparacoes',
  relatoriosReparacao: 'apiRelatoriosReparacao',
  tecnicos: 'apiTecnicos',
  pecasPlano: 'apiPecasPlano',
})

export function resolveApiForResource(apiModule, resource) {
  const key = API_RESOURCE_MAP[resource]
  if (!key || !apiModule[key]) {
    throw new Error(`API desconhecida para recurso: ${resource}`)
  }
  return apiModule[key]
}

/**
 * @param {Function} persist — runPersist wrapper do DataContext
 * @param {object} params
 * @param {string} params.resource
 * @param {(api: object) => Promise<void>} params.runWithApi
 * @param {object} params.queueDescriptor
 * @param {(() => void)|null} [params.rollback]
 * @param {boolean} [params.throwOnFailure]
 * @param {() => Promise<object>} [params.loadApiModule]
 */
export async function persistViaApi(
  persist,
  {
    resource,
    runWithApi,
    queueDescriptor,
    rollback = null,
    throwOnFailure = false,
    loadApiModule = () => import('../services/apiService'),
  },
) {
  const mod = await loadApiModule()
  const api = resolveApiForResource(mod, resource)
  const opts = throwOnFailure ? { throwOnFailure: true } : {}
  await persist(() => runWithApi(api), queueDescriptor, rollback, opts)
}

/**
 * Fire-and-forget com handler de erro opcional (padrão CRUD simples no DataContext).
 */
export function schedulePersistViaApi(persist, params, { onError } = {}) {
  persistViaApi(persist, params).catch(err => {
    if (onError) onError(err)
  })
}
