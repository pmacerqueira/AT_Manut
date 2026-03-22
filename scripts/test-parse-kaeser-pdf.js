/**
 * Extrai texto de um PDF KAESER e corre parseKaeserPlanoPdf (mesma lógica da app).
 * Uso: node scripts/test-parse-kaeser-pdf.js [caminho.pdf]
 */
import { readFileSync, existsSync } from 'fs'
import { PDFParse } from 'pdf-parse'
import { parseKaeserPlanoPdf } from '../src/utils/parseKaeserPlanoPdf.js'

async function main() {
  const pdfPath = process.argv[2]
  if (!pdfPath || !existsSync(pdfPath)) {
    console.error('Uso: node scripts/test-parse-kaeser-pdf.js <ficheiro.pdf>')
    process.exit(1)
  }
  const data = new Uint8Array(readFileSync(pdfPath))
  const parser = new PDFParse({ data })
  const { text } = await parser.getText()
  await parser.destroy?.()

  const parsed = parseKaeserPlanoPdf(text || '')
  for (const t of ['A', 'B', 'C', 'D']) {
    console.log(`Tipo ${t}: ${parsed[t].length} linhas`)
    parsed[t].forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.posicao}] ${p.codigoArtigo} | ${p.descricao.slice(0, 55)}… | ${p.quantidade} ${p.unidade}`)
    })
  }
  const total = ['A', 'B', 'C', 'D'].reduce((n, t) => n + parsed[t].length, 0)
  console.log('\nTotal peças:', total)
  if (total === 0) {
    console.log('\n--- Início do texto (debug) ---\n')
    console.log((text || '').slice(0, 2500))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
