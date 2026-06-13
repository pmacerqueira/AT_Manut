import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runPersist } from '../../src/domain/persistDomain.js'

describe('runPersist', () => {
  it('enqueues when offline', async () => {
    const queued = []
    await runPersist({
      apiFn: async () => { throw new Error('should not call') },
      queueDescriptor: { resource: 'clientes', action: 'create', data: {} },
      isOnline: false,
      enqueue: (item) => { queued.push(item); return { ok: true } },
      onQueued: () => {},
    })
    assert.equal(queued.length, 1)
    assert.equal(queued[0].resource, 'clientes')
  })

  it('calls api when online', async () => {
    let called = false
    await runPersist({
      apiFn: async () => { called = true },
      isOnline: true,
      enqueue: () => ({ ok: true }),
    })
    assert.equal(called, true)
  })

  it('rolls back on server error', async () => {
    let rolled = false
    await runPersist({
      apiFn: async () => {
        const e = new Error('bad')
        e.status = 500
        throw e
      },
      rollback: () => { rolled = true },
      isOnline: true,
      enqueue: () => ({ ok: true }),
      log: { error: () => {} },
    })
    assert.equal(rolled, true)
  })

  it('enqueues on network error mid-call', async () => {
    const queued = []
    await runPersist({
      apiFn: async () => { throw new Error('network') },
      queueDescriptor: { resource: 'maquinas', action: 'update', id: '1' },
      isOnline: true,
      enqueue: (item) => { queued.push(item); return { ok: true } },
      onQueued: () => {},
      onNetworkLost: () => {},
    })
    assert.equal(queued.length, 1)
  })

  it('throws OFFLINE_QUEUE_FULL when queue full and throwOnFailure', async () => {
    await assert.rejects(
      () => runPersist({
        apiFn: async () => {},
        queueDescriptor: { resource: 'x', action: 'create' },
        throwOnFailure: true,
        isOnline: false,
        enqueue: () => ({ ok: false }),
        rollback: () => {},
      }),
      (err) => err.code === 'OFFLINE_QUEUE_FULL',
    )
  })
})
