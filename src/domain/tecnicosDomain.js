/**
 * tecnicosDomain — entidade técnico (regras puras).
 */

export function buildNovoTecnico(t, idSeed = Date.now()) {
  return {
    id: `tec-${idSeed}`,
    nome: t.nome?.trim(),
    telefone: t.telefone?.trim() || null,
    assinaturaDigital: t.assinaturaDigital || null,
    ativo: true,
    criadoEm: new Date().toISOString(),
  }
}

export function sortTecnicosByNome(tecnicos) {
  return [...tecnicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}

export function mergeTecnicoUpdate(tecnicos, id, data) {
  return tecnicos.map(t => (t.id === id ? { ...t, ...data } : t))
}

export function removeTecnicoFromList(tecnicos, id) {
  return tecnicos.filter(t => t.id !== id)
}

export function findTecnicoByNome(tecnicos, nome) {
  return tecnicos.find(t => t.nome === nome && t.ativo !== false)
}
