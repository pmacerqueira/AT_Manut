/**
 * Manutencoes – Lista de manutenções (em atraso, próximas, executadas).
 * Permite executar manutenção, registar assinatura, ver/exportar relatório.
 * @see DOCUMENTACAO.md §11
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from '../components/Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { SUBCATEGORIAS_COM_CONTADOR_HORAS, isKaeserAbcdMaquina, tipoKaeserNaPosicao } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import RelatorioView from '../components/RelatorioView'
import ExecutarManutencaoModal from '../components/ExecutarManutencaoModal'
import RecolherAssinaturaModal from '../components/RecolherAssinaturaModal'
import BulkExecutarModal from '../components/BulkExecutarModal'
import { Plus, Pencil, Trash2, Lock, FileSignature, FileText, Paperclip, X, Play, FileDown, ArrowLeft, Mail, MailCheck, Undo2, Clock, Archive, CheckSquare, MoreHorizontal, Search, ArrowDownAZ, ArrowUpAZ, CalendarClock } from 'lucide-react'
import { format, addDays, subMonths, startOfYear, isBefore, startOfDay, differenceInCalendarDays } from 'date-fns'
import { getHojeAzores, formatDataHoraCurtaAzores, formatDataAzores, parseDateLocal } from '../utils/datasAzores'
import { getFeriadosAno, isFimDeSemana, isFeriado, computarProximasDatas } from '../utils/diasUteis'
import { pt } from 'date-fns/locale'
import { gerarPdfCompacto } from '../utils/gerarPdfRelatorio'
import { enviarRelatorioEmail } from '../services/emailService'
import { categoriaNomeFromMaquina, declaracaoClienteDepoisFromMaquina } from '../constants/relatorio'
import { logger } from '../utils/logger'
import { parseHorasContadorForm } from '../utils/horasContadorEquipamento'
import { STORAGE } from '../config/storageKeys'
import ContentLoader from '../components/ContentLoader'
import ActionsOverflow from '../components/ActionsOverflow'
import { useDeferredReady } from '../hooks/useDeferredReady'
import { manutencoesCategoriaClass } from '../utils/categoriaVisual'
import './Manutencoes.css'

const statusLabel = { pendente: 'Pendente', agendada: 'Agendada', concluida: 'Executada', em_progresso: 'Em progresso', emAtraso: 'Em atraso', proxima: 'Próxima' }

const SETE_DIAS_MS = 7 * 24 * 3600 * 1000

const getDisplayStatus = (m) => {
  if (m.status === 'concluida')    return 'concluida'
  if (m.status === 'em_progresso') return 'em_progresso'
  const dataManut = startOfDay(parseDateLocal(m.data))
  const hoje = startOfDay(new Date())
  return isBefore(dataManut, hoje) ? 'emAtraso' : 'proxima'
}

/** Dias de atraso: positivo = em atraso, 0 = hoje, negativo = futuro */
const calcDiasAtraso = (dataStr) => {
  const hoje = startOfDay(new Date())
  const d = startOfDay(parseDateLocal(dataStr))
  return differenceInCalendarDays(hoje, d)
}

export default function Manutencoes() {
  const {
    clientes,
    maquinas,
    manutencoes,
    categorias,
    getSubcategoriasByCategoria,
    addManutencao,
    updateManutencao,
    removeManutencao,
    iniciarManutencao,
    updateMaquina,
    addRelatorio,
    updateRelatorio,
    getRelatorioByManutencao,
    getIntervaloDiasByMaquina,
    getSubcategoria,
    getCategoria,
    getChecklistBySubcategoria,
    getTecnicoByNome,
    tecnicos,
    marcas,
  } = useData()
  const { canDelete, canEditManutencao, canDeleteManutencao, isAdmin } = usePermissions()
  const contentReady = useDeferredReady(manutencoes.length >= 0)
  const [modalConfirmDelete, setModalConfirmDelete] = useState(null)
  const [overflowAberto, setOverflowAberto] = useState(null)
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const location = useLocation()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [modalRelatorio, setModalRelatorio] = useState(null)
  const [modalExecucao, setModalExecucao] = useState(null)
  const [modalFotos, setModalFotos] = useState(null) // { fotos: string[] }
  const [modalEmail, setModalEmail] = useState(null) // { manutencao, maquina, rel, sub, cliente }
  /** Admin: marcar relatório como enviado ao cliente sem reenviar email (histórico / semáforo). */
  const [modalMarcarEnvio, setModalMarcarEnvio] = useState(null) // { manutencao, maquina, rel, cliente }
  const [marcarEnvioEmail, setMarcarEnvioEmail] = useState('')
  const [modalRecolherAssinatura, setModalRecolherAssinatura] = useState(null) // { manutencao, maquina }
  const [modalAdminEdit, setModalAdminEdit] = useState(null) // { manutencao, maquina }
  const [emailCheckCliente, setEmailCheckCliente] = useState(false)
  const [emailCheckAdmin, setEmailCheckAdmin]     = useState(true)
  const [emailOutro, setEmailOutro]               = useState('')
  const [emailEnviando, setEmailEnviando]         = useState(false)
  const [form, setForm] = useState({ maquinaId: '', tipo: 'periodica', data: '', tecnico: '', status: 'pendente', observacoes: '', horasServico: '', dataExecucao: '' })
  const [addClienteNif, setAddClienteNif] = useState('')
  const [addCategoriaId, setAddCategoriaId] = useState('')
  const nomesTecnicos = useMemo(() => tecnicos.filter(t => t.ativo !== false).map(t => t.nome), [tecnicos])
  const [avisoData, setAvisoData] = useState('')
  const feriadosSetManut = useMemo(() => {
    const ano = new Date().getFullYear()
    const set = new Set()
    for (let a = ano - 1; a <= ano + 3; a++) getFeriadosAno(a).forEach(f => set.add(f))
    return set
  }, [])
  const validarDataManut = useCallback((dateStr) => {
    if (!dateStr) { setAvisoData(''); return true }
    const d = new Date(dateStr + 'T12:00:00')
    if (isFimDeSemana(d)) {
      const dia = d.getDay() === 0 ? 'Domingo' : 'Sábado'
      setAvisoData(`${dia} — não é dia útil. Escolha um dia de semana.`)
      return false
    }
    if (isFeriado(d, feriadosSetManut)) {
      setAvisoData('Esta data é feriado. Escolha outro dia.')
      return false
    }
    setAvisoData('')
    return true
  }, [feriadosSetManut])
  const [overflowOpen, setOverflowOpen] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [modalBulk, setModalBulk] = useState(null)

  // ── Filtros para executadas ──────────────────────────────────────────────
  const [execPeriodo, setExecPeriodo]       = useState(null) // null | 1 | 3 | 6 | 'ano'
  const [execDataDe, setExecDataDe]         = useState('')
  const [execDataAte, setExecDataAte]       = useState('')
  const [execPesquisa, setExecPesquisa]     = useState('')
  const [execFiltroEmail, setExecFiltroEmail] = useState('todos') // 'todos' | 'enviado' | 'por_enviar'
  /** Ordenação da lista de executadas (e bloco executadas em «ver todas»): data exec. desc → série A→Z → série Z→A. */
  const [execSortEquipamento, setExecSortEquipamento] = useState('data') // 'data' | 'serieAsc' | 'serieDesc'

  const cycleExecSortEquipamento = useCallback(() => {
    setExecSortEquipamento((s) => (s === 'data' ? 'serieAsc' : s === 'serieAsc' ? 'serieDesc' : 'data'))
  }, [])

  useEffect(() => {
    if (!overflowOpen) return
    const close = (e) => {
      if (!e.target.closest('.mc-overflow-wrapper')) setOverflowOpen(null)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [overflowOpen])

  useEffect(() => {
    if (!overflowAberto) return
    const close = (e) => {
      if (!e.target.closest('.actions-overflow')) setOverflowAberto(null)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [overflowAberto])

  const toggleBulkMode = useCallback(() => {
    setBulkMode(v => !v)
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const STORAGE_KEY = STORAGE.MANUTENCOES_FILTER

  const [searchParams, setSearchParams] = useSearchParams()
  const filterRaw = searchParams.get('filter')
  const ALLOWED_FILTERS = ['proximas', 'executadas', 'atraso', 'agendadas', 'concluidas']
  const filterNormalized = filterRaw === 'agendadas' ? 'proximas' : filterRaw === 'concluidas' ? 'executadas' : filterRaw
  const filter = ALLOWED_FILTERS.includes(filterNormalized) ? filterNormalized : null
  const [mostrarTodas, setMostrarTodas] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored).mostrarTodas ?? false : false
    } catch { return false }
  })

  const setMostrarTodasWithStorage = useCallback((v) => {
    setMostrarTodas(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ mostrarTodas: next }))
      } catch {}
      return next
    })
  }, [])

  const getMaquina = (id) => maquinas.find(m => m.id === id)

  useEffect(() => {
    const execId = location.state?.openExecucaoId || searchParams.get('executar')
    if (!execId) return
    if (!manutencoes.length || !maquinas.length) return
    const m = manutencoes.find(x => x.id === execId)
    const maq = m ? maquinas.find(x => x.id === m.maquinaId) : null
    if (m && maq) {
      if (m.status === 'pendente' || m.status === 'agendada') iniciarManutencao(m.id)
      setModalExecucao({ manutencao: { ...m, status: 'em_progresso' }, maquina: maq })
    }
    if (location.state?.openExecucaoId) {
      navigate(location.pathname + location.search, { replace: true, state: {} })
    }
    if (searchParams.get('executar')) {
      const params = new URLSearchParams(searchParams)
      params.delete('executar')
      navigate(location.pathname + (params.toString() ? `?${params}` : ''), { replace: true, state: {} })
    }
  }, [location.state?.openExecucaoId, searchParams, manutencoes, maquinas, navigate, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const editId = searchParams.get('editar')
    if (!editId) return
    if (!manutencoes.length || !maquinas.length) return
    const m = manutencoes.find(x => x.id === editId)
    if (m) openEdit(m)
    const params = new URLSearchParams(searchParams)
    params.delete('editar')
    navigate(location.pathname + (params.toString() ? `?${params}` : ''), { replace: true, state: {} })
  }, [searchParams, manutencoes, maquinas, navigate, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const getCliente = (nif) => clientes.find(c => c.nif === nif)

  const isHistorico = (m) => {
    if (!m.criadoEm) return false
    const dataManut = parseDateLocal(m.data).getTime()
    const dataCriacao = new Date(m.criadoEm).getTime()
    return dataManut < Date.now() && (dataCriacao - dataManut) > SETE_DIAS_MS
  }

  const isPendenteAssinatura = (m) => {
    if (m.status !== 'concluida') return false
    const rel = getRelatorioByManutencao(m.id)
    return rel && !rel.assinadoPeloCliente
  }

  const manutencoesPendentes = useMemo(() =>
    manutencoes.filter(m => m.status === 'pendente' || m.status === 'agendada' || m.status === 'em_progresso'),
  [manutencoes])

  const manutencoesExecutadas = useMemo(() =>
    manutencoes.filter(m => m.status === 'concluida'),
  [manutencoes])


  const temContadorHoras = (subcategoriaId) => SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(subcategoriaId)

  const openAdd = () => {
    const hoje = getHojeAzores()
    setAddClienteNif('')
    setAddCategoriaId('')
    setForm({
      maquinaId: '',
      tipo: 'periodica',
      data: hoje,
      tecnico: '',
      status: 'pendente',
      observacoes: '',
      horasServico: '',
    })
    setAvisoData('')
    setModal('add')
  }

  const openEdit = (m) => {
    const rel = getRelatorioByManutencao(m.id)
    if (isAdmin && rel) {
      setModalAdminEdit({ manutencao: m, maquina: getMaquina(m.maquinaId) })
      return
    }
    // ATecnica: com relatório em rascunho, o formulário "Editar manutenção" não tinha fotos —
    // abrir o mesmo fluxo que "Continuar execução" (Tirar foto / Galeria, checklist, etc.).
    if (!isAdmin && rel && !rel.assinadoPeloCliente) {
      setModalExecucao({ manutencao: m, maquina: getMaquina(m.maquinaId) })
      return
    }
    const dataExec = rel ? (rel.dataAssinatura || rel.dataCriacao || '').slice(0, 10) : ''
    setForm({
      id: m.id,
      maquinaId: m.maquinaId,
      tipo: m.tipo,
      data: m.data,
      tecnico: m.tecnico,
      status: m.status,
      observacoes: m.observacoes || '',
      horasServico: m.horasServico ?? m.horasTotais ?? '',
      dataExecucao: dataExec,
    })
    setModal('edit')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isAdmin && !validarDataManut(form.data)) {
      showToast('A data escolhida não é dia útil. Selecione outro dia.', 'warning')
      return
    }
    const { equipamentoId, maquinaId, ...rest } = form
    const mId = maquinaId ?? equipamentoId
    const payload = { ...rest, maquinaId: mId }
    const maq = getMaquina(mId)
    if (modal === 'edit' && temContadorHoras(maq?.subcategoriaId)) {
      const h = parseHorasContadorForm(form.horasServico)
      if (h != null) {
        payload.horasServico = h
        payload.horasTotais = h
      }
    }
    const updateMaqData = {}
    if (form.status === 'concluida') {
      const dias = getIntervaloDiasByMaquina(maq)
      const proxima = addDays(parseDateLocal(form.data), dias)
      updateMaqData.proximaManut = format(proxima, 'yyyy-MM-dd')
      updateMaqData.ultimaManutencaoData = form.data
      if (temContadorHoras(maq?.subcategoriaId) && form.horasServico !== '') {
        const h = parseHorasContadorForm(form.horasServico)
        if (h != null) {
          updateMaqData.horasServicoAcumuladas = h
          updateMaqData.horasTotaisAcumuladas = h
        }
      }
    }
    if (modal === 'add') {
      addManutencao(payload)
      if (maq && Object.keys(updateMaqData).length > 0) updateMaquina(mId, updateMaqData)
    } else {
      updateManutencao(form.id, payload)
      if (maq && Object.keys(updateMaqData).length > 0) updateMaquina(mId, updateMaqData)
      if (isAdmin && form.status === 'concluida' && form.dataExecucao) {
        const rel = getRelatorioByManutencao(form.id)
        if (rel) {
          const novaDataISO = `${form.dataExecucao}T12:00:00.000Z`
          updateRelatorio(rel.id, {
            dataCriacao: novaDataISO,
            dataAssinatura: rel.assinadoPeloCliente ? novaDataISO : rel.dataAssinatura,
          })
          showToast('Data de execução actualizada com sucesso.', 'success')
        }
      }
    }
    setModal(null)
  }


  // Data de hoje como string estável para dependências de useMemo (só muda uma vez por dia)
  const hojeStr = getHojeAzores()
  const hoje = startOfDay(new Date())

  // ── Listas filtradas e ordenadas (memoizadas) ───────────────────────────
  // Em atraso: data < hoje (não executadas até ontem)
  const manutencoesEmAtraso = useMemo(() =>
    manutencoesPendentes
      .filter(m => isBefore(startOfDay(parseDateLocal(m.data)), hoje))
      .sort((a, b) => parseDateLocal(a.data).getTime() - parseDateLocal(b.data).getTime()),
  [manutencoesPendentes, hojeStr])

  // Próximas: data >= hoje (hoje e dias seguintes)
  const manutencoesProximas = useMemo(() =>
    manutencoesPendentes
      .filter(m => !isBefore(startOfDay(parseDateLocal(m.data)), hoje))
      .sort((a, b) => parseDateLocal(a.data).getTime() - parseDateLocal(b.data).getTime()),
  [manutencoesPendentes, hojeStr])

  const manutencoesExecutadasOrdenadas = useMemo(() =>
    [...manutencoesExecutadas].sort((a, b) => {
      const relA = getRelatorioByManutencao(a.id)
      const relB = getRelatorioByManutencao(b.id)
      const dA = relA?.dataAssinatura || relA?.dataCriacao || a.data
      const dB = relB?.dataAssinatura || relB?.dataCriacao || b.data
      return parseDateLocal(dB).getTime() - parseDateLocal(dA).getTime()
    }),
  [manutencoesExecutadas, getRelatorioByManutencao])

  const execFiltroAtivo = !!(execPeriodo || execDataDe || execDataAte || execPesquisa || execFiltroEmail !== 'todos')

  const executadasFiltradas = useMemo(() => {
    let lista = manutencoesExecutadasOrdenadas

    // 1. Filtro por período rápido OU intervalo de datas
    if (execDataDe || execDataAte) {
      lista = lista.filter(m => {
        const d = m.data
        if (execDataDe && d < execDataDe) return false
        if (execDataAte && d > execDataAte) return false
        return true
      })
    } else if (execPeriodo) {
      const limiteISO = execPeriodo === 'ano'
        ? format(startOfYear(new Date()), 'yyyy-MM-dd')
        : format(subMonths(new Date(), execPeriodo), 'yyyy-MM-dd')
      lista = lista.filter(m => m.data >= limiteISO)
    }

    // 2. Filtro de email ao cliente
    if (execFiltroEmail === 'enviado') {
      lista = lista.filter(m => {
        const rel = getRelatorioByManutencao(m.id)
        return !!rel?.enviadoParaCliente?.email
      })
    } else if (execFiltroEmail === 'por_enviar') {
      lista = lista.filter(m => {
        const rel = getRelatorioByManutencao(m.id)
        return !rel?.enviadoParaCliente?.email
      })
    }

    // 3. Pesquisa por texto
    if (execPesquisa.trim()) {
      const q = execPesquisa.trim().toLowerCase()
      lista = lista.filter(m => {
        const maq = getMaquina(m.maquinaId)
        const cli = getCliente(maq?.clienteNif)
        const rel = getRelatorioByManutencao(m.id)
        const haystack = [
          cli?.nome, maq?.marca, maq?.modelo, maq?.numeroSerie,
          m.tecnico, rel?.tecnico, rel?.numeroRelatorio,
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    return lista
  }, [manutencoesExecutadasOrdenadas, execPeriodo, execDataDe, execDataAte, execPesquisa, execFiltroEmail, getRelatorioByManutencao, maquinas, clientes]) // eslint-disable-line react-hooks/exhaustive-deps

  const executadasFiltradasComSort = useMemo(() => {
    if (execSortEquipamento === 'data') return executadasFiltradas
    const list = [...executadasFiltradas]
    const getSerie = (m) => String(maquinas.find(x => x.id === m.maquinaId)?.numeroSerie ?? '').toLowerCase()
    const getExecTs = (m) => {
      const rel = getRelatorioByManutencao(m.id)
      const d = rel?.dataAssinatura || rel?.dataCriacao || m.data
      const t = parseDateLocal(d).getTime()
      return Number.isFinite(t) ? t : 0
    }
    list.sort((a, b) => {
      const cmp = getSerie(a).localeCompare(getSerie(b), 'pt', { numeric: true, sensitivity: 'base' })
      if (cmp !== 0) return execSortEquipamento === 'serieAsc' ? cmp : -cmp
      return getExecTs(b) - getExecTs(a)
    })
    return list
  }, [executadasFiltradas, execSortEquipamento, maquinas, getRelatorioByManutencao])

  // Ordenação: mais dias em atraso primeiro (diasAtraso desc) → próximas por data asc
  const manutencoesOrdenadas = useMemo(() =>
    [...manutencoesPendentes].sort((a, b) => calcDiasAtraso(b.data) - calcDiasAtraso(a.data)),
  [manutencoesPendentes, hojeStr])

  const EMAIL_ADMIN_MANUT = 'comercial@navel.pt'

  const handleEnviarEmail = async (e) => {
    e.preventDefault()
    if (!modalEmail) return
    const { manutencao: m, maquina: maq, rel, sub, cliente } = modalEmail
    const emailClienteVal = cliente?.email?.trim() ?? ''

    const dests = new Set()
    if (emailCheckCliente && emailClienteVal) dests.add(emailClienteVal.toLowerCase())
    if (emailCheckAdmin) dests.add(EMAIL_ADMIN_MANUT)
    emailOutro.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(s => s).forEach(em => dests.add(em))

    if (dests.size === 0) { showToast('Selecione pelo menos um destinatário.', 'warning'); return }

    setEmailEnviando(true)
    showGlobalLoading()
    try {
      const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m.tipo || 'periodica') : []
      const tecObj = getTecnicoByNome(rel?.tecnico || m?.tecnico)
      const categoriaNome = categoriaNomeFromMaquina(maq, getSubcategoria, getCategoria)
      const declaracaoClienteDepois = declaracaoClienteDepoisFromMaquina(maq, getSubcategoria, getCategoria)

      let sucesso = 0
      for (const dest of dests) {
        const resultado = await enviarRelatorioEmail({
          emailDestinatario: dest,
          relatorio: rel,
          manutencao: m,
          maquina: maq,
          cliente,
          checklistItems,
          subcategoriaNome: sub?.nome || '',
          logoUrl: `${import.meta.env.BASE_URL}NAVEL_LOGO.jpg`,
          tecnicoObj: tecObj,
          marcas,
          categoriaNome,
          declaracaoClienteDepois,
        })
        if (resultado?.ok) sucesso++
        else logger.error('Manutencoes', 'enviarEmail', resultado?.message ?? 'Erro', { dest })
      }
      if (sucesso > 0) {
        const destsArr = [...dests]
        const now = new Date().toISOString()
        const relUpdate = { ultimoEnvio: { data: now, destinatario: destsArr[0] } }
        const clientDests = destsArr.filter(e => e !== EMAIL_ADMIN_MANUT)
        if (clientDests.length > 0) {
          relUpdate.enviadoParaCliente = { data: now, email: clientDests[0] }
        }
        updateRelatorio(rel.id, relUpdate)
        showToast(
          sucesso === dests.size
            ? `Email enviado para ${sucesso} destinatário${sucesso > 1 ? 's' : ''}.`
            : `Enviado para ${sucesso} de ${dests.size} destinatários.`,
          sucesso === dests.size ? 'success' : 'warning'
        )
        setModalEmail(null)
        setEmailOutro('')
      } else {
        showToast('Não foi possível enviar o email. Tente novamente.', 'error', 4000)
      }
    } catch (err) {
      showToast(err?.message || 'Erro ao enviar email.', 'error', 4000)
    } finally {
      setEmailEnviando(false)
      hideGlobalLoading()
    }
  }

  const handleAbrirPdf = async (m, maq, rel, sub, cliente) => {
    showGlobalLoading()
    try {
      const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m.tipo || 'periodica') : []
      const tecObj = getTecnicoByNome(m.tecnico || rel?.tecnico)
      const dataExec = rel?.dataCriacao?.slice(0, 10) || rel?.dataAssinatura?.slice(0, 10) || m?.data || ''
      const periMaq = maq?.periodicidadeManut
      const proximas = (periMaq && dataExec)
        ? computarProximasDatas(dataExec, periMaq, { tecnico: m.tecnico || rel?.tecnico || '' })
        : []
      const categoriaNome = categoriaNomeFromMaquina(maq, getSubcategoria, getCategoria)
      const declaracaoClienteDepois = declaracaoClienteDepoisFromMaquina(maq, getSubcategoria, getCategoria)
      const blob = await gerarPdfCompacto({
        relatorio: rel,
        manutencao: m,
        maquina: maq,
        cliente,
        checklistItems,
        subcategoriaNome: sub?.nome ?? '',
        tecnicoObj: tecObj,
        proximasManutencoes: proximas,
        marcas,
        categoriaNome,
        declaracaoClienteDepois,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_${rel.numeroRelatorio ?? m.id}_${m.data}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      showToast('PDF transferido.', 'success')
    } catch (err) {
      showToast('Erro ao gerar PDF.', 'error', 4000)
      logger.error('Manutencoes', 'handleAbrirPdf', err.message)
    } finally {
      hideGlobalLoading()
    }
  }

  const abrirModalEmail = (m) => {
    const maq = getMaquina(m.maquinaId)
    const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
    const rel = getRelatorioByManutencao(m.id)
    const cliente = getCliente(maq?.clienteNif)
    setEmailCheckCliente(!!cliente?.email?.trim())
    setEmailCheckAdmin(true)
    setEmailOutro('')
    setModalEmail({ manutencao: m, maquina: maq, rel, sub, cliente })
  }

  const abrirModalMarcarEnvioManual = (m) => {
    const maq = getMaquina(m.maquinaId)
    const rel = getRelatorioByManutencao(m.id)
    const cliente = getCliente(maq?.clienteNif)
    if (!rel) {
      showToast('Não existe relatório para esta manutenção.', 'warning')
      return
    }
    setMarcarEnvioEmail((cliente?.email || '').trim())
    setModalMarcarEnvio({ manutencao: m, maquina: maq, rel, cliente })
  }

  const confirmarMarcarEnvioManual = () => {
    if (!modalMarcarEnvio?.rel) return
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const em = marcarEnvioEmail.trim().toLowerCase()
    if (!re.test(em)) {
      showToast('Indique um endereço de email válido.', 'warning')
      return
    }
    const now = new Date().toISOString()
    const { rel } = modalMarcarEnvio
    updateRelatorio(rel.id, {
      enviadoParaCliente: { data: now, email: em },
      ultimoEnvio: { data: now, destinatario: em },
    })
    logger.action('Manutencoes', 'marcarEnvioClienteManual', `Marcado manualmente: ${rel.numeroRelatorio ?? rel.id}`, { relId: rel.id, email: em })
    showToast('Relatório marcado como enviado ao cliente.', 'success')
    setModalMarcarEnvio(null)
  }

  const reverterMarcarEnvioCliente = (rel) => {
    if (!rel?.id) return
    if (!window.confirm('Remover a marca «enviado ao cliente»? O semáforo volta a vermelho. Isto não apaga emails já enviados.')) return
    updateRelatorio(rel.id, { enviadoParaCliente: null })
    logger.action('Manutencoes', 'reverterEnvioClienteManual', `Marca removida: ${rel.numeroRelatorio ?? rel.id}`, { relId: rel.id })
    showToast('Marca de envio ao cliente removida.', 'success')
  }

  // ── Lista e títulos conforme o filtro da URL ───────────────────────────
  let listaParaMostrar
  let tituloPagina
  let subtituloPagina

  if (filter === 'atraso') {
    listaParaMostrar = manutencoesEmAtraso
    tituloPagina = 'Manutenções em atraso'
    subtituloPagina = `${manutencoesEmAtraso.length} manutenção(ões) não executadas até à data, da mais antiga para a mais recente`
  } else if (filter === 'proximas') {
    listaParaMostrar = manutencoesProximas
    tituloPagina = 'Manutenções próximas'
    subtituloPagina = `${manutencoesProximas.length} manutenção(ões) agendadas para hoje e dias seguintes, ordenadas por data`
  } else if (filter === 'executadas') {
    listaParaMostrar = executadasFiltradasComSort
    tituloPagina = 'Manutenções executadas'
    {
      const baseCount = execFiltroAtivo
        ? `${executadasFiltradasComSort.length} de ${manutencoesExecutadasOrdenadas.length} manutenção(ões) executadas`
        : `${manutencoesExecutadasOrdenadas.length} manutenção(ões) já executadas com sucesso`
      if (execSortEquipamento === 'serieAsc') {
        subtituloPagina = `${baseCount}. Ordenação: nº de série A→Z; mesma série: execução mais recente primeiro.`
      } else if (execSortEquipamento === 'serieDesc') {
        subtituloPagina = `${baseCount}. Ordenação: nº de série Z→A; mesma série: execução mais recente primeiro.`
      } else {
        subtituloPagina = `${baseCount}. Ordenação: data de execução (mais recente primeiro).`
      }
    }
  } else {
    listaParaMostrar = mostrarTodas
      ? [...manutencoesOrdenadas, ...executadasFiltradasComSort]
      : manutencoesOrdenadas
    tituloPagina = 'Manutenções'
    subtituloPagina = 'Ordenado por dias de atraso (mais urgente primeiro)'
    if (mostrarTodas) {
      if (execSortEquipamento === 'serieAsc') {
        subtituloPagina += ' · Bloco executadas: nº de série A→Z (mesma série: execução mais recente primeiro).'
      } else if (execSortEquipamento === 'serieDesc') {
        subtituloPagina += ' · Bloco executadas: nº de série Z→A (mesma série: execução mais recente primeiro).'
      } else {
        subtituloPagina += ' · Bloco executadas: data de execução (mais recente primeiro).'
      }
    }
  }

  const maquinaIdFiltroUrl = searchParams.get('maquinaId') || ''
  const maqFiltroUrl = maquinaIdFiltroUrl ? getMaquina(maquinaIdFiltroUrl) : null
  if (maquinaIdFiltroUrl) {
    listaParaMostrar = listaParaMostrar.filter(m => m.maquinaId === maquinaIdFiltroUrl)
    subtituloPagina = `${listaParaMostrar.length} linha(s) — filtro: um equipamento`
  }

  const manutencoesList_selectable = listaParaMostrar.filter(m => m.status === 'pendente' || m.status === 'agendada')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>{tituloPagina}</h1>
          <p className="page-sub">{subtituloPagina}</p>
          {maquinaIdFiltroUrl && (
            <p className="manut-filtro-maquina-banner" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
              <span className="text-muted">A mostrar só </span>
              <strong>{maqFiltroUrl ? `${maqFiltroUrl.marca} ${maqFiltroUrl.modelo} (S/N ${maqFiltroUrl.numeroSerie})` : 'este equipamento'}</strong>
              .{' '}
              <button
                type="button"
                className="secondary"
                style={{ padding: '0.15rem 0.5rem', fontSize: '0.9rem', marginLeft: '0.25rem' }}
                onClick={() => {
                  const p = new URLSearchParams(searchParams)
                  p.delete('maquinaId')
                  setSearchParams(p, { replace: true })
                }}
              >
                Mostrar todas
              </button>
            </p>
          )}
        </div>
        <div className="page-header-actions">
          {!filter && (
            <button
              type="button"
              className="secondary"
              onClick={() => setMostrarTodasWithStorage(v => !v)}
            >
              {mostrarTodas ? 'Ocultar executadas' : `Ver todas (${manutencoesExecutadas.length})`}
            </button>
          )}
          <button type="button" className={bulkMode ? 'secondary' : 'btn-outline-muted'} onClick={toggleBulkMode}>
            <CheckSquare size={16} /> {bulkMode ? 'Cancelar selecção' : 'Selecionar'}
          </button>
          {isAdmin && (
            <button type="button" onClick={openAdd}>
              <Plus size={18} /> Nova manutenção
            </button>
          )}
        </div>
      </div>

      <ContentLoader loading={!contentReady} message="A carregar manutenções…" hint="Por favor aguarde.">

      {/* ── Barra de filtros (executadas) ──────────────────────────────────── */}
      {(filter === 'executadas' || mostrarTodas) && (
        <div className="exec-filter-bar">
          <div className="exec-filter-row exec-filter-row--top">
            <div className="exec-filter-chips">
              {[
                { value: 1, label: '1M' },
                { value: 3, label: '3M' },
                { value: 6, label: '6M' },
                { value: 'ano', label: 'Este ano' },
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`period-chip${execPeriodo === p.value && !execDataDe && !execDataAte ? ' period-chip--active' : ''}`}
                  onClick={() => {
                    setExecPeriodo(prev => prev === p.value ? null : p.value)
                    setExecDataDe(''); setExecDataAte('')
                  }}
                >{p.label}</button>
              ))}
            </div>
            <div className="exec-date-range">
              <label>De <input type="date" value={execDataDe} onChange={e => { setExecDataDe(e.target.value); setExecPeriodo(null) }} /></label>
              <label>Até <input type="date" value={execDataAte} onChange={e => { setExecDataAte(e.target.value); setExecPeriodo(null) }} /></label>
              {(execDataDe || execDataAte) && (
                <button type="button" className="exec-date-clear" onClick={() => { setExecDataDe(''); setExecDataAte('') }} title="Limpar intervalo"><X size={14} /></button>
              )}
            </div>
          </div>
          <div className="exec-filter-row exec-filter-row--bottom">
            <div className="exec-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Pesquisar cliente, equipamento, técnico, relatório…"
                value={execPesquisa}
                onChange={e => setExecPesquisa(e.target.value)}
              />
              {execPesquisa && (
                <button type="button" className="exec-search-clear" onClick={() => setExecPesquisa('')}><X size={12} /></button>
              )}
            </div>
            <div className="exec-email-filter">
              <select value={execFiltroEmail} onChange={e => setExecFiltroEmail(e.target.value)}>
                <option value="todos">Email: Todos</option>
                <option value="enviado">Email: Enviados ✓</option>
                <option value="por_enviar">Email: Por enviar ✗</option>
              </select>
            </div>
            {execFiltroAtivo && (
              <button
                type="button"
                className="exec-filter-reset"
                onClick={() => { setExecPeriodo(null); setExecDataDe(''); setExecDataAte(''); setExecPesquisa(''); setExecFiltroEmail('todos'); setExecSortEquipamento('data') }}
              >Limpar filtros</button>
            )}
          </div>
          <div className="exec-sort-row" role="group" aria-label="Ordenação das manutenções executadas">
            <span className="exec-sort-hint">Ordenação (lista executadas)</span>
            <button
              type="button"
              className={`exec-sort-btn${execSortEquipamento !== 'data' ? ' exec-sort-btn--active' : ''}`}
              onClick={cycleExecSortEquipamento}
              title="Clicar alterna: data de execução (recente primeiro) → nº de série A→Z → nº de série Z→A"
            >
              {execSortEquipamento === 'data' && (
                <>
                  <CalendarClock size={15} aria-hidden /> Por data de execução
                </>
              )}
              {execSortEquipamento === 'serieAsc' && (
                <>
                  <ArrowDownAZ size={15} aria-hidden /> Por nº de série A→Z
                </>
              )}
              {execSortEquipamento === 'serieDesc' && (
                <>
                  <ArrowUpAZ size={15} aria-hidden /> Por nº de série Z→A
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Lista mobile (≤768px) — padrão field-service ───────────────────── */}
      <div className="manutencoes-cards">
        {listaParaMostrar.length === 0 ? (
          <p className="text-muted manutencoes-cards-vazio">
            {mostrarTodas ? 'Nenhuma manutenção registada.' : 'Nenhuma manutenção em atraso ou próxima.'}
          </p>
        ) : (
          listaParaMostrar.map(m => {
              const maq         = getMaquina(m.maquinaId)
              const sub         = maq ? getSubcategoria(maq.subcategoriaId) : null
              const catEquip    = sub?.categoriaId ? getCategoria(sub.categoriaId) : null
              const catClass    = manutencoesCategoriaClass(catEquip?.nome)
              const rel         = getRelatorioByManutencao(m.id)
              const dataExec    = rel?.dataAssinatura || rel?.dataCriacao
              const isConcluida = m.status === 'concluida'
              const cliente     = getCliente(maq?.clienteNif)
              const st          = isConcluida ? 'concluida' : getDisplayStatus(m)
              const isPrimary   = !isConcluida && (m.status === 'pendente' || m.status === 'agendada')
              const dias        = isConcluida ? null : calcDiasAtraso(m.data)
              const equipNome   = maq ? `${maq.marca} ${maq.modelo}` : 'N/A'
              const equipSub    = sub?.nome || ''

              return (
                <div key={m.id} className={`mc mc-${st} ${catClass}${bulkMode && selectedIds.has(m.id) ? ' mc-selected' : ''}`}>
                  {/* Faixa de status lateral */}
                  <div className="mc-strip" />

                  {bulkMode && isPrimary && (
                    <label className="bulk-check-mobile" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} />
                    </label>
                  )}

                  <div className="mc-body">
                    {/* Linha 1: tipo + badge + número + badge KAESER */}
                    <div className="mc-top">
                      <span className={`badge badge-${st}`}>{statusLabel[st]}</span>
                      {dias != null && (
                        <span className={`mc-dias-badge ${dias > 0 ? 'dias-atraso' : dias === 0 ? 'dias-hoje' : 'dias-futuro'}`}>
                          {dias > 0 ? `+${dias}d` : dias === 0 ? 'Hoje' : `${dias}d`}
                        </span>
                      )}
                      {isHistorico(m) && <span className="badge badge-historico"><Archive size={10} /> Histórico</span>}
                      {isPendenteAssinatura(m) && <span className="badge badge-pendente-assinatura">Pend. assinatura</span>}
                      {isConcluida && rel && (
                        <span className={`email-dot ${rel.enviadoParaCliente?.email ? 'email-dot--sent' : 'email-dot--pending'}`} title={rel.enviadoParaCliente?.email ? `Enviado a ${rel.enviadoParaCliente.email}` : 'Não enviado ao cliente'} />
                      )}
                      {maq && isKaeserAbcdMaquina(maq) && maq.posicaoKaeser != null && !isConcluida && (
                        <span
                          className="badge kaeser-tipo-badge"
                          title={`Plano KAESER A/B/C/D — próxima: Tipo ${tipoKaeserNaPosicao(maq.posicaoKaeser)}`}
                        >
                          KAESER {tipoKaeserNaPosicao(maq.posicaoKaeser)}
                        </span>
                      )}
                      <span className="mc-tipo-label">
                        {m.tipo === 'montagem' ? 'Montagem' : 'Periódica'}
                        {rel?.numeroRelatorio && <span className="mc-num"> · {rel.numeroRelatorio}</span>}
                      </span>
                    </div>

                    {/* Linha 2: nome do equipamento */}
                    <div className="mc-title">
                      {equipSub && <span className="mc-sub">{equipSub}</span>}
                      <strong>{equipNome}</strong>
                    </div>

                    {/* Linha 3: identificação do cliente */}
                    <div className="mc-cliente-linha">
                      <span className="mc-cliente-label">Cliente:</span>
                      <span className="mc-cliente-nome">{cliente?.nome || '—'}</span>
                    </div>

                    {/* Linha 4: série (clicável → ficha do equipamento) */}
                    <div className="mc-info">
                      {maq?.numeroSerie && (
                        <span className="mc-serie mc-serie-link" role="button" tabIndex={0}
                          title="Abrir ficha do equipamento"
                          onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos?maquina=${encodeURIComponent(maq.id)}`) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/equipamentos?maquina=${encodeURIComponent(maq.id)}`) }}
                        >Nº {maq.numeroSerie}</span>
                      )}
                    </div>

                    {/* Linha 5: data relevante + técnico */}
                    <div className="mc-meta">
                      {dataExec ? (
                        <span className="mc-date-exec">
                          ✓ {formatDataHoraCurtaAzores(dataExec)}
                        </span>
                      ) : (
                        <span className="mc-date-agenda">
                          {formatDataAzores(m.data, true)}
                        </span>
                      )}
                      {m.tecnico && <span className="mc-tecnico">{m.tecnico}</span>}
                    </div>

                    {/* Rodapé: acção primária (se aplicável) + ícones secundários */}
                    <div className="mc-footer">
                      {isPrimary && (
                        <button
                          className="mc-btn-primary"
                          onClick={() => { iniciarManutencao(m.id); setModalExecucao({ manutencao: { ...m, status: 'em_progresso' }, maquina: maq }) }}
                        >
                          <Play size={14} /> Executar
                        </button>
                      )}
                      {!isConcluida && m.status === 'em_progresso' && (
                        <button
                          className="mc-btn-primary"
                          onClick={() => setModalExecucao({ manutencao: m, maquina: maq })}
                        >
                          <Play size={14} /> Continuar
                        </button>
                      )}
                      <div className="mc-icons">
                        {rel?.assinadoPeloCliente && (
                          <button className="icon-btn secondary" onClick={() => setModalRelatorio(m)} title="Ver relatório"><FileText size={15} /></button>
                        )}
                        {rel && !rel.assinadoPeloCliente && (
                          <button className="icon-btn secondary" onClick={() => setModalRecolherAssinatura({ manutencao: m, maquina: maq })} title="Recolher assinatura"><FileSignature size={15} /></button>
                        )}
                        {isConcluida && !rel && (
                          <button className="icon-btn secondary" onClick={() => setModalRecolherAssinatura({ manutencao: m, maquina: maq })} title="Registar assinatura"><FileSignature size={15} /></button>
                        )}
                        <div className="mc-overflow-wrapper">
                          <button className="icon-btn secondary" onClick={() => setOverflowOpen(overflowOpen === m.id ? null : m.id)} title="Mais acções"><MoreHorizontal size={15} /></button>
                          {overflowOpen === m.id && (
                            <div className="mc-overflow-menu" onClick={() => setOverflowOpen(null)}>
                              {rel?.fotos?.length > 0 && (
                                <button onClick={() => setModalFotos({ fotos: rel.fotos })}><Paperclip size={14} /> Fotografias</button>
                              )}
                              {rel && (
                                <>
                                  <button onClick={() => handleAbrirPdf(m, maq, rel, sub, cliente)}><FileDown size={14} /> PDF</button>
                                  <button onClick={() => abrirModalEmail(m)}><Mail size={14} /> Enviar email</button>
                                  {isAdmin && isConcluida && (
                                    rel.enviadoParaCliente?.email ? (
                                      <button onClick={() => reverterMarcarEnvioCliente(rel)}><Undo2 size={14} /> Reverter marca de envio</button>
                                    ) : (
                                      <button onClick={() => abrirModalMarcarEnvioManual(m)}><MailCheck size={14} /> Marcar enviado ao cliente</button>
                                    )
                                  )}
                                </>
                              )}
                              {canEditManutencao(m.id) && (
                                <button onClick={() => openEdit(m)}><Pencil size={14} /> Editar</button>
                              )}
                              {canDeleteManutencao(m.id) && (
                                <button className="mc-overflow-danger" onClick={() => setModalConfirmDelete(m)}><Trash2 size={14} /> Eliminar</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
        )}
      </div>

      {/* ── Tabela desktop (>768px) ──────────────────────────────────────────── */}
      <div className="table-card card manutencoes-table">
          <table className="data-table dt-compact">
            <thead>
              <tr>
                {bulkMode && (
                  <th className="col-bulk-check">
                    <input type="checkbox"
                      checked={(() => {
                        const selectable = listaParaMostrar.filter(m => m.status === 'pendente' || m.status === 'agendada')
                        return selectable.length > 0 && selectable.every(m => selectedIds.has(m.id))
                      })()}
                      onChange={e => {
                        const selectable = listaParaMostrar.filter(m => m.status === 'pendente' || m.status === 'agendada')
                        if (e.target.checked) {
                          setSelectedIds(new Set([...selectedIds, ...selectable.map(m => m.id)]))
                        } else {
                          const next = new Set(selectedIds)
                          selectable.forEach(m => next.delete(m.id))
                          setSelectedIds(next)
                        }
                      }}
                    />
                  </th>
                )}
                <th className="col-xs">Dias</th>
                <th
                  className={`col-lg col-truncate${filter === 'executadas' || mostrarTodas ? ' th-equip-sort-wrap' : ''}`}
                  aria-sort={filter === 'executadas' || mostrarTodas
                    ? (execSortEquipamento === 'serieAsc' ? 'ascending' : execSortEquipamento === 'serieDesc' ? 'descending' : 'descending')
                    : undefined}
                >
                  {(filter === 'executadas' || mostrarTodas) ? (
                    <button
                      type="button"
                      className="th-equip-sort-btn"
                      onClick={cycleExecSortEquipamento}
                      title="Ordenar lista de executadas: data de execução → nº de série A→Z → nº de série Z→A"
                      aria-label={
                        execSortEquipamento === 'data'
                          ? 'Ordenação: data de execução (mais recente primeiro). Clicar para ordenar por nº de série A a Z.'
                          : execSortEquipamento === 'serieAsc'
                            ? 'Ordenação: nº de série A a Z. Clicar para ordenar por nº de série Z a A.'
                            : 'Ordenação: nº de série Z a A. Clicar para voltar à data de execução.'
                      }
                    >
                      <span>Equipamento</span>
                      {execSortEquipamento === 'data' && <CalendarClock size={14} className="th-equip-sort-ico" aria-hidden />}
                      {execSortEquipamento === 'serieAsc' && <ArrowDownAZ size={14} className="th-equip-sort-ico" aria-hidden />}
                      {execSortEquipamento === 'serieDesc' && <ArrowUpAZ size={14} className="th-equip-sort-ico" aria-hidden />}
                    </button>
                  ) : (
                    'Equipamento'
                  )}
                </th>
                <th className="col-md col-truncate">Cliente</th>
                <th className="col-sm col-truncate">Tipo</th>
                <th className="col-md col-nowrap">Data</th>
                <th className="col-sm col-truncate">Técnico</th>
                <th className="col-sm col-badges">Status</th>
                {(mostrarTodas || filter === 'executadas') && <th className="col-email-status" title="Relatório enviado ao cliente">Email</th>}
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {listaParaMostrar.map(m => {
                  const maq = getMaquina(m.maquinaId)
                  const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
                  const catEquip = sub?.categoriaId ? getCategoria(sub.categoriaId) : null
                  const catClass = manutencoesCategoriaClass(catEquip?.nome)
                  const desc = maq ? `${sub?.nome || ''} — ${maq.marca} ${maq.modelo}`.trim() || 'N/A' : 'N/A'
                  const rel = getRelatorioByManutencao(m.id)
                  const dataExecucao = rel?.dataAssinatura || rel?.dataCriacao
                  const isConcluida = m.status === 'concluida'
                  const dias = isConcluida ? null : calcDiasAtraso(m.data)
                  return (
                    <tr key={m.id} className={[catClass, bulkMode && selectedIds.has(m.id) ? 'bulk-row-selected' : ''].filter(Boolean).join(' ')}>
                      {bulkMode && (
                        <td className="col-bulk-check">
                          {!isConcluida && (m.status === 'pendente' || m.status === 'agendada') ? (
                            <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} />
                          ) : <span />}
                        </td>
                      )}
                      <td data-label="Dias" className={`col-xs col-dias-val ${dias > 0 ? 'dias-atraso' : dias === 0 ? 'dias-hoje' : 'dias-futuro'}`}>
                        {dias != null ? (dias > 0 ? `+${dias}` : dias === 0 ? 'Hoje' : `${dias}`) : '—'}
                      </td>
                      <td data-label="Equipamento" className="col-lg col-truncate">
                        <div className="equip-desc-block">
                          <strong>{desc}</strong>
                          <span
                            className="text-muted equip-num-serie equip-num-serie-link"
                            role="button" tabIndex={0}
                            title="Abrir ficha do equipamento"
                            onClick={() => maq && navigate(`/equipamentos?maquina=${encodeURIComponent(maq.id)}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && maq) navigate(`/equipamentos?maquina=${encodeURIComponent(maq.id)}`) }}
                          >Nº Série: {maq?.numeroSerie}</span>
                        </div>
                      </td>
                      <td data-label="Cliente" className="col-md col-truncate">{getCliente(maq?.clienteNif)?.nome || '—'}</td>
                      <td data-label="Tipo" className="col-sm col-truncate">
                        <span>{m.tipo === 'montagem' ? 'Montagem' : 'Manutenção Peri.'}</span>
                        {isConcluida && rel?.numeroRelatorio && (
                          <span className="num-servico" title="Número de serviço">{rel.numeroRelatorio}</span>
                        )}
                      </td>
                      <td data-label="Data" className="col-md col-nowrap">
                        {isConcluida ? (
                          <div className="datas-manut">
                            <span title="Data agendada">Agendada: {formatDataAzores(m.data)}</span>
                            <span className="text-muted" title="Data e hora de execução/assinatura">
                              Execução: {dataExecucao ? formatDataHoraCurtaAzores(dataExecucao) : '—'}
                            </span>
                          </div>
                        ) : (
                          formatDataAzores(m.data)
                        )}
                      </td>
                      <td data-label="Técnico" className="col-sm col-truncate">{m.tecnico || (isConcluida && rel?.tecnico) || 'Não atribuído'}</td>
                      <td data-label="Status" className="col-sm col-badges">
                        <span className={`badge badge-${isConcluida ? 'concluida' : getDisplayStatus(m)}`}>
                          {statusLabel[isConcluida ? 'concluida' : getDisplayStatus(m)]}
                        </span>
                        {isHistorico(m) && <span className="badge badge-historico"><Archive size={10} /> Histórico</span>}
                        {isPendenteAssinatura(m) && <span className="badge badge-pendente-assinatura">Pend. assinatura</span>}
                        {!canEditManutencao(m.id) && (
                          <span className="badge-assinado" title="Assinado pelo cliente"><Lock size={12} /> Assinado</span>
                        )}
                      </td>
                      {(mostrarTodas || filter === 'executadas') && (() => {
                        const envio = rel?.enviadoParaCliente
                        const enviado = !!envio?.email
                        return (
                          <td className="col-email-status" data-label="Email" title={enviado ? `Enviado a ${envio.email}` : 'Não enviado ao cliente'}>
                            <span className={`email-dot ${enviado ? 'email-dot--sent' : 'email-dot--pending'}`} />
                          </td>
                        )
                      })()}
                      <td className="col-actions" data-label="">
                        <div className="actions-inner">
                          {/* Botão primário: Executar */}
                          {!isConcluida && (m.status === 'pendente' || m.status === 'agendada') && (
                            <button className="icon-btn btn-executar-manut" onClick={() => { iniciarManutencao(m.id); setModalExecucao({ manutencao: { ...m, status: 'em_progresso' }, maquina: getMaquina(m.maquinaId) }) }} title="Executar manutenção">
                              <Play size={16} />
                            </button>
                          )}
                          {!isConcluida && m.status === 'em_progresso' && (
                            <button className="icon-btn btn-executar-manut" onClick={() => setModalExecucao({ manutencao: m, maquina: getMaquina(m.maquinaId) })} title="Continuar execução">
                              <Play size={16} />
                            </button>
                          )}
                          {/* Botão primário: PDF (quando há relatório) */}
                          {rel && (
                            <button className="icon-btn secondary" onClick={() => handleAbrirPdf(m, maq, rel, sub, getCliente(maq?.clienteNif))} title="Obter PDF">
                              <FileDown size={16} />
                            </button>
                          )}
                          {/* Menu overflow: acções secundárias */}
                          <ActionsOverflow id={m.id} openId={overflowAberto} setOpenId={setOverflowAberto} items={[
                            ...(rel ? [{ icon: <Mail size={14} />, label: 'Enviar por email', onClick: () => abrirModalEmail(m) }] : []),
                            ...(isAdmin && isConcluida && rel
                              ? (rel.enviadoParaCliente?.email
                                ? [{ icon: <Undo2 size={14} />, label: 'Reverter marca de envio ao cliente', danger: true, onClick: () => reverterMarcarEnvioCliente(rel) }]
                                : [{ icon: <MailCheck size={14} />, label: 'Marcar enviado ao cliente (manual)', onClick: () => abrirModalMarcarEnvioManual(m) }])
                              : []),
                            ...(rel?.fotos?.length > 0 ? [{ icon: <Paperclip size={14} />, label: 'Fotografias', onClick: () => setModalFotos({ fotos: rel.fotos }) }] : []),
                            ...(rel?.assinadoPeloCliente ? [{ icon: <FileText size={14} />, label: 'Ver manutenção', onClick: () => setModalRelatorio(m) }] : []),
                            ...(rel && !rel.assinadoPeloCliente ? [{ icon: <FileSignature size={14} />, label: 'Recolher assinatura', onClick: () => setModalRecolherAssinatura({ manutencao: m, maquina: getMaquina(m.maquinaId) }) }] : []),
                            ...(!rel && isConcluida ? [{ icon: <FileSignature size={14} />, label: 'Registar assinatura', onClick: () => setModalRecolherAssinatura({ manutencao: m, maquina: getMaquina(m.maquinaId) }) }] : []),
                            ...(canEditManutencao(m.id) ? [{ icon: <Pencil size={14} />, label: 'Editar', onClick: () => openEdit(m) }] : [{ icon: <Lock size={14} />, label: 'Assinada', disabled: true }]),
                            ...(canDeleteManutencao(m.id) ? [{ icon: <Trash2 size={14} />, label: 'Eliminar', danger: true, onClick: () => setModalConfirmDelete(m) }] : []),
                          ]} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          {listaParaMostrar.length === 0 && (
            <p className="text-muted" style={{ padding: '1.5rem' }}>
              {mostrarTodas ? 'Nenhuma manutenção registada.' : 'Nenhuma manutenção em atraso ou próxima.'}
            </p>
          )}
        </div>

      </ContentLoader>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Nova manutenção' : 'Editar manutenção'}</h2>
            <form onSubmit={handleSubmit}>
              {modal === 'add' ? (
                <>
                  {/* Pipeline: Cliente → Categoria → Máquina */}
                  <label>
                    Cliente
                    <select required value={addClienteNif} onChange={e => { setAddClienteNif(e.target.value); setAddCategoriaId(''); setForm(f => ({ ...f, maquinaId: '' })) }}>
                      <option value="">— Selecionar cliente —</option>
                      {clientes
                        .filter(c => maquinas.some(m => m.clienteNif === c.nif))
                        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                        .map(c => <option key={c.nif} value={c.nif}>{c.nome}</option>)}
                    </select>
                  </label>
                  {addClienteNif && (() => {
                    const maqsCliente = maquinas.filter(m => m.clienteNif === addClienteNif)
                    const catsComMaquinas = categorias.filter(cat =>
                      getSubcategoriasByCategoria(cat.id).some(sub => maqsCliente.some(m => m.subcategoriaId === sub.id))
                    )
                    return (
                      <label>
                        Categoria de equipamento
                        <select value={addCategoriaId} onChange={e => { setAddCategoriaId(e.target.value); setForm(f => ({ ...f, maquinaId: '' })) }}>
                          <option value="">— Selecionar categoria —</option>
                          {catsComMaquinas.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                        </select>
                      </label>
                    )
                  })()}
                  {addClienteNif && addCategoriaId && (() => {
                    const subsIds = getSubcategoriasByCategoria(addCategoriaId).map(s => s.id)
                    const maqsFiltradas = maquinas.filter(m => m.clienteNif === addClienteNif && subsIds.includes(m.subcategoriaId))
                    return (
                      <label>
                        Equipamento
                        <select required value={form.maquinaId} onChange={e => setForm(f => ({ ...f, maquinaId: e.target.value }))}>
                          <option value="">— Selecionar equipamento —</option>
                          {maqsFiltradas.map(maq => {
                            const sub = getSubcategoria(maq.subcategoriaId)
                            return <option key={maq.id} value={maq.id}>{sub?.nome || ''} — {maq.marca} {maq.modelo} — {maq.numeroSerie}</option>
                          })}
                        </select>
                      </label>
                    )
                  })()}
                </>
              ) : (
                <label>
                  Máquina
                  <select required value={form.maquinaId} onChange={e => setForm(f => ({ ...f, maquinaId: e.target.value }))}>
                    {maquinas.map(maq => {
                      const sub = getSubcategoria(maq.subcategoriaId)
                      return <option key={maq.id} value={maq.id}>{sub?.nome || ''} — {maq.marca} {maq.modelo} — {maq.numeroSerie}</option>
                    })}
                  </select>
                </label>
              )}
              <label>
                Data agendada
                <input
                  type="date"
                  required
                  value={form.data}
                  onChange={e => {
                    const v = e.target.value
                    setForm(f => ({ ...f, data: v }))
                    validarDataManut(v)
                  }}
                />
                {avisoData && <span className="form-aviso-data">{avisoData}</span>}
              </label>
              <label className="form-tecnico-destaque">
                Técnico responsável <span className="form-tecnico-hint">(recomendado atribuir ao agendar)</span>
                <select value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))}>
                  <option value="">— Selecionar técnico —</option>
                  {nomesTecnicos.map(nome => <option key={nome} value={nome}>{nome}</option>)}
                </select>
              </label>
              {modal === 'edit' && isAdmin && form.status === 'concluida' && (
                <div className="form-section-historica">
                  <label className="historica-label">
                    <Clock size={14} />
                    Data de execução
                    <span className="historica-hint">(alterar a data em que a manutenção foi realizada)</span>
                    <input
                      type="date"
                      max={getHojeAzores()}
                      value={form.dataExecucao}
                      onChange={e => setForm(f => ({ ...f, dataExecucao: e.target.value }))}
                    />
                  </label>
                </div>
              )}
              {modal === 'edit' && (
                <>
                  <label>
                    Status
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="pendente">Pendente</option>
                      <option value="agendada">Agendada</option>
                      <option value="em_progresso">Em progresso</option>
                      {form.status === 'concluida' && <option value="concluida">Executada (concluída)</option>}
                    </select>
                    {form.status !== 'concluida' && <span className="form-hint">Para marcar como executada, use o botão ▶ Executar</span>}
                    {form.status === 'concluida' && <span className="form-hint">Altere o status para reverter esta manutenção para pendente.</span>}
                  </label>
                  {temContadorHoras(getMaquina(form.maquinaId)?.subcategoriaId) && (
                    <label>
                      Horas no contador (acumuladas)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={form.horasServico}
                        onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
                        placeholder="Ex: 6000"
                      />
                    </label>
                  )}
                </>
              )}
              <label>
                Observações
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  className="textarea-full"
                  placeholder="Notas da manutenção..."
                />
              </label>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" disabled={modal === 'add' && !form.maquinaId}>
                  {modal === 'add' ? 'Agendar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {modalFotos && (
        <div className="modal-overlay" onClick={() => setModalFotos(null)}>
          <div className="modal modal-fotos-preview" onClick={e => e.stopPropagation()}>
            <div className="modal-fotos-header">
              <h2>Fotografias do relatório</h2>
              <button type="button" className="icon-btn secondary" onClick={() => setModalFotos(null)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="modal-fotos-grid">
              {modalFotos.fotos.map((src, i) => (
                <div key={i} className="modal-foto-item">
                  <img src={src} alt={`Fotografia ${i + 1}`} />
                </div>
              ))}
            </div>
            <button type="button" className="secondary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setModalFotos(null)}>
              Voltar à lista
            </button>
          </div>
        </div>
      )}

      {modalRelatorio && (() => {
        const rel = getRelatorioByManutencao(modalRelatorio?.id)
        const maq = getMaquina(modalRelatorio?.maquinaId)
        const cli = maq ? getCliente(maq.clienteNif) : null
        const items = maq ? getChecklistBySubcategoria(maq.subcategoriaId, modalRelatorio?.tipo || 'periodica') : []
        if (!rel) {
          logger.warn('Manutencoes', 'modalRelatorioSemDados', 'Modal relatório aberto mas relatório não encontrado', { manutencaoId: modalRelatorio?.id })
        }
        return (
          <div className="modal-overlay" onClick={() => setModalRelatorio(null)}>
            <div className="modal modal-relatorio" onClick={e => e.stopPropagation()}>
              <div className="modal-relatorio-header">
                <h2>Relatório de manutenção</h2>
                <button type="button" className="btn-fechar" onClick={() => setModalRelatorio(null)}>Fechar</button>
              </div>
              {rel ? (
                <RelatorioView
                  relatorio={rel}
                  manutencao={modalRelatorio}
                  maquina={maq}
                  cliente={cli}
                  checklistItems={items}
                />
              ) : (
                <div className="manutencao-detalhe-placeholder" style={{ padding: '1.5rem' }}>
                  <p>Relatório não encontrado.</p>
                  <p className="text-muted">A manutenção pode não ter relatório associado.</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {modalExecucao && (
        <ExecutarManutencaoModal
          isOpen
          onClose={() => setModalExecucao(null)}
          manutencao={modalExecucao.manutencao}
          maquina={modalExecucao.maquina}
        />
      )}

      {modalAdminEdit && (
        <ExecutarManutencaoModal
          isOpen
          adminEdit
          onClose={() => setModalAdminEdit(null)}
          manutencao={modalAdminEdit.manutencao}
          maquina={modalAdminEdit.maquina}
        />
      )}

      {modalRecolherAssinatura && (
        <RecolherAssinaturaModal
          isOpen
          onClose={() => setModalRecolherAssinatura(null)}
          manutencao={modalRecolherAssinatura.manutencao}
          maquina={modalRecolherAssinatura.maquina}
        />
      )}

      {modalEmail && (() => {
        const emailCli = modalEmail.cliente?.email?.trim() ?? ''
        return (
          <div className="modal-overlay" onClick={() => { setModalEmail(null); setEmailOutro('') }}>
            <div className="modal modal-email-envio" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
              <h2><Mail size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />Enviar relatório por email</h2>
              {modalEmail.rel?.numeroRelatorio && (
                <p className="modal-hint">Relatório <strong>{modalEmail.rel.numeroRelatorio}</strong> — {modalEmail.manutencao?.tipo === 'montagem' ? 'Montagem' : 'Manutenção Periódica'}</p>
              )}
              <form onSubmit={handleEnviarEmail}>
                <div className="frota-email-panel">
                  {emailCli ? (
                    <label className="frota-email-check">
                      <input type="checkbox" checked={emailCheckCliente} onChange={e => setEmailCheckCliente(e.target.checked)} disabled={emailEnviando} />
                      <span><strong>Cliente</strong><br /><small>{emailCli}</small></span>
                    </label>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}><em>Sem email de cliente na ficha.</em></p>
                  )}
                  <label className="frota-email-check">
                    <input type="checkbox" checked={emailCheckAdmin} onChange={e => setEmailCheckAdmin(e.target.checked)} disabled={emailEnviando} />
                    <span><strong>Administração</strong><br /><small>{EMAIL_ADMIN_MANUT}</small></span>
                  </label>
                  <div className="frota-email-outro-wrap" style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Outro(s) endereço(s)</label>
                    <input
                      type="text"
                      className="frota-email-outro-input"
                      placeholder="ex: outro@empresa.pt, backup@navel.pt"
                      value={emailOutro}
                      onChange={e => setEmailOutro(e.target.value)}
                      disabled={emailEnviando}
                    />
                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Separe múltiplos emails com vírgula.</small>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => { setModalEmail(null); setEmailOutro('') }} disabled={emailEnviando}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={emailEnviando}>
                    {emailEnviando ? 'A enviar…' : <><Mail size={16} /> Enviar email</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {modalMarcarEnvio && (
        <div className="modal-overlay" onClick={() => setModalMarcarEnvio(null)}>
          <div className="modal modal-email-envio" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h2><MailCheck size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />Marcar enviado ao cliente</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Regista na base de dados que o relatório já foi enviado ao cliente (sem enviar email de novo).
              O semáforo na lista passa a <strong>verde</strong>. Use o email para o qual enviou (ex.: cópia no Outlook).
            </p>
            {modalMarcarEnvio.rel?.numeroRelatorio && (
              <p className="modal-hint">Relatório <strong>{modalMarcarEnvio.rel.numeroRelatorio}</strong></p>
            )}
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>Email do destinatário (cliente)</span>
              <input
                type="email"
                className="frota-email-outro-input"
                value={marcarEnvioEmail}
                onChange={e => setMarcarEnvioEmail(e.target.value)}
                placeholder="cliente@empresa.pt"
                autoComplete="email"
              />
            </label>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setModalMarcarEnvio(null)}>Cancelar</button>
              <button type="button" onClick={confirmarMarcarEnvioManual}><MailCheck size={16} /> Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra flutuante de selecção em massa ── */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-action-count">{selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}</span>
          <button type="button" className="btn primary" onClick={() => {
            const selected = manutencoesList_selectable.filter(m => selectedIds.has(m.id))
            const maqMap = {}
            selected.forEach(m => { maqMap[m.maquinaId] = getMaquina(m.maquinaId) })
            setModalBulk({ manutencoes: selected, maquinaMap: maqMap })
          }}>
            <Play size={15} /> Executar {selectedIds.size}
          </button>
          <button type="button" className="btn secondary" onClick={toggleBulkMode}>
            <X size={15} /> Cancelar
          </button>
        </div>
      )}

      {modalBulk && (
        <BulkExecutarModal
          isOpen
          onClose={() => { setModalBulk(null); setBulkMode(false); setSelectedIds(new Set()) }}
          manutencoesList={modalBulk.manutencoes}
          maquinaMap={modalBulk.maquinaMap}
        />
      )}

      {modalConfirmDelete && (() => {
        const mDel = modalConfirmDelete
        const maqDel = getMaquina(mDel.maquinaId)
        const relDel = getRelatorioByManutencao(mDel.id)
        const cliDel = getCliente(maqDel?.clienteNif)
        const isConcluida = mDel.status === 'concluida'
        const futurasCount = isConcluida && mDel.maquinaId
          ? manutencoes.filter(fm =>
              fm.id !== mDel.id &&
              fm.maquinaId === mDel.maquinaId &&
              (fm.status === 'pendente' || fm.status === 'agendada') &&
              fm.data > mDel.data
            ).length
          : 0

        return (
          <div className="modal-overlay" onClick={() => setModalConfirmDelete(null)}>
            <div className="modal modal-compact modal-delete-confirm" onClick={e => e.stopPropagation()}>
              <h2 className="modal-delete-title"><Trash2 size={20} /> Eliminar manutenção</h2>
              <div className="modal-delete-details">
                <p><strong>{maqDel ? `${maqDel.marca} ${maqDel.modelo}` : 'N/A'}</strong></p>
                {maqDel?.numeroSerie && <p className="text-muted">Nº Série: {maqDel.numeroSerie}</p>}
                {cliDel && <p className="text-muted">{cliDel.nome}</p>}
                <p className="text-muted">{mDel.tipo === 'montagem' ? 'Montagem' : 'Manutenção Periódica'} — {formatDataAzores(mDel.data)}</p>
                {relDel?.numeroRelatorio && <p className="text-muted">Relatório: {relDel.numeroRelatorio}</p>}
              </div>
              <div className="modal-delete-warning">
                <p>Tem a certeza que pretende eliminar esta manutenção?</p>
                <p>Esta acção é <strong>irreversível</strong> e eliminará:</p>
                <ul>
                  <li>A manutenção e todos os seus dados</li>
                  {relDel && <li>O relatório associado{relDel.assinadoPeloCliente ? ' (assinado pelo cliente)' : ''}</li>}
                  {futurasCount > 0 && <li><strong>{futurasCount}</strong> manutenção(ões) periódica(s) futura(s) agendada(s) automaticamente</li>}
                </ul>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setModalConfirmDelete(null)}>Não, cancelar</button>
                <button type="button" className="danger" onClick={() => {
                  removeManutencao(mDel.id)
                  setModalConfirmDelete(null)
                  showToast(`Manutenção eliminada${futurasCount > 0 ? ` (+ ${futurasCount} agendamento(s) futuro(s))` : ''}.`, 'success')
                  logger.action('Manutencoes', 'deleteManutencao', `Admin eliminou manutenção ${mDel.id}${relDel ? ` com relatório ${relDel.numeroRelatorio}` : ''}`, { id: mDel.id, futuras: futurasCount })
                }}>Sim, eliminar</button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
