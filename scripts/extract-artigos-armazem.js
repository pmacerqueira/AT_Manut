/**
 * extract-artigos-armazem.js — Extrai artigos de um armazém do FTARTIGO.dat (Filosoft Gestor.32)
 *
 * Uso:
 *   node scripts/extract-artigos-armazem.js [armazem] [caminho-FTARTIGO.dat]
 *
 * Exemplo: node scripts/extract-artigos-armazem.js 002
 *
 * Default: armazem 002, ficheiro em C:\Filosoft.32\empnav\Ano2026\FTARTIGO.dat
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIELD_SEP = Buffer.from([0x01])

function extractArtigos(buf, armazem) {
  const enc = 'latin1'
  const txt = buf.toString(enc)
  const artigos = []
  const seen = new Set()

  // Procurar padrão: codigoArtigo + armazem (ex: 000431002)
  const suffix = armazem
  let pos = 0
  while ((pos = txt.indexOf(suffix, pos)) >= 0) {
    // Código do artigo = dígitos antes do armazém
    let start = pos
    while (start > 0 && /\d/.test(txt[start - 1])) start--
    const codigo = txt.substring(start, pos)
    const key = codigo + suffix
    if (seen.has(key)) {
      pos++
      continue
    }

    // Extrair campos após o armazém (separados por 0x01)
    const afterStart = pos + suffix.length
    let sepIdx = txt.indexOf('\x01', afterStart)
    const after = txt.substring(afterStart, afterStart + 800)
    const parts = after.split('\x01').map((p) => p.replace(/\0/g, '').trim())

    let quantidade = ''
    let descricao = ''
    let familia = ''
    let unidade = ''

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (!p) continue
      // Unidade: Un, Un., UN, M., etc.
      if (/^Un\.?$/i.test(p) || p === 'UN' || /^[A-Za-z]{1,4}\.$/.test(p)) {
        unidade = p
      } else if (i < 3 && /^\d+$/.test(p) && p.length <= 4) {
        if (!quantidade && parseInt(p, 10) > 0) quantidade = p
      } else if (p.length > 4 && !/^\d+$/.test(p) && !descricao) {
        descricao = p
      } else if (p.length <= 8 && p.length >= 2 && !familia && descricao && !/^\d+$/.test(p) && p !== unidade) {
        familia = p
      }
    }

    if (codigo && codigo.length >= 3) {
      seen.add(key)
      artigos.push({
        codigo,
        armazem,
        descricao: descricao || '',
        quantidade: quantidade || '0',
        familia: familia || '',
        unidade: unidade || '',
      })
    }
    pos++
  }

  return artigos
}

function main() {
  const armazem = process.argv[2] || '002'
  let datPath = process.argv[3]

  if (!datPath) {
    const base = 'C:\\Filosoft.32\\empnav'
    if (existsSync(base)) {
      const anos = readdirSync(base)
        .filter((d) => d.toLowerCase().startsWith('ano'))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      for (const ano of anos) {
        const candidate = join(base, ano, 'FTARTIGO.dat')
        if (existsSync(candidate)) {
          datPath = candidate
          console.log(`[extract-artigos-armazem] Armazém ${armazem}, ficheiro: ${datPath}`)
          break
        }
      }
    }
  }

  if (!datPath || !existsSync(datPath)) {
    console.error('Uso: node scripts/extract-artigos-armazem.js [armazem] [caminho-FTARTIGO.dat]')
    console.error('Exemplo: node scripts/extract-artigos-armazem.js 002')
    process.exit(1)
  }

  const buf = readFileSync(datPath)
  const artigos = extractArtigos(buf, armazem)

  if (artigos.length === 0) {
    console.error(`Nenhum artigo encontrado no armazém ${armazem}.`)
    process.exit(1)
  }

  const outDir = join(__dirname, '..')
  const csvPath = join(outDir, `artigos-armazem-${armazem}.csv`)
  const jsonPath = join(outDir, `artigos-armazem-${armazem}.json`)

  const header = 'Código;Armazém;Descrição;Quantidade;Família;Unidade'
  const csvRows = [
    header,
    ...artigos.map((a) =>
      [
        a.codigo,
        a.armazem,
        `"${(a.descricao || '').replace(/"/g, '""')}"`,
        a.quantidade,
        a.familia,
        a.unidade,
      ].join(';')
    ),
  ]
  writeFileSync(csvPath, '\uFEFF' + csvRows.join('\r\n'), 'utf8')
  console.log(`[OK] CSV: ${csvPath} (${artigos.length} artigos)`)

  writeFileSync(jsonPath, JSON.stringify(artigos, null, 2), 'utf8')
  console.log(`[OK] JSON: ${jsonPath} (${artigos.length} artigos)`)

  console.log(`\nTotal: ${artigos.length} artigos no armazém ${armazem}.`)
}

main()
