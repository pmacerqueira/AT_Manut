/**
 * reparacoesDomain — entidade reparação (regras puras).
 */

export function buildNovaReparacao(rep, idSeed = Date.now()) {
  return { ...rep, id: `rep${idSeed}` }
}

export function mergeReparacaoUpdate(reparacoes, id, data) {
  return reparacoes.map(r => (r.id === id ? { ...r, ...data } : r))
}

export function removeReparacaoFromList(reparacoes, id) {
  return reparacoes.filter(r => r.id !== id)
}

export function removeRelatoriosReparacaoByReparacaoId(relatoriosReparacao, reparacaoId, normFn) {
  const rid = normFn(reparacaoId)
  return relatoriosReparacao.filter(r => normFn(r.reparacaoId) !== rid)
}

export function findRelatorioByReparacaoId(relatoriosReparacao, reparacaoId, normFn) {
  const rid = normFn(reparacaoId)
  return relatoriosReparacao.find(r => normFn(r.reparacaoId) === rid)
}

export function buildNovoRelatorioReparacao(r, { relatoriosReparacao, proximoNumeroFn, idSeed = Date.now() }) {
  const dataCriacao = r.dataCriacao ?? new Date().toISOString()
  let numeroRelatorio = r.numeroRelatorio
  if (!numeroRelatorio) {
    const ano = new Date().getFullYear()
    numeroRelatorio = proximoNumeroFn(relatoriosReparacao, { ano, prefix: 'RP' })
  }
  return {
    novo: {
      ...r,
      id: `rr${idSeed}`,
      dataCriacao,
      numeroRelatorio,
      assinadoPeloCliente: r.assinadoPeloCliente ?? false,
    },
    numeroRelatorio,
  }
}
