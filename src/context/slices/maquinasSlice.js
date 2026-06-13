/**
 * maquinasSlice — CRUD equipamentos + documentos (extraído do DataContext).
 */
import { flushSync } from 'react-dom'
import {
  buildNovaMaquina,
  mergeMaquinaInList,
  removeMaquinaFromList,
  collectMaquinaCascadeIds,
  resolveDocumentoInsert,
  resolveDocumentoRemove,
} from '../../domain/maquinasDomain'

export function createMaquinasHandlers(deps) {
  const {
    getManutencoes,
    getReparacoes,
    setMaquinas,
    setManutencoes,
    setRelatorios,
    setReparacoes,
    setRelatoriosReparacao,
    setPecasPlano,
    persist,
    logger,
  } = deps

  const addMaquina = async (m) => {
    const id = String(Date.now())
    const novo = buildNovaMaquina(m, id)
    setMaquinas(prev => [...prev, novo])
    logger.action('DataContext', 'addMaquina', `Equipamento "${m.marca} ${m.modelo || ''}" adicionado`, { id, clienteNif: novo.clienteNif })
    try {
      const { apiMaquinas } = await import('../../services/apiService')
      await persist(
        () => apiMaquinas.create(novo),
        { resource: 'maquinas', action: 'create', data: novo },
        () => setMaquinas(prev => prev.filter(x => String(x.id) !== String(id))),
        { throwOnFailure: true },
      )
    } catch (err) {
      logger.error('DataContext', 'addMaquina', err?.message || 'Falha ao criar equipamento', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
    return id
  }

  const addDocumentoMaquina = async (maquinaId, doc) => {
    let nextMaq = null
    let snapshotDocs = null
    let docId = null
    let replacedUpload = false

    flushSync(() => {
      setMaquinas(prev => {
        const m = prev.find(x => String(x.id) === String(maquinaId))
        if (!m) return prev
        const resolved = resolveDocumentoInsert(m, doc)
        nextMaq = resolved.nextMaq
        snapshotDocs = resolved.snapshotDocs
        docId = resolved.docId
        replacedUpload = resolved.replaced
        return prev.map(mm => (String(mm.id) === String(maquinaId) ? nextMaq : mm))
      })
    })

    if (!nextMaq || snapshotDocs === null) {
      logger.warn('DataContext', 'addDocumentoMaquina', 'Equipamento não encontrado no estado (id)', { maquinaId })
      return { ok: false, docId: null, replaced: false }
    }

    const { apiMaquinas } = await import('../../services/apiService')
    const rollback = () => {
      setMaquinas(prev =>
        prev.map(mm =>
          String(mm.id) === String(maquinaId)
            ? { ...mm, documentos: (snapshotDocs ?? []).map(d => ({ ...d })) }
            : mm,
        ),
      )
    }
    try {
      await persist(
        () => apiMaquinas.update(maquinaId, nextMaq),
        { resource: 'maquinas', action: 'update', id: maquinaId, data: nextMaq },
        rollback,
        { throwOnFailure: true },
      )
      return { ok: true, docId, replaced: replacedUpload }
    } catch (err) {
      logger.error('DataContext', 'addDocumentoMaquina', err?.message || 'Falha ao gravar documento na API', {
        stack: err?.stack?.slice(0, 300),
      })
      return { ok: false, docId: null, replaced: false }
    }
  }

  const removeDocumentoMaquina = async (maquinaId, docId) => {
    let snapshotMaq = null
    let nextMaq = null
    flushSync(() => {
      setMaquinas(prev => {
        const m = prev.find(x => String(x.id) === String(maquinaId))
        if (!m) return prev
        snapshotMaq = m
        nextMaq = resolveDocumentoRemove(m, docId)
        return prev.map(mm => (String(mm.id) === String(maquinaId) ? nextMaq : mm))
      })
    })
    if (!nextMaq || !snapshotMaq) {
      logger.warn('DataContext', 'removeDocumentoMaquina', 'Equipamento ou documento não encontrado', {
        maquinaId,
        docId,
      })
      return { ok: false }
    }
    const { apiMaquinas } = await import('../../services/apiService')
    const rollback = () => {
      setMaquinas(prev => prev.map(mm => (String(mm.id) === String(maquinaId) ? snapshotMaq : mm)))
    }
    try {
      await persist(
        () => apiMaquinas.update(maquinaId, nextMaq),
        { resource: 'maquinas', action: 'update', id: maquinaId, data: nextMaq },
        rollback,
        { throwOnFailure: true },
      )
      return { ok: true }
    } catch (err) {
      logger.error('DataContext', 'removeDocumentoMaquina', err?.message || 'Falha ao remover documento na API', {
        stack: err?.stack?.slice(0, 300),
      })
      return { ok: false }
    }
  }

  const updateMaquina = async (id, data) => {
    let snapshot
    setMaquinas(prev => {
      snapshot = prev
      return mergeMaquinaInList(prev, id, data)
    })
    try {
      const { apiMaquinas } = await import('../../services/apiService')
      let serverRow = null
      await persist(
        async () => {
          serverRow = await apiMaquinas.update(id, data)
        },
        { resource: 'maquinas', action: 'update', id, data },
        () => { if (snapshot) setMaquinas(snapshot) },
        { throwOnFailure: true },
      )
      if (serverRow && typeof serverRow === 'object') {
        setMaquinas(prev => mergeMaquinaInList(prev, id, serverRow))
      }
    } catch (err) {
      logger.error('DataContext', 'updateMaquina', err?.message || 'Falha ao atualizar equipamento', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
  }

  const removeMaquina = (id) => {
    const { maqManutIds, maqRepIds } = collectMaquinaCascadeIds({
      manutencoes: getManutencoes(),
      reparacoes: getReparacoes(),
      maquinaId: id,
    })
    setMaquinas(prev => removeMaquinaFromList(prev, id))
    setManutencoes(prev => prev.filter(m => m.maquinaId !== id))
    setRelatorios(prev => prev.filter(r => !maqManutIds.includes(r.manutencaoId)))
    setReparacoes(prev => prev.filter(r => r.maquinaId !== id))
    setRelatoriosReparacao(prev => prev.filter(r => !maqRepIds.includes(r.reparacaoId)))
    setPecasPlano(prev => prev.filter(p => p.maquinaId !== id))
    logger.action('DataContext', 'removeMaquina', `Máquina ${id} eliminada (cascata: ${maqManutIds.length} manut, ${maqRepIds.length} rep)`, { id })
    import('../../services/apiService').then(({ apiMaquinas }) =>
      persist(() => apiMaquinas.remove(id),
        { resource: 'maquinas', action: 'delete', id }),
    )
  }

  return {
    addMaquina,
    updateMaquina,
    removeMaquina,
    addDocumentoMaquina,
    removeDocumentoMaquina,
  }
}
