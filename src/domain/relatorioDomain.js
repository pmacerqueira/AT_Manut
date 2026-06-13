/**
 * relatorioDomain — funções puras sobre relatórios (merge sync, numeração).
 */

/**
 * Ao substituir relatórios vindos da API, preserva `enviadoParaCliente` / `ultimoEnvio`
 * quando o servidor ainda não devolve esses campos.
 */
export function mergeRelatoriosMantendoEnvio(prev, incoming) {
  if (!Array.isArray(incoming)) return prev
  const map = new Map((prev ?? []).map(r => [r.id, r]))
  return incoming.map(r => {
    const old = map.get(r.id)
    if (!old) return r
    const merged = { ...r }
    const newHasEmail = merged.enviadoParaCliente?.email
    const oldHasEmail = old.enviadoParaCliente?.email
    if (!newHasEmail && oldHasEmail) {
      merged.enviadoParaCliente = old.enviadoParaCliente
    }
    if (old.ultimoEnvio && !merged.ultimoEnvio) {
      merged.ultimoEnvio = old.ultimoEnvio
    }
    return merged
  })
}

/** Próximo número sequencial `AAAA.PREFIX.NNNNN` a partir dos relatórios existentes. */
export function proximoNumeroRelatorioSequencial(relatorios, { ano, prefix }) {
  const pattern = `${ano}.${prefix}.`
  const existingNums = (relatorios ?? [])
    .map(rel => rel.numeroRelatorio)
    .filter(n => typeof n === 'string' && n.startsWith(pattern))
    .map(n => parseInt(n.split('.')[2] ?? '0', 10))
    .filter(n => !isNaN(n))
  const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
  return `${ano}.${prefix}.${String(next).padStart(5, '0')}`
}
