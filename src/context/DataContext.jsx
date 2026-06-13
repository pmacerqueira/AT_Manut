/**
 * DataContext – Estado global da aplicação.
 * Os dados são carregados da API (MySQL no cPanel) e sincronizados em tempo real.
 * Suporta modo offline: cache local (localStorage) + fila de sincronização.
 * Estrutura: clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios.
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { minDataManutencaoAberta } from '../utils/proximaManutAgenda'
import { mergeRelatoriosMantendoEnvio } from '../domain/relatorioDomain'
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
import { createManutencoesHandlers } from './slices/manutencoesSlice'
import { createReparacoesHandlers } from './slices/reparacoesSlice'
import { APP_VERSION } from '../config/version'
import { logger } from '../utils/logger'
import { saveCache, loadCache } from '../services/localCache'
import { enqueue, processQueue, queueSize } from '../services/syncQueue'
import { API_TIMEOUT_BULK_MS } from '../config/limits'

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

  // ── Manutenções + relatórios (slice: manutencoesSlice.js) ───────────────
  const {
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
  } = useMemo(
    () => createManutencoesHandlers({
      getManutencoes: () => manutencoesRef.current,
      getManutencoesRef: () => manutencoesRef.current,
      getRelatorios: () => relatoriosRef.current,
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
    }),
    [persist, scheduleSyncProximaParaMaquinas, updateMaquina, fetchTodos],
  )

  // ── Reparações + relatórios (slice: reparacoesSlice.js) ─────────────────
  const {
    addReparacao,
    updateReparacao,
    removeReparacao,
    addRelatorioReparacao,
    updateRelatorioReparacao,
    getRelatorioByReparacao,
  } = useMemo(
    () => createReparacoesHandlers({
      getRelatoriosReparacao: () => relatoriosReparacaoRef.current,
      setReparacoes,
      setRelatoriosReparacao,
      persist,
      logger,
    }),
    [persist],
  )

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
