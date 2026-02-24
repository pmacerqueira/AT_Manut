/**
 * parseKaeserPlanoPdf.js — Parser de texto extraído de PDF de plano KAESER.
 *
 * Estrutura esperada:
 *   A
 *   0512 490103.10010 SET filter compressor w/o OSC    1   PC
 *   1600 9.0920.10030 SIGMA FLUID MOL 5 l              1   PC
 *   B
 *   ...
 *
 * @param {string} text — Texto extraído do PDF
 * @returns {{ A: Array, B: Array, C: Array, D: Array }} Peças por tipo
 */
export function parseKaeserPlanoPdf(text) {
  const TIPOS = ['A', 'B', 'C', 'D']
  const resultado = { A: [], B: [], C: [], D: [] }
  let tipoAtual = null

  const linhas = text.split(/\r?\n/)

  for (const linha of linhas) {
    const trimmed = linha.trim()
    if (!trimmed) continue

    // Secção: linha isolada com apenas A, B, C ou D
    if (TIPOS.includes(trimmed) && linha.length < 5) {
      tipoAtual = trimmed
      continue
    }

    // Linha de peça: começa com 4 dígitos (posição)
    const matchPos = trimmed.match(/^(\d{4})\s+/)
    if (!matchPos || !tipoAtual) continue

    const posicao = matchPos[1]
    const resto = trimmed.slice(4).trim()

    // Extrair quantidade e unidade do fim (padrão: "... 1  PC" ou "... 1  PÇ")
    const unidadeMatch = resto.match(/\s+(\d+(?:[.,]\d+)?)\s+([A-ZÇ]{2,4})\s*$/)
    let quantidade = 1
    let unidade = 'PÇ'
    let meio = resto

    if (unidadeMatch) {
      quantidade = parseFloat(unidadeMatch[1].replace(',', '.')) || 1
      unidade = unidadeMatch[2].replace('Ç', 'Ç') // normalizar PÇ
      if (unidade === 'PC') unidade = 'PÇ'
      meio = resto.slice(0, resto.length - unidadeMatch[0].length).trim()
    }

    // Meio: código artigo (opcional) + descrição
    // Código KAESER: contém ponto (ex: 490103.10010, 9.0920.10030, 9.4945E1)
    const codeMatch = meio.match(/^([\d.]+(?:E\d+)?)\s+(.+)$/s)
    let codigoArtigo = ''
    let descricao = meio

    if (codeMatch && codeMatch[1].includes('.')) {
      const possivelCodigo = codeMatch[1]
      if (/^[\d.]+(?:E\d+)?$/.test(possivelCodigo)) {
        codigoArtigo = possivelCodigo
        descricao = codeMatch[2].trim()
      }
    }

    // Ignorar linhas sem descrição útil (ex: "Use up part - see bill of mate" pode ficar)
    if (!descricao || descricao.length < 2) continue

    resultado[tipoAtual].push({
      posicao,
      codigoArtigo: codigoArtigo || posicao,
      descricao,
      quantidade,
      unidade,
    })
  }

  return resultado
}
