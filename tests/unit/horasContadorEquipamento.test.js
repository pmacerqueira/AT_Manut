import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  horasContadorParaRelatorio,
  horasContadorManutencaoAnterior,
  parseHorasContadorForm,
} from '../../src/utils/horasContadorEquipamento.js'

describe('horasContadorEquipamento', () => {
  const maquina = {
    subcategoriaId: 'sub5',
    horasServicoAcumuladas: 5000,
  }

  it('horasContadorParaRelatorio prioriza snapshot do relatório', () => {
    const rel = { horasLeituraContador: 6200 }
    const manut = { horasServico: 6100 }
    assert.equal(horasContadorParaRelatorio(maquina, manut, { horasServico: '6300' }, rel), 6200)
  })

  it('horasContadorParaRelatorio usa formulário em curso quando relatório e manutenção vazios', () => {
    assert.equal(horasContadorParaRelatorio(maquina, {}, { horasServico: '6400' }, null), 6400)
  })

  it('parseHorasContadorForm rejeita valores inválidos', () => {
    assert.equal(parseHorasContadorForm(''), null)
    assert.equal(parseHorasContadorForm('-1'), null)
    assert.equal(parseHorasContadorForm('abc'), null)
    assert.equal(parseHorasContadorForm('3050'), 3050)
  })

  it('horasContadorManutencaoAnterior ignora intervenção actual e lê relatório anterior', () => {
    const manutencoes = [
      { id: 'm3', maquinaId: 'mq1', status: 'concluida', data: '2026-06-18', horasServico: 6200 },
      { id: 'm2', maquinaId: 'mq1', status: 'concluida', data: '2025-12-10', horasServico: 5800 },
      { id: 'm1', maquinaId: 'mq1', status: 'concluida', data: '2025-06-10' },
    ]
    const rels = {
      m1: { horasLeituraContador: 5400 },
    }
    const ref = horasContadorManutencaoAnterior(manutencoes, 'mq1', {
      excluirManutencaoId: 'm3',
      getRelatorioByManutencao: (id) => rels[id] ?? null,
    })
    assert.deepEqual(ref, { horas: 5800, data: '2025-12-10', manutencaoId: 'm2' })
  })

  it('horasContadorManutencaoAnterior devolve null sem histórico', () => {
    assert.equal(horasContadorManutencaoAnterior([], 'mq1'), null)
  })
})
