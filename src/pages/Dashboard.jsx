/**
 * Dashboard – Visão geral: cartões Em atraso/Próximas/Executadas, calendário, action sheet.
 * Mobile: layout simplificado; link para Agendar NOVO e Manutenções.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { logger } from '../utils/logger'
import { Cpu, Wrench, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, X, Users, Search, Play, CalendarPlus, Package, ArrowLeft, Clock, PartyPopper } from 'lucide-react'
// Search e Play mantidos para uso no day-panel
import {
  format,
  isBefore,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { getHojeAzores } from '../utils/datasAzores'
import RelatorioView from '../components/RelatorioView'
import AlertaProactivoModal from '../components/AlertaProactivoModal'
import { getManutencoesPendentesAlertas, getDiasAviso, isAlertsModalDismissedToday, dismissAlertsModalToday } from '../config/alertasConfig'
import './Dashboard.css'
import { pt } from 'date-fns/locale'

export default function Dashboard() {
  const { maquinas, manutencoes, clientes, getSubcategoria, getRelatorioByManutencao, getChecklistBySubcategoria } = useData()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const getMaquina = (id) => maquinas.find(m => m.id === id)
  const getCliente = (nif) => clientes.find(c => c.nif === nif)
  const navigate = useNavigate()
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [agendarDay, setAgendarDay] = useState(null)
  const [viewingManutencao, setViewingManutencao] = useState(null)

  // ── Alertas proactivos de conformidade (Admin) ────────────────────────────
  const [alertasProactivos, setAlertasProactivos] = useState([])
  const [showAlertaModal, setShowAlertaModal]     = useState(false)
  const alertaChecked = useRef(false)

  useEffect(() => {
    if (!isAdmin || alertaChecked.current) return
    alertaChecked.current = true
    if (isAlertsModalDismissedToday()) return
    const dias  = getDiasAviso()
    const items = getManutencoesPendentesAlertas(manutencoes, maquinas, clientes, dias)
    if (items.length > 0) {
      setAlertasProactivos(items)
      setShowAlertaModal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const pendentes = useMemo(() =>
    manutencoes.filter(m => m.status === 'pendente' || m.status === 'agendada'),
  [manutencoes])

  const executadas = useMemo(() =>
    manutencoes.filter(m => m.status === 'concluida'),
  [manutencoes])

  const emAtraso = useMemo(() =>
    pendentes.filter(m => isBefore(new Date(m.data), new Date())),
  [pendentes])

  const proximas = useMemo(() =>
    pendentes.filter(m => !isBefore(new Date(m.data), new Date())),
  [pendentes])

  // "O meu dia" — manutenções pendentes de hoje e em atraso, ordenadas por data
  const hoje = getHojeAzores()
  const paraHoje = useMemo(() =>
    manutencoes
      .filter(m => (m.status === 'pendente' || m.status === 'agendada') && m.data <= hoje)
      .sort((a, b) => a.data.localeCompare(b.data)),
  [manutencoes, hoje])

  // Etapa 2 — Alerta de conformidade: dias máximos em atraso
  const diasMaxAtraso = useMemo(() => {
    if (emAtraso.length === 0) return 0
    const oldest = emAtraso.reduce((min, m) => m.data < min ? m.data : min, emAtraso[0].data)
    return Math.floor((new Date() - new Date(oldest)) / (1000 * 60 * 60 * 24))
  }, [emAtraso])

  // Pré-calcula índice de manutenções por data (string yyyy-MM-dd) para acesso O(1)
  const manutByDate = useMemo(() => {
    const idx = {}
    manutencoes.forEach(m => {
      if (!idx[m.data]) idx[m.data] = []
      idx[m.data].push(m)
    })
    return idx
  }, [manutencoes])

  const maqByDate = useMemo(() => {
    const idx = {}
    maquinas.forEach(e => {
      if (!idx[e.proximaManut]) idx[e.proximaManut] = 0
      idx[e.proximaManut]++
    })
    return idx
  }, [maquinas])

  const getManutencoesForDay = useCallback((date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return manutByDate[dateStr] ?? []
  }, [manutByDate])

  const getDayMarkers = useCallback((date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const hojeStr = getHojeAzores()
    const list = manutByDate[dateStr] ?? []
    const executadasN = list.filter(m => m.status === 'concluida').length
    const pendentesList = list.filter(m => m.status === 'pendente' || m.status === 'agendada')
    const atrasoN = pendentesList.filter(m => dateStr < hojeStr).length
    const proximasN = pendentesList.filter(m => dateStr >= hojeStr).length
    const atrasoMaq = (dateStr < hojeStr) ? (maqByDate[dateStr] ?? 0) : 0
    return { executadas: executadasN, proximas: proximasN, atraso: atrasoN + atrasoMaq }
  }, [manutByDate, maqByDate])

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = []
  let d = calendarStart
  while (d <= calendarEnd) {
    calendarDays.push(d)
    d = addDays(d, 1)
  }

  return (
    <div className="page">
      <div className="page-header dashboard-page-header">
        <h1>Dashboard</h1>
        <div className="dashboard-header-spacer" aria-hidden="true" />
      </div>

      {/* Modal de alertas de conformidade (Admin, início de sessão) */}
      <AlertaProactivoModal
        isOpen={showAlertaModal}
        alertas={alertasProactivos}
        onClose={() => setShowAlertaModal(false)}
        onDismiss={() => {
          dismissAlertsModalToday()
          setShowAlertaModal(false)
        }}
      />

      <div className="cards-row cards-row-mobile">
        <Link
          to="/manutencoes?filter=atraso"
          className={`card stat-card stat-card-link stat-card-mobile stat-card-red${diasMaxAtraso >= 7 ? ' stat-card-pulse' : ''}`}
        >
          <AlertTriangle size={24} className="stat-icon" />
          <div>
            <span className="stat-value">{emAtraso.length}</span>
            <span className="stat-label">Em atraso</span>
            {diasMaxAtraso >= 7 && (
              <span className="stat-alerta-dias">⚠ Há {diasMaxAtraso} dias!</span>
            )}
          </div>
        </Link>
        <Link to="/manutencoes?filter=proximas" className="card stat-card stat-card-link stat-card-mobile stat-card-yellow">
          <Wrench size={24} className="stat-icon" />
          <div>
            <span className="stat-value">{proximas.length}</span>
            <span className="stat-label">Próximas</span>
          </div>
        </Link>
        <Link to="/manutencoes?filter=executadas" className="card stat-card stat-card-link stat-card-mobile stat-card-green">
          <CheckCircle size={24} className="stat-icon" />
          <div>
            <span className="stat-value">{executadas.length}</span>
            <span className="stat-label">Executadas</span>
          </div>
        </Link>
      </div>

      {/* ── Etapa 1: O meu dia ─────────────────────────────────────────── */}
      <div className={`meu-dia-section card${!isAdmin ? ' meu-dia-destaque' : ''}`}>
        <div className="meu-dia-header">
          <div className="meu-dia-titulo">
            <Clock size={18} />
            <span>{isAdmin ? 'Hoje' : 'O meu dia'}</span>
            <span className="meu-dia-data">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Atlantic/Azores' })}
            </span>
          </div>
          {paraHoje.length > 0 && (
            <span className="badge badge-danger">{paraHoje.length} pendente{paraHoje.length > 1 ? 's' : ''}</span>
          )}
        </div>

        {paraHoje.length === 0 ? (
          <div className="meu-dia-vazio">
            <PartyPopper size={22} />
            <span>Sem intervenções pendentes para hoje!</span>
          </div>
        ) : (
          <ul className="meu-dia-lista">
            {paraHoje.map(m => {
              const maq = getMaquina(m.maquinaId)
              const sub = getSubcategoria(maq?.subcategoriaId)
              const cli = maq ? getCliente(maq.clienteNif) : null
              const diasAtraso = Math.floor((new Date() - new Date(m.data)) / (1000 * 60 * 60 * 24))
              const filtro = isBefore(new Date(m.data), new Date()) ? 'atraso' : 'proximas'
              return (
                <li key={m.id} className="meu-dia-item">
                  <div className="meu-dia-item-info">
                    <span className="meu-dia-item-nome">
                      {sub?.nome ? `${sub.nome} — ` : ''}{maq?.marca} {maq?.modelo}
                    </span>
                    <span className="meu-dia-item-cliente">{cli?.nome ?? '—'}</span>
                  </div>
                  <div className="meu-dia-item-right">
                    {diasAtraso > 0 && (
                      <span className="badge badge-danger meu-dia-badge-atraso">
                        {diasAtraso}d atraso
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn primary btn-sm"
                      onClick={() => navigate(`/manutencoes?filter=${filtro}`, { state: { openExecucaoId: m.id } })}
                    >
                      <Play size={13} /> Executar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-calendar-card">
          <div className="dashboard-calendar-header">
            <h2>Calendário</h2>
            <div className="calendar-nav-mini">
              <button type="button" className="icon-btn secondary" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} aria-label="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <span className="calendar-title-mini">{format(calendarMonth, 'MMMM yyyy', { locale: pt })}</span>
              <button type="button" className="icon-btn secondary" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} aria-label="Mês seguinte">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="dashboard-calendar-grid">
            {weekDays.map(w => (
              <div key={w} className="dashboard-cal-weekday">{w}</div>
            ))}
            {calendarDays.map(day => {
              const markers = getDayMarkers(day)
              const isCurrentMonth = isSameMonth(day, calendarMonth)
              const isToday = isSameDay(day, new Date())
              const hasManutencoes = (getManutencoesForDay(day)?.length ?? 0) > 0
              const hasMarkers = markers.atraso > 0 || markers.proximas > 0 || markers.executadas > 0
              const statusClass = markers.atraso > 0 ? 'cal-status-red' : markers.proximas > 0 ? 'cal-status-orange' : markers.executadas > 0 ? 'cal-status-green' : ''
              const parts = []
              if (markers.executadas > 0) parts.push(`${markers.executadas} executada(s)`)
              if (markers.proximas > 0) parts.push(`${markers.proximas} próxima(s)`)
              if (markers.atraso > 0) parts.push(`${markers.atraso} em atraso`)
              const title = hasManutencoes ? parts.join(' · ') : `Agendar para ${format(day, "d 'de' MMMM yyyy", { locale: pt })}`
              const handleClick = () => {
                if (hasManutencoes) setSelectedDay(day)
                else setAgendarDay(day)
              }
              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={handleClick}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleClick())}
                  className={`dashboard-cal-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${statusClass} cal-day-clickable`}
                  title={title}
                >
                  <span className="day-num">{format(day, 'd')}</span>
                </div>
              )
            })}
          </div>
          <div className="dashboard-calendar-legend">
            <span><span className="dot dot-green" /> Executadas</span>
            <span><span className="dot dot-orange" /> Próximas</span>
            <span><span className="dot dot-red" /> Em atraso</span>
          </div>
          <Link to="/calendario" className="btn-link" style={{ marginTop: '0.75rem' }}>
            Ver calendário completo
          </Link>
        </div>

        <div className="dashboard-nav-cards-row">
              <Link to="/clientes" className="card stat-card stat-card-link stat-card-nav stat-card-clientes">
                <Users size={18} className="stat-icon" />
                <div>
                  <span className="stat-value">{clientes.length}</span>
                  <span className="stat-label">Clientes</span>
                </div>
              </Link>
              <Link to="/equipamentos" className="card stat-card stat-card-link stat-card-nav stat-card-equipamentos">
                <Cpu size={18} className="stat-icon" />
                <div>
                  <span className="stat-value">{maquinas.length}</span>
                  <span className="stat-label">Equipamentos</span>
                </div>
              </Link>
              <Link to="/agendamento" className="card stat-card stat-card-link stat-card-nav stat-card-novo">
                <CalendarPlus size={18} className="stat-icon" />
                <div>
                  <span className="stat-value">+</span>
                  <span className="stat-label">Agendar NOVO</span>
                </div>
              </Link>
            </div>

        {agendarDay && (
          <div className="day-panel-overlay" onClick={() => setAgendarDay(null)} aria-hidden="false">
            <div className="day-panel agendar-tipo-panel" onClick={e => e.stopPropagation()}>
              <div className="day-panel-header">
                <h3>Novo agendamento – {format(agendarDay, "EEEE, d 'de' MMMM yyyy", { locale: pt })}</h3>
                <button type="button" className="icon-btn secondary" onClick={() => setAgendarDay(null)} aria-label="Fechar">
                  <X size={20} />
                </button>
              </div>
              <div className="day-panel-list">
                <p className="agendar-tipo-intro">Selecione o tipo de serviço:</p>
                <div className="agendar-tipo-buttons">
                  <button
                    type="button"
                    className="btn primary agendar-tipo-btn"
                    onClick={() => {
                      setAgendarDay(null)
                      const dataStr = format(agendarDay, 'yyyy-MM-dd')
                      navigate('/agendamento', { state: { dataFromCalendar: dataStr, tipoPreenchido: 'montagem' } })
                    }}
                  >
                    <Package size={24} />
                    Montagem
                  </button>
                  <button
                    type="button"
                    className="btn primary agendar-tipo-btn"
                    onClick={() => {
                      setAgendarDay(null)
                      const dataStr = format(agendarDay, 'yyyy-MM-dd')
                      navigate('/agendamento', { state: { dataFromCalendar: dataStr, tipoPreenchido: 'periodica' } })
                    }}
                  >
                    <Wrench size={24} />
                    Manutenção Periódica
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedDay && (
          <div className="day-panel-overlay" onClick={() => setSelectedDay(null)} aria-hidden="false">
            <div className="day-panel" onClick={e => e.stopPropagation()}>
              <div className="day-panel-header">
                <h3>Manutenções – {format(selectedDay, "EEEE, d 'de' MMMM yyyy", { locale: pt })}</h3>
                <button type="button" className="icon-btn secondary" onClick={() => setSelectedDay(null)} aria-label="Fechar">
                  <X size={20} />
                </button>
              </div>
              <div className="day-panel-list">
                {getManutencoesForDay(selectedDay).length === 0 ? (
                  <p className="text-muted">Nenhuma manutenção neste dia.</p>
                ) : (
                  getManutencoesForDay(selectedDay).map(m => {
                    const maq = maquinas.find(x => x.id === m.maquinaId)
                    const sub = getSubcategoria(maq?.subcategoriaId)
                    const desc = maq ? `${sub?.nome || ''} — ${maq.marca} ${maq.modelo}`.trim() : 'Equipamento'
                    const dataManut = new Date(m.data)
                    const statusBadge = m.status === 'concluida' ? 'badge-success' : !isBefore(dataManut, new Date()) ? 'badge-warning' : 'badge-danger'
                    const statusLabel = m.status === 'concluida' ? 'Executada' : !isBefore(dataManut, new Date()) ? 'Próxima' : 'Em atraso'
                    const podeExecutar = m.status === 'pendente' || m.status === 'agendada'
                    return (
                      <div key={m.id} className="day-panel-item">
                        <div className="day-panel-item-main">
                          <strong>{desc}</strong>
                          <span className={`badge ${statusBadge}`}>{statusLabel}</span>
                        </div>
                        <div className="day-panel-item-actions">
                          <button
                            type="button"
                            className="btn secondary btn-sm"
                            onClick={() => {
                              const rel = getRelatorioByManutencao(m.id)
                              if (!rel) {
                                logger.warn('Dashboard', 'viewManutencaoSemRelatorio', 'Manutenção sem relatório visualizada — ficha agendada mostrada', { manutencaoId: m.id, maquinaId: m.maquinaId })
                              }
                              setViewingManutencao(m)
                            }}
                          >
                            <Search size={16} /> Ver manutenção
                          </button>
                          {podeExecutar && (
                            <button
                              type="button"
                              className="btn primary btn-sm"
                              onClick={() => {
                                setSelectedDay(null)
                                const filtro = isBefore(new Date(m.data), new Date()) ? 'atraso' : 'proximas'
                                navigate(`/manutencoes?filter=${filtro}`, { state: { openExecucaoId: m.id } })
                              }}
                            >
                              <Play size={16} /> Executar manutenção
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Painel de detalhe da manutenção (sobrepõe o painel do dia) */}
        {viewingManutencao && (() => {
          const m = viewingManutencao
          const maq = getMaquina(m?.maquinaId)
          const cliente = maq ? getCliente(maq.clienteNif) : null
          const relatorio = getRelatorioByManutencao(m?.id)
          const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
          const checklistItems = sub ? getChecklistBySubcategoria(sub.id, m?.tipo || 'periodica') : []
          const dataFormatada = m?.data ? format(new Date(m.data), "d 'de' MMMM 'de' yyyy", { locale: pt }) : '—'
          const statusLabel = m?.status === 'concluida' ? 'Executada' : !isBefore(new Date(m?.data || 0), new Date()) ? 'Próxima' : 'Em atraso'
          return (
            <div
              className="day-panel-overlay manutencao-detalhe-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="manutencao-detalhe-title"
              onClick={(e) => { if (e.target === e.currentTarget) setViewingManutencao(null) }}
            >
              <div className="day-panel manutencao-detalhe-panel" onClick={e => e.stopPropagation()}>
                <div className="day-panel-header">
                  <h3 id="manutencao-detalhe-title">
                    {sub?.nome || ''} — {maq?.marca || ''} {maq?.modelo || ''}
                  </h3>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => setViewingManutencao(null)}
                    aria-label="Voltar atrás"
                  >
                    <ArrowLeft size={14} /> Voltar atrás
                  </button>
                </div>
                <div className="day-panel-body manutencao-detalhe-body">
                  {relatorio ? (
                    <RelatorioView
                      relatorio={relatorio}
                      manutencao={m}
                      maquina={maq}
                      cliente={cliente}
                      checklistItems={checklistItems}
                    />
                  ) : (
                    <div className="manutencao-detalhe-placeholder manutencao-ficha-agendada">
                      <p className="text-muted" style={{ marginBottom: '1rem' }}>Esta manutenção ainda não tem relatório associado.</p>
                      <section className="relatorio-section" style={{ marginBottom: '1rem' }}>
                        <h3>Ficha da manutenção agendada</h3>
                        <p><strong>Equipamento:</strong> {maq ? `${maq.marca || ''} ${maq.modelo || ''} — Nº Série: ${maq.numeroSerie || '—'}` : '—'}</p>
                        <p><strong>Cliente:</strong> {cliente?.nome ?? '—'}</p>
                        <p><strong>Data agendada:</strong> {dataFormatada}</p>
                        <p><strong>Tipo:</strong> {m?.tipo === 'montagem' ? 'Montagem' : 'Manutenção periódica'}</p>
                        <p><strong>Estado:</strong> {statusLabel}</p>
                        {m?.observacoes && <p><strong>Observações:</strong> {m.observacoes}</p>}
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

    </div>
  )
}
