/**
 * Texto extraído (pdf-parse / Node) do plano KAESER A/B/C/D — SX6, 1 página.
 * Garante regressão sem depender do PDF binário no repositório.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseKaeserPlanoPdf } from '../../src/utils/parseKaeserPlanoPdf.js'

const TEXTO_PLANO_SX6 = `Material : 100858.11 \tSX 6 11bar SC2 400/3/50 EU
Serial : 1395
Equipment: 6904321
A
0512 490100.00010 SET filtro compressor SX sem F 1 \tPÇ
1600 9.0920.10020 SIGMA FLUID MOL 3 l \t1 \tPÇ
B
0510 490100.0 \tSET filtro compressor SX \t1 \tPÇ
1600 9.0920.10020 SIGMA FLUID MOL 3 l \t1 \tPÇ
1802 6.4307.0 \tCorreia alternador c/ nervuras 1 \tPÇ
C
0510 490100.0 \tSET filtro compressor SX \t1 \tPÇ
1600 9.0920.10020 SIGMA FLUID MOL 3 l \t1 \tPÇ
1802 6.4307.0 \tCorreia alternador c/ nervuras 1 \tPÇ
2022 402140.0 \tKIT manutenção válv. retenção \t1 \tPÇ
2042 400771.0 \tKIT manutenção válvula admissã 1 \tTER
2062 400994.00010 KIT manutenção válvula comb/te 1 \tTER
2102 400706.00010 KIT manuten. válv. comando e v 1 \tTER
2130 8.1659.0 \tVálvula de retenção R1/8 PN16 \t1 \tPÇ
4451 404747.0 \tKIT manutenção rolamentos 6208 1 \tPÇ
D
0510 490100.0 \tSET filtro compressor SX \t1 \tPÇ
1600 9.0920.10020 SIGMA FLUID MOL 3 l \t1 \tPÇ
1802 6.4307.0 \tCorreia alternador c/ nervuras 1 \tPÇ
2024 402141.0 \tKIT revisão válv. retenção PM \t1 \tPÇ
2044 200751.0 \tKIT revisão válvula admissão \t1 \tPÇ
2064 402198.10010 KIT revisão válvula combin/ter 1 \tPÇ
2104 400707.00010 KIT revisão válv. comando e ve 1 \tTER
2130 8.1659.0 \tVálvula de retenção R1/8 PN16 \t1 \tPÇ
4451 404747.0 \tKIT manutenção rolamentos 6208 1 \tPÇ
7180 8.1710.1 \tMangueira DN10x233 PN16 \t1 \tPÇ
7190 8.2595.1 \tMangueira DN6x320 PN16 \t1 \tPÇ
7350 403669.0 \tKIT tubagem comando DN4 \t1 \tPÇ
7563 8.1928.1 \tMangueira DN9x1500 \t1 \tPÇ
27.02.2023

-- 1 of 1 --
`

describe('parseKaeserPlanoPdf', () => {
  it('parseia plano SX6 (MONTALVERNE): contagens A/B/C/D e totais', () => {
    const r = parseKaeserPlanoPdf(TEXTO_PLANO_SX6)
    assert.equal(r.A.length, 2)
    assert.equal(r.B.length, 3)
    assert.equal(r.C.length, 9)
    assert.equal(r.D.length, 13)
    assert.equal(r.A.length + r.B.length + r.C.length + r.D.length, 27)
  })

  it('primeira linha tipo A: posição, código Kaeser com vários segmentos, unidade PÇ', () => {
    const r = parseKaeserPlanoPdf(TEXTO_PLANO_SX6)
    const first = r.A[0]
    assert.equal(first.posicao, '0512')
    assert.equal(first.codigoArtigo, '490100.00010')
    assert.ok(first.descricao.includes('SET filtro compressor'))
    assert.equal(first.quantidade, 1)
    assert.equal(first.unidade, 'PÇ')
  })

  it('aceita unidade TER (tipo C)', () => {
    const r = parseKaeserPlanoPdf(TEXTO_PLANO_SX6)
    const ter = r.C.find((p) => p.unidade === 'TER')
    assert.ok(ter)
    assert.equal(ter.codigoArtigo, '400771.0')
  })
})
