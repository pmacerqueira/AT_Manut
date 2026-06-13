import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNovaMaquina,
  collectMaquinaCascadeIds,
  resolveDocumentoInsert,
  resolveDocumentoRemove,
} from '../../src/domain/maquinasDomain.js'

describe('buildNovaMaquina', () => {
  it('normalizes cliente ids and documentos', () => {
    const m = buildNovaMaquina({ marca: 'X', clienteNif: '123' }, '99')
    assert.equal(m.id, '99')
    assert.equal(m.clienteNif, '123')
    assert.equal(m.clienteId, '123')
    assert.deepEqual(m.documentos, [])
  })
})

describe('collectMaquinaCascadeIds', () => {
  it('collects manutencao and reparacao ids', () => {
    const ids = collectMaquinaCascadeIds({
      manutencoes: [{ id: 'm1', maquinaId: 'maq1' }],
      reparacoes: [{ id: 'r1', maquinaId: 'maq1' }],
      maquinaId: 'maq1',
    })
    assert.deepEqual(ids.maqManutIds, ['m1'])
    assert.deepEqual(ids.maqRepIds, ['r1'])
  })
})

describe('resolveDocumentoInsert', () => {
  it('appends new document', () => {
    const maq = { id: '1', documentos: [] }
    const r = resolveDocumentoInsert(maq, { tipo: 'manual', titulo: 'A' }, 100)
    assert.equal(r.docId, 'doc100')
    assert.equal(r.replaced, false)
    assert.equal(r.nextMaq.documentos.length, 1)
  })

  it('replaces duplicate upload signature', () => {
    const maq = {
      id: '1',
      documentos: [{ id: 'd0', tipo: 'manual', uploadFileName: 'f.pdf', uploadFileSize: 10 }],
    }
    const r = resolveDocumentoInsert(maq, { tipo: 'manual', uploadFileName: 'f.pdf', uploadFileSize: 10, titulo: 'Novo' })
    assert.equal(r.replaced, true)
    assert.equal(r.docId, 'd0')
    assert.equal(r.nextMaq.documentos[0].titulo, 'Novo')
  })
})

describe('resolveDocumentoRemove', () => {
  it('filters document by id', () => {
    const maq = { id: '1', documentos: [{ id: 'a' }, { id: 'b' }] }
    const next = resolveDocumentoRemove(maq, 'a')
    assert.equal(next.documentos.length, 1)
    assert.equal(next.documentos[0].id, 'b')
  })
})
