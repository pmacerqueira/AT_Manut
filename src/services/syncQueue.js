/**
 * syncQueue.js — Fila de operações offline (localStorage)
 *
 * Quando o dispositivo está sem ligação, as mutações (create/update/delete)
 * são adicionadas a esta fila em vez de serem perdidas.
 * Quando a ligação é restaurada, a fila é processada sequencialmente.
 *
 * Chave: atm_sync_queue
 * Limite: 4 MB (protege contra quota excedida)
 *
 * Estrutura de cada item:
 *   {
 *     queueId:  string,   // ID único do item na fila
 *     ts:       number,   // timestamp de criação
 *     resource: string,   // 'clientes' | 'maquinas' | etc.
 *     action:   string,   // 'create' | 'update' | 'delete' | 'bulk_create'
 *     id:       string|null,  // ID do registo (para update/delete)
 *     data:     any|null,     // payload de dados
 *   }
 */

import { STORAGE } from '../config/storageKeys'
import { isRetryablePersistError } from '../domain/persistDomain'

const QUEUE_KEY      = STORAGE.SYNC_QUEUE
const MAX_SIZE_BYTES = 4 * 1024 * 1024 // 4 MB

function load() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
    return true
  } catch {
    return false
  }
}

/** Número de itens pendentes. */
export function queueSize() {
  return load().length
}

/**
 * Adiciona uma operação à fila.
 * @param {{ resource, action, id?, data? }} item
 * @returns {{ ok: boolean, queueId?: string, reason?: string }}
 */
export function enqueue({ resource, action, id = null, data = null }) {
  const q    = load()
  const item = {
    queueId: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    resource,
    action,
    id,
    data,
  }
  const next    = [...q, item]
  const preview = JSON.stringify(next)
  if (preview.length > MAX_SIZE_BYTES) {
    return { ok: false, reason: 'quota' }
  }
  if (!save(next)) return { ok: false, reason: 'quota' }
  return { ok: true, queueId: item.queueId }
}

/** Marca um item como envio em curso para a fila automática não o repetir. */
export function setItemSending(queueId, sending) {
  if (!queueId) return
  const q = load()
  save(q.map(i => (i.queueId === queueId ? { ...i, sending: !!sending } : i)))
}

/** Remove um item da fila pelo seu queueId. */
export function removeItem(queueId) {
  save(load().filter(i => i.queueId !== queueId))
}

/**
 * Processa todos os itens da fila em ordem.
 *
 * @param {Function} callFn — async (resource, action, { id, data }) => any
 * @returns {{ processed: number, failed: number }}
 */
export async function processQueue(callFn) {
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
