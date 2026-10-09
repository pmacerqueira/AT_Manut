import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { draftAplicavel, DRAFT_TTL_MS } from '../../src/services/execDraft.js'

describe('draftAplicavel', () => {
  const agora = 1_800_000_000_000
  const base = { ts: agora - 60_000, sig: 'mt1|norel|{}', form: { notas: 'x' } }

  it('aceita rascunho recente com a mesma assinatura', () => {
    assert.equal(draftAplicavel(base, 'mt1|norel|{}', agora), true)
  })

  it('rejeita quando o relatório mudou entretanto (assinatura diferente)', () => {
    assert.equal(draftAplicavel(base, 'mt1|rel9|{"c1":"sim"}', agora), false)
  })

  it('rejeita rascunho expirado', () => {
    assert.equal(draftAplicavel({ ...base, ts: agora - DRAFT_TTL_MS - 1 }, 'mt1|norel|{}', agora), false)
  })

  it('rejeita rascunho sem formulário ou inválido', () => {
    assert.equal(draftAplicavel({ ...base, form: null }, 'mt1|norel|{}', agora), false)
    assert.equal(draftAplicavel(null, 'mt1|norel|{}', agora), false)
    assert.equal(draftAplicavel('texto', 'mt1|norel|{}', agora), false)
  })
})
