/**
 * reparacoesSlice — CRUD reparações e relatórios de reparação.
 */
import {
  buildNovaReparacao,
  mergeReparacaoUpdate,
  removeReparacaoFromList,
  removeRelatoriosReparacaoByReparacaoId,
  findRelatorioByReparacaoId,
  buildNovoRelatorioReparacao,
} from '../../domain/reparacoesDomain'
import { proximoNumeroRelatorioSequencial } from '../../domain/relatorioDomain'
import { normEntityId } from '../../utils/frotaReportHelpers'

export function createReparacoesHandlers(deps) {
  const {
    getRelatoriosReparacao,
    setReparacoes,
    setRelatoriosReparacao,
    persist,
    logger,
  } = deps

  const addReparacao = (rep) => {
    const idSeed = Date.now()
    const novo = buildNovaReparacao(rep, idSeed)
    setReparacoes(prev => [...prev, novo])
    logger.action('DataContext', 'addReparacao', `Reparação criada (maquinaId: ${rep.maquinaId})`, { id: novo.id, origem: rep.origem })
    import('../../services/apiService').then(({ apiReparacoes }) =>
      persist(() => apiReparacoes.create(novo),
        { resource: 'reparacoes', action: 'create', data: novo }),
    )
    return novo.id
  }

  const updateReparacao = (id, data) => {
    setReparacoes(prev => mergeReparacaoUpdate(prev, id, data))
    import('../../services/apiService').then(({ apiReparacoes }) =>
      persist(() => apiReparacoes.update(id, data),
        { resource: 'reparacoes', action: 'update', id, data }),
    )
  }

  const removeReparacao = (id) => {
    setReparacoes(prev => removeReparacaoFromList(prev, id))
    setRelatoriosReparacao(prev => prev.filter(r => r.reparacaoId !== id))
    logger.action('DataContext', 'removeReparacao', `Reparação ${id} eliminada (e relatório associado)`, { id })
    import('../../services/apiService').then(({ apiReparacoes }) =>
      persist(() => apiReparacoes.remove(id),
        { resource: 'reparacoes', action: 'delete', id }),
    )
  }

  const addRelatorioReparacao = (r) => {
    const idSeed = Date.now()
    const relatoriosReparacao = getRelatoriosReparacao()
    const { novo, numeroRelatorio } = buildNovoRelatorioReparacao(r, {
      relatoriosReparacao,
      proximoNumeroFn: proximoNumeroRelatorioSequencial,
      idSeed,
    })
    setRelatoriosReparacao(prev => [...prev, novo])
    logger.action('DataContext', 'addRelatorioReparacao',
      `Relatório de reparação criado: ${numeroRelatorio}`,
      { id: novo.id, reparacaoId: r.reparacaoId, assinado: novo.assinadoPeloCliente })
    import('../../services/apiService').then(({ apiRelatoriosReparacao }) =>
      persist(() => apiRelatoriosReparacao.create(novo),
        { resource: 'relatoriosReparacao', action: 'create', data: novo }),
    )
    return { id: novo.id, numeroRelatorio }
  }

  const updateRelatorioReparacao = (id, data) => {
    setRelatoriosReparacao(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    const tipo = data.assinadoPeloCliente ? 'concluído e assinado' : 'progresso guardado'
    logger.action('DataContext', 'updateRelatorioReparacao',
      `Relatório de reparação ${id} actualizado (${tipo})`,
      { id, assinado: data.assinadoPeloCliente ?? false })
    import('../../services/apiService').then(({ apiRelatoriosReparacao }) =>
      persist(() => apiRelatoriosReparacao.update(id, data),
        { resource: 'relatoriosReparacao', action: 'update', id, data }),
    )
  }

  const getRelatorioByReparacao = (reparacaoId) =>
    findRelatorioByReparacaoId(getRelatoriosReparacao(), reparacaoId, normEntityId)

  return {
    addReparacao,
    updateReparacao,
    removeReparacao,
    addRelatorioReparacao,
    updateRelatorioReparacao,
    getRelatorioByReparacao,
  }
}
