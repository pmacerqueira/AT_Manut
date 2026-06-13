/**
 * categoriasDomain — categorias, subcategorias e checklist (regras puras).
 */

export function buildNovaCategoria(c, idSeed = Date.now()) {
  return { ...c, id: `cat${idSeed}` }
}

export function buildNovaSubcategoria(s, idSeed = Date.now()) {
  return { ...s, id: `sub${idSeed}` }
}

export function buildNovoChecklistItem(item, idSeed = Date.now()) {
  return { ...item, id: `ch${idSeed}` }
}

export function mergeCategoriaUpdate(categorias, id, data) {
  return categorias.map(c => (c.id === id ? { ...c, ...data } : c))
}

export function mergeSubcategoriaUpdate(subcategorias, id, data) {
  return subcategorias.map(s => (s.id === id ? { ...s, ...data } : s))
}

export function mergeChecklistItemUpdate(checklistItems, id, data) {
  return checklistItems.map(c => (c.id === id ? { ...c, ...data } : c))
}

export function removeCategoriaFromList(categorias, id) {
  return categorias.filter(c => c.id !== id)
}

export function removeSubcategoriaFromList(subcategorias, id) {
  return subcategorias.filter(s => s.id !== id)
}

export function removeChecklistItemsBySubcategoria(checklistItems, subcategoriaId) {
  return checklistItems.filter(c => c.subcategoriaId !== subcategoriaId)
}

export function removeChecklistItemFromList(checklistItems, id) {
  return checklistItems.filter(c => c.id !== id)
}

export function canRemoveSubcategoria(maquinas, subcategoriaId) {
  return !maquinas.some(m => m.subcategoriaId === subcategoriaId)
}

export function canRemoveCategoria(subcategorias, categoriaId) {
  return !subcategorias.some(s => s.categoriaId === categoriaId)
}

export function checklistIdsForSubcategoria(checklistItems, subcategoriaId) {
  return checklistItems.filter(c => c.subcategoriaId === subcategoriaId).map(c => c.id)
}
