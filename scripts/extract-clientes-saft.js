/**
 * extract-clientes-saft.js — Extrai lista de clientes de ficheiro SAF-T PT (Filosoft Gestor.32)
 *
 * Uso:
 *   node scripts/extract-clientes-saft.js [caminho-saft.xml]
 *
 * Se não for passado caminho, usa o default: C:\Filosoft.32\SAFT*.xml (primeiro encontrado)
 *
 * Gera:
 *   - clientes-filosoft.csv (para Excel/importação)
 *   - clientes-filosoft.json (formato AT_Manut para possível importação)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Extrair valor de tag XML (suporta entidades HTML) ────────────────────────
function getTag(block, tagName) {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i')
  const m = block.match(re)
  if (!m) return ''
  return decodeEntities(m[1].trim())
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// ── Extrair clientes do XML ───────────────────────────────────────────────────
function extractClientes(xml) {
  const customerRegex = /<Customer>([\s\S]*?)<\/Customer>/gi
  const clientes = []
  let m
  while ((m = customerRegex.exec(xml)) !== null) {
    const block = m[1]
    const nif = getTag(block, 'CustomerTaxID')
    const nome = getTag(block, 'CompanyName')
    const billing = block.match(/<BillingAddress>([\s\S]*?)<\/BillingAddress>/i)
    let morada = ''
    let localidade = ''
    let codigoPostal = ''
    if (billing) {
      morada = getTag(billing[1], 'AddressDetail')
      localidade = getTag(billing[1], 'City')
      codigoPostal = getTag(billing[1], 'PostalCode')
    }
    const telefone = getTag(block, 'Telephone')
    const email = getTag(block, 'Email')
    // Filtrar "Desconhecido" em campos opcionais
    const clean = (v) => (v === 'Desconhecido' || !v ? '' : v)
    clientes.push({
      nif: nif || '',
      nome: clean(nome),
      morada: clean(morada),
      localidade: clean(localidade),
      codigoPostal: clean(codigoPostal),
      telefone: clean(telefone),
      email: clean(email),
    })
  }
  return clientes
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  let saftPath = process.argv[2]
  if (!saftPath) {
    // Default: procurar SAFT na pasta Filosoft.32
    const defaultDir = 'C:\\Filosoft.32'
    if (existsSync(defaultDir)) {
      const files = readdirSync(defaultDir).filter((f) => f.startsWith('SAFT') && f.endsWith('.xml'))
      if (files.length > 0) {
        saftPath = join(defaultDir, files[0])
        console.log(`[extract-clientes-saft] A usar: ${saftPath}`)
      }
    }
    if (!saftPath) {
      console.error('Uso: node scripts/extract-clientes-saft.js <caminho-saft.xml>')
      console.error('Exemplo: node scripts/extract-clientes-saft.js "C:\\Filosoft.32\\SAFT512012962-e-fatura-01-12-2021-31-12-2021.xml"')
      process.exit(1)
    }
  }

  if (!existsSync(saftPath)) {
    console.error(`Ficheiro não encontrado: ${saftPath}`)
    process.exit(1)
  }

  const xml = readFileSync(saftPath, 'latin1') // SAF-T PT usa windows-1252
  const clientes = extractClientes(xml)

  if (clientes.length === 0) {
    console.error('Nenhum cliente encontrado no ficheiro SAF-T.')
    process.exit(1)
  }

  const outDir = join(__dirname, '..')
  const csvPath = join(outDir, 'clientes-filosoft.csv')
  const jsonPath = join(outDir, 'clientes-filosoft.json')

  // Filtrar: só registos que cumprem requisitos de importação AT_Manut
  // (NIF, Nome, Morada, Telefone ou telemóvel, Email — todos preenchidos)
  const cumpreImport = (c) =>
    (c.nif || '').trim() &&
    (c.nome || '').trim() &&
    (c.morada || '').trim() &&
    ((c.telefone || '').trim() || (c.telemovel || '').trim()) &&
    (c.email || '').trim()
  const clientesImportaveis = clientes.filter(cumpreImport)
  if (clientesImportaveis.length < clientes.length) {
    console.log(`[INFO] ${clientes.length - clientesImportaveis.length} registos sem NIF/Nome/Morada/Telefone/Email — excluídos do JSON`)
  }

  // CSV (separador ; para Excel PT) — todos para análise
  const header = 'NIF;Nome;Morada;Localidade;Código Postal;Telefone;Email'
  const csvRows = [
    header,
    ...clientes.map((c) =>
      [
        c.nif,
        `"${(c.nome || '').replace(/"/g, '""')}"`,
        `"${(c.morada || '').replace(/"/g, '""')}"`,
        `"${(c.localidade || '').replace(/"/g, '""')}"`,
        c.codigoPostal,
        c.telefone,
        c.email,
      ].join(';')
    ),
  ]
  writeFileSync(csvPath, '\uFEFF' + csvRows.join('\r\n'), 'utf8') // BOM para Excel
  console.log(`[OK] CSV: ${csvPath} (${clientes.length} clientes)`)

  // JSON (formato AT_Manut) — só os que cumprem requisitos de importação
  const jsonClientes = clientesImportaveis.map((c) => ({
    id: c.nif,
    nif: c.nif,
    nome: c.nome,
    morada: c.morada,
    localidade: c.localidade,
    codigoPostal: c.codigoPostal,
    telefone: c.telefone,
    email: c.email,
  }))
  writeFileSync(jsonPath, JSON.stringify(jsonClientes, null, 2), 'utf8')
  console.log(`[OK] JSON: ${jsonPath} (${jsonClientes.length} clientes importáveis)`)

  console.log(`\nTotal: ${clientes.length} clientes extraídos do SAF-T.`)
}

main()
