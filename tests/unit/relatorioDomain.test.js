import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRelatoriosMantendoEnvio, proximoNumeroRelatorioSequencial } from '../../src/domain/relatorioDomain.js'

describe('mergeRelatoriosMantendoEnvio', () => {
  it('preserves enviadoParaCliente when incoming lacks it', () => {
    const prev = [{ id: 'r1', numeroRelatorio: '2026.MP.00001', enviadoParaCliente: { email: 'a@b.pt' } }]
    const incoming = [{ id: 'r1', numeroRelatorio: '2026.MP.00001' }]
    const merged = mergeRelatoriosMantendoEnvio(prev, incoming)
    assert.equal(merged[0].enviadoParaCliente.email, 'a@b.pt')
  })
})

describe('proximoNumeroRelatorioSequencial', () => {
  it('increments from existing numbers', () => {
    const rels = [{ numeroRelatorio: '2026.MP.00003' }, { numeroRelatorio: '2026.MP.00001' }]
    assert.equal(proximoNumeroRelatorioSequencial(rels, { ano: 2026, prefix: 'MP' }), '2026.MP.00004')
  })
})
