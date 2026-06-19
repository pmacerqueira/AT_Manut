import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  linhasNotasRelatorio,
  notasRelatorioParaTexto,
  QUICK_NOTES_DEFAULT,
} from '../../src/components/executarManutencao/execWizardHelpers.js'

describe('linhasNotasRelatorio', () => {
  it('divide por newline explícito', () => {
    assert.deepEqual(
      linhasNotasRelatorio('Primeira nota\nSegunda nota'),
      ['Primeira nota', 'Segunda nota'],
    )
  })

  it('separa legado com notas rápidas concatenadas', () => {
    const legado = 'Equipamento em bom estado geralFiltros substituídos conforme plano'
    assert.deepEqual(
      linhasNotasRelatorio(legado, QUICK_NOTES_DEFAULT),
      [
        'Equipamento em bom estado geral',
        'Filtros substituídos conforme plano',
      ],
    )
  })

  it('separa notas rápidas embutidas (texto livre antes de notas conhecidas)', () => {
    const legado = 'Consumíveis substituídos conforme planoEquipamento em bom estado geralSem observações adicionais'
    assert.deepEqual(
      linhasNotasRelatorio(legado, QUICK_NOTES_DEFAULT),
      [
        'Consumíveis substituídos conforme plano',
        'Equipamento em bom estado geral',
        'Sem observações adicionais',
      ],
    )
  })

  it('mantém texto livre único', () => {
    const livre = 'Intervenção com ajuste fino no sistema hidráulico do elevador.'
    assert.deepEqual(linhasNotasRelatorio(livre), [livre])
  })

  it('notasRelatorioParaTexto junta com newline', () => {
    assert.equal(
      notasRelatorioParaTexto('Nota A\nNota B'),
      'Nota A\nNota B',
    )
  })
})
