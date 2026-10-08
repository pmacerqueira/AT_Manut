import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildResumoExecutivoMeta } from '../../src/utils/relatorioPdfResumo.js'
import {
  respostaTeste,
  TEXTO_TESTE_COM_CARGA,
  MODELO_ELEVADOR_PREVENTIVO,
  decisaoOperacionalElevador,
  aplicarForaDeServico,
  aplicaModeloElevadorPreventivo,
  buildEmissaoElevador as buildEmissao,
  checklistEstaCompleta,
  emissaoDoRelatorio,
  itensDoSnapshot,
  numeroAditamento,
  validarChecklistElevador,
  mensagemNotasContraditoriasElevador,
  papelDoPonto,
  fundamentoInaplicavel,
  respostaDocumento,
  pontoImplicaForaDeServico,
  respostaOperacao,
  contextoEmissaoFromForm,
  linhasContextoEmissao,
  mensagemPedidoForaAmbito,
  codigoResposta,
} from '../../src/domain/relatorioElevadorPreventivo.js'
import { referenciasCitaveisNoPdf } from '../../src/domain/catalogoReferenciasElevador.js'

describe('relatorio elevador preventivo', () => {
  it('não aplica o modelo a montagem nem a compressores', () => {
    assert.equal(aplicaModeloElevadorPreventivo({ categoriaNome: 'Elevadores de veículos', tipoManutencao: 'montagem' }), false)
    assert.equal(aplicaModeloElevadorPreventivo({ categoriaNome: 'Compressores', tipoManutencao: 'periodica' }), false)
    assert.equal(aplicaModeloElevadorPreventivo({ categoriaNome: 'Elevadores de veículos ligeiros e pesados', tipoManutencao: 'periodica' }), true)
  })

  it('snapshot legado continua a ser uma lista de itens', () => {
    const legado = [{ id: 'ch1', texto: 'Cabos' }]
    assert.deepEqual(itensDoSnapshot(legado), legado)
    assert.equal(emissaoDoRelatorio({ checklistSnapshot: legado }), null)
  })

  it('emissão nova congela a nota de âmbito e não é aprovação', () => {
    const emissao = buildEmissao({ estado: 'concluida_ambito' })
    assert.equal(emissao.modelo, MODELO_ELEVADOR_PREVENTIVO)
    assert.match(emissao.notaAmbitoPontos[0], /exclusivamente a manutenção preventiva/)
    assert.doesNotMatch(emissao.notaAmbitoPontos[0], /diagnóstico técnico/)
    assert.match(emissao.declaracaoTexto, /receção do presente relatório/i)
    assert.doesNotMatch(emissao.declaracaoTexto, /Não constitui certificação/)
    const relatorio = {
      checklistRespostas: {
        a: 'sim',
        b: { r: 'nao', descricao: 'Fim de curso partido.', recomendacao: 'Não utilizar até substituir.' },
        c: 'sim',
      },
      checklistSnapshot: { itens: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], emissao },
      notas: 'Fim de curso partido.',
    }
    const meta = buildResumoExecutivoMeta({
      relatorio,
      manutencao: { tipo: 'periodica' },
      checklistItems: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'Fim de curso' }, { id: 'c', texto: 'C' }],
    })
    assert.equal(meta.veredito, 'ambito_concluido_anomalias')
    assert.equal(meta.vereditoStyle.label.includes('CONFORME'), false)
    assert.match(meta.bullets[0], /^Anomalia \(2\):/)
    assert.equal(meta.bullets.some(b => b.includes('sem não conformidades')), false)
    assert.equal(meta.notaAmbitoPontos.length, 3)
    const metaElevador = buildResumoExecutivoMeta({
      relatorio,
      manutencao: { tipo: 'periodica' },
      checklistItems: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'Fim de curso' }, { id: 'c', texto: 'C' }],
      categoriaNome: 'Elevadores de veículos',
    })
    assert.equal(metaElevador.notaAmbitoPontos.length, 1)
    assert.match(metaElevador.notaAmbitoPontos[0], /exclusivamente a manutenção preventiva/)
    assert.equal(meta.tipoIntervencao, 'Relatório de Manutenção Preventiva')
  })

  it('sem anomalia não escreve a frase automática de conformidade', () => {
    const emissao = buildEmissao()
    const meta = buildResumoExecutivoMeta({
      relatorio: {
        checklistRespostas: { a: 'sim' },
        checklistSnapshot: { itens: [{ id: 'a' }], emissao },
      },
      manutencao: { tipo: 'periodica' },
      checklistItems: [{ id: 'a', texto: 'A' }],
    })
    assert.equal(meta.veredito, 'ambito_concluido')
    assert.match(meta.bullets[0], /sem anomalia observada nesta intervenção/)
  })

  it('relatório antigo de elevador mantém o veredito por contagem', () => {
    const meta = buildResumoExecutivoMeta({
      relatorio: { checklistRespostas: { a: 'sim', b: 'nao', c: 'sim' } },
      manutencao: { tipo: 'periodica' },
      checklistItems: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    })
    assert.equal(meta.veredito, 'reservas')
    assert.equal(meta.notaAmbitoPontos.length, 3)
    const reparacao = buildResumoExecutivoMeta({
      relatorio: { checklistRespostas: { a: 'sim' }, notas: 'Troca de sensor' },
      isReparacao: true,
      reparacao: { data: '2026-04-14' },
    })
    assert.equal(reparacao.notaAmbitoPontos.length, 3)
    assert.equal(reparacao.veredito, null)
  })

  it('anomalia sem descrição não deixa gravar', () => {
    const erros = validarChecklistElevador(
      [{ id: 'ch12', texto: 'Sistema de fim de curso e limitadores' }],
      { ch12: { r: 'nao', descricao: '', recomendacao: '' } },
    )
    assert.ok(erros.some(e => e.includes('descreva')))
    assert.equal(checklistEstaCompleta(
      [{ id: 'ch12' }],
      { ch12: { r: 'nao', descricao: 'Fim de curso partido no braço.', recomendacao: 'Substituir antes de usar.' } },
      { elevador: true },
    ), true)
  })

  it('nota de bom estado fica bloqueada quando há anomalia', () => {
    const msg = mensagemNotasContraditoriasElevador('Equipamento em bom estado geral')
    assert.match(msg, /bom estado geral/)
    assert.equal(mensagemNotasContraditoriasElevador('Fim de curso partido no braço esquerdo.'), '')
  })

  it('separa documento, teste e o que não existe na configuração', () => {
    assert.equal(papelDoPonto({ texto: 'Manual de instruções do fabricante' }), 'documento')
    assert.equal(papelDoPonto({ texto: 'Declaração de conformidade do fabricante' }), 'documento')
    assert.equal(papelDoPonto({ texto: 'Teste funcional com carga: veículo na função habitual, 2 ciclos completos de subida e descida' }), 'teste')
    const comCarga = respostaTeste({ executado: true, carga: 'com_carga', observacao: 'sem_anomalia' })
    assert.equal(comCarga.limitacao, TEXTO_TESTE_COM_CARGA)
    assert.equal(validarChecklistElevador(
      [{ id: 't', texto: 'Teste funcional com carga: veículo na função habitual, 2 ciclos completos de subida e descida' }],
      { t: comCarga },
    ).length, 0)
    assert.equal(papelDoPonto({ texto: 'Limpeza do equipamento no fim da intervenção' }), 'operacao')
    assert.equal(papelDoPonto({ texto: 'Limpeza final do equipamento e teste em funcionamento' }), 'teste')
    assert.equal(papelDoPonto({ texto: 'Lubrificação dos pontos' }), 'operacao')
    assert.match(fundamentoInaplicavel({ texto: 'Estado dos cabos de aço' }, 'sub2'), /não tem/)
    assert.equal(fundamentoInaplicavel({ texto: 'Estado dos cabos de aço' }, 'sub1'), '')
    const erros = validarChecklistElevador(
      [{ id: 'd', texto: 'Manual de instruções' }],
      { d: respostaDocumento('nao_disponibilizado') },
    )
    assert.equal(erros.length, 0)
    const docNaoBloqueiaEstrutura = validarChecklistElevador(
      [
        { id: 'd', texto: 'Manual de instruções' },
        { id: 'e', texto: 'Estrutura visível' },
      ],
      {
        d: respostaDocumento('nao_disponibilizado'),
        e: respostaOperacao({ execucao: 'executado', observacao: 'sem_anomalia' }),
      },
    )
    assert.equal(docNaoBloqueiaEstrutura.length, 0)
  })

  it('execução incompleta não fica como verificação sem anomalia', () => {
    const items = [
      { id: 'a', texto: 'Lubrificação' },
      { id: 'b', texto: 'Estado geral de conservação' },
    ]
    const comAnomalia = {
      a: respostaOperacao({
        execucao: 'executado',
        observacao: 'anomalia',
        descricao: 'Folga no braço direito.',
        recomendacao: 'Não utilizar até corrigir a folga.',
        recomendaRetirada: true,
      }),
      b: respostaOperacao({ execucao: 'executado', observacao: 'sem_anomalia' }),
    }
    assert.ok(validarChecklistElevador(items, comAnomalia).some(e => /conservação visível/.test(e)))
    const parcial = respostaOperacao({
      execucao: 'parcial',
      observacao: 'nao_observado',
      motivo: 'Acesso impedido pelo veículo.',
    })
    assert.equal(codigoResposta(parcial), 'parcial')
    const meta = buildResumoExecutivoMeta({
      relatorio: {
        checklistSnapshot: { emissao: buildEmissao() },
        checklistRespostas: { a: parcial },
      },
      checklistItems: [{ id: 'a', texto: 'Lubrificação' }],
    })
    assert.equal(meta.veredito, 'ambito_parcial')
    assert.doesNotMatch(meta.bullets.join(' '), /sem anomalia observada nesta intervenção/)
    assert.equal(contextoEmissaoFromForm({ checklistRespostas: comAnomalia, pedidoSoPreventiva: true }, items).recomendaRetirada, true)
  })

  it('não cita normas que ainda não foram validadas', () => {
    assert.deepEqual(referenciasCitaveisNoPdf(), [])
  })

  it('falha crítica recomenda fora de serviço e o resto não', () => {
    assert.equal(pontoImplicaForaDeServico({ texto: 'Sistema de fim de curso e limitadores' }), true)
    assert.equal(pontoImplicaForaDeServico({ texto: 'Cabos de aço: estado e aderência nas polias' }), true)
    assert.equal(pontoImplicaForaDeServico({ texto: 'Travão: ferodos' }), true)
    assert.equal(pontoImplicaForaDeServico({ texto: 'Nível de óleo do redutor' }), false)
    assert.equal(pontoImplicaForaDeServico({ texto: 'Verificar cabos elétricos e relés' }), false)
    assert.equal(pontoImplicaForaDeServico({ texto: 'Manual de instruções do fabricante' }), false)
    const items = [
      { id: 'curso', texto: 'Sistema de fim de curso e limitadores' },
      { id: 'oleo', texto: 'Nível de óleo do redutor' },
    ]
    const respostas = {
      curso: respostaOperacao({
        execucao: 'executado',
        observacao: 'anomalia',
        descricao: 'Fim de curso partido.',
        recomendacao: 'Substituir o fim de curso.',
      }),
      oleo: respostaOperacao({ execucao: 'executado', observacao: 'anomalia', descricao: 'Nível baixo.', recomendacao: 'Atestar na próxima visita.' }),
    }
    const aplicadas = aplicarForaDeServico(items, respostas)
    assert.equal(aplicadas.curso.recomendaRetirada, true)
    assert.match(aplicadas.curso.recomendacao, /fora de serviço/)
    assert.match(aplicadas.curso.recomendacao, /Substituir o fim de curso/)
    assert.equal(aplicadas.oleo.recomendaRetirada, false)
    assert.equal(
      contextoEmissaoFromForm({ checklistRespostas: aplicadas }, items).recomendaRetirada,
      true,
    )
    const decisao = decisaoOperacionalElevador(items, aplicadas, { recomendaRetirada: true })
    assert.match(decisao.titulo, /Fora de serviço imediato/)
    assert.match(decisao.motivo, /fim de curso/i)
    assert.equal(decisaoOperacionalElevador(
      [{ id: 'oleo', texto: 'Nível de óleo do redutor' }],
      { oleo: respostaOperacao({ execucao: 'executado', observacao: 'sem_anomalia' }) },
    ), null)
  })

  it('pedido de reparação fica fora da visita e não abre esse serviço', () => {
    assert.match(mensagemPedidoForaAmbito({ pedidoExtra: '' }), /reparação, alteração ou certificação/)
    assert.match(mensagemPedidoForaAmbito({ pedidoExtra: 'sim', pedidoExtraDescricao: 'curto' }), /não é executado/)
    assert.equal(mensagemPedidoForaAmbito({ pedidoExtra: 'sim', pedidoExtraDescricao: 'Reparação do fim de curso' }), '')
    const emissao = contextoEmissaoFromForm({
      pedidoSoPreventiva: true,
      pedidoExtra: 'sim',
      pedidoExtraDescricao: 'Alteração da capacidade',
    }, [])
    const linha = linhasContextoEmissao(emissao).find(row => row[0] === 'PEDIDO FORA DO ÂMBITO')
    assert.match(linha[1], /Alteração da capacidade/)
    assert.match(linha[1], /Não gera reparação/)
  })

  it('aditamento não reutiliza o número original', () => {
    assert.equal(numeroAditamento('2026.MP.00053', [
      { numeroRelatorio: '2026.MP.00053' },
      { numeroRelatorio: '2026.MP.00053-A1' },
    ]), '2026.MP.00053-A2')
  })
})
