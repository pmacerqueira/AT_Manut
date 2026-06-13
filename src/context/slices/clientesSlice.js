/**
 * clientesSlice — CRUD de clientes + cascata + clear all (extraído do DataContext).
 */
import {
  buildNovoCliente,
  clienteExistsByNif,
  findClienteByNif,
  mergeClienteUpdate,
  removeClienteFromList,
  clienteRecordId,
  collectClienteCascadeIds,
} from '../../domain/clientesDomain'
import { schedulePersistViaApi } from '../../domain/crudPersistDomain'
import { saveCache } from '../../services/localCache'

/**
 * @param {object} deps
 */
export function createClientesHandlers(deps) {
  const {
    getClientes,
    setClientes,
    getMaquinas,
    setMaquinas,
    getManutencoes,
    setManutencoes,
    getReparacoes,
    setRelatorios,
    setReparacoes,
    setRelatoriosReparacao,
    setPecasPlano,
    getCategorias,
    getSubcategorias,
    getChecklistItems,
    persist,
    logger,
  } = deps

  const addCliente = (c) => {
    const nif = String(c.nif).trim()
    if (clienteExistsByNif(getClientes(), nif)) return null
    const novo = buildNovoCliente(c)
    setClientes(prev => [...prev, novo])
    logger.action('DataContext', 'addCliente', `Cliente "${c.nome || '—'}" adicionado`, { nif })
    schedulePersistViaApi(persist, {
      resource: 'clientes',
      runWithApi: api => api.create(novo),
      queueDescriptor: { resource: 'clientes', action: 'create', data: novo },
    })
    return nif
  }

  const updateCliente = (nif, data) => {
    const cli = findClienteByNif(getClientes(), nif)
    setClientes(prev => mergeClienteUpdate(prev, nif, data))
    if (cli) {
      const merged = { ...cli, ...data }
      const recId = clienteRecordId(cli)
      schedulePersistViaApi(persist, {
        resource: 'clientes',
        runWithApi: api => api.update(recId, merged),
        queueDescriptor: { resource: 'clientes', action: 'update', id: recId, data: merged },
      })
    }
  }

  const removeCliente = (nif) => {
    const cli = findClienteByNif(getClientes(), nif)
    logger.action('DataContext', 'removeCliente', `Cliente "${cli?.nome || nif}" eliminado`, { nif })

    const { maqIds, manutIds, repIds } = collectClienteCascadeIds({
      maquinas: getMaquinas(),
      manutencoes: getManutencoes(),
      reparacoes: getReparacoes(),
      nif,
    })

    setClientes(prev => removeClienteFromList(prev, nif))
    setMaquinas(prev => prev.filter(m => m.clienteNif !== nif && m.clienteId !== nif))
    setManutencoes(prev => prev.filter(m => !maqIds.includes(m.maquinaId)))
    setRelatorios(prev => prev.filter(r => !manutIds.includes(r.manutencaoId)))
    setReparacoes(prev => prev.filter(r => !maqIds.includes(r.maquinaId)))
    setRelatoriosReparacao(prev => prev.filter(r => !repIds.includes(r.reparacaoId)))
    setPecasPlano(prev => prev.filter(p => !maqIds.includes(p.maquinaId)))

    if (cli) {
      const recId = clienteRecordId(cli)
      schedulePersistViaApi(persist, {
        resource: 'clientes',
        runWithApi: api => api.remove(recId),
        queueDescriptor: { resource: 'clientes', action: 'delete', id: recId },
      })
    }
  }

  const clearAllClientesAndRelated = async () => {
    setRelatoriosReparacao([])
    setRelatorios([])
    setManutencoes([])
    setReparacoes([])
    setMaquinas([])
    setClientes([])
    setPecasPlano([])
    try {
      const {
        apiRelatoriosReparacao, apiRelatorios, apiManutencoes, apiReparacoes, apiMaquinas, apiClientes,
      } = await import('../../services/apiService')
      await apiRelatoriosReparacao.bulkRestore([])
      await apiRelatorios.bulkRestore([])
      await apiManutencoes.bulkRestore([])
      await apiReparacoes.bulkRestore([])
      await apiMaquinas.bulkRestore([])
      await apiClientes.bulkRestore([])
      saveCache({
        clientes: [],
        categorias: getCategorias(),
        subcategorias: getSubcategorias(),
        checklistItems: getChecklistItems(),
        maquinas: [],
        manutencoes: [],
        relatorios: [],
        reparacoes: [],
        relatoriosReparacao: [],
      })
      logger.action('DataContext', 'clearAllClientesAndRelated', 'Todos os clientes e dados relacionados eliminados')
    } catch (err) {
      logger.error('DataContext', 'clearAllClientesAndRelated', err.message, { stack: err.stack?.slice(0, 400) })
      throw err
    }
  }

  return { addCliente, updateCliente, removeCliente, clearAllClientesAndRelated }
}
