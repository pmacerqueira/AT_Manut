/**
 * Reparacoes – Lista e gestão de reparações (operação única, sem periodicidade).
 * Permite criar, executar e enviar relatório de reparação por email.
 * Inclui reparações geradas automaticamente via email ISTOBAL.
 */
import { useState, useMemo, useCallback } from 'react'
import { useToast } from '../components/Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import ExecutarReparacaoModal from '../components/ExecutarReparacaoModal'
import { Hammer, Plus, Trash2, Play, FileText, Mail, Zap, X, CheckCircle, Clock, AlertCircle, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getHojeAzores, formatDataAzores, formatDataHoraCurtaAzores } from '../utils/datasAzores'
import { logger } from '../utils/logger'
import './Reparacoes.css'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

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
  } = useData()
  const { canDelete } = usePermissions()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

  const [filtro, setFiltro] = useState('todas')
  const [modalExecucao, setModalExecucao] = useState(null)  // reparacao obj
  const [modalRelatorio, setModalRelatorio] = useState(null) // relatorio obj
  const [modalNova, setModalNova] = useState(false)
  const [formNova, setFormNova] = useState({ maquinaId: '', tecnico: '', data: getHojeAzores(), numeroAviso: '', descricaoAvaria: '' })
  const [errorsNova, setErrorsNova] = useState({})
  const [modalEmail, setModalEmail] = useState(null)
  const [emailDestino, setEmailDestino] = useState('')
  const [emailEnviando, setEmailEnviando] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [modalMensal, setModalMensal] = useState(false)
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

  const maquinasOrdenadas = useMemo(() =>
    [...maquinas].sort((a, b) => {
      const ca = clientes.find(c => c.nif === a.clienteNif)
      const cb = clientes.find(c => c.nif === b.clienteNif)
      return (ca?.nome ?? '').localeCompare(cb?.nome ?? '', 'pt')
    }),
  [maquinas, clientes])

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
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const handleEliminar = (rep) => {
    if (!canDelete) { showToast('Sem permissão para eliminar', 'warning'); return }
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

  const handleAbrirEmail = (rep) => {
    const rel = getRelatorioByReparacao(rep.id)
    if (!rel) { showToast('Sem relatório gerado para enviar', 'warning'); return }
    const maq = getMaquina(rep.maquinaId)
    const cli = maq ? getCliente(maq.clienteNif) : null
    setEmailDestino(cli?.email ?? '')
    setModalEmail({ rep, rel, maq, cli })
  }

  const handleEnviarEmail = async () => {
    if (!emailDestino?.trim()) { showToast('Indique o email de destino', 'warning'); return }
    const { rep, rel, maq, cli } = modalEmail
    showGlobalLoading()
    setEmailEnviando(true)
    try {
      const { relatorioReparacaoParaHtml } = await import('../utils/relatorioReparacaoHtml')
      const { enviarRelatorioEmail }       = await import('../services/emailService')
      const html = relatorioReparacaoParaHtml(rel, rep, maq, cli)
      await enviarRelatorioEmail({
        destinatario: emailDestino.trim(),
        assunto:      `Relatório de Reparação ${rel.numeroRelatorio} — ${maq?.marca ?? ''} ${maq?.modelo ?? ''}`,
        html,
        nomeCliente:  cli?.nome ?? '',
      })
      showToast('Relatório enviado com sucesso', 'success')
      logger.action('Reparacoes', 'enviarEmail', `Email enviado para ${emailDestino}`, { relId: rel.id })
      setModalEmail(null)
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
        <div className="page-header-left">
          <Hammer size={24} />
          <h1>Reparações</h1>
          {counts.pendente > 0 && (
            <span className="badge badge-danger">{counts.pendente} pendente{counts.pendente !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn secondary" onClick={() => setModalMensal(true)} title="Relatório mensal ISTOBAL">
            <BarChart2 size={16} /> Mensal ISTOBAL
          </button>
          <button type="button" className="btn primary" onClick={() => setModalNova(true)}>
            <Plus size={16} /> Nova Reparação
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
                        {canDelete && (
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
      )}

      {/* ── Modal: Nova Reparação ─────────────────────────────────────────── */}
      {modalNova && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Nova Reparação">
          <div className="modal modal-nova-rep">
            <div className="modal-header">
              <h2><Hammer size={18} /> Nova Reparação</h2>
              <button type="button" className="icon-btn" onClick={() => { setModalNova(false); setErrorsNova({}) }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Máquina <span className="required">*</span></label>
                <select
                  className={errorsNova.maquinaId ? 'input-error' : ''}
                  value={formNova.maquinaId}
                  onChange={e => setFormNova(p => ({ ...p, maquinaId: e.target.value }))}
                >
                  <option value="">— Seleccione —</option>
                  {maquinasOrdenadas.map(m => {
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

              <div className="form-row">
                <div className="form-group">
                  <label>Técnico <span className="required">*</span></label>
                  <input
                    type="text"
                    className={errorsNova.tecnico ? 'input-error' : ''}
                    value={formNova.tecnico}
                    onChange={e => setFormNova(p => ({ ...p, tecnico: e.target.value }))}
                    placeholder="Nome do técnico"
                  />
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

              <div className="form-group">
                <label>Nº de Aviso / Pedido de Assistência</label>
                <input
                  type="text"
                  value={formNova.numeroAviso}
                  onChange={e => setFormNova(p => ({ ...p, numeroAviso: e.target.value }))}
                  placeholder="Ex: 2026-RP-001 ou referência ISTOBAL"
                />
              </div>

              <div className="form-group">
                <label>Descrição da avaria / problema</label>
                <textarea
                  rows={3}
                  value={formNova.descricaoAvaria}
                  onChange={e => setFormNova(p => ({ ...p, descricaoAvaria: e.target.value }))}
                  placeholder="Descreva brevemente o problema reportado pelo cliente..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={() => { setModalNova(false); setErrorsNova({}) }}>
                Cancelar
              </button>
              <button type="button" className="btn primary" onClick={handleCriarReparacao}>
                <Plus size={15} /> Criar Reparação
              </button>
            </div>
          </div>
        </div>
      )}

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
      {modalEmail && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Enviar relatório por email">
          <div className="modal modal-email-rep">
            <div className="modal-header">
              <h2><Mail size={18} /> Enviar Relatório</h2>
              <button type="button" className="icon-btn" onClick={() => setModalEmail(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="email-info">
                Relatório <strong>{modalEmail.rel?.numeroRelatorio}</strong> — {modalEmail.maq?.marca} {modalEmail.maq?.modelo}
              </p>
              <div className="form-group">
                <label>Email de destino</label>
                <input
                  type="email"
                  value={emailDestino}
                  onChange={e => setEmailDestino(e.target.value)}
                  placeholder="cliente@empresa.pt"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={() => setModalEmail(null)} disabled={emailEnviando}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleEnviarEmail} disabled={emailEnviando}>
                {emailEnviando ? <><Clock size={14} className="spin" /> A enviar...</> : <><Mail size={14} /> Enviar</>}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <th>Aviso</th>
                        <th>Máquina</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Relatório</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reparacoesIstobaMensais.map(r => {
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
              <p className="text-danger">Esta acção é irreversível. O relatório associado também será eliminado.</p>
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
  const checklist = (() => { try { return JSON.parse(rel.checklistRespostas || '{}') } catch { return {} } })()

  return (
    <div className="relatorio-rep-view">
      <div className="rel-section">
        <h3>Dados gerais</h3>
        <div className="rel-grid">
          <span className="rel-label">Relatório</span><span>{rel.numeroRelatorio ?? '—'}</span>
          <span className="rel-label">Data</span><span>{rel.dataAssinatura ? formatDataAzores(rel.dataAssinatura) : '—'}</span>
          <span className="rel-label">Técnico</span><span>{rel.tecnico ?? '—'}</span>
          <span className="rel-label">Assinado por</span><span>{rel.nomeAssinante ?? '—'}{rel.assinadoPeloCliente ? ' ✓' : ''}</span>
          <span className="rel-label">Horas M.O.</span><span>{rel.horasMaoObra ?? '—'} h</span>
          {rel.numeroAviso && <><span className="rel-label">Aviso</span><span>{rel.numeroAviso}</span></>}
        </div>
      </div>
      {rel.descricaoAvaria && (
        <div className="rel-section">
          <h3>Avaria / Problema</h3>
          <p>{rel.descricaoAvaria}</p>
        </div>
      )}
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
    </div>
  )
}
