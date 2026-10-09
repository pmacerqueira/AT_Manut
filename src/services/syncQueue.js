/**
 * syncQueue.js — Fila de operações offline.
 *
 * Quando o dispositivo está sem ligação, as mutações (create/update/delete)
 * são adicionadas a esta fila em vez de serem perdidas.
 * Quando a ligação é restaurada, a fila é processada sequencialmente.
 *
 * Armazenamento (desde 1.17.31): IndexedDB (`atm_sync_queue_v1`), com cópia em
 * memória para a API continuar síncrona. Limite prático: 200 MB — um relatório
 * com 6 fotos ronda 2,5 MB, por isso cabem dezenas de intervenções sem rede.
 * Fallback sem IndexedDB: localStorage (`atm_sync_queue`, limite 4 MB).
 * Itens legados em localStorage são migrados para IndexedDB no arranque.
 *
 * Estrutura de cada item:
 *   {
 *     queueId:  string,   // ID único do item na fila
 *     ts:       number,   // timestamp de criação
 *     resource: string,   // 'clientes' | 'maquinas' | etc.
 *     action:   string,   // 'create' | 'update' | 'delete' | 'bulk_create'
 *     id:       string|null,  // ID do registo (para update/delete)
 *     data:     any|null,     // payload de dados
 *     sending?: boolean,      // envio em curso
 *   }
 */

import { STORAGE } from '../config/storageKeys.js'
import { isRetryablePersistError } from '../domain/persistDomain.js'
import { createKvStore } from './idbKv.js'

const QUEUE_KEY = STORAGE.SYNC_QUEUE
const IDB_KEY = 'items'
const MAX_BYTES_IDB = 200 * 1024 * 1024
const MAX_BYTES_LS = 4 * 1024 * 1024

const kv = createKvStore('atm_sync_queue_v1', 'queue')

/** Cópia em memória — fonte de verdade durante a sessão. */
let mem = []
/** 'idle' | 'loading' | 'idb' | 'localStorage' */
let backend = 'idle'
let initPromise = null
/** Serializa as escritas em IndexedDB para manterem a ordem das chamadas. */
let writeChain = Promise.resolve()

function loadLocalStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalStorage(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
    return true
  } catch {
    return false
  }
}

function dedupe(items) {
  const seen = new Set()
  const out = []
  for (const it of items) {
    if (!it?.queueId || seen.has(it.queueId)) continue
    seen.add(it.queueId)
    out.push(it)
  }
  return out
}

function persist(q) {
  mem = q
  if (backend === 'localStorage') {
    return saveLocalStorage(q)
  }
  const snapshot = q.map(i => ({ ...i }))
  writeChain = writeChain
    .then(() => kv.set(IDB_KEY, snapshot))
    .catch(() => {
      // IndexedDB deixou de responder a meio da sessão: não perder a fila.
      backend = 'localStorage'
      saveLocalStorage(snapshot)
    })
  return true
}

function load() {
  return mem
}

/**
 * Carrega a fila do armazenamento persistente. Idempotente.
 * Deve ser aguardada no arranque antes de confiar em `queueSize()`.
 */
export function initQueue() {
  if (initPromise) return initPromise
  backend = 'loading'
  initPromise = (async () => {
    const legacy = loadLocalStorage()
    let fromIdb = null
    try {
      fromIdb = await kv.get(IDB_KEY)
      backend = 'idb'
    } catch {
      backend = 'localStorage'
    }
    const base = Array.isArray(fromIdb) ? fromIdb : []
    // Itens enfileirados antes do init terminar (mem) ficam depois dos persistidos.
    const merged = dedupe([...base, ...(backend === 'idb' ? legacy : []), ...mem])
      .map(i => ({ ...i, sending: false }))
    if (backend === 'idb') {
      mem = merged
      try {
        await kv.set(IDB_KEY, merged)
        if (legacy.length) {
          try { localStorage.removeItem(QUEUE_KEY) } catch { /* ignore */ }
        }
      } catch {
        backend = 'localStorage'
        mem = dedupe([...legacy, ...mem]).map(i => ({ ...i, sending: false }))
        saveLocalStorage(mem)
      }
    } else {
      mem = dedupe([...legacy, ...mem]).map(i => ({ ...i, sending: false }))
      saveLocalStorage(mem)
    }
    return mem.length
  })()
  return initPromise
}

/** 'idb' | 'localStorage' | 'loading' | 'idle' — para o painel Definições. */
export function queueBackend() {
  return backend
}

/** Número de itens pendentes. */
export function queueSize() {
  return load().length
}

/** Cópia dos itens pendentes (sem o payload, que pode ser pesado). */
export function queueItems() {
  return load().map(({ data, ...rest }) => ({
    ...rest,
    dataId: data && typeof data === 'object' ? (data.id ?? null) : null,
    manutencaoId: data && typeof data === 'object' ? (data.manutencaoId ?? null) : null,
    maquinaId: data && typeof data === 'object' ? (data.maquinaId ?? null) : null,
  }))
}

/**
 * Adiciona uma operação à fila.
 * @param {{ resource, action, id?, data? }} item
 * @returns {{ ok: boolean, queueId?: string, reason?: string }}
 */
export function enqueue({ resource, action, id = null, data = null }) {
  const q = load()
  const item = {
    queueId: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    resource,
    action,
    id,
    data,
  }
  const next = [...q, item]
  const bytes = JSON.stringify(next).length
  const limite = backend === 'localStorage' ? MAX_BYTES_LS : MAX_BYTES_IDB
  if (bytes > limite) {
    return { ok: false, reason: 'quota' }
  }
  if (!persist(next)) return { ok: false, reason: 'quota' }
  return { ok: true, queueId: item.queueId }
}

/** Marca um item como envio em curso para a fila automática não o repetir. */
export function setItemSending(queueId, sending) {
  if (!queueId) return
  const q = load()
  persist(q.map(i => (i.queueId === queueId ? { ...i, sending: !!sending } : i)))
}

/** Remove um item da fila pelo seu queueId. */
export function removeItem(queueId) {
  persist(load().filter(i => i.queueId !== queueId))
}

/**
 * Processa todos os itens da fila em ordem.
 *
 * @param {Function} callFn — async (resource, action, { id, data }) => any
 * @returns {{ processed: number, failed: number }}
 */
export async function processQueue(callFn) {
  if (initPromise) await initPromise.catch(() => {})
  const q = load()
  if (!q.length) return { processed: 0, failed: 0 }

  let processed = 0
  let failed    = 0

  for (const item of q) {
    const fresh = load().find(i => i.queueId === item.queueId)
    if (!fresh) continue
    if (fresh.sending) break
    setItemSending(item.queueId, true)
    try {
      await callFn(item.resource, item.action, { id: item.id, data: item.data })
      removeItem(item.queueId)
      processed++
    } catch (err) {
      setItemSending(item.queueId, false)
      if (isRetryablePersistError(err)) {
        // Rede, timeout ou limite do alojamento (508): manter na fila e parar.
        break
      }
      // Erro definitivo (4xx de validação, etc.): o item não vai melhorar.
      removeItem(item.queueId)
      failed++
    }
  }

  return { processed, failed }
}

/** Só para testes: repõe o estado em memória. */
export function __resetQueueForTests() {
  mem = []
  backend = 'idle'
  initPromise = null
  writeChain = Promise.resolve()
}
