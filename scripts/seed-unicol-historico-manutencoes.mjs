/**
 * Regista histórico de manutenções UNICOL (4 datas) + relatórios + recálculo agenda.
 * Uso: node scripts/seed-unicol-historico-manutencoes.mjs [--dry]
 */
import { recalcularPeriodicasNoEstado } from '../src/domain/agendaDomain.js'
import { periodicidadeEfetivaParaMaquina } from '../src/domain/agendaDomain.js'
import { INTERVALOS } from '../src/domain/equipamentoDomain.js'
import { proximoNumeroRelatorioSequencial } from '../src/domain/relatorioDomain.js'

const API = 'https://navel.pt/api/data.php'
const DRY = process.argv.includes('--dry')
const UNICOL_NIF = '512005451'
const TECNICO = 'Paulo Medeiros'
const NOTAS = 'Equipamento em bom estado geral'
const DATAS_EXEC = ['2023-07-06', '2024-11-10', '2025-05-14', '2026-08-07']

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
  if (!json.ok) throw new Error(`Login: ${json.message}`)
  return json.data.token
}

function normId(v) {
  return v == null ? '' : String(v)
}

function slugFromSn(sn) {
  return normId(sn).replace(/[^\w.-]+/g, '_').slice(0, 24) || 'eq'
}

function isoAtDate(dateStr) {
  return `${dateStr}T12:00:00.000Z`
}

function checklistSnapshot(subcategoriaId, checklistItems) {
  return checklistItems
    .filter(it => normId(it.subcategoriaId) === normId(subcategoriaId) && (it.tipo === 'periodica' || !it.tipo))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null }))
}

function checklistRespostasSim(snapshot) {
  const map = {}
  for (const it of snapshot) map[it.id] = 'sim'
  return map
}

function nextNumeroRelatorio(accRel, ano) {
  const num = proximoNumeroRelatorioSequencial(accRel, { ano, prefix: 'MP' })
  accRel.push({ numeroRelatorio: num, id: `seq-${num}` })
  return num
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()
  const hojeStr = new Date().toISOString().slice(0, 10)

  const [clientes, maquinas, manutencoes, relatorios, checklistItems, subcategorias, categorias] =
    await Promise.all([
      apiCall(token, 'clientes', 'list'),
      apiCall(token, 'maquinas', 'list'),
      apiCall(token, 'manutencoes', 'list'),
      apiCall(token, 'relatorios', 'list'),
      apiCall(token, 'checklistItems', 'list'),
      apiCall(token, 'subcategorias', 'list'),
      apiCall(token, 'categorias', 'list'),
    ])

  const cliente = clientes.find(c => normId(c.nif) === UNICOL_NIF)
  if (!cliente) throw new Error('Cliente UNICOL não encontrado')

  const fleet = maquinas
    .filter(m => normId(m.clienteNif ?? m.clienteId) === UNICOL_NIF)
    .sort((a, b) => normId(a.numeroSerie).localeCompare(normId(b.numeroSerie), 'pt'))

  console.log(`Cliente: ${cliente.nome}`)
  console.log(`Equipamentos: ${fleet.length}`)
  console.log(`Datas: ${DATAS_EXEC.join(' → ')}`)
  console.log(`Técnico: ${TECNICO}`)

  let accManut = [...manutencoes]
  let accRel = [...relatorios]
  let createdManut = 0
  let createdRel = 0
  let skipped = 0
  const warnings = []

  for (const maq of fleet) {
    const mid = maq.id
    const slug = slugFromSn(maq.numeroSerie)
    const snap = checklistSnapshot(maq.subcategoriaId, checklistItems)
    if (snap.length === 0) {
      warnings.push(`S/N ${maq.numeroSerie} — checklist vazia (subcategoria sem itens)`)
    }
    const respostas = checklistRespostasSim(snap)
    const periodicidade =
      maq.periodicidadeManut || periodicidadeEfetivaParaMaquina(maq, subcategorias, categorias) || 'semestral'

    console.log(`\n▸ ${maq.marca} ${maq.modelo || ''} S/N ${maq.numeroSerie} (${periodicidade}, ${snap.length} chk)`)

    for (const dataExec of DATAS_EXEC) {
      const existing = accManut.find(
        m => normId(m.maquinaId) === normId(mid) && m.data === dataExec && m.status === 'concluida',
      )
      if (existing) {
        const hasRel = accRel.some(r => normId(r.manutencaoId) === normId(existing.id) && r.numeroRelatorio)
        if (hasRel) {
          console.log(`  ${dataExec}: já existe — ignorar`)
          skipped += 1
          continue
        }
      }

      const manutId = existing?.id ?? `mp-unicol-${slug}-${dataExec.replace(/-/g, '')}`
      const relId = `r-unicol-${slug}-${dataExec.replace(/-/g, '')}`
      const execIso = isoAtDate(dataExec)
      const ano = parseInt(dataExec.slice(0, 4), 10)

      if (!existing) {
        const manutRow = {
          id: manutId,
          maquinaId: mid,
          tipo: 'periodica',
          periodicidade,
          data: dataExec,
          tecnico: TECNICO,
          status: 'concluida',
          observacoes: `Manutenção periódica ${dataExec.slice(0, 7)} — batch UNICOL.`,
          criadoEm: execIso,
        }
        console.log(`  + manut ${dataExec}`)
        if (!DRY) await apiCall(token, 'manutencoes', 'create', { data: manutRow })
        accManut.push(manutRow)
        createdManut += 1
      }

      const numeroRelatorio = nextNumeroRelatorio(accRel, ano)
      const relRow = {
        id: relId,
        manutencaoId: manutId,
        numeroRelatorio,
        checklistRespostas: respostas,
        checklistSnapshot: snap,
        notas: NOTAS,
        fotos: [],
        tecnico: TECNICO,
        assinadoPeloCliente: false,
        nomeAssinante: '',
        assinaturaDigital: null,
        dataCriacao: execIso,
        dataAssinatura: null,
      }
      console.log(`  + relatório ${numeroRelatorio}`)
      if (!DRY) await apiCall(token, 'relatorios', 'create', { data: relRow })
      accRel.push(relRow)
      createdRel += 1
    }

    const ultimaExec = DATAS_EXEC[DATAS_EXEC.length - 1]
    const openSlots = accManut.filter(
      m =>
        normId(m.maquinaId) === normId(mid) &&
        m.status !== 'concluida' &&
        m.tipo !== 'montagem',
    )
    const { idsRemover, novas } = recalcularPeriodicasNoEstado(accManut, {
      maquinaId: mid,
      periodicidade,
      dataExecucao: ultimaExec,
      tecnico: TECNICO,
      hojeStr,
      intervalos: INTERVALOS,
      idSeed: Date.now() + Math.floor(Math.random() * 1e5),
      observacoes: 'Reagendamento automático pós-execução periódica.',
    })

    const toRemove = [...new Set([...openSlots.map(m => m.id), ...idsRemover])]
    console.log(`  recalc: remove ${toRemove.length}, cria ${novas.length}, próx ${novas[0]?.data ?? '—'}`)

    if (!DRY) {
      for (const rid of toRemove) {
        if (accManut.some(m => m.id === rid)) {
          await apiCall(token, 'manutencoes', 'delete', { id: rid })
        }
      }
      if (novas.length) await apiCall(token, 'manutencoes', 'bulk_create', { data: novas })
      await apiCall(token, 'maquinas', 'update', {
        id: mid,
        data: { ultimaManutencaoData: ultimaExec, proximaManut: novas[0]?.data ?? null },
      })
    }

    accManut = accManut.filter(m => !toRemove.includes(m.id)).concat(novas)
  }

  console.log('\n=== RESUMO ===')
  console.log(`Manutenções criadas: ${createdManut}`)
  console.log(`Relatórios criados: ${createdRel}`)
  console.log(`Ignorados (já existiam): ${skipped}`)
  if (warnings.length) {
    console.log('\nAvisos:')
    warnings.forEach(w => console.log(`  ⚠ ${w}`))
  }
  if (DRY) console.log('(dry-run — nada gravado)')
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
