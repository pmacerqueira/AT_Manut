import { useState } from 'react'
import { Mail, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { enviarRelatorioEmail } from '../services/emailService'
import { formatDataAzores } from '../utils/datasAzores'
import { logger } from '../utils/logger'

const EMAIL_ADMIN = 'comercial@navel.pt'

export default function EnviarEmailModal({ isOpen, onClose, manutencao, relatorio, maquina, cliente }) {
  const { getChecklistBySubcategoria, getSubcategoria, updateRelatorio, getTecnicoByNome, marcas } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

  const emailCliente = cliente?.email?.trim() ?? ''

  const [checkCliente, setCheckCliente] = useState(!!emailCliente)
  const [checkAdmin, setCheckAdmin]     = useState(true)
  const [emailOutro, setEmailOutro]     = useState('')
  const [enviando, setEnviando]         = useState(false)
  const [erro, setErro]                 = useState('')

  if (!isOpen) return null

  const checklistItems = maquina ? getChecklistBySubcategoria(maquina.subcategoriaId, manutencao?.tipo || 'periodica') : []
  const dataManut = manutencao?.data ? formatDataAzores(manutencao.data, true) : ''
  const subject = `Relatório de manutenção — ${maquina?.marca} ${maquina?.modelo} (${dataManut}) — Navel`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    const dests = new Set()
    if (checkCliente && emailCliente) dests.add(emailCliente.toLowerCase())
    if (checkAdmin) dests.add(EMAIL_ADMIN)
    const outros = emailOutro.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(s => s)
    outros.forEach(em => dests.add(em))

    if (dests.size === 0) {
      setErro('Selecione pelo menos um destinatário.')
      return
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const em of dests) {
      if (!re.test(em)) { setErro(`Email inválido: ${em}`); return }
    }

    setEnviando(true)
    showGlobalLoading()
    try {
      const sub = maquina ? getSubcategoria(maquina.subcategoriaId) : null
      const tecObj = getTecnicoByNome(manutencao?.tecnico || relatorio?.tecnico)

      let sucesso = 0
      for (const dest of dests) {
        const resultado = await enviarRelatorioEmail({
          emailDestinatario: dest,
          relatorio, manutencao, maquina, cliente, checklistItems,
          subcategoriaNome: sub?.nome || '',
          logoUrl: `${import.meta.env.BASE_URL}logo-navel.png`,
          tecnicoObj: tecObj,
          marcas,
        })
        if (resultado?.ok) sucesso++
        else logger.error('EnviarEmailModal', 'enviarEmail', resultado?.message ?? 'Erro', { dest })
      }

      if (sucesso > 0) {
        const destsArr = [...dests]
        const now = new Date().toISOString()
        const relUpdate = { ultimoEnvio: { data: now, destinatario: destsArr[0] } }
        const clientDests = destsArr.filter(e => e !== EMAIL_ADMIN)
        if (clientDests.length > 0) {
          relUpdate.enviadoParaCliente = { data: now, email: clientDests[0] }
        }
        updateRelatorio(relatorio.id, relUpdate)
        showToast(
          sucesso === dests.size
            ? `Email enviado para ${sucesso} destinatário${sucesso > 1 ? 's' : ''}.`
            : `Enviado para ${sucesso} de ${dests.size} destinatários.`,
          sucesso === dests.size ? 'success' : 'warning'
        )
        logger.action('EnviarEmailModal', 'enviarEmail',
          `Relatório ${relatorio.numeroRelatorio} enviado`,
          { destinatarios: destsArr })
        onClose()
      } else {
        setErro('Não foi possível enviar o email. Tente novamente.')
      }
    } catch (err) {
      setErro(err.message || 'Erro ao enviar email.')
      logger.error('EnviarEmailModal', 'enviarEmail', err.message, { relId: relatorio?.id })
    } finally {
      setEnviando(false)
      hideGlobalLoading()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Enviar relatório por email</h2>
          <button type="button" className="btn-icon" onClick={onClose} disabled={enviando} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
          Selecione os destinatários para este relatório.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="frota-email-panel" style={{ marginBottom: '1rem' }}>
            {emailCliente ? (
              <label className="frota-email-check">
                <input
                  type="checkbox"
                  checked={checkCliente}
                  onChange={e => setCheckCliente(e.target.checked)}
                  disabled={enviando}
                />
                <span>
                  <strong>Cliente</strong><br />
                  <small>{emailCliente}</small>
                </span>
              </label>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>
                <em>Sem email de cliente na ficha.</em>
              </p>
            )}
            <label className="frota-email-check">
              <input
                type="checkbox"
                checked={checkAdmin}
                onChange={e => setCheckAdmin(e.target.checked)}
                disabled={enviando}
              />
              <span>
                <strong>Administração</strong><br />
                <small>{EMAIL_ADMIN}</small>
              </span>
            </label>
            <div className="frota-email-outro-wrap" style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Outro(s) endereço(s)
              </label>
              <input
                type="text"
                className="frota-email-outro-input"
                placeholder="ex: outro@empresa.pt, backup@navel.pt"
                value={emailOutro}
                onChange={e => { setEmailOutro(e.target.value); setErro('') }}
                disabled={enviando}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                Separe múltiplos emails com vírgula ou espaço.
              </small>
            </div>
          </div>
          {erro && <p className="form-erro">{erro}</p>}
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={enviando}>
              {enviando ? 'A enviar…' : <><Mail size={16} /> Enviar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
