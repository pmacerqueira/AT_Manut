/**
 * UNICOL RAV4800 S/N 437 — copia checklist sub2 → 4 colunas fixas + actualiza relatórios.
 * Uso: node scripts/fix-unicol-rav4800-checklist.mjs [--dry]
 */
const API = 'https://navel.pt/api/data.php'
const DRY = process.argv.includes('--dry')
const SOURCE_SUB = 'sub2'
const TARGET_SUB = 'sub1786982982670'
const MAQ_SN = '437'
const NOTA_GERAL = 'Equipamento em bom estado geral'
const NOTA_REPARACAO =
  'Foi realizada a manutenção / reparação das guias de cabo de aço de sincronizaçao e dos cabos de segurança do elevador. Reajuste das trancas e dos fins de curso, conforme OB02/4244'
const DATA_REPARACAO = '2026-08-07'

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

function buildSnapshot(items) {
  return items
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null }))
}

function respostasSim(snapshot) {
  const m = {}
  for (const it of snapshot) m[it.id] = 'sim'
  return m
}

function notasParaData(dataStr) {
  if (dataStr === DATA_REPARACAO) {
    return `${NOTA_GERAL}\n${NOTA_REPARACAO}`.slice(0, 300)
  }
  return NOTA_GERAL
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()

  const [checklistItems, maquinas, manutencoes, relatorios] = await Promise.all([
    apiCall(token, 'checklistItems', 'list'),
    apiCall(token, 'maquinas', 'list'),
    apiCall(token, 'manutencoes', 'list'),
    apiCall(token, 'relatorios', 'list'),
  ])

  const maq = maquinas.find(m => String(m.numeroSerie) === MAQ_SN)
  if (!maq) throw new Error(`Máquina S/N ${MAQ_SN} não encontrada`)
  if (String(maq.subcategoriaId) !== TARGET_SUB) {
    console.warn(`Aviso: subcategoria actual ${maq.subcategoriaId} (esperado ${TARGET_SUB})`)
  }

  const existingTarget = checklistItems.filter(i => String(i.subcategoriaId) === TARGET_SUB)
  const sourceItems = checklistItems
    .filter(i => String(i.subcategoriaId) === SOURCE_SUB && (i.tipo === 'periodica' || !i.tipo))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))

  if (sourceItems.length === 0) throw new Error('Checklist origem (sub2) vazia')

  let targetItems = [...existingTarget]

  if (existingTarget.length === 0) {
    console.log(`Copiar ${sourceItems.length} itens de sub2 → ${TARGET_SUB}`)
    for (const src of sourceItems) {
      const id = `chk-rav4800-${src.ordem ?? 0}`
      const row = {
        id,
        subcategoriaId: TARGET_SUB,
        texto: src.texto,
        ordem: src.ordem,
        tipo: src.tipo || 'periodica',
        grupo: src.grupo ?? null,
      }
      console.log(`  + [${row.ordem}] ${row.texto.slice(0, 55)}…`)
      if (!DRY) await apiCall(token, 'checklistItems', 'create', { data: row })
      targetItems.push(row)
    }
  } else {
    console.log(`Checklist destino já tem ${existingTarget.length} itens — usar existentes`)
    targetItems = existingTarget
  }

  const snapshot = buildSnapshot(targetItems)
  const respostas = respostasSim(snapshot)

  const manuts = manutencoes
    .filter(m => String(m.maquinaId) === String(maq.id) && m.status === 'concluida')
    .sort((a, b) => a.data.localeCompare(b.data))

  console.log(`\nActualizar ${manuts.length} relatórios S/N ${MAQ_SN}:`)
  for (const man of manuts) {
    const rel = relatorios.find(r => String(r.manutencaoId) === String(man.id))
    if (!rel) {
      console.log(`  ${man.data}: SEM relatório — ignorar`)
      continue
    }
    const notas = notasParaData(man.data)
    const updated = {
      ...rel,
      checklistSnapshot: snapshot,
      checklistRespostas: respostas,
      notas,
    }
    console.log(`  ${rel.numeroRelatorio} @ ${man.data} — ${Object.keys(respostas).length} chk, notas ${notas.length} chars`)
    if (!DRY) await apiCall(token, 'relatorios', 'update', { id: rel.id, data: updated })
  }

  console.log('\nConcluído.')
  if (DRY) console.log('(dry-run — nada gravado)')
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
