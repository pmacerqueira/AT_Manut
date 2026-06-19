import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularVereditoChecklist,
  itensNaoConformes,
  buildResumoExecutivoBullets,
  buildResumoExecutivoMeta,
  formatMoradaCliente,
  resolveDataAgendamentoIso,
} from '../../src/utils/relatorioPdfResumo.js'

describe('relatorioPdfResumo', () => {
  it('calcularVereditoChecklist — conforme sem não conformidades', () => {
    assert.equal(calcularVereditoChecklist({ a: 'sim', b: 'sim' }, [{ id: 'a' }, { id: 'b' }]), 'conforme')
  })

  it('calcularVereditoChecklist — reservas com alguns não', () => {
    assert.equal(calcularVereditoChecklist({ a: 'sim', b: 'nao', c: 'sim' }, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]), 'reservas')
  })

  it('calcularVereditoChecklist — não conforme quando maioria é não', () => {
    assert.equal(calcularVereditoChecklist({ a: 'nao', b: 'nao', c: 'sim' }, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]), 'nao_conforme')
  })

  it('itensNaoConformes lista só respostas não', () => {
    const items = [{ id: 'c1', texto: 'Item A' }, { id: 'c2', texto: 'Item B' }]
    const rel = { checklistRespostas: { c1: 'sim', c2: 'nao' } }
    assert.deepEqual(itensNaoConformes(rel, items), [{ index: 2, id: 'c2', texto: 'Item B' }])
  })

  it('buildResumoExecutivoBullets prioriza não conformidades', () => {
    const bullets = buildResumoExecutivoBullets({
      notas: 'Nota livre',
      naoConformes: [{ index: 3, texto: 'Ruído anormal' }],
      max: 3,
    })
    assert.ok(bullets[0].includes('Não conforme'))
    assert.ok(bullets.some(b => b.includes('Nota livre')))
  })

  it('resolveDataAgendamentoIso só quando distinta da execução', () => {
    assert.equal(resolveDataAgendamentoIso({ manutencao: { data: '2026-05-01' }, dataExecucaoIso: '2026-06-18' }), '2026-05-01')
    assert.equal(resolveDataAgendamentoIso({ manutencao: { data: '2026-06-18' }, dataExecucaoIso: '2026-06-18' }), null)
  })

  it('formatMoradaCliente junta morada e localidade', () => {
    assert.equal(
      formatMoradaCliente({ morada: 'Rua X', codigoPostal: '9500', localidade: 'Ponta Delgada' }),
      'Rua X, 9500 Ponta Delgada',
    )
  })

  it('buildResumoExecutivoMeta inclui veredito e próxima data', () => {
    const meta = buildResumoExecutivoMeta({
      relatorio: { checklistRespostas: { c1: 'sim' }, notas: 'Tudo OK' },
      manutencao: { tipo: 'periodica', data: '2026-05-01' },
      maquina: { periodicidadeManut: 'trimestral' },
      cliente: { nif: '123', morada: 'Rua A' },
      checklistItems: [{ id: 'c1', texto: 'Teste' }],
      proximasManutencoes: [{ data: '2026-09-18', tecnico: 'Paulo' }],
      isReparacao: false,
    })
    assert.equal(meta.veredito, 'conforme')
    assert.equal(meta.proximaData, '2026-09-18')
    assert.equal(meta.clienteNif, '123')
    assert.equal(meta.periodicidadeLabel, 'Trimestral')
  })
})
