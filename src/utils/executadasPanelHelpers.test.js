import { describe, it, expect } from 'vitest'
import { getExecPeriodoRange, manutencaoDentroPeriodo, labelEquipamentoManut } from './executadasPanelHelpers'

describe('executadasPanelHelpers', () => {
  it('getExecPeriodoRange todos devolve null', () => {
    expect(getExecPeriodoRange('todos')).toBeNull()
  })

  it('getExecPeriodoRange 7d devolve intervalo válido', () => {
    const r = getExecPeriodoRange('7d')
    expect(r).not.toBeNull()
    expect(r.to).toBeGreaterThan(r.from)
  })

  it('manutencaoDentroPeriodo sem range aceita tudo', () => {
    expect(manutencaoDentroPeriodo(0, null)).toBe(true)
    expect(manutencaoDentroPeriodo(Date.now(), null)).toBe(true)
  })

  it('labelEquipamentoManut junta subcategoria e marca/modelo', () => {
    const label = labelEquipamentoManut(
      { marca: 'KAESER', modelo: 'ASD 47', numeroSerie: 'SN1', subcategoriaId: 's1' },
      (id) => (id === 's1' ? { nome: 'Compressor' } : null),
    )
    expect(label.label).toContain('Compressor')
    expect(label.label).toContain('KAESER')
    expect(label.serie).toBe('SN1')
  })
})
