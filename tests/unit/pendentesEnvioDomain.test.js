import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { descreverPendentesPorEnviar } from '../../src/domain/pendentesEnvioDomain.js'

const ctx = {
  maquinas: [{ id: 'm1', marca: 'KAESER', modelo: 'ASD 50', clienteNif: '500' }],
  clientes: [{ nif: '500', nome: 'AUTO ELGE' }],
  manutencoes: [{ id: 'mt1', maquinaId: 'm1' }],
  reparacoes: [],
}

describe('descreverPendentesPorEnviar', () => {
  it('agrupa relatório, manutenção e ficha do mesmo equipamento numa linha', () => {
    const linhas = descreverPendentesPorEnviar([
      { queueId: '1', resource: 'relatorios', action: 'create', manutencaoId: 'mt1' },
      { queueId: '2', resource: 'manutencoes', action: 'update', id: 'mt1' },
      { queueId: '3', resource: 'maquinas', action: 'update', id: 'm1' },
    ], ctx)
    assert.equal(linhas.length, 1)
    assert.equal(linhas[0].titulo, 'KAESER ASD 50')
    assert.match(linhas[0].detalhe, /AUTO ELGE/)
    assert.match(linhas[0].detalhe, /relatório/)
    assert.match(linhas[0].detalhe, /manutenção/)
    assert.equal(linhas[0].n, 3)
  })

  it('item sem equipamento resolvido fica com o nome do recurso', () => {
    const linhas = descreverPendentesPorEnviar([
      { queueId: '1', resource: 'clientes', action: 'update', id: '999' },
    ], ctx)
    assert.equal(linhas.length, 1)
    assert.equal(linhas[0].titulo, 'Cliente')
  })

  it('lista vazia devolve lista vazia', () => {
    assert.deepEqual(descreverPendentesPorEnviar([], ctx), [])
    assert.deepEqual(descreverPendentesPorEnviar(null, ctx), [])
  })
})
