/**
 * Reparacoes – Lista e gestão de reparações (operação única, sem periodicidade).
 * Permite criar, executar e enviar relatório de reparação por email.
 * Inclui reparações geradas automaticamente via email ISTOBAL.
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import ExecutarReparacaoModal from '../components/ExecutarReparacaoModal'
import { Hammer, Plus, Trash2, Play, FileText, Mail, Zap, X, AlertCircle, BarChart2, ChevronLeft, ChevronRight, Printer, ChevronDown, Package, Clock } from 'lucide-react'
import { getHojeAzores, formatDataAzores } from '../utils/datasAzores'
import { logger } from '../utils/logger'
import { APP_FOOTER_TEXT } from '../config/version'
import { MESES_PT } from '../constants/locale'
import ContentLoader from '../components/ContentLoader'
import { useDeferredReady } from '../hooks/useDeferredReady'
import './Reparacoes.css'

const STATUS_LABELS = {
  pendente:     { label: 'Pendente',     cls: 'badge-warning' },
  em_progresso: { label: 'Em progresso', cls: 'badge-info'    },
  concluida:    { label: 'Concluída',    cls: 'badge-success' },
}

const FILTROS = [
  { id: 'todas',       label: 'Todas'       },
  { id: 'pendente',    label: 'Pendentes'   },
  { id: 'em_progresso',label: 'Em progresso'},
  { id: 'concluida',   label: 'Concluídas'  },
]

export default function Reparacoes() {
  const {
    reparacoes,
    relatoriosReparacao,
    maquinas,
    clientes,
    addReparacao,
    removeReparacao,
    getRelatorioByReparacao,
    getSubcategoria,
    getChecklistBySubcategoria,
    tecnicos,
    getTecnicoByNome,
  } = useData()
  const contentReady = useDeferredReady(reparacoes.length >= 0)
  const navigate = useNavigate()
  const { canDelete, canDeleteReparacao, isAdmin } = usePermissions()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

  const [filtro, setFiltro] = useState('todas')
  const [modalExecucao, setModalExecucao] = useState(null)  // reparacao obj
  const [modalRelatorio, setModalRelatorio] = useState(null) // relatorio obj
  const [modalNova, setModalNova] = useState(false)
  const [formNova, setFormNova] = useState({ maquinaId: '', tecnico: '', data: getHojeAzores(), numeroAviso: '', descricaoAvaria: '' })
  const [errorsNova, setErrorsNova] = useState({})
  const [modalEmail, setModalEmail]         = useState(null)
  const [emailCheckCliente, setEmailCheckCliente] = useState(false)
  const [emailCheckAdmin, setEmailCheckAdmin]     = useState(true)
  const [emailOutro, setEmailOutro]               = useState('')
  const [emailEnviando, setEmailEnviando]         = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [filtroClienteNova, setFiltroClienteNova] = useState('')
  const [modalMensal, setModalMensal] = useState(false)
  const [avisoExpandido, setAvisoExpandido] = useState(null) // id da reparação com detalhe expandido
  const [modoPrint, setModoPrint] = useState(false)
  const [mesMensal, setMesMensal] = useState(() => {
    const d = new Date()
    return { ano: d.getFullYear(), mes: d.getMonth() } // mes 0-11
  })

  // ── Relatório mensal ISTOBAL ──────────────────────────────────────────────

  const reparacoesMensais = useMemo(() => {
    const { ano, mes } = mesMensal
    return reparacoes.filter(r => {
      if (!r.data) return false
      const d = new Date(r.data + 'T12:00:00')
      return d.getFullYear() === ano && d.getMonth() === mes
    }).sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
  }, [reparacoes, mesMensal])

  const reparacoesIstobaMensais = useMemo(() =>
    reparacoesMensais.filter(r => r.origem === 'istobal_email'),
  [reparacoesMensais])

  // Total de horas M.O. dos avisos ISTOBAL concluídos no mês (base de faturação)
  const totalHorasIstobalMes = useMemo(() =>
    reparacoesIstobaMensais.reduce((acc, r) => {
      const rel = getRelatorioByReparacao(r.id)
      return acc + (rel?.horasMaoObra ? parseFloat(rel.horasMaoObra) : 0)
    }, 0),
  [reparacoesIstobaMensais, getRelatorioByReparacao])

  const navMes = (delta) => setMesMensal(({ ano, mes }) => {
    let nm = mes + delta
    let na = ano
    if (nm < 0)  { nm = 11; na-- }
    if (nm > 11) { nm = 0;  na++ }
    return { ano: na, mes: nm }
  })

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getMaquina  = useCallback((id) => maquinas.find(m => m.id === id), [maquinas])
  const getCliente  = useCallback((nif) => clientes.find(c => c.nif === nif), [clientes])

  const nomesTecnicos = useMemo(() => tecnicos.filter(t => t.ativo !== false).map(t => t.nome), [tecnicos])

  const maquinasOrdenadas = useMemo(() =>
    [...maquinas].sort((a, b) => {
      const ca = clientes.find(c => c.nif === a.clienteNif)
      const cb = clientes.find(c => c.nif === b.clienteNif)
      return (ca?.nome ?? '').localeCompare(cb?.nome ?? '', 'pt')
    }),
  [maquinas, clientes])

  const clientesComMaquinas = useMemo(() => {
    const nifs = [...new Set(maquinas.map(m => m.clienteNif).filter(Boolean))]
    return nifs.map(nif => clientes.find(c => c.nif === nif)).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  }, [maquinas, clientes])

  const maquinasFiltradas = useMemo(() => {
    if (!filtroClienteNova) return maquinasOrdenadas
    return maquinasOrdenadas.filter(m => m.clienteNif === filtroClienteNova)
  }, [maquinasOrdenadas, filtroClienteNova])

  // ── Lista filtrada ────────────────────────────────────────────────────────

  const listaFiltrada = useMemo(() => {
    const base = filtro === 'todas'
      ? reparacoes
      : reparacoes.filter(r => r.status === filtro)
    return [...base].sort((a, b) => {
      const order = { pendente: 0, em_progresso: 1, concluida: 2 }
      const od = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (od !== 0) return od
      return (b.data ?? '').localeCompare(a.data ?? '')
    })
  }, [reparacoes, filtro])

  const counts = useMemo(() => ({
    todas:        reparacoes.length,
    pendente:     reparacoes.filter(r => r.status === 'pendente').length,
    em_progresso: reparacoes.filter(r => r.status === 'em_progresso').length,
    concluida:    reparacoes.filter(r => r.status === 'concluida').length,
  }), [reparacoes])

  // ── Nova Reparação ────────────────────────────────────────────────────────

  const validarNova = () => {
    const errs = {}
    if (!formNova.maquinaId)    errs.maquinaId    = 'Seleccione uma máquina'
    if (!formNova.tecnico?.trim()) errs.tecnico    = 'Indique o técnico'
    if (!formNova.data)         errs.data         = 'Indique a data'
    setErrorsNova(errs)
    return Object.keys(errs).length === 0
  }

  const handleCriarReparacao = () => {
    if (!validarNova()) return
    const id = addReparacao({
      maquinaId:       formNova.maquinaId,
      data:            formNova.data,
      tecnico:         formNova.tecnico.trim(),
      status:          'pendente',
      numeroAviso:     formNova.numeroAviso.trim(),
      descricaoAvaria: formNova.descricaoAvaria.trim(),
      origem:          'manual',
    })
    showToast('Reparação criada com sucesso', 'success')
    logger.action('Reparacoes', 'criarReparacao', `Nova reparação (maquinaId: ${formNova.maquinaId})`, { id })
    setModalNova(false)
    setFormNova({ maquinaId: '', tecnico: '', data: getHojeAzores(), numeroAviso: '', descricaoAvaria: '' })
    setErrorsNova({})
    setFiltroClienteNova('')
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const handleEliminar = (rep) => {
    if (!canDeleteReparacao(rep.id)) {
      const rel = getRelatorioByReparacao(rep.id)
      if (rel?.assinadoPeloCliente) {
        showToast('Não é possível eliminar — relatório assinado pelo cliente.', 'warning')
      } else {
        showToast('Sem permissão para eliminar.', 'warning')
      }
      return
    }
    setModalEliminar(rep)
  }

  const confirmarEliminar = () => {
    if (!modalEliminar) return
    removeReparacao(modalEliminar.id)
    showToast('Reparação eliminada', 'success')
    logger.action('Reparacoes', 'eliminarReparacao', `Reparação ${modalEliminar.id} eliminada`)
    setModalEliminar(null)
  }

  // ── Envio de email ────────────────────────────────────────────────────────

  const EMAIL_ADMIN_REP = 'comercial@navel.pt'

  const handleAbrirEmail = (rep) => {
    const rel = getRelatorioByReparacao(rep.id)
    if (!rel) { showToast('Sem relatório gerado para enviar', 'warning'); return }
    const maq = getMaquina(rep.maquinaId)
    const cli = maq ? getCliente(maq.clienteNif) : null
    setEmailCheckCliente(!!(cli?.email?.trim()))
    setEmailCheckAdmin(true)
    setEmailOutro('')
    setModalEmail({ rep, rel, maq, cli })
  }

  const handleEnviarEmail = async () => {
    const { rep, rel, maq, cli } = modalEmail
    const emailCli = cli?.email?.trim() ?? ''

    const dests = new Set()
    if (emailCheckCliente && emailCli) dests.add(emailCli.toLowerCase())
    if (emailCheckAdmin) dests.add(EMAIL_ADMIN_REP)
    emailOutro.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(s => s).forEach(em => dests.add(em))

    if (dests.size === 0) { showToast('Selecione pelo menos um destinatário.', 'warning'); return }

    showGlobalLoading()
    setEmailEnviando(true)
    try {
      const { relatorioReparacaoParaHtml } = await import('../utils/relatorioReparacaoHtml')
      const { enviarRelatorioHtmlEmail }   = await import('../services/emailService')
      const itensChecklist = maq ? getChecklistBySubcategoria(maq.subcategoriaId, 'corretiva') : []
      const tecObj = getTecnicoByNome(rep.tecnico || rel?.tecnico)
      const html = relatorioReparacaoParaHtml(rel, rep, maq, cli, itensChecklist, { tecnicoObj: tecObj })
      const assunto = `Relatório de Reparação ${rel.numeroRelatorio} — ${maq?.marca ?? ''} ${maq?.modelo ?? ''}`
      let sucesso = 0
      for (const dest of dests) {
        const resultado = await enviarRelatorioHtmlEmail({
          destinatario: dest,
          assunto,
          html,
          nomeCliente: cli?.nome ?? '',
        })
        if (resultado.ok) sucesso++
        else logger.error('Reparacoes', 'enviarEmail', resultado.message ?? 'Erro', { dest })
      }
      if (sucesso > 0) {
        showToast(
          sucesso === dests.size
            ? `Relatório enviado para ${sucesso} destinatário${sucesso > 1 ? 's' : ''}.`
            : `Enviado para ${sucesso} de ${dests.size} destinatários.`,
          sucesso === dests.size ? 'success' : 'warning'
        )
        logger.action('Reparacoes', 'enviarEmail', `Email enviado (${sucesso} dests)`, { relId: rel.id })
        setModalEmail(null)
        setEmailOutro('')
      } else {
        showToast('Não foi possível enviar o email. Tente novamente.', 'error', 4000)
      }
    } catch (err) {
      showToast('Erro ao enviar email: ' + err.message, 'error')
      logger.error('Reparacoes', 'enviarEmail', err.message)
    } finally {
      hideGlobalLoading()
      setEmailEnviando(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderStatusBadge = (status) => {
    const s = STATUS_LABELS[status] ?? { label: status, cls: 'badge-secondary' }
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  const renderOrigem = (rep) => {
    if (rep.origem === 'istobal_email') {
      return <span className="rep-origem-istobal" title="Criada automaticamente via email ISTOBAL"><Zap size={13} /> ISTOBAL</span>
    }
    return null
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="reparacoes-page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>
            Reparações
            {counts.pendente > 0 && (
              <span className="badge badge-danger page-header-badge">{counts.pendente} pendente{counts.pendente !== 1 ? 's' : ''}</span>
            )}
          </h1>
          <p className="page-sub">Gestão de reparações e avisos ISTOBAL</p>
        </div>
        <div className="page-header-actions">
          {isAdmin && (
            <button type="button" className="btn secondary" onClick={() => setModalMensal(true)} title="Relatório mensal ISTOBAL">
              <BarChart2 size={18} /> Mensal ISTOBAL
            </button>
          )}
          <button type="button" className="btn" onClick={() => setModalNova(true)}>
            <Plus size={18} /> Nova Reparação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-tabs">
        {FILTROS.map(f => (
          <button
            key={f.id}
            type="button"
            className={`filtro-tab${filtro === f.id ? ' active' : ''}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
            <span className="filtro-tab-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <ContentLoader loading={!contentReady} message="A carregar reparações…" hint="Por favor aguarde.">
      {/* Tabela */}
      {listaFiltrada.length === 0 ? (
        <div className="empty-state card">
          <Hammer size={36} className="empty-icon" />
          <p>{filtro === 'todas' ? 'Nenhuma reparação registada.' : `Nenhuma reparação ${STATUS_LABELS[filtro]?.label?.toLowerCase() ?? filtro}.`}</p>
          <button type="button" className="btn primary" onClick={() => setModalNova(true)}>
            <Plus size={15} /> Nova Reparação
          </button>
        </div>
      ) : (
        <>
        {/* Card view — tablet/mobile */}
        <div className="reparacoes-cards">
          {listaFiltrada.map(rep => {
            const maq = getMaquina(rep.maquinaId)
            const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
            const cli = maq ? getCliente(maq.clienteNif) : null
            const rel = getRelatorioByReparacao(rep.id)
            const concluida = rep.status === 'concluida'
            return (
              <div key={rep.id} className={`rc-card${concluida ? ' rc-concluida' : ''}`}>
                <div className="rc-top">
                  {renderStatusBadge(rep.status)}
                  <span className="rc-data">{formatDataAzores(rep.data)}</span>
                  {renderOrigem(rep)}
                </div>
                <div className="rc-body">
                  <div className="rc-maquina">
                    {maq ? `${maq.marca} ${maq.modelo}` : 'Máquina removida'}
                    {sub && <span className="rc-sub">{sub.nome}</span>}
                  </div>
                  <div className="rc-meta">
                    {cli?.nome ?? '—'}
                    {rep.numeroAviso && <span className="rc-aviso">#{rep.numeroAviso}</span>}
                  </div>
                </div>
                <div className="rc-actions">
                  {!concluida && (
                    <button type="button" className="rc-btn-primary" onClick={() => setModalExecucao(rep)}>
                      <Play size={16} /> Executar
                    </button>
                  )}
                  {concluida && rel && (
                    <>
                      <button type="button" className="icon-btn" title="Ver relatório" onClick={() => setModalRelatorio({ rel, rep, maq, cli })}>
                        <FileText size={18} />
                      </button>
                      <button type="button" className="icon-btn" title="Enviar email" onClick={() => handleAbrirEmail(rep)}>
                        <Mail size={18} />
                      </button>
                    </>
                  )}
                  {canDeleteReparacao(rep.id) && (
                    <button type="button" className="icon-btn danger" title="Eliminar" onClick={() => handleEliminar(rep)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Table view — desktop */}
        <div className="reparacoes-table card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Máquina</th>
                <th>Cliente</th>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Aviso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(rep => {
                const maq = getMaquina(rep.maquinaId)
                const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
                const cli = maq ? getCliente(maq.clienteNif) : null
                const rel = getRelatorioByReparacao(rep.id)
                const concluida = rep.status === 'concluida'
                return (
                  <tr key={rep.id} className={concluida ? 'row-concluida' : ''}>
                    <td className="td-data">{formatDataAzores(rep.data)}</td>
                    <td>
                      <div className="td-maquina">
                        <span className="maq-nome">{maq ? `${maq.marca} ${maq.modelo}` : <em className="text-muted">Máquina removida</em>}</span>
                        {sub && <span className="maq-sub text-muted">{sub.nome}</span>}
                        {renderOrigem(rep)}
                      </div>
                    </td>
                    <td>{cli?.nome ?? <em className="text-muted">—</em>}</td>
                    <td>{rep.tecnico ?? '—'}</td>
                    <td>{renderStatusBadge(rep.status)}</td>
                    <td className="td-aviso">{rep.numeroAviso ?? '—'}</td>
                    <td className="actions">
                      <div className="actions-inner">
                        {!concluida && (
                          <button
                            type="button"
                            className="icon-btn btn-executar-rep"
                            title="Executar / Completar reparação"
                            onClick={() => setModalExecucao(rep)}
                          >
                            <Play size={16} />
                          </button>
                        )}
                        {concluida && rel && (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Ver relatório"
                              onClick={() => setModalRelatorio({ rel, rep, maq, cli })}
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Enviar relatório por email"
                              onClick={() => handleAbrirEmail(rep)}
                            >
                              <Mail size={16} />
                            </button>
                          </>
                        )}
                        {canDeleteReparacao(rep.id) && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Eliminar reparação"
                            onClick={() => handleEliminar(rep)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      </ContentLoader>

      {/* ── Modal: Nova Reparação ─────────────────────────────────────────── */}
      {modalNova && (() => {
        const maqSel = maquinas.find(m => m.id === formNova.maquinaId)
        const isIstobal = maqSel?.marca?.toUpperCase().includes('ISTOBAL')
        return (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Nova Reparação">
            <div className="modal modal-nova-rep">
              <div className="modal-header">
                <h2><Hammer size={18} /> Nova Reparação</h2>
                <button type="button" className="icon-btn" onClick={() => { setModalNova(false); setErrorsNova({}); setFiltroClienteNova('') }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">

                {/* Cliente (filtro) + Máquina */}
                <div className="form-group">
                  <label>Cliente <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.8em' }}>filtro</span></label>
                  <select value={filtroClienteNova} onChange={e => { setFiltroClienteNova(e.target.value); setFormNova(p => ({ ...p, maquinaId: '' })) }}>
                    <option value="">Todos os clientes</option>
                    {clientesComMaquinas.map(c => <option key={c.nif} value={c.nif}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Máquina <span className="required">*</span></label>
                  <select
                    className={errorsNova.maquinaId ? 'input-error' : ''}
                    value={formNova.maquinaId}
                    onChange={e => setFormNova(p => ({ ...p, maquinaId: e.target.value }))}
                  >
                    <option value="">— Seleccione —</option>
                    {maquinasFiltradas.map(m => {
                      const c = getCliente(m.clienteNif)
                      return (
                        <option key={m.id} value={m.id}>
                          {m.marca} {m.modelo}{c ? ` — ${c.nome}` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {errorsNova.maquinaId && <span className="field-error">{errorsNova.maquinaId}</span>}
                </div>

                {/* Técnico + Data — linha dupla */}
                <div className="form-row-nova">
                  <div className="form-group">
                    <label>Técnico <span className="required">*</span></label>
                    <select
                      className={errorsNova.tecnico ? 'input-error' : ''}
                      value={formNova.tecnico}
                      onChange={e => setFormNova(p => ({ ...p, tecnico: e.target.value }))}
                    >
                      <option value="">— Seleccione —</option>
                      {nomesTecnicos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errorsNova.tecnico && <span className="field-error">{errorsNova.tecnico}</span>}
                  </div>
                  <div className="form-group">
                    <label>Data <span className="required">*</span></label>
                    <input
                      type="date"
                      className={errorsNova.data ? 'input-error' : ''}
                      value={formNova.data}
                      max={getHojeAzores()}
                      onChange={e => setFormNova(p => ({ ...p, data: e.target.value }))}
                    />
                    {errorsNova.data && <span className="field-error">{errorsNova.data}</span>}
                  </div>
                </div>

                {/* Nº Aviso — hint contextual para ISTOBAL */}
                <div className="form-group">
                  <label>
                    Nº de Aviso / Pedido de Assistência
                    {isIstobal && (
                      <span className="field-hint-istobal">
                        <Zap size={11} /> ISTOBAL — usar o nº do aviso recebido de isat@istobal.com
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formNova.numeroAviso}
                    onChange={e => setFormNova(p => ({ ...p, numeroAviso: e.target.value }))}
                    placeholder={isIstobal ? 'Ex: ES00549609 (aviso ISTOBAL)' : 'Ex: 2026-RP-001'}
                  />
                </div>

                {/* Descrição — largura total, textarea generoso para mobile */}
                <div className="form-group form-group-full">
                  <label>Descrição da avaria / problema</label>
                  <textarea
                    rows={5}
                    className="textarea-descricao"
                    value={formNova.descricaoAvaria}
                    onChange={e => setFormNova(p => ({ ...p, descricaoAvaria: e.target.value }))}
                    placeholder="Descreva brevemente o problema reportado pelo cliente..."
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn secondary" onClick={() => { setModalNova(false); setErrorsNova({}); setFiltroClienteNova('') }}>
                  Cancelar
                </button>
                <button type="button" className="btn primary" onClick={handleCriarReparacao}>
                  <Plus size={15} /> Criar Reparação
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal: Executar Reparação ─────────────────────────────────────── */}
      {modalExecucao && (
        <ExecutarReparacaoModal
          reparacao={modalExecucao}
          onClose={() => setModalExecucao(null)}
        />
      )}

      {/* ── Modal: Ver Relatório ──────────────────────────────────────────── */}
      {modalRelatorio && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Relatório de Reparação">
          <div className="modal modal-relatorio-rep">
            <div className="modal-header">
              <h2><FileText size={18} /> Relatório {modalRelatorio.rel.numeroRelatorio}</h2>
              <button type="button" className="icon-btn" onClick={() => setModalRelatorio(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <RelatorioReparacaoView relatorio={modalRelatorio.rel} reparacao={modalRelatorio.rep} maquina={modalRelatorio.maq} cliente={modalRelatorio.cli} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={() => setModalRelatorio(null)}>Fechar</button>
              <button type="button" className="btn primary" onClick={() => { handleAbrirEmail(modalRelatorio.rep); setModalRelatorio(null) }}>
                <Mail size={15} /> Enviar por Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Enviar Email ───────────────────────────────────────────── */}
      {modalEmail && (() => {
        const emailCli = modalEmail.cli?.email?.trim() ?? ''
        return (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Enviar relatório por email" onClick={() => { setModalEmail(null); setEmailOutro('') }}>
            <div className="modal modal-email-rep" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><Mail size={18} /> Enviar Relatório</h2>
                <button type="button" className="icon-btn" onClick={() => { setModalEmail(null); setEmailOutro('') }}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <p className="email-info">
                  Relatório <strong>{modalEmail.rel?.numeroRelatorio}</strong> — {modalEmail.maq?.marca} {modalEmail.maq?.modelo}
                </p>
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
                    <span><strong>Administração</strong><br /><small>{EMAIL_ADMIN_REP}</small></span>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn secondary" onClick={() => { setModalEmail(null); setEmailOutro('') }} disabled={emailEnviando}>Cancelar</button>
                <button type="button" className="btn primary" onClick={handleEnviarEmail} disabled={emailEnviando}>
                  {emailEnviando ? <><Clock size={14} className="spin" /> A enviar...</> : <><Mail size={14} /> Enviar</>}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal: Relatório Mensal ISTOBAL ──────────────────────────────── */}
      {modalMensal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Relatório Mensal ISTOBAL">
          <div className="modal modal-mensal-istobal">
            <div className="modal-header">
              <h2><BarChart2 size={18} /> Relatório Mensal ISTOBAL</h2>
              <button type="button" className="icon-btn" onClick={() => setModalMensal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Navegação de mês */}
              <div className="mensal-nav">
                <button type="button" className="icon-btn" onClick={() => navMes(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
                <span className="mensal-titulo">{MESES_PT[mesMensal.mes]} {mesMensal.ano}</span>
                <button type="button" className="icon-btn" onClick={() => navMes(1)} aria-label="Mês seguinte"><ChevronRight size={18} /></button>
              </div>

              {/* Resumo */}
              <div className="mensal-resumo">
                <div className="mensal-stat">
                  <span className="mensal-stat-val">{reparacoesIstobaMensais.length}</span>
                  <span className="mensal-stat-lbl">Avisos ISTOBAL</span>
                </div>
                <div className="mensal-stat">
                  <span className="mensal-stat-val text-success">{reparacoesIstobaMensais.filter(r => r.status === 'concluida').length}</span>
                  <span className="mensal-stat-lbl">Concluídos</span>
                </div>
                <div className="mensal-stat">
                  <span className="mensal-stat-val text-warning">{reparacoesIstobaMensais.filter(r => r.status !== 'concluida').length}</span>
                  <span className="mensal-stat-lbl">Em curso</span>
                </div>
                <div className="mensal-stat mensal-stat-destaque">
                  <span className="mensal-stat-val">{totalHorasIstobalMes.toFixed(1)} h</span>
                  <span className="mensal-stat-lbl">Horas M.O. (faturar)</span>
                </div>
                <div className="mensal-stat mensal-stat-total">
                  <span className="mensal-stat-val">{reparacoesMensais.length}</span>
                  <span className="mensal-stat-lbl">Total Reparações</span>
                </div>
              </div>

              {/* Tabela ISTOBAL */}
              {reparacoesIstobaMensais.length > 0 ? (
                <div className="mensal-secao">
                  <h3 className="mensal-secao-titulo"><Zap size={14} /> Avisos ISTOBAL — {MESES_PT[mesMensal.mes]}</h3>
                  <table className="data-table mensal-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Aviso ES</th>
                        <th>Máquina</th>
                        <th>Local / Cliente</th>
                        <th>Estado</th>
                        <th>Relatório</th>
                        <th className="th-horas">H. M.O.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reparacoesIstobaMensais.map(r => {
                        const maq = getMaquina(r.maquinaId)
                        const cli = maq ? getCliente(maq.clienteNif) : null
                        const rel = getRelatorioByReparacao(r.id)
                        const st  = STATUS_LABELS[r.status] ?? { label: r.status, cls: 'badge-secondary' }
                        const horas = rel?.horasMaoObra ? parseFloat(rel.horasMaoObra) : null
                        const pecas = rel?.pecasUsadas
                          ? (typeof rel.pecasUsadas === 'string' ? JSON.parse(rel.pecasUsadas) : rel.pecasUsadas)
                          : []
                        const expandido = modoPrint || avisoExpandido === r.id
                        return (
                          <>
                            <tr
                              key={r.id}
                              className={[
                                r.status === 'concluida' ? '' : 'row-em-curso',
                                pecas.length > 0 ? 'row-expansivel' : ''
                              ].join(' ')}
                              onClick={() => pecas.length > 0 && setAvisoExpandido(avisoExpandido === r.id ? null : r.id)}
                              title={pecas.length > 0 ? 'Clique para ver materiais' : undefined}
                            >
                              <td>{formatDataAzores(r.data)}</td>
                              <td className="td-aviso-bold">{r.numeroAviso ?? '—'}</td>
                              <td>{maq ? `${maq.marca} ${maq.modelo}` : '—'}</td>
                              <td>{cli?.nome ?? '—'}</td>
                              <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                              <td>
                                <span className="td-rel-wrapper">
                                  {rel?.numeroRelatorio ?? <em className="text-muted">—</em>}
                                  {pecas.length > 0 && (
                                    <span className="badge-materiais" title={`${pecas.length} referência(s)`}>
                                      <Package size={11} /> {pecas.length}
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="td-horas td-horas-toggle">
                                {horas != null ? `${horas.toFixed(1)} h` : <em className="text-muted">—</em>}
                                {pecas.length > 0 && (
                                  <ChevronDown size={13} className={`chevron-expand ${expandido ? 'rotated' : ''}`} />
                                )}
                              </td>
                            </tr>
                            {expandido && pecas.length > 0 && (
                              <tr key={`${r.id}-pecas`} className="row-materiais-detail">
                                <td colSpan={7}>
                                  <div className="materiais-detail-inner">
                                    <span className="materiais-detail-titulo"><Package size={13} /> Materiais / Consumíveis utilizados</span>
                                    <table className="materiais-mini-table">
                                      <thead>
                                        <tr>
                                          <th>Referência</th>
                                          <th>Descrição</th>
                                          <th className="th-qtd">Qtd.</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {pecas.map((p, i) => (
                                          <tr key={i}>
                                            <td className="td-codigo">{p.codigo || '—'}</td>
                                            <td>{p.descricao || '—'}</td>
                                            <td className="td-qtd">{p.quantidade ?? '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                    {reparacoesIstobaMensais.some(r => getRelatorioByReparacao(r.id)?.horasMaoObra) && (
                      <tfoot>
                        <tr className="mensal-total-row">
                          <td colSpan={6} className="mensal-total-lbl">Total horas a faturar à ISTOBAL:</td>
                          <td className="td-horas mensal-total-val">{totalHorasIstobalMes.toFixed(1)} h</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <p className="mensal-vazio">Nenhum aviso ISTOBAL para {MESES_PT[mesMensal.mes]} {mesMensal.ano}.</p>
              )}

              {/* Reparações manuais do mês */}
              {reparacoesMensais.filter(r => r.origem !== 'istobal_email').length > 0 && (
                <div className="mensal-secao">
                  <h3 className="mensal-secao-titulo">Reparações Manuais — {MESES_PT[mesMensal.mes]}</h3>
                  <table className="data-table mensal-table">
                    <thead>
                      <tr><th>Data</th><th>Aviso</th><th>Máquina</th><th>Cliente</th><th>Estado</th><th>Relatório</th></tr>
                    </thead>
                    <tbody>
                      {reparacoesMensais.filter(r => r.origem !== 'istobal_email').map(r => {
                        const maq = getMaquina(r.maquinaId)
                        const cli = maq ? getCliente(maq.clienteNif) : null
                        const rel = getRelatorioByReparacao(r.id)
                        const st  = STATUS_LABELS[r.status] ?? { label: r.status, cls: 'badge-secondary' }
                        return (
                          <tr key={r.id}>
                            <td>{formatDataAzores(r.data)}</td>
                            <td className="td-aviso-bold">{r.numeroAviso ?? '—'}</td>
                            <td>{maq ? `${maq.marca} ${maq.modelo}` : '—'}</td>
                            <td>{cli?.nome ?? '—'}</td>
                            <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                            <td>{rel?.numeroRelatorio ?? <em className="text-muted">—</em>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={() => setModalMensal(false)}>Fechar</button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setModoPrint(true)
                  setTimeout(() => { window.print(); setModoPrint(false) }, 150)
                }}
                title="Imprimir relatório mensal para enviar à ISTOBAL"
              >
                <Printer size={15} /> Imprimir / Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminar ─────────────────────────────────────── */}
      {modalEliminar && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal modal-confirm">
            <div className="modal-header">
              <h2><AlertCircle size={18} className="text-danger" /> Confirmar eliminação</h2>
              <button type="button" className="icon-btn" onClick={() => setModalEliminar(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Tem a certeza que pretende eliminar esta reparação?</p>
              {(() => {
                const maq = getMaquina(modalEliminar.maquinaId)
                const cli = maq ? getCliente(maq.clienteNif) : null
                return (
                  <div className="confirm-details">
                    <strong>{maq ? `${maq.marca} ${maq.modelo}` : '—'}</strong>
                    {cli && <span> — {cli.nome}</span>}
                    <span className="text-muted"> ({formatDataAzores(modalEliminar.data)})</span>
                  </div>
                )
              })()}
              <p className="text-danger">Esta acção é irreversível. A reparação e o relatório associado serão eliminados permanentemente.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={() => setModalEliminar(null)}>Cancelar</button>
              <button type="button" className="btn danger" onClick={confirmarEliminar}><Trash2 size={15} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente inline: vista resumida do relatório ─────────────────────────

function RelatorioReparacaoView({ relatorio: rel, reparacao: rep, maquina: maq, cliente: cli }) {
  if (!rel) return <p className="text-muted">Sem relatório disponível.</p>
  const pecas = (() => { try { return JSON.parse(rel.pecasUsadas || '[]') } catch { return [] } })()

  return (
    <div className="relatorio-rep-view">

      {/* Cabeçalho: máquina e cliente */}
      {(maq || cli) && (
        <div className="rel-section rel-section-equipamento">
          <h3>Equipamento / Cliente</h3>
          <div className="rel-grid">
            {maq && <><span className="rel-label">Equipamento</span><span>{maq.marca} {maq.modelo}{maq.numeroSerie ? ` — S/N ${maq.numeroSerie}` : ''}</span></>}
            {maq?.localizacao && <><span className="rel-label">Localização</span><span>{maq.localizacao}</span></>}
            {cli && <><span className="rel-label">Cliente</span><span>{cli.nome}</span></>}
            {cli?.nif && <><span className="rel-label">NIF</span><span>{cli.nif}</span></>}
            {rel.numeroAviso && <><span className="rel-label">Aviso</span><span>{rel.numeroAviso}</span></>}
            {rep?.descricaoAvaria && <><span className="rel-label">Descrição avaria</span><span>{rep.descricaoAvaria}</span></>}
          </div>
        </div>
      )}

      <div className="rel-section">
        <h3>Dados do relatório</h3>
        <div className="rel-grid">
          <span className="rel-label">Relatório nº</span><span>{rel.numeroRelatorio ?? '—'}</span>
          <span className="rel-label">Data</span><span>{rel.dataAssinatura ? formatDataAzores(rel.dataAssinatura) : '—'}</span>
          <span className="rel-label">Técnico</span><span>{rel.tecnico ?? '—'}</span>
          <span className="rel-label">Assinado por</span><span>{rel.nomeAssinante ?? '—'}{rel.assinadoPeloCliente ? ' ✓' : ''}</span>
          <span className="rel-label">Horas M.O.</span><span>{rel.horasMaoObra ?? '—'} h</span>
        </div>
      </div>

      {rel.trabalhoRealizado && (
        <div className="rel-section">
          <h3>Trabalho realizado</h3>
          <p>{rel.trabalhoRealizado}</p>
        </div>
      )}

      {pecas.length > 0 && (
        <div className="rel-section">
          <h3>Peças / Consumíveis usados</h3>
          <table className="data-table pecas-table">
            <thead><tr><th>Código</th><th>Descrição</th><th>Qtd</th></tr></thead>
            <tbody>
              {pecas.map((p, i) => (
                <tr key={i}><td>{p.codigo ?? '—'}</td><td>{p.descricao ?? '—'}</td><td>{p.quantidade ?? 1}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rel.notas && (
        <div className="rel-section">
          <h3>Notas adicionais</h3>
          <p>{rel.notas}</p>
        </div>
      )}

      <div className="rel-footer">
        <span>{APP_FOOTER_TEXT}</span>
      </div>
    </div>
  )
}
