/**
 * DataContext – Estado global da aplicação.
 * Os dados são carregados da API (MySQL no cPanel) e sincronizados em tempo real.
 * Suporta modo offline: cache local (localStorage) + fila de sincronização.
 * Estrutura: clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios.
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
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
import { schedulePersistViaApi } from '../domain/crudPersistDomain'
import { createTecnicosHandlers } from './slices/tecnicosSlice'
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
  normalizeMarca,
  mergeMarcasPreferIncoming,
  shouldRetryMarcaCreateWithId,
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
  const [reparacoes,          setReparacoes]          = useState([])
  const [relatoriosReparacao, setRelatoriosReparacao] = useState([])
  const [tecnicos,            setTecnicos]            = useState([])
  const [pecasPlano,    setPecasPlano]    = useState([])
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

  // ── Subcategorias ─────────────────────────────────────────────────────────
  const addSubcategoria = useCallback((s) => {
    if (!s.nome?.trim()) return null
    const id = 'sub' + Date.now()
    const novo = { ...s, id }
    setSubcategorias(prev => [...prev, novo])
    schedulePersistViaApi(persist, {
      resource: 'subcategorias',
      runWithApi: api => api.create(novo),
      queueDescriptor: { resource: 'subcategorias', action: 'create', data: novo },
    })
    return id
  }, [persist])

  const updateSubcategoria = useCallback((id, data) => {
    setSubcategorias(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    schedulePersistViaApi(persist, {
      resource: 'subcategorias',
      runWithApi: api => api.update(id, data),
      queueDescriptor: { resource: 'subcategorias', action: 'update', id, data },
    })
  }, [persist])

  const removeSubcategoria = useCallback((id) => {
    if (maquinas.some(m => m.subcategoriaId === id)) return false
    const idsCheck = checklistItems.filter(c => c.subcategoriaId === id).map(c => c.id)
    setSubcategorias(prev => prev.filter(s => s.id !== id))
    setChecklistItems(prev => prev.filter(c => c.subcategoriaId !== id))
    import('../services/apiService').then(({ apiSubcategorias, apiChecklistItems }) => {
      idsCheck.forEach(cid =>
        persist(() => apiChecklistItems.remove(cid),
                { resource: 'checklistItems', action: 'delete', id: cid })
      )
      persist(() => apiSubcategorias.remove(id),
              { resource: 'subcategorias', action: 'delete', id })
    })
    return true
  }, [maquinas, checklistItems, persist])

  // ── Checklist ─────────────────────────────────────────────────────────────
  const addChecklistItem = useCallback((item) => {
    const id = 'ch' + Date.now()
    const novo = { ...item, id }
    setChecklistItems(prev => [...prev, novo])
    import('../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.create(novo),
              { resource: 'checklistItems', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const updateChecklistItem = useCallback((id, data) => {
    setChecklistItems(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    import('../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.update(id, data),
              { resource: 'checklistItems', action: 'update', id, data })
    )
  }, [persist])

  const removeChecklistItem = useCallback((id) => {
    setChecklistItems(prev => prev.filter(c => c.id !== id))
    import('../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.remove(id),
              { resource: 'checklistItems', action: 'delete', id })
    )
  }, [persist])

  // ── Clientes ──────────────────────────────────────────────────────────────
  const addCliente = useCallback((c) => {
    const nif = String(c.nif).trim()
    if (clientes.some(cli => cli.nif === nif)) return null
    const id = 'cli' + Date.now()
    const novo = { ...c, id, nif }
    setClientes(prev => [...prev, novo])
    logger.action('DataContext', 'addCliente', `Cliente "${c.nome || '—'}" adicionado`, { nif })
    import('../services/apiService').then(({ apiClientes }) =>
      persist(() => apiClientes.create(novo),
              { resource: 'clientes', action: 'create', data: novo })
    )
    return nif
  }, [clientes, persist])

  const updateCliente = useCallback((nif, data) => {
    setClientes(prev => prev.map(c => c.nif === nif ? { ...c, ...data } : c))
    const cli = clientes.find(c => c.nif === nif)
    if (cli) {
      const merged = { ...cli, ...data }
      const recId  = cli.id ?? nif
      import('../services/apiService').then(({ apiClientes }) =>
        persist(() => apiClientes.update(recId, merged),
                { resource: 'clientes', action: 'update', id: recId, data: merged })
      )
    }
  }, [clientes, persist])

  const removeCliente = useCallback((nif) => {
    const cli = clientes.find(c => c.nif === nif)
    logger.action('DataContext', 'removeCliente', `Cliente "${cli?.nome || nif}" eliminado`, { nif })
    const maqIds   = maquinas.filter(m => m.clienteNif === nif || m.clienteId === nif).map(m => m.id)
    const manutIds = manutencoes.filter(m => maqIds.includes(m.maquinaId)).map(m => m.id)
    const repIds   = reparacoes.filter(r => maqIds.includes(r.maquinaId)).map(r => r.id)
    setClientes(prev => prev.filter(c => c.nif !== nif))
    setMaquinas(prev => prev.filter(m => m.clienteNif !== nif && m.clienteId !== nif))
    setManutencoes(prev => prev.filter(m => !maqIds.includes(m.maquinaId)))
    setRelatorios(prev => prev.filter(r => !manutIds.includes(r.manutencaoId)))
    setReparacoes(prev => prev.filter(r => !maqIds.includes(r.maquinaId)))
    setRelatoriosReparacao(prev => prev.filter(r => !repIds.includes(r.reparacaoId)))
    setPecasPlano(prev => prev.filter(p => !maqIds.includes(p.maquinaId)))
    if (cli) {
      const recId = cli.id ?? nif
      import('../services/apiService').then(({ apiClientes }) =>
        persist(() => apiClientes.remove(recId),
                { resource: 'clientes', action: 'delete', id: recId })
      )
    }
  }, [clientes, maquinas, manutencoes, reparacoes, persist])

  /**
   * Elimina todos os clientes e dados relacionados (máquinas, manutenções, relatórios, reparações).
   * Usa bulk_restore com arrays vazios. Apenas Admin.
   */
  const clearAllClientesAndRelated = useCallback(async () => {
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
      } = await import('../services/apiService')
      await apiRelatoriosReparacao.bulkRestore([])
      await apiRelatorios.bulkRestore([])
      await apiManutencoes.bulkRestore([])
      await apiReparacoes.bulkRestore([])
      await apiMaquinas.bulkRestore([])
      await apiClientes.bulkRestore([])
      saveCache({
        clientes: [], categorias, subcategorias, checklistItems,
        maquinas: [], manutencoes: [], relatorios: [],
        reparacoes: [], relatoriosReparacao: [],
      })
      logger.action('DataContext', 'clearAllClientesAndRelated', 'Todos os clientes e dados relacionados eliminados')
    } catch (err) {
      logger.error('DataContext', 'clearAllClientesAndRelated', err.message, { stack: err.stack?.slice(0, 400) })
      throw err
    }
  }, [categorias, subcategorias, checklistItems])

  // ── Categorias ────────────────────────────────────────────────────────────
  const addCategoria = useCallback((c) => {
    if (!c.nome?.trim()) return null
    const id = 'cat' + Date.now()
    const novo = { ...c, id }
    setCategorias(prev => [...prev, novo])
    import('../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.create(novo),
              { resource: 'categorias', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const updateCategoria = useCallback((id, data) => {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    import('../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.update(id, data),
              { resource: 'categorias', action: 'update', id, data })
    )
  }, [persist])

  const removeCategoria = useCallback((id) => {
    if (subcategorias.some(s => s.categoriaId === id)) return false
    setCategorias(prev => prev.filter(c => c.id !== id))
    import('../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.remove(id),
              { resource: 'categorias', action: 'delete', id })
    )
    return true
  }, [subcategorias, persist])

  // ── Marcas ───────────────────────────────────────────────────────────────
  const addMarca = useCallback(async (m) => {
    const nome = (m?.nome ?? '').trim()
    if (!nome) return null

    const existing = marcas.find(x => (x.nome ?? '').trim().toLowerCase() === nome.toLowerCase())
    if (existing?.id != null) return existing.id

    const tempId = `tmp_mk_${Date.now()}`
    const novo = {
      id: tempId,
      nome,
      logoUrl: (m?.logoUrl ?? '').trim(),
      corHex: (m?.corHex ?? '').trim(),
      ativo: m?.ativo ?? true,
    }

    setMarcas(prev => [...prev, novo].sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt')))

    try {
      const { apiMarcas } = await import('../services/apiService')
      // Não enviar "id" no create: em MySQL é tipicamente AUTO_INCREMENT.
      const payload = { nome: novo.nome, logoUrl: novo.logoUrl, corHex: novo.corHex, ativo: novo.ativo }
      let created
      try {
        created = await apiMarcas.create(payload)
      } catch (err) {
        if (!shouldRetryMarcaCreateWithId(err)) throw err
        // Compatibilidade com esquemas legacy em que "marcas.id" é PK string sem default.
        const retryId = `mk${Date.now()}`
        created = await apiMarcas.create({ ...payload, id: retryId })
      }

      const persisted = normalizeMarca({
        ...novo,
        ...(created || {}),
        id: created?.id ?? created?.ID ?? tempId,
      })

      setMarcas(prev => prev
        .map(x => String(x.id) === String(tempId) ? persisted : x)
        .sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt')))

      return persisted.id
    } catch (err) {
      setMarcas(prev => prev.filter(x => String(x.id) !== String(tempId)))
      logger.error('DataContext', 'addMarca', err?.message || 'Falha ao criar marca', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
  }, [marcas])

  const updateMarca = useCallback(async (id, data) => {
    const before = marcas
    const atual = before.find(m => String(m.id) === String(id))
    const merged = normalizeMarca({ ...(atual || {}), ...(data || {}) })
    setMarcas(prev => prev
      .map(m => String(m.id) === String(id) ? { ...m, ...merged } : m)
      .sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt')))
    try {
      const { apiMarcas } = await import('../services/apiService')
      let targetId = id
      const idStr = String(id ?? '')
      const isLegacyLocalId = !idStr || /^mk\d+$/i.test(idStr) || idStr.startsWith('tmp_mk_')

      if (isLegacyLocalId) {
        const remote = await apiMarcas.list().catch(() => [])
        const remoteByName = (remote || []).find(x =>
          String(x?.nome || '').trim().toLowerCase() === String(merged?.nome || '').trim().toLowerCase(),
        )

        if (remoteByName?.id != null) {
          targetId = remoteByName.id
          await apiMarcas.update(targetId, data)
        } else {
          const payloadCreate = {
            nome: merged.nome || '',
            logoUrl: merged.logoUrl || '',
            corHex: merged.corHex || '',
            ativo: merged.ativo ?? true,
          }
          let created
          try {
            created = await apiMarcas.create(payloadCreate)
          } catch (err) {
            if (!shouldRetryMarcaCreateWithId(err)) throw err
            const retryId = `mk${Date.now()}`
            created = await apiMarcas.create({ ...payloadCreate, id: retryId })
          }
          targetId = created?.id ?? created?.ID ?? id
        }
      } else {
        await apiMarcas.update(id, data)
      }

      if (String(targetId) !== String(id)) {
        setMarcas(prev => prev
          .map(m => String(m.id) === String(id) ? { ...m, id: targetId } : m)
          .sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt')))
      }
    } catch (err) {
      setMarcas(before)
      logger.error('DataContext', 'updateMarca', err?.message || 'Falha ao atualizar marca', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
  }, [marcas])

  // ── Técnicos (slice: context/slices/tecnicosSlice.js) ─────────────────────

  // ── Máquinas ──────────────────────────────────────────────────────────────
  const addMaquina = useCallback(async (m) => {
    const id = String(Date.now())
    const { clienteId, ...rest } = m
    const novo = { ...rest, id, clienteId: m.clienteId ?? m.clienteNif, clienteNif: m.clienteNif ?? clienteId, documentos: m.documentos ?? [] }
    setMaquinas(prev => [...prev, novo])
    logger.action('DataContext', 'addMaquina', `Equipamento "${m.marca} ${m.modelo || ''}" adicionado`, { id, clienteNif: novo.clienteNif })
    try {
      const { apiMaquinas } = await import('../services/apiService')
      await persist(
        () => apiMaquinas.create(novo),
        { resource: 'maquinas', action: 'create', data: novo },
        () => setMaquinas(prev => prev.filter(x => String(x.id) !== String(id))),
        { throwOnFailure: true }
      )
    } catch (err) {
      logger.error('DataContext', 'addMaquina', err?.message || 'Falha ao criar equipamento', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
    return id
  }, [persist])

  const addDocumentoMaquina = useCallback(async (maquinaId, doc) => {
    let nextMaq = null
    let snapshotDocs = null
    let docId = null
    let replacedUpload = false

    flushSync(() => {
      setMaquinas(prev => {
        const m = prev.find(x => String(x.id) === String(maquinaId))
        if (!m) return prev
        snapshotDocs = (m.documentos ?? []).map(d => ({ ...d }))
        const docs = [...(m.documentos ?? [])]
        const sigName = doc.uploadFileName
        const sigSize = doc.uploadFileSize
        const hasSig =
          sigName != null &&
          String(sigName).trim() !== '' &&
          typeof sigSize === 'number' &&
          sigSize >= 0

        if (hasSig) {
          const idx = docs.findIndex(
            d =>
              d.tipo === doc.tipo &&
              d.uploadFileName === sigName &&
              Number(d.uploadFileSize) === Number(sigSize)
          )
          if (idx !== -1) {
            docId = docs[idx].id
            docs[idx] = { ...docs[idx], ...doc, id: docId }
            replacedUpload = true
            nextMaq = { ...m, documentos: docs }
            return prev.map(mm => (String(mm.id) === String(maquinaId) ? nextMaq : mm))
          }
        }

        docId = 'doc' + Date.now()
        nextMaq = { ...m, documentos: [...docs, { ...doc, id: docId }] }
        return prev.map(mm => (String(mm.id) === String(maquinaId) ? nextMaq : mm))
      })
    })

    if (!nextMaq || snapshotDocs === null) {
      logger.warn('DataContext', 'addDocumentoMaquina', 'Equipamento não encontrado no estado (id)', { maquinaId })
      return { ok: false, docId: null, replaced: false }
    }

    const { apiMaquinas } = await import('../services/apiService')
    const rollback = () => {
      setMaquinas(prev =>
        prev.map(mm =>
          String(mm.id) === String(maquinaId)
            ? { ...mm, documentos: (snapshotDocs ?? []).map(d => ({ ...d })) }
            : mm
        )
      )
    }
    try {
      await persist(
        () => apiMaquinas.update(maquinaId, nextMaq),
        { resource: 'maquinas', action: 'update', id: maquinaId, data: nextMaq },
        rollback,
        { throwOnFailure: true }
      )
      return { ok: true, docId, replaced: replacedUpload }
    } catch (err) {
      logger.error('DataContext', 'addDocumentoMaquina', err?.message || 'Falha ao gravar documento na API', {
        stack: err?.stack?.slice(0, 300),
      })
      return { ok: false, docId: null, replaced: false }
    }
  }, [persist])

  const removeDocumentoMaquina = useCallback(async (maquinaId, docId) => {
    let snapshotMaq = null
    let nextMaq = null
    flushSync(() => {
      setMaquinas(prev => {
        const m = prev.find(x => String(x.id) === String(maquinaId))
        if (!m) return prev
        snapshotMaq = m
        nextMaq = {
          ...m,
          documentos: (m.documentos ?? []).filter(d => String(d.id) !== String(docId)),
        }
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
    const { apiMaquinas } = await import('../services/apiService')
    const rollback = () => {
      setMaquinas(prev => prev.map(mm => (String(mm.id) === String(maquinaId) ? snapshotMaq : mm)))
    }
    try {
      await persist(
        () => apiMaquinas.update(maquinaId, nextMaq),
        { resource: 'maquinas', action: 'update', id: maquinaId, data: nextMaq },
        rollback,
        { throwOnFailure: true }
      )
      return { ok: true }
    } catch (err) {
      logger.error('DataContext', 'removeDocumentoMaquina', err?.message || 'Falha ao remover documento na API', {
        stack: err?.stack?.slice(0, 300),
      })
      return { ok: false }
    }
  }, [persist])

  const updateMaquina = useCallback(async (id, data) => {
    let snapshot
    setMaquinas(prev => {
      snapshot = prev
      return prev.map(m => String(m.id) === String(id) ? { ...m, ...data } : m)
    })
    try {
      const { apiMaquinas } = await import('../services/apiService')
      let serverRow = null
      await persist(
        async () => {
          serverRow = await apiMaquinas.update(id, data)
        },
        { resource: 'maquinas', action: 'update', id, data },
        () => { if (snapshot) setMaquinas(snapshot) },
        { throwOnFailure: true }
      )
      if (serverRow && typeof serverRow === 'object') {
        setMaquinas(prev =>
          prev.map(m => (String(m.id) === String(id) ? { ...m, ...serverRow } : m)))
      }
    } catch (err) {
      logger.error('DataContext', 'updateMaquina', err?.message || 'Falha ao atualizar equipamento', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
  }, [persist])

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

  const removeMaquina = useCallback((id) => {
    const maqManutIds = manutencoes.filter(m => m.maquinaId === id).map(m => m.id)
    const maqRepIds = reparacoes.filter(r => r.maquinaId === id).map(r => r.id)
    setMaquinas(prev => prev.filter(m => m.id !== id))
    setManutencoes(prev => prev.filter(m => m.maquinaId !== id))
    setRelatorios(prev => prev.filter(r => !maqManutIds.includes(r.manutencaoId)))
    setReparacoes(prev => prev.filter(r => r.maquinaId !== id))
    setRelatoriosReparacao(prev => prev.filter(r => !maqRepIds.includes(r.reparacaoId)))
    setPecasPlano(prev => prev.filter(p => p.maquinaId !== id))
    logger.action('DataContext', 'removeMaquina', `Máquina ${id} eliminada (cascata: ${maqManutIds.length} manut, ${maqRepIds.length} rep)`, { id })
    import('../services/apiService').then(({ apiMaquinas }) =>
      persist(() => apiMaquinas.remove(id),
              { resource: 'maquinas', action: 'delete', id })
    )
  }, [manutencoes, reparacoes, persist])

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
