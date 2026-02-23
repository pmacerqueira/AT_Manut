/**
 * alertasConfig.js — Configuração e utilidades para alertas de conformidade.
 *
 * Chaves localStorage usadas:
 *   atm_config_alertas  → { diasAviso: number }
 *   atm_alertas_dismiss → 'YYYY-MM-DD'  (data de dispensa)
 *   atm_alertas_enviados → { [chave]: isoDateTime }
 */

const CFG_KEY      = 'atm_config_alertas'
const DISMISS_KEY  = 'atm_alertas_dismiss'
const ENVIADOS_KEY = 'atm_alertas_enviados'

// ── Configuração ─────────────────────────────────────────────────────────────

export const getDiasAviso = () => {
  try {
    const cfg = JSON.parse(localStorage.getItem(CFG_KEY) ?? '{}')
    const v   = parseInt(cfg.diasAviso, 10)
    return Number.isFinite(v) && v >= 1 && v <= 60 ? v : 7
  } catch { return 7 }
}

export const setDiasAviso = (dias) => {
  const v = Math.max(1, Math.min(60, Number(dias) || 7))
  localStorage.setItem(CFG_KEY, JSON.stringify({ diasAviso: v }))
}

// ── Dispensa diária ──────────────────────────────────────────────────────────

export const isAlertsModalDismissedToday = () => {
  const hoje = new Date().toISOString().slice(0, 10)
  return localStorage.getItem(DISMISS_KEY) === hoje
}

export const dismissAlertsModalToday = () => {
  localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10))
}

// ── Registo de envios ────────────────────────────────────────────────────────

export const getAlertasEnviados = () => {
  try { return JSON.parse(localStorage.getItem(ENVIADOS_KEY) ?? '{}') } catch { return {} }
}

/** Marca o lembrete para uma máquina+data como já enviado hoje. */
export const marcarAlertaEnviado = (maquinaId, data) => {
  const env = getAlertasEnviados()
  // Chave diária: só reenvia se passar 24 h
  env[`${maquinaId}_${data}_${new Date().toISOString().slice(0, 10)}`] = new Date().toISOString()
  localStorage.setItem(ENVIADOS_KEY, JSON.stringify(env))
}

export const foiAlertaEnviadoHoje = (maquinaId, data) => {
  const env = getAlertasEnviados()
  const chave = `${maquinaId}_${data}_${new Date().toISOString().slice(0, 10)}`
  return !!env[chave]
}

// ── Cálculo das manutenções próximas ────────────────────────────────────────

/**
 * Devolve as manutenções pendentes/agendadas que estão dentro de `diasAviso`
 * dias (a contar de hoje, inclusive), enriquecidas com máquina, cliente e
 * número de dias restantes.
 */
export const getManutencoesPendentesAlertas = (manutencoes, maquinas, clientes, diasAviso) => {
  const hoje     = new Date()
  const hojeStr  = hoje.toISOString().slice(0, 10)
  const limite   = new Date(hoje)
  limite.setDate(hoje.getDate() + diasAviso)
  const limiteStr = limite.toISOString().slice(0, 10)

  return manutencoes
    .filter(m =>
      (m.status === 'pendente' || m.status === 'agendada') &&
      m.data >= hojeStr &&
      m.data <= limiteStr
    )
    .map(m => {
      const maq     = maquinas.find(mq => mq.id === m.maquinaId)
      const cliente = maq ? clientes.find(c => c.nif === maq.clienteNif) : null
      const dataMs  = new Date(m.data + 'T12:00:00').getTime()
      const diasRestantes = Math.round((dataMs - hoje.getTime()) / 86_400_000)
      return { manutencao: m, maquina: maq, cliente, diasRestantes }
    })
    .filter(item => item.maquina && item.cliente)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
}
