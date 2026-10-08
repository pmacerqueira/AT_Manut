/**
 * Conferência de 8 de outubro de 2026.
 * A nota lista o regime de colocação no mercado. Não avalia o equipamento
 * da visita e não substitui a declaração CE do fabricante.
 */

const FRASES_CITACAO = [
  [/Marcação CE e conformidade do equipamento\s*\(Dir\.\s*2006\/42\/CE\)/gi, 'Marcação CE presente no equipamento'],
  [/Marcação CE, manual em português e declaração CE\s*\(Dir\.\s*2006\/42\/CE\)/gi, 'Marcação CE, manual em português e declaração CE'],
  [/Manual de instruções em português disponível e legível\s*\(DL\s*103\/2008\)/gi, 'Manual de instruções em português disponível e legível'],
  [/Registo de intervenções e manutenção periódica atualizado\s*\(DL\s*50\/2005\)/gi, 'Registo de intervenções e manutenção periódica atualizado'],
  [/\s*\(EN\s*1493:2020\)/gi, ''],
  [/\s*\(EN\s*1493:2022\)/gi, ''],
  [/\s*\(EN\s*16625:2013\)/gi, ''],
  [/\s*[—–-]\s*EN\s*1493:2020/gi, ''],
]

/** Tira da pergunta da checklist a citação de norma que não descreve a observação. */
export function limparCitacaoNormaChecklist(texto) {
  let t = String(texto ?? '')
  for (const [re, sub] of FRASES_CITACAO) t = t.replace(re, sub)
  return t.replace(/\s{2,}/g, ' ').trim()
}

export function aplicaNotaLegalColocacao({ categoriaNome, isReparacao = false } = {}) {
  if (isReparacao) return false
  return String(categoriaNome ?? '').toLowerCase().includes('levador')
}

export const NOTA_LEGAL_COLOCACAO_TITULO = 'Nota legal — colocação no mercado'

export const NOTA_LEGAL_COLOCACAO_INTRO =
  'Regime de colocação de elevadores de veículos no mercado da União Europeia, conferido em 8 de outubro de 2026. Esta nota não resulta da manutenção preventiva e não avalia a conformidade deste equipamento.'

export const NOTA_LEGAL_COLOCACAO_LINHAS = [
  {
    referencia: 'Diretiva 2006/42/CE, de 17 de maio de 2006',
    vigencia: 'Colocação no mercado e entrada em serviço de máquinas, incluindo elevadores de veículos. Aplica-se a essa colocação até 19 de janeiro de 2027.',
  },
  {
    referencia: 'Decreto-Lei n.º 103/2008, de 24 de junho',
    vigencia: 'Transposição portuguesa da Diretiva 2006/42/CE. Acompanha o período em que a diretiva regula a colocação no mercado.',
  },
  {
    referencia: 'EN 1493:2010 — Elevadores de veículos',
    vigencia: 'Norma harmonizada citada no Jornal Oficial em 8 de abril de 2011, para presunção de conformidade com a Diretiva 2006/42/CE. O CEN substituiu esta edição pela EN 1493:2022 em novembro de 2022. A presunção segue a edição citada no Jornal Oficial.',
  },
  {
    referencia: 'EN 1493:2022 — Elevadores de veículos',
    vigencia: 'Norma europeia vigente de conceção, fabrico e ensaio. Publicação: novembro de 2022. Aplica-se a elevadores fabricados seis meses depois. Em 8 de outubro de 2026 não constava da lista de normas harmonizadas do Jornal Oficial; sem essa citação não dá, por si, presunção de conformidade.',
  },
  {
    referencia: 'Regulamento (UE) 2023/1230, de 14 de junho de 2023',
    vigencia: 'Substitui a Diretiva 2006/42/CE. Os elevadores de veículos ficam no anexo I, parte A. Aplicação geral: 20 de janeiro de 2027. Não recertifica equipamentos já colocados no mercado. Manutenção que não altere os requisitos essenciais não é modificação substancial.',
  },
]

/** Fontes da conferência, impressas logo abaixo do quadro. Não entram na lista do regime. */
export const NOTA_LEGAL_COLOCACAO_FONTES = [
  { rotulo: 'Decreto-Lei n.º 50/2005', url: 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/50-2005-584397' },
  { rotulo: 'Decreto-Lei n.º 103/2008', url: 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/103-2008-456188' },
  { rotulo: 'Regulamento (UE) 2023/1230', url: 'https://eur-lex.europa.eu/eli/reg/2023/1230/oj' },
  { rotulo: 'Catálogo de normas (IPQ)', url: 'https://www.ipq.pt/servicos-ipq/consultar-o-catalogo-de-normas/' },
]
