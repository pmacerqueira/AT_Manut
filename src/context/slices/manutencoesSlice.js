/**
 * manutencoesSlice — CRUD manutenções, relatórios de manutenção e agenda periódica.
 */
import {
  buildNovaManutencao,
  buildManutencoesBatch,
  mergeManutencaoUpdate,
  findRelatorioByManutencaoId,
  buildNovoRelatorioManutencao,
} from '../../domain/manutencoesDomain'
import {
  buildDiasOcupadosFromManutencoes,
  calcLimiteMontagemMs,
  gerarManutencoesPeriodicasFuturas,
  recalcularPeriodicasNoEstado,
  recalcularAgendaMaquinaNoAcc,
} from '../../domain/agendaDomain'
import { mergeRelatoriosMantendoEnvio, proximoNumeroRelatorioSequencial } from '../../domain/relatorioDomain'
import { resolverIdsRemoverAoEliminarConcluida } from '../../domain/manutencaoDomain'
import { minDataManutencaoAberta } from '../../utils/proximaManutAgenda'
import { normEntityId } from '../../utils/frotaReportHelpers'
import { getHojeAzores } from '../../utils/datasAzores'
import { mergeMarcasPreferIncoming } from '../../domain/marcasDomain'
import { saveCache } from '../../services/localCache'

export function createManutencoesHandlers(deps) {
  const {
    getManutencoes,
    getManutencoesRef,
    getRelatorios,
    setManutencoes,
    setRelatorios,
    setClientes,
    setCategorias,
    setSubcategorias,
    setChecklistItems,
    setMarcas,
    setMaquinas,
    setReparacoes,
    setRelatoriosReparacao,
    setTecnicos,
    setPecasPlano,
    persist,
    logger,
    scheduleSyncProximaParaMaquinas,
    updateMaquina,
    fetchTodos,
    agendaCompletaBusyRef,
    lastBulkFetchOkAtRef,
    INTERVALOS,
  } = deps

  const addManutencao = (m) => {
    const idSeed = Date.now()
    const novo = buildNovaManutencao(m, idSeed)
    setManutencoes(prev => [...prev, novo])
    scheduleSyncProximaParaMaquinas([novo.maquinaId])
    logger.action('DataContext', 'addManutencao', `Manutenção agendada (maquinaId: ${m.maquinaId})`, { id: novo.id, maquinaId: m.maquinaId, data: m.data })
    import('../../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.create(novo),
        { resource: 'manutencoes', action: 'create', data: novo }),
    ).catch(err => {
      logger.error('DataContext', 'addManutencao', 'Falha ao persistir manutenção', { msg: err?.message, id: novo.id })
    })
    return novo.id
  }

  const addManutencoesBatch = (lista) => {
    if (!lista || lista.length === 0) return 0
    const novas = buildManutencoesBatch(lista)
    setManutencoes(prev => [...prev, ...novas])
    scheduleSyncProximaParaMaquinas(novas.map(n => n.maquinaId))
    logger.action('DataContext', 'addManutencoesBatch', `${novas.length} manutenções criadas em lote`, { count: novas.length })
    import('../../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.bulkCreate(novas),
        { resource: 'manutencoes', action: 'bulk_create', data: novas }),
    ).catch(err => {
      logger.error('DataContext', 'addManutencoesBatch', 'Falha ao persistir batch', { msg: err?.message, count: novas.length })
    })
    return novas.length
  }

  const updateManutencao = (id, data) => {
    let syncIds = []
    setManutencoes(prev => {
      const { next, syncIds: mids } = mergeManutencaoUpdate(prev, id, data)
      syncIds = mids
      return next
    })
    scheduleSyncProximaParaMaquinas(syncIds)
    logger.action('DataContext', 'updateManutencao',
      `Manutenção ${id} actualizada (${data.status ?? 'sem status'})`,
      { id, ...data })
    return persist(
      async () => {
        const { apiManutencoes } = await import('../../services/apiService')
        await apiManutencoes.update(id, data)
      },
      { resource: 'manutencoes', action: 'update', id, data },
    )
  }

  const removeManutencao = (id) => {
    let syncIds = []
    const relAlvo = findRelatorioByManutencaoId(getRelatorios(), id, normEntityId)
    setManutencoes(prev => {
      const { idsRemover, alvo, cascadeFuturas } = resolverIdsRemoverAoEliminarConcluida(prev, id)

      if (cascadeFuturas) {
        logger.action('DataContext', 'removeManutencao',
          `Eliminada manutenção concluída ${id} + ${idsRemover.size - 1} periódicas futuras da máquina ${alvo.maquinaId}`,
          { principal: id, futuras: idsRemover.size - 1 })
        import('../../services/apiService').then(({ apiManutencoes }) => {
          ;[...idsRemover].filter(rid => rid !== id).forEach(rid =>
            persist(() => apiManutencoes.remove(rid),
              { resource: 'manutencoes', action: 'delete', id: rid }),
          )
        }).catch(() => {})
      }

      if (alvo?.maquinaId) syncIds = [alvo.maquinaId]
      return prev.filter(m => !idsRemover.has(m.id))
    })
    scheduleSyncProximaParaMaquinas(syncIds)
    const idN = normEntityId(id)
    setRelatorios(prev => prev.filter(r => normEntityId(r.manutencaoId) !== idN))
    logger.action('DataContext', 'removeManutencao', `Manutenção ${id} eliminada (e relatório associado)`, { id, relatorioId: relAlvo?.id })
    import('../../services/apiService').then(({ apiManutencoes, apiRelatorios }) => {
      if (relAlvo?.id) {
        persist(() => apiRelatorios.remove(relAlvo.id),
          { resource: 'relatorios', action: 'delete', id: relAlvo.id })
      }
      persist(() => apiManutencoes.remove(id),
        { resource: 'manutencoes', action: 'delete', id })
    }).catch(err => {
      logger.error('DataContext', 'removeManutencao', 'Falha ao persistir eliminação', { msg: err?.message, id })
    })
  }

  const addRelatorio = (r) => {
    const idSeed = Date.now()
    const manutencoes = getManutencoes()
    const relatorios = getRelatorios()
    const { novo, numeroRelatorio } = buildNovoRelatorioManutencao(r, {
      manutencoes,
      relatorios,
      proximoNumeroFn: proximoNumeroRelatorioSequencial,
      idSeed,
    })
    setRelatorios(prev => [...prev, novo])
    logger.action('DataContext', 'addRelatorio',
      `Relatório criado: ${numeroRelatorio}`,
      { id: novo.id, manutencaoId: r.manutencaoId, assinado: novo.assinadoPeloCliente })
    const envio = persist(
      async () => {
        const { apiRelatorios } = await import('../../services/apiService')
        await apiRelatorios.create(novo)
      },
      { resource: 'relatorios', action: 'create', data: novo },
    )
    return { id: novo.id, numeroRelatorio, envio }
  }

  const updateRelatorio = (id, data) => {
    setRelatorios(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    const tipo = data.assinadoPeloCliente ? 'assinatura recolhida' : 'dados actualizados'
    logger.action('DataContext', 'updateRelatorio',
      `Relatório ${id} actualizado (${tipo})`,
      { id, assinado: data.assinadoPeloCliente ?? false })
    return persist(
      async () => {
        const { apiRelatorios } = await import('../../services/apiService')
        await apiRelatorios.update(id, data)
      },
      { resource: 'relatorios', action: 'update', id, data },
    )
  }

  const prepararManutencoesPeriodicas = (manutencaoMontagem) => {
    const { maquinaId, periodicidade, data: dataBase, tecnico } = manutencaoMontagem
    const manutencoes = getManutencoes()
    const intervaloDias = INTERVALOS[periodicidade]?.dias ?? 365
    const diasOcupados = buildDiasOcupadosFromManutencoes(manutencoes)
    const { novas, conflitos } = gerarManutencoesPeriodicasFuturas({
      dataBaseIso: dataBase,
      periodicidade,
      intervaloDias,
      maquinaId,
      tecnico,
      limiteMs: calcLimiteMontagemMs(dataBase),
      diasOcupados,
      observacoes: 'Agendamento automático pós-montagem.',
      idSeed: Date.now(),
      trackConflitos: true,
      manutencoesForConflitos: manutencoes,
    })
    return { novas, conflitos }
  }

  const confirmarManutencoesPeriodicas = (novas) => {
    if (!novas?.length) return 0
    setManutencoes(prev => [...prev, ...novas])
    scheduleSyncProximaParaMaquinas(novas.map(n => n.maquinaId))
    logger.action('DataContext', 'confirmarManutencoesPeriodicas',
      `${novas.length} manutenções periódicas confirmadas (pós-montagem)`,
      { count: novas.length, maquinaId: novas[0]?.maquinaId })
    const envio = persist(
      async () => {
        const { apiManutencoes } = await import('../../services/apiService')
        await apiManutencoes.bulkCreate(novas)
      },
      { resource: 'manutencoes', action: 'bulk_create', data: novas },
    )
    return { count: novas.length, envio }
  }

  const getRelatorioByManutencao = (manutencaoId) =>
    findRelatorioByManutencaoId(getRelatorios(), manutencaoId, normEntityId)

  const iniciarManutencao = (id) => {
    const inicioExecucao = new Date().toISOString()
    updateManutencao(id, { status: 'em_progresso', inicioExecucao })
    logger.action('DataContext', 'iniciarManutencao', `Manutenção ${id} iniciada`, { inicioExecucao })
  }

  const recalcularPeriodicasAposExecucao = (maquinaId, periodicidade, dataExecucao, tecnico, options = {}) => {
    if (!periodicidade || !INTERVALOS[periodicidade]) return 0

    const hojeStr = getHojeAzores()
    let computed = null
    setManutencoes(prev => {
      computed = recalcularPeriodicasNoEstado(prev, {
        maquinaId,
        periodicidade,
        dataExecucao,
        tecnico,
        hojeStr,
        intervalos: INTERVALOS,
        idSeed: Date.now(),
      })
      return computed.next
    })
    const { idsRemover = [], novas = [], novaCount = 0 } = computed || {}
    const envios = []
    for (const rid of idsRemover) {
      envios.push(persist(
        async () => {
          const { apiManutencoes } = await import('../../services/apiService')
          await apiManutencoes.remove(rid)
        },
        { resource: 'manutencoes', action: 'delete', id: rid },
      ))
    }
    if (novas.length > 0) {
      envios.push(persist(
        async () => {
          const { apiManutencoes } = await import('../../services/apiService')
          await apiManutencoes.bulkCreate(novas)
        },
        { resource: 'manutencoes', action: 'bulk_create', data: novas },
      ))
    }
    if (novas.length > 0 || idsRemover.length > 0) {
      logger.action('DataContext', 'recalcularPeriodicasAposExecucao',
        `${novas.length} periódicas criadas, ${idsRemover.length} removidas para máquina ${maquinaId}`,
        { maquinaId, periodicidade, dataExecucao, criadas: novas.length, removidas: idsRemover.length })
    }

    queueMicrotask(() => {
      const lista = getManutencoesRef()
      const proxima = minDataManutencaoAberta(maquinaId, lista)
      const patchMaq = { proximaManut: proxima }
      if (options?.ultimaManutencaoData) {
        patchMaq.ultimaManutencaoData = options.ultimaManutencaoData
      }
      updateMaquina(maquinaId, patchMaq)
    })

    return { novaCount, envios }
  }

  const sincronizarAgendaCompleta = async () => {
    if (agendaCompletaBusyRef.current) {
      return { ok: false, reason: 'busy' }
    }
    const { isTokenValid, fetchTodosOsDados, apiManutencoes } = await import('../../services/apiService')
    if (!isTokenValid()) return { ok: false, reason: 'auth' }
    if (!navigator.onLine) return { ok: false, reason: 'offline' }

    agendaCompletaBusyRef.current = true
    try {
      const hojeStr = getHojeAzores()
      const d = await fetchTodosOsDados()
      const maqs = d.maquinas ?? []
      const categoriasD = d.categorias ?? []
      const subcategoriasD = d.subcategorias ?? []
      let acc = (d.manutencoes ?? []).map(m => ({ ...m }))

      const sameMid = (m, mid) => normEntityId(m.maquinaId) === normEntityId(mid)
      const idsDeleted = []
      const rowsCreated = []
      let recalculadas = 0

      for (const maq of maqs) {
        const baseId = Date.now() + Math.floor(Math.random() * 1e6)
        const { acc: nextAcc, idsRemover, novas, recalculada } = recalcularAgendaMaquinaNoAcc(acc, {
          maq,
          subcategorias: subcategoriasD,
          categorias: categoriasD,
          hojeStr,
          intervalos: INTERVALOS,
          sameMid,
          idSeed: baseId,
        })
        acc = nextAcc
        if (recalculada) recalculadas += 1
        idsDeleted.push(...idsRemover)
        rowsCreated.push(...novas)
      }

      const uniqueDeletes = [...new Set(idsDeleted)]

      try {
        for (const rid of uniqueDeletes) {
          await persist(
            () => apiManutencoes.remove(rid),
            { resource: 'manutencoes', action: 'delete', id: rid },
            undefined,
            { throwOnFailure: true },
          )
        }
        if (rowsCreated.length > 0) {
          await persist(
            () => apiManutencoes.bulkCreate(rowsCreated),
            { resource: 'manutencoes', action: 'bulk_create', data: rowsCreated },
            undefined,
            { throwOnFailure: true },
          )
        }
      } catch (persistErr) {
        logger.error('DataContext', 'sincronizarAgendaCompleta', persistErr?.message || 'Persistência falhou', {
          stack: persistErr?.stack?.slice(0, 400),
        })
        await fetchTodos({ source: 'manual', force: true })
        return { ok: false, error: persistErr?.message || 'Erro ao guardar na API' }
      }

      setManutencoes(acc)

      const updates = []
      for (const maq of maqs) {
        const proxima = minDataManutencaoAberta(maq.id, acc)
        const oldV = maq.proximaManut ?? null
        const newV = proxima ?? null
        if (String(oldV ?? '') !== String(newV ?? '')) {
          updates.push(updateMaquina(maq.id, { proximaManut: proxima }))
        }
      }
      await Promise.all(updates)

      const maquinasMerged = maqs.map(m => ({
        ...m,
        proximaManut: minDataManutencaoAberta(m.id, acc) ?? m.proximaManut ?? null,
      }))

      setClientes(d.clientes ?? [])
      setCategorias(d.categorias ?? [])
      setSubcategorias(d.subcategorias ?? [])
      setChecklistItems(d.checklistItems ?? [])
      setMarcas(prev => mergeMarcasPreferIncoming(d.marcas ?? [], prev))
      setMaquinas(maquinasMerged)
      setRelatorios(prev => mergeRelatoriosMantendoEnvio(prev, d.relatorios ?? []))
      setReparacoes(d.reparacoes ?? [])
      setRelatoriosReparacao(d.relatoriosReparacao ?? [])
      setTecnicos(d.tecnicos ?? [])
      setPecasPlano(Array.isArray(d.pecasPlano) ? d.pecasPlano : [])

      lastBulkFetchOkAtRef.current = Date.now()

      await saveCache({
        ...d,
        manutencoes: acc,
        maquinas: maquinasMerged,
      })

      logger.action('DataContext', 'sincronizarAgendaCompleta', 'Agenda e fichas sincronizadas', {
        recalculadas,
        removidas: uniqueDeletes.length,
        criadas: rowsCreated.length,
        proximaAtualizadas: updates.length,
      })

      return {
        ok: true,
        recalculadas,
        removidas: uniqueDeletes.length,
        criadas: rowsCreated.length,
        proximaAtualizadas: updates.length,
      }
    } finally {
      agendaCompletaBusyRef.current = false
    }
  }

  return {
    addManutencao,
    addManutencoesBatch,
    updateManutencao,
    removeManutencao,
    addRelatorio,
    updateRelatorio,
    getRelatorioByManutencao,
    prepararManutencoesPeriodicas,
    confirmarManutencoesPeriodicas,
    iniciarManutencao,
    recalcularPeriodicasAposExecucao,
    sincronizarAgendaCompleta,
  }
}
