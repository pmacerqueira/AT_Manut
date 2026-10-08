/**
 * persistDomain — persistência online/offline (fila syncQueue).
 * Usado pelo DataContext; lógica pura testável com inject de dependências.
 */

/** Falhas em que o pedido pode voltar a ser tentado sem perder o trabalho. */
const TRANSIENT_HTTP = new Set([408, 429, 502, 503, 504, 508])

export function isRetryablePersistError(err) {
  if (!err || !err.status) return true
  return TRANSIENT_HTTP.has(Number(err.status))
}

/**
 * @param {object} params
 * @param {() => Promise<void>} params.apiFn
 * @param {{ resource: string, action: string, id?: string, data?: unknown }|null} [params.queueDescriptor]
 * @param {(() => void)|null} [params.rollback]
 * @param {boolean} [params.throwOnFailure]
 * @param {boolean} [params.isOnline]
 * @param {(item: object) => { ok: boolean, queueId?: string }} params.enqueue
 * @param {(queueId: string) => void} [params.dequeue]
 * @param {(queueId: string, sending: boolean) => void} [params.markSending]
 * @param {() => void} [params.onQueued]
 * @param {() => void} [params.onQueueSettled]
 * @param {() => void} [params.onNetworkLost]
 * @param {{ info?: Function, warn?: Function, error?: Function }} [params.log]
 * @returns {Promise<{ queued: boolean, uploaded: boolean }>}
 */
export async function runPersist({
  apiFn,
  queueDescriptor = null,
  rollback = null,
  throwOnFailure = false,
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true,
  enqueue,
  dequeue,
  markSending,
  onQueued,
  onQueueSettled,
  onNetworkLost,
  log = {},
}) {
  const info = log.info ?? (() => {})
  const warn = log.warn ?? (() => {})
  const error = log.error ?? (() => {})

  // Grava no telemóvel ANTES de qualquer espera de rede.
  let queueId = null
  if (queueDescriptor) {
    const result = enqueue(queueDescriptor)
    if (!result.ok) {
      warn('DataContext', 'persist',
        `Fila do telemóvel cheia — operação ${queueDescriptor.resource}/${queueDescriptor.action} não guardada`)
      rollback?.()
      if (throwOnFailure) {
        const qe = new Error('Sem espaço no telemóvel: não foi possível guardar a operação.')
        qe.code = 'OFFLINE_QUEUE_FULL'
        throw qe
      }
      return { queued: false, uploaded: false }
    }
    queueId = result.queueId
    onQueued?.()
    info('DataContext', 'persist',
      `Operação guardada no telemóvel (${queueDescriptor.resource}/${queueDescriptor.action})`)
  }

  if (!isOnline) {
    return { queued: !!queueId, uploaded: false }
  }

  if (queueId) markSending?.(queueId, true)
  try {
    await apiFn()
    if (queueId) dequeue?.(queueId)
    onQueueSettled?.()
    return { queued: false, uploaded: true }
  } catch (err) {
    const retryable = isRetryablePersistError(err)
    if (retryable && queueId) {
      markSending?.(queueId, false)
      if (!err.status) onNetworkLost?.()
      onQueueSettled?.()
      warn('DataContext', 'persist',
        `Envio adiado — dados continuam no telemóvel (${queueDescriptor.resource}/${queueDescriptor.action})`)
      return { queued: true, uploaded: false }
    }
    if (queueId) dequeue?.(queueId)
    onQueueSettled?.()
    error('DataContext', 'persist', err.message || 'Falha ao guardar dados', { stack: err.stack?.slice(0, 400) })
    rollback?.()
    if (throwOnFailure) throw err
    return { queued: false, uploaded: false }
  }
}
