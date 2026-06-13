/**
 * Domínio de marcas — lista inicial e merge com dados do servidor.
 * Extraído do DataContext (v1.16.85).
 */
import { MARCAS_COMPRESSOR, MARCAS_ELEVADOR } from './equipamentoDomain.js'

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

export function sortMarcasByNome(marcas) {
  return [...marcas].sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt'))
}

export function findMarcaByNomeIgnoreCase(marcas, nome) {
  const key = (nome ?? '').trim().toLowerCase()
  return marcas.find(x => (x.nome ?? '').trim().toLowerCase() === key)
}

export function buildNovaMarca(m, tempId = `tmp_mk_${Date.now()}`) {
  const nome = (m?.nome ?? '').trim()
  return {
    id: tempId,
    nome,
    logoUrl: (m?.logoUrl ?? '').trim(),
    corHex: (m?.corHex ?? '').trim(),
    ativo: m?.ativo ?? true,
  }
}

export function mergeMarcaInList(marcas, id, patch) {
  return sortMarcasByNome(
    marcas.map(m => (String(m.id) === String(id) ? { ...m, ...patch } : m)),
  )
}

export function replaceMarcaIdInList(marcas, oldId, newId) {
  return sortMarcasByNome(
    marcas.map(m => (String(m.id) === String(oldId) ? { ...m, id: newId } : m)),
  )
}

export function removeMarcaFromList(marcas, id) {
  return marcas.filter(x => String(x.id) !== String(id))
}

export function isLegacyLocalMarcaId(id) {
  const idStr = String(id ?? '')
  return !idStr || /^mk\d+$/i.test(idStr) || idStr.startsWith('tmp_mk_')
}

export function buildMarcaApiPayload(marca) {
  return {
    nome: marca.nome || '',
    logoUrl: marca.logoUrl || '',
    corHex: marca.corHex || '',
    ativo: marca.ativo ?? true,
  }
}

export function resolvePersistedMarcaId(created, fallbackId) {
  return created?.id ?? created?.ID ?? fallbackId
}
