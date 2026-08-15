/**
 * Cria manutenções Jul/2026 (executadas) + relatórios para os 2 elevadores AUTO ELGE.
 * Uso: node scripts/seed-elge-jul2026.mjs [--dry]
 */
import {
  recalcularPeriodicasNoEstado,
} from '../src/domain/agendaDomain.js'
import { INTERVALOS } from '../src/domain/equipamentoDomain.js'
import { proximoNumeroRelatorioSequencial } from '../src/domain/relatorioDomain.js'

const API = 'https://navel.pt/api/data.php'
const DRY = process.argv.includes('--dry')
const DATA_JUL = '2026-07-31'
const EXEC_ISO = `${DATA_JUL}T12:00:00.000Z`

async function apiCall(token, resource, action, extra = {}) {
  const body = { _t: token, r: resource, action, ...extra }
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
  if (!json.ok) throw new Error(`Login falhou: ${json.message}`)
  return json.data.token
}

function normId(v) {
  return v == null ? '' : String(v)
}

function findElgeMachines(maquinas, clientes) {
  const cliente = clientes.find(c =>
    /elge/i.test(c.nome || '') || /elge/i.test(c.id || ''),
  )
  if (!cliente) throw new Error('Cliente AUTO ELGE não encontrado')
  const nif = normId(cliente.nif || cliente.id)
  const maqs = maquinas.filter(m =>
    normId(m.clienteNif) === nif || normId(m.clienteId) === nif,
  )
  const elevadores = maqs.filter(m =>
    /10574085|10571437|KPX343|KPX337/i.test(`${m.numeroSerie} ${m.modelo}`),
  )
  if (elevadores.length < 2) {
    throw new Error(`Esperados 2 elevadores ELGE, encontrados ${elevadores.length}: ${elevadores.map(m => m.numeroSerie).join(', ')}`)
  }
  return { cliente, maqs: elevadores }
}

function lastAprilReport(maquinaId, manutencoes, relatorios) {
  const mid = normId(maquinaId)
  const concl = manutencoes
    .filter(m => normId(m.maquinaId) === mid && m.status === 'concluida' && m.data?.startsWith('2026-04'))
    .sort((a, b) => b.data.localeCompare(a.data))
  for (const m of concl) {
    const rel = relatorios.find(r => normId(r.manutencaoId) === normId(m.id))
    if (rel?.assinaturaDigital) return { manut: m, rel }
  }
  const anyConcl = manutencoes
    .filter(m => normId(m.maquinaId) === mid && m.status === 'concluida')
    .sort((a, b) => b.data.localeCompare(a.data))
  for (const m of anyConcl) {
    const rel = relatorios.find(r => normId(r.manutencaoId) === normId(m.id))
    if (rel?.assinaturaDigital) return { manut: m, rel }
  }
  throw new Error(`Sem relatório com assinatura para máquina ${maquinaId}`)
}

function checklistSnapshot(subcategoriaId, checklistItems) {
  return checklistItems
    .filter(it => normId(it.subcategoriaId) === normId(subcategoriaId) && (it.tipo === 'periodica' || !it.tipo))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null }))
}

function recalcFutureSlots(maquinaId, periodicidade, dataExecucao, tecnico, manutencoes, hojeStr) {
  const { idsRemover, novas } = recalcularPeriodicasNoEstado(manutencoes, {
    maquinaId,
    periodicidade,
    dataExecucao,
    tecnico,
    hojeStr,
    intervalos: INTERVALOS,
    idSeed: Date.now() + Math.floor(Math.random() * 1e5),
    observacoes: 'Reagendamento automático pós-execução periódica.',
  })
  return { idsRemover, novas }
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()
  console.log('Login OK')

  const [clientes, maquinas, manutencoes, relatorios, checklistItems] = await Promise.all([
    apiCall(token, 'clientes', 'list'),
    apiCall(token, 'maquinas', 'list'),
    apiCall(token, 'manutencoes', 'list'),
    apiCall(token, 'relatorios', 'list'),
    apiCall(token, 'checklistItems', 'list'),
  ])

  const { cliente, maqs } = findElgeMachines(maquinas, clientes)
  console.log(`Cliente: ${cliente.nome} (${maqs.length} elevadores)`)

  const hojeStr = new Date().toISOString().slice(0, 10)
  const createdManutIds = []
  const createdRels = []
  let accManut = [...manutencoes]
  let accRel = [...relatorios]
  let nextNumOffset = 0

  for (const maq of maqs) {
    const mid = maq.id
    const existingJul = accManut.find(m =>
      normId(m.maquinaId) === normId(mid) &&
      m.data === DATA_JUL &&
      m.status === 'concluida',
    )
    const existingRel = existingJul
      ? accRel.find(r => normId(r.manutencaoId) === normId(existingJul.id))
      : null

    if (existingJul && existingRel) {
      console.log(`  ${maq.modelo} S/N ${maq.numeroSerie}: Jul/2026 já completo (${existingJul.id}) — ignorar`)
      continue
    }

    const { rel: refRel } = lastAprilReport(mid, accManut, accRel)
    const tecnico = refRel.tecnico || 'Aurélio Almeida'
    const periodicidade = maq.periodicidadeManut || 'trimestral'
    const manutId = existingJul?.id ?? `mp-elge-jul26-${normId(mid).replace(/\W/g, '').slice(-8)}`
    const relId = existingRel?.id ?? `r-elge-jul26-${normId(mid).replace(/\W/g, '').slice(-8)}`

    if (!existingJul) {
      const manutRow = {
        id: manutId,
        maquinaId: mid,
        tipo: 'periodica',
        periodicidade,
        data: DATA_JUL,
        tecnico,
        status: 'concluida',
        observacoes: 'Manutenção trimestral Jul/2026 — registada por script (AUTO ELGE).',
        criadoEm: EXEC_ISO,
      }
      console.log(`  ${maq.modelo} S/N ${maq.numeroSerie}:`)
      console.log(`    manutenção ${manutId} @ ${DATA_JUL}, técnico ${tecnico}`)
      if (!DRY) await apiCall(token, 'manutencoes', 'create', { data: manutRow })
      accManut.push(manutRow)
      createdManutIds.push(manutId)
    } else {
      console.log(`  ${maq.modelo} S/N ${maq.numeroSerie}: manutenção já existe (${manutId}), criar relatório`)
    }

    if (!existingRel) {
      const snap = checklistSnapshot(maq.subcategoriaId, checklistItems)
      const baseNum = proximoNumeroRelatorioSequencial(accRel, { ano: 2026, prefix: 'MP' })
      const seq = parseInt(baseNum.split('.')[2], 10) + nextNumOffset
      const numFinal = `2026.MP.${String(seq).padStart(5, '0')}`
      nextNumOffset += 1

      const relRow = {
        id: relId,
        manutencaoId: manutId,
        numeroRelatorio: numFinal,
        checklistRespostas: {},
        checklistSnapshot: snap,
        notas: '',
        fotos: [],
        tecnico,
        assinadoPeloCliente: true,
        nomeAssinante: refRel.nomeAssinante || cliente.nomeContacto || '',
        assinaturaDigital: refRel.assinaturaDigital,
        dataAssinatura: EXEC_ISO,
        dataCriacao: EXEC_ISO,
      }
      console.log(`    relatório ${relId} (${numFinal}), assinante: ${relRow.nomeAssinante || '(sem nome)'}`)
      if (!DRY) await apiCall(token, 'relatorios', 'create', { data: relRow })
      accRel.push(relRow)
      createdRels.push(relRow)
    }

    const { idsRemover, novas } = recalcFutureSlots(mid, periodicidade, DATA_JUL, tecnico, accManut, hojeStr)
    console.log(`    recalc: remover ${idsRemover.length} slots abertos, criar ${novas.length} futuros`)
    if (novas[0]) console.log(`    próxima: ${novas[0].data}`)

    if (!DRY) {
      for (const rid of idsRemover) {
        await apiCall(token, 'manutencoes', 'delete', { id: rid })
      }
      if (novas.length) {
        await apiCall(token, 'manutencoes', 'bulk_create', { data: novas })
      }
      const proxima = novas[0]?.data ?? null
      await apiCall(token, 'maquinas', 'update', {
        id: mid,
        data: { ultimaManutencaoData: DATA_JUL, proximaManut: proxima },
      })
    }

    accManut = accManut.filter(m => !idsRemover.includes(m.id)).concat(novas)
  }

  console.log('\nResumo:')
  console.log(`  Manutenções criadas: ${createdManutIds.length}`)
  console.log(`  Relatórios criados: ${createdRels.length}`)
  if (DRY) console.log('(dry-run — nada gravado)')
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
