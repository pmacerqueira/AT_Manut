/**
 * Utilitários de geração de PDF a partir do HTML do relatório.
 *
 * imprimirOuGuardarPdf — abre o diálogo de impressão/guardar PDF do browser.
 * abrirPdfRelatorio   — em mobile: abre visualizador PDF; em desktop: diálogo de impressão.
 * gerarPdfCompacto    — gera um Blob PDF (para anexar a emails).
 */
import { logger } from './logger'
import { APP_FOOTER_TEXT } from '../config/version'

/** Deteta se o dispositivo parece ser mobile (para abrir visualizador em vez de impressão) */
export function isMobileDevice() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Em mobile: gera PDF e abre num visualizador. Em desktop: abre diálogo de impressão.
 * @param {{ relatorio, manutencao, maquina, cliente, checklistItems, subcategoriaNome, html }} params
 */
export async function abrirPdfRelatorio({ relatorio, manutencao, maquina, cliente, checklistItems = [], subcategoriaNome = '', html }) {
  if (isMobileDevice()) {
    try {
      const blob = await gerarPdfCompacto({ relatorio, manutencao, maquina, cliente, checklistItems, subcategoriaNome })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (!w) {
        alert('Permita pop-ups para visualizar o PDF.')
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      logger.error('gerarPdfRelatorio', 'abrirPdfRelatorio', 'Erro ao gerar PDF em mobile', { msg: err?.message })
      alert('Não foi possível gerar o PDF.')
    }
  } else {
    imprimirOuGuardarPdf(html)
  }
}

/**
 * Abre o HTML do relatório numa nova janela e aciona a impressão.
 * Aguarda o carregamento de todas as imagens (logo, assinatura, fotos)
 * antes de disparar o diálogo de impressão/PDF.
 */
export function imprimirOuGuardarPdf(html) {
  const w = window.open('', '_blank')
  if (!w) {
    alert('Permita pop-ups para obter o PDF.')
    return
  }
  w.document.write(html)
  w.document.close()

  const doprint = () => {
    w.focus()
    w.print()
    w.onafterprint = () => w.close()
  }

  // Aguarda todas as imagens carregarem ou 3 s, o que ocorrer primeiro
  w.addEventListener('load', () => {
    const imgs = Array.from(w.document.images)
    if (imgs.length === 0) { doprint(); return }
    let pending = imgs.filter(img => !img.complete).length
    if (pending === 0) { doprint(); return }
    const done = () => { pending--; if (pending <= 0) doprint() }
    imgs.forEach(img => {
      if (!img.complete) { img.addEventListener('load', done); img.addEventListener('error', done) }
    })
    setTimeout(doprint, 3000) // fallback caso alguma imagem falhe
  })
}

/**
 * Gera um Blob PDF compacto usando a API nativa do jsPDF (sem html2canvas).
 * Produz PDFs de 30–80 KB (texto real, seleccionável, muito mais pequeno).
 * Usado para enviar como anexo de email.
 *
 * @param {{ relatorio, manutencao, maquina, cliente, checklistItems, subcategoriaNome }} params
 * @returns {Promise<Blob>}
 */
export async function gerarPdfCompacto({ relatorio, manutencao, maquina, cliente, checklistItems = [], subcategoriaNome = '' }) {
  const { jsPDF } = await import('jspdf')

  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W    = 210
  const M    = 14          // margem horizontal
  const cW   = W - 2 * M  // largura do conteúdo (182 mm)

  const tipoServico  = manutencao?.tipo === 'montagem' ? 'Montagem' : 'Manutenção Periódica'
  const numRel       = relatorio?.numeroRelatorio ?? 'S/N'
  const equipDesc    = maquina
    ? `${subcategoriaNome ? subcategoriaNome + ' \u2014 ' : ''}${maquina.marca} ${maquina.modelo} (N\u00ba ${maquina.numeroSerie})`
    : '\u2014'
  const dataAssin    = relatorio?.dataAssinatura
    ? new Date(relatorio.dataAssinatura).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Atlantic/Azores' })
    : '\u2014'

  // ── Cabeçalho azul ────────────────────────────────────────────────────────
  pdf.setFillColor(30, 58, 95)
  pdf.rect(0, 0, W, 26, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(13); pdf.setFont('helvetica', 'bold')
  pdf.text('NAVEL-A\u00c7ORES', M, 11)
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal')
  pdf.text('296 205 290 / 296 630 120  \u2022  geral@navel.pt  \u2022  www.navel.pt', M, 18)
  pdf.text('JOS\u00c9 GON\u00c7ALVES CERQUEIRA (NAVEL-A\u00c7ORES), Lda.', M, 23)

  let y = 36

  // ── Tipo de serviço + número ──────────────────────────────────────────────
  pdf.setTextColor(30, 58, 95)
  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold')
  pdf.text('Relat\u00f3rio de ' + tipoServico, M, y); y += 7

  pdf.setTextColor(13, 110, 253)
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold')
  pdf.text(numRel, M, y); y += 5

  pdf.setDrawColor(13, 110, 253); pdf.setLineWidth(0.5)
  pdf.line(M, y, W - M, y); y += 7

  // ── Dados do serviço ──────────────────────────────────────────────────────
  const dataRows = [
    ['CLIENTE',           cliente?.nome ?? '\u2014'],
    ['EQUIPAMENTO',       equipDesc],
    ['DATA DE EXECU\u00c7\u00c3O', dataAssin],
    ['T\u00c9CNICO',      relatorio?.tecnico ?? manutencao?.tecnico ?? '\u2014'],
    ['ASSINADO POR',      relatorio?.nomeAssinante ?? '\u2014'],
  ]

  pdf.setFontSize(9)
  dataRows.forEach(([label, val], i) => {
    if (i % 2 === 1) { pdf.setFillColor(248, 249, 250); pdf.rect(M, y - 4, cW, 7.5, 'F') }
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(107, 114, 128)
    pdf.text(label, M + 1, y)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
    const wrapped = pdf.splitTextToSize(String(val), cW - 55)
    pdf.text(wrapped, M + 55, y)
    y += wrapped.length > 1 ? wrapped.length * 5 + 2 : 7.5
  })

  y += 3
  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3)
  pdf.line(M, y, W - M, y); y += 7

  // ── Checklist ─────────────────────────────────────────────────────────────
  if (checklistItems.length > 0) {
    if (y > 260) { pdf.addPage(); y = 20 }
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('CHECKLIST DE VERIFICA\u00c7\u00c3O', M, y); y += 6

    const nSim = Object.values(relatorio?.checklistRespostas ?? {}).filter(v => v === 'sim').length
    const nNao = Object.values(relatorio?.checklistRespostas ?? {}).filter(v => v === 'nao').length
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
    pdf.text(`${nSim} conforme \u2022 ${nNao} n\u00e3o conforme \u2022 ${checklistItems.length} itens`, M, y); y += 5

    pdf.setFontSize(8.5)
    checklistItems.forEach((item, i) => {
      if (y > 270) { pdf.addPage(); y = 20 }
      if (i % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(M, y - 3.5, cW, 7, 'F') }
      const resp  = relatorio?.checklistRespostas?.[item.id]
      const badge = resp === 'sim' ? 'SIM' : resp === 'nao' ? 'N\u00c3O' : '\u2014'
      const rgb   = resp === 'sim' ? [22, 163, 74] : resp === 'nao' ? [220, 38, 38] : [107, 114, 128]
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
      pdf.text(String(i + 1) + '.', M + 1, y)
      pdf.setTextColor(55, 65, 81)
      pdf.text(item.texto, M + 8, y, { maxWidth: cW - 22 })
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb)
      pdf.text(badge, W - M - 2, y, { align: 'right' })
      y += 7
    })
    y += 4
  }

  // ── Notas ─────────────────────────────────────────────────────────────────
  if (relatorio?.notas) {
    if (y > 240) { pdf.addPage(); y = 20 }
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('NOTAS ADICIONAIS', M, y); y += 6
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
    const lines = pdf.splitTextToSize(relatorio.notas, cW)
    pdf.text(lines, M, y); y += lines.length * 5 + 5
  }

  // ── Assinatura digital (caixa de confirmação — sem imagem para manter PDF leve) ──
  if (y > 255) { pdf.addPage(); y = 20 }
  pdf.setFillColor(240, 253, 244)
  pdf.setDrawColor(187, 247, 208)
  pdf.rect(M, y - 4, cW, 16, 'FD')
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(22, 163, 74)
  pdf.text('\u2713 Relat\u00f3rio assinado digitalmente', M + 3, y + 1)
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
  const assinTexto = relatorio?.nomeAssinante
    ? `Assinado por ${relatorio.nomeAssinante} em ${dataAssin}. Assinatura manuscrita arquivada no sistema.`
    : `Assinado em ${dataAssin}. Assinatura manuscrita arquivada no sistema.`
  pdf.text(assinTexto, M + 3, y + 8, { maxWidth: cW - 6 })
  y += 20

  // ── Fotos (menção) ────────────────────────────────────────────────────────
  const nFotos = (relatorio?.fotos ?? []).length
  if (nFotos > 0) {
    if (y > 270) { pdf.addPage(); y = 20 }
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(107, 114, 128)
    pdf.text(`\ud83d\udcf7 ${nFotos} fotografia(s) documentadas no sistema Navel Manutencoes.`, M, y)
  }

  // ── Rodapé em todas as páginas ────────────────────────────────────────────
  const totalPages = pdf.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFillColor(30, 58, 95)
    pdf.rect(0, 283, W, 14, 'F')
    pdf.setTextColor(160, 180, 210); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal')
    pdf.text(APP_FOOTER_TEXT, W / 2, 286, { align: 'center' })
    pdf.setFontSize(5.5)
    pdf.text('Pico da Pedra & Ponta Delgada  \u2022  296 205 290 / 296 630 120  \u2022  www.navel.pt', W / 2, 291, { align: 'center' })
    if (totalPages > 1) {
      pdf.setTextColor(200, 210, 230)
      pdf.text(`P\u00e1gina ${p}/${totalPages}`, W - M, 293, { align: 'right' })
    }
  }

  return pdf.output('blob')
}
