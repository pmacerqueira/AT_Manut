import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isSlotCadeiaPeriodicaAberta,
  calcLimiteExecucaoMs,
  gerarManutencoesPeriodicasFuturas,
  buildDiasOcupadosFromManutencoes,
  periodicidadeEfetivaParaMaquina,
  resolverDataExecucaoParaMaquina,
} from '../../src/domain/agendaDomain.js'

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
