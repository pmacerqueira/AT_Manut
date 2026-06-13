import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNovaManutencao,
  buildManutencoesBatch,
  mergeManutencaoUpdate,
  findRelatorioByManutencaoId,
  buildNovoRelatorioManutencao,
} from '../../src/domain/manutencoesDomain.js'
import {
  buildNovaReparacao,
  mergeReparacaoUpdate,
  removeReparacaoFromList,
  buildNovoRelatorioReparacao,
} from '../../src/domain/reparacoesDomain.js'

const norm = (x) => String(x)

describe('buildNovaManutencao', () => {
  it('assigns id and criadoEm', () => {
    const m = buildNovaManutencao({ maquinaId: 'maq1', data: '2026-01-01' }, 100)
    assert.equal(m.id, 'm100')
    assert.ok(m.criadoEm)
  })
})

describe('mergeManutencaoUpdate', () => {
  it('tracks machine ids for sync', () => {
    const prev = [
      { id: 'm1', maquinaId: 'a', status: 'pendente' },
      { id: 'm2', maquinaId: 'b' },
    ]
    const { next, syncIds } = mergeManutencaoUpdate(prev, 'm1', { maquinaId: 'c', status: 'concluida' })
    assert.equal(next[0].status, 'concluida')
    assert.deepEqual(syncIds.sort(), ['a', 'c'].sort())
  })
})

describe('buildNovoRelatorioManutencao', () => {
  it('uses MT prefix for montagem', () => {
    const proximo = (rels, { prefix }) => `${prefix}-001`
    const { novo, numeroRelatorio } = buildNovoRelatorioManutencao(
      { manutencaoId: 'm1' },
      {
        manutencoes: [{ id: 'm1', tipo: 'montagem' }],
        relatorios: [],
        proximoNumeroFn: proximo,
        idSeed: 1,
      },
    )
    assert.equal(numeroRelatorio, 'MT-001')
    assert.equal(novo.id, 'r1')
  })
})

describe('reparacoesDomain', () => {
  it('buildNovaReparacao assigns id', () => {
    const r = buildNovaReparacao({ maquinaId: 'x' }, 5)
    assert.equal(r.id, 'rep5')
  })

  it('removeReparacaoFromList filters by id', () => {
    const next = removeReparacaoFromList([{ id: 'a' }, { id: 'b' }], 'a')
    assert.equal(next.length, 1)
    assert.equal(next[0].id, 'b')
  })

  it('buildNovoRelatorioReparacao assigns RP number', () => {
    const proximo = (rels, { prefix }) => `${prefix}-002`
    const { numeroRelatorio } = buildNovoRelatorioReparacao(
      { reparacaoId: 'r1' },
      { relatoriosReparacao: [], proximoNumeroFn: proximo, idSeed: 9 },
    )
    assert.equal(numeroRelatorio, 'RP-002')
  })
})

describe('findRelatorioByManutencaoId', () => {
  it('normalizes ids', () => {
    const rel = findRelatorioByManutencaoId(
      [{ id: 'rel1', manutencaoId: '42' }],
      42,
      norm,
    )
    assert.equal(rel.id, 'rel1')
  })
})
