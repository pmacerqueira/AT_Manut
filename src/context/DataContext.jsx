/**
 * DataContext – Estado global da aplicação.
 * Os dados são carregados da API (MySQL no cPanel) e sincronizados em tempo real.
 * Suporta modo offline: cache local (localStorage) + fila de sincronização.
 * Estrutura: clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios.
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { minDataManutencaoAberta } from '../utils/proximaManutAgenda'
import {
  buildDiasOcupadosFromManutencoes,
  calcLimiteMontagemMs,
  gerarManutencoesPeriodicasFuturas,
  recalcularPeriodicasNoEstado,
  recalcularAgendaMaquinaNoAcc,
} from '../domain/agendaDomain'
import { mergeRelatoriosMantendoEnvio, proximoNumeroRelatorioSequencial } from '../domain/relatorioDomain'
import { resolverIdsRemoverAoEliminarConcluida } from '../domain/manutencaoDomain'
import {
  buildBackupPayload,
  backupFilenameForDate,
  validateBackupDados,
  extractRestoreSlices,
  formatBackupRestoreSuccessMessage,
  runBackupBulkRestore,
} from '../domain/backupDomain'
import { runPersist } from '../domain/persistDomain'
import { createTecnicosHandlers } from './slices/tecnicosSlice'
import { createMarcasHandlers } from './slices/marcasSlice'
import { createClientesHandlers } from './slices/clientesSlice'
import { createCategoriasHandlers } from './slices/categoriasSlice'
import { createMaquinasHandlers } from './slices/maquinasSlice'
import { APP_VERSION } from '../config/version'
import { logger } from '../utils/logger'
import { saveCache, loadCache } from '../services/localCache'
import { enqueue, processQueue, queueSize } from '../services/syncQueue'
import { API_TIMEOUT_BULK_MS } from '../config/limits'
import { normEntityId } from '../utils/frotaReportHelpers'
import { getHojeAzores } from '../utils/datasAzores'

const DataContext = createContext(null)

// ── Domínio partilhado (constantes e funções puras) — src/domain/ ──────────
// O DataContext re-exporta estes símbolos para manter compatíveis os imports
// existentes (`import { TIPOS_DOCUMENTO } from '../context/DataContext'`).
import {
  INTERVALOS,
  getIntervaloDiasForCategoria,
  getIntervaloDiasBySubcategoria as resolveIntervaloDiasBySubcategoria,
  getIntervaloDiasByMaquina as resolveIntervaloDiasByMaquina,
} from '../domain/equipamentoDomain'
import {
  INITIAL_MARCAS,
  mergeMarcasPreferIncoming,
} from '../domain/marcasDomain'

export {
  INTERVALOS,
  SUBCATEGORIAS_COM_CONTADOR_HORAS,
  SUBCATEGORIAS_COMPRESSOR_PARAFUSO,
  PLANO_MANUT_COMPRESSOR_NONE,
  PLANO_MANUT_COMPRESSOR_KAESER_ABCD,
  OPCOES_PLANO_MANUT_COMPRESSOR_PARAFUSO,
  MARCAS_COMPRESSOR,
  MARCAS_ELEVADOR,
  isKaeserMarca,
  isKaeserAbcdMaquina,
  INTERVALOS_KAESER,
  TIPOS_DOCUMENTO,
} from '../domain/equipamentoDomain'

export {
  SEQUENCIA_KAESER,
  KAESER_INTERVALO_HORAS_REF,
  KAESER_ANUAL_MIN_DIAS,
  KAESER_DELTA_H_WARNING_ANUAL,
  tipoKaeserNaPosicao,
  proximaPosicaoKaeser,
  tipoKaeserSugeridoPorHorasServico,
  descricaoCicloKaeser,
} from '../constants/kaeserCiclo.js'

export function DataProvider({ children }) {
  // ── Estado global ──────────────────────────────────────────────────────────
  const [clientes,      setClientes]      = useState([])
  const [categorias,    setCategorias]    = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [checklistItems,setChecklistItems]= useState([])
  const [marcas,        setMarcas]        = useState(INITIAL_MARCAS)
  const [maquinas,      setMaquinas]      = useState([])
  const [manutencoes,   setManutencoes]   = useState([])
  const manutencoesRef = useRef([])
  manutencoesRef.current = manutencoes
  /** Evita cliques repetidos em «Sincronizar agenda completa». */
  const agendaCompletaBusyRef = useRef(false)
  const [relatorios,          setRelatorios]          = useState([])
  const relatoriosRef = useRef([])
  relatoriosRef.current = relatorios
  const [reparacoes,          setReparacoes]          = useState([])
  const [relatoriosReparacao, setRelatoriosReparacao] = useState([])
  const relatoriosReparacaoRef = useRef([])
  relatoriosReparacaoRef.current = relatoriosReparacao
  const [tecnicos,            setTecnicos]            = useState([])
  const [pecasPlano,    setPecasPlano]    = useState([])
  const pecasPlanoRef = useRef([])
  pecasPlanoRef.current = pecasPlano
  const [loading,       setLoading]       = useState(true)

  // ── Estado de conectividade e sincronização ────────────────────────────────
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [syncPending,  setSyncPending]  = useState(() => queueSize())
  const [isSyncing,    setIsSyncing]    = useState(false)

  /** Evita que `focus` dispare fetch completo em cadeia e repor `maquinas` com payload ligeiramente antigo logo após gravar. */
  const lastBulkFetchOkAtRef = useRef(0)

  // ── Fetch inicial e re-fetch ao recuperar o foco da janela ────────────────
  const fetchTodos = useCallback(async (options = {}) => {
    const source = options?.source ?? 'default'
    const force = options?.force === true
    if (source === 'focus' && !force) {
      const elapsed = Date.now() - lastBulkFetchOkAtRef.current
      if (elapsed >= 0 && elapsed < 45_000) {
        logger.info('DataContext', 'fetchTodos', 'Ignorado (throttle pós-fetch / pós-focus)', { elapsedMs: elapsed })
        return
      }
    }
    const { isTokenValid, fetchTodosOsDados } = await import('../services/apiService')
    if (!isTokenValid()) { setLoading(false); return }
    try {
      const d = await fetchTodosOsDados()
      setClientes(d.clientes           ?? [])
      setCategorias(d.categorias       ?? [])
      setSubcategorias(d.subcategorias ?? [])
      setChecklistItems(d.checklistItems ?? [])
      setMarcas(prev => mergeMarcasPreferIncoming(d.marcas ?? [], prev))
      setMaquinas(d.maquinas           ?? [])
      setManutencoes(d.manutencoes             ?? [])
      setRelatorios(prev => mergeRelatoriosMantendoEnvio(prev, d.relatorios ?? []))
      setReparacoes(d.reparacoes               ?? [])
      setRelatoriosReparacao(d.relatoriosReparacao ?? [])
      setTecnicos(d.tecnicos                 ?? [])
      setPecasPlano(Array.isArray(d.pecasPlano) ? d.pecasPlano : [])
      lastBulkFetchOkAtRef.current = Date.now()
      // Guardar snapshot no cache para uso offline
      saveCache(d)
      logger.info('DataContext', 'fetchTodos', 'Dados carregados com sucesso', {
        clientes: (d.clientes ?? []).length,
        maquinas: (d.maquinas ?? []).length,
        manutencoes: (d.manutencoes ?? []).length,
      })
    } catch (err) {
      const isNetErr = !err.status
      if (isNetErr) {
        // Sem ligação — tentar cache local
        const cache = loadCache()
        if (cache?.data) {
          const d = cache.data
          setClientes(d.clientes           ?? [])
          setCategorias(d.categorias       ?? [])
          setSubcategorias(d.subcategorias ?? [])
          setChecklistItems(d.checklistItems ?? [])
          setMarcas(prev => mergeMarcasPreferIncoming(d.marcas ?? [], prev))
          setMaquinas(d.maquinas           ?? [])
          setManutencoes(d.manutencoes             ?? [])
          setRelatorios(prev => mergeRelatoriosMantendoEnvio(prev, d.relatorios ?? []))
          setReparacoes(d.reparacoes               ?? [])
          setRelatoriosReparacao(d.relatoriosReparacao ?? [])
          setTecnicos(d.tecnicos                 ?? [])
          setPecasPlano(Array.isArray(d.pecasPlano) ? d.pecasPlano : [])
          lastBulkFetchOkAtRef.current = Date.now()
          logger.info('DataContext', 'fetchTodos', 'Dados carregados do cache local (offline)', {
            cacheAge: Math.round((Date.now() - cache.ts) / 60000) + ' min',
          })
        } else {
          logger.warn('DataContext', 'fetchTodos', 'Offline e sem cache local — sem dados disponíveis')
        }
      } else {
        logger.error('DataContext', 'fetchTodos', err.message || 'Falha ao carregar dados', { stack: err.stack?.slice(0, 400) })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(() => fetchTodos({ source: 'manual', force: true }), [fetchTodos])

  // ── Processar fila de sync e actualizar dados quando volta online ─────────
  const processSync = useCallback(async () => {
    const { isTokenValid, apiCall } = await import('../services/apiService')
    if (!navigator.onLine || !isTokenValid()) return { processed: 0, failed: 0 }
    setIsSyncing(true)
    try {
      const result = await processQueue((resource, action, opts) => apiCall(resource, action, opts))
      setSyncPending(queueSize())
      if (result.processed > 0) {
        await fetchTodos()
        logger.action('DataContext', 'processSync',
          `${result.processed} operação(ões) sincronizadas com o servidor`, result)
      }
      if (result.failed > 0) {
        logger.warn('DataContext', 'processSync',
          `${result.failed} operação(ões) rejeitadas pelo servidor (removidas da fila)`, result)
      }
      return result
    } catch (err) {
      logger.error('DataContext', 'processSync', err.message || 'Erro ao sincronizar', { stack: err.stack?.slice(0, 300) })
      return { processed: 0, failed: 0 }
    } finally {
      setIsSyncing(false)
    }
  }, [fetchTodos])

  useEffect(() => {
    fetchTodos({ source: 'mount' })
    const handleFocus = () => fetchTodos({ source: 'focus' })
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchTodos])

  // ── Listeners: online/offline + evento de login ───────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      // Ao voltar online: processar fila pendente e refrescar dados
      await processSync()
    }
    const handleOffline = () => setIsOnline(false)
    // Disparado pelo AuthContext após login bem-sucedido
    const handleLogin = async () => {
      await processSync()
      await fetchTodos()
    }
    window.addEventListener('online',    handleOnline)
    window.addEventListener('offline',   handleOffline)
    window.addEventListener('atm:login', handleLogin)
    return () => {
      window.removeEventListener('online',    handleOnline)
      window.removeEventListener('offline',   handleOffline)
      window.removeEventListener('atm:login', handleLogin)
    }
  }, [processSync, fetchTodos])

  const getSubcategoria = useCallback((id) => {
    if (id == null || id === '') return undefined
    const k = String(id)
    return subcategorias.find(s => String(s.id) === k)
  }, [subcategorias])
  const getCategoria = useCallback((id) => {
    if (id == null || id === '') return undefined
    const k = String(id)
    return categorias.find(c => String(c.id) === k)
  }, [categorias])
  const getSubcategoriasByCategoria = useCallback((categoriaId) =>
    subcategorias.filter(s => s.categoriaId === categoriaId).sort((a, b) => a.nome.localeCompare(b.nome)),
  [subcategorias])
  const getChecklistBySubcategoria = useCallback((subcategoriaId, tipo = 'periodica') => {
    const sid = subcategoriaId == null || subcategoriaId === '' ? '' : String(subcategoriaId)
    return checklistItems
      .filter(c => {
        const cid = c.subcategoriaId ?? c.subcategoria_id
        const ckey = cid == null || cid === '' ? '' : String(cid)
        return ckey === sid && (c.tipo || 'periodica') === tipo
      })
      .sort((a, b) => a.ordem - b.ordem)
  }, [checklistItems])

  const getIntervaloDias = useCallback(
    (categoriaId) => getIntervaloDiasForCategoria(categoriaId, categorias, INTERVALOS),
    [categorias],
  )

  const getIntervaloDiasBySubcategoria = useCallback(
    (subcategoriaId) => resolveIntervaloDiasBySubcategoria(subcategoriaId, subcategorias, categorias, INTERVALOS),
    [subcategorias, categorias],
  )

  const getIntervaloDiasByMaquina = useCallback(
    (maquina) => resolveIntervaloDiasByMaquina(maquina, subcategorias, categorias, INTERVALOS),
    [subcategorias, categorias],
  )

  const tecnicosRef = useRef([])
  tecnicosRef.current = tecnicos
  const marcasRef = useRef([])
  marcasRef.current = marcas
  const clientesRef = useRef([])
  clientesRef.current = clientes
  const maquinasRef = useRef([])
  maquinasRef.current = maquinas
  const reparacoesRef = useRef([])
  reparacoesRef.current = reparacoes
  const categoriasRef = useRef([])
  categoriasRef.current = categorias
  const subcategoriasRef = useRef([])
  subcategoriasRef.current = subcategorias
  const checklistItemsRef = useRef([])
  checklistItemsRef.current = checklistItems

  const persist = useCallback(async (apiFn, queueDescriptor, rollback, opts = {}) => {
    return runPersist({
      apiFn,
      queueDescriptor,
      rollback,
      throwOnFailure: opts?.throwOnFailure === true,
      enqueue,
      onQueued: () => setSyncPending(prev => prev + 1),
      onNetworkLost: () => setIsOnline(false),
      log: logger,
    })
  }, [])

  const { getTecnicoByNome, addTecnico, updateTecnico, removeTecnico } = useMemo(
    () => createTecnicosHandlers({
      getTecnicos: () => tecnicosRef.current,
      setTecnicos,
      persist,
      logger,
    }),
    [persist],
  )

  const { addMarca, updateMarca } = useMemo(
    () => createMarcasHandlers({
      getMarcas: () => marcasRef.current,
      setMarcas,
      logger,
    }),
    [],
  )

  const { addCliente, updateCliente, removeCliente, clearAllClientesAndRelated } = useMemo(
    () => createClientesHandlers({
      getClientes: () => clientesRef.current,
      setClientes,
      getMaquinas: () => maquinasRef.current,
      setMaquinas,
      getManutencoes: () => manutencoesRef.current,
      setManutencoes,
      getReparacoes: () => reparacoesRef.current,
      setRelatorios,
      setReparacoes,
      getRelatoriosReparacao: () => relatoriosReparacaoRef.current,
      setRelatoriosReparacao,
      getPecasPlano: () => pecasPlanoRef.current,
      setPecasPlano,
      getCategorias: () => categoriasRef.current,
      getSubcategorias: () => subcategoriasRef.current,
      getChecklistItems: () => checklistItemsRef.current,
      persist,
      logger,
    }),
    [persist],
  )

  const {
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    addCategoria,
    updateCategoria,
    removeCategoria,
  } = useMemo(
    () => createCategoriasHandlers({
      getMaquinas: () => maquinasRef.current,
      getSubcategorias: () => subcategoriasRef.current,
      getChecklistItems: () => checklistItemsRef.current,
      setCategorias,
      setSubcategorias,
      setChecklistItems,
      persist,
    }),
    [persist],
  )

  const {
    addMaquina,
    updateMaquina,
    removeMaquina,
    addDocumentoMaquina,
    removeDocumentoMaquina,
  } = useMemo(
    () => createMaquinasHandlers({
      getManutencoes: () => manutencoesRef.current,
      getReparacoes: () => reparacoesRef.current,
      setMaquinas,
      setManutencoes,
      setRelatorios,
      setReparacoes,
      setRelatoriosReparacao,
      setPecasPlano,
      persist,
      logger,
    }),
    [persist],
  )

  // ── Auto-criar manutenções em falta para máquinas com proximaManut ────────
  const syncManutRef = useRef(false)
  useEffect(() => {
    if (loading || syncManutRef.current) return
    if (maquinas.length === 0) return
    syncManutRef.current = true
    const pendentes = new Set(
      manutencoes
        .filter(m => m.status === 'pendente' || m.status === 'agendada')
        .map(m => m.maquinaId)
    )
    let criadas = 0
    maquinas.forEach(maq => {
      if (!maq.proximaManut || pendentes.has(maq.id)) return
      const id = 'msync' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      const novo = {
        id,
        maquinaId: maq.id,
        data: maq.proximaManut,
        tipo: 'periodica',
        status: 'pendente',
        observacoes: '',
        tecnico: '',
        criadoEm: new Date().toISOString(),
      }
      setManutencoes(prev => [...prev, novo])
      import('../services/apiService').then(({ apiManutencoes }) =>
        persist(() => apiManutencoes.create(novo),
                { resource: 'manutencoes', action: 'create', data: novo })
      ).catch(() => {})
      criadas++
    })
    if (criadas > 0) {
      logger.action('DataContext', 'syncManutencoesFalta',
        `Criadas ${criadas} manutenção(ões) em falta a partir de proximaManut`, { criadas })
    }
  }, [loading, maquinas, manutencoes, persist])

  // ── Subcategorias / Checklist / Categorias (slice: categoriasSlice.js) ───

  // ── Clientes (slice: context/slices/clientesSlice.js) ───────────────────

  // ── Marcas (slice: context/slices/marcasSlice.js) ─────────────────────────

  // ── Técnicos (slice: context/slices/tecnicosSlice.js) ─────────────────────

  // ── Máquinas (slice: context/slices/maquinasSlice.js) ─────────────────────

  /**
   * Após `setManutencoes`, grava na BD `proximaManut` derivada da agenda (microtask → estado já consolidado).
   */
  const scheduleSyncProximaParaMaquinas = useCallback((maquinaIds) => {
    const ids = [...new Set((maquinaIds || []).filter(Boolean))]
    if (ids.length === 0) return
    queueMicrotask(() => {
      const lista = manutencoesRef.current
      for (const mid of ids) {
        const proxima = minDataManutencaoAberta(mid, lista)
        updateMaquina(mid, { proximaManut: proxima })
      }
    })
  }, [updateMaquina])

  /**
   * Actualiza `maquinas.proximaManut` a partir da agenda (com patch extra opcional, ex. ultimaManutencaoData).
   */
  const sincronizarProximaManutComAgenda = useCallback((maquinaId, extraPatch = {}) => {
    if (!maquinaId) return
    queueMicrotask(() => {
      const lista = manutencoesRef.current
      const proxima = minDataManutencaoAberta(maquinaId, lista)
      updateMaquina(maquinaId, { proximaManut: proxima, ...extraPatch })
    })
  }, [updateMaquina])

  // ── Manutenções ───────────────────────────────────────────────────────────
  const addManutencao = useCallback((m) => {
    const id = 'm' + Date.now()
    const novo = { ...m, id, criadoEm: m.criadoEm ?? new Date().toISOString() }
    setManutencoes(prev => [...prev, novo])
    scheduleSyncProximaParaMaquinas([novo.maquinaId])
    logger.action('DataContext', 'addManutencao', `Manutenção agendada (maquinaId: ${m.maquinaId})`, { id, maquinaId: m.maquinaId, data: m.data })
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.create(novo),
              { resource: 'manutencoes', action: 'create', data: novo })
    ).catch(err => {
      logger.error('DataContext', 'addManutencao', 'Falha ao persistir manutenção', { msg: err?.message, id })
    })
    return id
  }, [persist, scheduleSyncProximaParaMaquinas])

  const addManutencoesBatch = useCallback((lista) => {
    if (!lista || lista.length === 0) return 0
    const base = Date.now()
    const novas = lista.map((m, i) => ({
      ...m,
      id: m.id || `mb${base}_${i}`,
      criadoEm: m.criadoEm ?? new Date().toISOString(),
    }))
    setManutencoes(prev => [...prev, ...novas])
    scheduleSyncProximaParaMaquinas(novas.map(n => n.maquinaId))
    logger.action('DataContext', 'addManutencoesBatch', `${novas.length} manutenções criadas em lote`, { count: novas.length })
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.bulkCreate(novas),
              { resource: 'manutencoes', action: 'bulk_create', data: novas })
    ).catch(err => {
      logger.error('DataContext', 'addManutencoesBatch', 'Falha ao persistir batch', { msg: err?.message, count: novas.length })
    })
    return novas.length
  }, [persist, scheduleSyncProximaParaMaquinas])

  const updateManutencao = useCallback((id, data) => {
    let syncIds = []
    setManutencoes(prev => {
      const anterior = prev.find(m => m.id === id)
      const next = prev.map(m => m.id === id ? { ...m, ...data } : m)
      const mids = new Set()
      if (anterior?.maquinaId) mids.add(anterior.maquinaId)
      const alvo = next.find(m => m.id === id)
      if (alvo?.maquinaId) mids.add(alvo.maquinaId)
      syncIds = [...mids]
      return next
    })
    scheduleSyncProximaParaMaquinas(syncIds)
    logger.action('DataContext', 'updateManutencao',
      `Manutenção ${id} actualizada (${data.status ?? 'sem status'})`,
      { id, ...data })
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.update(id, data),
              { resource: 'manutencoes', action: 'update', id, data })
    ).catch(err => {
      logger.error('DataContext', 'updateManutencao', 'Falha ao persistir actualização', { msg: err?.message, id })
    })
  }, [persist, scheduleSyncProximaParaMaquinas])

  const removeManutencao = useCallback((id) => {
    let syncIds = []
    setManutencoes(prev => {
      const { idsRemover, alvo, cascadeFuturas } = resolverIdsRemoverAoEliminarConcluida(prev, id)

      if (cascadeFuturas) {
        logger.action('DataContext', 'removeManutencao',
          `Eliminada manutenção concluída ${id} + ${idsRemover.size - 1} periódicas futuras da máquina ${alvo.maquinaId}`,
          { principal: id, futuras: idsRemover.size - 1 })
        import('../services/apiService').then(({ apiManutencoes }) => {
          ;[...idsRemover].filter(rid => rid !== id).forEach(rid =>
            persist(() => apiManutencoes.remove(rid),
                    { resource: 'manutencoes', action: 'delete', id: rid })
          )
        }).catch(() => {})
      }

      if (alvo?.maquinaId) syncIds = [alvo.maquinaId]
      return prev.filter(m => !idsRemover.has(m.id))
    })
    scheduleSyncProximaParaMaquinas(syncIds)
    const idN = normEntityId(id)
    const relAlvo = relatorios.find(r => normEntityId(r.manutencaoId) === idN)
    setRelatorios(prev => prev.filter(r => normEntityId(r.manutencaoId) !== idN))
    logger.action('DataContext', 'removeManutencao', `Manutenção ${id} eliminada (e relatório associado)`, { id, relatorioId: relAlvo?.id })
    import('../services/apiService').then(({ apiManutencoes, apiRelatorios }) => {
      if (relAlvo?.id) {
        persist(() => apiRelatorios.remove(relAlvo.id),
                { resource: 'relatorios', action: 'delete', id: relAlvo.id })
      }
      persist(() => apiManutencoes.remove(id),
              { resource: 'manutencoes', action: 'delete', id })
    }).catch(err => {
      logger.error('DataContext', 'removeManutencao', 'Falha ao persistir eliminação', { msg: err?.message, id })
    })
  }, [relatorios, persist, scheduleSyncProximaParaMaquinas])

  // ── Relatórios ────────────────────────────────────────────────────────────
  const addRelatorio = useCallback((r) => {
    const id = 'r' + Date.now()
    const dataCriacao = r.dataCriacao ?? new Date().toISOString()

    // Número de relatório gerado client-side para resposta imediata.
    // O servidor aceita o número proposto; a constraint UNIQUE protege contra colisões.
    let numeroRelatorio = r.numeroRelatorio
    if (!numeroRelatorio) {
      const ano = new Date(dataCriacao).getFullYear()
      const tipoManut = manutencoes.find(m => m.id === r.manutencaoId)?.tipo ?? 'periodica'
      const prefix = tipoManut === 'montagem' ? 'MT' : 'MP'
      numeroRelatorio = proximoNumeroRelatorioSequencial(relatorios, { ano, prefix })
    }

    const novo = { ...r, id, dataCriacao, numeroRelatorio, assinadoPeloCliente: r.assinadoPeloCliente ?? false }
    setRelatorios(prev => [...prev, novo])
    logger.action('DataContext', 'addRelatorio',
      `Relatório criado: ${numeroRelatorio}`,
      { id, manutencaoId: r.manutencaoId, assinado: novo.assinadoPeloCliente })
    import('../services/apiService').then(({ apiRelatorios }) =>
      persist(() => apiRelatorios.create(novo),
              { resource: 'relatorios', action: 'create', data: novo })
    ).catch(err => {
      logger.error('DataContext', 'addRelatorio', 'Falha ao persistir relatório', { msg: err?.message, id })
    })
    return { id, numeroRelatorio }
  }, [manutencoes, relatorios, persist])

  const updateRelatorio = useCallback((id, data) => {
    setRelatorios(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    const tipo = data.assinadoPeloCliente ? 'assinatura recolhida' : 'dados actualizados'
    logger.action('DataContext', 'updateRelatorio',
      `Relatório ${id} actualizado (${tipo})`,
      { id, assinado: data.assinadoPeloCliente ?? false })
    import('../services/apiService').then(({ apiRelatorios }) =>
      persist(() => apiRelatorios.update(id, data),
              { resource: 'relatorios', action: 'update', id, data })
    ).catch(err => {
      logger.error('DataContext', 'updateRelatorio', 'Falha ao persistir actualização', { msg: err?.message, id })
    })
  }, [persist])

  /**
   * PASSO 1 — Calcula as datas periódicas, evitando fins de semana e feriados PT/Açores,
   * e detecta conflitos com manutenções já agendadas na mesma data.
   *
   * Não modifica o estado; devolve os registos propostos e a lista de conflitos para
   * revisão pelo utilizador antes de confirmar.
   *
   * @param {object} manutencaoMontagem — { maquinaId, periodicidade, data, tecnico }
   * @returns {{ novas: object[], conflitos: Array<{index:number, data:string, existentes:number}> }}
   */
  const prepararManutencoesPeriodicas = useCallback((manutencaoMontagem) => {
    const { maquinaId, periodicidade, data: dataBase, tecnico } = manutencaoMontagem
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
  }, [manutencoes])

  /**
   * PASSO 2 — Persiste no estado o array de manutenções já preparado (e eventualmente
   * ajustado pelo utilizador na resolução de conflitos).
   *
   * @param {object[]} novas — array devolvido por prepararManutencoesPeriodicas (eventualmente modificado)
   * @returns {number} — número de manutenções criadas
   */
  const confirmarManutencoesPeriodicas = useCallback((novas) => {
    if (!novas?.length) return 0
    setManutencoes(prev => [...prev, ...novas])
    scheduleSyncProximaParaMaquinas(novas.map(n => n.maquinaId))
    logger.action('DataContext', 'confirmarManutencoesPeriodicas',
      `${novas.length} manutenções periódicas confirmadas (pós-montagem)`,
      { count: novas.length, maquinaId: novas[0]?.maquinaId })
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.bulkCreate(novas),
              { resource: 'manutencoes', action: 'bulk_create', data: novas })
    ).catch(err => {
      logger.error('DataContext', 'confirmarManutencoesPeriodicas', 'Falha ao persistir periódicas', { msg: err?.message, count: novas.length })
    })
    return novas.length
  }, [persist, scheduleSyncProximaParaMaquinas])

  const getRelatorioByManutencao = useCallback((manutencaoId) => {
    const nid = normEntityId(manutencaoId)
    return relatorios.find(r => normEntityId(r.manutencaoId) === nid)
  }, [relatorios])

  // ── Reparações ────────────────────────────────────────────────────────────
  const addReparacao = useCallback((rep) => {
    const id = 'rep' + Date.now()
    setReparacoes(prev => [...prev, { ...rep, id }])
    logger.action('DataContext', 'addReparacao', `Reparação criada (maquinaId: ${rep.maquinaId})`, { id, origem: rep.origem })
    import('../services/apiService').then(({ apiReparacoes }) =>
      persist(() => apiReparacoes.create({ ...rep, id }),
              { resource: 'reparacoes', action: 'create', data: { ...rep, id } })
    )
    return id
  }, [persist])

  const updateReparacao = useCallback((id, data) => {
    setReparacoes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    import('../services/apiService').then(({ apiReparacoes }) =>
      persist(() => apiReparacoes.update(id, data),
              { resource: 'reparacoes', action: 'update', id, data })
    )
  }, [persist])

  const removeReparacao = useCallback((id) => {
    setReparacoes(prev => prev.filter(r => r.id !== id))
    setRelatoriosReparacao(prev => prev.filter(r => r.reparacaoId !== id))
    logger.action('DataContext', 'removeReparacao', `Reparação ${id} eliminada (e relatório associado)`, { id })
    import('../services/apiService').then(({ apiReparacoes }) =>
      persist(() => apiReparacoes.remove(id),
              { resource: 'reparacoes', action: 'delete', id })
    )
  }, [persist])

  // ── Relatórios de Reparação ───────────────────────────────────────────────
  const addRelatorioReparacao = useCallback((r) => {
    const id = 'rr' + Date.now()
    const dataCriacao = r.dataCriacao ?? new Date().toISOString()

    // Número client-side para resposta imediata; servidor confirma ou gera alternativo.
    let numeroRelatorio = r.numeroRelatorio
    if (!numeroRelatorio) {
      const ano = new Date().getFullYear()
      numeroRelatorio = proximoNumeroRelatorioSequencial(relatoriosReparacao, { ano, prefix: 'RP' })
    }

    const novo = { ...r, id, dataCriacao, numeroRelatorio, assinadoPeloCliente: r.assinadoPeloCliente ?? false }
    setRelatoriosReparacao(prev => [...prev, novo])
    logger.action('DataContext', 'addRelatorioReparacao',
      `Relatório de reparação criado: ${numeroRelatorio}`,
      { id, reparacaoId: r.reparacaoId, assinado: novo.assinadoPeloCliente })
    import('../services/apiService').then(({ apiRelatoriosReparacao }) =>
      persist(() => apiRelatoriosReparacao.create(novo),
              { resource: 'relatoriosReparacao', action: 'create', data: novo })
    )
    return { id, numeroRelatorio }
  }, [relatoriosReparacao, persist])

  const updateRelatorioReparacao = useCallback((id, data) => {
    setRelatoriosReparacao(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    const tipo = data.assinadoPeloCliente ? 'concluído e assinado' : 'progresso guardado'
    logger.action('DataContext', 'updateRelatorioReparacao',
      `Relatório de reparação ${id} actualizado (${tipo})`,
      { id, assinado: data.assinadoPeloCliente ?? false })
    import('../services/apiService').then(({ apiRelatoriosReparacao }) =>
      persist(() => apiRelatoriosReparacao.update(id, data),
              { resource: 'relatoriosReparacao', action: 'update', id, data })
    )
  }, [persist])

  const getRelatorioByReparacao = useCallback((reparacaoId) => {
    const rid = normEntityId(reparacaoId)
    return relatoriosReparacao.find(r => normEntityId(r.reparacaoId) === rid)
  }, [relatoriosReparacao])

  /**
   * Bloco B — Recalcular manutenções periódicas futuras após execução de uma periódica.
   *
   * Faz tudo atomicamente dentro do setManutencoes:
   *  1. Remove **toda** a cadeia periódica em aberto (pendente/agendada/em_progresso, exceto montagem),
   *     incluindo atrasadas de anos anteriores — evita duplicar com a nova grelha.
   *  2. Gera novas a partir da data de execução real, para 3 anos
   *
   * @returns {number} número de novas manutenções criadas
   */
  const recalcularPeriodicasAposExecucao = useCallback((maquinaId, periodicidade, dataExecucao, tecnico, options = {}) => {
    if (!periodicidade || !INTERVALOS[periodicidade]) return 0

    const hojeStr = getHojeAzores()
    let novaCount = 0

    setManutencoes(prev => {
      const { next, idsRemover, novas, novaCount: n } = recalcularPeriodicasNoEstado(prev, {
        maquinaId,
        periodicidade,
        dataExecucao,
        tecnico,
        hojeStr,
        intervalos: INTERVALOS,
        idSeed: Date.now(),
      })
      novaCount = n

      import('../services/apiService').then(async ({ apiManutencoes }) => {
        try {
          for (const rid of idsRemover) {
            await persist(() => apiManutencoes.remove(rid),
                    { resource: 'manutencoes', action: 'delete', id: rid })
          }
          if (novas.length > 0) {
            await persist(() => apiManutencoes.bulkCreate(novas),
                    { resource: 'manutencoes', action: 'bulk_create', data: novas })
          }
        } catch (err) {
          logger.error('DataContext', 'recalcularPeriodicasAposExecucao', 'Falha ao persistir recálculo', { msg: err?.message, count: novas.length })
        }
      })

      if (novas.length > 0 || idsRemover.length > 0) {
        logger.action('DataContext', 'recalcularPeriodicasAposExecucao',
          `${novas.length} periódicas criadas, ${idsRemover.length} removidas para máquina ${maquinaId}`,
          { maquinaId, periodicidade, dataExecucao, criadas: novas.length, removidas: idsRemover.length })
      }

      return next
    })

    queueMicrotask(() => {
      const lista = manutencoesRef.current
      const proxima = minDataManutencaoAberta(maquinaId, lista)
      const patchMaq = { proximaManut: proxima }
      if (options?.ultimaManutencaoData) {
        patchMaq.ultimaManutencaoData = options.ultimaManutencaoData
      }
      updateMaquina(maquinaId, patchMaq)
    })

    return novaCount
  }, [persist, updateMaquina])

  /**
   * Recarrega dados do servidor e, para cada equipamento com periodicidade conhecida,
   * regenera manutenções periódicas futuras (pendente/agendada, exceto montagem)
   * com base na última execução: **o mais recente** entre `ultimaManutencaoData` na ficha
   * e a data da última manutenção `concluida` na agenda (evita âncora antiga na ficha).
   * Só cria linhas com data **≥ hoje** (Açores); horizonte = max(última exec + 3 anos, hoje + 3 anos).
   * Antes de gerar, remove toda a cadeia periódica em aberto da máquina (incl. atrasos antigos), não só datas posteriores à última execução.
   * Actualiza `proximaManut` em cada ficha quando difere da agenda.
   */
  const sincronizarAgendaCompleta = useCallback(async () => {
    if (agendaCompletaBusyRef.current) {
      return { ok: false, reason: 'busy' }
    }
    const { isTokenValid, fetchTodosOsDados, apiManutencoes } = await import('../services/apiService')
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

      saveCache({
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
  }, [fetchTodos, persist, updateMaquina])

  // ── Peças e consumíveis — plano por máquina (MySQL via API; leitura: todos; escrita: só Admin no servidor) ──
  const addPecaPlano = useCallback((peca) => {
    const id = 'pp' + Date.now()
    const nova = { ...peca, id }
    setPecasPlano(prev => [...prev, nova])
    import('../services/apiService').then(({ apiPecasPlano }) => {
      persist(
        async () => {
          await apiPecasPlano.create(nova)
          const list = await apiPecasPlano.list()
          setPecasPlano(Array.isArray(list) ? list : [])
        },
        { resource: 'pecasPlano', action: 'create', data: nova },
        () => setPecasPlano(prev => prev.filter(p => p.id !== id))
      )
    })
    return id
  }, [persist])

  /** Importação PDF / substituição em lote — grava na BD (Admin). */
  const replacePecasPlanoMaquina = useCallback(async (maquinaId, items) => {
    let snapshot
    setPecasPlano(prev => {
      snapshot = prev
      const rest = prev.filter(p => p.maquinaId !== maquinaId)
      const incoming = (items || []).map((p, i) => ({
        ...p,
        maquinaId,
        id: p.id && String(p.id).trim() !== '' ? p.id : `pp${Date.now()}_${i}`,
      }))
      return [...rest, ...incoming]
    })
    const { apiPecasPlano } = await import('../services/apiService')
    await persist(
      async () => {
        await apiPecasPlano.replaceMaquina(maquinaId, items || [])
        const list = await apiPecasPlano.list({ timeoutMs: API_TIMEOUT_BULK_MS })
        setPecasPlano(Array.isArray(list) ? list : [])
      },
      { resource: 'pecasPlano', action: 'replace_maquina', data: { maquinaId, items: items || [] } },
      () => { if (snapshot) setPecasPlano(snapshot) },
      { throwOnFailure: true }
    )
  }, [persist])

  const updatePecaPlano = useCallback((id, data) => {
    let snapshot
    setPecasPlano(prev => {
      snapshot = prev
      return prev.map(p => p.id === id ? { ...p, ...data } : p)
    })
    import('../services/apiService').then(({ apiPecasPlano }) => {
      persist(
        async () => {
          await apiPecasPlano.update(id, data)
          const list = await apiPecasPlano.list()
          setPecasPlano(Array.isArray(list) ? list : [])
        },
        { resource: 'pecasPlano', action: 'update', id, data },
        () => { if (snapshot) setPecasPlano(snapshot) }
      )
    })
  }, [persist])

  const removePecaPlano = useCallback((id) => {
    let snapshot
    setPecasPlano(prev => {
      snapshot = prev
      return prev.filter(p => p.id !== id)
    })
    import('../services/apiService').then(({ apiPecasPlano }) => {
      persist(
        async () => {
          await apiPecasPlano.remove(id)
          const list = await apiPecasPlano.list()
          setPecasPlano(Array.isArray(list) ? list : [])
        },
        { resource: 'pecasPlano', action: 'delete', id },
        () => { if (snapshot) setPecasPlano(snapshot) }
      )
    })
  }, [persist])

  const removePecasPlanoByMaquina = useCallback((maquinaId) => {
    return replacePecasPlanoMaquina(maquinaId, [])
  }, [replacePecasPlanoMaquina])

  const getPecasPlanoByMaquina = useCallback((maquinaId, tipoManut = null) => {
    const mid = maquinaId != null ? String(maquinaId) : ''
    const filtroTipo = tipoManut === null || tipoManut === ''
    return pecasPlano
      .filter(p => String(p.maquinaId) === mid && (filtroTipo || p.tipoManut === tipoManut))
      .sort((a, b) => (a.posicao ?? '').localeCompare(b.posicao ?? ''))
  }, [pecasPlano])

  // ── Ordens de trabalho — iniciar manutenção ───────────────────────────────────
  const iniciarManutencao = useCallback((id) => {
    const inicioExecucao = new Date().toISOString()
    updateManutencao(id, { status: 'em_progresso', inicioExecucao })
    logger.action('DataContext', 'iniciarManutencao', `Manutenção ${id} iniciada`, { inicioExecucao })
  }, [updateManutencao])

  // ── Backup / Restore ──────────────────────────────────────────────────────────

  /**
   * Exporta todos os dados da aplicação como ficheiro JSON para download.
   * As fotos (base64) estão incluídas — o ficheiro pode ser grande.
   */
  const exportarDados = useCallback(() => {
    const backup = buildBackupPayload({
      appVersion: APP_VERSION,
      exportadoEm: new Date().toISOString(),
      dados: {
        clientes,
        categorias,
        subcategorias,
        checklistItems,
        marcas,
        tecnicos,
        maquinas,
        manutencoes,
        relatorios,
        pecasPlano,
      },
    })
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = backupFilenameForDate()
    a.click()
    URL.revokeObjectURL(url)
  }, [clientes, categorias, subcategorias, checklistItems, marcas, tecnicos, maquinas, manutencoes, relatorios, pecasPlano])

  /**
   * Restaura dados a partir de um objecto de backup.
   * Actualiza o estado React E persiste no servidor via bulk_restore.
   */
  const restaurarDados = useCallback(async (backup) => {
    try {
      const validation = validateBackupDados(backup?.dados)
      if (!validation.ok) return { ok: false, message: validation.message }

      const slices = extractRestoreSlices(backup.dados)

      if (slices.clientes) setClientes(slices.clientes)
      if (slices.categorias) setCategorias(slices.categorias)
      if (slices.subcategorias) setSubcategorias(slices.subcategorias)
      if (slices.checklistItems) setChecklistItems(slices.checklistItems)
      if (slices.marcas) setMarcas(slices.marcas)
      if (slices.tecnicos) setTecnicos(slices.tecnicos)
      if (slices.maquinas) setMaquinas(slices.maquinas)
      if (slices.manutencoes) setManutencoes(slices.manutencoes)
      if (slices.relatorios) setRelatorios(slices.relatorios)
      if (slices.pecasPlano) setPecasPlano(slices.pecasPlano)

      const {
        apiClientes, apiCategorias, apiSubcategorias, apiChecklistItems, apiMarcas, apiTecnicos,
        apiMaquinas, apiManutencoes, apiRelatorios, apiPecasPlano,
      } = await import('../services/apiService')

      await runBackupBulkRestore(backup.dados, {
        apiClientes, apiCategorias, apiSubcategorias, apiChecklistItems, apiMarcas, apiTecnicos,
        apiMaquinas, apiManutencoes, apiRelatorios, apiPecasPlano,
      })

      return { ok: true, message: formatBackupRestoreSuccessMessage(backup.exportadoEm) }
    } catch (err) {
      logger.error('DataContext', 'restaurarDados', `Erro ao restaurar backup: ${err.message}`, { stack: err.stack?.slice(0, 300) })
      return { ok: false, message: `Erro ao restaurar: ${err.message}` }
    }
  }, [])

  const value = useMemo(() => ({
    loading,
    refreshData,
    sincronizarAgendaCompleta,
    isOnline,
    syncPending,
    isSyncing,
    processSync,
    INTERVALOS,
    categorias,
    subcategorias,
    checklistItems,
    marcas,
    clientes,
    maquinas,
    manutencoes,
    relatorios,
    pecasPlano,
    getIntervaloDias,
    getIntervaloDiasBySubcategoria,
    getIntervaloDiasByMaquina,
    getSubcategoria,
    getCategoria,
    getSubcategoriasByCategoria,
    getChecklistBySubcategoria,
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    addCategoria,
    updateCategoria,
    removeCategoria,
    addMarca,
    updateMarca,
    tecnicos,
    getTecnicoByNome,
    addTecnico,
    updateTecnico,
    removeTecnico,
    addCliente,
    updateCliente,
    removeCliente,
    clearAllClientesAndRelated,
    addMaquina,
    updateMaquina,
    removeMaquina,
    addDocumentoMaquina,
    removeDocumentoMaquina,
    addManutencao,
    addManutencoesBatch,
    updateManutencao,
    removeManutencao,
    iniciarManutencao,
    addRelatorio,
    updateRelatorio,
    getRelatorioByManutencao,
    reparacoes,
    relatoriosReparacao,
    addReparacao,
    updateReparacao,
    removeReparacao,
    addRelatorioReparacao,
    updateRelatorioReparacao,
    getRelatorioByReparacao,
    prepararManutencoesPeriodicas,
    confirmarManutencoesPeriodicas,
    recalcularPeriodicasAposExecucao,
    sincronizarProximaManutComAgenda,
    addPecaPlano,
    replacePecasPlanoMaquina,
    updatePecaPlano,
    removePecaPlano,
    removePecasPlanoByMaquina,
    getPecasPlanoByMaquina,
    exportarDados,
    restaurarDados,
  }), [
    INTERVALOS, categorias, subcategorias, checklistItems, marcas, clientes, maquinas, manutencoes, relatorios, reparacoes, relatoriosReparacao, pecasPlano, tecnicos,
    getIntervaloDias, getIntervaloDiasBySubcategoria, getIntervaloDiasByMaquina,
    getSubcategoria, getCategoria, getSubcategoriasByCategoria, getChecklistBySubcategoria,
    addSubcategoria, updateSubcategoria, removeSubcategoria,
    addChecklistItem, updateChecklistItem, removeChecklistItem,
    addCategoria, updateCategoria, removeCategoria, addMarca, updateMarca,
    getTecnicoByNome, addTecnico, updateTecnico, removeTecnico,
    addCliente, updateCliente, removeCliente, clearAllClientesAndRelated,
    addMaquina, updateMaquina, removeMaquina, addDocumentoMaquina, removeDocumentoMaquina,
    addManutencao, addManutencoesBatch, updateManutencao, removeManutencao, iniciarManutencao,
    addRelatorio, updateRelatorio, getRelatorioByManutencao,
    addReparacao, updateReparacao, removeReparacao,
    addRelatorioReparacao, updateRelatorioReparacao, getRelatorioByReparacao,
    prepararManutencoesPeriodicas, confirmarManutencoesPeriodicas, recalcularPeriodicasAposExecucao, sincronizarAgendaCompleta, sincronizarProximaManutComAgenda,
    addPecaPlano, replacePecasPlanoMaquina, updatePecaPlano, removePecaPlano, removePecasPlanoByMaquina, getPecasPlanoByMaquina,
    exportarDados, restaurarDados,
    loading, refreshData,
    isOnline, syncPending, isSyncing, processSync,
  ])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider')
  return ctx
}
