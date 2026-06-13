/**
 * persistDomain — persistência online/offline (fila syncQueue).
 * Usado pelo DataContext; lógica pura testável com inject de dependências.
 */

/**
 * @param {object} params
 * @param {() => Promise<void>} params.apiFn
 * @param {{ resource: string, action: string, id?: string, data?: unknown }|null} [params.queueDescriptor]
 * @param {(() => void)|null} [params.rollback]
 * @param {boolean} [params.throwOnFailure]
 * @param {boolean} [params.isOnline]
 * @param {(item: object) => { ok: boolean }} params.enqueue
 * @param {() => void} [params.onQueued]
 * @param {() => void} [params.onNetworkLost]
 * @param {{ info?: Function, warn?: Function, error?: Function }} [params.log]
 */
export async function runPersist({
  apiFn,
  queueDescriptor = null,
  rollback = null,
  throwOnFailure = false,
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true,
  enqueue,
  onQueued,
  onNetworkLost,
  log = {},
}) {
  const info = log.info ?? (() => {})
  const warn = log.warn ?? (() => {})
  const error = log.error ?? (() => {})

  if (!isOnline) {
    if (queueDescriptor) {
      const result = enqueue(queueDescriptor)
      if (result.ok) {
        onQueued?.()
        info('DataContext', 'persist',
          `Operação enfileirada offline (${queueDescriptor.resource}/${queueDescriptor.action})`)
      } else {
        warn('DataContext', 'persist',
          `Fila offline cheia — operação ${queueDescriptor.resource}/${queueDescriptor.action} não guardada`)
        rollback?.()
        if (throwOnFailure) {
          const qe = new Error('Sem ligação: não foi possível enfileirar a operação.')
          qe.code = 'OFFLINE_QUEUE_FULL'
          throw qe
        }
      }
    }
    return
  }

  try {
    await apiFn()
  } catch (err) {
    const isNetErr = !err.status
    if (isNetErr && queueDescriptor) {
      const result = enqueue(queueDescriptor)
      if (result.ok) {
        onQueued?.()
        onNetworkLost?.()
      } else {
        rollback?.()
        if (throwOnFailure) throw err
      }
    } else {
      error('DataContext', 'persist', err.message || 'Falha ao guardar dados', { stack: err.stack?.slice(0, 400) })
      rollback?.()
      if (throwOnFailure) throw err
    }
  }
}
