/**
 * localCache.js — Cache offline da aplicação (IndexedDB + fallback localStorage).
 *
 * IndexedDB suporta dezenas/centenas de MB (vs ~5 MB do localStorage).
 * Migra automaticamente entradas legadas `atm_cache_v1` do localStorage.
 *
 * Formato: { ts: timestamp, data: { clientes, categorias, ... } }
 */
import { STORAGE } from '../config/storageKeys.js'

const CACHE_KEY = STORAGE.CACHE
const CACHE_TTL = 30 * 24 * 3600 * 1000 // 30 dias
const IDB_NAME = 'atm_offline_v1'
const IDB_STORE = 'cache'
const IDB_KEY = 'main'

function isExpired(ts) {
  return !ts || Date.now() - ts > CACHE_TTL
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'))
  })
}

async function idbGetSnapshot() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error ?? new Error('Falha leitura IndexedDB'))
    tx.oncomplete = () => db.close()
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Falha transacção IndexedDB'))
    }
  })
}

async function idbSetSnapshot(snapshot) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(snapshot, IDB_KEY)
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Falha gravação IndexedDB'))
    }
  })
}

async function idbClearSnapshot() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(IDB_KEY)
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Falha limpeza IndexedDB'))
    }
  })
}

/** Remove campos pesados (base64) para caber no fallback localStorage. */
export function stripHeavyCacheFields(data) {
  if (!data || typeof data !== 'object') return data
  return {
    ...data,
    relatorios: (data.relatorios ?? []).map(r => ({ ...r, fotos: [], assinaturaDigital: null })),
    relatoriosReparacao: (data.relatoriosReparacao ?? []).map(r => ({ ...r, fotos: [], assinaturaDigital: null })),
    tecnicos: (data.tecnicos ?? []).map(t => ({ ...t, assinaturaDigital: null })),
  }
}

function loadLegacyLocalStorageCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data || isExpired(parsed.ts)) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Guarda snapshot offline (IndexedDB). Fallback: localStorage leve sem fotos/assinaturas.
 */
export async function saveCache(data) {
  const snapshot = { ts: Date.now(), data }
  try {
    await idbSetSnapshot(snapshot)
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      /* ignore */
    }
    return true
  } catch {
    try {
      const light = stripHeavyCacheFields(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: light }))
      return true
    } catch {
      try {
        const lighter = {
          ...stripHeavyCacheFields(data),
          relatorios: (data.relatorios ?? []).map(r => ({
            id: r.id,
            manutencaoId: r.manutencaoId,
            numeroRelatorio: r.numeroRelatorio,
            dataCriacao: r.dataCriacao,
            dataAssinatura: r.dataAssinatura,
            tecnico: r.tecnico,
            nomeAssinante: r.nomeAssinante,
            status: r.status,
          })),
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: lighter }))
        return true
      } catch {
        return false
      }
    }
  }
}

/**
 * Carrega cache offline. Ordem: IndexedDB → migrar localStorage legado.
 */
export async function loadCache() {
  try {
    const fromIdb = await idbGetSnapshot()
    if (fromIdb?.data && !isExpired(fromIdb.ts)) {
      return { data: fromIdb.data, ts: fromIdb.ts }
    }
    if (fromIdb && isExpired(fromIdb.ts)) {
      await idbClearSnapshot().catch(() => {})
    }
  } catch {
    /* fallback abaixo */
  }

  const legacy = loadLegacyLocalStorageCache()
  if (!legacy) return null

  try {
    await idbSetSnapshot(legacy)
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* mantém legado em localStorage */
  }
  return { data: legacy.data, ts: legacy.ts }
}

/** Data/hora do último cache (async). */
export async function cacheTimestamp() {
  const cache = await loadCache()
  return cache?.ts ? new Date(cache.ts) : null
}

/** Limpa cache offline (IndexedDB + legado localStorage). */
export async function clearOfflineCache() {
  await idbClearSnapshot().catch(() => {})
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

/** Estima bytes do snapshot em IndexedDB (serialização JSON). */
export async function estimateCacheBytes() {
  try {
    const snap = await idbGetSnapshot()
    if (snap) return new Blob([JSON.stringify(snap)]).size
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return raw.length * 2
  } catch {
    /* ignore */
  }
  return 0
}

/**
 * Estatísticas para o painel Definições.
 * @returns {Promise<{ cacheBytes: number, quotaBytes: number|null, usageBytes: number|null, pct: number, backend: string }>}
 */
export async function getOfflineStorageStats() {
  const cacheBytes = await estimateCacheBytes()
  let quotaBytes = null
  let usageBytes = null
  let backend = 'indexeddb'

  try {
    const legacy = localStorage.getItem(CACHE_KEY)
    if (legacy) backend = 'localStorage (legado)'
  } catch {
    /* ignore */
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate()
      quotaBytes = est.quota ?? null
      usageBytes = est.usage ?? null
    } catch {
      /* ignore */
    }
  }

  const ref = quotaBytes ?? 50 * 1024 * 1024
  const used = usageBytes ?? cacheBytes
  const pct = Math.min(100, Math.round((used / ref) * 100))

  return { cacheBytes, quotaBytes, usageBytes, pct, backend }
}
