/**
 * AlertaProactivoModal — Alerta de manutenções próximas apresentado ao Admin
 * no início de cada sessão.
 *
 * Mostra a lista de manutenções dentro do prazo de aviso configurado e permite
 * enviar lembretes por email ao cliente (e CC ao admin).
 */
import { useState, useMemo } from 'react'
import { Bell, Mail, X, AlertTriangle, CheckCircle2, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { enviarLembreteEmail } from '../services/emailService'
import { foiAlertaEnviadoHoje } from '../config/alertasConfig'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useToast } from './Toast'
import { logger } from '../utils/logger'
import './AlertaProactivoModal.css'

export default function AlertaProactivoModal({ isOpen, alertas, onDismiss, onClose }) {
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const { showToast } = useToast()
  const [enviando, setEnviando]       = useState({})   // { clienteNif: true/false }
  const [enviados, setEnviados]       = useState({})   // { clienteNif: true }
  const [expandidos, setExpandidos]   = useState({})   // { clienteNif: true }

  // Agrupar alertas por cliente
  const porCliente = useMemo(() => {
    const grupos = {}
    alertas.forEach(item => {
      const nif = item.cliente?.nif ?? 'sem-cliente'
      if (!grupos[nif]) {
        grupos[nif] = {
          cliente: item.cliente,
          items:   [],
        }
      }
      grupos[nif].items.push(item)
    })
    return Object.values(grupos).sort((a, b) =>
      (a.cliente?.nome ?? '').localeCompare(b.cliente?.nome ?? '')
    )
  }, [alertas])

  const toggleExpand = (nif) => {
    setExpandidos(prev => ({ ...prev, [nif]: !prev[nif] }))
  }

  const fmtDias = (n) => {
    if (n === 0) return 'Hoje'
    if (n === 1) return 'Amanhã'
    return `Daqui a ${n} dias`
  }

  const fmtData = (iso) => {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const urgencyClass = (n) => {
    if (n === 0) return 'urgency-hoje'
    if (n <= 2)  return 'urgency-critico'
    if (n <= 5)  return 'urgency-proximo'
    return 'urgency-normal'
  }

  const handleEnviarLembrete = async (grupo) => {
    const email = grupo.cliente?.email?.trim()
    if (!email) {
      showToast(`${grupo.cliente?.nome ?? 'Cliente'} não tem email registado. Edite a ficha do cliente.`, 'warning')
      return
    }
    const nif = grupo.cliente?.nif
    setEnviando(prev => ({ ...prev, [nif]: true }))
    showGlobalLoading()
    try {
      const resultado = await enviarLembreteEmail({
        emailDestinatario: email,
        clienteNome:       grupo.cliente?.nome ?? '',
        alertas:           grupo.items,
        logoUrl:           `${import.meta.env.BASE_URL}logo-navel.png`,
      })
      if (resultado.ok) {
        setEnviados(prev => ({ ...prev, [nif]: true }))
        showToast(resultado.message, 'success')
        logger.action('AlertaProactivoModal', 'enviarLembrete',
          `Lembrete enviado para ${email} (${grupo.items.length} manutenção/ões)`,
          { clienteNif: nif, n: grupo.items.length })
      } else {
        showToast(resultado.message, 'error', 4000)
        logger.error('AlertaProactivoModal', 'enviarLembrete', resultado.message, { clienteNif: nif })
      }
    } finally {
      setEnviando(prev => ({ ...prev, [nif]: false }))
      hideGlobalLoading()
    }
  }

  if (!isOpen || !alertas?.length) return null

  const totalMaquinas = alertas.length
  const maisUrgente   = alertas[0]?.diasRestantes ?? 0

  return (
    <div className="alerta-overlay" role="dialog" aria-modal="true" aria-label="Alertas de conformidade">
      <div className="alerta-modal">
        {/* Cabeçalho */}
        <div className="alerta-header">
          <div className="alerta-header-icon">
            <Bell size={20} />
          </div>
          <div className="alerta-header-text">
            <h2 className="alerta-titulo">Alertas de conformidade</h2>
            <p className="alerta-subtitulo">
              {totalMaquinas} {totalMaquinas === 1 ? 'manutenção programada' : 'manutenções programadas'} nos
              próximos dias{maisUrgente === 0 ? ' — inclui hoje!' : ''}
            </p>
          </div>
          <button className="alerta-close" onClick={onClose} title="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Lista por cliente */}
        <div className="alerta-body">
          {porCliente.map(grupo => {
            const nif       = grupo.cliente?.nif ?? 'sem-cliente'
            const jaEnviado = enviados[nif] || grupo.items.every(i => foiAlertaEnviadoHoje(i.maquina?.id, i.manutencao?.data))
            const temEmail  = !!grupo.cliente?.email?.trim()
            const expanded  = expandidos[nif] ?? true

            return (
              <div key={nif} className="alerta-grupo">
                {/* Cabeçalho do cliente */}
                <button
                  className="alerta-grupo-header"
                  onClick={() => toggleExpand(nif)}
                  aria-expanded={expanded}
                >
                  <span className="alerta-grupo-nome">{grupo.cliente?.nome ?? '—'}</span>
                  <span className="alerta-grupo-count">{grupo.items.length}</span>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {expanded && (
                  <>
                    {/* Linhas de manutenção */}
                    <div className="alerta-items">
                      {grupo.items.map((item, i) => (
                        <div key={i} className={`alerta-item ${urgencyClass(item.diasRestantes)}`}>
                          <Calendar size={14} className="alerta-item-icon" />
                          <div className="alerta-item-info">
                            <span className="alerta-item-maquina">
                              {item.maquina?.marca ?? ''} {item.maquina?.modelo ?? ''}
                            </span>
                            {item.maquina?.numeroSerie && (
                              <span className="alerta-item-serie">S/N: {item.maquina.numeroSerie}</span>
                            )}
                          </div>
                          <div className="alerta-item-right">
                            <span className="alerta-item-data">{fmtData(item.manutencao?.data)}</span>
                            <span className={`alerta-item-dias ${urgencyClass(item.diasRestantes)}`}>
                              {fmtDias(item.diasRestantes)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Ação de email */}
                    <div className="alerta-grupo-actions">
                      {!temEmail ? (
                        <span className="alerta-sem-email">
                          <AlertTriangle size={13} />
                          Sem email — actualize a ficha do cliente
                        </span>
                      ) : jaEnviado ? (
                        <span className="alerta-ja-enviado">
                          <CheckCircle2 size={14} />
                          Lembrete já enviado hoje
                        </span>
                      ) : (
                        <button
                          className="alerta-btn-email"
                          onClick={() => handleEnviarLembrete(grupo)}
                          disabled={enviando[nif]}
                        >
                          <Mail size={14} />
                          {enviando[nif] ? 'A enviar…' : `Enviar lembrete para ${grupo.cliente?.email}`}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Rodapé */}
        <div className="alerta-footer">
          <button className="alerta-btn-dispensar" onClick={onDismiss}>
            Dispensar hoje
          </button>
          <button className="alerta-btn-fechar" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
