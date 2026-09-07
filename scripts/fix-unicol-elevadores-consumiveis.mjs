/**
 * Associa consumíveis standard aos relatórios UNICOL — elevadores e ponte MARCOVIL.
 *
 * Uso: node scripts/fix-unicol-elevadores-consumiveis.mjs [--dry]
 */
import { sanitizarPecasRelatorio } from '../src/components/executarManutencao/execWizardHelpers.js'

const API = 'https://navel.pt/api/data.php'
const UNICOL_NIF = '512005451'
const DRY = process.argv.includes('--dry')

const CONSUMIVEIS_ELEVADOR = [
  { descricao: 'Desengordurante WD40', quantidadeUsada: 1, unidade: 'UN' },
  { descricao: 'Trapo branco limpeza', quantidadeUsada: 1, unidade: 'UN' },
  { descricao: 'Óleo lubrificação 85W-140', quantidadeUsada: 1, unidade: 'L' },
  { descricao: 'Cartucho massa lubrificante LGHP', quantidadeUsada: 1, unidade: 'PÇ' },
]

const CONSUMIVEIS_MARCOVIL = [
  { descricao: 'Desengordurante WD40', quantidadeUsada: 1, unidade: 'UN' },
  { descricao: 'Trapo branco limpeza', quantidadeUsada: 25, unidade: 'kg' },
  { descricao: 'Cartucho massa lubrificante LGHP', quantidadeUsada: 1, unidade: 'PÇ' },
  { descricao: 'Cartucho massa lubrificante MoS2', quantidadeUsada: 1, unidade: 'PÇ' },
]

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

async function apiList(token, resource) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r: resource, action: 'list' }),
  })
  const json = await resp.json()
  if (!json.ok) throw new Error(`${resource}: ${json.message}`)
  return json.data ?? []
}

async function apiUpdate(token, rel) {
  if (DRY) return
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r: 'relatorios', action: 'update', id: rel.id, data: rel }),
  })
  const json = await resp.json()
  if (!json.ok) throw new Error(`update ${rel.id}: ${json.message}`)
}

function normNif(v) {
  return v == null ? '' : String(v).replace(/\D/g, '')
}

function normId(v) {
  return v == null ? '' : String(v)
}

function buildPecas(template, prefix) {
  return sanitizarPecasRelatorio(
    template.map((item, idx) => ({
      id: `${prefix}_${idx}`,
      posicao: '',
      codigoArtigo: '',
      descricao: item.descricao,
      quantidadeUsada: item.quantidadeUsada,
      quantidade: item.quantidadeUsada,
      unidade: item.unidade,
      usado: true,
      manual: true,
    })),
  )
}

function isElevador(maquina, subMap, catMap) {
  const sub = subMap.get(String(maquina.subcategoriaId))
  const cat = sub ? catMap.get(String(sub.categoriaId)) : null
  return /levador/i.test(cat?.nome ?? '')
}

function isMarcovil(maquina) {
  return /marcovil/i.test(maquina.marca ?? '')
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()

  const [clientes, maquinas, manutencoes, relatorios, subcategorias, categorias] = await Promise.all([
    apiList(token, 'clientes'),
    apiList(token, 'maquinas'),
    apiList(token, 'manutencoes'),
    apiList(token, 'relatorios'),
    apiList(token, 'subcategorias'),
    apiList(token, 'categorias'),
  ])

  const cliente = clientes.find(c => normNif(c.nif) === UNICOL_NIF || /unicol/i.test(c.nome ?? ''))
  if (!cliente) throw new Error('Cliente UNICOL não encontrado')

  const subMap = new Map(subcategorias.map(s => [String(s.id), s]))
  const catMap = new Map(categorias.map(c => [String(c.id), c]))

  const maqsCliente = maquinas.filter(m => normNif(m.clienteNif ?? m.clienteId) === normNif(cliente.nif))
  const alvoMaqs = maqsCliente.filter(m => isElevador(m, subMap, catMap) || isMarcovil(m))
  const alvoIds = new Set(alvoMaqs.map(m => normId(m.id)))

  const relByManut = new Map(relatorios.map(r => [normId(r.manutencaoId), r]))
  const manuts = manutencoes.filter(m => alvoIds.has(normId(m.maquinaId)) && m.status === 'concluida')

  let updated = 0
  for (const manut of manuts) {
    const rel = relByManut.get(normId(manut.id))
    const maq = alvoMaqs.find(m => normId(m.id) === normId(manut.maquinaId))
    if (!rel || !maq) continue

    const template = isMarcovil(maq) ? CONSUMIVEIS_MARCOVIL : CONSUMIVEIS_ELEVADOR
    const prefix = isMarcovil(maq) ? 'marcovil' : 'elev'
    const pecas = buildPecas(template, `${prefix}_${normId(manut.id)}`)

    const next = { ...rel, pecasUsadas: pecas }
    const tipo = isMarcovil(maq) ? 'MARCOVIL' : 'Elevador'
    console.log(`${rel.numeroRelatorio} — ${tipo} ${maq.marca} ${maq.modelo || ''} — ${pecas.length} consumíveis`)
    await apiUpdate(token, next)
    updated++
  }

  console.log(`\nRelatórios actualizados: ${updated}/${manuts.length}`)
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
