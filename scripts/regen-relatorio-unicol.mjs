/**
 * Regenera um PDF individual UNICOL por número de relatório.
 * Uso: npx vite-node scripts/regen-relatorio-unicol.mjs 2026.MP.00131
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildRelatorioManutencaoPdfArgs } from '../src/utils/relatorioManutencaoPayload.js'
import { gerarPdfCompacto } from '../src/utils/gerarPdfRelatorio.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'https://navel.pt/api/data.php'
const NUM = process.argv[2]
if (!NUM) {
  console.error('Indique o número do relatório, ex.: 2026.MP.00131')
  process.exit(1)
}

async function login() {
  const form = new URLSearchParams()
  form.set('_t', ''); form.set('r', 'auth'); form.set('action', 'login')
  form.set('username', 'Admin'); form.set('password', 'admin123%')
  const resp = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: form })
  const json = await resp.json()
  if (!json.ok) throw new Error(json.message)
  return json.data.token
}

async function list(token, r) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r, action: 'list' }),
  })
  const json = await resp.json()
  if (!json.ok) throw new Error(json.message)
  return json.data ?? []
}

async function main() {
  const token = await login()
  const [relatorios, manutencoes, maquinas, clientes, subcategorias, categorias, tecnicos, marcas, checklistItems] = await Promise.all([
    list(token, 'relatorios'), list(token, 'manutencoes'), list(token, 'maquinas'), list(token, 'clientes'),
    list(token, 'subcategorias'), list(token, 'categorias'), list(token, 'tecnicos'), list(token, 'marcas'), list(token, 'checklistItems'),
  ])
  const rel = relatorios.find(r => r.numeroRelatorio === NUM)
  if (!rel) throw new Error(`Relatório ${NUM} não encontrado`)
  const manut = manutencoes.find(m => String(m.id) === String(rel.manutencaoId))
  const maquina = maquinas.find(m => String(m.id) === String(manut?.maquinaId))
  const cliente = clientes.find(c => String(c.nif) === String(maquina?.clienteNif ?? maquina?.clienteId))
  const subMap = new Map(subcategorias.map(s => [String(s.id), s]))
  const catMap = new Map(categorias.map(c => [String(c.id), c]))
  const getSubcategoria = (id) => subMap.get(String(id)) ?? null
  const getCategoria = (id) => catMap.get(String(id)) ?? null
  const getTecnicoByNome = (nome) => tecnicos.find(t => t.nome === nome) ?? null
  const checklist = checklistItems.filter(c => String(c.subcategoriaId ?? c.subcategoria_id) === String(maquina.subcategoriaId) && (c.tipo || 'periodica') === (manut.tipo || 'periodica')).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))

  const blob = await gerarPdfCompacto(buildRelatorioManutencaoPdfArgs({
    relatorio: rel, manutencao: manut, maquina, cliente, marcas,
    getSubcategoria, getCategoria, getTecnicoByNome, checklistItems: checklist, manutencoes,
  }))

  const outDir = path.join(__dirname, 'output', 'UNICOL_512005451_relatorios', '10_Ravaglioli_RAV4800_437')
  const outFile = path.join(outDir, `${NUM}_${String(manut.data).slice(0, 10)}.pdf`)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, Buffer.from(await blob.arrayBuffer()))
  console.log('PDF gravado:', outFile)
}

main().catch(e => { console.error(e.message); process.exit(1) })
