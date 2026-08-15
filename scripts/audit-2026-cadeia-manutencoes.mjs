/**
 * Auditoria completa: 1.ªs manutenções 2026 + agenda aberta + paridade com sync.
 * Uso: node scripts/audit-2026-cadeia-manutencoes.mjs [--json]
 */
import { addDaysIso } from '../src/domain/agendaAuditDomain.js'
import {
  periodicidadeEfetivaParaMaquina,
  recalcularAgendaMaquinaNoAcc,
  resolverDataExecucaoParaMaquina,
} from '../src/domain/agendaDomain.js'
import { INTERVALOS } from '../src/domain/equipamentoDomain.js'
import { minDataManutencaoAberta, listProximasAgendaPeriodicas } from '../src/utils/proximaManutAgenda.js'
import { normEntityId } from '../src/utils/frotaReportHelpers.js'

const API = 'https://navel.pt/api/data.php'
const AS_JSON = process.argv.includes('--json')
const ANO = 2026
const TOL_ANTES = 15
const TOL_DEPOIS = 45

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
  if (!json.ok) throw new Error(`${resource}/list: ${json.message ?? resp.status}`)
  return json.data ?? []
}

function sameMid(m, mid) {
  return normEntityId(m.maquinaId) === normEntityId(mid)
}

function concluidas(mid, manutencoes, { desde = null } = {}) {
  return manutencoes
    .filter(
      m =>
        sameMid(m, mid) &&
        m.status === 'concluida' &&
        m.tipo !== 'montagem' &&
        m.data &&
        (!desde || m.data >= desde),
    )
    .sort((a, b) => a.data.localeCompare(b.data))
}

function abertasPeriodicas(mid, manutencoes, { desde = null } = {}) {
  return manutencoes
    .filter(
      m =>
        sameMid(m, mid) &&
        (m.status === 'agendada' || m.status === 'pendente') &&
        m.tipo !== 'montagem' &&
        m.data &&
        (!desde || m.data >= desde),
    )
    .sort((a, b) => a.data.localeCompare(b.data))
}

function datasAbertasSync(acc, ctx) {
  const { acc: next } = recalcularAgendaMaquinaNoAcc(acc, ctx)
  return abertasPeriodicas(ctx.maq.id, next).map(m => m.data)
}

function dentroTolerancia(data, esperada, intervaloDias) {
  const min = addDaysIso(esperada, -TOL_ANTES)
  const max = addDaysIso(esperada, TOL_DEPOIS)
  return data >= min && data <= max
}

function clienteMap(clientes) {
  const map = new Map()
  for (const c of clientes ?? []) {
    const key = normEntityId(c.nif ?? c.id)
    if (key) map.set(key, c)
  }
  return map
}

function auditarEquipamento(maq, ctx) {
  const { manutencoes, relatorios, clientesByNif, hojeStr, subcategorias, categorias } = ctx
  const periodicidade = periodicidadeEfetivaParaMaquina(maq, subcategorias, categorias)
  if (!periodicidade || !INTERVALOS[periodicidade]) return null

  const intervaloDias = INTERVALOS[periodicidade].dias
  const clienteKey = normEntityId(maq.clienteNif ?? maq.clienteId)
  const cliente = clientesByNif.get(clienteKey)
  const concl2026 = concluidas(maq.id, manutencoes, { desde: `${ANO}-01-01` })
  const conclTodas = concluidas(maq.id, manutencoes)
  const primeira2026 = concl2026[0] ?? null
  const dataExec = resolverDataExecucaoParaMaquina(maq, manutencoes, sameMid)
  const abertas = abertasPeriodicas(maq.id, manutencoes, { desde: `${ANO}-01-01` })
  const proximas12 = listProximasAgendaPeriodicas(maq.id, manutencoes, { limit: 12 })
  const proxFicha = maq.proximaManut ?? null
  const proxAgenda = minDataManutencaoAberta(maq.id, manutencoes)

  const issues = []

  if (concl2026.length === 0 && dataExec && dataExec < `${ANO}-01-01`) {
    issues.push({
      tipo: 'sem_exec_2026',
      severidade: 'info',
      detalhe: `Última exec. ${dataExec}; nenhuma concluída em ${ANO} (normal se já agendada).`,
    })
  }

  for (let i = 1; i < concl2026.length; i++) {
    const prev = concl2026[i - 1].data
    const curr = concl2026[i].data
    const esperado = addDaysIso(prev, intervaloDias)
    if (!dentroTolerancia(curr, esperado, intervaloDias)) {
      issues.push({
        tipo: 'intervalo_concluidas_2026',
        severidade: 'alta',
        detalhe: `Entre ${prev} e ${curr} (esperado ~${esperado}, ${periodicidade})`,
      })
    }
  }

  if (dataExec && abertas.length > 0) {
    const slotEsperado = addDaysIso(dataExec, intervaloDias)
    const primeiraAberta = abertas[0].data
    if (!dentroTolerancia(primeiraAberta, slotEsperado, intervaloDias)) {
      issues.push({
        tipo: 'primeira_aberta_desalinhada',
        severidade: 'alta',
        detalhe: `Última exec. ${dataExec}; 1.ª aberta ${primeiraAberta}; esperado ~${slotEsperado}`,
      })
    }
  }

  if (String(proxFicha ?? '') !== String(proxAgenda ?? '')) {
    issues.push({
      tipo: 'proxima_desalinhada',
      severidade: 'baixa',
      detalhe: `Ficha ${proxFicha ?? '—'} vs agenda ${proxAgenda ?? '—'}`,
    })
  }

  const acc = manutencoes.map(m => ({ ...m }))
  const syncCtx = {
    maq,
    subcategorias,
    categorias,
    hojeStr,
    intervalos: INTERVALOS,
    sameMid,
    idSeed: 1,
  }
  const datasActuais = abertasPeriodicas(maq.id, manutencoes).map(m => m.data)
  const datasSync = datasAbertasSync(acc, syncCtx)
  const syncDiff =
    datasActuais.length !== datasSync.length ||
    datasActuais.some((d, i) => d !== datasSync[i])
  if (syncDiff) {
    const extra = datasSync.filter(d => !datasActuais.includes(d))
    const emFalta = datasActuais.filter(d => !datasSync.includes(d))
    issues.push({
      tipo: 'sync_alteraria_agenda',
      severidade: extra.some(d => d < hojeStr) ? 'media' : 'baixa',
      detalhe: `Sync difere: actual [${datasActuais.slice(0, 4).join(', ')}${datasActuais.length > 4 ? '…' : ''}] vs sync [${datasSync.slice(0, 4).join(', ')}${datasSync.length > 4 ? '…' : ''}]${extra.length ? `; criaria ${extra.slice(0, 3).join(', ')}` : ''}${emFalta.length ? `; removeria ${emFalta.slice(0, 3).join(', ')}` : ''}`,
    })
  }

  const conclComRel = concl2026.filter(m =>
    relatorios.some(r => normEntityId(r.manutencaoId) === normEntityId(m.id) && r.status === 'concluido'),
  )

  return {
    maquinaId: maq.id,
    numeroSerie: maq.numeroSerie ?? '',
    modelo: [maq.marca, maq.modelo].filter(Boolean).join(' ').trim(),
    clienteNome: cliente?.nome ?? clienteKey,
    clienteNif: clienteKey,
    periodicidade,
    ultimaExec: dataExec,
    primeira2026: primeira2026?.data ?? null,
    concluidas2026: concl2026.map(m => m.data),
    totalConcluidas: conclTodas.length,
    proximaAgenda: proxAgenda,
    proximaFicha: proxFicha,
    proximasAbertas: proximas12.map(m => m.data),
    concl2026ComRelatorio: conclComRel.length,
    concl2026Total: concl2026.length,
    syncParidade: !syncDiff,
    issues,
  }
}

function formatReport(result) {
  const lines = [
    `=== AUDITORIA CADEIA MANUTENÇÕES ${ANO}+ ===`,
    `Data: ${result.hojeStr}`,
    `Clientes com equip. periódicos: ${result.resumo.clientes}`,
    `Equipamentos analisados: ${result.resumo.equipamentos}`,
    `Com execução em ${ANO}: ${result.resumo.comExec2026}`,
    `Paridade sync (agenda = sync simulado): ${result.resumo.syncOk}/${result.resumo.equipamentos}`,
    `Anomalias: ${result.resumo.totalIssues}`,
    '',
  ]

  if (result.resumo.totalIssues === 0) {
    lines.push('✓ Nenhuma anomalia — agenda alinhada com execuções e sync.')
  } else {
    for (const row of result.porCliente) {
      const comIssues = row.equipamentos.filter(e => e.issues.some(i => i.severidade !== 'info'))
      if (comIssues.length === 0) continue
      lines.push(`--- ${row.clienteNome} (${row.clienteNif}) ---`)
      for (const eq of comIssues) {
        lines.push(`  ${eq.modelo} S/N ${eq.numeroSerie}`)
        for (const iss of eq.issues.filter(i => i.severidade !== 'info')) {
          lines.push(`    [${iss.severidade}] ${iss.tipo}: ${iss.detalhe}`)
        }
      }
      lines.push('')
    }
  }

  lines.push('--- Resumo por cliente (1.ª exec. 2026 → próximas) ---')
  for (const row of result.porCliente) {
    lines.push(`${row.clienteNome}:`)
    for (const eq of row.equipamentos) {
      const p = eq.primeira2026 ?? '(sem exec. 2026)'
      const prox = eq.proximasAbertas.slice(0, 3).join(', ') || '—'
      const flag = eq.syncParidade ? '✓' : '⚠ sync'
      lines.push(
        `  ${flag} ${eq.modelo} S/N ${eq.numeroSerie} | 1.ª ${ANO}: ${p} | próx: ${prox} | exec2026: ${eq.concl2026ComRelatorio}/${eq.concl2026Total} c/ relatório`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}

async function main() {
  const token = await login()
  const hojeStr = new Date().toISOString().slice(0, 10)
  const [clientes, maquinas, manutencoes, relatorios, subcategorias, categorias] = await Promise.all([
    apiList(token, 'clientes'),
    apiList(token, 'maquinas'),
    apiList(token, 'manutencoes'),
    apiList(token, 'relatorios'),
    apiList(token, 'subcategorias'),
    apiList(token, 'categorias'),
  ])

  const clientesByNif = clienteMap(clientes)
  const ctx = { manutencoes, relatorios, clientesByNif, hojeStr, subcategorias, categorias }
  const rows = []

  for (const maq of maquinas) {
    const row = auditarEquipamento(maq, ctx)
    if (row) rows.push(row)
  }

  const byCliente = new Map()
  for (const row of rows) {
    const key = row.clienteNif
    if (!byCliente.has(key)) {
      byCliente.set(key, { clienteNome: row.clienteNome, clienteNif: key, equipamentos: [] })
    }
    byCliente.get(key).equipamentos.push(row)
  }

  const porCliente = [...byCliente.values()].sort((a, b) =>
    a.clienteNome.localeCompare(b.clienteNome, 'pt'),
  )

  const totalIssues = rows.reduce(
    (n, r) => n + r.issues.filter(i => i.severidade !== 'info').length,
    0,
  )
  const comExec2026 = rows.filter(r => r.concluidas2026.length > 0).length
  const syncOk = rows.filter(r => r.syncParidade).length

  const result = {
    hojeStr,
    porCliente,
    resumo: {
      clientes: porCliente.length,
      equipamentos: rows.length,
      comExec2026,
      syncOk,
      totalIssues,
      limpo: totalIssues === 0,
    },
  }

  if (AS_JSON) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(formatReport(result))
  }

  process.exit(result.resumo.limpo ? 0 : 1)
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(2)
})
