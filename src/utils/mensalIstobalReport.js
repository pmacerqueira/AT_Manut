/**
 * Relatório mensal ISTOBAL — dados normalizados, PDF (jsPDF) e HTML (email).
 */
import { formatDataAzores } from './datasAzores'
import { escapeHtml } from './sanitize'
import { APP_FOOTER_TEXT } from '../config/version'
import { EMPRESA } from '../constants/empresa'

const ESTADO_LABEL = {
  pendente: 'Pendente',
  em_progresso: 'Em progresso',
  concluida: 'Concluída',
}

function parsePecas(rel) {
  if (!rel?.pecasUsadas) return []
  try {
    const p = typeof rel.pecasUsadas === 'string' ? JSON.parse(rel.pecasUsadas) : rel.pecasUsadas
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

/**
 * Cliente de faturação ISTOBAL (ficha com email) — primeiro nome que contenha "istobal".
 */
export function findClienteIstobalFaturacao(clientes = []) {
  const list = [...clientes].sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt'))
  return list.find(c => /istobal/i.test(c.nome ?? '') && String(c.email ?? '').trim()) ?? null
}

/**
 * @param {object[]} reparacoesMensais - já filtradas pelo mês
 * @param {object} mesMensal - { ano, mes }
 * @param {string[]} mesesPt - MESES_PT
 */
export function buildMensalIstobalPayload(
  reparacoesMensais,
  mesMensal,
  mesesPt,
  getMaquina,
  getCliente,
  getRelatorioByReparacao
) {
  const { ano, mes } = mesMensal
  const periodoLabel = `${mesesPt[mes]} ${ano}`
  const hoje = new Date().toISOString().slice(0, 10)

  const mapRow = (r) => {
    const maq = getMaquina(r.maquinaId)
    const cli = maq ? getCliente(maq.clienteNif) : null
    const rel = getRelatorioByReparacao(r.id)
    const pecas = parsePecas(rel)
    const horas = rel?.horasMaoObra != null && rel.horasMaoObra !== '' ? parseFloat(rel.horasMaoObra) : null
    return {
      dataFmt: formatDataAzores(r.data),
      aviso: r.numeroAviso ?? '—',
      maquina: maq ? `${maq.marca} ${maq.modelo}` : '—',
      cliente: cli?.nome ?? '—',
      estado: ESTADO_LABEL[r.status] ?? r.status ?? '—',
      relatorio: rel?.numeroRelatorio ?? '—',
      horas: Number.isFinite(horas) ? horas : null,
      pecas: pecas.map(p => ({
        codigo: p.codigo ?? '—',
        descricao: p.descricao ?? '—',
        quantidade: p.quantidade ?? '—',
      })),
    }
  }

  const ist = reparacoesMensais.filter(r => r.origem === 'istobal_email')
  const man = reparacoesMensais.filter(r => r.origem !== 'istobal_email')
  const rowsIstobal = ist.map(mapRow)
  const rowsManual = man.map(r => {
    const base = mapRow(r)
    return {
      dataFmt: base.dataFmt,
      aviso: base.aviso,
      maquina: base.maquina,
      cliente: base.cliente,
      estado: base.estado,
      relatorio: base.relatorio,
    }
  })

  const horasFaturar = rowsIstobal.reduce((acc, row) => acc + (row.horas ?? 0), 0)

  return {
    periodoLabel,
    mesNome: mesesPt[mes],
    ano,
    geradoEm: formatDataAzores(hoje, true),
    kpis: {
      avisosIstobal: ist.length,
      concluidos: ist.filter(r => r.status === 'concluida').length,
      emCurso: ist.filter(r => r.status !== 'concluida').length,
      horasFaturar,
      totalReparacoesMes: reparacoesMensais.length,
    },
    rowsIstobal,
    rowsManual,
  }
}

const AZUL = [30, 58, 95]
const CINZA = [243, 244, 246]
const CINZA_BORDA = [209, 213, 219]
const TEXTO = [17, 24, 39]
const MUTED = [107, 114, 128]
const BRANCO = [255, 255, 255]
const W = 210
const M = 14
const CW = W - 2 * M

/**
 * @param {Awaited<ReturnType<typeof buildMensalIstobalPayload>>} payload
 * @returns {Promise<Blob>}
 */
export async function gerarRelatorioMensalIstobalPdf(payload) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { loadImageAsDataUrl, addImageFitInBoxMm } = await import('./gerarPdfRelatorio')

  let logoDataUrl = null
  try {
    logoDataUrl = await loadImageAsDataUrl(`${import.meta.env.BASE_URL}logo-navel.png`)
  } catch (_) { /* ok */ }

  let y = 0
  const checkPage = (need = 14) => {
    if (y > 280 - need) {
      pdf.addPage()
      y = 18
      return true
    }
    return false
  }

  const headerH = 28
  pdf.setFillColor(...AZUL)
  pdf.rect(0, 0, W, headerH, 'F')
  if (logoDataUrl) {
    try {
      const lW = 38
      const lH = 12
      const pad = 3
      const r = 3
      const bx = M
      const by = (headerH - lH - pad * 2) / 2
      const bw = lW + pad * 2
      const bh = lH + pad * 2
      pdf.setFillColor(...BRANCO)
      pdf.roundedRect(bx, by, bw, bh, r, r, 'F')
      addImageFitInBoxMm(pdf, logoDataUrl, bx + pad, by + pad, lW, lH)
    } catch (_) { /* */ }
  }
  const txR = W - M
  pdf.setTextColor(...BRANCO)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Jos\u00e9 Gon\u00e7alves Cerqueira (NAVEL \u2013 A\u00c7ORES), Lda.', txR, 9, { align: 'right' })
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text("Pico d'Agua Park \u2022 www.navel.pt", txR, 15, { align: 'right' })
  pdf.text('S\u00e3o Miguel\u2013A\u00e7ores', txR, 21, { align: 'right' })
  y = headerH + 8

  pdf.setTextColor(...AZUL)
  pdf.setFontSize(15)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Relat\u00f3rio Mensal ISTOBAL', M, y)
  y += 7
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...TEXTO)
  pdf.text(`Per\u00edodo: ${payload.periodoLabel}`, M, y)
  y += 5
  pdf.setFontSize(8)
  pdf.setTextColor(...MUTED)
  pdf.text(`Gerado em ${payload.geradoEm}`, M, y)
  y += 10

  const { kpis } = payload
  pdf.setFillColor(...CINZA)
  pdf.setDrawColor(...CINZA_BORDA)
  pdf.roundedRect(M, y, CW, 22, 2, 2, 'FD')
  pdf.setTextColor(...TEXTO)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  const kpiLine = [
    `Avisos ISTOBAL: ${kpis.avisosIstobal}`,
    `Conclu\u00eddos: ${kpis.concluidos}`,
    `Em curso: ${kpis.emCurso}`,
    `Horas M.O. (faturar): ${kpis.horasFaturar.toFixed(1)} h`,
    `Total repara\u00e7\u00f5es no m\u00eas: ${kpis.totalReparacoesMes}`,
  ].join('   \u2022   ')
  const kpiLines = pdf.splitTextToSize(kpiLine, CW - 6)
  pdf.text(kpiLines, M + 3, y + 6)
  y += 26

  const truncate = (s, max) => {
    const t = String(s ?? '\u2014')
    return t.length > max ? t.slice(0, max - 1) + '\u2026' : t
  }

  const col = {
    d: M,
    av: M + 18,
    mq: M + 44,
    cl: M + 88,
    st: M + 132,
    rl: M + 158,
    ho: M + 182,
  }

  const drawTableHeader = () => {
    checkPage(12)
    pdf.setFillColor(...AZUL)
    pdf.rect(M, y - 1, CW, 7, 'F')
    pdf.setTextColor(...BRANCO)
    pdf.setFontSize(6.5)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Data', col.d + 1, y + 4)
    pdf.text('Aviso', col.av, y + 4)
    pdf.text('M\u00e1quina', col.mq, y + 4)
    pdf.text('Cliente', col.cl, y + 4)
    pdf.text('Est.', col.st, y + 4)
    pdf.text('Rel.', col.rl, y + 4)
    pdf.text('H.MO', col.ho, y + 4)
    y += 9
  }

  if (payload.rowsIstobal.length === 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(...MUTED)
    pdf.setFontSize(9)
    pdf.text('Nenhum aviso ISTOBAL neste per\u00edodo.', M, y)
    y += 10
  } else {
    pdf.setTextColor(...AZUL)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Avisos ISTOBAL', M, y)
    y += 6
    drawTableHeader()
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...TEXTO)
    pdf.setFontSize(6.2)

    for (const row of payload.rowsIstobal) {
      const hStr = row.horas != null ? `${row.horas.toFixed(1)}` : '\u2014'
      const rowH = 5.5
      checkPage(rowH + (row.pecas.length ? 4 + row.pecas.length * 3.5 : 0))
      pdf.setDrawColor(...CINZA_BORDA)
      pdf.line(M, y + rowH, W - M, y + rowH)
      pdf.text(truncate(row.dataFmt, 12), col.d + 1, y + 4)
      pdf.text(truncate(row.aviso, 14), col.av, y + 4)
      pdf.text(truncate(row.maquina, 22), col.mq, y + 4)
      pdf.text(truncate(row.cliente, 20), col.cl, y + 4)
      pdf.text(truncate(row.estado, 10), col.st, y + 4)
      pdf.text(truncate(row.relatorio, 10), col.rl, y + 4)
      pdf.text(hStr, col.ho, y + 4)
      y += rowH + 1
      if (row.pecas.length > 0) {
        pdf.setFontSize(5.8)
        pdf.setTextColor(...MUTED)
        pdf.text('  Materiais / consum\u00edveis:', col.d + 2, y + 3)
        y += 4
        for (const p of row.pecas) {
          checkPage(4)
          const line = `  \u2022 ${truncate(p.codigo, 16)}  ${truncate(p.descricao, 55)}  qtd ${p.quantidade}`
          pdf.text(line, col.d + 2, y + 3)
          y += 3.5
        }
        pdf.setFontSize(6.2)
        pdf.setTextColor(...TEXTO)
      }
    }

    if (kpis.horasFaturar > 0) {
      checkPage(10)
      y += 2
      pdf.setDrawColor(...AZUL)
      pdf.setLineWidth(0.4)
      pdf.line(M, y, W - M, y)
      y += 5
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('Total horas a faturar \u00e0 ISTOBAL:', W - M - 55, y, { align: 'right' })
      pdf.setTextColor(...AZUL)
      pdf.text(`${kpis.horasFaturar.toFixed(1)} h`, W - M, y, { align: 'right' })
      pdf.setTextColor(...TEXTO)
      y += 8
    }
  }

  if (payload.rowsManual.length > 0) {
    checkPage(20)
    pdf.setTextColor(...TEXTO)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Repara\u00e7\u00f5es manuais (mesmo m\u00eas)', M, y)
    y += 6
    checkPage(12)
    pdf.setFillColor(...AZUL)
    pdf.rect(M, y - 1, CW, 7, 'F')
    pdf.setTextColor(...BRANCO)
    pdf.setFontSize(6.5)
    pdf.text('Data', col.d + 1, y + 4)
    pdf.text('Aviso', col.av, y + 4)
    pdf.text('M\u00e1quina', col.mq, y + 4)
    pdf.text('Cliente', col.cl, y + 4)
    pdf.text('Est.', col.st, y + 4)
    pdf.text('Rel.', col.rl, y + 4)
    y += 9
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...TEXTO)
    pdf.setFontSize(6.2)
    for (const row of payload.rowsManual) {
      checkPage(8)
      pdf.line(M, y + 5.5, W - M, y + 5.5)
      pdf.text(truncate(row.dataFmt, 12), col.d + 1, y + 4)
      pdf.text(truncate(row.aviso, 14), col.av, y + 4)
      pdf.text(truncate(row.maquina, 22), col.mq, y + 4)
      pdf.text(truncate(row.cliente, 20), col.cl, y + 4)
      pdf.text(truncate(row.estado, 10), col.st, y + 4)
      pdf.text(truncate(row.relatorio, 10), col.rl, y + 4)
      y += 6.5
    }
    y += 4
  }

  checkPage(12)
  pdf.setFontSize(7)
  pdf.setTextColor(...MUTED)
  pdf.setFont('helvetica', 'normal')
  pdf.text(APP_FOOTER_TEXT, W / 2, 288, { align: 'center' })

  return pdf.output('blob')
}

/**
 * HTML para corpo de email (fragmento, compatível Outlook).
 */
export function gerarRelatorioMensalIstobalHtml(payload, options = {}) {
  const emailFragment = !!options.emailFragment
  const esc = escapeHtml
  const { periodoLabel, geradoEm, kpis, rowsIstobal, rowsManual } = payload
  const azul = '#1a4880'
  const muted = '#6b7280'

  const kpiBlock = `
<p style="margin:0 0 12px;font-size:13px;color:${muted};line-height:1.5">
  <strong>Avisos ISTOBAL:</strong> ${kpis.avisosIstobal} &nbsp;|&nbsp;
  <strong>Concluídos:</strong> ${kpis.concluidos} &nbsp;|&nbsp;
  <strong>Em curso:</strong> ${kpis.emCurso} &nbsp;|&nbsp;
  <strong>Horas M.O. (faturar):</strong> ${kpis.horasFaturar.toFixed(1)} h &nbsp;|&nbsp;
  <strong>Total reparações no mês:</strong> ${kpis.totalReparacoesMes}
</p>`

  const tableIstHead = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:12px;margin-bottom:16px">
  <thead>
    <tr style="background:${azul};color:#fff">
      <th align="left" style="padding:6px 8px;font-weight:700">Data</th>
      <th align="left" style="padding:6px 8px;font-weight:700">Aviso ES</th>
      <th align="left" style="padding:6px 8px;font-weight:700">Máquina</th>
      <th align="left" style="padding:6px 8px;font-weight:700">Cliente</th>
      <th align="left" style="padding:6px 8px;font-weight:700">Estado</th>
      <th align="left" style="padding:6px 8px;font-weight:700">Rel.</th>
      <th align="right" style="padding:6px 8px;font-weight:700;white-space:nowrap">H. M.O.</th>
    </tr>
  </thead>
  <tbody>`

  let rowsIstHtml = ''
  for (const row of rowsIstobal) {
    const h = row.horas != null ? `${row.horas.toFixed(1)} h` : '—'
    rowsIstHtml += `
<tr style="border-bottom:1px solid #e5e7eb">
  <td style="padding:6px 8px;vertical-align:top;white-space:nowrap">${esc(row.dataFmt)}</td>
  <td style="padding:6px 8px;vertical-align:top;font-weight:600;white-space:nowrap">${esc(row.aviso)}</td>
  <td style="padding:6px 8px;vertical-align:top">${esc(row.maquina)}</td>
  <td style="padding:6px 8px;vertical-align:top">${esc(row.cliente)}</td>
  <td style="padding:6px 8px;vertical-align:top">${esc(row.estado)}</td>
  <td style="padding:6px 8px;vertical-align:top;white-space:nowrap">${esc(row.relatorio)}</td>
  <td align="right" style="padding:6px 8px;vertical-align:top;white-space:nowrap;font-variant-numeric:tabular-nums">${esc(h)}</td>
</tr>`
    if (row.pecas.length) {
      const pecasList = row.pecas.map(p =>
        `<li style="margin:2px 0">${esc(p.codigo)} — ${esc(p.descricao)} <span style="color:${muted}">(qtd ${esc(String(p.quantidade))})</span></li>`
      ).join('')
      rowsIstHtml += `
<tr><td colspan="7" style="padding:4px 8px 10px 24px;background:#f9fafb;font-size:11px;color:${muted}">
  <strong style="color:${azul}">Materiais:</strong><ul style="margin:4px 0 0;padding-left:18px">${pecasList}</ul>
</td></tr>`
    }
  }

  let footIst = ''
  if (rowsIstobal.length && kpis.horasFaturar > 0) {
    footIst = `
<tr style="font-weight:700;background:#eff6ff">
  <td colspan="6" align="right" style="padding:8px;border-top:2px solid ${azul}">Total horas a faturar à ISTOBAL:</td>
  <td align="right" style="padding:8px;border-top:2px solid ${azul};color:${azul};white-space:nowrap">${kpis.horasFaturar.toFixed(1)} h</td>
</tr>`
  }

  const tableIst = rowsIstobal.length
    ? `${tableIstHead}${rowsIstHtml}${footIst}</tbody></table>`
    : `<p style="color:${muted};font-size:13px">Nenhum aviso ISTOBAL neste período.</p>`

  let tableMan = ''
  if (rowsManual.length) {
    tableMan = `
<h3 style="margin:20px 0 8px;font-size:13px;color:${azul};text-transform:uppercase;letter-spacing:0.04em">Reparações manuais</h3>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:12px">
  <thead>
    <tr style="background:${azul};color:#fff">
      <th align="left" style="padding:6px 8px">Data</th>
      <th align="left" style="padding:6px 8px">Aviso</th>
      <th align="left" style="padding:6px 8px">Máquina</th>
      <th align="left" style="padding:6px 8px">Cliente</th>
      <th align="left" style="padding:6px 8px">Estado</th>
      <th align="left" style="padding:6px 8px">Rel.</th>
    </tr>
  </thead>
  <tbody>
    ${rowsManual.map(row => `
<tr style="border-bottom:1px solid #e5e7eb">
  <td style="padding:6px 8px">${esc(row.dataFmt)}</td>
  <td style="padding:6px 8px">${esc(row.aviso)}</td>
  <td style="padding:6px 8px">${esc(row.maquina)}</td>
  <td style="padding:6px 8px">${esc(row.cliente)}</td>
  <td style="padding:6px 8px">${esc(row.estado)}</td>
  <td style="padding:6px 8px">${esc(row.relatorio)}</td>
</tr>`).join('')}
  </tbody>
</table>`
  }

  const inner = `
<div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;line-height:1.45;max-width:720px">
  <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${azul}">Relatório mensal ISTOBAL</p>
  <p style="margin:0 0 12px;font-size:13px;color:${muted}">Período: <strong>${esc(periodoLabel)}</strong> · Gerado em ${esc(geradoEm)}</p>
  ${kpiBlock}
  <h3 style="margin:0 0 8px;font-size:13px;color:${azul};text-transform:uppercase;letter-spacing:0.04em">Avisos ISTOBAL</h3>
  ${tableIst}
  ${tableMan}
  <p style="margin-top:16px;font-size:10px;color:${muted};border-top:1px solid #e5e7eb;padding-top:8px">${esc(APP_FOOTER_TEXT)}</p>
  <p style="margin:8px 0 0;font-size:10px;color:${muted}">${esc(EMPRESA.nome)} · ${esc(EMPRESA.web)}</p>
</div>`

  if (emailFragment) {
    return `<div class="atm-mensal-istobal-email" style="margin:0;padding:0;background:#fff">${inner}</div>`
  }
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><title>${esc(`ISTOBAL ${periodoLabel}`)}</title></head><body style="margin:12px;background:#fff">${inner}</body></html>`
}
