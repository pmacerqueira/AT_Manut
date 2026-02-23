/**
 * Definicoes.jsx — Painel de administração e gestão de dados (acesso restrito a Admin).
 *
 * Funcionalidades:
 *  - Exportar todos os dados para ficheiro JSON (backup local)
 *  - Importar/restaurar dados a partir de ficheiro JSON
 *  - Aviso sobre a natureza do armazenamento (localStorage)
 */
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useData } from '../context/DataContext'
import { useToast } from '../components/Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { logger } from '../utils/logger'
import { getDiasAviso, setDiasAviso } from '../config/alertasConfig'
import { ArrowLeft, Download, Upload, Database, AlertTriangle, CheckCircle, Info, Shield, Bell, Sun, HardDrive } from 'lucide-react'
import './Definicoes.css'

export default function Definicoes() {
  const { isAdmin }             = usePermissions()
  const navigate                = useNavigate()
  const { showToast }           = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const { exportarDados, restaurarDados, clientes, maquinas, manutencoes, relatorios } = useData()

  const fileInputRef = useRef(null)
  const [importing,    setImporting]   = useState(false)
  const [lastExport,   setLastExport]  = useState(() => localStorage.getItem('atm_last_export') ?? null)
  const [diasAviso,     setDiasAvisoUI]  = useState(() => getDiasAviso())
  const [diasAvisoErro, setDiasAvisoErro] = useState('')
  const [modoCampo,     setModoCampoUI]  = useState(() => localStorage.getItem('atm_modo_campo') === 'true')

  const handleToggleModoCampo = (activo) => {
    setModoCampoUI(activo)
    localStorage.setItem('atm_modo_campo', String(activo))
    document.body.classList.toggle('modo-campo', activo)
    logger.action('Definicoes', 'modoCampo', activo ? 'Modo campo activado' : 'Modo campo desactivado')
    showToast(activo ? 'Modo campo activado.' : 'Modo campo desactivado.', 'success')
  }

  const handleSalvarAlertas = () => {
    const v = parseInt(diasAviso, 10)
    if (!Number.isFinite(v) || v < 1 || v > 60) {
      setDiasAvisoErro('Introduza um valor entre 1 e 60 dias.')
      return
    }
    setDiasAvisoErro('')
    setDiasAviso(v)
    logger.action('Definicoes', 'salvarAlertas', `Dias de aviso definidos para ${v} dia(s)`)
    showToast(`Alertas configurados: aviso com ${v} dia(s) de antecedência.`, 'success')
  }

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  // ── Estatísticas rápidas ────────────────────────────────────────────────────
  const stats = [
    { label: 'Clientes',    value: clientes.length   },
    { label: 'Máquinas',    value: maquinas.length   },
    { label: 'Manutenções', value: manutencoes.length },
    { label: 'Relatórios',  value: relatorios.length },
  ]

  // Estima tamanho total e percentagem de uso do localStorage
  const calcUsageLS = () => {
    const ALL_KEYS = Object.keys(localStorage)
    const bytes = ALL_KEYS.reduce((acc, k) => acc + ((localStorage.getItem(k)?.length ?? 0) * 2), 0) // UTF-16: 2 bytes/char
    const QUOTA_BYTES = 5 * 1024 * 1024 // 5 MB (estimativa conservadora)
    const pct  = Math.min(100, Math.round((bytes / QUOTA_BYTES) * 100))
    const fmt  = bytes < 1024 ? `${bytes} B`
               : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB`
               : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return { bytes, pct, fmt }
  }

  // Estima tamanho do backup em KB (só dados da app)
  const estimarTamanho = () => {
    const keys = ['atm_clientes','atm_categorias','atm_subcategorias','atm_checklist','atm_maquinas','atm_manutencoes','atm_relatorios']
    const bytes = keys.reduce((acc, k) => acc + (localStorage.getItem(k)?.length ?? 0), 0)
    return bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const lsUsage = calcUsageLS()

  // ── Exportar ────────────────────────────────────────────────────────────────
  const handleExportar = () => {
    exportarDados()
    const now = new Date().toISOString()
    localStorage.setItem('atm_last_export', now)
    setLastExport(now)
    logger.action('Definicoes', 'exportarDados', 'Backup de dados exportado')
    showToast('Backup exportado com sucesso.', 'success')
  }

  // ── Importar ────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    showGlobalLoading()

    const MAX_BACKUP_BYTES = 50 * 1024 * 1024 // 50 MB
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const raw = ev.target.result
        if (typeof raw !== 'string' || raw.length > MAX_BACKUP_BYTES) {
          showToast('Ficheiro demasiado grande (máx. 50 MB).', 'error')
          setImporting(false)
          hideGlobalLoading()
          return
        }
        const backup = JSON.parse(raw)
        if (!backup || typeof backup !== 'object') {
          showToast('Ficheiro inválido: JSON malformado.', 'error')
          setImporting(false)
          hideGlobalLoading()
          return
        }
        const d = backup.dados
        if (!d || typeof d !== 'object') {
          showToast('Ficheiro inválido: campo "dados" em falta.', 'error')
          setImporting(false)
          hideGlobalLoading()
          return
        }
        const schemaKeys = ['clientes', 'categorias', 'subcategorias', 'checklistItems', 'maquinas', 'manutencoes', 'relatorios']
        const invalid = schemaKeys.filter(k => d[k] !== undefined && !Array.isArray(d[k]))
        if (invalid.length > 0) {
          showToast(`Ficheiro inválido: ${invalid.join(', ')} devem ser arrays.`, 'error')
          setImporting(false)
          hideGlobalLoading()
          return
        }
        const resultado = await restaurarDados(backup)
        if (resultado.ok) {
          logger.action('Definicoes', 'restaurarDados', `Dados restaurados a partir de backup (${file.name})`)
          showToast(resultado.message, 'success')
        } else {
          logger.error('Definicoes', 'restaurarDados', resultado.message)
          showToast(resultado.message, 'error')
        }
      } catch {
        const msg = 'Ficheiro inválido ou corrompido.'
        logger.error('Definicoes', 'restaurarDados', msg)
        showToast(msg, 'error')
      } finally {
        setImporting(false)
        hideGlobalLoading()
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      showToast('Erro ao ler o ficheiro.', 'error')
      setImporting(false)
      hideGlobalLoading()
    }
    reader.readAsText(file)
  }

  const fmtTs = (iso) => iso
    ? new Date(iso).toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—'

  return (
    <div className="def-page">
      {/* Cabeçalho */}
      <div className="def-header">
        <button type="button" className="def-back-btn" onClick={() => navigate(-1)} title="Voltar">
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="def-title-wrap">
          <Shield size={22} className="def-title-icon" />
          <h1 className="def-title">Definições</h1>
        </div>
      </div>

      {/* Alerta informativo */}
      <div className="def-alert def-alert--info">
        <Info size={18} />
        <div>
          <strong>Armazenamento local</strong> — Os dados da aplicação estão guardados no browser deste dispositivo.
          Exporta regularmente um backup para proteger o teu trabalho. Em caso de limpeza de cache ou mudança de dispositivo, o backup permite restaurar tudo em segundos.
        </div>
      </div>

      {/* Estatísticas */}
      <section className="def-section">
        <h2 className="def-section-title">
          <Database size={17} />
          Base de dados actual
        </h2>
        <div className="def-stats-grid">
          {stats.map(s => (
            <div key={s.label} className="def-stat-card">
              <span className="def-stat-val">{s.value}</span>
              <span className="def-stat-lbl">{s.label}</span>
            </div>
          ))}
          <div className="def-stat-card def-stat-card--size">
            <span className="def-stat-val">{estimarTamanho()}</span>
            <span className="def-stat-lbl">Tamanho estimado</span>
          </div>
        </div>

        {/* Indicador de uso do localStorage */}
        <div className="def-ls-usage">
          <div className="def-ls-usage-header">
            <HardDrive size={14} />
            <span>Espaço em localStorage</span>
            <span className="def-ls-usage-val">{lsUsage.fmt} <span className="def-ls-usage-pct">({lsUsage.pct}%)</span></span>
          </div>
          <div className="def-ls-bar">
            <div
              className={`def-ls-bar-fill ${lsUsage.pct >= 85 ? 'def-ls-bar-fill--crit' : lsUsage.pct >= 60 ? 'def-ls-bar-fill--warn' : ''}`}
              style={{ width: `${lsUsage.pct}%` }}
            />
          </div>
          {lsUsage.pct >= 70 && (
            <p className="def-ls-aviso">
              <AlertTriangle size={13} />
              Armazenamento a atingir o limite. Exporta um backup e considera limpar dados antigos.
            </p>
          )}
        </div>
      </section>

      {/* Modo campo */}
      <section className="def-section">
        <h2 className="def-section-title">
          <Sun size={17} />
          Modo campo
        </h2>
        <p className="def-section-desc">
          Activa um tema de alto contraste optimizado para uso ao ar livre (luz solar intensa, luvas).
          O texto e botões ficam maiores e o esquema de cores passa a claro para máxima legibilidade.
        </p>
        <div className="def-toggle-row">
          <div className="def-toggle-info">
            <span className="def-toggle-label">Alto contraste / ecrã exterior</span>
            <span className="def-toggle-sub">
              {modoCampo ? '☀ Activo — tema claro de alto contraste' : 'Inactivo — tema escuro padrão'}
            </span>
          </div>
          <button
            type="button"
            className={`def-toggle-btn ${modoCampo ? 'def-toggle-btn--on' : ''}`}
            onClick={() => handleToggleModoCampo(!modoCampo)}
            aria-pressed={modoCampo}
            aria-label="Activar/desactivar modo campo"
          >
            <span className="def-toggle-thumb" />
          </button>
        </div>
      </section>

      {/* Alertas de conformidade */}
      <section className="def-section">
        <h2 className="def-section-title">
          <Bell size={17} />
          Alertas de conformidade
        </h2>
        <p className="def-section-desc">
          Define com quantos dias de antecedência a aplicação deve alertar para manutenções próximas
          e enviar lembretes automáticos ao cliente e ao administrador.
        </p>
        <div className="def-alerta-row">
          <label className="def-alerta-label" htmlFor="diasAviso">
            Dias de aviso antecipado
          </label>
          <div className="def-alerta-input-wrap">
            <input
              id="diasAviso"
              type="number"
              min={1}
              max={60}
              value={diasAviso}
              onChange={e => { setDiasAvisoErro(''); setDiasAvisoUI(e.target.value) }}
              className="def-alerta-input"
            />
            <span className="def-alerta-unit">dias</span>
          </div>
          {diasAvisoErro && <p className="def-alerta-erro">{diasAvisoErro}</p>}
          <button type="button" className="def-btn def-btn--primary def-btn--sm" onClick={handleSalvarAlertas}>
            <CheckCircle size={16} />
            Guardar configuração
          </button>
        </div>
        <p className="def-section-desc def-section-desc--hint">
          O alerta é apresentado ao <strong>Administrador</strong> no início da sessão e pode ser enviado
          por email ao cliente registado em cada máquina. Padrão recomendado: <strong>7 dias</strong>.
        </p>
      </section>

      {/* Backup */}
      <section className="def-section">
        <h2 className="def-section-title">
          <Download size={17} />
          Exportar backup
        </h2>
        <p className="def-section-desc">
          Descarrega um ficheiro <code>.json</code> com todos os dados (clientes, máquinas, manutenções, relatórios e checklists).
          Guarda-o num local seguro — pen, disco externo ou email.
        </p>
        {lastExport && (
          <p className="def-last-export">
            <CheckCircle size={14} />
            Último backup exportado: <strong>{fmtTs(lastExport)}</strong>
          </p>
        )}
        {!lastExport && (
          <p className="def-last-export def-last-export--never">
            <AlertTriangle size={14} />
            Ainda não foi feito nenhum backup neste dispositivo.
          </p>
        )}
        <button type="button" className="def-btn def-btn--primary" onClick={handleExportar}>
          <Download size={18} />
          Exportar backup agora
        </button>
      </section>

      {/* Restauro */}
      <section className="def-section">
        <h2 className="def-section-title">
          <Upload size={17} />
          Importar / Restaurar backup
        </h2>
        <div className="def-alert def-alert--warn">
          <AlertTriangle size={16} />
          <span>
            <strong>Atenção:</strong> A importação substitui <em>todos</em> os dados actuais pelos do ficheiro.
            Esta acção não pode ser desfeita. Exporta um backup antes de importar.
          </span>
        </div>
        <p className="def-section-desc">
          Selecciona um ficheiro <code>atmanut_backup_*.json</code> exportado anteriormente.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="def-btn def-btn--secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload size={18} />
          {importing ? 'A importar…' : 'Seleccionar ficheiro de backup'}
        </button>
      </section>
    </div>
  )
}
