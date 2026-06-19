import { startOfDay, startOfMonth, subDays, subMonths } from 'date-fns'
import { parseDateLocal } from './datasAzores.js'

export const EXEC_VIEW_GRUPOS = 'grupos'
export const EXEC_VIEW_CRONO = 'cronologico'
export const EXEC_CRONO_LIMIT = 30

export const EXEC_PERIODOS = [
  { id: 'todos', label: 'Todo o período' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'trimestre', label: '3 meses' },
  { id: 'custom', label: 'Personalizado' },
]

/** Intervalo [início, fim] em timestamps (inclusive, fim = fim do dia). */
export function getExecPeriodoRange(periodo, customFrom = '', customTo = '') {
  if (!periodo || periodo === 'todos') return null
  const hoje = startOfDay(new Date())
  const fim = startOfDay(hoje).getTime() + 24 * 3600 * 1000 - 1

  if (periodo === '7d') {
    return { from: subDays(hoje, 7).getTime(), to: fim }
  }
  if (periodo === '30d') {
    return { from: subDays(hoje, 30).getTime(), to: fim }
  }
  if (periodo === 'mes') {
    return { from: startOfMonth(hoje).getTime(), to: fim }
  }
  if (periodo === 'trimestre') {
    return { from: subMonths(hoje, 3).getTime(), to: fim }
  }
  if (periodo === 'custom') {
    const from = customFrom ? parseDateLocal(customFrom).getTime() : null
    const toRaw = customTo ? parseDateLocal(customTo).getTime() : null
    const to = toRaw != null && Number.isFinite(toRaw) ? toRaw + 24 * 3600 * 1000 - 1 : fim
    if (from != null && Number.isFinite(from)) return { from, to }
    return null
  }
  return null
}

export function manutencaoDentroPeriodo(ts, range) {
  if (!range) return true
  if (!ts) return false
  return ts >= range.from && ts <= range.to
}

export function loadExecPanelPrefs(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return typeof o === 'object' && o ? o : {}
  } catch {
    return {}
  }
}

export function saveExecPanelPrefs(storageKey, prefs) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(prefs))
  } catch {
    /* modo privado */
  }
}

/** Etiqueta curta do equipamento da intervenção mais recente do grupo. */
export function labelEquipamentoManut(maquina, getSubcategoria) {
  if (!maquina) return { label: '—', serie: '' }
  const sub = getSubcategoria(maquina.subcategoriaId)
  const marcaModelo = `${maquina.marca || ''} ${maquina.modelo || ''}`.trim()
  const parts = [sub?.nome, marcaModelo].filter(Boolean)
  return {
    label: parts.join(' — ') || marcaModelo || '—',
    serie: maquina.numeroSerie || '',
  }
}
