import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isSlotCadeiaPeriodicaAberta,
  calcLimiteExecucaoMs,
  gerarManutencoesPeriodicasFuturas,
  buildDiasOcupadosFromManutencoes,
  periodicidadeEfetivaParaMaquina,
  resolverDataExecucaoParaMaquina,
  recalcularPeriodicasNoEstado,
  recalcularAgendaMaquinaNoAcc,
} from '../../src/domain/agendaDomain.js'
import { INTERVALOS } from '../../src/domain/equipamentoDomain.js'

describe('isSlotCadeiaPeriodicaAberta', () => {
  it('matches open periodic slot for machine', () => {
    assert.equal(
      isSlotCadeiaPeriodicaAberta({ maquinaId: 'm1', status: 'agendada', tipo: 'periodica' }, 'm1'),
      true,
    )
  })
  it('excludes montagem', () => {
    assert.equal(
      isSlotCadeiaPeriodicaAberta({ maquinaId: 'm1', status: 'pendente', tipo: 'montagem' }, 'm1'),
      false,
    )
  })
  it('excludes concluded', () => {
    assert.equal(
      isSlotCadeiaPeriodicaAberta({ maquinaId: 'm1', status: 'concluida', tipo: 'periodica' }, 'm1'),
      false,
    )
  })
})

describe('gerarManutencoesPeriodicasFuturas', () => {
  it('generates future slots from trimestral base', () => {
    const { novas } = gerarManutencoesPeriodicasFuturas({
      dataBaseIso: '2026-01-15',
      periodicidade: 'trimestral',
      intervaloDias: 90,
      maquinaId: 'm1',
      tecnico: 'Tec',
      limiteMs: new Date('2027-01-15T12:00:00').getTime(),
      diasOcupados: new Set(),
      observacoes: 'test',
      idSeed: 1000,
    })
    assert.ok(novas.length >= 3)
    assert.equal(novas[0].maquinaId, 'm1')
    assert.equal(novas[0].status, 'agendada')
    assert.match(novas[0].id, /^mp1000_/)
  })

  it('skips dates before hoje when hojeStr set', () => {
    const { novas } = gerarManutencoesPeriodicasFuturas({
      dataBaseIso: '2020-01-01',
      periodicidade: 'anual',
      intervaloDias: 365,
      maquinaId: 'm1',
      limiteMs: calcLimiteExecucaoMs('2020-01-01', '2026-06-12'),
      diasOcupados: new Set(),
      hojeStr: '2026-06-12',
      observacoes: 'test',
      idSeed: 2000,
    })
    assert.ok(novas.every(n => n.data >= '2026-06-12'))
  })

  it('tracks conflitos when enabled', () => {
    const manuts = [{ id: 'x', status: 'agendada', data: '2026-04-15' }]
    const { conflitos } = gerarManutencoesPeriodicasFuturas({
      dataBaseIso: '2026-01-15',
      periodicidade: 'trimestral',
      intervaloDias: 90,
      maquinaId: 'm1',
      limiteMs: new Date('2027-06-01T12:00:00').getTime(),
      diasOcupados: buildDiasOcupadosFromManutencoes(manuts),
      trackConflitos: true,
      manutencoesForConflitos: manuts,
      observacoes: 'test',
      idSeed: 3000,
    })
    assert.ok(Array.isArray(conflitos))
  })
})

describe('periodicidadeEfetivaParaMaquina', () => {
  const subs = [{ id: 's1', categoriaId: 'c1' }]
  const cats = [{ id: 'c1', intervaloTipo: 'semestral' }]

  it('prefers machine override', () => {
    assert.equal(
      periodicidadeEfetivaParaMaquina({ subcategoriaId: 's1', periodicidadeManut: 'anual' }, subs, cats),
      'anual',
    )
  })
  it('falls back to category interval', () => {
    assert.equal(
      periodicidadeEfetivaParaMaquina({ subcategoriaId: 's1' }, subs, cats),
      'semestral',
    )
  })
})

describe('resolverDataExecucaoParaMaquina', () => {
  it('uses latest concluded when newer than ficha', () => {
    const maq = { id: 'm1', ultimaManutencaoData: '2025-01-01' }
    const manuts = [
      { maquinaId: 'm1', status: 'concluida', data: '2026-03-10' },
    ]
    const sameMid = (m, mid) => String(m.maquinaId) === String(mid)
    assert.equal(resolverDataExecucaoParaMaquina(maq, manuts, sameMid), '2026-03-10')
  })
})

describe('recalcularPeriodicasNoEstado', () => {
  it('replaces open periodic chain with new slots', () => {
    const prev = [
      { id: 'old1', maquinaId: 'm1', status: 'agendada', tipo: 'periodica', data: '2026-12-01' },
      { id: 'keep', maquinaId: 'm2', status: 'agendada', tipo: 'periodica', data: '2026-12-01' },
    ]
    const { next, idsRemover, novaCount } = recalcularPeriodicasNoEstado(prev, {
      maquinaId: 'm1',
      periodicidade: 'trimestral',
      dataExecucao: '2026-06-01',
      tecnico: 'Tec',
      hojeStr: '2026-06-12',
      intervalos: INTERVALOS,
      idSeed: 9000,
    })
    assert.ok(idsRemover.includes('old1'))
    assert.ok(novaCount >= 1)
    assert.ok(next.some(m => m.maquinaId === 'm1' && m.id !== 'old1'))
    assert.ok(next.some(m => m.id === 'keep'))
  })
})

describe('recalcularAgendaMaquinaNoAcc', () => {
  it('replaces open chain and generates future slots from last execution', () => {
    const subs = [{ id: 's1', categoriaId: 'c1' }]
    const cats = [{ id: 'c1', intervaloTipo: 'trimestral' }]
    const maq = { id: 'm1', subcategoriaId: 's1', ultimaManutencaoData: '2026-01-10' }
    const acc = [
      { id: 'c1', maquinaId: 'm1', status: 'concluida', tipo: 'periodica', data: '2026-03-01', tecnico: 'Tec' },
      { id: 'old', maquinaId: 'm1', status: 'agendada', tipo: 'periodica', data: '2026-12-01' },
      { id: 'other', maquinaId: 'm2', status: 'agendada', tipo: 'periodica', data: '2026-12-01' },
    ]
    const sameMid = (m, mid) => String(m.maquinaId) === String(mid)
    const { acc: next, idsRemover, novas, recalculada } = recalcularAgendaMaquinaNoAcc(acc, {
      maq,
      subcategorias: subs,
      categorias: cats,
      hojeStr: '2026-06-12',
      intervalos: INTERVALOS,
      sameMid,
      idSeed: 8000,
    })
    assert.equal(recalculada, true)
    assert.ok(idsRemover.includes('old'))
    assert.ok(novas.length >= 1)
    assert.ok(next.some(m => m.maquinaId === 'm1' && m.id !== 'old'))
    assert.ok(next.some(m => m.id === 'other'))
  })
})
