/**
 * categoriasSlice — CRUD categorias, subcategorias e checklist (extraído do DataContext).
 */
import {
  buildNovaCategoria,
  buildNovaSubcategoria,
  buildNovoChecklistItem,
  mergeCategoriaUpdate,
  mergeSubcategoriaUpdate,
  mergeChecklistItemUpdate,
  removeCategoriaFromList,
  removeSubcategoriaFromList,
  removeChecklistItemsBySubcategoria,
  removeChecklistItemFromList,
  canRemoveSubcategoria,
  canRemoveCategoria,
  checklistIdsForSubcategoria,
} from '../../domain/categoriasDomain'
import { schedulePersistViaApi } from '../../domain/crudPersistDomain'

export function createCategoriasHandlers(deps) {
  const {
    getMaquinas,
    getSubcategorias,
    getChecklistItems,
    setCategorias,
    setSubcategorias,
    setChecklistItems,
    persist,
  } = deps

  const addSubcategoria = (s) => {
    if (!s.nome?.trim()) return null
    const novo = buildNovaSubcategoria(s)
    setSubcategorias(prev => [...prev, novo])
    schedulePersistViaApi(persist, {
      resource: 'subcategorias',
      runWithApi: api => api.create(novo),
      queueDescriptor: { resource: 'subcategorias', action: 'create', data: novo },
    })
    return novo.id
  }

  const updateSubcategoria = (id, data) => {
    setSubcategorias(prev => mergeSubcategoriaUpdate(prev, id, data))
    schedulePersistViaApi(persist, {
      resource: 'subcategorias',
      runWithApi: api => api.update(id, data),
      queueDescriptor: { resource: 'subcategorias', action: 'update', id, data },
    })
  }

  const removeSubcategoria = (id) => {
    if (!canRemoveSubcategoria(getMaquinas(), id)) return false
    const idsCheck = checklistIdsForSubcategoria(getChecklistItems(), id)
    setSubcategorias(prev => removeSubcategoriaFromList(prev, id))
    setChecklistItems(prev => removeChecklistItemsBySubcategoria(prev, id))
    import('../../services/apiService').then(({ apiSubcategorias, apiChecklistItems }) => {
      idsCheck.forEach(cid =>
        persist(() => apiChecklistItems.remove(cid),
          { resource: 'checklistItems', action: 'delete', id: cid }),
      )
      persist(() => apiSubcategorias.remove(id),
        { resource: 'subcategorias', action: 'delete', id })
    })
    return true
  }

  const addChecklistItem = (item) => {
    const novo = buildNovoChecklistItem(item)
    setChecklistItems(prev => [...prev, novo])
    import('../../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.create(novo),
        { resource: 'checklistItems', action: 'create', data: novo }),
    )
    return novo.id
  }

  const updateChecklistItem = (id, data) => {
    setChecklistItems(prev => mergeChecklistItemUpdate(prev, id, data))
    import('../../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.update(id, data),
        { resource: 'checklistItems', action: 'update', id, data }),
    )
  }

  const removeChecklistItem = (id) => {
    setChecklistItems(prev => removeChecklistItemFromList(prev, id))
    import('../../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.remove(id),
        { resource: 'checklistItems', action: 'delete', id }),
    )
  }

  const addCategoria = (c) => {
    if (!c.nome?.trim()) return null
    const novo = buildNovaCategoria(c)
    setCategorias(prev => [...prev, novo])
    import('../../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.create(novo),
        { resource: 'categorias', action: 'create', data: novo }),
    )
    return novo.id
  }

  const updateCategoria = (id, data) => {
    setCategorias(prev => mergeCategoriaUpdate(prev, id, data))
    import('../../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.update(id, data),
        { resource: 'categorias', action: 'update', id, data }),
    )
  }

  const removeCategoria = (id) => {
    if (!canRemoveCategoria(getSubcategorias(), id)) return false
    setCategorias(prev => removeCategoriaFromList(prev, id))
    import('../../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.remove(id),
        { resource: 'categorias', action: 'delete', id }),
    )
    return true
  }

  return {
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    addCategoria,
    updateCategoria,
    removeCategoria,
  }
}
