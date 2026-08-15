/**
 * Normaliza assinantes ANTERO REGO: nomes canónicos + assinatura canónica por secção.
 * Uso: node scripts/fix-antero-rego-assinantes.mjs [--dry]
 */
import {
  ANTERO_REGO_NIF,
  ASSINANTES_SECAO_ANTERO_REGO,
  assinaturaCanonicaAssinante,
  detectarSecaoEquipamento,
  normTexto,
} from '../src/domain/clienteAssinantesSecao.js'

const API = 'https://navel.pt/api/data.php'
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

function nomeEsperado(secao) {
  return ASSINANTES_SECAO_ANTERO_REGO.find(x => x.secao === secao)?.nomeAssinante ?? null
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()
  const [maquinas, manutencoes, relatorios] = await Promise.all([
    apiList(token, 'maquinas'),
    apiList(token, 'manutencoes'),
    apiList(token, 'relatorios'),
  ])

  const sigFabio = assinaturaCanonicaAssinante(relatorios, ASSINANTES_SECAO_ANTERO_REGO[0])
  const sigPaulo = assinaturaCanonicaAssinante(relatorios, ASSINANTES_SECAO_ANTERO_REGO[1])
  console.log(`Ref Fabio (${ASSINANTES_SECAO_ANTERO_REGO[0].relatorioRefAssinatura}): ${sigFabio?.length ?? 0} bytes`)
  console.log(`Ref Paulo (${ASSINANTES_SECAO_ANTERO_REGO[1].relatorioRefAssinatura}): ${sigPaulo?.length ?? 0} bytes`)
  if (!sigFabio || !sigPaulo) throw new Error('Assinaturas de referência em falta')
  if (sigFabio === sigPaulo) throw new Error('Assinaturas Fabio/Paulo são iguais — abortar')

  const maqById = Object.fromEntries(
    maquinas
      .filter(m => String(m.clienteNif || m.clienteId) === ANTERO_REGO_NIF)
      .map(m => [m.id, m]),
  )

  const correcoes = []
  for (const mu of manutencoes.filter(m => m.status === 'concluida')) {
    const maq = maqById[mu.maquinaId]
    if (!maq) continue
    const secao = detectarSecaoEquipamento(maq, ASSINANTES_SECAO_ANTERO_REGO)
    if (!secao) continue
    const rel = relatorios.find(r => r.manutencaoId === mu.id)
    if (!rel) continue

    const entry = ASSINANTES_SECAO_ANTERO_REGO.find(e => e.secao === secao)
    const esperado = nomeEsperado(secao)
    const sigRef = secao === 'colisao' ? sigPaulo : sigFabio
    const nomeOk = normTexto(rel.nomeAssinante) === normTexto(esperado)
    const sigOk = rel.assinaturaDigital === sigRef

    if (nomeOk && sigOk) continue

    correcoes.push({
      rel,
      patch: {
        ...rel,
        nomeAssinante: esperado,
        assinaturaDigital: sigRef,
        assinadoPeloCliente: true,
      },
      sn: maq.numeroSerie,
      data: mu.data,
      de: rel.nomeAssinante,
      sigDe: rel.assinaturaDigital?.length,
      sigPara: sigRef.length,
    })
  }

  console.log(`Correcções: ${correcoes.length}`)
  for (const c of correcoes) {
    console.log(`  ${c.rel.numeroRelatorio} S/N ${c.sn} @ ${c.data}`)
    console.log(`    nome: "${c.de}" → "${c.patch.nomeAssinante}"`)
    console.log(`    sig: ${c.sigDe} → ${c.sigPara} bytes`)
    if (!DRY) await apiUpdate(token, c.patch)
  }
  if (DRY) console.log('(dry-run — nada gravado)')
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
