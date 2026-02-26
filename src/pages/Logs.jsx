/**
 * Logs.jsx — Painel de log do sistema (acesso restrito a Admin).
 *
 * Mostra todas as entradas de log dos últimos 60 dias com:
 *  - Estatísticas: total, erros, avisos, acções, sessões únicas, tamanho em bytes
 *  - Filtro por nível (fatal / error / warn / info / action)
 *  - Filtro por período (último dia / 7 / 15 / 30 / 60 dias)
 *  - Filtro por sessão (agrupa entradas da mesma sessão de browser)
 *  - Pesquisa de texto livre (componente, acção, mensagem, utilizador, rota)
 *  - Exportação como .txt (TSV, compatível Excel) ou .json
 *  - Limpeza total com confirmação
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { getLog, clearLog, exportLogAsText, exportLogAsJson, getLogStats, gerarRelatórioSuporte, flushLogsToServer, logger } from '../utils/logger'
// Import dinâmico — Logs.jsx é lazy; manter apiService fora do bundle principal
import { useToast } from '../components/Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { ArrowLeft, RefreshCw, Download, Trash2, AlertCircle, Info, Zap, AlertTriangle, Skull, ChevronDown, ChevronRight, ClipboardCopy } from 'lucide-react'
import './Logs.css'

// ── Constantes de configuração ────────────────────────────────────────────────

const LEVEL_META = {
  fatal:  { label: 'Fatal',  color: 'fatal'  },
  error:  { label: 'Erro',   color: 'error'  },
  warn:   { label: 'Aviso',  color: 'warn'   },
  info:   { label: 'Info',   color: 'info'   },
  action: { label: 'Acção',  color: 'action' },
}

const PERIOD_OPTIONS = [
  { label: 'Último dia',      days: 1  },
  { label: 'Últimos 7 dias',  days: 7  },
  { label: 'Últimos 15 dias', days: 15 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 60 dias', days: 60 },
]

// ── Sub-componentes ───────────────────────────────────────────────────────────

function LevelIcon({ level, size = 13 }) {
  const p = { size }
  if (level === 'fatal')  return <Skull {...p} />
  if (level === 'error')  return <AlertCircle {...p} />
  if (level === 'warn')   return <AlertTriangle {...p} />
  if (level === 'action') return <Zap {...p} />
  return <Info {...p} />
}

function fmtTs(ts) {
  return new Date(ts).toLocaleString('pt-PT', {
    timeZone: 'Atlantic/Azores',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtBytes(b) {
  if (b < 1024)       return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

function StatCard({ value, label, colorClass, small }) {
  return (
    <div className={`log-stat ${colorClass}`}>
      <span className={`log-stat-val${small ? ' log-stat-val--sm' : ''}`}>{value}</span>
      <span className="log-stat-lbl">{label}</span>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Logs() {
  const { isAdmin }  = usePermissions()
  const navigate     = useNavigate()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

  const [entries,      setEntries]      = useState([])
  const [stats,        setStats]        = useState({ total:0, fatals:0, errors:0, warns:0, actions:0, bytes:0, oldest:null, sessions:0 })
  const [filterLevel,  setFilterLevel]  = useState('all')
  const [filterDays,   setFilterDays]   = useState(7)
  const [filterSession,setFilterSession]= useState('all')
  const [search,       setSearch]       = useState('')
  const [expanded,     setExpanded]     = useState(null)
  const [logSource,    setLogSource]    = useState('local')
  const [loadingServer, setLoadingServer] = useState(false)

  const reload = useCallback(async () => {
    if (logSource === 'server') {
      setLoadingServer(true)
      showGlobalLoading()
      try {
        const { apiLogsList } = await import('../services/apiService')
        const serverEntries = await apiLogsList(filterDays)
        setEntries(Array.isArray(serverEntries) ? serverEntries : [])
        const s = Array.isArray(serverEntries) ? serverEntries : []
        setStats({
          total: s.length,
          fatals: s.filter(e => e.level === 'fatal').length,
          errors: s.filter(e => e.level === 'error').length,
          warns: s.filter(e => e.level === 'warn').length,
          actions: s.filter(e => e.level === 'action').length,
          bytes: 0,
          oldest: s.length ? Math.min(...s.map(e => e.ts)) : null,
          sessions: new Set(s.map(e => e.sessionId)).size,
        })
      } catch (err) {
        logger.error('Logs', 'reload', 'Falha ao carregar logs do servidor', { msg: err?.message })
        showToast('Não foi possível carregar logs do servidor.', 'error')
      } finally {
        setLoadingServer(false)
        hideGlobalLoading()
      }
    } else {
      setEntries(getLog())
      setStats(getLogStats())
    }
  }, [logSource, filterDays, showToast, showGlobalLoading, hideGlobalLoading])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  // Lista de sessões únicas para o filtro
  const sessions = useMemo(() => {
    const map = new Map()
    entries.forEach(e => {
      if (!map.has(e.sessionId)) {
        map.set(e.sessionId, { id: e.sessionId, first: e.ts, user: e.userId })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.first - a.first)
  }, [entries])

  const cutoff = useMemo(() => Date.now() - filterDays * 24 * 60 * 60 * 1000, [filterDays])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (e.ts < cutoff) return false
      if (filterLevel !== 'all' && e.level !== filterLevel) return false
      if (filterSession !== 'all' && e.sessionId !== filterSession) return false
      if (q) {
        const haystack = [e.component, e.action, e.message, e.userId, e.route, e.version]
          .join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [entries, cutoff, filterLevel, filterSession, search])

  async function handleFlush() {
    try {
      await flushLogsToServer()
      showToast('Logs enviados para o servidor com sucesso.', 'success')
    } catch (err) {
      logger.error('Logs', 'handleFlush', 'Falha ao enviar logs ao servidor', { msg: err?.message })
      showToast('Não foi possível contactar o servidor.', 'error')
    }
  }

  async function handleCopiarSuporte() {
    const texto = gerarRelatórioSuporte()
    try {
      await navigator.clipboard.writeText(texto)
      showToast('Relatório copiado! Cole no chat com o assistente.', 'success', 3500)
    } catch {
      // Fallback: abre numa janela de texto para copiar manualmente
      const w = window.open('', '_blank', 'width=700,height=500')
      if (w) {
        w.document.write(`<pre style="font-family:monospace;font-size:13px;padding:1rem;white-space:pre-wrap">${texto.replace(/</g,'&lt;')}</pre>`)
        w.document.title = 'Relatório de suporte AT_Manut'
      }
      showToast('Seleccione o texto e copie (Ctrl+A, Ctrl+C).', 'info', 4000)
    }
  }

  function handleClear() {
    if (!window.confirm('Apagar todo o log permanentemente? Esta acção não pode ser desfeita.')) return
    clearLog()
    reload()
  }

  if (!isAdmin) return null

  return (
    <div className="page logs-page">

      {/* Cabeçalho */}
      <div className="page-header">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Voltar atrás
        </button>
        <div>
          <h1>Log do Sistema</h1>
          <p className="page-sub">
            {logSource === 'server'
              ? 'Logs do servidor — todos os utilizadores e dispositivos'
              : 'Registo local — últimos 60 dias'}
            {stats.oldest ? ` · desde ${new Date(stats.oldest).toLocaleDateString('pt-PT', { timeZone: 'Atlantic/Azores' })}` : ''}
          </p>
        </div>
      </div>

      {/* Caixa de ajuda — como usar o log para reportar problemas */}
      <div className="log-help-box">
        <strong>Como reportar um problema ao assistente:</strong>
        <ol>
          <li>Reproduza o erro na aplicação normalmente.</li>
          <li>Volte a este painel (menu lateral → <em>Logs</em>).</li>
          <li>Clique em <strong>Copiar para suporte</strong>.</li>
          <li>Cole o texto copiado no chat — o assistente analisa e resolve.</li>
        </ol>
        <p>Não precisa de saber o que aconteceu tecnicamente — o log regista tudo automaticamente.</p>
      </div>

      {/* Estatísticas */}
      <div className="log-stats">
        <StatCard value={stats.total}    label="Total"    colorClass="log-stat--total"  />
        <StatCard value={stats.fatals}   label="Fatais"   colorClass="log-stat--fatal"  />
        <StatCard value={stats.errors}   label="Erros"    colorClass="log-stat--error"  />
        <StatCard value={stats.warns}    label="Avisos"   colorClass="log-stat--warn"   />
        <StatCard value={stats.actions}  label="Acções"   colorClass="log-stat--action" />
        <StatCard value={stats.sessions} label="Sessões"  colorClass="log-stat--info"   />
        <StatCard value={fmtBytes(stats.bytes)} label="No disco" colorClass="log-stat--bytes" small />
      </div>

      {/* Toolbar: filtros + acções */}
      <div className="card log-toolbar">
        <div className="log-filters">
          <select value={logSource} onChange={e => setLogSource(e.target.value)} className="log-select" title="Origem dos logs">
            <option value="local">Este dispositivo</option>
            <option value="server">Servidor (todos os users)</option>
          </select>

          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="log-select">
            <option value="all">Todos os níveis</option>
            {Object.entries(LEVEL_META).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>

          <select value={filterDays} onChange={e => setFilterDays(Number(e.target.value))} className="log-select">
            {PERIOD_OPTIONS.map(o => (
              <option key={o.days} value={o.days}>{o.label}</option>
            ))}
          </select>

          <select value={filterSession} onChange={e => setFilterSession(e.target.value)} className="log-select">
            <option value="all">Todas as sessões</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.first).toLocaleString('pt-PT', { timeZone: 'Atlantic/Azores', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                {s.user ? ` · ${s.user}` : ''} — {s.id}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Pesquisar componente, acção, mensagem, utilizador…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="log-search"
          />
        </div>

        <div className="log-actions">
          <button type="button" className="icon-btn" onClick={reload} title="Actualizar" disabled={loadingServer}>
            <RefreshCw size={16} className={loadingServer ? 'spin' : ''} />
          </button>
          <button type="button" className="icon-btn" onClick={handleFlush} title="Enviar logs pendentes para o servidor agora">
            <RefreshCw size={16} />
            <span className="log-btn-label">Sync</span>
          </button>
          <button
            type="button"
            className="btn-suporte"
            onClick={handleCopiarSuporte}
            title="Copiar relatório de erros para colar no chat com o assistente"
          >
            <ClipboardCopy size={15} />
            Copiar para suporte
          </button>
          <button type="button" className="icon-btn" onClick={exportLogAsText} title="Exportar como .txt (Excel)">
            <Download size={16} />
            <span className="log-btn-label">TXT</span>
          </button>
          <button type="button" className="icon-btn" onClick={exportLogAsJson} title="Exportar como .json">
            <Download size={16} />
            <span className="log-btn-label">JSON</span>
          </button>
          <button type="button" className="icon-btn danger" onClick={handleClear} title="Limpar todo o log">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Contador de resultados */}
      <p className="log-count text-muted">
        {filtered.length === 0
          ? 'Nenhuma entrada encontrada com os filtros actuais.'
          : `${filtered.length} entrada${filtered.length !== 1 ? 's' : ''} · clique numa linha para ver detalhes técnicos`}
      </p>

      {/* Lista */}
      <div className="log-list">
        {filtered.map((e, i) => {
          const id   = `${e.ts}-${i}`
          const open = expanded === id
          const meta = LEVEL_META[e.level] || LEVEL_META.info
          return (
            <div
              key={id}
              className={`log-entry log-entry--${meta.color}${open ? ' log-entry--open' : ''}`}
              onClick={() => setExpanded(open ? null : id)}
            >
              <div className="log-entry-main">
                {/* Indicador de expansão */}
                <span className="log-expand-icon">
                  {e.details ? (open ? <ChevronDown size={12}/> : <ChevronRight size={12}/>) : <span style={{width:12}}/>}
                </span>

                {/* Nível */}
                <span className={`log-badge log-badge--${meta.color}`}>
                  <LevelIcon level={e.level} />
                  {meta.label}
                </span>

                {/* Timestamp */}
                <span className="log-ts">{fmtTs(e.ts)}</span>

                {/* Contexto: utilizador e rota */}
                {(e.userId || e.route) && (
                  <span className="log-context">
                    {e.userId && <span className="log-user">{e.userId}</span>}
                    {e.route  && <span className="log-route">{e.route.replace('/manut', '')}</span>}
                  </span>
                )}

                {/* Componente › acção */}
                <span className="log-component">{e.component}</span>
                <span className="log-sep">›</span>
                <span className="log-action">{e.action}</span>

                {/* Mensagem */}
                <span className="log-message">{e.message}</span>

                {/* Versão (pequena, à direita) */}
                {e.version && e.version !== '?' && (
                  <span className="log-version">v{e.version}</span>
                )}
              </div>

              {/* Detalhes expandidos */}
              {open && (
                <div className="log-details-wrap">
                  <div className="log-details-meta">
                    <span><strong>Session:</strong> {e.sessionId}</span>
                    <span><strong>Rota:</strong> {e.route}</span>
                    <span><strong>Versão:</strong> {e.version}</span>
                    <span><strong>User:</strong> {e.userId || '(sem sessão)'}</span>
                    {e.mobile != null && <span><strong>Dispositivo:</strong> {e.mobile ? 'Mobile' : 'Desktop'}</span>}
                  </div>
                  {e.details && (
                    <pre className="log-details">{JSON.stringify(e.details, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
