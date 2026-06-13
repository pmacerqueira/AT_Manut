import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNovoCliente,
  clienteExistsByNif,
  mergeClienteUpdate,
  removeClienteFromList,
  collectClienteCascadeIds,
  clienteRecordId,
} from '../../src/domain/clientesDomain.js'

describe('buildNovoCliente', () => {
  it('trims nif and assigns id', () => {
    const c = buildNovoCliente({ nif: '  123  ', nome: 'Teste' }, 99)
    assert.equal(c.id, 'cli99')
    assert.equal(c.nif, '123')
    assert.equal(c.nome, 'Teste')
  })
})

describe('clienteExistsByNif', () => {
  it('detects duplicate nif', () => {
    const list = [{ nif: '111', nome: 'A' }]
    assert.equal(clienteExistsByNif(list, '111'), true)
    assert.equal(clienteExistsByNif(list, '222'), false)
  })
})

describe('mergeClienteUpdate / removeClienteFromList', () => {
  it('updates and removes by nif', () => {
    const base = [{ nif: '1', nome: 'A' }, { nif: '2', nome: 'B' }]
    assert.equal(mergeClienteUpdate(base, '1', { nome: 'AA' })[0].nome, 'AA')
    assert.equal(removeClienteFromList(base, '2').length, 1)
  })
})

describe('collectClienteCascadeIds', () => {
  it('collects related machine, manutencao and reparacao ids', () => {
    const ids = collectClienteCascadeIds({
      maquinas: [{ id: 'm1', clienteNif: '999' }, { id: 'm2', clienteId: '888' }],
      manutencoes: [{ id: 'man1', maquinaId: 'm1' }],
      reparacoes: [{ id: 'rep1', maquinaId: 'm1' }],
      nif: '999',
    })
    assert.deepEqual(ids.maqIds, ['m1'])
    assert.deepEqual(ids.manutIds, ['man1'])
    assert.deepEqual(ids.repIds, ['rep1'])
  })
})

describe('clienteRecordId', () => {
  it('prefers id over nif', () => {
    assert.equal(clienteRecordId({ id: 'cli1', nif: '123' }), 'cli1')
    assert.equal(clienteRecordId({ nif: '123' }), '123')
  })
})
