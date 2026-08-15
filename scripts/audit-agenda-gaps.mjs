/**
 * Auditoria de lapsos na agenda periódica (produção ou dados locais).
 * Uso: node scripts/audit-agenda-gaps.mjs [--json]
 */
import {
  auditarAgendaPeriodica,
  formatAgendaAuditReportText,
} from '../src/domain/agendaAuditDomain.js'

const API = 'https://navel.pt/api/data.php'
const AS_JSON = process.argv.includes('--json')

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
  if (!json.ok) throw new Error(`Login falhou: ${json.message}`)
  return json.data.token
}

async function apiList(token, resource) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r: resource, action: 'list' }),
  })
  const json = await resp.json()
  if (!json.ok) throw new Error(`${resource}/list: ${json.message ?? resp.status}`)
  return json.data ?? []
}

async function main() {
  const token = await login()
  const hojeStr = new Date().toISOString().slice(0, 10)
  const [clientes, maquinas, manutencoes, subcategorias, categorias] = await Promise.all([
    apiList(token, 'clientes'),
    apiList(token, 'maquinas'),
    apiList(token, 'manutencoes'),
    apiList(token, 'subcategorias'),
    apiList(token, 'categorias'),
  ])

  const result = auditarAgendaPeriodica({
    maquinas,
    manutencoes,
    clientes,
    subcategorias,
    categorias,
    hojeStr,
  })

  if (AS_JSON) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(formatAgendaAuditReportText(result))
    console.log('--- Resumo por tipo ---')
    for (const [tipo, count] of Object.entries(result.resumo.porTipo)) {
      if (count > 0) console.log(`  ${tipo}: ${count}`)
    }
  }

  process.exit(result.resumo.limpo ? 0 : 1)
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(2)
})
