/**
 * Audita cadeia «próxima manutenção» nos relatórios UNICOL (2023–2027).
 * Exit 1 se alguma próxima ≠ 1.º slot cronológico após execução.
 *
 * Uso: node scripts/audit-unicol-proximas.mjs [--json]
 */
import {
  buildProximasManutencoesManutencao,
  resolveDataExecucaoManutencao,
} from '../src/utils/relatorioManutencaoPayload.js'
import { listProximasAposExecucao } from '../src/utils/proximaManutAgenda.js'

const API = 'https://navel.pt/api/data.php'
const UNICOL_NIF = '512005451'
const jsonOut = process.argv.includes('--json')

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

async function main() {
  const token = await login()
  const [clientes, maquinas, manutencoes, relatorios] = await Promise.all([
    apiCall(token, 'clientes', 'list'),
    apiCall(token, 'maquinas', 'list'),
    apiCall(token, 'manutencoes', 'list'),
    apiCall(token, 'relatorios', 'list'),
  ])

  const cliente = clientes.find(c => normNif(c.nif) === UNICOL_NIF || /unicol/i.test(c.nome ?? ''))
  if (!cliente) throw new Error('Cliente UNICOL não encontrado')

  const maqs = maquinas.filter(m => normNif(m.clienteNif ?? m.clienteId) === normNif(cliente.nif))
  const maqIds = new Set(maqs.map(m => normId(m.id)))
  const relByManut = new Map()
  for (const r of relatorios) {
    const mid = normId(r.manutencaoId ?? r.manutencao_id)
    if (mid) relByManut.set(mid, r)
  }

  const issues = []
  const samples = []

  for (const manut of manutencoes.filter(m => maqIds.has(normId(m.maquinaId)) && m.status === 'concluida')) {
    const rel = relByManut.get(normId(manut.id))
    if (!rel) continue
    const maquina = maqs.find(m => normId(m.id) === normId(manut.maquinaId))
    if (!maquina) continue

    const dataExec = resolveDataExecucaoManutencao({ relatorio: rel, manutencao: manut })
    const expected = listProximasAposExecucao(maquina.id, manutencoes, dataExec, { limit: 1 })[0]?.data ?? null
    const prox = buildProximasManutencoesManutencao({
      relatorio: rel,
      manutencao: manut,
      maquina,
      manutencoes,
    })
    const actual = prox[0]?.data ?? null

    if (expected !== actual) {
      issues.push({
        numeroRelatorio: rel.numeroRelatorio,
        equipamento: `${maquina.marca} ${maquina.modelo} S/N ${maquina.numeroSerie}`,
        dataExec,
        expected,
        actual,
      })
    }

    if (samples.length < 5 && rel.numeroRelatorio === '2025.MP.00013') {
      samples.push({ numeroRelatorio: rel.numeroRelatorio, dataExec, proxima: actual, cadeia: prox.map(p => p.data) })
    }
  }

  const report = {
    cliente: cliente.nome,
    totalRelatorios: manutencoes.filter(m => maqIds.has(normId(m.maquinaId)) && m.status === 'concluida' && relByManut.has(normId(m.id))).length,
    anomalias: issues.length,
    issues,
    amostraRAV4800: samples,
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`UNICOL — auditoria próximas: ${report.totalRelatorios} relatórios, ${issues.length} anomalias`)
    if (samples.length) {
      const s = samples[0]
      console.log(`  RAV4800 2025.MP.00013: exec ${s.dataExec} → próxima ${s.proxima} (cadeia: ${s.cadeia.join(', ')})`)
    }
    for (const i of issues.slice(0, 20)) {
      console.log(`  ✗ ${i.numeroRelatorio} (${i.equipamento}): exec ${i.dataExec} esperado ${i.expected} obteve ${i.actual}`)
    }
    if (issues.length > 20) console.log(`  … +${issues.length - 20} mais`)
  }

  process.exit(issues.length > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(2)
})
