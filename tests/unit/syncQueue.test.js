import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Node não tem localStorage nem IndexedDB: o módulo tem de cair no fallback localStorage
// e migrar o que lá estiver. Simulamos o localStorage mínimo antes de importar.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}

const mod = await import('../../src/services/syncQueue.js')
const { initQueue, enqueue, queueSize, queueItems, removeItem, processQueue, queueBackend, __resetQueueForTests } = mod

describe('syncQueue (fallback sem IndexedDB)', () => {
  beforeEach(() => {
    store.clear()
    __resetQueueForTests()
  })

  it('migra itens legados do localStorage no arranque', async () => {
    store.set('atm_sync_queue', JSON.stringify([
      { queueId: 'sq_a', ts: 1, resource: 'clientes', action: 'create', id: null, data: { nome: 'X' }, sending: true },
    ]))
    const n = await initQueue()
    assert.equal(n, 1)
    assert.equal(queueBackend(), 'localStorage')
    assert.equal(queueSize(), 1)
    // `sending` é reposto a false para a fila não ficar bloqueada por um envio interrompido.
    const persisted = JSON.parse(store.get('atm_sync_queue'))
    assert.equal(persisted[0].sending, false)
  })

  it('enqueue guarda sem o payload em queueItems e processQueue esvazia', async () => {
    await initQueue()
    const r = enqueue({ resource: 'relatorios', action: 'create', data: { manutencaoId: 'mt1', fotos: ['x'.repeat(1000)] } })
    assert.equal(r.ok, true)
    assert.equal(queueSize(), 1)
    const items = queueItems()
    assert.equal(items[0].manutencaoId, 'mt1')
    assert.equal('data' in items[0], false)

    const chamadas = []
    const res = await processQueue(async (resource, action, opts) => { chamadas.push([resource, action, opts.data.manutencaoId]) })
    assert.deepEqual(chamadas, [['relatorios', 'create', 'mt1']])
    assert.deepEqual(res, { processed: 1, failed: 0 })
    assert.equal(queueSize(), 0)
  })

  it('erro de rede mantém o item na fila; erro definitivo remove-o', async () => {
    await initQueue()
    enqueue({ resource: 'a', action: 'create', data: {} })
    const semRede = new Error('Failed to fetch')
    let res = await processQueue(async () => { throw semRede })
    assert.deepEqual(res, { processed: 0, failed: 0 })
    assert.equal(queueSize(), 1)

    const invalido = Object.assign(new Error('Bad request'), { status: 400 })
    res = await processQueue(async () => { throw invalido })
    assert.deepEqual(res, { processed: 0, failed: 1 })
    assert.equal(queueSize(), 0)
  })

  it('removeItem apaga só o item indicado', async () => {
    await initQueue()
    const a = enqueue({ resource: 'a', action: 'create', data: {} })
    enqueue({ resource: 'b', action: 'create', data: {} })
    removeItem(a.queueId)
    assert.equal(queueSize(), 1)
    assert.equal(queueItems()[0].resource, 'b')
  })

  it('no fallback localStorage o limite de 4 MB continua a proteger a quota', async () => {
    await initQueue()
    const r = enqueue({ resource: 'relatorios', action: 'create', data: { blob: 'x'.repeat(4 * 1024 * 1024 + 10) } })
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'quota')
  })
})
