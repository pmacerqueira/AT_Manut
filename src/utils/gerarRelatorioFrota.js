/**
 * gerarRelatorioFrota – Relatório executivo de frota (PDF real via jsPDF).
 *
 * Secções:
 *  1. Capa / Índice resumido
 *  2. Dados do cliente
 *  3. KPIs globais
 *  4. Frota agrupada por categoria
 *  5. Manutenções em atraso (detalhe)
 *  6. Reparações concluídas (últimos 12 meses)
 *
 * Retorna Blob PDF (~30-120 KB, texto seleccionável).
 */
import { formatDataAzores, parseDateLocal } from './datasAzores'
import { APP_FOOTER_TEXT } from '../config/version'
import { EMPRESA } from '../constants/empresa'

const AZUL = [30, 58, 95]
const AZUL_CLARO = [235, 242, 252]
const VERDE = [22, 101, 52]
const VERDE_BG = [220, 252, 231]
const VERMELHO = [185, 28, 28]
const VERMELHO_BG = [254, 226, 226]
const LARANJA = [146, 64, 14]
const LARANJA_BG = [254, 243, 199]
const CINZA = [243, 244, 246]
const CINZA_BORDA = [209, 213, 219]
const TEXTO = [17, 24, 39]
const MUTED = [107, 114, 128]
const BRANCO = [255, 255, 255]

const W = 210

/** Formata uma data ISO (yyyy-mm-dd) para dd-mm-yyyy */
const fmtD = (dateStr) => {
  if (!dateStr) return '\u2014'
  const s = String(dateStr).slice(0, 10).split('-')
  if (s.length < 3) return String(dateStr)
  return `${s[2]}-${s[1]}-${s[0]}`
}
const M = 14
const CW = W - 2 * M

/**
 * @param {object}   cliente
 * @param {object[]} maquinas        – máquinas do cliente (já filtradas)
 * @param {object[]} manutencoes     – todas as manutenções
 * @param {object[]} relatorios      – todos os relatórios de manutenção
 * @param {object[]} reparacoes      – todas as reparações
 * @param {Function} getSubcategoria
 * @param {Function} getCategoria
 * @returns {Promise<Blob>}
 */
export async function gerarRelatorioFrotaPdf(
  cliente, maquinas, manutencoes, relatorios, reparacoes = [],
  getSubcategoria, getCategoria, options = {}
) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const hoje = new Date().toISOString().slice(0, 10)
  const hojeFormatado = formatDataAzores(hoje, true)
  const ano = new Date().getFullYear()
  const periodoCustom = !!options.periodoCustom
  const periodoLabel = options.periodoLabel || String(ano)

  // ── Pré-filtragem com Maps para O(1) lookup ─────────────────────────────
  const maqIds = new Set(maquinas.map(m => m.id))
  const manutsDoCliente = manutencoes.filter(mt => maqIds.has(mt.maquinaId))
  const repsDoCliente = reparacoes.filter(r => maqIds.has(r.maquinaId))
  const relMap = new Map(relatorios.filter(r => manutsDoCliente.some(mt => mt.id === r.manutencaoId)).map(r => [r.manutencaoId, r]))

  const manutsByMaq = new Map()
  manutsDoCliente.forEach(mt => {
    if (!manutsByMaq.has(mt.maquinaId)) manutsByMaq.set(mt.maquinaId, [])
    manutsByMaq.get(mt.maquinaId).push(mt)
  })
  const repsByMaq = new Map()
  repsDoCliente.forEach(r => {
    if (!repsByMaq.has(r.maquinaId)) repsByMaq.set(r.maquinaId, [])
    repsByMaq.get(r.maquinaId).push(r)
  })

  // ── Calcular estado por máquina ──────────────────────────────────────────
  const linhas = maquinas.map(m => {
    const sub = getSubcategoria(m.subcategoriaId)
    const cat = sub ? getCategoria(sub.categoriaId) : null
    const manutsM = manutsByMaq.get(m.id) || []
    const repsM = repsByMaq.get(m.id) || []
    const concluidas = manutsM.filter(mt => mt.status === 'concluida')
    const ultima = concluidas.sort((a, b) => b.data.localeCompare(a.data))[0]
    const proxima = manutsM
      .filter(mt => mt.status === 'agendada' || mt.status === 'pendente')
      .sort((a, b) => a.data.localeCompare(b.data))[0]
    const emAtraso = proxima && proxima.data < hoje
    const totalManuts = concluidas.length
    const totalReps = repsM.filter(r => r.status === 'concluida').length
    const repsAbertas = repsM.filter(r => r.status !== 'concluida').length
    const relUltima = ultima ? relMap.get(ultima.id) : null

    let diasAtraso = null
    if (proxima) {
      diasAtraso = Math.floor((parseDateLocal(hoje) - parseDateLocal(proxima.data)) / 86400000)
    }

    let estado
    if (!m.proximaManut) estado = 'instalar'
    else if (emAtraso) estado = 'atraso'
    else estado = 'conforme'

    return { m, sub, cat, ultima, proxima, emAtraso, diasAtraso, totalManuts, totalReps, repsAbertas, relUltima, estado }
  })

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalEquip = maquinas.length
  const totalAtraso = linhas.filter(l => l.estado === 'atraso').length
  const totalConformes = linhas.filter(l => l.estado === 'conforme').length
  const totalPorInstalar = linhas.filter(l => l.estado === 'instalar').length
  const taxaCumprimento = totalEquip > 0 ? Math.round((totalConformes / totalEquip) * 100) : 0
  const totalManutsAno = periodoCustom
    ? manutsDoCliente.filter(mt => mt.status === 'concluida').length
    : manutsDoCliente.filter(mt => mt.status === 'concluida' && mt.data?.startsWith(String(ano))).length
  const totalRepsAno = periodoCustom
    ? repsDoCliente.filter(r => r.status === 'concluida').length
    : repsDoCliente.filter(r => r.status === 'concluida' && r.data?.startsWith(String(ano))).length
  const totalRepsAbertas = linhas.reduce((s, l) => s + l.repsAbertas, 0)
  const pendentesAgendadas = manutsDoCliente.filter(mt => mt.status === 'pendente' || mt.status === 'agendada').length

  // ── Agrupar por categoria ────────────────────────────────────────────────
  const categoriasMap = new Map()
  linhas.forEach(l => {
    const catId = l.cat?.id || '_sem'
    const catNome = l.cat?.nome || 'Sem categoria'
    if (!categoriasMap.has(catId)) categoriasMap.set(catId, { nome: catNome, linhas: [] })
    categoriasMap.get(catId).linhas.push(l)
  })

  // ── Reparações recentes ──────────────────────────────────────────────────
  const umAnoAtras = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const repsRecentes = repsDoCliente
    .filter(r => r.status === 'concluida' && (periodoCustom || r.data >= umAnoAtras))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 25)

  // ── Helpers de desenho ───────────────────────────────────────────────────
  let y = 0
  const checkPage = (need = 12) => {
    if (y > 280 - need) { pdf.addPage(); y = 18; return true }
    return false
  }

  const drawHeader = () => {
    pdf.setFillColor(...AZUL)
    pdf.rect(0, 0, W, 24, 'F')
    pdf.setTextColor(...BRANCO)
    pdf.setFontSize(12); pdf.setFont('helvetica', 'bold')
    pdf.text('NAVEL-A\u00c7ORES', M, 10)
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal')
    pdf.text(`${EMPRESA.telefones}  \u2022  geral@navel.pt  \u2022  ${EMPRESA.web}`, M, 16)
    pdf.text(EMPRESA.nome, M, 21)
    y = 32
  }

  const drawSectionTitle = (title, color = AZUL) => {
    checkPage(16)
    pdf.setFillColor(...color)
    pdf.rect(M, y - 4, CW, 8, 'F')
    pdf.setTextColor(...BRANCO)
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold')
    pdf.text(title.toUpperCase(), M + 3, y + 0.5)
    y += 8
  }

  const drawFieldRow = (label, value, odd = false) => {
    if (odd) { pdf.setFillColor(...CINZA); pdf.rect(M, y - 3.5, CW, 7, 'F') }
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...MUTED); pdf.setFontSize(8)
    pdf.text(label, M + 2, y)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...TEXTO); pdf.setFontSize(9)
    const lines = pdf.splitTextToSize(String(value || '\u2014'), CW - 52)
    pdf.text(lines, M + 50, y)
    y += Math.max(7, lines.length * 4.5 + 2)
  }

  const drawKpiCard = (x, w, num, label, bgColor = CINZA, numColor = TEXTO) => {
    pdf.setFillColor(...bgColor)
    pdf.setDrawColor(...CINZA_BORDA)
    pdf.roundedRect(x, y, w, 18, 2, 2, 'FD')
    pdf.setTextColor(...numColor)
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold')
    pdf.text(String(num), x + w / 2, y + 9, { align: 'center' })
    pdf.setTextColor(...TEXTO)
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold')
    pdf.text(label.toUpperCase(), x + w / 2, y + 15.5, { align: 'center' })
  }

  const truncate = (str, max) => str && str.length > max ? str.slice(0, max - 1) + '\u2026' : (str || '\u2014')

  // ═══════════════════════════════════════════════════════════════════════════
  // PÁGINA 1: CAPA + ÍNDICE
  // ═══════════════════════════════════════════════════════════════════════════
  drawHeader()

  // Título do relatório
  pdf.setTextColor(...AZUL)
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold')
  pdf.text('Relat\u00f3rio Executivo de Frota', M, y); y += 8

  pdf.setFontSize(12); pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...TEXTO)
  pdf.text(cliente.nome || '\u2014', M, y); y += 6
  pdf.setFontSize(9); pdf.setTextColor(...MUTED)
  pdf.text(`Per\u00edodo: ${periodoLabel}  \u2022  Gerado em ${hojeFormatado}`, M, y); y += 12

  // Linha decorativa
  pdf.setDrawColor(...AZUL); pdf.setLineWidth(0.6)
  pdf.line(M, y, W - M, y); y += 10

  // Resumo executivo (mini KPIs na capa)
  pdf.setTextColor(...AZUL)
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold')
  pdf.text('Resumo executivo', M, y); y += 7

  const resumoItems = [
    ['Equipamentos na frota', String(totalEquip)],
    ['Taxa de conformidade', `${taxaCumprimento}%`],
    ['Manuten\u00e7\u00f5es em atraso', String(totalAtraso)],
    [`Manuten\u00e7\u00f5es executadas (${periodoLabel})`, String(totalManutsAno)],
    [`Repara\u00e7\u00f5es conclu\u00eddas (${periodoLabel})`, String(totalRepsAno)],
    ['Repara\u00e7\u00f5es em aberto', String(totalRepsAbertas)],
  ]
  pdf.setFontSize(9)
  resumoItems.forEach(([label, val], i) => {
    if (i % 2 === 0) { pdf.setFillColor(...CINZA); pdf.rect(M, y - 3.5, CW, 7.5, 'F') }
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...TEXTO)
    pdf.text(label, M + 3, y)
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...AZUL)
    pdf.text(val, W - M - 3, y, { align: 'right' })
    y += 7.5
  })
  y += 8

  // Índice
  pdf.setTextColor(...AZUL)
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold')
  pdf.text('\u00cdndice', M, y); y += 7

  const indexItems = [
    'Dados do cliente',
    'Indicadores globais (KPIs)',
    'Frota de equipamentos por categoria',
  ]
  if (totalAtraso > 0) indexItems.push(`Manuten\u00e7\u00f5es em atraso (${totalAtraso})`)
  if (repsRecentes.length > 0) indexItems.push(`Repara\u00e7\u00f5es conclu\u00eddas (\u00faltimos 12 meses)`)

  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...TEXTO)
  indexItems.forEach((item, i) => {
    pdf.text(`${i + 1}.  ${item}`, M + 4, y)
    y += 6
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // PÁGINA 2+: DADOS DO CLIENTE + KPIs
  // ═══════════════════════════════════════════════════════════════════════════
  pdf.addPage()
  drawHeader()

  drawSectionTitle('1. Dados do cliente')
  y += 2
  drawFieldRow('CLIENTE', cliente.nome, false)
  drawFieldRow('NIF', cliente.nif, true)
  drawFieldRow('MORADA', cliente.morada, false)
  drawFieldRow('C\u00d3D. POSTAL', cliente.codigoPostal, true)
  drawFieldRow('LOCALIDADE', cliente.localidade, false)
  drawFieldRow('TELEFONE', cliente.telefone, true)
  drawFieldRow('EMAIL', cliente.email, false)
  y += 6

  // KPIs
  drawSectionTitle('2. Indicadores globais (KPIs)')
  y += 3

  const kpiW = (CW - 10) / 5
  drawKpiCard(M, kpiW, totalEquip, 'Equipamentos', AZUL_CLARO, AZUL)
  drawKpiCard(M + kpiW + 2.5, kpiW, `${taxaCumprimento}%`, 'Conformidade',
    taxaCumprimento >= 80 ? VERDE_BG : taxaCumprimento >= 50 ? LARANJA_BG : VERMELHO_BG,
    taxaCumprimento >= 80 ? VERDE : taxaCumprimento >= 50 ? LARANJA : VERMELHO)
  drawKpiCard(M + (kpiW + 2.5) * 2, kpiW, totalAtraso, 'Em atraso',
    totalAtraso > 0 ? VERMELHO_BG : VERDE_BG,
    totalAtraso > 0 ? VERMELHO : VERDE)
  drawKpiCard(M + (kpiW + 2.5) * 3, kpiW, totalManutsAno, 'Manut. per\u00edodo', AZUL_CLARO, AZUL)
  drawKpiCard(M + (kpiW + 2.5) * 4, kpiW, totalRepsAno, 'Rep. per\u00edodo',
    totalRepsAbertas > 0 ? LARANJA_BG : CINZA, totalRepsAbertas > 0 ? LARANJA : TEXTO)
  y += 22

  // Resumo anual detalhado
  checkPage(30)
  const colW = (CW - 4) / 2
  const boxH = 28

  // Box manutenções
  pdf.setFillColor(...CINZA); pdf.setDrawColor(...CINZA_BORDA)
  pdf.roundedRect(M, y, colW, boxH, 2, 2, 'FD')
  pdf.setTextColor(...AZUL); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold')
  pdf.text(`MANUTEN\u00c7\u00d5ES \u2014 ${periodoLabel}`, M + 4, y + 6)
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...TEXTO)
  pdf.text('Executadas', M + 4, y + 12)
  pdf.setFont('helvetica', 'bold'); pdf.text(String(totalManutsAno), M + colW - 4, y + 12, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.text('Pendentes / Agendadas', M + 4, y + 18)
  pdf.setFont('helvetica', 'bold'); pdf.text(String(pendentesAgendadas), M + colW - 4, y + 18, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.text('Em atraso', M + 4, y + 24)
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...(totalAtraso > 0 ? VERMELHO : TEXTO))
  pdf.text(String(totalAtraso), M + colW - 4, y + 24, { align: 'right' })

  // Box reparações
  const xR = M + colW + 4
  pdf.setFillColor(...CINZA); pdf.setDrawColor(...CINZA_BORDA)
  pdf.roundedRect(xR, y, colW, boxH, 2, 2, 'FD')
  pdf.setTextColor(...AZUL); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold')
  pdf.text(`REPARA\u00c7\u00d5ES \u2014 ${periodoLabel}`, xR + 4, y + 6)
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...TEXTO)
  pdf.text('Conclu\u00eddas', xR + 4, y + 12)
  pdf.setFont('helvetica', 'bold'); pdf.text(String(totalRepsAno), xR + colW - 4, y + 12, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.text('Em curso / Pendentes', xR + 4, y + 18)
  pdf.setFont('helvetica', 'bold'); pdf.text(String(totalRepsAbertas), xR + colW - 4, y + 18, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.text(`Total interven\u00e7\u00f5es ${ano}`, xR + 4, y + 24)
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...AZUL)
  pdf.text(String(totalManutsAno + totalRepsAno), xR + colW - 4, y + 24, { align: 'right' })

  y += boxH + 8

  // ═══════════════════════════════════════════════════════════════════════════
  // FROTA POR CATEGORIA
  // ═══════════════════════════════════════════════════════════════════════════
  drawSectionTitle('3. Frota de equipamentos por categoria')
  y += 2

  const colDefs = [
    { label: 'Equipamento / N\u00ba S\u00e9rie', w: 52 },
    { label: '\u00daltima', w: 17, align: 'center' },
    { label: 'Pr\u00f3xima', w: 17, align: 'center' },
    { label: 'Dias', w: 13, align: 'center' },
    { label: 'Man.', w: 11, align: 'center' },
    { label: 'Rep.', w: 11, align: 'center' },
    { label: 'Estado', w: 22, align: 'center' },
    { label: '\u00dalt. rel.', w: 39, align: 'center' },
  ]

  const drawTableHeader = () => {
    checkPage(18)
    let x = M
    pdf.setFillColor(...AZUL)
    pdf.rect(M, y - 3.5, CW, 7, 'F')
    pdf.setTextColor(...BRANCO); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold')
    colDefs.forEach(col => {
      pdf.text(col.label.toUpperCase(), col.align === 'center' ? x + col.w / 2 : x + 1, y, col.align === 'center' ? { align: 'center' } : undefined)
      x += col.w
    })
    y += 5
  }

  const ROW_H = 11.5

  const drawEquipRow = (l, rowIdx) => {
    const { m, sub, ultima, proxima, diasAtraso, totalManuts, totalReps, relUltima, estado } = l
    if (y > 269) { pdf.addPage(); y = 18; drawTableHeader() }

    if (rowIdx % 2 === 0) {
      pdf.setFillColor(249, 250, 251)
      pdf.rect(M, y - 3.5, CW, ROW_H, 'F')
    }
    pdf.setDrawColor(...CINZA_BORDA); pdf.setLineWidth(0.15)
    pdf.line(M, y - 3.5 + ROW_H, M + CW, y - 3.5 + ROW_H)

    const y1 = y
    const y2 = y + 5.5

    // Compute column x starts from colDefs
    const xs = []
    let cx = M
    colDefs.forEach(col => { xs.push(cx); cx += col.w })

    const diasStr = diasAtraso != null
      ? (diasAtraso > 0 ? `+${diasAtraso}` : diasAtraso === 0 ? 'Hoje' : String(diasAtraso))
      : '\u2014'
    const diasColor = diasAtraso > 0 ? VERMELHO : diasAtraso != null && diasAtraso <= 0 ? VERDE : MUTED

    let estadoLabel, estadoColor
    if (estado === 'atraso') { estadoLabel = 'Em atraso'; estadoColor = VERMELHO }
    else if (estado === 'conforme') { estadoLabel = 'Conforme'; estadoColor = VERDE }
    else { estadoLabel = 'Por instalar'; estadoColor = LARANJA }

    const ultimaStr = ultima ? fmtD(ultima.data) : '\u2014'
    const proximaStr = proxima?.data ? fmtD(proxima.data) : (m.proximaManut ? fmtD(m.proximaManut) : '\u2014')
    const proximaColor = proxima?.data && proxima.data < hoje ? VERMELHO : VERDE

    // ── Linha 1: Marca Modelo (col 0) + todos os campos numéricos/estado
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...TEXTO)
    pdf.text(truncate(`${m.marca} ${m.modelo}`, 44), xs[0] + 1, y1)

    // Última (col 1)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(...TEXTO)
    pdf.text(ultimaStr, xs[1] + colDefs[1].w / 2, y1, { align: 'center' })

    // Próxima (col 2)
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...proximaColor)
    pdf.text(proximaStr, xs[2] + colDefs[2].w / 2, y1, { align: 'center' })

    // Dias (col 3)
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...diasColor)
    pdf.text(diasStr, xs[3] + colDefs[3].w / 2, y1, { align: 'center' })

    // Man. (col 4)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED)
    pdf.text(totalManuts ? String(totalManuts) : '\u2014', xs[4] + colDefs[4].w / 2, y1, { align: 'center' })

    // Rep. (col 5)
    pdf.text(totalReps ? String(totalReps) : '\u2014', xs[5] + colDefs[5].w / 2, y1, { align: 'center' })

    // Estado (col 6)
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...estadoColor)
    pdf.text(estadoLabel, xs[6] + colDefs[6].w / 2, y1, { align: 'center' })

    // Últ. rel. (col 7)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED)
    pdf.text(relUltima?.numeroRelatorio || '\u2014', xs[7] + colDefs[7].w / 2, y1, { align: 'center' })

    // ── Linha 2: Subcategoria · S/N (col 0) e nº série (cols seguintes)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(...MUTED)
    const subNome = sub ? sub.nome : ''
    const serieParts = [subNome, m.numeroSerie ? `S/N: ${m.numeroSerie}` : ''].filter(Boolean)
    const linha2Txt = serieParts.join('  \u00b7  ')
    if (linha2Txt) pdf.text(truncate(linha2Txt, 52), xs[0] + 1, y2)

    y += ROW_H
  }

  for (const [, grupo] of categoriasMap) {
    const grupoAtraso = grupo.linhas.filter(l => l.estado === 'atraso').length
    checkPage(24)

    // Cabeçalho de categoria
    pdf.setFillColor(...AZUL_CLARO); pdf.setDrawColor(...AZUL)
    pdf.rect(M, y - 3.5, CW, 7.5, 'F')
    pdf.setLineWidth(0.5); pdf.line(M, y - 3.5, M, y + 4)
    pdf.setTextColor(...AZUL); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold')
    const catText = `${grupo.nome} (${grupo.linhas.length} equip.${grupoAtraso > 0 ? ` \u2022 ${grupoAtraso} em atraso` : ''})`
    pdf.text(catText, M + 4, y + 0.5)
    y += 8

    drawTableHeader()

    grupo.linhas
      .sort((a, b) => (b.diasAtraso ?? -9999) - (a.diasAtraso ?? -9999))
      .forEach((l, i) => drawEquipRow(l, i))

    y += 4
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUTENÇÕES EM ATRASO
  // ═══════════════════════════════════════════════════════════════════════════
  if (totalAtraso > 0) {
    pdf.addPage()
    drawHeader()
    drawSectionTitle(`4. Manuten\u00e7\u00f5es em atraso (${totalAtraso})`, VERMELHO)
    y += 2

    const atrasoCols = [
      { label: 'Equipamento', w: 52 },
      { label: 'N\u00ba S\u00e9rie', w: 30 },
      { label: 'Data prevista', w: 26, align: 'center' },
      { label: 'Dias atraso', w: 20, align: 'center' },
      { label: 'Observa\u00e7\u00f5es', w: 54 },
    ]

    // header
    let x = M
    pdf.setFillColor(...VERMELHO)
    pdf.rect(M, y - 3.5, CW, 7, 'F')
    pdf.setTextColor(...BRANCO); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold')
    atrasoCols.forEach(col => {
      pdf.text(col.label.toUpperCase(), col.align === 'center' ? x + col.w / 2 : x + 1, y, col.align === 'center' ? { align: 'center' } : undefined)
      x += col.w
    })
    y += 5

    linhas.filter(l => l.estado === 'atraso')
      .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0))
      .forEach(({ m, sub, proxima, diasAtraso }, i) => {
        if (y > 272) { pdf.addPage(); y = 18 }
        if (i % 2 === 0) { pdf.setFillColor(254, 242, 242); pdf.rect(M, y - 3.5, CW, 7, 'F') }
        let cx = M
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...TEXTO)
        pdf.text(truncate(`${m.marca} ${m.modelo}${sub ? ` (${sub.nome})` : ''}`, 42), cx + 1, y); cx += 52
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED)
        pdf.text(truncate(m.numeroSerie, 22), cx + 1, y); cx += 30
        pdf.setTextColor(...VERMELHO); pdf.setFont('helvetica', 'bold')
        pdf.text(fmtD(proxima.data), cx + 13, y, { align: 'center' }); cx += 26
        pdf.text(`+${diasAtraso ?? 0}d`, cx + 10, y, { align: 'center' }); cx += 20
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED); pdf.setFontSize(6.5)
        pdf.text(truncate(proxima.observacoes, 50), cx + 1, y)
        y += 6.5
      })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPARAÇÕES RECENTES
  // ═══════════════════════════════════════════════════════════════════════════
  if (repsRecentes.length > 0) {
    const secNum = totalAtraso > 0 ? 5 : 4
    if (y > 240) { pdf.addPage(); drawHeader() }
    else { y += 4 }

    const repSecLabel = periodoCustom
      ? `${periodoLabel} \u2014 ${repsRecentes.length}`
      : `\u00faltimos 12 meses \u2014 ${repsRecentes.length}`
    drawSectionTitle(`${secNum}. Repara\u00e7\u00f5es conclu\u00eddas (${repSecLabel})`, LARANJA)
    y += 2

    const repCols = [
      { label: 'Equipamento', w: 48 },
      { label: 'N\u00ba S\u00e9rie', w: 28 },
      { label: 'Data', w: 22, align: 'center' },
      { label: 'Descri\u00e7\u00e3o', w: 84 },
    ]

    let x = M
    pdf.setFillColor(...LARANJA)
    pdf.rect(M, y - 3.5, CW, 7, 'F')
    pdf.setTextColor(...BRANCO); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold')
    repCols.forEach(col => {
      pdf.text(col.label.toUpperCase(), col.align === 'center' ? x + col.w / 2 : x + 1, y, col.align === 'center' ? { align: 'center' } : undefined)
      x += col.w
    })
    y += 5

    const maqMap = new Map(maquinas.map(m => [m.id, m]))
    repsRecentes.forEach((r, i) => {
      if (y > 272) { pdf.addPage(); y = 18 }
      if (i % 2 === 0) { pdf.setFillColor(254, 251, 235); pdf.rect(M, y - 3.5, CW, 7, 'F') }
      const maq = maqMap.get(r.maquinaId)
      let cx = M
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...TEXTO)
      pdf.text(truncate(maq ? `${maq.marca} ${maq.modelo}` : '\u2014', 36), cx + 1, y); cx += 48
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED)
      pdf.text(truncate(maq?.numeroSerie, 20), cx + 1, y); cx += 28
      pdf.setTextColor(...TEXTO)
      pdf.text(fmtD(r.data), cx + 11, y, { align: 'center' }); cx += 22
      pdf.setFontSize(6.5); pdf.setTextColor(...MUTED)
      pdf.text(truncate(r.descricao || r.descricaoAvaria || '', 80), cx + 1, y)
      y += 6.5
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RODAPÉ em todas as páginas
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = pdf.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFillColor(...AZUL)
    pdf.rect(0, 283, W, 14, 'F')
    pdf.setTextColor(160, 180, 210); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal')
    pdf.text(APP_FOOTER_TEXT, W / 2, 286, { align: 'center' })
    pdf.setFontSize(5.5)
    pdf.text(`${EMPRESA.divisaoComercial}  \u2022  ${EMPRESA.telefones}  \u2022  ${EMPRESA.web}`, W / 2, 291, { align: 'center' })
    if (totalPages > 1) {
      pdf.setTextColor(200, 210, 230)
      pdf.text(`P\u00e1gina ${p}/${totalPages}`, W - M, 293, { align: 'right' })
    }
  }

  return pdf.output('blob')
}

/**
 * Mantém a versão HTML para compatibilidade com envio de email.
 * Re-exporta da versão original (agora simplificada).
 */
export { gerarRelatorioFrotaPdf as gerarRelatorioFrota }
