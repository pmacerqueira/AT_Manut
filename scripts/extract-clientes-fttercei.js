/**
 * extract-clientes-fttercei.js — Extrai clientes do ficheiro FTTERCEI.dat (Filosoft Gestor.32)
 *
 * O formato é binário proprietário; este script usa heurísticas para extrair registos
 * com base em padrões de texto (NIF, nomes, moradas).
 *
 * Uso:
 *   node scripts/extract-clientes-fttercei.js [caminho-fttercei.dat]
 *
 * Default: C:\Filosoft.32\empnav\Ano2026\FTTERCEI.dat (ano mais recente)
 *
 * Gera: clientes-fttercei.csv e clientes-fttercei.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// NIF português: 9 dígitos, começa em 1, 2, 5, 6, 8, 9
const NIF_REGEX = /\b([125689]\d{8})\b/g

// Campos separados por 0x01 (SOH) no ficheiro
const FIELD_SEP = Buffer.from([0x01])

function extractRecords(buf) {
  const enc = 'latin1' // Windows-1252
  const txt = buf.toString(enc)
  const clientes = []
  const seen = new Set()

  let m
  while ((m = NIF_REGEX.exec(txt)) !== null) {
    const nif = m[1]
    if (seen.has(nif)) continue

    const pos = m.index
    const before = txt.substring(Math.max(0, pos - 300), pos)
    const after = txt.substring(pos, pos + 800)

    // Nome: último bloco de texto imprimível antes do NIF (mín. 3 chars)
    const nameCandidates = before.match(/[\x20-\x7E\xC0-\xFF]{3,}/g)
    const nome = nameCandidates ? nameCandidates[nameCandidates.length - 1].trim() : ''

    // Filtrar nomes que parecem códigos (só números) ou muito curtos
    if (!nome || /^\d+$/.test(nome) || nome.length < 4) continue

    // Campos após NIF: split por 0x01
    const afterBuf = Buffer.from(after, enc)
    const parts = splitByNull(afterBuf)
    const fields = parts.filter((p) => p.trim().length > 0)

    // Estrutura típica: NIF, Tipo(A/F), Morada, Localidade, Postal, País, Telefone, Fax, Email
    let morada = ''
    let localidade = ''
    let codigoPostal = ''
    let telefone = ''
    let email = ''

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i].trim()
      if (!f) continue
      // Tipo A = Cliente, F = Fornecedor — só queremos clientes
      if (i === 1 && f === 'F') {
        break // saltar fornecedores
      }
      if (i === 2 && f.length > 5 && !/^\d+$/.test(f)) morada = f
      else if (i === 3 && f.length > 2 && !/^\d{4}-\d{3}$/.test(f)) localidade = f
      else if (i === 4 && /^\d{4}-\d{3}$/.test(f)) codigoPostal = f
      else if (f.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.replace(/\0/g, ''))) email = f
      else if (f.match(/^[\d\s\/\-\.]+$/) && f.length >= 8 && !telefone) telefone = f
    }

    // Heurística: se morada vazia mas há localidade, pode estar trocado
    if (!morada && localidade && fields[2]) {
      const f2 = fields[2].trim()
      if (f2.length > 3) morada = f2
    }

    // Só incluir se tiver nome e NIF válido
    if (nome && nif) {
      const rec = {
        nif,
        nome: clean(nome),
        morada: clean(morada),
        localidade: clean(localidade),
        codigoPostal: clean(codigoPostal),
        telefone: clean(telefone),
        email: clean(email),
      }
      if (isValidRecord(rec)) {
        seen.add(nif)
        clientes.push(rec)
      }
    }
  }

  return clientes
}

function splitByNull(buf) {
  const parts = []
  let start = 0
  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf[i] === 0x01) {
      parts.push(buf.slice(start, i).toString('latin1'))
      start = i + 1
    }
  }
  return parts
}

function clean(s) {
  if (!s || s === 'Desconhecido') return ''
  return s.replace(/\0/g, '').trim()
}

// Filtrar falsos positivos: NIF que é telefone (296...), nome que é código postal
function isValidRecord(c) {
  if (/^296\d{6}$/.test(c.nif)) return false // telefone Açores
  if (/^\d{4}-\d{3}$/.test(c.nome)) return false // código postal como nome
  if (/^\d+$/.test(c.nome) && c.nome.length > 4) return false // só números
  if (c.nome.length < 4) return false
  return true
}

function main() {
  let datPath = process.argv[2]
  if (!datPath) {
    const base = 'C:\\Filosoft.32\\empnav'
    if (existsSync(base)) {
      const anos = readdirSync(base)
        .filter((d) => d.toLowerCase().startsWith('ano'))
        .sort()
        .reverse()
      for (const ano of anos) {
        const candidate = join(base, ano, 'FTTERCEI.dat')
        if (existsSync(candidate)) {
          datPath = candidate
          console.log(`[extract-clientes-fttercei] A usar: ${datPath}`)
          break
        }
      }
    }
  }

  if (!datPath || !existsSync(datPath)) {
    console.error('Uso: node scripts/extract-clientes-fttercei.js [caminho-FTTERCEI.dat]')
    console.error('Exemplo: node scripts/extract-clientes-fttercei.js "C:\\Filosoft.32\\empnav\\Ano2026\\FTTERCEI.dat"')
    process.exit(1)
  }

  const buf = readFileSync(datPath)
  const clientes = extractRecords(buf)

  if (clientes.length === 0) {
    console.error('Nenhum cliente extraído. O formato do ficheiro pode ter mudado.')
    process.exit(1)
  }

  const outDir = join(__dirname, '..')
  const csvPath = join(outDir, 'clientes-fttercei.csv')
  const jsonPath = join(outDir, 'clientes-fttercei.json')

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
  writeFileSync(csvPath, '\uFEFF' + csvRows.join('\r\n'), 'utf8')
  console.log(`[OK] CSV: ${csvPath} (${clientes.length} clientes)`)

  const jsonClientes = clientes.map((c) => ({
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
  console.log(`[OK] JSON: ${jsonPath} (${clientes.length} clientes)`)

  console.log(`\nTotal: ${clientes.length} clientes extraídos do FTTERCEI.`)
}

main()
