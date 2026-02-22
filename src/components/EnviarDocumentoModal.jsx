import { useState } from 'react'
import { escapeHtml, safeHttpUrl } from '../utils/sanitize'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { EMAIL_CONFIG } from '../config/emailConfig'
import { APP_FOOTER_TEXT } from '../config/version'

const CC_NAVEL = 'comercial@navel.pt'

export default function EnviarDocumentoModal({ isOpen, onClose, documento, maquina }) {
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const [destinatario, setDestinatario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!isOpen) return null

  const tituloDoc = documento?.titulo || 'Documento'
  const assunto = `Documento: ${tituloDoc} — ${maquina?.marca} ${maquina?.modelo} — Navel`
  const corpoHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#333">
<p>Segue o documento solicitado relativo ao equipamento <strong>${escapeHtml(maquina?.marca || '')} ${escapeHtml(maquina?.modelo || '')}</strong> (Nº Série: ${escapeHtml(String(maquina?.numeroSerie || '—'))}).</p>
<p><a href="${safeHttpUrl(documento?.url)}" style="color:#2563eb">Abrir documento (PDF)</a></p>
<p style="margin-top:2em;font-size:0.9em;color:#666">— Navel Manutenções · www.navel.pt</p>
<p style="margin-top:1.5em;font-size:0.75em;color:#999;border-top:1px solid #ddd;padding-top:0.5em">${escapeHtml(APP_FOOTER_TEXT)}</p>
</body></html>`

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
          assunto,
          corpoHtml,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Erro ${res.status}`)
      }
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
        <h2>Enviar documento por email</h2>
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
              {enviando ? 'A enviar…' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
