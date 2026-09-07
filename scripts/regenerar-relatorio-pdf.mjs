/**
 * Regenera um PDF individual de manutenção por número de relatório.
 * Uso: npx vite-node scripts/regenerar-relatorio-pdf.mjs 2026.MP.00131 [--out=caminho.pdf]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildRelatorioManutencaoPdfArgs } from '../src/utils/relatorioManutencaoPayload.js'
import { gerarPdfCompacto } from '../src/utils/gerarPdfRelatorio.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'https://navel.pt/api/data.php'
const numero = process.argv[2]
const outArg = process.argv.find(a => a.startsWith('--out='))

if (!numero) {
  console.error('Uso: npx vite-node scripts/regenerar-relatorio-pdf.mjs <numeroRelatorio> [--out=caminho.pdf]')
  process.exit(1)
}

async function login() {
  const form = new URLSearchParams()
  form.set('_t', '')
  form.set('r', 'auth')
  form.set('action', 'login')
  form.set('username', 'Admin')
  form.set('password', 'admin123%')
  const json = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form.toString(),
  }).then(r => r.json())
  if (!json.ok) throw new Error(json.message)
  return json.data.token
}

async function list(token, r) {
  const json = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r, action: 'list' }),
  }).then(x => x.json())
  if (!json.ok) throw new Error(json.message)
  return json.data
}

const token = await login()
const [relatorios, manutencoes, maquinas, clientes, subcategorias, categorias, tecnicos, marcas, checklistItems] =
  await Promise.all([
    list(token, 'relatorios'),
    list(token, 'manutencoes'),
    list(token, 'maquinas'),
    list(token, 'clientes'),
    list(token, 'subcategorias'),
    list(token, 'categorias'),
    list(token, 'tecnicos'),
    list(token, 'marcas'),
    list(token, 'checklistItems'),
  ])

const rel = relatorios.find(r => r.numeroRelatorio === numero)
if (!rel) throw new Error(`Relatório ${numero} não encontrado`)

const manut = manutencoes.find(m => String(m.id) === String(rel.manutencaoId))
const maquina = maquinas.find(m => String(m.id) === String(manut?.maquinaId))
const cliente = clientes.find(c => String(c.nif) === String(maquina?.clienteNif ?? maquina?.clienteId))
const subMap = new Map(subcategorias.map(s => [String(s.id), s]))
const catMap = new Map(categorias.map(c => [String(c.id), c]))
const checklist = checklistItems
  .filter(c => String(c.subcategoriaId) === String(maquina?.subcategoriaId) && (c.tipo || 'periodica') === 'periodica')
  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))

const blob = await gerarPdfCompacto(buildRelatorioManutencaoPdfArgs({
  relatorio: rel,
  manutencao: manut,
  maquina,
  cliente,
  marcas,
  getSubcategoria: id => subMap.get(String(id)) ?? null,
  getCategoria: id => catMap.get(String(id)) ?? null,
  getTecnicoByNome: nome => tecnicos.find(t => t.nome === nome) ?? null,
  checklistItems: checklist,
  manutencoes,
}))

const defaultOut = path.join(
  __dirname,
  'output',
  'UNICOL_512005451_relatorios',
  `relatorio_${numero.replace(/\./g, '_')}.pdf`,
)
const outPath = outArg ? path.resolve(outArg.slice(6)) : defaultOut
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, Buffer.from(await blob.arrayBuffer()))
console.log('PDF gravado:', outPath)
