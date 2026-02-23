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

const QUEUE_KEY      = 'atm_sync_queue'
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

/** Devolve todos os itens da fila. */
export function getQueue() {
  return load()
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
  save(next)
  return { ok: true, queueId: item.queueId }
}

/** Remove um item da fila pelo seu queueId. */
export function removeItem(queueId) {
  save(load().filter(i => i.queueId !== queueId))
}

/** Apaga toda a fila. */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
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
    try {
      await callFn(item.resource, item.action, { id: item.id, data: item.data })
      removeItem(item.queueId)
      processed++
    } catch (err) {
      if (!err.status) {
        // Erro de rede: ainda offline — parar processamento
        break
      }
      // Erro de servidor (4xx/5xx): o item não vai melhorar, remover e continuar
      removeItem(item.queueId)
      failed++
    }
  }

  return { processed, failed }
}
