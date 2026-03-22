/**
 * test-email-reports.js
 *
 * Gera 3 relatórios de teste (manutenção periódica, montagem, reparação)
 * com dados mock realistas, importando os geradores de HTML REAIS do projeto.
 * Envia cada relatório por email para comercial@navel.pt via send-report.php.
 * Guarda também os HTML em scripts/test-reports/ para inspeção visual.
 *
 * Uso:    node scripts/test-email-reports.js
 * Limpar: apagar scripts/test-reports/ e este ficheiro
 */
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── 1. Bundle dos geradores reais via esbuild ──────────────────────────────
console.log('\n  Bundling report generators (esbuild)...')

const esbuild = await import('esbuild')
const entryCode = `
export { relatorioParaHtml } from './src/utils/relatorioHtml.js'
export { relatorioReparacaoParaHtml } from './src/utils/relatorioReparacaoHtml.js'
`
const bundleResult = await esbuild.build({
  stdin: { contents: entryCode, resolveDir: ROOT, loader: 'js' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'node18',
})

const bundlePath = join(__dirname, '_tmp_bundle.mjs')
writeFileSync(bundlePath, bundleResult.outputFiles[0].text)

const mod = await import(pathToFileURL(bundlePath).href)
const { relatorioParaHtml, relatorioReparacaoParaHtml } = mod
rmSync(bundlePath, { force: true })

console.log('  Generators loaded.\n')

// ─── 2. Dados mock realistas ─────────────────────────────────────────────────
const LOGO = 'https://www.navel.pt/manut/logo-navel.png'

const CLIENTE = {
  nome: 'Auto Açoreana - Comércio de Automóveis, Lda.',
  nif: '512345678',
  localidade: 'Ponta Delgada',
  telefone: '296 123 456',
  email: 'comercial@navel.pt',
  morada: 'Rua do Comércio, 123, 9500-321 Ponta Delgada',
}

const MAQUINA = {
  id: 'test-maq-001',
  marca: 'RAVAGLIOLI',
  modelo: 'KPX 337.55 A',
  numeroSerie: 'RAV-2024-00542',
  subcategoriaId: 'sub-elevadores-2col',
  anoFabrico: 2024,
  periodicidadeManut: 'trimestral',
  proximaManut: '2026-06-15',
  numeroDocumentoVenda: 'FT 2024/00892',
}

const CHECKLIST = [
  { id: 'ck1', texto: 'Inspeção visual da estrutura e apoios de fixação ao solo' },
  { id: 'ck2', texto: 'Verificação das ligações elétricas e cablagem' },
  { id: 'ck3', texto: 'Teste do sistema hidráulico (pressão e estanquicidade)' },
  { id: 'ck4', texto: 'Verificação do nível e estado do óleo hidráulico' },
  { id: 'ck5', texto: 'Teste do sistema de segurança mecânico (travas)' },
  { id: 'ck6', texto: 'Verificação e medição dos cabos de aço (desgaste)' },
  { id: 'ck7', texto: 'Lubrificação de todos os pontos de articulação' },
  { id: 'ck8', texto: 'Teste funcional completo com carga nominal' },
  { id: 'ck9', texto: 'Verificação dos batentes de segurança e fins de curso' },
  { id: 'ck10', texto: 'Inspeção dos cilindros hidráulicos (fugas, desgaste)' },
  { id: 'ck11', texto: 'Verificação do estado dos braços de elevação' },
  { id: 'ck12', texto: 'Teste do dispositivo de paragem de emergência' },
]

const TECNICO = {
  nome: 'Aldevino Costa',
  telefone: '912 345 678',
  assinaturaDigital: '',
}

const PROXIMAS = [
  { data: '2026-06-15', periodicidade: 'trimestral', tecnico: 'Aldevino Costa' },
  { data: '2026-09-15', periodicidade: 'trimestral', tecnico: 'A designar' },
  { data: '2026-12-15', periodicidade: 'trimestral', tecnico: 'A designar' },
  { data: '2027-03-15', periodicidade: 'trimestral', tecnico: 'A designar' },
]

// Imagem de teste (10x10 quadrado azul Navel)
const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAHElEQVQY02P4/58BFTAyMIwqHFU4qnBUIaUKAQAHbgIKhRNb3wAAAABJRU5ErkJggg=='

// ─── 2a. Mock: MANUTENÇÃO PERIÓDICA ─────────────────────────────────────────
const relPerio = {
  id: 'test-rel-001',
  numeroRelatorio: 'MNT-2026-TEST-001',
  tecnico: 'Aldevino Costa',
  notas:
    'Manutenção preventiva trimestral efetuada sem anomalias significativas. ' +
    'Detetado ligeiro desgaste na junta tórica do cilindro esquerdo — agendada substituição para a próxima intervenção. ' +
    'Óleo hidráulico substituído conforme plano de manutenção. Todos os pontos de articulação lubrificados.',
  checklistRespostas: {
    ck1: 'sim', ck2: 'sim', ck3: 'sim', ck4: 'nao', ck5: 'sim',
    ck6: 'sim', ck7: 'sim', ck8: 'sim', ck9: 'sim', ck10: 'sim',
    ck11: 'sim', ck12: 'sim',
  },
  fotos: [IMG, IMG],
  pecasUsadas: [
    { posicao: '1', codigoArtigo: 'HYD-OIL-10L', descricao: 'Óleo hidráulico HLP 32 (10L)', quantidade: 1, unidade: 'un', usado: true },
    { posicao: '2', codigoArtigo: 'FLT-HYD-001', descricao: 'Filtro hidráulico', quantidade: 1, unidade: 'un', usado: true },
    { posicao: '3', codigoArtigo: 'JNT-TOR-042', descricao: 'Junta tórica ø42mm', quantidade: 2, unidade: 'un', usado: false },
    { posicao: '4', codigoArtigo: 'LUB-GRS-500', descricao: 'Massa lubrificante EP2 (500g)', quantidade: 1, unidade: 'un', usado: true },
  ],
  assinaturaDigital: '',
  nomeAssinante: 'Manuel Santos',
  dataAssinatura: '2026-03-12T14:30:00Z',
  dataCriacao: '2026-03-12T10:00:00Z',
}

const manutPerio = {
  id: 'test-mnt-001',
  data: '2026-03-12',
  tipo: 'periodica',
  tecnico: 'Aldevino Costa',
  periodicidade: 'trimestral',
  horasTotais: 1250,
  horasServico: 3.5,
}

// ─── 2b. Mock: MONTAGEM ─────────────────────────────────────────────────────
const relMontagem = {
  ...relPerio,
  id: 'test-rel-002',
  numeroRelatorio: 'MNT-2026-TEST-002',
  notas:
    'Montagem concluída com sucesso. Equipamento instalado, nivelado e testado. ' +
    'Cliente informado sobre todos os procedimentos de segurança e manuseamento do equipamento. ' +
    'Entregue manual de utilizador e declaração de conformidade CE.',
  fotos: [IMG],
  checklistRespostas: {
    ck1: 'sim', ck2: 'sim', ck3: 'sim', ck4: 'sim', ck5: 'sim',
    ck6: 'sim', ck7: 'sim', ck8: 'sim', ck9: 'sim', ck10: 'sim',
    ck11: 'sim', ck12: 'sim',
  },
  pecasUsadas: [],
  dataCriacao: '2026-03-10T09:00:00Z',
  dataAssinatura: '2026-03-10T16:45:00Z',
}

const manutMontagem = {
  id: 'test-mnt-002',
  data: '2026-03-10',
  tipo: 'montagem',
  tecnico: 'Aldevino Costa',
  periodicidade: 'trimestral',
}

// ─── 2c. Mock: REPARAÇÃO ────────────────────────────────────────────────────
const relReparacao = {
  id: 'test-relrep-001',
  numeroRelatorio: 'REP-2026-TEST-001',
  tecnico: 'Aldevino Costa',
  dataCriacao: '2026-03-11T08:30:00Z',
  dataAssinatura: '2026-03-11T17:00:00Z',
  dataRealizacao: '2026-03-11',
  descricaoAvaria:
    'Cliente reportou falha no sistema hidráulico — elevador não sobe para além dos 80 cm de altura. ' +
    'Indicador de pressão abaixo do mínimo recomendado (< 150 bar). Sem fugas visíveis à primeira inspeção.',
  trabalhoRealizado:
    'Diagnosticada fuga interna na válvula distribuidora principal. ' +
    'Substituída válvula distribuidora e respetivas juntas de vedação. ' +
    'Purga completa do circuito hidráulico e reabastecimento com óleo novo HLP 32. ' +
    'Calibração do manómetro de pressão. Teste funcional completo com carga de 3000 kg — sem anomalias detetadas.',
  pecasUsadas: JSON.stringify([
    { codigo: 'VLV-DST-001', descricao: 'Válvula distribuidora hidráulica completa', quantidade: 1 },
    { codigo: 'JNT-VED-018', descricao: 'Kit juntas de vedação para válvula distribuidora', quantidade: 1 },
    { codigo: 'HYD-OIL-5L', descricao: 'Óleo hidráulico HLP 32 (5L)', quantidade: 2 },
  ]),
  checklistRespostas: JSON.stringify({
    'ck-rep-1': 'OK',
    'ck-rep-2': 'OK',
    'ck-rep-3': 'NOK',
    'ck-rep-4': 'OK',
  }),
  fotos: JSON.stringify([IMG, IMG, IMG]),
  notas: 'Recomenda-se verificação da pressão hidráulica na próxima manutenção preventiva agendada para 15/06/2026. Garantia da reparação: 6 meses.',
  assinaturaDigital: '',
  nomeAssinante: 'Manuel Santos',
  numeroAviso: 'AV-2026-00089',
  horasMaoObra: 4.5,
}

const reparacao = { id: 'test-rep-001', data: '2026-03-11', origem: null }

const checklistRep = [
  { id: 'ck-rep-1', texto: 'Verificação do circuito hidráulico (pressão e estanquicidade)' },
  { id: 'ck-rep-2', texto: 'Teste de estanquicidade pós-reparação' },
  { id: 'ck-rep-3', texto: 'Calibração do manómetro de pressão' },
  { id: 'ck-rep-4', texto: 'Teste funcional com carga nominal (3000 kg)' },
]

// ─── 3. Gerar HTML usando os geradores reais ─────────────────────────────────
console.log('  Generating report HTML...\n')

const opts = (proximas = PROXIMAS) => ({
  subcategoriaNome: 'Elevadores de 2 colunas',
  categoriaNome: 'Elevadores de veículos',
  logoUrl: LOGO,
  tecnicoObj: TECNICO,
  proximasManutencoes: proximas,
})

const htmlPerio    = relatorioParaHtml(relPerio, manutPerio, MAQUINA, CLIENTE, CHECKLIST, opts())
const htmlMontagem = relatorioParaHtml(relMontagem, manutMontagem, MAQUINA, CLIENTE, CHECKLIST, opts())
const htmlRepara   = relatorioReparacaoParaHtml(relReparacao, reparacao, MAQUINA, CLIENTE, checklistRep, {
  subcategoriaNome: 'Elevadores de 2 colunas',
  categoriaNome: 'Elevadores de veículos',
  logoUrl: LOGO,
  tecnicoObj: TECNICO,
})

// Extrair o <style> e o conteúdo do <body> — evita que o send-report.php
// mostre artefactos "<html>" quando faz strip_tags
function extractEmailHtml(fullHtml) {
  const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const styleBlock = styleMatch ? `<style>${styleMatch[1]}</style>` : ''
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : fullHtml
  return styleBlock + bodyContent
}

const reports = [
  { label: 'Manutencao Periodica', file: '1-manutencao-periodica.html', html: htmlPerio,
    subject: '[TESTE v2] Relatorio de Manutencao - RAVAGLIOLI KPX 337.55 A (12/03/2026) - Navel' },
  { label: 'Montagem', file: '2-montagem.html', html: htmlMontagem,
    subject: '[TESTE v2] Relatorio de Montagem - RAVAGLIOLI KPX 337.55 A (10/03/2026) - Navel' },
  { label: 'Reparacao', file: '3-reparacao.html', html: htmlRepara,
    subject: '[TESTE v2] Relatorio de Reparacao REP-2026-TEST-001 - RAVAGLIOLI KPX 337.55 A - Navel' },
]

// ─── 4. Guardar HTML para inspeção visual ────────────────────────────────────
const outDir = join(__dirname, 'test-reports')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

for (const r of reports) {
  writeFileSync(join(outDir, r.file), r.html, 'utf-8')
  console.log(`  ${r.file} (${(r.html.length / 1024).toFixed(1)} KB)`)
}
console.log(`\n  HTML previews: scripts/test-reports/\n`)

// ─── 5. Enviar por email via send-report.php ─────────────────────────────────
const ENDPOINT = 'https://www.navel.pt/api/send-report.php'
const AUTH     = 'Navel2026$Api!Key#xZ99'
const DEST     = 'comercial@navel.pt'

async function send(label, subject, html) {
  process.stdout.write(`  ${label}... `)
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: AUTH,
        destinatario: DEST,
        cc: DEST,
        assunto: subject,
        corpoHtml: html,
      }),
    })
    const json = await resp.json().catch(() => ({ ok: false, message: `HTTP ${resp.status}` }))
    if (resp.ok && json.ok) {
      console.log('OK')
      return true
    }
    console.log(`FALHOU: ${json.message ?? json.erro ?? 'Erro desconhecido'}`)
    return false
  } catch (err) {
    console.log(`ERRO: ${err.message}`)
    return false
  }
}

console.log('='.repeat(60))
console.log(`  Destino:  ${DEST}`)
console.log(`  Endpoint: ${ENDPOINT}`)
console.log('='.repeat(60) + '\n')

const results = []
for (const r of reports) {
  results.push(await send(r.label, r.subject, extractEmailHtml(r.html)))
}

const ok = results.filter(Boolean).length
console.log(`\n${'='.repeat(60)}`)
console.log(`  Resultado: ${ok}/${results.length} emails enviados`)
if (ok === results.length) {
  console.log('  Verifica a caixa de comercial@navel.pt!')
} else {
  console.log('  Alguns emails falharam - verificar acima.')
}
console.log('='.repeat(60) + '\n')
