import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolverIdsRemoverAoEliminarConcluida } from '../../src/domain/manutencaoDomain.js'

describe('resolverIdsRemoverAoEliminarConcluida', () => {
  it('removes only target when not concluded', () => {
    const prev = [
      { id: 'm1', status: 'agendada', maquinaId: 'maq1', data: '2026-05-01' },
      { id: 'm2', status: 'agendada', maquinaId: 'maq1', data: '2026-08-01' },
    ]
    const { idsRemover, cascadeFuturas } = resolverIdsRemoverAoEliminarConcluida(prev, 'm1')
    assert.deepEqual([...idsRemover], ['m1'])
    assert.equal(cascadeFuturas, false)
  })

  it('cascades future periodic slots when removing concluded', () => {
    const prev = [
      { id: 'm1', status: 'concluida', maquinaId: 'maq1', data: '2026-03-01' },
      { id: 'm2', status: 'agendada', maquinaId: 'maq1', data: '2026-06-01' },
      { id: 'm3', status: 'agendada', maquinaId: 'maq1', data: '2026-02-01' },
    ]
    const { idsRemover, cascadeFuturas } = resolverIdsRemoverAoEliminarConcluida(prev, 'm1')
    assert.equal(cascadeFuturas, true)
    assert.ok(idsRemover.has('m1'))
    assert.ok(idsRemover.has('m2'))
    assert.equal(idsRemover.has('m3'), false)
  })
})
