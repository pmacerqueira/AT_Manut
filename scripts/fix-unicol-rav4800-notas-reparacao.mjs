/**
 * Actualiza notas dos relatórios RAV4800 437 — reparação (2025) vs verificação (2026).
 * Uso: node scripts/fix-unicol-rav4800-notas-reparacao.mjs [--dry]
 */
const API = 'https://navel.pt/api/data.php'
const DRY = process.argv.includes('--dry')

const NOTAS_2025_MP_00013 = [
  'Equipamento em bom estado geral',
  'Manutenção e reparação das guias de cabo de aço de sincronização e dos cabos de segurança do elevador',
  'Reajuste dos suportes de segurança e das trancas de segurança',
  'Afinação dos cabos de aço e dos fins-de-curso',
  'Limpeza geral e relubrificação de todos os pontos, de todas as guias e cabos de aço',
  'Conforme OB02/4244',
].join('\n')

const NOTAS_2026_MP_00131 = [
  'Equipamento em bom estado geral',
  'Verificação de todas as guias e roldanas, com limpeza e relubrificação, na sequência da reparação feita em 14.05.2025',
  'Verificação e afinação da tensão dos cabos de aço, com relubrificação',
  'Verificação do bom funcionamento das trancas de segurança e dos fins-de-curso',
  'Teste em funcionamento',
  'Recomendação: substituição preventiva do conjunto de cabos por um novo — trabalho a realizar na próxima manutenção',
].join('\n')

const UPDATES = [
  { numero: '2025.MP.00013', notas: NOTAS_2025_MP_00013 },
  { numero: '2026.MP.00131', notas: NOTAS_2026_MP_00131 },
]

async function login() {
  const form = new URLSearchParams()
  form.set('_t', '')
  form.set('r', 'auth')
  form.set('action', 'login')
  form.set('username', 'Admin')
  form.set('password', 'admin123%')
  const json = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form.toString(),
  }).then(r => r.json())
  if (!json.ok) throw new Error(`Login: ${json.message}`)
  return json.data.token
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== PRODUÇÃO ===')
  const token = await login()
  const relatorios = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _t: token, r: 'relatorios', action: 'list' }),
  }).then(r => r.json()).then(j => j.data)

  for (const { numero, notas } of UPDATES) {
    const rel = relatorios.find(r => r.numeroRelatorio === numero)
    if (!rel) throw new Error(`Relatório ${numero} não encontrado`)
    console.log(`\n${numero}:`)
    notas.split('\n').forEach(l => console.log(`  • ${l}`))
    if (DRY) continue
    const resp = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _t: token,
        r: 'relatorios',
        action: 'update',
        id: rel.id,
        data: { ...rel, notas },
      }),
    }).then(r => r.json())
    if (!resp.ok) throw new Error(`${numero}: ${resp.message}`)
    console.log('  → gravado')
  }
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
