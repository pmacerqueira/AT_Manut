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
import { ArrowLeft, Download, Upload, Database, AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react'
import './Definicoes.css'

export default function Definicoes() {
  const { isAdmin }             = usePermissions()
  const navigate                = useNavigate()
  const { showToast }           = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const { exportarDados, restaurarDados, clientes, maquinas, manutencoes, relatorios } = useData()

  const fileInputRef = useRef(null)
  const [importing,  setImporting]  = useState(false)
  const [lastExport, setLastExport] = useState(() => localStorage.getItem('atm_last_export') ?? null)

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

  // Estima tamanho do backup em KB
  const estimarTamanho = () => {
    const keys = ['atm_clientes','atm_categorias','atm_subcategorias','atm_checklist','atm_maquinas','atm_manutencoes','atm_relatorios']
    const bytes = keys.reduce((acc, k) => acc + (localStorage.getItem(k)?.length ?? 0), 0)
    return bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

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
