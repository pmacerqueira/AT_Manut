/**
 * Associa tipoManutKaeser B + peças do plano (tipo B) aos relatórios
 * de manutenção dos compressores KAESER UNICOL.
 *
 * Uso: node scripts/fix-unicol-kaeser-pecas-tipo-b.mjs [--dry]
 */
import { sanitizarPecasRelatorio } from '../src/components/executarManutencao/execWizardHelpers.js'

const API = 'https://navel.pt/api/data.php'
const UNICOL_NIF = '512005451'
const TIPO_MANUT = 'B'
const DRY = process.argv.includes('--dry')

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

function pecasTipoBFromPlano(pecasPlano, maquinaId) {
  return pecasPlano
    .filter(p => normId(p.maquinaId) === normId(maquinaId) && String(p.tipoManut || '').toUpperCase() === TIPO_MANUT)
    .sort((a, b) => String(a.posicao || '').localeCompare(String(b.posicao || '')))
    .map(p => ({
      id: p.id,
      posicao: p.posicao ?? '',
      codigoArtigo: p.codigoArtigo ?? '',
      descricao: p.descricao ?? '',
      quantidadeUsada: 1,
      quantidade: 1,
      unidade: p.unidade || 'PÇ',
      usado: true,
    }))
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()

  const [clientes, maquinas, manutencoes, relatorios, pecasPlano] = await Promise.all([
    apiList(token, 'clientes'),
    apiList(token, 'maquinas'),
    apiList(token, 'manutencoes'),
    apiList(token, 'relatorios'),
    apiList(token, 'pecasPlano'),
  ])

  const cliente = clientes.find(c => normNif(c.nif) === UNICOL_NIF || /unicol/i.test(c.nome ?? ''))
  if (!cliente) throw new Error('Cliente UNICOL não encontrado')

  const compIds = new Set(
    maquinas
      .filter(m => normNif(m.clienteNif ?? m.clienteId) === normNif(cliente.nif) && /kaeser/i.test(m.marca ?? ''))
      .map(m => normId(m.id)),
  )

  const relByManut = new Map(relatorios.map(r => [normId(r.manutencaoId), r]))
  const alvo = manutencoes.filter(m => compIds.has(normId(m.maquinaId)) && m.status === 'concluida')

  let updated = 0
  for (const manut of alvo) {
    const rel = relByManut.get(normId(manut.id))
    if (!rel) {
      console.warn('Sem relatório:', manut.id, manut.data)
      continue
    }

    const pecas = sanitizarPecasRelatorio(pecasTipoBFromPlano(pecasPlano, manut.maquinaId))
    if (pecas.length === 0) {
      const maq = maquinas.find(m => normId(m.id) === normId(manut.maquinaId))
      console.warn('Sem peças tipo B no plano:', maq?.marca, maq?.modelo, rel.numeroRelatorio)
      continue
    }

    const next = {
      ...rel,
      tipoManutKaeser: TIPO_MANUT,
      tipoManutKaeserSugerido: rel.tipoManutKaeserSugerido ?? TIPO_MANUT,
      pecasUsadas: pecas,
    }

    console.log(`${rel.numeroRelatorio} — ${pecas.length} peças tipo ${TIPO_MANUT}`)
    await apiUpdate(token, next)
    updated++
  }

  console.log(`\nRelatórios actualizados: ${updated}/${alvo.length}`)
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
