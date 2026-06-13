import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveDataExecucaoManutencao,
  buildProximasManutencoesManutencao,
  buildRelatorioManutencaoPdfArgs,
} from '../../src/utils/relatorioManutencaoPayload.js'

const getSub = (id) => ({ id, nome: 'Elevador', categoriaId: 'c1' })
const getCat = (id) => ({ id, nome: 'Elevadores', intervaloTipo: 'trimestral' })

describe('resolveDataExecucaoManutencao', () => {
  it('prefers dataCriacao then assinatura then manutencao.data', () => {
    assert.equal(
      resolveDataExecucaoManutencao({
        relatorio: { dataCriacao: '2026-05-10T10:00:00Z', dataAssinatura: '2026-05-09T10:00:00Z' },
        manutencao: { data: '2026-04-01' },
      }),
      '2026-05-10',
    )
    assert.equal(
      resolveDataExecucaoManutencao({
        relatorio: { dataAssinatura: '2026-05-09T10:00:00Z' },
        manutencao: { data: '2026-04-01' },
      }),
      '2026-05-09',
    )
  })
})

describe('buildProximasManutencoesManutencao', () => {
  it('returns empty without periodicidade', () => {
    assert.deepEqual(
      buildProximasManutencoesManutencao({
        relatorio: { dataCriacao: '2026-01-15T12:00:00Z' },
        manutencao: { tecnico: 'Tec' },
        maquina: {},
      }),
      [],
    )
  })

  it('returns dates when periodicidade set', () => {
    const prox = buildProximasManutencoesManutencao({
      relatorio: { dataCriacao: '2026-01-15T12:00:00Z', tecnico: 'Tec' },
      manutencao: { tecnico: 'Tec' },
      maquina: { periodicidadeManut: 'trimestral' },
    })
    assert.ok(prox.length >= 1)
    assert.ok(prox[0].data)
  })
})

describe('buildRelatorioManutencaoPdfArgs', () => {
  it('includes proximas and declaracao fields', () => {
    const args = buildRelatorioManutencaoPdfArgs({
      relatorio: { id: 'r1', dataCriacao: '2026-03-01T12:00:00Z' },
      manutencao: { id: 'm1', tipo: 'periodica', tecnico: 'João' },
      maquina: { subcategoriaId: 's1', periodicidadeManut: 'anual', marca: 'X', modelo: 'Y' },
      cliente: { nome: 'Cliente' },
      marcas: [],
      getSubcategoria: getSub,
      getCategoria: getCat,
      getTecnicoByNome: () => ({ nome: 'João' }),
      checklistItems: [{ id: 'c1', texto: 'Teste' }],
    })
    assert.equal(args.subcategoriaNome, 'Elevador')
    assert.ok(Array.isArray(args.proximasManutencoes))
    assert.ok(args.categoriaNome)
    assert.equal(args.checklistItems.length, 1)
  })
})
