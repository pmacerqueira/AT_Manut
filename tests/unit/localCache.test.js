import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { stripHeavyCacheFields } from '../../src/services/localCache.js'

describe('stripHeavyCacheFields', () => {
  it('remove fotos e assinaturas de relatórios e técnicos', () => {
    const data = {
      clientes: [{ id: 'c1' }],
      relatorios: [{ id: 'r1', fotos: ['x'], assinaturaDigital: 'sig' }],
      relatoriosReparacao: [{ id: 'rr1', fotos: ['y'], assinaturaDigital: 'sig2' }],
      tecnicos: [{ id: 't1', assinaturaDigital: 'sig3' }],
    }
    const out = stripHeavyCacheFields(data)
    assert.deepEqual(out.relatorios[0].fotos, [])
    assert.equal(out.relatorios[0].assinaturaDigital, null)
    assert.equal(out.relatoriosReparacao[0].assinaturaDigital, null)
    assert.equal(out.tecnicos[0].assinaturaDigital, null)
    assert.equal(out.clientes[0].id, 'c1')
  })
})
