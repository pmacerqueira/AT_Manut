/**
 * Normaliza assinantes ANTERO REGO: nomes canónicos + assinatura da secção correcta.
 * Uso: node scripts/fix-antero-rego-assinantes.mjs [--dry]
 */
import {
  ANTERO_REGO_NIF,
  ASSINANTES_SECAO_ANTERO_REGO,
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

function assinaturaReferencia(relatorios, nomeCanonico) {
  const alvo = normTexto(nomeCanonico)
  let best = null
  let bestTs = ''
  for (const r of relatorios) {
    if (!r.assinaturaDigital || !r.nomeAssinante) continue
    if (normTexto(r.nomeAssinante) !== alvo) continue
    const ts = r.dataAssinatura || r.dataCriacao || ''
    if (ts >= bestTs) {
      bestTs = ts
      best = r.assinaturaDigital
    }
  }
  return best
}

function nomeCorrespondeSecao(nomeAssinante, secao) {
  const esperado = nomeEsperado(secao)
  if (!esperado) return true
  const n = normTexto(nomeAssinante)
  const e = normTexto(esperado)
  if (n === e) return true
  const prefixo = e.split(' - ')[0]
  const sufixo = e.split(' - ')[1] || ''
  if (secao === 'mecanica' && n.includes('fabio') && n.includes('cordeiro') && !n.includes('colisao')) return false
  if (secao === 'colisao' && n.includes('fabio') && n.includes('mecanica')) return false
  if (secao === 'colisao' && n === normTexto('Paulo Sousa')) return false
  if (secao === 'mecanica' && n === normTexto('Fabio Cordeiro')) return false
  return n.includes(prefixo) && (!sufixo || n.includes(sufixo))
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()
  const [maquinas, manutencoes, relatorios] = await Promise.all([
    apiList(token, 'maquinas'),
    apiList(token, 'manutencoes'),
    apiList(token, 'relatorios'),
  ])

  const maqById = Object.fromEntries(
    maquinas
      .filter(m => String(m.clienteNif || m.clienteId) === ANTERO_REGO_NIF)
      .map(m => [m.id, m]),
  )

  const sigFabio = assinaturaReferencia(relatorios, 'Fabio Cordeiro - MECANICA')
  const sigPaulo = assinaturaReferencia(relatorios, 'Paulo Sousa - COLISAO')
  if (!sigFabio || !sigPaulo) throw new Error('Assinaturas de referência em falta (Abr/2026?)')

  const correcoes = []
  for (const mu of manutencoes.filter(m => m.status === 'concluida')) {
    const maq = maqById[mu.maquinaId]
    if (!maq) continue
    const secao = detectarSecaoEquipamento(maq, ASSINANTES_SECAO_ANTERO_REGO)
    if (!secao) continue
    const rel = relatorios.find(r => r.manutencaoId === mu.id)
    if (!rel) continue

    const esperado = nomeEsperado(secao)
    const sigRef = secao === 'colisao' ? sigPaulo : sigFabio
    const nomeOk = normTexto(rel.nomeAssinante) === normTexto(esperado)
    const secaoOk = nomeCorrespondeSecao(rel.nomeAssinante, secao)

    if (nomeOk && secaoOk) continue

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
      para: esperado,
    })
  }

  console.log(`Correcções: ${correcoes.length}`)
  for (const c of correcoes) {
    console.log(`  ${c.rel.numeroRelatorio} S/N ${c.sn} @ ${c.data}`)
    console.log(`    "${c.de}" → "${c.para}"`)
    if (!DRY) await apiUpdate(token, c.patch)
  }
  if (DRY) console.log('(dry-run — nada gravado)')
}

main().catch(err => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
