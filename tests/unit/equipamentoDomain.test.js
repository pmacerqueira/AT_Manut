import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  INTERVALOS,
  getIntervaloDiasForCategoria,
  getIntervaloDiasBySubcategoria,
  getIntervaloDiasByMaquina,
  DEFAULT_INTERVALO_DIAS,
} from '../../src/domain/equipamentoDomain.js'

const categorias = [{ id: 'c1', intervaloTipo: 'semestral' }]
const subcategorias = [{ id: 's1', categoriaId: 'c1' }]

describe('getIntervaloDiasForCategoria', () => {
  it('resolves interval from category', () => {
    assert.equal(getIntervaloDiasForCategoria('c1', categorias, INTERVALOS), 180)
  })

  it('falls back when category missing', () => {
    assert.equal(getIntervaloDiasForCategoria('x', categorias, INTERVALOS), DEFAULT_INTERVALO_DIAS)
  })
})

describe('getIntervaloDiasBySubcategoria', () => {
  it('resolves via subcategoria → categoria', () => {
    assert.equal(getIntervaloDiasBySubcategoria('s1', subcategorias, categorias, INTERVALOS), 180)
  })
})

describe('getIntervaloDiasByMaquina', () => {
  it('prefers machine periodicidadeManut override', () => {
    const maq = { subcategoriaId: 's1', periodicidadeManut: 'trimestral' }
    assert.equal(getIntervaloDiasByMaquina(maq, subcategorias, categorias, INTERVALOS), 90)
  })

  it('falls back to subcategoria when no override', () => {
    const maq = { subcategoriaId: 's1' }
    assert.equal(getIntervaloDiasByMaquina(maq, subcategorias, categorias, INTERVALOS), 180)
  })
})
