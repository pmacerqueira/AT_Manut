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
import { TIPOS_DOCUMENTO, SUBCATEGORIAS_COM_CONTADOR_HORAS, SUBCATEGORIAS_COMPRESSOR, tipoKaeserNaPosicao } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import SignaturePad from '../components/SignaturePad'
import RelatorioView from '../components/RelatorioView'
import ExecutarManutencaoModal from '../components/ExecutarManutencaoModal'
import { Plus, Pencil, Trash2, Lock, FileSignature, FileText, FolderOpen, Paperclip, X, CheckCircle, Wrench, Play, FileDown, ArrowLeft, Mail, Zap, Clock } from 'lucide-react'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import { getHojeAzores, formatDataHoraCurtaAzores, formatDataAzores } from '../utils/datasAzores'
import { safeHttpUrl } from '../utils/sanitize'
import { pt } from 'date-fns/locale'
import { relatorioParaHtml } from '../utils/relatorioHtml'
import { abrirPdfRelatorio, imprimirOuGuardarPdf } from '../utils/gerarPdfRelatorio'
import { enviarRelatorioEmail } from '../services/emailService'
import { logger } from '../utils/logger'
import './Manutencoes.css'

const statusLabel = { pendente: 'Pendente', agendada: 'Agendada', concluida: 'Executada', em_progresso: 'Em progresso', emAtraso: 'Em atraso', proxima: 'Próxima' }

const getDisplayStatus = (m) => {
  if (m.status === 'concluida')    return 'concluida'
  if (m.status === 'em_progresso') return 'em_progresso'
  const dataManut = startOfDay(new Date(m.data))
  const hoje = startOfDay(new Date())
  return isBefore(dataManut, hoje) ? 'emAtraso' : 'proxima'
}

export default function Manutencoes() {
  const {
    clientes,
    maquinas,
    manutencoes,
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
  } = useData()
  const { canDelete, canEditManutencao, isAdmin } = usePermissions()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const location = useLocation()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [modalAssinatura, setModalAssinatura] = useState(null)
  const [modalRelatorio, setModalRelatorio] = useState(null)
  const [modalExecucao, setModalExecucao] = useState(null)
  const [modalFotos, setModalFotos] = useState(null) // { fotos: string[] }
  const [modalEmail, setModalEmail] = useState(null) // { manutencao, maquina, rel, sub, cliente }
  const [emailDestino, setEmailDestino] = useState('')
  const [emailEnviando, setEmailEnviando] = useState(false)
  const [form, setForm] = useState({ maquinaId: '', tipo: 'periodica', data: '', tecnico: '', status: 'pendente', observacoes: '', horasTotais: '', horasServico: '' })
  const [formAssinatura, setFormAssinatura] = useState({ checklistRespostas: {}, notas: '', nomeAssinante: '', assinaturaDigital: null })
  const [erroChecklistAssinatura, setErroChecklistAssinatura] = useState('')

  const STORAGE_KEY = 'atmanut_manutencoes_filter'

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

  const manutencoesPendentes = useMemo(() =>
    manutencoes.filter(m => m.status === 'pendente' || m.status === 'agendada'),
  [manutencoes])

  const manutencoesExecutadas = useMemo(() =>
    manutencoes.filter(m => m.status === 'concluida'),
  [manutencoes])


  const temContadorHoras = (subcategoriaId) => SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(subcategoriaId)

  const openAdd = () => {
    const hoje = getHojeAzores()
    setForm({
      maquinaId: maquinas[0]?.id || '',
      tipo: 'periodica',
      data: hoje,
      tecnico: '',
      status: 'pendente',
      observacoes: '',
      horasTotais: '',
      horasServico: '',
    })
    setModal('add')
  }

  const openEdit = (m) => {
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
    })
    setModal('edit')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const { equipamentoId, maquinaId, ...rest } = form
    const mId = maquinaId ?? equipamentoId
    const payload = { ...rest, maquinaId: mId }
    const maq = getMaquina(mId)
    const updateMaqData = {}
    if (form.status === 'concluida') {
      const dias = getIntervaloDiasByMaquina(maq)
      const proxima = addDays(new Date(form.data), dias)
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
    }
    setModal(null)
  }

  const openAssinatura = (m) => {
    const rel = getRelatorioByManutencao(m.id)
    const maq = getMaquina(m.maquinaId)
    const items = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m.tipo || 'periodica') : []
    const checklistRespostas = {}
    items.forEach(it => {
      checklistRespostas[it.id] = rel?.checklistRespostas?.[it.id] ?? ''
    })
    setFormAssinatura({
      checklistRespostas: rel?.checklistRespostas ?? checklistRespostas,
      notas: (rel?.notas ?? '').slice(0, 300),
      nomeAssinante: rel?.nomeAssinante ?? '',
      assinaturaDigital: rel?.assinaturaDigital ?? null,
    })
    setErroChecklistAssinatura('')
    setModalAssinatura(m)
  }

  const handleAssinaturaSubmit = (e) => {
    e.preventDefault()
    setErroChecklistAssinatura('')
    const m = modalAssinatura
    const maq = getMaquina(m.maquinaId)
    const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m.tipo || 'periodica') : []
    const todasMarcadas = checklistItems.length === 0 || checklistItems.every(it =>
      formAssinatura.checklistRespostas[it.id] === 'sim' || formAssinatura.checklistRespostas[it.id] === 'nao'
    )
    if (!todasMarcadas) {
      setErroChecklistAssinatura('Todas as linhas da checklist devem ser verificadas pelo utilizador.')
      return
    }
    const now = new Date().toISOString()
    const rel = getRelatorioByManutencao(m.id)
    const payload = {
      checklistRespostas: formAssinatura.checklistRespostas,
      notas: formAssinatura.notas.slice(0, 300),
      nomeAssinante: formAssinatura.nomeAssinante.trim(),
      assinaturaDigital: formAssinatura.assinaturaDigital,
      dataAssinatura: now,
      assinadoPeloCliente: true,
    }
    if (rel) {
      updateRelatorio(rel.id, payload)
    } else {
      addRelatorio({
        manutencaoId: m.id,
        dataCriacao: now,
        ...payload,
      })
    }
    setModalAssinatura(null)
  }

  // Data de hoje como string estável para dependências de useMemo (só muda uma vez por dia)
  const hojeStr = getHojeAzores()
  const hoje = startOfDay(new Date())

  // ── Listas filtradas e ordenadas (memoizadas) ───────────────────────────
  // Em atraso: data < hoje (não executadas até ontem)
  const manutencoesEmAtraso = useMemo(() =>
    manutencoesPendentes
      .filter(m => isBefore(startOfDay(new Date(m.data)), hoje))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
  [manutencoesPendentes, hojeStr])

  // Próximas: data >= hoje (hoje e dias seguintes)
  const manutencoesProximas = useMemo(() =>
    manutencoesPendentes
      .filter(m => !isBefore(startOfDay(new Date(m.data)), hoje))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
  [manutencoesPendentes, hojeStr])

  const manutencoesExecutadasOrdenadas = useMemo(() =>
    [...manutencoesExecutadas].sort((a, b) => {
      const relA = getRelatorioByManutencao(a.id)
      const relB = getRelatorioByManutencao(b.id)
      const dA = relA?.dataAssinatura || relA?.dataCriacao || a.data
      const dB = relB?.dataAssinatura || relB?.dataCriacao || b.data
      return new Date(dB).getTime() - new Date(dA).getTime()
    }),
  [manutencoesExecutadas, getRelatorioByManutencao])

  // Ordenação padrão: em atraso primeiro, depois por data asc
  const manutencoesOrdenadas = useMemo(() =>
    [...manutencoesPendentes].sort((a, b) => {
      const statusA = getDisplayStatus(a)
      const statusB = getDisplayStatus(b)
      if (statusA === 'emAtraso' && statusB !== 'emAtraso') return -1
      if (statusA !== 'emAtraso' && statusB === 'emAtraso') return 1
      return new Date(a.data).getTime() - new Date(b.data).getTime()
    }),
  [manutencoesPendentes, hojeStr])

  const handleEnviarEmail = async (e) => {
    e.preventDefault()
    if (!modalEmail) return
    setEmailEnviando(true)
    showGlobalLoading()
    try {
      const { manutencao: m, maquina: maq, rel, sub, cliente } = modalEmail
      const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m.tipo || 'periodica') : []
      const resultado = await enviarRelatorioEmail({
        emailDestinatario: emailDestino,
        relatorio: rel,
        manutencao: m,
        maquina: maq,
        cliente,
        checklistItems,
        subcategoriaNome: sub?.nome || '',
        logoUrl: `${import.meta.env.BASE_URL}logo.png`,
      })
      if (resultado?.ok) {
        showToast(`Email enviado para ${emailDestino}.`, 'success')
        setModalEmail(null)
        setEmailDestino('')
      } else {
        showToast(resultado?.message || 'Erro ao enviar email.', 'error', 4000)
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
      const html = relatorioParaHtml(rel, m, maq, cliente, checklistItems, {
        subcategoriaNome: sub?.nome,
        ultimoEnvio: rel.ultimoEnvio,
        logoUrl: `${import.meta.env.BASE_URL}logo.png`,
      })
      await abrirPdfRelatorio({
        relatorio: rel,
        manutencao: m,
        maquina: maq,
        cliente,
        checklistItems,
        subcategoriaNome: sub?.nome ?? '',
        html,
      })
    } finally {
      hideGlobalLoading()
    }
  }

  const abrirModalEmail = (m) => {
    const maq = getMaquina(m.maquinaId)
    const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
    const rel = getRelatorioByManutencao(m.id)
    const cliente = getCliente(maq?.clienteNif)
    setEmailDestino(cliente?.email || '')
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
    subtituloPagina = 'Lista das manutenções em atraso e próximas'
  }

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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!filter && (
            <button
              type="button"
              className="secondary"
              onClick={() => setMostrarTodasWithStorage(v => !v)}
            >
              {mostrarTodas ? 'Ocultar executadas' : `Ver todas (${manutencoesExecutadas.length})`}
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={openAdd}>
              <Plus size={18} /> Nova manutenção
            </button>
          )}
        </div>
      </div>

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
              const equipNome   = maq ? `${maq.marca} ${maq.modelo}` : 'N/A'
              const equipSub    = sub?.nome || ''

              return (
                <div key={m.id} className={`mc mc-${st}`}>
                  {/* Faixa de status lateral */}
                  <div className="mc-strip" />

                  <div className="mc-body">
                    {/* Linha 1: tipo + badge + número + badge KAESER */}
                    <div className="mc-top">
                      <span className={`badge badge-${st}`}>{statusLabel[st]}</span>
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
                          onClick={() => setModalExecucao({ manutencao: m, maquina: maq })}
                        >
                          <Play size={14} /> Executar
                        </button>
                      )}
                      <div className="mc-icons">
                        {rel?.fotos?.length > 0 && (
                          <button className="icon-btn secondary" onClick={() => setModalFotos({ fotos: rel.fotos })} title="Fotografias registadas"><Paperclip size={15} /></button>
                        )}
                        {isConcluida && rel && (
                          <>
                            <button className="icon-btn secondary" onClick={() => handleAbrirPdf(m, maq, rel, sub, cliente)} title="Obter PDF"><FileDown size={15} /></button>
                            <button className="icon-btn secondary" onClick={() => abrirModalEmail(m)} title="Enviar email"><Mail size={15} /></button>
                          </>
                        )}
                        {isConcluida && (rel?.assinadoPeloCliente ? (
                          <button className="icon-btn secondary" onClick={() => setModalRelatorio(m)} title="Ver manutenção"><FileText size={15} /></button>
                        ) : (
                          <button className="icon-btn secondary" onClick={() => openAssinatura(m)} title="Assinar"><FileSignature size={15} /></button>
                        ))}
                        {canEditManutencao(m.id) ? (
                          <button className="icon-btn secondary" onClick={() => openEdit(m)} title="Editar"><Pencil size={15} /></button>
                        ) : (
                          <span className="icon-btn readonly" title="Assinado"><Lock size={15} /></span>
                        )}
                        {canDelete && (
                          <button className="icon-btn danger" onClick={() => removeManutencao(m.id)} title="Eliminar"><Trash2 size={15} /></button>
                        )}
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
                  return (
                    <tr key={m.id}>
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
                        {!canEditManutencao(m.id) && (
                          <span className="badge-assinado" title="Assinado pelo cliente"><Lock size={12} /> Assinado</span>
                        )}
                      </td>
                      <td className="actions" data-label="">
                        <div className="actions-inner">
                          {!isConcluida && (m.status === 'pendente' || m.status === 'agendada') && (
                            <button className="icon-btn btn-iniciar-manut" onClick={() => iniciarManutencao(m.id)} title="Iniciar manutenção (registar início)">
                              <Zap size={16} />
                            </button>
                          )}
                          {!isConcluida && (m.status === 'pendente' || m.status === 'agendada' || m.status === 'em_progresso') && (
                            <button className="icon-btn btn-executar-manut" onClick={() => setModalExecucao({ manutencao: m, maquina: getMaquina(m.maquinaId) })} title="Executar / concluir manutenção">
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
                          {isConcluida && (rel?.assinadoPeloCliente ? (
                            <button className="icon-btn secondary" onClick={() => setModalRelatorio(m)} title="Ver manutenção"><FileText size={16} /></button>
                          ) : (
                            <button className="icon-btn secondary" onClick={() => openAssinatura(m)} title="Registar assinatura"><FileSignature size={16} /></button>
                          ))}
                          {canEditManutencao(m.id) ? (
                            <button className="icon-btn secondary" onClick={() => openEdit(m)} title="Editar"><Pencil size={16} /></button>
                          ) : (
                            <span className="icon-btn readonly" title="Manutenção assinada"><Lock size={16} /></span>
                          )}
                          {canDelete && (
                            <button className="icon-btn danger" onClick={() => removeManutencao(m.id)} title="Eliminar"><Trash2 size={16} /></button>
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

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Nova manutenção' : 'Editar manutenção'}</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Máquina
                <select
                  required
                  value={form.maquinaId}
                  onChange={e => setForm(f => ({ ...f, maquinaId: e.target.value }))}
                >
                  {maquinas.map(maq => {
                    const sub = getSubcategoria(maq.subcategoriaId)
                    return (
                      <option key={maq.id} value={maq.id}>{sub?.nome || ''} — {maq.marca} {maq.modelo} — {maq.numeroSerie}</option>
                    )
                  })}
                </select>
              </label>
              <label>
                Data
                <input
                  type="date"
                  required
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                />
              </label>
              <label className="form-tecnico-destaque">
                Técnico responsável <span className="form-tecnico-hint">(recomendado atribuir ao agendar)</span>
                <input
                  value={form.tecnico}
                  onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))}
                  placeholder="Ex: Aurélio Almeida, Paulo Medeiros..."
                />
              </label>
              {modal === 'edit' && (
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="agendada">Agendada</option>
                    <option value="em_progresso">Em progresso</option>
                    <option value="concluida">Executada</option>
                  </select>
                </label>
              )}
              {temContadorHoras(getMaquina(form.maquinaId)?.subcategoriaId) && (
                <div className="form-row">
                  <label>
                    Horas totais (contador)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.horasTotais}
                      onChange={e => setForm(f => ({ ...f, horasTotais: e.target.value }))}
                      placeholder="Ex: 1250"
                    />
                  </label>
                  <label>
                    Horas de serviço
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.horasServico}
                      onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
                      placeholder="Ex: 1180"
                    />
                  </label>
                </div>
              )}
              <label>
                Observações
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Notas da manutenção..."
                />
              </label>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit">
                  {modal === 'add' ? 'Agendar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAssinatura && (() => {
        const maq = getMaquina(modalAssinatura.maquinaId)
        const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, modalAssinatura.tipo || 'periodica') : []
        return (
          <div className="modal-overlay" onClick={() => setModalAssinatura(null)}>
            <div className="modal modal-assinatura modal-relatorio-form" onClick={e => e.stopPropagation()}>
              <h2>Preencher relatório e registar assinatura</h2>
              <p className="modal-hint">
                Preencha o checklist (Sim/Não), notas importantes e a assinatura do cliente.
              </p>
              {(maq?.documentos ?? []).length > 0 && (
                <div className="doc-links-inline">
                  <FolderOpen size={14} />
                  {maq.documentos.map(d => {
                    const tipoLabel = TIPOS_DOCUMENTO.find(t => t.id === d.tipo)?.label ?? d.tipo
                    return (
                      <a key={d.id} href={safeHttpUrl(d.url)} target="_blank" rel="noopener noreferrer" className="doc-link-inline" title={d.titulo}>
                        {tipoLabel}
                      </a>
                    )
                  })}
                </div>
              )}
              <form onSubmit={handleAssinaturaSubmit}>
                {erroChecklistAssinatura && (
                  <p className="form-erro">{erroChecklistAssinatura}</p>
                )}
                {checklistItems.length > 0 && (
                  <div className="form-section">
                    <h3>Checklist de verificação</h3>
                    <div className="checklist-respostas">
                      {checklistItems.map((item, i) => (
                        <div key={item.id} className="checklist-item-row">
                          <span className="checklist-item-num">{i + 1}.</span>
                          <span className="checklist-item-texto">{item.texto}</span>
                          <div className="checklist-item-btns">
                            <button
                              type="button"
                              className={`btn-simnao ${formAssinatura.checklistRespostas[item.id] === 'sim' ? 'active-sim' : ''}`}
                              onClick={() => setFormAssinatura(f => ({
                                ...f,
                                checklistRespostas: { ...f.checklistRespostas, [item.id]: 'sim' },
                              }))}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              className={`btn-simnao ${formAssinatura.checklistRespostas[item.id] === 'nao' ? 'active-nao' : ''}`}
                              onClick={() => setFormAssinatura(f => ({
                                ...f,
                                checklistRespostas: { ...f.checklistRespostas, [item.id]: 'nao' },
                              }))}
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <label className="form-section">
                  Notas importantes <span className="char-count">({formAssinatura.notas.length}/300)</span>
                  <textarea
                    value={formAssinatura.notas}
                    onChange={e => setFormAssinatura(f => ({ ...f, notas: e.target.value.slice(0, 300) }))}
                    rows={3}
                    maxLength={300}
                    placeholder="Escreva aqui notas relevantes da manutenção..."
                  />
                </label>
                <label>
                  Nome de quem assinou <span className="required">*</span>
                  <input
                    required
                    value={formAssinatura.nomeAssinante}
                    onChange={e => setFormAssinatura(f => ({ ...f, nomeAssinante: e.target.value }))}
                    placeholder="Ex: Carlos Silva (representante do cliente)"
                  />
                </label>
                <label>
                  Assinatura manuscrita do cliente
                  <SignaturePad
                    value={formAssinatura.assinaturaDigital}
                    onChange={sig => setFormAssinatura(f => ({ ...f, assinaturaDigital: sig }))}
                  />
                </label>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setModalAssinatura(null)}>Cancelar</button>
                  <button type="submit">Guardar relatório</button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

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

      {modalEmail && (
        <div className="modal-overlay" onClick={() => { setModalEmail(null); setEmailDestino('') }}>
          <div className="modal modal-email-envio" onClick={e => e.stopPropagation()}>
            <h2><Mail size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />Enviar relatório por email</h2>
            {modalEmail.rel?.numeroRelatorio && (
              <p className="modal-hint">Relatório <strong>{modalEmail.rel.numeroRelatorio}</strong> — {modalEmail.manutencao?.tipo === 'montagem' ? 'Montagem' : 'Manutenção Periódica'}</p>
            )}
            <form onSubmit={handleEnviarEmail}>
              <label>
                Endereço de email do destinatário <span className="required">*</span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={emailDestino}
                  onChange={e => setEmailDestino(e.target.value)}
                  placeholder="cliente@empresa.pt"
                  disabled={emailEnviando}
                />
              </label>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => { setModalEmail(null); setEmailDestino('') }} disabled={emailEnviando}>
                  Cancelar
                </button>
                <button type="submit" disabled={emailEnviando || !emailDestino.trim()}>
                  {emailEnviando ? 'A enviar…' : <><Mail size={16} /> Enviar email</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
