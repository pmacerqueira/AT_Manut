/**
 * manutencoesDomain — entidade manutenção (regras puras).
 */

export function buildNovaManutencao(m, idSeed = Date.now()) {
  return {
    ...m,
    id: `m${idSeed}`,
    criadoEm: m.criadoEm ?? new Date().toISOString(),
  }
}

export function buildManutencoesBatch(lista, baseSeed = Date.now()) {
  return (lista || []).map((m, i) => ({
    ...m,
    id: m.id || `mb${baseSeed}_${i}`,
    criadoEm: m.criadoEm ?? new Date().toISOString(),
  }))
}

/** @returns {{ next: object[], syncIds: string[] }} */
export function mergeManutencaoUpdate(manutencoes, id, data) {
  const anterior = manutencoes.find(m => m.id === id)
  const next = manutencoes.map(m => (m.id === id ? { ...m, ...data } : m))
  const mids = new Set()
  if (anterior?.maquinaId) mids.add(anterior.maquinaId)
  const alvo = next.find(m => m.id === id)
  if (alvo?.maquinaId) mids.add(alvo.maquinaId)
  return { next, syncIds: [...mids] }
}

export function findRelatorioByManutencaoId(relatorios, manutencaoId, normFn) {
  const idN = normFn(manutencaoId)
  return relatorios.find(r => normFn(r.manutencaoId) === idN)
}

export function buildNovoRelatorioManutencao(r, { manutencoes, relatorios, proximoNumeroFn, idSeed = Date.now() }) {
  const dataCriacao = r.dataCriacao ?? new Date().toISOString()
  let numeroRelatorio = r.numeroRelatorio
  if (!numeroRelatorio) {
    const ano = new Date(dataCriacao).getFullYear()
    const tipoManut = manutencoes.find(m => m.id === r.manutencaoId)?.tipo ?? 'periodica'
    const prefix = tipoManut === 'montagem' ? 'MT' : 'MP'
    numeroRelatorio = proximoNumeroFn(relatorios, { ano, prefix })
  }
  return {
    novo: {
      ...r,
      id: `r${idSeed}`,
      dataCriacao,
      numeroRelatorio,
      assinadoPeloCliente: r.assinadoPeloCliente ?? false,
    },
    numeroRelatorio,
  }
}
