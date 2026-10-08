import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  aplicaNotaLegalColocacao,
  limparCitacaoNormaChecklist,
  NOTA_LEGAL_COLOCACAO_LINHAS,
} from '../../src/domain/notaLegalColocacaoMercado.js'

describe('nota legal de colocação no mercado', () => {
  it('tira as citações incorretas das perguntas de elevador', () => {
    assert.equal(
      limparCitacaoNormaChecklist('Dispositivos de segurança em funcionamento correto (EN 1493:2020)'),
      'Dispositivos de segurança em funcionamento correto',
    )
    assert.equal(
      limparCitacaoNormaChecklist('Cabos de aço: estado e aderência nas polias (EN 16625:2013)'),
      'Cabos de aço: estado e aderência nas polias',
    )
    assert.equal(
      limparCitacaoNormaChecklist('Bloqueio dos braços (máx. 150 mm) — EN 1493:2020'),
      'Bloqueio dos braços (máx. 150 mm)',
    )
    assert.equal(
      limparCitacaoNormaChecklist('Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)'),
      'Marcação CE presente no equipamento',
    )
  })

  it('deixa as perguntas de compressor como estão', () => {
    const compressor = 'Segurança operacional conforme manual de serviço (Dir. 2006/42/CE)'
    assert.equal(limparCitacaoNormaChecklist(compressor), compressor)
  })

  it('só entra em manutenção de elevador de automóveis', () => {
    assert.equal(aplicaNotaLegalColocacao({ categoriaNome: 'Elevadores de veículos', isReparacao: false }), true)
    assert.equal(aplicaNotaLegalColocacao({ categoriaNome: 'Elevadores de veículos', isReparacao: true }), false)
    assert.equal(aplicaNotaLegalColocacao({ categoriaNome: 'Compressores', isReparacao: false }), false)
  })

  it('lista o regime vigente com datas e sem normas inexistentes', () => {
    const texto = NOTA_LEGAL_COLOCACAO_LINHAS.map(l => `${l.referencia} ${l.vigencia}`).join('\n')
    assert.match(texto, /19 de janeiro de 2027/)
    assert.match(texto, /8 de abril de 2011/)
    assert.match(texto, /20 de janeiro de 2027/)
    assert.match(texto, /novembro de 2022/)
    assert.doesNotMatch(texto, /EN 1493:2020/)
    assert.doesNotMatch(texto, /EN 16625/)
    assert.doesNotMatch(texto, /ISO 16625/)
  })
})
