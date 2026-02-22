import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { relatorioParaHtml } from '../utils/relatorioHtml'
import { EMAIL_CONFIG } from '../config/emailConfig'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

const CC_NAVEL = 'comercial@navel.pt'

export default function EnviarEmailModal({ isOpen, onClose, manutencao, relatorio, maquina, cliente }) {
  const { getChecklistBySubcategoria, getSubcategoria, updateRelatorio } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const [destinatario, setDestinatario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!isOpen) return null

  const checklistItems = maquina ? getChecklistBySubcategoria(maquina.subcategoriaId, manutencao?.tipo || 'periodica') : []
  const dataManut = manutencao?.data ? format(new Date(manutencao.data), 'd MMM yyyy', { locale: pt }) : ''
  const subject = `Relatório de manutenção — ${maquina?.marca} ${maquina?.modelo} (${dataManut}) — Navel`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    const email = destinatario.trim()
    if (!email) {
      setErro('Indique o endereço de email do destinatário.')
      return
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) {
      setErro('Endereço de email inválido.')
      return
    }

    setEnviando(true)
    showGlobalLoading()
    try {
      const sub = maquina ? getSubcategoria(maquina.subcategoriaId) : null
      const htmlBody = relatorioParaHtml(relatorio, manutencao, maquina, cliente, checklistItems, {
        subcategoriaNome: sub?.nome,
        ultimoEnvio: relatorio.ultimoEnvio,
        logoUrl: `${import.meta.env.BASE_URL}logo.png`,
      })
      // URL absoluta em produção (https://www.navel.pt) ou relativa em dev
      const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}/api/send-report.php` : '/api/send-report.php'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: EMAIL_CONFIG.AUTH_TOKEN,
          destinatario: email,
          cc: CC_NAVEL,
          assunto: subject,
          corpoHtml: htmlBody,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Erro ${res.status}`)
      }
      updateRelatorio(relatorio.id, {
        ultimoEnvio: { data: new Date().toISOString(), destinatario: email },
      })
      showToast(`Email enviado para ${email}.`, 'success')
      setDestinatario('')
      onClose()
    } catch (err) {
      setErro(err.message || 'Erro ao enviar email.')
    } finally {
      setEnviando(false)
      hideGlobalLoading()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Enviar relatório por email</h2>
        <p className="text-muted">
          O email será enviado para o endereço indicado e em cópia para {CC_NAVEL}.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Email do destinatário <span className="required">*</span>
            <input
              type="email"
              value={destinatario}
              onChange={e => { setDestinatario(e.target.value); setErro('') }}
              placeholder="ex: cliente@empresa.pt"
              required
              disabled={enviando}
            />
          </label>
          {erro && <p className="form-erro">{erro}</p>}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" disabled={enviando}>
              {enviando ? 'A enviar…' : <><span>✉</span> Enviar email</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
