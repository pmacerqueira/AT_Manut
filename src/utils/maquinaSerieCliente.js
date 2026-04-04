/**
 * Regras partilhadas: evitar duas fichas do mesmo cliente com o mesmo nº de série.
 * Alinhado com a validação em servidor-cpanel/api/data.php.
 */

export function normNumeroSerieEquipamento(s) {
  return String(s ?? '').trim().toLowerCase()
}

export function normNifCompactCliente(s) {
  return String(s ?? '').trim().replace(/\s+/g, '')
}

/**
 * A máquina `m` pertence ao cliente identificado por NIF (ou clienteId legado = NIF).
 * @param {object} m
 * @param {string} clienteNif
 */
export function maquinaMesmoClientePorNif(m, clienteNif) {
  const raw = String(clienteNif ?? '').trim()
  if (!raw) return false
  const cn = String(m?.clienteNif ?? '').trim()
  const ci = String(m?.clienteId ?? '').trim()
  const compact = (x) => x.replace(/\s+/g, '')
  return (
    cn === raw ||
    ci === raw ||
    compact(cn) === compact(raw) ||
    compact(ci) === compact(raw)
  )
}

/**
 * @param {object[]} maquinas
 * @param {{ numeroSerie: string, clienteNif: string, excludeId?: string | null }} opts
 * @returns {object | null} primeira máquina em conflito
 */
export function findMaquinaDuplicadaSerieCliente(maquinas, { numeroSerie, clienteNif, excludeId = null }) {
  const serie = normNumeroSerieEquipamento(numeroSerie)
  if (!serie) return null
  const ex = excludeId != null && String(excludeId) !== '' ? String(excludeId) : null
  for (const m of maquinas || []) {
    if (ex && String(m.id) === ex) continue
    if (!maquinaMesmoClientePorNif(m, clienteNif)) continue
    if (normNumeroSerieEquipamento(m.numeroSerie ?? m.numero_serie) === serie) {
      return m
    }
  }
  return null
}
