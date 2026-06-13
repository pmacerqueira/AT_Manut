import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNovaCategoria,
  canRemoveCategoria,
  canRemoveSubcategoria,
  checklistIdsForSubcategoria,
  mergeCategoriaUpdate,
} from '../../src/domain/categoriasDomain.js'

describe('buildNovaCategoria', () => {
  it('assigns cat id', () => {
    const c = buildNovaCategoria({ nome: 'Elevadores' }, 42)
    assert.equal(c.id, 'cat42')
    assert.equal(c.nome, 'Elevadores')
  })
})

describe('canRemoveSubcategoria / canRemoveCategoria', () => {
  it('blocks when dependents exist', () => {
    assert.equal(canRemoveSubcategoria([{ subcategoriaId: 's1' }], 's1'), false)
    assert.equal(canRemoveCategoria([{ categoriaId: 'c1' }], 'c1'), false)
    assert.equal(canRemoveSubcategoria([], 's1'), true)
  })
})

describe('checklistIdsForSubcategoria', () => {
  it('returns checklist ids', () => {
    const ids = checklistIdsForSubcategoria([
      { id: 'ch1', subcategoriaId: 's1' },
      { id: 'ch2', subcategoriaId: 's2' },
    ], 's1')
    assert.deepEqual(ids, ['ch1'])
  })
})

describe('mergeCategoriaUpdate', () => {
  it('updates by id', () => {
    const out = mergeCategoriaUpdate([{ id: 'c1', nome: 'A' }], 'c1', { nome: 'B' })
    assert.equal(out[0].nome, 'B')
  })
})
