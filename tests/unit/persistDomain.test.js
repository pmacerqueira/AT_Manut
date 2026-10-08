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

  it('saves on the phone before upload and removes the queue item on success', async () => {
    const queued = []
    const removed = []
    const result = await runPersist({
      apiFn: async () => {},
      queueDescriptor: { resource: 'relatorios', action: 'create', data: { id: 'r1' } },
      isOnline: true,
      enqueue: (item) => {
        queued.push(item)
        return { ok: true, queueId: 'sq1' }
      },
      dequeue: (id) => { removed.push(id) },
      markSending: () => {},
    })
    assert.equal(queued.length, 1)
    assert.deepEqual(removed, ['sq1'])
    assert.equal(result.uploaded, true)
    assert.equal(result.queued, false)
  })

  it('keeps the phone copy when upload fails with a network error', async () => {
    const removed = []
    const result = await runPersist({
      apiFn: async () => { throw new Error('network') },
      queueDescriptor: { resource: 'relatorios', action: 'create', data: { id: 'r1' } },
      isOnline: true,
      enqueue: () => ({ ok: true, queueId: 'sq1' }),
      dequeue: (id) => { removed.push(id) },
      onNetworkLost: () => {},
      log: { warn: () => {}, info: () => {} },
    })
    assert.equal(removed.length, 0)
    assert.equal(result.queued, true)
    assert.equal(result.uploaded, false)
  })

  it('enqueues on hosting limit 508 and does not mark the browser offline', async () => {
    const queued = []
    let lost = false
    let rolled = false
    await runPersist({
      apiFn: async () => {
        const e = new Error('HTTP 508')
        e.status = 508
        throw e
      },
      queueDescriptor: { resource: 'relatorios', action: 'create', data: { id: 'r1' } },
      isOnline: true,
      enqueue: (item) => { queued.push(item); return { ok: true, queueId: 'sq508' } },
      onQueued: () => {},
      onNetworkLost: () => { lost = true },
      rollback: () => { rolled = true },
      log: { error: () => {} },
    })
    assert.equal(queued.length, 1)
    assert.equal(lost, false)
    assert.equal(rolled, false)
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
