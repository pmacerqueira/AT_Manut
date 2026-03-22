import { TECNICO_HORARIO_CONFIG } from '../config/tecnicoHorarioRestrito.js'

/** Alinhado com a mensagem da API (data.php) quando a sessão cai por horário. */
export const TECNICO_HORARIO_MSG_SESSAO =
  'Sessão terminada: horário de acesso restrito para a equipa técnica.'

const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function parseHHMM(s) {
  const m = String(s ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null
  return h * 60 + min
}

/** @param {Date} date */
function getDowAndMinutesInTimezone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const map = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  const dow = WEEKDAY_MAP[map.weekday]
  if (dow === undefined) return null
  const hour = parseInt(map.hour, 10)
  const minute = parseInt(map.minute, 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return { dow, minutes: hour * 60 + minute }
}

/**
 * Verdade se estamos dentro de um bloco restrito (mesma lógica que a API PHP).
 * Em dev em localhost não aplica (para não bloquear E2E).
 */
export function isTecnicoHorarioRestritoNow(date = new Date(), config = TECNICO_HORARIO_CONFIG) {
  if (import.meta.env?.DEV) {
    try {
      const h = typeof window !== 'undefined' ? window.location.hostname : ''
      if (h === 'localhost' || h === '127.0.0.1') return false
    } catch {
      /* */
    }
  }
  if (!config?.enabled || !Array.isArray(config.blocks) || config.blocks.length === 0) {
    return false
  }
  const tz = config.timezone || 'Atlantic/Azores'
  const now = getDowAndMinutesInTimezone(date, tz)
  if (!now) return false
  const { dow, minutes } = now
  for (const b of config.blocks) {
    if (!b || !Array.isArray(b.days) || b.days.length === 0) continue
    const days = b.days.map((d) => parseInt(d, 10))
    if (!days.includes(dow)) continue
    const from = parseHHMM(b.from)
    const to = parseHHMM(b.to)
    if (from == null || to == null) continue
    if (from <= to) {
      if (minutes >= from && minutes <= to) return true
    } else if (minutes >= from || minutes <= to) {
      return true
    }
  }
  return false
}
