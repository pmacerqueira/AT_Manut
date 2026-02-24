/**
 * extract-kaeser-plano-pdf.js — Extrai texto e tabelas de PDF de plano KAESER para análise.
 *
 * Uso:
 *   node scripts/extract-kaeser-plano-pdf.js [caminho.pdf]
 *
 * Default: c:\Planos exemplo kaeser\PARQUE_MAQUINAS_SM12_2601.pdf
 *
 * Objectivo: analisar estrutura do PDF para definir parser de importação.
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { PDFParse } from 'pdf-parse'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEFAULT_PDF = 'c:\\Planos exemplo kaeser\\PARQUE_MAQUINAS_SM12_2601.pdf'

async function main() {
  const pdfPath = process.argv[2] || DEFAULT_PDF
  if (!existsSync(pdfPath)) {
    console.error('Ficheiro não encontrado:', pdfPath)
    process.exit(1)
  }

  console.log('A extrair de:', pdfPath)
  console.log('')

  const buffer = readFileSync(pdfPath)
  const data = new Uint8Array(buffer)
  const parser = new PDFParse({ data })

  // Texto
  const textResult = await parser.getText()
  console.log('=== TEXTO (todas as páginas) ===')
  console.log(textResult.text?.slice(0, 3000) || '(vazio)')
  if (textResult.text?.length > 3000) {
    console.log('\n... (truncado, total', textResult.text.length, 'chars)')
  }

  // Tabelas (se detectadas)
  try {
    const tableResult = await parser.getTable()
    if (tableResult?.tables?.length > 0) {
      console.log('\n\n=== TABELAS DETECTADAS ===')
      tableResult.tables.forEach((t, i) => {
        console.log(`\nTabela ${i + 1}:`, JSON.stringify(t, null, 2).slice(0, 500))
      })
    }
  } catch (e) {
    console.log('\n(getTable não disponível ou sem tabelas:', e.message, ')')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
