/**
 * Gera PDF do relatório executivo de frota UNICOL (sem envio de email).
 *
 * Uso: npx vite-node scripts/gerar-frota-unicol-pdf.mjs [--out=caminho.pdf]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { gerarRelatorioFrotaPdf } from '../src/utils/gerarRelatorioFrota.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'https://navel.pt/api/data.php'
const UNICOL_NIF = '512005451'

const outArg = process.argv.find(a => a.startsWith('--out='))
const defaultOut = path.join(__dirname, 'output', `frota_UNICOL_${UNICOL_NIF}_2023-2026.pdf`)
const outPath = outArg ? path.resolve(outArg.slice(6)) : defaultOut

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

function loadLogoDataUrl() {
  const logoPath = path.join(__dirname, '../public/NAVEL_LOGO.jpg')
  const buf = fs.readFileSync(logoPath)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

async function main() {
  console.log('A obter dados da API…')
  const token = await login()

  const [
    clientes,
    maquinas,
    manutencoes,
    relatorios,
    reparacoes,
    subcategorias,
    categorias,
    tecnicos,
  ] = await Promise.all([
    apiCall(token, 'clientes', 'list'),
    apiCall(token, 'maquinas', 'list'),
    apiCall(token, 'manutencoes', 'list'),
    apiCall(token, 'relatorios', 'list'),
    apiCall(token, 'reparacoes', 'list'),
    apiCall(token, 'subcategorias', 'list'),
    apiCall(token, 'categorias', 'list'),
    apiCall(token, 'tecnicos', 'list'),
  ])

  const cliente = clientes.find(c => normNif(c.nif) === UNICOL_NIF || /unicol/i.test(c.nome ?? ''))
  if (!cliente) throw new Error('Cliente UNICOL não encontrado')

  const maqsCliente = maquinas.filter(m => {
    const nif = normNif(m.clienteNif ?? m.clienteId)
    return nif === UNICOL_NIF || normNif(cliente.nif) === nif
  })

  const subMap = new Map(subcategorias.map(s => [String(s.id), s]))
  const catMap = new Map(categorias.map(c => [String(c.id), c]))
  const getSubcategoria = (id) => subMap.get(String(id)) ?? null
  const getCategoria = (id) => catMap.get(String(id)) ?? null

  const paulo = tecnicos.find(t => /Paulo Medeiros/i.test(t.nome ?? ''))
  if (!paulo?.assinaturaDigital) {
    console.warn('Aviso: assinatura digital de Paulo Medeiros não encontrada — PDF sem imagem do técnico.')
  }

  const logoDataUrl = loadLogoDataUrl()

  const options = {
    periodoCustom: true,
    periodoInicio: '2023-01-01',
    periodoFim: '2026-12-31',
    periodoLabel: '2023–2026',
    agendaAno: 2027,
    incluirHistoricoManutencoes: true,
    logoDataUrl,
    assinaturas: {
      tecnicoNome: paulo?.nome ?? 'Paulo Medeiros',
      tecnicoAssinatura: paulo?.assinaturaDigital ?? null,
      tecnicoTelefone: paulo?.telefone ?? null,
      clienteNome: 'Eng. Emanuel Garcia',
      reservarCaixaCliente: true,
    },
  }

  console.log(`Cliente: ${cliente.nome}`)
  console.log(`Equipamentos: ${maqsCliente.length}`)
  console.log('A gerar PDF…')

  const blob = await gerarRelatorioFrotaPdf(
    cliente,
    maqsCliente,
    manutencoes,
    relatorios ?? [],
    reparacoes ?? [],
    getSubcategoria,
    getCategoria,
    options,
  )

  const buf = Buffer.from(await blob.arrayBuffer())
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, buf)

  console.log(`PDF gravado: ${outPath}`)
  console.log(`Tamanho: ${(buf.length / 1024).toFixed(1)} KB`)
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
