import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validarDataExecucaoNaoFutura } from '../../src/utils/datasAzores.js'

describe('validarDataExecucaoNaoFutura', () => {
  const hoje = '2026-06-12'

  it('aceita hoje e datas passadas', () => {
    assert.deepEqual(validarDataExecucaoNaoFutura('2026-06-12', { hojeAzores: hoje }), { ok: true, ymd: '2026-06-12' })
    assert.deepEqual(validarDataExecucaoNaoFutura('2026-03-02', { hojeAzores: hoje }), { ok: true, ymd: '2026-03-02' })
  })

  it('rejeita datas futuras', () => {
    const r = validarDataExecucaoNaoFutura('2027-03-02', { hojeAzores: hoje })
    assert.equal(r.ok, false)
    assert.match(r.message, /futuro/i)
  })

  it('rejeita vazio e formato inválido', () => {
    assert.equal(validarDataExecucaoNaoFutura('', { hojeAzores: hoje }).ok, false)
    assert.equal(validarDataExecucaoNaoFutura('02-03-2026', { hojeAzores: hoje }).ok, false)
  })
})
