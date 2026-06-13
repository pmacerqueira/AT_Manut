import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNovoTecnico,
  sortTecnicosByNome,
  mergeTecnicoUpdate,
  removeTecnicoFromList,
  findTecnicoByNome,
} from '../../src/domain/tecnicosDomain.js'
import { resolveApiForResource, API_RESOURCE_MAP } from '../../src/domain/crudPersistDomain.js'

describe('buildNovoTecnico', () => {
  it('trims nome and sets defaults', () => {
    const t = buildNovoTecnico({ nome: '  Ana  ', telefone: '  123  ' }, 1000)
    assert.equal(t.id, 'tec-1000')
    assert.equal(t.nome, 'Ana')
    assert.equal(t.telefone, '123')
    assert.equal(t.ativo, true)
  })
})

describe('findTecnicoByNome', () => {
  it('ignores inactive technicians', () => {
    const list = [{ nome: 'X', ativo: false }]
    assert.equal(findTecnicoByNome(list, 'X'), undefined)
  })
})

describe('sortTecnicosByNome', () => {
  it('sorts pt locale', () => {
    const sorted = sortTecnicosByNome([{ nome: 'Zé' }, { nome: 'Ana' }])
    assert.equal(sorted[0].nome, 'Ana')
  })
})

describe('mergeTecnicoUpdate / removeTecnicoFromList', () => {
  it('updates and removes by id', () => {
    const base = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }]
    assert.equal(mergeTecnicoUpdate(base, 'a', { nome: 'AA' })[0].nome, 'AA')
    assert.equal(removeTecnicoFromList(base, 'b').length, 1)
  })
})

describe('resolveApiForResource', () => {
  it('maps known resources', () => {
    const fake = { apiTecnicos: { create: () => {} } }
    assert.equal(resolveApiForResource(fake, 'tecnicos'), fake.apiTecnicos)
    assert.equal(API_RESOURCE_MAP.tecnicos, 'apiTecnicos')
  })

  it('throws for unknown resource', () => {
    assert.throws(() => resolveApiForResource({}, 'unknown'))
  })
})
