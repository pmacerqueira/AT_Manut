/**
 * Auditoria de lapsos na agenda periódica.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  auditarAgendaPeriodica,
  detectarBuracosConcluidas,
  detectarSaltoAgendaAberta,
  formatAgendaAuditReportText,
} from '../../src/domain/agendaAuditDomain.js'

const subs = [{ id: 's1', categoriaId: 'c1' }]
const cats = [{ id: 'c1', intervaloTipo: 'trimestral' }]
const clientes = [{ id: 'cl1', nif: '512006237', nome: 'MONTALVERNE & Cª, S.A.' }]

function maq(id, sn, extra = {}) {
  return {
    id,
    subcategoriaId: 's1',
    numeroSerie: sn,
    modelo: 'KPE32',
    marca: 'Ravaglioli',
    clienteNif: '512006237',
    periodicidadeManut: 'trimestral',
    proximaManut: extra.proximaManut ?? '2026-10-16',
    ultimaManutencaoData: extra.ultima ?? '2026-04-17',
  }
}

describe('detectarBuracosConcluidas', () => {
  it('detecta Jul em falta entre Abr e Out concluídas', () => {
    const concl = [
      { data: '2026-04-17' },
      { data: '2026-10-20' },
    ]
    const buracos = detectarBuracosConcluidas(concl, 90)
    assert.equal(buracos.length, 1)
    assert.ok(buracos[0].periodosEmFalta.some(d => d >= '2026-07-01' && d < '2026-08-01'))
  })

  it('aceita intervalo trimestral normal', () => {
    const concl = [
      { data: '2026-04-17' },
      { data: '2026-07-29' },
    ]
    assert.equal(detectarBuracosConcluidas(concl, 90).length, 0)
  })
})

describe('detectarSaltoAgendaAberta', () => {
  it('detecta salto Abr → Out sem Jul', () => {
    const salto = detectarSaltoAgendaAberta(
      '2026-04-17',
      [{ data: '2026-10-16' }],
      [{ data: '2026-04-17', status: 'concluida' }],
      90,
    )
    assert.ok(salto)
    assert.ok(salto.slotEsperado >= '2026-07-01')
  })
})

describe('auditarAgendaPeriodica', () => {
  it('reporta salto_agenda_aberta no caso ELGE/MONTALVERNE', () => {
    const m = maq('m1', '10653025')
    const manutencoes = [
      { id: 'a', maquinaId: 'm1', status: 'concluida', tipo: 'periodica', data: '2026-04-17' },
      { id: 'o', maquinaId: 'm1', status: 'agendada', tipo: 'periodica', data: '2026-10-16' },
    ]
    const r = auditarAgendaPeriodica({
      maquinas: [m],
      manutencoes,
      clientes,
      subcategorias: subs,
      categorias: cats,
      hojeStr: '2026-08-15',
    })
    assert.ok(r.issues.some(i => i.tipo === 'salto_agenda_aberta'))
    assert.ok(r.issues.some(i => i.tipo === 'sync_slot_em_falta'))
  })

  it('retorna limpo após agenda coerente', () => {
    const m = maq('m1', '10653025', { proxima: '2026-10-27', ultima: '2026-07-29' })
    m.proximaManut = '2026-10-27'
    const manutencoes = [
      { id: 'a', maquinaId: 'm1', status: 'concluida', tipo: 'periodica', data: '2026-04-17' },
      { id: 'j', maquinaId: 'm1', status: 'concluida', tipo: 'periodica', data: '2026-07-29' },
      { id: 'o', maquinaId: 'm1', status: 'agendada', tipo: 'periodica', data: '2026-10-27' },
    ]
    const r = auditarAgendaPeriodica({
      maquinas: [m],
      manutencoes,
      clientes,
      subcategorias: subs,
      categorias: cats,
      hojeStr: '2026-08-15',
    })
    assert.equal(r.resumo.limpo, true)
  })

  it('formatAgendaAuditReportText inclui cabeçalho', () => {
    const text = formatAgendaAuditReportText({
      hojeStr: '2026-08-15',
      analisadas: 5,
      issues: [],
      resumo: { total: 0, limpo: true, porTipo: {} },
    })
    assert.match(text, /AUDITORIA AGENDA/)
    assert.match(text, /Nenhuma anomalia/)
  })
})
