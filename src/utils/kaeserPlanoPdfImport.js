/**
 * Extração de texto de PDF e montagem de linhas pecas_plano (KAESER A/B/C/D).
 * Partilhado entre PecasPlanoModal e DocumentacaoModal.
 */
import { parseKaeserPlanoPdf } from './parseKaeserPlanoPdf'

export async function pdfTextFromArrayBuffer(arrayBuffer) {
  const { PDFParse } = await import('pdf-parse')
  PDFParse.setWorker(`${import.meta.env.BASE_URL}pdf.worker.mjs`)
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })
  const { text } = await parser.getText()
  parser.destroy?.()
  return text || ''
}

export function buildPecasPlanoItemsFromKaeserText(text, maquinaId) {
  const parsed = parseKaeserPlanoPdf(text || '')
  const todas = []
  for (const tipo of ['A', 'B', 'C', 'D']) {
    for (const p of parsed[tipo] || []) {
      todas.push({ ...p, maquinaId, tipoManut: tipo })
    }
  }
  return todas
}

export async function buildPecasPlanoItemsFromPdfArrayBuffer(arrayBuffer, maquinaId) {
  const text = await pdfTextFromArrayBuffer(arrayBuffer)
  return buildPecasPlanoItemsFromKaeserText(text, maquinaId)
}

export function contagemPorTipoKaeser(todas) {
  const porTipo = { A: 0, B: 0, C: 0, D: 0 }
  todas.forEach(p => {
    const t = p.tipoManut
    if (porTipo[t] !== undefined) porTipo[t] += 1
  })
  return porTipo
}
