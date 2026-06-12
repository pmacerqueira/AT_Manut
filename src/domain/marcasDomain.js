/**
 * Domínio de marcas — lista inicial e merge com dados do servidor.
 * Extraído do DataContext (v1.16.85).
 */
import { MARCAS_COMPRESSOR, MARCAS_ELEVADOR } from './equipamentoDomain'

export const INITIAL_MARCAS = [...new Set([...MARCAS_COMPRESSOR, ...MARCAS_ELEVADOR])]
  .sort((a, b) => a.localeCompare(b, 'pt'))
  .map((nome, idx) => ({ id: `mk${idx + 1}`, nome, logoUrl: '', corHex: nome.toLowerCase() === 'istobal' ? '#c8102e' : '', ativo: true }))

export function normalizeMarca(m) {
  return {
    ...m,
    nome: (m?.nome ?? '').trim(),
    logoUrl: m?.logoUrl ?? m?.logo_url ?? '',
    corHex: m?.corHex ?? m?.cor_hex ?? '',
  }
}

export function mergeMarcasPreferIncoming(incoming = [], current = []) {
  const map = new Map()
  for (const base of INITIAL_MARCAS) {
    const n = normalizeMarca(base)
    map.set((n.nome || '').toLowerCase(), n)
  }
  for (const prev of current) {
    const n = normalizeMarca(prev)
    if (!n.nome) continue
    map.set(n.nome.toLowerCase(), n)
  }
  for (const row of incoming) {
    const n = normalizeMarca(row)
    if (!n.nome) continue
    map.set(n.nome.toLowerCase(), n)
  }
  return [...map.values()].sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt'))
}

export function shouldRetryMarcaCreateWithId(err) {
  const msg = String(err?.message || '').toLowerCase()
  return msg.includes("duplicate entry '' for key 'primary'")
    || msg.includes("field 'id' doesn't have a default value")
    || msg.includes('null value in column')
}
