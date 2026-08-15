/**
 * Paridade agenda (BD) ↔ PDF/email — regressões AUTO ELGE / v1.17.8–1.17.9.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  gerarManutencoesPeriodicasFuturas,
  calcLimiteExecucaoMs,
  buildDiasOcupadosFromManutencoes,
  recalcularPeriodicasNoEstado,
} from '../../src/domain/agendaDomain.js'
import { INTERVALOS } from '../../src/domain/equipamentoDomain.js'
import { minDataManutencaoAberta, listProximasAgendaPeriodicas } from '../../src/utils/proximaManutAgenda.js'
import { buildProximasManutencoesManutencao } from '../../src/utils/relatorioManutencaoPayload.js'

describe('agenda ↔ PDF próximas (paridade)', () => {
  it('recalc pós Jul/2026 gera Nov/2026 como 1.º slot trimestral', () => {
    const hojeStr = '2026-08-15'
    const dataExec = '2026-07-31'
    const maquinaId = 'm-elge-1'
    const prev = [
      { id: 'old', maquinaId, status: 'agendada', tipo: 'periodica', data: '2026-10-14' },
      { id: 'jul', maquinaId, status: 'concluida', tipo: 'periodica', data: dataExec },
    ]
    const { next, novas } = recalcularPeriodicasNoEstado(prev, {
      maquinaId,
      periodicidade: 'trimestral',
      dataExecucao: dataExec,
      tecnico: 'Tec',
      hojeStr,
      intervalos: INTERVALOS,
      idSeed: 5000,
    })
    assert.ok(novas.length >= 1)
    assert.ok(novas[0].data > dataExec)
    assert.ok(novas[0].data >= '2026-10-29')
    const minOpen = minDataManutencaoAberta(maquinaId, next)
    assert.equal(minOpen, novas[0].data)
  })

  it('buildProximas espelha listProximasAgendaPeriodicas para concluída', () => {
    const maquinaId = 'm1'
    const manutencoes = [
      { id: 'c1', maquinaId, status: 'concluida', tipo: 'periodica', data: '2026-07-31', periodicidade: 'trimestral' },
      { id: 'f1', maquinaId, status: 'agendada', tipo: 'periodica', data: '2026-11-04', periodicidade: 'trimestral', tecnico: 'Tec' },
      { id: 'f2', maquinaId, status: 'agendada', tipo: 'periodica', data: '2027-01-27', periodicidade: 'trimestral', tecnico: 'Tec' },
      { id: 'other', maquinaId: 'm2', status: 'agendada', tipo: 'periodica', data: '2026-10-29' },
    ]
    const agendaDates = listProximasAgendaPeriodicas(maquinaId, manutencoes).map(m => m.data)
    const pdfDates = buildProximasManutencoesManutencao({
      relatorio: { dataCriacao: '2026-07-31T12:00:00.000Z' },
      manutencao: { id: 'c1', maquinaId, status: 'concluida', tipo: 'periodica', tecnico: 'Tec' },
      maquina: { id: maquinaId, periodicidadeManut: 'trimestral' },
      manutencoes,
    }).map(p => p.data)
    assert.deepEqual(pdfDates.slice(0, 2), agendaDates.slice(0, 2))
  })

  it('sincronizar tarde não salta trimestre em atraso imediato (Abr → Jul)', () => {
    const hojeStr = '2026-08-15'
    const { novas } = gerarManutencoesPeriodicasFuturas({
      dataBaseIso: '2026-04-17',
      periodicidade: 'trimestral',
      intervaloDias: 90,
      maquinaId: 'm1',
      limiteMs: calcLimiteExecucaoMs('2026-04-17', hojeStr),
      diasOcupados: new Set(),
      hojeStr,
      observacoes: 'test',
      idSeed: 6000,
    })
    assert.ok(novas.some(n => n.data >= '2026-07-01' && n.data < '2026-08-01'))
    assert.ok(novas.some(n => n.data >= '2026-11-01'))
  })

  it('concluída sem slots abertos faz fallback a computarProximasDatas', () => {
    const prox = buildProximasManutencoesManutencao({
      relatorio: { dataCriacao: '2026-07-31T12:00:00.000Z' },
      manutencao: { id: 'c1', maquinaId: 'm1', status: 'concluida', tipo: 'periodica', tecnico: 'Tec' },
      maquina: { id: 'm1', periodicidadeManut: 'trimestral' },
      manutencoes: [
        { id: 'c1', maquinaId: 'm1', status: 'concluida', tipo: 'periodica', data: '2026-07-31' },
      ],
    })
    assert.ok(prox.length >= 1)
    assert.ok(prox[0].data > '2026-07-31')
  })
})
