import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  findMarcaByNomeIgnoreCase,
  buildNovaMarca,
  isLegacyLocalMarcaId,
  shouldRetryMarcaCreateWithId,
  sortMarcasByNome,
  mergeMarcaInList,
  resolvePersistedMarcaId,
} from '../../src/domain/marcasDomain.js'

describe('findMarcaByNomeIgnoreCase', () => {
  it('matches case-insensitive', () => {
    const list = [{ id: 1, nome: 'Kaeser' }]
    assert.equal(findMarcaByNomeIgnoreCase(list, 'kaeser')?.id, 1)
  })
})

describe('buildNovaMarca', () => {
  it('trims fields and uses temp id', () => {
    const m = buildNovaMarca({ nome: '  X  ', logoUrl: ' a ' }, 'tmp1')
    assert.equal(m.id, 'tmp1')
    assert.equal(m.nome, 'X')
    assert.equal(m.logoUrl, 'a')
    assert.equal(m.ativo, true)
  })
})

describe('isLegacyLocalMarcaId', () => {
  it('detects mk prefix and tmp_mk', () => {
    assert.equal(isLegacyLocalMarcaId('mk12'), true)
    assert.equal(isLegacyLocalMarcaId('tmp_mk_1'), true)
    assert.equal(isLegacyLocalMarcaId(''), true)
    assert.equal(isLegacyLocalMarcaId(42), false)
  })
})

describe('shouldRetryMarcaCreateWithId', () => {
  it('matches legacy mysql errors', () => {
    assert.equal(
      shouldRetryMarcaCreateWithId(new Error("Field 'id' doesn't have a default value")),
      true,
    )
    assert.equal(shouldRetryMarcaCreateWithId(new Error('other')), false)
  })
})

describe('sortMarcasByNome / mergeMarcaInList', () => {
  it('sorts and merges', () => {
    const sorted = sortMarcasByNome([{ nome: 'Z' }, { nome: 'A' }])
    assert.equal(sorted[0].nome, 'A')
    const merged = mergeMarcaInList([{ id: 1, nome: 'A' }], 1, { corHex: '#fff' })
    assert.equal(merged[0].corHex, '#fff')
  })
})

describe('resolvePersistedMarcaId', () => {
  it('reads id or ID from api response', () => {
    assert.equal(resolvePersistedMarcaId({ id: 5 }, 'x'), 5)
    assert.equal(resolvePersistedMarcaId({ ID: 6 }, 'x'), 6)
    assert.equal(resolvePersistedMarcaId(null, 'fallback'), 'fallback')
  })
})
