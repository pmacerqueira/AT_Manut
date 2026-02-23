/**
 * localCache.js — Cache local de dados da aplicação (localStorage)
 *
 * Guarda um snapshot de todos os recursos em localStorage para
 * acesso offline. O cache tem TTL de 30 dias.
 *
 * Chave: atm_cache_v1
 * Formato: { ts: timestamp, data: { clientes, categorias, ... } }
 */

const CACHE_KEY   = 'atm_cache_v1'
const CACHE_TTL   = 30 * 24 * 3600 * 1000 // 30 dias em ms

/**
 * Guarda todos os dados em cache.
 * Em caso de quota excedida, tenta sem os relatórios (mais pesados).
 */
export function saveCache(data) {
  const payload = JSON.stringify({ ts: Date.now(), data })
  try {
    localStorage.setItem(CACHE_KEY, payload)
    return true
  } catch {
    // Quota exceeded: tentar sem fotos nos relatórios
    try {
      const light = {
        ...data,
        relatorios: (data.relatorios ?? []).map(r => ({ ...r, fotos: [] })),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: light }))
      return true
    } catch {
      return false
    }
  }
}

/**
 * Carrega os dados em cache.
 * Devolve { data, ts } ou null se não existir / expirado.
 */
export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return { data, ts }
  } catch {
    return null
  }
}

/** Data/hora do último cache em formato legível. */
export function cacheTimestamp() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts } = JSON.parse(raw)
    return new Date(ts)
  } catch {
    return null
  }
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
}
