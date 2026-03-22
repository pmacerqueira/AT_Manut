import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  sugerirFaseKaeser,
  tipoKaeserSugeridoPorDeltaHoras,
  SUGESTAO_FASE_MOTIVOS,
} from '../../src/utils/sugerirFaseKaeser.js'
import { KAESER_ANUAL_MIN_DIAS, KAESER_INTERVALO_HORAS_REF } from '../../src/constants/kaeserCiclo.js'

describe('tipoKaeserSugeridoPorDeltaHoras', () => {
  it('returns null below interval', () => {
    assert.equal(tipoKaeserSugeridoPorDeltaHoras(500, 0), null)
    assert.equal(tipoKaeserSugeridoPorDeltaHoras(KAESER_INTERVALO_HORAS_REF - 1, 0), null)
  })
  it('advances from position 0 with 3000h to B', () => {
    assert.equal(tipoKaeserSugeridoPorDeltaHoras(3000, 0), 'B')
  })
  it('advances two steps from 0 with 6000h', () => {
    assert.equal(tipoKaeserSugeridoPorDeltaHoras(6000, 0), 'A')
  })
})

describe('sugerirFaseKaeser', () => {
  it('SUGESTAO_FASE_MOTIVOS is frozen set of strings', () => {
    assert.ok(Array.isArray(SUGESTAO_FASE_MOTIVOS))
    assert.ok(SUGESTAO_FASE_MOTIVOS.includes('ambos'))
  })

  it('annual path when >= 365 days and low delta', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        ultimaManutencaoData: '2024-01-10',
        horasServicoAcumuladas: 1000,
        posicaoKaeser: 0,
      },
      horasServicoAtuais: 1200,
      dataExecucao: '2025-01-15',
    })
    assert.equal(r.detalhes.disparouAnual, true)
    assert.equal(r.detalhes.disparouHoras, false)
    assert.equal(r.motivoPrincipal, 'anual')
    assert.equal(r.tipoSugeridoCalendario, 'A')
    assert.equal(r.tipoPreSelecao, 'A')
  })

  it('hours path when delta >= 3000 and recent calendar', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        ultimaManutencaoData: '2025-10-01',
        horasServicoAcumuladas: 1000,
        posicaoKaeser: 0,
      },
      horasServicoAtuais: 4500,
      dataExecucao: '2025-11-01',
    })
    assert.equal(r.detalhes.disparouAnual, false)
    assert.equal(r.detalhes.disparouHoras, true)
    assert.equal(r.motivoPrincipal, 'horas')
    assert.equal(r.tipoSugeridoHoras, 'B')
    assert.equal(r.tipoPreSelecao, 'B')
  })

  it('dual when annual and hours disagree', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        ultimaManutencaoData: '2024-01-10',
        horasServicoAcumuladas: 1000,
        posicaoKaeser: 0,
      },
      horasServicoAtuais: 4500,
      dataExecucao: '2025-06-01',
    })
    assert.equal(r.detalhes.disparouAnual, true)
    assert.equal(r.detalhes.disparouHoras, true)
    assert.equal(r.tipoSugeridoCalendario, 'A')
    assert.equal(r.tipoSugeridoHoras, 'B')
    assert.equal(r.mostrarDual, true)
    assert.equal(r.motivoPrincipal, 'ambos')
    assert.equal(r.tipoPreSelecao, 'A')
  })

  it('uses fallbackUltimaData when ultimaManutencaoData empty', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        horasServicoAcumuladas: 500,
        posicaoKaeser: 1,
      },
      horasServicoAtuais: 600,
      dataExecucao: '2026-06-01',
      fallbackUltimaData: '2025-01-01',
    })
    assert.equal(r.detalhes.dataUltimaReferencia, '2025-01-01')
    assert.ok((r.detalhes.diasDesdeUltima ?? 0) >= KAESER_ANUAL_MIN_DIAS)
  })

  it('fallback motivo when no triggers', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        ultimaManutencaoData: '2025-11-01',
        horasServicoAcumuladas: 5000,
        posicaoKaeser: 2,
      },
      horasServicoAtuais: 5200,
      dataExecucao: '2025-12-01',
    })
    assert.equal(r.detalhes.disparouAnual, false)
    assert.equal(r.detalhes.disparouHoras, false)
    assert.equal(r.motivoPrincipal, 'fallback')
  })

  it('first intervention (no posicaoKaeser): fallback pre-selects B; counter hint still A for low hours', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        ultimaManutencaoData: '2025-11-01',
        horasServicoAcumuladas: 1000,
      },
      horasServicoAtuais: 1200,
      dataExecucao: '2025-12-01',
    })
    assert.equal(r.motivoPrincipal, 'fallback')
    assert.equal(r.tipoPreSelecao, 'B')
    assert.equal(r.tipoIndicadoPorContadorHoras, 'A')
  })

  it('first intervention: annual window without calendar nor delta uses B', () => {
    const r = sugerirFaseKaeser({
      maquina: {
        ultimaManutencaoData: '2024-01-01',
        horasServicoAcumuladas: 5000,
      },
      horasServicoAtuais: 5100,
      dataExecucao: '2025-06-01',
    })
    assert.equal(r.motivoPrincipal, 'anual')
    assert.equal(r.tipoSugeridoCalendario, null)
    assert.equal(r.detalhes.disparouHoras, false)
    assert.equal(r.tipoPreSelecao, 'B')
  })
})
