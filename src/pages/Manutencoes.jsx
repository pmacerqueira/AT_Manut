/**
 * Manutencoes – Lista de manutenções (em atraso, próximas, executadas).
 * Permite executar manutenção, registar assinatura, ver/exportar relatório.
 * @see DOCUMENTACAO.md §11
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '../components/Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { SUBCATEGORIAS_COM_CONTADOR_HORAS, SUBCATEGORIAS_COMPRESSOR, tipoKaeserNaPosicao } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import RelatorioView from '../components/RelatorioView'
import ExecutarManutencaoModal from '../components/ExecutarManutencaoModal'
import RecolherAssinaturaModal from '../components/RecolherAssinaturaModal'
import BulkExecutarModal from '../components/BulkExecutarModal'
import { Plus, Pencil, Trash2, Lock, FileSignature, FileText, Paperclip, X, Play, FileDown, ArrowLeft, Mail, Clock, Archive, MoreHorizontal, CheckSquare } from 'lucide-react'
import { format, addDays, isBefore, startOfDay, differenceInCalendarDays } from 'date-fns'
import { getHojeAzores, formatDataHoraCurtaAzores, formatDataAzores, parseDateLocal } from '../utils/datasAzores'
import { getFeriadosAno, isFimDeSemana, isFeriado } from '../utils/diasUteis'
import { pt } from 'date-fns/locale'
import { relatorioParaHtml } from '../utils/relatorioHtml'
import { gerarPdfCompacto } from '../utils/gerarPdfRelatorio'
import { enviarRelatorioEmail } from '../services/emailService'
import { logger } from '../utils/logger'
import { STORAGE } from '../config/storageKeys'
import ContentLoader from '../components/ContentLoader'
import { useDeferredReady } from '../hooks/useDeferredReady'
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
    getChecklistBySubcategoria,
    getTecnicoByNome,
    tecnicos,
  } = useData()
  const { canDelete, canEditManutencao, canDeleteManutencao, isAdmin } = usePermissions()
  const contentReady = useDeferredReady(manutencoes.length >= 0)
  const [modalConfirmDelete, setModalConfirmDelete] = useState(null)
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const location = useLocation()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [modalRelatorio, setModalRelatorio] = useState(null)
  const [modalExecucao, setModalExecucao] = useState(null)
  const [modalFotos, setModalFotos] = useState(null) // { fotos: string[] }
  const [modalEmail, setModalEmail] = useState(null) // { manutencao, maquina, rel, sub, cliente }
  const [modalRecolherAssinatura, setModalRecolherAssinatura] = useState(null) // { manutencao, maquina }
  const [emailCheckCliente, setEmailCheckCliente] = useState(false)
  const [emailCheckAdmin, setEmailCheckAdmin]     = useState(true)
  const [emailOutro, setEmailOutro]               = useState('')
  const [emailEnviando, setEmailEnviando]         = useState(false)
  const [form, setForm] = useState({ maquinaId: '', tipo: 'periodica', data: '', tecnico: '', status: 'pendente', observacoes: '', horasTotais: '', horasServico: '', dataExecucao: '' })
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

  useEffect(() => {
    if (!overflowOpen) return
    const close = (e) => {
      if (!e.target.closest('.mc-overflow-wrapper')) setOverflowOpen(null)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [overflowOpen])

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
    const execId = location.state?.openExecucaoId
    if (execId) {
      const m = manutencoes.find(x => x.id === execId)
      const maq = m ? maquinas.find(x => x.id === m.maquinaId) : null
      if (m && maq) setModalExecucao({ manutencao: m, maquina: maq })
      navigate(location.pathname + location.search, { replace: true, state: {} })
    }
  }, [location.state?.openExecucaoId, manutencoes, maquinas, navigate, location.pathname, location.search])

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
    manutencoes.filter(m => m.status === 'pendente' || m.status === 'agendada'),
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
      horasTotais: '',
      horasServico: '',
    })
    setAvisoData('')
    setModal('add')
  }

  const openEdit = (m) => {
    const rel = m.status === 'concluida' ? getRelatorioByManutencao(m.id) : null
    const dataExec = rel ? (rel.dataAssinatura || rel.dataCriacao || '').slice(0, 10) : ''
    setForm({
      id: m.id,
      maquinaId: m.maquinaId,
      tipo: m.tipo,
      data: m.data,
      tecnico: m.tecnico,
      status: m.status,
      observacoes: m.observacoes || '',
      horasTotais: m.horasTotais ?? '',
      horasServico: m.horasServico ?? '',
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
    const updateMaqData = {}
    if (form.status === 'concluida') {
      const dias = getIntervaloDiasByMaquina(maq)
      const proxima = addDays(parseDateLocal(form.data), dias)
      updateMaqData.proximaManut = format(proxima, 'yyyy-MM-dd')
      updateMaqData.ultimaManutencaoData = form.data
      if (temContadorHoras(maq?.subcategoriaId) && (form.horasTotais !== '' || form.horasServico !== '')) {
        const hTotais = form.horasTotais !== '' ? Number(form.horasTotais) : undefined
        const hServ = form.horasServico !== '' ? Number(form.horasServico) : undefined
        if (hTotais != null) updateMaqData.horasTotaisAcumuladas = hTotais
        if (hServ != null) updateMaqData.horasServicoAcumuladas = hServ
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
          logoUrl: `${import.meta.env.BASE_URL}logo-navel.png`,
          tecnicoObj: tecObj,
        })
        if (resultado?.ok) sucesso++
        else logger.error('Manutencoes', 'enviarEmail', resultado?.message ?? 'Erro', { dest })
      }
      if (sucesso > 0) {
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
      const blob = await gerarPdfCompacto({
        relatorio: rel,
        manutencao: m,
        maquina: maq,
        cliente,
        checklistItems,
        subcategoriaNome: sub?.nome ?? '',
        tecnicoObj: tecObj,
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
    listaParaMostrar = manutencoesExecutadasOrdenadas
    tituloPagina = 'Manutenções executadas'
    subtituloPagina = `${manutencoesExecutadasOrdenadas.length} manutenção(ões) já executadas com sucesso, da mais recente para a mais antiga`
  } else {
    listaParaMostrar = mostrarTodas
      ? [...manutencoesOrdenadas, ...manutencoesExecutadasOrdenadas]
      : manutencoesOrdenadas
    tituloPagina = 'Manutenções'
    subtituloPagina = 'Ordenado por dias de atraso (mais urgente primeiro)'
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
                <div key={m.id} className={`mc mc-${st}${bulkMode && selectedIds.has(m.id) ? ' mc-selected' : ''}`}>
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
                      {maq && SUBCATEGORIAS_COMPRESSOR.includes(maq.subcategoriaId) && maq.posicaoKaeser != null && !isConcluida && (
                        <span
                          className={`badge kaeser-tipo-badge${maq.marca?.toLowerCase() === 'kaeser' ? '' : ' kaeser-tipo-badge--outro'}`}
                          title={`Próxima manutenção ${maq.marca?.toLowerCase() === 'kaeser' ? 'KAESER' : 'compressor'}: Tipo ${tipoKaeserNaPosicao(maq.posicaoKaeser)}`}
                        >
                          {maq.marca?.toLowerCase() === 'kaeser' ? 'KAESER' : maq.marca} {tipoKaeserNaPosicao(maq.posicaoKaeser)}
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

                    {/* Linha 4: série */}
                    <div className="mc-info">
                      {maq?.numeroSerie && <span className="mc-serie">Nº {maq.numeroSerie}</span>}
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
                        {isConcluida && rel?.assinadoPeloCliente && (
                          <button className="icon-btn secondary" onClick={() => setModalRelatorio(m)} title="Ver relatório"><FileText size={15} /></button>
                        )}
                        {isConcluida && rel && !rel.assinadoPeloCliente && (
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
                              {isConcluida && rel && (
                                <>
                                  <button onClick={() => handleAbrirPdf(m, maq, rel, sub, cliente)}><FileDown size={14} /> PDF</button>
                                  <button onClick={() => abrirModalEmail(m)}><Mail size={14} /> Enviar email</button>
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
          <table className="data-table">
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
                <th className="col-dias">Dias</th>
                <th>Equipamento</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Técnico</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaParaMostrar.map(m => {
                  const maq = getMaquina(m.maquinaId)
                  const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
                  const desc = maq ? `${sub?.nome || ''} — ${maq.marca} ${maq.modelo}`.trim() || 'N/A' : 'N/A'
                  const rel = getRelatorioByManutencao(m.id)
                  const dataExecucao = rel?.dataAssinatura || rel?.dataCriacao
                  const isConcluida = m.status === 'concluida'
                  const dias = isConcluida ? null : calcDiasAtraso(m.data)
                  return (
                    <tr key={m.id} className={bulkMode && selectedIds.has(m.id) ? 'bulk-row-selected' : ''}>
                      {bulkMode && (
                        <td className="col-bulk-check">
                          {!isConcluida && (m.status === 'pendente' || m.status === 'agendada') ? (
                            <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} />
                          ) : <span />}
                        </td>
                      )}
                      <td data-label="Dias" className={`col-dias-val ${dias > 0 ? 'dias-atraso' : dias === 0 ? 'dias-hoje' : 'dias-futuro'}`}>
                        {dias != null ? (dias > 0 ? `+${dias}` : dias === 0 ? 'Hoje' : `${dias}`) : '—'}
                      </td>
                      <td data-label="Equipamento">
                        <div className="equip-desc-block">
                          <strong>{desc}</strong>
                          <span className="text-muted equip-num-serie">Nº Série: {maq?.numeroSerie}</span>
                        </div>
                      </td>
                      <td data-label="Cliente">{getCliente(maq?.clienteNif)?.nome || '—'}</td>
                      <td data-label="Tipo">
                        <span>{m.tipo === 'montagem' ? 'Montagem' : 'Manutenção Periódica'}</span>
                        {isConcluida && rel?.numeroRelatorio && (
                          <span className="num-servico" title="Número de serviço">{rel.numeroRelatorio}</span>
                        )}
                      </td>
                      <td data-label="Data">
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
                      <td data-label="Técnico">{m.tecnico || (isConcluida && rel?.tecnico) || 'Não atribuído'}</td>
                      <td data-label="Status" className="col-status">
                        <span className={`badge badge-${isConcluida ? 'concluida' : getDisplayStatus(m)}`}>
                          {statusLabel[isConcluida ? 'concluida' : getDisplayStatus(m)]}
                        </span>
                        {isHistorico(m) && <span className="badge badge-historico"><Archive size={10} /> Histórico</span>}
                        {isPendenteAssinatura(m) && <span className="badge badge-pendente-assinatura">Pend. assinatura</span>}
                        {!canEditManutencao(m.id) && (
                          <span className="badge-assinado" title="Assinado pelo cliente"><Lock size={12} /> Assinado</span>
                        )}
                      </td>
                      <td className="actions" data-label="">
                        <div className="actions-inner">
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
                          {rel?.fotos?.length > 0 && (
                            <button className="icon-btn secondary" onClick={() => setModalFotos({ fotos: rel.fotos })} title="Fotografias registadas"><Paperclip size={16} /></button>
                          )}
                          {isConcluida && rel && (
                            <>
                              <button className="icon-btn secondary" onClick={() => handleAbrirPdf(m, maq, rel, sub, getCliente(maq?.clienteNif))} title="Obter PDF do relatório"><FileDown size={16} /></button>
                              <button className="icon-btn secondary" onClick={() => abrirModalEmail(m)} title="Enviar relatório por email"><Mail size={16} /></button>
                            </>
                          )}
                          {isConcluida && rel?.assinadoPeloCliente && (
                            <button className="icon-btn secondary" onClick={() => setModalRelatorio(m)} title="Ver manutenção"><FileText size={16} /></button>
                          )}
                          {isConcluida && rel && !rel.assinadoPeloCliente && (
                            <button className="icon-btn secondary" onClick={() => setModalRecolherAssinatura({ manutencao: m, maquina: getMaquina(m.maquinaId) })} title="Recolher assinatura do cliente"><FileSignature size={16} /></button>
                          )}
                          {isConcluida && !rel && (
                            <button className="icon-btn secondary" onClick={() => setModalRecolherAssinatura({ manutencao: m, maquina: getMaquina(m.maquinaId) })} title="Registar assinatura"><FileSignature size={16} /></button>
                          )}
                          {canEditManutencao(m.id) ? (
                            <button className="icon-btn secondary" onClick={() => openEdit(m)} title="Editar"><Pencil size={16} /></button>
                          ) : (
                            <span className="icon-btn readonly" title="Manutenção assinada"><Lock size={16} /></span>
                          )}
                          {canDeleteManutencao(m.id) && (
                            <button className="icon-btn danger" onClick={() => setModalConfirmDelete(m)} title="Eliminar"><Trash2 size={16} /></button>
                          )}
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
                    </select>
                    <span className="form-hint">Para marcar como executada, use o botão ▶ Executar</span>
                  </label>
                  {temContadorHoras(getMaquina(form.maquinaId)?.subcategoriaId) && (
                    <div className="form-row">
                      <label>
                        Horas totais (contador)
                        <input type="number" min={0} step={1} value={form.horasTotais}
                          onChange={e => setForm(f => ({ ...f, horasTotais: e.target.value }))} placeholder="Ex: 1250" />
                      </label>
                      <label>
                        Horas de serviço
                        <input type="number" min={0} step={1} value={form.horasServico}
                          onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))} placeholder="Ex: 1180" />
                      </label>
                    </div>
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
