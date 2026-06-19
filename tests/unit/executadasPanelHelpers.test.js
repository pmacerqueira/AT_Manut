import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getExecPeriodoRange, manutencaoDentroPeriodo, labelEquipamentoManut } from '../../src/utils/executadasPanelHelpers.js'

describe('executadasPanelHelpers', () => {
  it('getExecPeriodoRange todos devolve null', () => {
    assert.equal(getExecPeriodoRange('todos'), null)
  })

  it('getExecPeriodoRange 7d devolve intervalo válido', () => {
    const r = getExecPeriodoRange('7d')
    assert.notEqual(r, null)
    assert.ok(r.to > r.from)
  })

  it('manutencaoDentroPeriodo sem range aceita tudo', () => {
    assert.equal(manutencaoDentroPeriodo(0, null), true)
    assert.equal(manutencaoDentroPeriodo(Date.now(), null), true)
  })

  it('labelEquipamentoManut junta subcategoria e marca/modelo', () => {
    const label = labelEquipamentoManut(
      { marca: 'KAESER', modelo: 'ASD 47', numeroSerie: 'SN1', subcategoriaId: 's1' },
      (id) => (id === 's1' ? { nome: 'Compressor' } : null),
    )
    assert.ok(label.label.includes('Compressor'))
    assert.ok(label.label.includes('KAESER'))
    assert.equal(label.serie, 'SN1')
  })
})
