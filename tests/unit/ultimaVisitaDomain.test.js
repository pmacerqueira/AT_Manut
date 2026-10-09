import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resumoUltimaVisita } from '../../src/domain/ultimaVisitaDomain.js'
import { MODELO_ELEVADOR_PREVENTIVO, respostaDocumento, respostaOperacao, respostaTeste } from '../../src/domain/relatorioElevadorPreventivo.js'

const itens = [
  { id: 'c1', texto: 'Manual de instruções do fabricante', ordem: 1 },
  { id: 'c2', texto: 'Trancas de Segurança', ordem: 2 },
  { id: 'c3', texto: 'Relubrificar todas as partes mecânicas móveis', ordem: 3 },
  { id: 'c4', texto: 'Teste funcional com carga: veículo na função habitual, 2 ciclos completos de subida e descida', ordem: 4 },
]

describe('resumoUltimaVisita', () => {
  it('devolve null quando o equipamento nunca teve intervenção concluída', () => {
    const r = resumoUltimaVisita({
      maquinaId: 'm1',
      manutencoes: [{ id: 'a', maquinaId: 'm1', status: 'pendente', data: '2026-10-08' }],
      relatorios: [],
    })
    assert.equal(r, null)
  })

  it('ignora a manutenção em curso e escolhe a concluída mais recente', () => {
    const r = resumoUltimaVisita({
      maquinaId: 'm1',
      excluirManutencaoId: 'actual',
      hoje: '2026-10-08',
      manutencoes: [
        { id: 'actual', maquinaId: 'm1', status: 'concluida', data: '2026-10-08' },
        { id: 'velha', maquinaId: 'm1', status: 'concluida', data: '2026-01-10', tecnico: 'A' },
        { id: 'recente', maquinaId: 'm1', status: 'concluida', data: '2026-07-08', tecnico: 'B' },
        { id: 'outra', maquinaId: 'm2', status: 'concluida', data: '2026-09-30' },
      ],
      relatorios: [],
    })
    assert.equal(r.manutencaoId, 'recente')
    assert.equal(r.tecnico, 'B')
    assert.equal(r.diasDesde, 92)
    assert.equal(r.temRelatorio, false)
    assert.equal(r.temPendencias, false)
  })

  it('lista anomalias, documentos em falta, pontos por fazer e fora de serviço a partir do snapshot', () => {
    const respostas = {
      c1: respostaDocumento('nao_disponibilizado'),
      c2: respostaOperacao({ execucao: 'executado', observacao: 'anomalia', descricao: 'Tranca direita não engata.', recomendacao: 'Substituir conjunto.', recomendaRetirada: true }),
      c3: respostaOperacao({ execucao: 'parcial', observacao: 'sem_anomalia', motivo: 'Sem acesso ao lado traseiro.' }),
      c4: respostaTeste({ executado: true, carga: 'com_carga', observacao: 'sem_anomalia' }),
    }
    const r = resumoUltimaVisita({
      maquinaId: 'm1',
      hoje: '2026-10-08',
      manutencoes: [{ id: 'mt1', maquinaId: 'm1', status: 'concluida', data: '2026-07-01', horasServico: 1234 }],
      relatorios: [{
        id: 'r1',
        manutencaoId: 'mt1',
        numeroRelatorio: '2026.MP.00099',
        tecnico: 'Técnico X',
        notas: 'Equipamento em bom estado geral\nCliente informado de anomalia',
        checklistSnapshot: { itens, emissao: { modelo: MODELO_ELEVADOR_PREVENTIVO, recomendaRetirada: true, pedidoReparacao: 'sim', pedidoReparacaoDescricao: 'Substituir fim de curso' } },
        checklistRespostas: JSON.stringify(respostas),
      }],
    })
    assert.equal(r.numeroRelatorio, '2026.MP.00099')
    assert.equal(r.anomalias.length, 1)
    assert.equal(r.anomalias[0].n, 2)
    assert.match(r.anomalias[0].descricao, /Tranca direita/)
    assert.match(r.anomalias[0].recomendacao, /Substituir conjunto/)
    assert.deepEqual(r.documentosEmFalta.map(d => d.estado), ['nao_disponibilizado'])
    assert.equal(r.naoExecutados.length, 1)
    assert.match(r.naoExecutados[0].motivo, /Sem acesso/)
    assert.equal(r.foraDeServico, true)
    assert.match(r.pedidoReparacao, /fim de curso/)
    assert.equal(r.horas, 1234)
    assert.deepEqual(r.notas, ['Equipamento em bom estado geral', 'Cliente informado de anomalia'])
    assert.equal(r.temPendencias, true)
  })

  it('relatório legado sim/nao usa os itens vivos da subcategoria', () => {
    const r = resumoUltimaVisita({
      maquinaId: 'm1',
      checklistItems: itens,
      manutencoes: [{ id: 'mt1', maquinaId: 'm1', status: 'concluida', data: '2026-04-14' }],
      relatorios: [{ id: 'r1', manutencaoId: 'mt1', checklistRespostas: { c1: 'sim', c2: 'nao', c3: 'sim', c4: 'sim' } }],
    })
    assert.equal(r.anomalias.length, 1)
    assert.equal(r.anomalias[0].texto, 'Trancas de Segurança')
    assert.equal(r.anomalias[0].descricao, '')
    assert.equal(r.documentosEmFalta.length, 0)
  })
})
