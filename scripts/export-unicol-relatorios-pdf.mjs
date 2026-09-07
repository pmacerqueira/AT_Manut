/**
 * Exporta PDFs individuais de manutenção UNICOL (por equipamento) + ZIP.
 *
 * Pasta: scripts/output/UNICOL_512005451_relatorios/
 * ZIP:   scripts/output/UNICOL_512005451_relatorios.zip
 *
 * Uso: npx vite-node scripts/export-unicol-relatorios-pdf.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'
import { buildRelatorioManutencaoPdfArgs } from '../src/utils/relatorioManutencaoPayload.js'
import { gerarPdfCompacto } from '../src/utils/gerarPdfRelatorio.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'https://navel.pt/api/data.php'
const UNICOL_NIF = '512005451'
const OUT_DIR = path.join(__dirname, 'output', 'UNICOL_512005451_relatorios')
const ZIP_PATH = path.join(__dirname, 'output', 'UNICOL_512005451_relatorios.zip')

async function apiCall(token, resource, action, extra = {}) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r: resource, action, ...extra }),
  })
  const json = await resp.json().catch(() => ({ ok: false, message: `HTTP ${resp.status}` }))
  if (!json.ok) throw new Error(`${resource}/${action}: ${json.message ?? resp.status}`)
  return json.data ?? null
}

async function login() {
  const form = new URLSearchParams()
  form.set('_t', '')
  form.set('r', 'auth')
  form.set('action', 'login')
  form.set('username', 'Admin')
  form.set('password', 'admin123%')
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form.toString(),
  })
  const json = await resp.json()
  if (!json.ok) throw new Error(`Login: ${json.message}`)
  return json.data.token
}

function normNif(v) {
  return v == null ? '' : String(v).replace(/\D/g, '')
}

function normId(v) {
  return v == null ? '' : String(v)
}

function sanitizeFolderName(str) {
  return String(str || 'equipamento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'equipamento'
}

function equipFolderName(maq, index) {
  const marca = (maq.marca || '').trim()
  const modelo = (maq.modelo || '').trim()
  const sn = (maq.numeroSerie || 'sem-serie').trim()
  const base = [marca, modelo, sn].filter(Boolean).join('_')
  return `${String(index).padStart(2, '0')}_${sanitizeFolderName(base)}`
}

function pdfFileName(rel, manut) {
  const num = (rel?.numeroRelatorio || 'relatorio').replace(/[^\w.-]+/g, '_')
  const data = String(manut?.data || '').slice(0, 10)
  return `${num}_${data}.pdf`
}

function getChecklistBySubcategoria(checklistItems, subcategoriaId, tipo = 'periodica') {
  const sid = subcategoriaId == null || subcategoriaId === '' ? '' : String(subcategoriaId)
  return checklistItems
    .filter(c => {
      const cid = c.subcategoriaId ?? c.subcategoria_id
      const ckey = cid == null || cid === '' ? '' : String(cid)
      return ckey === sid && (c.tipo || 'periodica') === tipo
    })
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
}

async function createZip(sourceDir, zipPath) {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    out.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(out)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
  const stat = fs.statSync(zipPath)
  return stat.size
}

async function main() {
  console.log('A obter dados da API…')
  const token = await login()

  const [
    clientes,
    maquinas,
    manutencoes,
    relatorios,
    subcategorias,
    categorias,
    tecnicos,
    marcas,
    checklistItems,
  ] = await Promise.all([
    apiCall(token, 'clientes', 'list'),
    apiCall(token, 'maquinas', 'list'),
    apiCall(token, 'manutencoes', 'list'),
    apiCall(token, 'relatorios', 'list'),
    apiCall(token, 'subcategorias', 'list'),
    apiCall(token, 'categorias', 'list'),
    apiCall(token, 'tecnicos', 'list'),
    apiCall(token, 'marcas', 'list'),
    apiCall(token, 'checklistItems', 'list'),
  ])

  const cliente = clientes.find(c => normNif(c.nif) === UNICOL_NIF || /unicol/i.test(c.nome ?? ''))
  if (!cliente) throw new Error('Cliente UNICOL não encontrado')

  const maqsCliente = maquinas
    .filter(m => normNif(m.clienteNif ?? m.clienteId) === normNif(cliente.nif))
    .sort((a, b) => {
      const la = `${a.marca} ${a.modelo} ${a.numeroSerie}`
      const lb = `${b.marca} ${b.modelo} ${b.numeroSerie}`
      return la.localeCompare(lb, 'pt')
    })

  const maqIds = new Set(maqsCliente.map(m => normId(m.id)))
  const subMap = new Map(subcategorias.map(s => [String(s.id), s]))
  const catMap = new Map(categorias.map(c => [String(c.id), c]))
  const getSubcategoria = (id) => subMap.get(String(id)) ?? null
  const getCategoria = (id) => catMap.get(String(id)) ?? null
  const getTecnicoByNome = (nome) => tecnicos.find(t => t.nome === nome) ?? null

  const relByManutId = new Map()
  for (const r of relatorios) {
    const mid = normId(r.manutencaoId ?? r.manutencao_id)
    if (!mid) continue
    relByManutId.set(mid, r)
  }

  const manutsExport = manutencoes
    .filter(m => maqIds.has(normId(m.maquinaId)) && m.status === 'concluida')
    .filter(m => relByManutId.has(normId(m.id)))
    .sort((a, b) => {
      const ma = maqsCliente.find(x => normId(x.id) === normId(a.maquinaId))
      const mb = maqsCliente.find(x => normId(x.id) === normId(b.maquinaId))
      const ea = `${ma?.marca} ${ma?.modelo} ${ma?.numeroSerie}`
      const eb = `${mb?.marca} ${mb?.modelo} ${mb?.numeroSerie}`
      if (ea !== eb) return ea.localeCompare(eb, 'pt')
      return String(a.data).localeCompare(String(b.data))
    })

  if (manutsExport.length === 0) throw new Error('Nenhuma manutenção concluída com relatório encontrada')

  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const maqFolderIndex = new Map()
  maqsCliente.forEach((m, i) => maqFolderIndex.set(normId(m.id), equipFolderName(m, i + 1)))

  const readme = [
    'Relatórios individuais de manutenção — UNICOL',
    `Cliente: ${cliente.nome}`,
    `NIF: ${cliente.nif}`,
    `Gerado em: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Total: ${manutsExport.length} relatórios em ${maqsCliente.length} equipamentos`,
    '',
    'Estrutura: uma pasta por equipamento; dentro, um PDF por visita/manutenção.',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(OUT_DIR, 'LEIA-ME.txt'), readme, 'utf8')

  console.log(`A gerar ${manutsExport.length} PDFs…`)
  let ok = 0
  let errors = 0

  for (const manut of manutsExport) {
    const maquina = maqsCliente.find(m => normId(m.id) === normId(manut.maquinaId))
    const rel = relByManutId.get(normId(manut.id))
    if (!maquina || !rel) continue

    const folder = path.join(OUT_DIR, maqFolderIndex.get(normId(maquina.id)))
    fs.mkdirSync(folder, { recursive: true })
    const outFile = path.join(folder, pdfFileName(rel, manut))

    try {
      const checklist = getChecklistBySubcategoria(
        checklistItems,
        maquina.subcategoriaId,
        manut.tipo || 'periodica',
      )
      const blob = await gerarPdfCompacto(buildRelatorioManutencaoPdfArgs({
        relatorio: rel,
        manutencao: manut,
        maquina,
        cliente,
        marcas,
        getSubcategoria,
        getCategoria,
        getTecnicoByNome,
        checklistItems: checklist,
        manutencoes,
      }))
      const buf = Buffer.from(await blob.arrayBuffer())
      fs.writeFileSync(outFile, buf)
      ok++
      if (ok % 10 === 0) console.log(`  … ${ok}/${manutsExport.length}`)
    } catch (err) {
      errors++
      console.error(`  ERRO ${rel.numeroRelatorio}: ${err.message}`)
    }
  }

  console.log(`PDFs gerados: ${ok} (${errors} erros)`)
  console.log('A criar ZIP…')
  const zipBytes = await createZip(OUT_DIR, ZIP_PATH)

  console.log('')
  console.log(`Pasta: ${OUT_DIR}`)
  console.log(`ZIP:   ${ZIP_PATH}`)
  console.log(`ZIP size: ${(zipBytes / 1024 / 1024).toFixed(2)} MB`)
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
