/**
 * Extração de texto de PDF e montagem de linhas pecas_plano (KAESER A/B/C/D).
 * Partilhado entre PecasPlanoModal e DocumentacaoModal.
 *
 * Worker via Vite `?url` → ficheiro em `assets/` com hash, deployado com o resto do bundle.
 * Versão do worker **obrigatória** = mesma do bundle browser do `pdf-parse` (pdfjs-dist 5.4.296 em package.json);
 * se subir para 5.4.x mais recente sem alinhar o `pdf-parse`, o runtime falha: «API version does not match the Worker version».
 */
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { parseKaeserPlanoPdf } from './parseKaeserPlanoPdf'

export async function pdfTextFromArrayBuffer(arrayBuffer) {
  const { PDFParse } = await import('pdf-parse')
  PDFParse.setWorker(pdfWorkerUrl)
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
