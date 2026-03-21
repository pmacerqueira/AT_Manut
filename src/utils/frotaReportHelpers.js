/**
 * Helpers partilhados pelo relatório de frota (HTML + PDF).
 * IDs vindos da API podem ser number ou string — joins com Set/Map falham sem normalização.
 */

/** @param {unknown} v */
export function normEntityId(v) {
  if (v == null || v === '') return ''
  return String(v)
}

/**
 * Extrai yyyy-mm-dd para comparações com intervalos do modal de frota.
 * @param {unknown} d
 */
export function dateKeyForFilter(d) {
  if (d == null || d === '') return ''
  const s = String(d).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : (s.length >= 10 ? s.slice(0, 10) : s)
}

/**
 * Equipamento pertence ao cliente (NIF pode ter espaços; legado usa clienteId).
 * @param {{ clienteNif?: string, clienteId?: string }} m
 * @param {{ nif?: string }} cliente
 */
export function maquinaPertenceCliente(m, cliente) {
  const raw = String(cliente?.nif ?? '').trim()
  if (!raw) return false
  const cn = String(m?.clienteNif ?? '').trim()
  const ci = String(m?.clienteId ?? '').trim()
  const compact = (x) => x.replace(/\s+/g, '')
  return cn === raw || ci === raw || compact(cn) === compact(raw) || compact(ci) === compact(raw)
}
