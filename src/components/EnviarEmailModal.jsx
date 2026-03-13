import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { relatorioParaHtml } from '../utils/relatorioHtml'
import { enviarRelatorioHtmlEmail } from '../services/emailService'
import { formatDataAzores } from '../utils/datasAzores'
import { logger } from '../utils/logger'

const CC_NAVEL = 'comercial@navel.pt'

export default function EnviarEmailModal({ isOpen, onClose, manutencao, relatorio, maquina, cliente }) {
  const { getChecklistBySubcategoria, getSubcategoria, updateRelatorio, getTecnicoByNome } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const [destinatario, setDestinatario] = useState(() => cliente?.email ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!isOpen) return null

  const checklistItems = maquina ? getChecklistBySubcategoria(maquina.subcategoriaId, manutencao?.tipo || 'periodica') : []
  const dataManut = manutencao?.data ? formatDataAzores(manutencao.data, true) : ''
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
      const tecObj = getTecnicoByNome(manutencao?.tecnico || relatorio?.tecnico)
      const htmlBody = relatorioParaHtml(relatorio, manutencao, maquina, cliente, checklistItems, {
        subcategoriaNome: sub?.nome,
        ultimoEnvio: relatorio.ultimoEnvio,
        logoUrl: `${import.meta.env.BASE_URL}logo-navel.png`,
        tecnicoObj: tecObj,
      })

      const resultado = await enviarRelatorioHtmlEmail({
        destinatario: email,
        assunto: subject,
        html: htmlBody,
        cc: CC_NAVEL,
        nomeCliente: cliente?.nome ?? '',
      })

      if (resultado.ok) {
        updateRelatorio(relatorio.id, {
          ultimoEnvio: { data: new Date().toISOString(), destinatario: email },
        })
        showToast(`Email enviado para ${email}.`, 'success')
        logger.action('EnviarEmailModal', 'enviarEmail',
          `Relatório ${relatorio.numeroRelatorio} enviado para ${email}`,
          { relId: relatorio.id, destinatario: email })
        setDestinatario('')
        onClose()
      } else {
        setErro(resultado.message || 'Erro ao enviar email.')
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
