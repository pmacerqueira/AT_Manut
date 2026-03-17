import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, TIPOS_DOCUMENTO, SUBCATEGORIAS_COMPRESSOR } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import MaquinaFormModal from '../components/MaquinaFormModal'
import PecasPlanoModal from '../components/PecasPlanoModal'
import DocumentacaoModal from '../components/DocumentacaoModal'
import RelatorioView from '../components/RelatorioView'
import EnviarEmailModal from '../components/EnviarEmailModal'
import EnviarDocumentoModal from '../components/EnviarDocumentoModal'
import { Plus, Pencil, Trash2, FolderPlus, ChevronRight, ChevronLeft, ArrowLeft, ExternalLink, Mail, Search, FileBarChart, Play, Calendar, QrCode, FileDown, Send, Eye, X } from 'lucide-react'
import { gerarRelatorioFrotaPdf } from '../utils/gerarRelatorioFrota'
import { gerarHtmlHistoricoMaquina } from '../utils/gerarHtmlHistoricoMaquina'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useDebounce } from '../hooks/useDebounce'
import { safeHttpUrl } from '../utils/sanitize'
import { format, isBefore, startOfDay } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useToast } from '../components/Toast'
import { logger } from '../utils/logger'
import { enviarRelatorioHtmlEmail } from '../services/emailService'
import { getHojeAzores, parseDateLocal } from '../utils/datasAzores'
import ContentLoader from '../components/ContentLoader'
import { useDeferredReady } from '../hooks/useDeferredReady'
import '../components/PecasPlanoModal.css'
import './Clientes.css'

const statusLabel = { pendente: 'Pendente', agendada: 'Agendada', concluida: 'Executada' }
const PAGE_SIZE = 25

export default function Clientes() {
  const {
    clientes,
    maquinas,
    manutencoes,
    relatorios,
    reparacoes,
    tecnicos,
    addCliente,
    updateCliente,
    removeCliente,
    clearAllClientesAndRelated,
    getSubcategoria,
    getCategoria,
    getChecklistBySubcategoria,
    getRelatorioByManutencao,
    getTecnicoByNome,
  } = useData()
  const contentReady = useDeferredReady(clientes.length >= 0)
  const { canDelete, canEditCliente, canAddCliente, isAdmin } = usePermissions()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [fichaCliente, setFichaCliente] = useState(null)
  const [fichaView, setFichaViewRaw] = useState('categorias')
  const [prevFichaView, setPrevFichaView] = useState(null)
  const setFichaView = (v) => { setPrevFichaView(fichaView); setFichaViewRaw(v) }
  const [fichaCategoria, setFichaCategoria] = useState(null)
  const [fichaSubcategoria, setFichaSubcategoria] = useState(null)
  const [fichaMaquina, setFichaMaquina] = useState(null)
  const [modalMaquina, setModalMaquina] = useState(null)
  const [modalPecasAuto, setModalPecasAuto] = useState(null) // auto-aberto ao criar compressor KAESER
  const [modalDoc, setModalDoc] = useState(null)
  const [modalRelatorio, setModalRelatorio] = useState(null)
  const [modalEmail, setModalEmail] = useState(null)
  const [modalDocumentoEmail, setModalDocumentoEmail] = useState(null)
  const [modalFrota, setModalFrota] = useState(null) // { cliente, manusFiltradas, repsFiltradas, options }
  const [modalFrotaFiltro, setModalFrotaFiltro] = useState(null) // { cliente }
  const [frotaDataInicio, setFrotaDataInicio] = useState('')
  const [frotaDataFim, setFrotaDataFim] = useState('')
  const [frotaEmailPane, setFrotaEmailPane] = useState(false)
  const [frotaEmailCliente, setFrotaEmailCliente] = useState(false)
  const [frotaEmailAdmin, setFrotaEmailAdmin] = useState(true)
  const [frotaEmailOutro, setFrotaEmailOutro] = useState('')
  const [frotaAcaoLoading, setFrotaAcaoLoading] = useState(null) // 'html' | 'pdf' | 'email' | null
  const [form, setForm] = useState({ nif: '', nome: '', morada: '', codigoPostal: '', localidade: '', telefone: '', email: '' })
  const [erro, setErro] = useState('')
  const [searchCliente, setSearchCliente] = useState('')
  const searchClienteDebounced = useDebounce(searchCliente, 250)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [searchClienteDebounced])

  const [modalConfirmDeleteCliente, setModalConfirmDeleteCliente] = useState(null)
  // ── Modal eliminar todos ────────────────────────────────────────────────────
  const [modalEliminarTodos, setModalEliminarTodos] = useState(false)

  const handleEliminarTodosConfirm = async () => {
    setModalEliminarTodos(false)
    showGlobalLoading()
    try {
      await clearAllClientesAndRelated()
      showToast('Todos os clientes e dados relacionados foram eliminados.', 'success')
    } catch (err) {
      logger.error('Clientes', 'handleEliminarTodosConfirm', err?.message || 'Erro ao eliminar', { stack: err?.stack?.slice(0, 400) })
      showToast('Erro ao eliminar. Verifique a ligação e tente novamente.', 'error', 4000)
    } finally {
      hideGlobalLoading()
    }
  }

  const openAdd = () => {
    setForm({ nif: '', nome: '', morada: '', codigoPostal: '', localidade: '', telefone: '', email: '' })
    setErro('')
    setModal('add')
  }

  const openEdit = (c) => {
    setForm({ nif: c.nif, nome: c.nome, morada: c.morada || '', codigoPostal: c.codigoPostal || '', localidade: c.localidade || '', telefone: c.telefone || '', email: c.email || '' })
    setErro('')
    setModal('edit')
  }

  const openFicha = (c) => {
    setFichaCliente(c)
    setFichaView('categorias')
    setFichaCategoria(null)
    setFichaSubcategoria(null)
    setFichaMaquina(null)
    setForm({ nif: c.nif, nome: c.nome, morada: c.morada || '', codigoPostal: c.codigoPostal || '', localidade: c.localidade || '', telefone: c.telefone || '', email: c.email || '' })
    setModal('ficha')
  }

  const closeFicha = () => {
    setModal(null)
    setFichaCliente(null)
    setFichaView('categorias')
    setFichaCategoria(null)
    setFichaSubcategoria(null)
    setFichaMaquina(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErro('')
    if (!form.email?.trim()) {
      setErro('O email do cliente é obrigatório para envio de lembretes e relatórios.')
      return
    }
    if (modal === 'add') {
      const nif = addCliente(form)
      if (nif === null) { setErro('Já existe um cliente com este NIF.'); return }
      showToast('Cliente adicionado com sucesso.', 'success')
    } else {
      const { nif, ...data } = form
      updateCliente(nif, data)
      if (fichaCliente?.nif === nif) setFichaCliente(prev => prev ? { ...prev, ...data } : null)
      showToast('Dados do cliente actualizados.', 'success')
    }
    if (modal !== 'ficha') setModal(null)
  }

  const getMaquinasCount = (nif) => maquinas.filter(m => m.clienteNif === nif).length
  const getMaquinasDoCliente = (nif) => maquinas.filter(m => m.clienteNif === nif)

  const handleAbrirFiltroFrota = (cliente) => {
    const maqsCliente = getMaquinasDoCliente(cliente.nif)
    if (maqsCliente.length === 0) {
      showToast('Este cliente não tem equipamentos registados.', 'warning')
      return
    }
    setFrotaDataInicio('')
    setFrotaDataFim('')
    setModalFrotaFiltro({ cliente })
  }

  const handleGerarFrotaComFiltro = async (e) => {
    e.preventDefault()
    const { cliente } = modalFrotaFiltro
    const maqsCliente = getMaquinasDoCliente(cliente.nif)
    const inicio = frotaDataInicio || null
    const fim = frotaDataFim || new Date().toISOString().slice(0, 10)

    const filtraPorData = (arr) => (arr ?? []).filter(item => {
      const d = item.data
      if (!d) return true
      if (inicio && d < inicio) return false
      if (d > fim) return false
      return true
    })
    const manusFiltradas = filtraPorData(manutencoes)
    const repsFiltradas = filtraPorData(reparacoes)

    const fmtD = (s) => s ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : null
    const periodoLabel = inicio
      ? `${fmtD(inicio)} a ${fmtD(fim)}`
      : `Até ${fmtD(fim)}`
    const options = { periodoLabel, periodoCustom: true }

    setModalFrotaFiltro(null)
    setFrotaEmailPane(false)
    setFrotaEmailCliente(!!cliente.email)
    setFrotaEmailAdmin(true)
    setFrotaEmailOutro('')
    setFrotaAcaoLoading(null)
    setModalFrota({ cliente, manusFiltradas, repsFiltradas, options })
  }

  const closeFrotaModal = () => {
    setModalFrota(null)
    setFrotaEmailPane(false)
  }

  const handleDownloadPdfManutencao = async (manut, rel, maquina, cliente) => {
    showGlobalLoading()
    try {
      const { gerarPdfCompacto } = await import('../utils/gerarPdfRelatorio')
      const checklistItems = getChecklistBySubcategoria(maquina.subcategoriaId, manut.tipo || 'periodica')
      const sub = getSubcategoria(maquina.subcategoriaId)
      const blob = await gerarPdfCompacto({
        relatorio: rel,
        manutencao: manut,
        maquina,
        cliente,
        checklistItems,
        subcategoriaNome: sub?.nome ?? '',
        tecnicoObj: getTecnicoByNome(manut.tecnico || rel?.tecnico),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_${rel.numeroRelatorio ?? manut.id}_${manut.data}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      showToast('PDF transferido.', 'success')
    } catch (err) {
      showToast('Erro ao gerar PDF.', 'error', 4000)
      logger.error('Clientes', 'downloadPdfManutencao', err.message, { manutId: manut.id })
    } finally {
      hideGlobalLoading()
    }
  }

  const handleAbrirFrotaHtml = async () => {
    const cli = modalFrota.cliente
    setFrotaAcaoLoading('html')
    try {
      const maqsCliente = getMaquinasDoCliente(cli.nif)
      const { gerarRelatorioFrotaHtml } = await import('../utils/gerarRelatorioFrotaHtml')
      const html = gerarRelatorioFrotaHtml(
        cli, maqsCliente, modalFrota.manusFiltradas ?? manutencoes,
        relatorios ?? [], modalFrota.repsFiltradas ?? reparacoes ?? [],
        getSubcategoria, getCategoria,
        { logoUrl: `${import.meta.env.BASE_URL}logo-navel.png`, ...(modalFrota.options ?? {}) }
      )
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      showToast('Erro ao gerar relatório HTML.', 'error', 4000)
      logger.error('Clientes', 'abrirFrotaHtml', err.message, { nif: cli.nif })
    } finally {
      setFrotaAcaoLoading(null)
    }
  }

  const handleGravarFrotaPdf = async () => {
    const cli = modalFrota.cliente
    setFrotaAcaoLoading('pdf')
    try {
      const maqsCliente = getMaquinasDoCliente(cli.nif)
      const blob = await gerarRelatorioFrotaPdf(
        cli, maqsCliente, modalFrota.manusFiltradas ?? manutencoes,
        relatorios ?? [], modalFrota.repsFiltradas ?? reparacoes ?? [],
        getSubcategoria, getCategoria, modalFrota.options ?? {}
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `frota_${cli.nif}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      showToast('PDF transferido.', 'success')
    } catch (err) {
      showToast('Erro ao gerar PDF.', 'error', 4000)
      logger.error('Clientes', 'gravarFrotaPdf', err.message, { nif: cli.nif })
    } finally {
      setFrotaAcaoLoading(null)
    }
  }

  const handleEnviarFrotaEmail = async (e) => {
    e.preventDefault()
    const cli = modalFrota.cliente
    const dests = new Set()
    if (frotaEmailCliente && cli.email) dests.add(cli.email.trim())
    if (frotaEmailAdmin) dests.add('comercial@navel.pt')
    frotaEmailOutro.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean).forEach(s => dests.add(s))
    if (dests.size === 0) { showToast('Seleccione pelo menos um destinatário.', 'warning'); return }

    setFrotaAcaoLoading('email')
    try {
      const maqsCliente = getMaquinasDoCliente(cli.nif)
      const { gerarRelatorioFrotaHtml } = await import('../utils/gerarRelatorioFrotaHtml')
      const html = gerarRelatorioFrotaHtml(
        cli, maqsCliente, modalFrota.manusFiltradas ?? manutencoes,
        relatorios ?? [], modalFrota.repsFiltradas ?? reparacoes ?? [],
        getSubcategoria, getCategoria,
        { logoUrl: `${import.meta.env.BASE_URL}logo-navel.png`, ...(modalFrota.options ?? {}) }
      )
      const periodo = modalFrota.options?.periodoLabel || new Date().getFullYear()
      const assunto = `Relatório Executivo de Frota — ${periodo} — ${cli.nome} — Navel`
      let erros = 0
      for (const dest of dests) {
        const result = await enviarRelatorioHtmlEmail({ destinatario: dest, assunto, html, nomeCliente: cli.nome })
        if (!result.ok) { erros++; logger.error('Clientes', 'enviarFrotaEmail', result.message, { dest }) }
      }
      if (erros === 0) {
        showToast(`Relatório enviado para ${dests.size} destinatário(s).`, 'success')
        closeFrotaModal()
      } else {
        showToast(`${erros} envio(s) falharam. Verifique os logs.`, 'error', 4000)
      }
    } catch (err) {
      showToast('Erro ao enviar relatório de frota por email.', 'error', 4000)
      logger.error('Clientes', 'enviarFrotaEmail', err.message, { nif: cli.nif })
    } finally {
      setFrotaAcaoLoading(null)
    }
  }

  const maquinasCliente = fichaCliente ? getMaquinasDoCliente(fichaCliente.nif) : []

  const fichaKpis = useMemo(() => {
    if (!maquinasCliente.length) return null
    const hoje = startOfDay(new Date(getHojeAzores()))
    let emAtraso = 0, conformes = 0, semData = 0
    for (const m of maquinasCliente) {
      if (!m.proximaManut) { semData++; continue }
      if (isBefore(startOfDay(parseDateLocal(m.proximaManut)), hoje)) emAtraso++
      else conformes++
    }
    return { total: maquinasCliente.length, emAtraso, conformes, semData }
  }, [maquinasCliente])

  const categoriasComMaquinas = maquinasCliente.reduce((acc, m) => {
    const sub = getSubcategoria(m.subcategoriaId)
    const cat = sub ? getCategoria(sub.categoriaId) : null
    if (cat && !acc.find(c => c.id === cat.id)) acc.push(cat)
    return acc
  }, []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))

  const subcategoriasComMaquinas = fichaCategoria
    ? maquinasCliente
        .filter(m => {
          const sub = getSubcategoria(m.subcategoriaId)
          return sub?.categoriaId === fichaCategoria.id
        })
        .reduce((acc, m) => {
          const sub = getSubcategoria(m.subcategoriaId)
          if (sub && !acc.find(s => s.id === sub.id)) acc.push(sub)
          return acc
        }, [])
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    : []

  const maquinasDaSubcategoria = fichaSubcategoria
    ? maquinasCliente.filter(m => m.subcategoriaId === fichaSubcategoria.id)
    : []

  const getManutencoesDaMaquina = (maquinaId) =>
    manutencoes.filter(m => m.maquinaId === maquinaId).sort((a, b) => parseDateLocal(b.data) - parseDateLocal(a.data))

  const renderProximaManut = (maq) => {
    if (!maq.proximaManut) return <span className="badge badge-sem-data">Sem data</span>
    const data = parseDateLocal(maq.proximaManut)
    const hoje = startOfDay(new Date(getHojeAzores() + 'T12:00:00'))
    const vencida = isBefore(startOfDay(data), hoje)
    return (
      <span className={`badge ${vencida ? 'badge-atraso' : 'badge-conforme'}`}>
        {format(data, 'd MMM yyyy', { locale: pt })}
      </span>
    )
  }

  const clientesFiltrados = useMemo(() => {
    const q = searchClienteDebounced.trim().toLowerCase()
    const lista = q
      ? (() => {
          const palavras = q.split(/\s+/).filter(Boolean)
          return clientes.filter(c => {
            const nifMatch = (c.nif || '').toLowerCase().includes(q)
            const nomeMatch = palavras.some(p => (c.nome || '').toLowerCase().includes(p))
            return nifMatch || nomeMatch
          })
        })()
      : clientes
    return [...lista].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
  }, [searchClienteDebounced, clientes])

  // Ao apagar clientes, voltar à página 1 se a página actual ficar vazia
  useEffect(() => {
    const total = Math.max(1, Math.ceil(clientesFiltrados.length / PAGE_SIZE))
    setPage(p => (p > total ? 1 : p))
  }, [clientesFiltrados.length])

  const totalPages = Math.max(1, Math.ceil(clientesFiltrados.length / PAGE_SIZE))
  const startIdx = (page - 1) * PAGE_SIZE
  const clientesPaginated = clientesFiltrados.slice(startIdx, startIdx + PAGE_SIZE)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>Clientes</h1>
          <p className="page-sub">Empresas e proprietários de equipamentos Navel</p>
        </div>
        <div className="page-header-actions">
          {isAdmin && clientes.length > 0 && (
            <button type="button" className="btn danger" onClick={() => setModalEliminarTodos(true)} title="Eliminar todos os clientes e dados relacionados">
              <Trash2 size={18} /> Eliminar todos
            </button>
          )}
          {canAddCliente && (
            <button type="button" className="btn" onClick={openAdd}><Plus size={18} /> Novo cliente</button>
          )}
        </div>
      </div>
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          value={searchCliente}
          onChange={e => setSearchCliente(e.target.value)}
          placeholder="Pesquisar por NIF ou nome..."
          aria-label="Pesquisar clientes"
        />
        {searchCliente && (
          <button type="button" className="search-clear" onClick={() => setSearchCliente('')} aria-label="Limpar pesquisa">
            ×
          </button>
        )}
      </div>
      <ContentLoader loading={!contentReady} message="A carregar clientes…" hint="Por favor aguarde.">
      {/* Lista compacta — mobile */}
      <div className="clientes-mobile-lista">
        {clientesPaginated.map(c => {
          const nMaq = getMaquinasCount(c.nif)
          return (
            <button
              key={c.nif}
              type="button"
              className="cliente-mobile-card"
              onClick={() => openFicha(c)}
            >
              <div className="cliente-mobile-main">
                <span className="cliente-mobile-nome">{c.nome}</span>
                <div className="cliente-mobile-meta">
                  <code className="cliente-mobile-nif">{c.nif}</code>
                  {c.localidade && <span className="cliente-mobile-loc">{c.localidade}</span>}
                  {c.telefone && (
                    <a href={`tel:${c.telefone.replace(/\s/g, '')}`} className="cliente-mobile-tel" onClick={e => e.stopPropagation()}>
                      {c.telefone}
                    </a>
                  )}
                  <span className="cliente-mobile-maq">{nMaq} máq.</span>
                  {!c.email && <span className="badge badge-warning badge-inline" title="Cliente sem email registado">⚠ sem email</span>}
                </div>
              </div>
              <ChevronRight size={16} className="cliente-mobile-chevron" />
            </button>
          )
        })}
        {clientesFiltrados.length === 0 && (
          <p className="text-muted clientes-empty-msg">Nenhum cliente encontrado.</p>
        )}
        {clientesFiltrados.length > PAGE_SIZE && (
          <div className="clientes-pagination clientes-pagination-mobile">
            <span className="pagination-info">
              {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, clientesFiltrados.length)} de {clientesFiltrados.length}
            </span>
            <div className="pagination-btns">
              <button type="button" className="icon-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Página anterior">
                <ChevronLeft size={18} />
              </button>
              <span className="pagination-page">{page} / {totalPages}</span>
              <button type="button" className="icon-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Página seguinte">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabela completa — desktop */}
      <div className="table-card card clientes-table">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-nif">NIF</th>
              <th className="col-nome">Nome do Cliente</th>
              <th className="col-local">Localidade</th>
              <th className="col-maq">Máq.</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {clientesPaginated.map(c => {
              const nMaq = getMaquinasCount(c.nif)
              return (
                <tr key={c.nif}>
                  <td className="col-nif"><code>{c.nif}</code></td>
                  <td className="col-nome">
                    <button type="button" className="btn-link-inline" onClick={() => openFicha(c)} title="Abrir ficha">
                      <strong>{c.nome}</strong>
                    </button>
                  </td>
                  <td className="col-local">{c.localidade || '—'}</td>
                  <td className="col-maq">{nMaq}</td>
                  <td className="col-actions">
                    <span className="actions-row">
                      {nMaq > 0 && (
                        <button className="icon-btn secondary" onClick={() => handleAbrirFiltroFrota(c)} title="Relatório de frota"><FileBarChart size={16} /></button>
                      )}
                      {canEditCliente && (
                        <button className="icon-btn secondary" onClick={() => openEdit(c)} title="Editar"><Pencil size={16} /></button>
                      )}
                      {canDelete && (
                        <button className="icon-btn danger" onClick={() => setModalConfirmDeleteCliente(c)} disabled={nMaq > 0} title={nMaq > 0 ? 'Elimine as máquinas primeiro' : 'Eliminar'}><Trash2 size={16} /></button>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {clientesFiltrados.length > PAGE_SIZE && (
          <div className="clientes-pagination">
            <span className="pagination-info">
              {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, clientesFiltrados.length)} de {clientesFiltrados.length}
            </span>
            <div className="pagination-btns">
              <button type="button" className="icon-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Página anterior">
                <ChevronLeft size={18} />
              </button>
              <span className="pagination-page">{page} / {totalPages}</span>
              <button type="button" className="icon-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Página seguinte">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      </ContentLoader>

      {modal === 'ficha' && fichaCliente && (
        <div className="modal-overlay modal-ficha-overlay" onClick={closeFicha}>
          <div className="modal modal-ficha-cliente" onClick={e => e.stopPropagation()}>
            <div className="ficha-header">
              <h2 className="ficha-titulo">{fichaCliente.nome}</h2>
              {canEditCliente && (
                <button
                  className="btn secondary ficha-btn-editar"
                  onClick={() => { closeFicha(); openEdit(fichaCliente) }}
                  title="Editar dados do cliente"
                >
                  <Pencil size={14} /> Editar
                </button>
              )}
            </div>
            <div className="ficha-cliente-dados">
              <p><strong>NIF:</strong> {fichaCliente.nif} · <strong>Morada:</strong> {fichaCliente.morada || '—'}</p>
              <p><strong>Localidade:</strong> {fichaCliente.codigoPostal} {fichaCliente.localidade} · <strong>Telefone:</strong> {fichaCliente.telefone || '—'} · <strong>Email:</strong> {fichaCliente.email || '—'}</p>
            </div>

            {fichaKpis && (
              <div className="ficha-kpi-bar">
                <div className="ficha-kpi-item">
                  <span className="ficha-kpi-num">{fichaKpis.total}</span>
                  <span className="ficha-kpi-label">Equipamentos</span>
                </div>
                <div className="ficha-kpi-item ficha-kpi-danger">
                  <span className="ficha-kpi-num">{fichaKpis.emAtraso}</span>
                  <span className="ficha-kpi-label">Em atraso</span>
                </div>
                <div className="ficha-kpi-item ficha-kpi-ok">
                  <span className="ficha-kpi-num">{fichaKpis.conformes}</span>
                  <span className="ficha-kpi-label">Conformes</span>
                </div>
                <div className="ficha-kpi-item ficha-kpi-muted">
                  <span className="ficha-kpi-num">{fichaKpis.semData}</span>
                  <span className="ficha-kpi-label">Sem data</span>
                </div>
              </div>
            )}

            {maquinasCliente.length > 0 && (
              <div className="ficha-top-actions">
                <button
                  className="btn secondary ficha-btn-frota"
                  onClick={() => handleAbrirFiltroFrota(fichaCliente)}
                  title="Relatório executivo de frota"
                >
                  <FileBarChart size={15} /> Relatório de frota
                </button>
                {fichaView !== 'flat' && fichaView !== 'maquina-detalhe' && (
                  <button className="btn secondary ficha-btn-flat" onClick={() => setFichaView('flat')}>
                    Ver todos os equipamentos
                  </button>
                )}
              </div>
            )}

            {maquinasCliente.length === 0 ? (
              <div className="ficha-empty">
                <p className="text-muted">Este cliente ainda não tem máquinas registadas.</p>
                {canAddCliente && (
                  <button type="button" className="btn-add-maquina" onClick={() => setModalMaquina({ mode: 'add', clienteNif: fichaCliente.nif })}>
                    <Plus size={18} /> Adicionar máquina
                  </button>
                )}
              </div>
            ) : (
              <>
                {fichaView === 'categorias' && (
                  <div className="ficha-categorias">
                    <h3>Categorias</h3>
                    <div className="categorias-grid">
                      {categoriasComMaquinas.map(cat => {
                        const count = maquinasCliente.filter(m => getSubcategoria(m.subcategoriaId)?.categoriaId === cat.id).length
                        return (
                          <button key={cat.id} type="button" className="categoria-card" onClick={() => { setFichaCategoria(cat); setFichaView('subcategorias'); }}>
                            <h4>{cat.nome}</h4>
                            <p>{count} equipamento(s)</p>
                            <ChevronRight size={18} className="categoria-card-chevron" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {fichaView === 'subcategorias' && fichaCategoria && (
                  <div className="ficha-subcategorias">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => { setFichaCategoria(null); setFichaView('categorias'); }}>
                        <ArrowLeft size={16} /> Categorias
                      </button>
                      <span className="breadcrumb">/ {fichaCategoria.nome}</span>
                    </div>
                    <h3>Subcategorias</h3>
                    <div className="categorias-grid">
                      {subcategoriasComMaquinas.map(sub => {
                        const count = maquinasCliente.filter(m => m.subcategoriaId === sub.id).length
                        return (
                          <button key={sub.id} type="button" className="categoria-card" onClick={() => { setFichaSubcategoria(sub); setFichaView('maquinas'); }}>
                            <h4>{sub.nome}</h4>
                            <p>{count} equipamento(s)</p>
                            <ChevronRight size={18} className="categoria-card-chevron" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {fichaView === 'maquinas' && fichaSubcategoria && (
                  <div className="ficha-maquinas-view">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => { setFichaSubcategoria(null); setFichaView('subcategorias'); }}><ArrowLeft size={16} /> Subcategorias</button>
                      <span className="breadcrumb">/ {fichaSubcategoria.nome}</span>
                    </div>
                    <h3>Frota de máquinas</h3>
                    <div className="maquinas-ficha-lista">
                      {maquinasDaSubcategoria.map(m => (
                        <button key={m.id} type="button" className="maquina-ficha-card" onClick={() => { setFichaMaquina(m); setFichaView('maquina-detalhe'); }}>
                          <div className="maquina-ficha-card-info">
                            <strong>{m.marca} {m.modelo}</strong>
                            <span className="text-muted"> — Nº Série: {m.numeroSerie}</span>
                          </div>
                          <div className="maquina-ficha-card-badge">
                            {renderProximaManut(m)}
                          </div>
                          <ChevronRight size={18} className="maquina-ficha-chevron" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {fichaView === 'flat' && (
                  <div className="ficha-flat-view">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => setFichaView('categorias')}>
                        <ArrowLeft size={16} /> Categorias
                      </button>
                      <span className="breadcrumb">/ Todos os equipamentos</span>
                    </div>
                    <div className="maquinas-ficha-lista">
                      {maquinasCliente
                        .map(m => ({ ...m, _sub: getSubcategoria(m.subcategoriaId) }))
                        .sort((a, b) => (a._sub?.nome || '').localeCompare(b._sub?.nome || '') || `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`))
                        .map(m => (
                          <button key={m.id} type="button" className="maquina-ficha-card" onClick={() => { setFichaMaquina(m); setFichaView('maquina-detalhe'); }}>
                            <div className="maquina-ficha-card-info">
                              <strong>{m._sub?.nome ? `${m._sub.nome} — ` : ''}{m.marca} {m.modelo}</strong>
                              <span className="text-muted"> — Nº Série: {m.numeroSerie}</span>
                            </div>
                            <div className="maquina-ficha-card-badge">
                              {renderProximaManut(m)}
                            </div>
                            <ChevronRight size={18} className="maquina-ficha-chevron" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {fichaView === 'maquina-detalhe' && fichaMaquina && (() => {
                    const maquinaAtual = maquinas.find(m => m.id === fichaMaquina.id) ?? fichaMaquina
                    const docs = maquinaAtual.documentos ?? []
                    const getDocPorTipo = (tipo) => docs.find(d => d.tipo === tipo)
                    const getDocLabel = (tipo) => TIPOS_DOCUMENTO.find(t => t.id === tipo)?.label ?? tipo
                    return (
                  <div className="ficha-maquina-detalhe">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => { setFichaMaquina(null); setFichaView(prevFichaView === 'flat' ? 'flat' : 'maquinas'); }}><ArrowLeft size={16} /> {prevFichaView === 'flat' ? 'Todos' : 'Frota'}</button>
                      <span className="breadcrumb">/ {fichaMaquina.marca} {fichaMaquina.modelo}</span>
                    </div>
                    <div className="maquina-detalhe-header">
                      <h3>{fichaMaquina.marca} {fichaMaquina.modelo} — Nº Série: {fichaMaquina.numeroSerie}</h3>
                      <div className="maquina-detalhe-actions">
                        {isAdmin && (
                          <>
                            <button type="button" className="secondary" onClick={() => { setModalDoc(null); setModalMaquina({ mode: 'edit', maquina: fichaMaquina }); }}><Pencil size={16} /> Editar</button>
                            <button type="button" className="secondary" onClick={() => setModalDoc(fichaMaquina)}><FolderPlus size={16} /> Documentação</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="maq-quick-actions">
                      <button type="button" className="btn-quick" onClick={() => navigate(`/agendamento?maquinaId=${fichaMaquina.id}`)}><Calendar size={14} /> Agendar</button>
                      <button type="button" className="btn-quick" onClick={() => navigate(`/equipamentos?qr=${fichaMaquina.id}`)}><QrCode size={14} /> QR</button>
                      <button type="button" className="btn-quick" onClick={() => {
                        const sub = getSubcategoria(fichaMaquina.subcategoriaId)
                        const cat = sub ? getCategoria(sub.categoriaId) : null
                        const html = gerarHtmlHistoricoMaquina({
                          maquina: fichaMaquina,
                          cliente: fichaCliente,
                          subcategoria: sub,
                          categoria: cat,
                          manutencoes: manutencoes.filter(m => m.maquinaId === fichaMaquina.id),
                          relatorios,
                          reparacoes: reparacoes.filter(r => r.maquinaId === fichaMaquina.id),
                          tecnicos,
                        })
                        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        window.open(url, '_blank')
                        setTimeout(() => URL.revokeObjectURL(url), 30000)
                      }}><FileDown size={14} /> Histórico</button>
                    </div>
                    <h4>Documentação obrigatória</h4>
                    <div className="doc-table-wrapper">
                      <table className="data-table doc-table">
                        <thead>
                          <tr>
                            <th>Documento</th>
                            <th>Existe</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TIPOS_DOCUMENTO.map(tipo => {
                            const doc = tipo.id === 'outros' ? docs.filter(d => d.tipo === 'outros')[0] : getDocPorTipo(tipo.id)
                            const existe = !!doc
                            return (
                              <tr key={tipo.id}>
                                <td data-label="Documento">{getDocLabel(tipo.id)}</td>
                                <td data-label="Existe"><span className={existe ? 'badge badge-sim' : 'badge badge-nao'}>{existe ? 'Sim' : 'Não'}</span></td>
                                <td className="doc-table-actions" data-label="Ações">
                                  {doc ? (
                                    <>
                                      <a href={safeHttpUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="icon-btn secondary" title="Visualizar"><ExternalLink size={16} /></a>
                                      <button type="button" className="icon-btn secondary" onClick={() => setModalDocumentoEmail({ documento: doc, maquina: maquinaAtual })} title="Enviar por email"><Mail size={16} /></button>
                                    </>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <h4>Histórico de manutenções</h4>
                    {getManutencoesDaMaquina(fichaMaquina.id).length === 0 ? (
                      <p className="text-muted">Nenhuma manutenção registada.</p>
                    ) : (
                      <div className="hist-manut-wrap">
                        <table className="hist-manut-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Técnico</th>
                              <th>Estado</th>
                              <th>N.º Rel.</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {getManutencoesDaMaquina(fichaMaquina.id).map(manut => {
                              const rel = getRelatorioByManutencao(manut.id)
                              return (
                                <tr key={manut.id}>
                                  <td><strong>{format(parseDateLocal(manut.data), 'd MMM yyyy', { locale: pt })}</strong></td>
                                  <td className="text-muted">{manut.tecnico || rel?.tecnico || 'Não atribuído'}</td>
                                  <td><span className={`badge badge-${manut.status}`}>{statusLabel[manut.status]}</span></td>
                                  <td className="hist-numrel">{rel?.numeroRelatorio || '—'}</td>
                                  <td className="hist-manut-actions">
                                    <button
                                      type="button"
                                      className="icon-btn secondary"
                                      title="Ver ficha de manutenção"
                                      onClick={() => setModalRelatorio({ manutencao: manut, relatorio: rel, maquina: fichaMaquina, cliente: fichaCliente })}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    {rel && (
                                      <button
                                        type="button"
                                        className="icon-btn secondary"
                                        title="Obter PDF (sem pré-visualizador)"
                                        onClick={() => handleDownloadPdfManutencao(manut, rel, fichaMaquina, fichaCliente)}
                                      >
                                        <FileDown size={14} />
                                      </button>
                                    )}
                                    {rel?.assinadoPeloCliente && (
                                      <button
                                        type="button"
                                        className="icon-btn secondary"
                                        title="Enviar relatório por email"
                                        onClick={() => setModalEmail({ manutencao: manut, relatorio: rel, maquina: fichaMaquina, cliente: fichaCliente })}
                                      >
                                        <Mail size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                    )
                  })()}

              </>
            )}
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="secondary" onClick={closeFicha}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {modalMaquina && (
        <MaquinaFormModal
          isOpen
          onClose={() => setModalMaquina(null)}
          mode={modalMaquina.mode}
          clienteNifLocked={modalMaquina.clienteNif}
          maquina={modalMaquina.maquina}
          onSave={(maqData, modo) => {
            if (modo === 'add' && maqData && SUBCATEGORIAS_COMPRESSOR.includes(maqData.subcategoriaId)) {
              // Abrir automaticamente o plano de consumíveis para o novo compressor
              setModalPecasAuto(maqData)
            }
          }}
        />
      )}

      <PecasPlanoModal
        isOpen={!!modalPecasAuto}
        onClose={() => setModalPecasAuto(null)}
        maquina={modalPecasAuto}
        modoInicial
      />

      <DocumentacaoModal isOpen={!!modalDoc} onClose={() => setModalDoc(null)} maquina={modalDoc} />

      {modalRelatorio && (
        <div className="modal-overlay" onClick={() => setModalRelatorio(null)}>
          <div className="modal modal-relatorio modal-relatorio-ficha" onClick={e => e.stopPropagation()}>
            <div className="modal-relatorio-header">
              <h2>Relatório de manutenção</h2>
              <button type="button" className="secondary" onClick={() => setModalRelatorio(null)}>Fechar</button>
            </div>
            <RelatorioView
              relatorio={modalRelatorio.relatorio}
              manutencao={modalRelatorio.manutencao}
              maquina={modalRelatorio.maquina}
              cliente={modalRelatorio.cliente}
              checklistItems={modalRelatorio.maquina ? getChecklistBySubcategoria(modalRelatorio.maquina.subcategoriaId, modalRelatorio.manutencao?.tipo || 'periodica') : []}
            />
            {modalRelatorio.relatorio?.assinadoPeloCliente && (
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={() => { setModalRelatorio(null); setModalEmail({ manutencao: modalRelatorio.manutencao, relatorio: modalRelatorio.relatorio, maquina: modalRelatorio.maquina, cliente: modalRelatorio.cliente }); }}>
                  Enviar relatório por email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalEmail && (
        <EnviarEmailModal
          isOpen
          onClose={() => setModalEmail(null)}
          manutencao={modalEmail.manutencao}
          relatorio={modalEmail.relatorio}
          maquina={modalEmail.maquina}
          cliente={modalEmail.cliente}
        />
      )}

      {modalDocumentoEmail && (
        <EnviarDocumentoModal
          isOpen
          onClose={() => setModalDocumentoEmail(null)}
          documento={modalDocumentoEmail.documento}
          maquina={modalDocumentoEmail.maquina}
        />
      )}

      {/* ── Modal selecção de período para relatório de frota ───────────── */}
      {modalFrotaFiltro && (
        <div className="modal-overlay" onClick={() => setModalFrotaFiltro(null)}>
          <div className="modal modal-frota-filtro" onClick={e => e.stopPropagation()}>
            <div className="modal-frota-header">
              <h2><FileBarChart size={20} /> Relatório de frota</h2>
              <button type="button" className="icon-btn secondary" onClick={() => setModalFrotaFiltro(null)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <p className="text-muted modal-frota-subtitle">{modalFrotaFiltro.cliente.nome}</p>
            <form onSubmit={handleGerarFrotaComFiltro}>
              <p className="frota-filtro-desc">
                Seleccione o período de dados a incluir no relatório. Campos em branco incluem dados desde sempre ou até hoje.
              </p>
              <div className="frota-filtro-row">
                <div className="form-group">
                  <label>Data de início</label>
                  <input
                    type="date"
                    value={frotaDataInicio}
                    onChange={e => setFrotaDataInicio(e.target.value)}
                    max={frotaDataFim || new Date().toISOString().slice(0, 10)}
                  />
                  <span className="form-hint">Em branco = desde sempre</span>
                </div>
                <div className="form-group">
                  <label>Data de fim</label>
                  <input
                    type="date"
                    value={frotaDataFim}
                    onChange={e => setFrotaDataFim(e.target.value)}
                    min={frotaDataInicio || undefined}
                  />
                  <span className="form-hint">Em branco = até hoje</span>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setModalFrotaFiltro(null)}>Cancelar</button>
                <button type="submit"><FileBarChart size={15} /> Gerar relatório</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal relatório de frota — acções ────────────────────────────── */}
      {modalFrota && (
        <div className="modal-overlay" onClick={frotaAcaoLoading ? undefined : closeFrotaModal}>
          <div className="modal modal-frota-report" onClick={e => e.stopPropagation()}>
            <div className="modal-frota-header">
              <h2><FileBarChart size={20} /> Relatório de frota</h2>
              {!frotaAcaoLoading && (
                <button type="button" className="icon-btn secondary" onClick={closeFrotaModal} aria-label="Fechar"><X size={18} /></button>
              )}
            </div>
            <p className="text-muted modal-frota-subtitle">{modalFrota.cliente.nome}</p>
            {modalFrota.options?.periodoLabel && (
              <p className="frota-periodo-badge">Período: {modalFrota.options.periodoLabel}</p>
            )}

            <div className="frota-acoes">
              <button
                type="button"
                className="frota-acao-btn"
                onClick={handleAbrirFrotaHtml}
                disabled={!!frotaAcaoLoading}
              >
                <ExternalLink size={18} />
                <span>Abrir numa janela</span>
                <small>Relatório HTML no browser</small>
                {frotaAcaoLoading === 'html' && <span className="frota-acao-spinner" />}
              </button>

              <button
                type="button"
                className="frota-acao-btn"
                onClick={handleGravarFrotaPdf}
                disabled={!!frotaAcaoLoading}
              >
                <FileDown size={18} />
                <span>Gravar PDF</span>
                <small>Descarregar ficheiro .pdf</small>
                {frotaAcaoLoading === 'pdf' && <span className="frota-acao-spinner" />}
              </button>

              <button
                type="button"
                className={`frota-acao-btn${frotaEmailPane ? ' active' : ''}`}
                onClick={() => setFrotaEmailPane(v => !v)}
                disabled={!!frotaAcaoLoading}
              >
                <Mail size={18} />
                <span>Enviar por email</span>
                <small>Escolher destinatários</small>
              </button>
            </div>

            {frotaEmailPane && (
              <form className="frota-email-panel" onSubmit={handleEnviarFrotaEmail}>
                <p className="frota-email-panel-title">Destinatários</p>
                {modalFrota.cliente.email && (
                  <label className="frota-email-check">
                    <input
                      type="checkbox"
                      checked={frotaEmailCliente}
                      onChange={e => setFrotaEmailCliente(e.target.checked)}
                    />
                    <span>
                      <strong>{modalFrota.cliente.email}</strong>
                      <small> — cliente</small>
                    </span>
                  </label>
                )}
                <label className="frota-email-check">
                  <input
                    type="checkbox"
                    checked={frotaEmailAdmin}
                    onChange={e => setFrotaEmailAdmin(e.target.checked)}
                  />
                  <span>
                    <strong>comercial@navel.pt</strong>
                    <small> — Navel (admin)</small>
                  </span>
                </label>
                <label className="frota-email-check frota-email-outro">
                  <input
                    type="checkbox"
                    checked={frotaEmailOutro.trim().length > 0}
                    readOnly
                    tabIndex={-1}
                  />
                  <span className="frota-email-outro-wrap">
                    <small>Outro(s):</small>
                    <input
                      type="text"
                      className="frota-email-outro-input"
                      placeholder="email@exemplo.pt, outro@exemplo.pt"
                      value={frotaEmailOutro}
                      onChange={e => setFrotaEmailOutro(e.target.value)}
                    />
                  </span>
                </label>
                <div className="form-actions frota-email-actions">
                  <button type="button" className="secondary" onClick={() => setFrotaEmailPane(false)}>Cancelar</button>
                  <button type="submit" disabled={frotaAcaoLoading === 'email'}>
                    {frotaAcaoLoading === 'email' ? <><span className="frota-acao-spinner" /> A enviar...</> : <><Send size={14} /> Enviar email</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar todos ───────────────────────────────────── */}
      {modalEliminarTodos && (
        <div className="modal-overlay" onClick={() => setModalEliminarTodos(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2><Trash2 size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Eliminar todos os clientes</h2>
            <p style={{ margin: '1rem 0', lineHeight: 1.5 }}>
              Esta acção elimina <strong>todos os clientes</strong>, máquinas, manutenções e relatórios. Não é possível desfazer.
            </p>
            <p className="text-muted" style={{ fontSize: '0.88rem' }}>
              Use esta opção para limpar uma lista importada e importar uma nova.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="secondary" onClick={() => setModalEliminarTodos(false)}>Cancelar</button>
              <button type="button" className="danger" onClick={handleEliminarTodosConfirm}>Eliminar todos</button>
            </div>
          </div>
        </div>
      )}


      {modal && modal !== 'ficha' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Novo cliente' : 'Editar cliente'}</h2>
            {erro && <p className="form-erro">{erro}</p>}
            <form onSubmit={handleSubmit}>
              <label>NIF <span className="required">*</span><input required value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} placeholder="123456789" readOnly={modal === 'edit'} className={modal === 'edit' ? 'readonly' : ''} /></label>
              <label>Nome do Cliente <span className="required">*</span><input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Razão social" /></label>
              <label>Morada<input value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} /></label>
              <div className="form-row">
                <label>Código Postal<input value={form.codigoPostal} onChange={e => setForm(f => ({ ...f, codigoPostal: e.target.value }))} /></label>
                <label>Localidade<input value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>Telefone<input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></label>
                <label>Email <span className="required">*</span><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@cliente.pt" /></label>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit">{modal === 'add' ? 'Adicionar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfirmDeleteCliente && (
        <div className="modal-overlay" onClick={() => setModalConfirmDeleteCliente(null)}>
          <div className="modal modal-compact" onClick={e => e.stopPropagation()}>
            <h2>Confirmar eliminação</h2>
            <p>Tem a certeza que pretende eliminar o cliente <strong>{modalConfirmDeleteCliente.nome}</strong> (NIF: {modalConfirmDeleteCliente.nif})?</p>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setModalConfirmDeleteCliente(null)}>Cancelar</button>
              <button type="button" className="danger" onClick={() => { removeCliente(modalConfirmDeleteCliente.nif); setModalConfirmDeleteCliente(null); showToast('Cliente eliminado.', 'success') }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
