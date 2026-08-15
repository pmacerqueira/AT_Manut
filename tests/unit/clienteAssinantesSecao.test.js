import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ANTERO_REGO_NIF,
  detectarSecaoEquipamento,
  ASSINANTES_SECAO_ANTERO_REGO,
  resolverAssinanteEquipamento,
  ultimaAssinaturaHistorica,
  assinaturaCanonicaAssinante,
  getClienteAssinantesSecaoConfig,
  validarAssinanteSecaoEquipamento,
} from '../../src/domain/clienteAssinantesSecao.js'

describe('clienteAssinantesSecao', () => {
  it('ANTERO REGO tem config de duas secções', () => {
    const cfg = getClienteAssinantesSecaoConfig(ANTERO_REGO_NIF)
    assert.equal(cfg?.length, 2)
  })

  it('detecta MECANICA e COLISAO no rótulo do equipamento', () => {
    assert.equal(
      detectarSecaoEquipamento({ modelo: 'KPX343WK FORD MECANICA', numeroSerie: '10574065' }, ASSINANTES_SECAO_ANTERO_REGO),
      'mecanica',
    )
    assert.equal(
      detectarSecaoEquipamento({ modelo: 'KPX337W FORD COLISÃO', numeroSerie: '10502898' }, ASSINANTES_SECAO_ANTERO_REGO),
      'colisao',
    )
  })

  it('ultimaAssinaturaHistoricaExata não cruza Fabio com Paulo', () => {
    const rels = [
      { nomeAssinante: 'Fabio Cordeiro - MECANICA', assinaturaDigital: 'data:fabio', dataAssinatura: '2026-07-01' },
      { nomeAssinante: 'Paulo Sousa - COLISAO', assinaturaDigital: 'data:paulo', dataAssinatura: '2026-06-01' },
    ]
    assert.equal(
      ultimaAssinaturaHistorica(rels, 'Paulo Sousa - COLISAO'),
      'data:paulo',
    )
  })

  it('assinaturaCanonicaAssinante usa relatório de referência', () => {
    const rels = [
      { numeroRelatorio: '2026.MP.00048', nomeAssinante: 'Paulo Sousa - COLISAO', assinaturaDigital: 'data:paulo-ref' },
      { numeroRelatorio: '2026.MP.00111', nomeAssinante: 'Paulo Sousa - COLISAO', assinaturaDigital: 'data:paulo-wrong', dataAssinatura: '2026-08-01' },
    ]
    const entry = ASSINANTES_SECAO_ANTERO_REGO.find(e => e.secao === 'colisao')
    assert.equal(assinaturaCanonicaAssinante(rels, entry), 'data:paulo-ref')
  })

  it('resolverAssinanteEquipamento auto-selecciona secção e assinatura', () => {
    const maq = { id: 'm1', modelo: 'Ravaglioli KPX343WK FORD COLISAO', numeroSerie: '10574091' }
    const relatorios = [
      { numeroRelatorio: '2026.MP.00048', nomeAssinante: 'Paulo Sousa - COLISAO', assinaturaDigital: 'data:paulo', dataAssinatura: '2026-06-01' },
      { numeroRelatorio: '2026.MP.00059', nomeAssinante: 'Fabio Cordeiro - MECANICA', assinaturaDigital: 'data:fabio', dataAssinatura: '2026-06-01' },
    ]
    const r = resolverAssinanteEquipamento({
      maq,
      clienteNif: ANTERO_REGO_NIF,
      relatorios,
      nomeContactoCliente: 'Fabio Cordeiro - MECANICA',
    })
    assert.equal(r.multiSecao, true)
    assert.equal(r.secaoDetectada, 'colisao')
    assert.equal(r.nomeAssinante, 'Paulo Sousa - COLISAO')
    assert.equal(r.assinaturaDigital, 'data:paulo')
    assert.equal(r.opcoes.length, 2)
  })

  it('validarAssinanteSecaoEquipamento bloqueia Fabio em elevador Colisão', () => {
    const maq = { modelo: 'KPX343WK FORD COLISAO', numeroSerie: '10574091' }
    const msg = validarAssinanteSecaoEquipamento({
      maq,
      clienteNif: ANTERO_REGO_NIF,
      nomeAssinante: 'Fabio Cordeiro - MECANICA',
    })
    assert.ok(msg)
    assert.match(msg, /Colisão/i)
  })
})
