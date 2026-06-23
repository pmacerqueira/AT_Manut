/**
 * Utilitários de geração de PDF a partir do HTML do relatório.
 *
 * imprimirOuGuardarPdf — abre o diálogo de impressão/guardar PDF do browser.
 * abrirPdfRelatorio   — em mobile: abre visualizador PDF; em desktop: diálogo de impressão.
 * gerarPdfCompacto    — gera um Blob PDF (para anexar a emails).
 */
import { logger } from './logger'
import { APP_FOOTER_TEXT } from '../config/version'
import { EMPRESA } from '../constants/empresa'
import { resolveChecklist } from './resolveChecklist'
import { resolveDeclaracaoCliente } from '../constants/relatorio'
import { MAX_FOTOS } from '../config/limits'
import { horasContadorParaRelatorio } from './horasContadorEquipamento'
import { linhasNotasRelatorio, getQuickNotes } from '../components/executarManutencao/execWizardHelpers'
import {
  buildResumoExecutivoMeta,
  formatDataRelatorioPdf,
} from './relatorioPdfResumo'
import {
  SUBCATEGORIAS_COM_CONTADOR_HORAS,
} from '../context/DataContext'
import {
  relatorioObrigaBlocoConsumiveisPlano,
  relatorioIncluiSecaoConsumiveisContador,
} from './relatorioBlocosEquipamento'

/** Normaliza `relatorio.fotos` (array ou JSON string) para lista de URLs/data URLs. */
function normalizeRelatorioFotos(fotos) {
  if (fotos == null) return []
  let arr = fotos
  if (typeof fotos === 'string') {
    try {
      arr = JSON.parse(fotos)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.filter(
    (x) => typeof x === 'string' && x.length > 24 && (x.startsWith('data:image') || /^https?:\/\//i.test(x)),
  )
}

/** Desenha imagem dentro de rectângulo maxW×maxH (mm), centrada, sem distorção. Falhas silenciosas. */
export function addImageFitInBoxMm(pdf, dataUrl, innerX, innerY, maxW, maxH) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return
  let p
  try {
    p = pdf.getImageProperties(dataUrl)
  } catch {
    return
  }
  const ratio = p.width / p.height
  const boxRatio = maxW / maxH
  let w
  let h
  if (ratio > boxRatio) {
    w = maxW
    h = maxW / ratio
  } else {
    h = maxH
    w = maxH * ratio
  }
  const x = innerX + (maxW - w) / 2
  const y = innerY + (maxH - h) / 2
  const fmt = (p.fileType === 'JPEG' || p.fileType === 'JPG') ? 'JPEG' : 'PNG'
  try {
    pdf.addImage(dataUrl, fmt, x, y, w, h, undefined, 'FAST')
  } catch {
    /* formato inválido ou limite interno do jsPDF */
  }
}

/** http(s) noutro origin — fetch directo viola CSP `connect-src` no navel.pt (ex.: logo KAESER em pt.kaeser.com). */
function isCrossOriginHttpImageSrc(src) {
  if (!/^https?:\/\//i.test(src)) return false
  if (typeof window === 'undefined' || !window.location?.origin) return true
  try {
    return new URL(src, window.location.href).origin !== window.location.origin
  } catch {
    return true
  }
}

export async function loadImageAsDataUrl(src) {
  if (!src) return null
  if (src.startsWith('data:')) return src

  const blobToDataUrl = (blob) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })

  const buildProxyUrl = (raw) => {
    const base = (import.meta.env.BASE_URL || '/manut/').replace(/\/?$/, '/')
    return `${base}../api/image-proxy.php?url=${encodeURIComponent(raw)}`
  }

  const tryImageProxy = async () => {
    try {
      const resp = await fetch(buildProxyUrl(src))
      if (resp.ok) {
        const blob = await resp.blob()
        if (blob.size > 100) return await blobToDataUrl(blob)
      }
    } catch (_) { /* proxy indisponível */ }
    return null
  }

  // 1) URLs externas: proxy no cPanel primeiro (evita CSP e CORS no browser)
  if (isCrossOriginHttpImageSrc(src)) {
    const proxied = await tryImageProxy()
    if (proxied) return proxied
  }

  // 2) Fetch directo (mesmo origin ou recurso com CORS aberto)
  try {
    const resp = await fetch(src, { mode: 'cors' })
    if (resp.ok) {
      const blob = await resp.blob()
      if (blob.size > 100) return await blobToDataUrl(blob)
    }
  } catch (_) { /* CORS / rede / CSP */ }

  // 3) Proxy como segundo recurso (legado: hostname em string)
  if (/^https?:\/\//i.test(src) && typeof location !== 'undefined' && !src.includes(location.host)) {
    const proxied = await tryImageProxy()
    if (proxied) return proxied
  }

  // 4) Fallback via Image + canvas (same-origin)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth; c.height = img.naturalHeight
        c.getContext('2d').drawImage(img, 0, 0)
        resolve(c.toDataURL('image/png'))
      } catch (_) { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = src
    setTimeout(() => resolve(null), 3000)
  })
}

/** Deteta se o dispositivo parece ser mobile (para abrir visualizador em vez de impressão) */
export function isMobileDevice() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Em mobile: gera PDF e abre num visualizador. Em desktop: abre diálogo de impressão.
 * @param {{ relatorio, manutencao, maquina, cliente, checklistItems, subcategoriaNome, html }} params
 */
export async function abrirPdfRelatorio({ relatorio, manutencao, maquina, cliente, checklistItems: checklistItemsLive = [], subcategoriaNome = '', html, tecnicoObj = null, categoriaNome = '', declaracaoClienteDepois = '' }) {
  const checklistItems = resolveChecklist(relatorio, checklistItemsLive)
  if (isMobileDevice()) {
    try {
      const blob = await gerarPdfCompacto({
        relatorio, manutencao, maquina, cliente, checklistItems, subcategoriaNome, tecnicoObj, categoriaNome, declaracaoClienteDepois,
      })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (!w) {
        throw new Error('Permita pop-ups para visualizar o PDF.')
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      logger.error('gerarPdfRelatorio', 'abrirPdfRelatorio', 'Erro ao gerar PDF em mobile', { msg: err?.message })
      throw err
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
    throw new Error('Permita pop-ups para obter o PDF.')
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
 * Texto seleccionável; com fotografias o tamanho do ficheiro cresce (JPEG em base64).
 * Usado para enviar como anexo de email.
 *
 * @param {{ relatorio, manutencao, maquina, cliente, checklistItems, subcategoriaNome, relatorioKind?, reparacao? }} params
 * @returns {Promise<Blob>}
 */
export async function gerarPdfCompacto({
  relatorio,
  manutencao,
  maquina,
  cliente,
  checklistItems: checklistItemsLive = [],
  subcategoriaNome = '',
  tecnicoObj = null,
  proximasManutencoes = [],
  marcas = [],
  categoriaNome = '',
  declaracaoClienteDepois = '',
  /** 'manutencao' (defeito) | 'reparacao' — alinha PDF com relatório de reparação (sem próximas; declaração específica). */
  relatorioKind = 'manutencao',
  /** Opcional: registo da reparação (data de realização, etc.) quando {@link relatorioKind} é reparacao. */
  reparacao = null,
}) {
  const isReparacao = relatorioKind === 'reparacao'
  const checklistItems = resolveChecklist(relatorio, checklistItemsLive)
  const resumoMeta = buildResumoExecutivoMeta({
    relatorio,
    manutencao,
    maquina,
    cliente,
    checklistItems,
    proximasManutencoes,
    isReparacao,
    reparacao,
  })
  const { jsPDF } = await import('jspdf')

  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W    = 210
  const M    = 14          // margem horizontal
  const cW   = W - 2 * M  // largura do conteúdo (182 mm)

  const tipoServico  = isReparacao
    ? 'Repara\u00e7\u00e3o'
    : (manutencao?.tipo === 'montagem' ? 'Montagem' : 'Manuten\u00e7\u00e3o Peri\u00f3dica')
  const numRel       = relatorio?.numeroRelatorio ?? 'S/N'
  const equipDesc    = maquina
    ? `${subcategoriaNome ? subcategoriaNome + ' \u2014 ' : ''}${maquina.marca} ${maquina.modelo} (N\u00ba ${maquina.numeroSerie})`
    : '\u2014'
  const dataExecOpts = { dateStyle: 'long', timeStyle: 'short', timeZone: 'Atlantic/Azores' }
  const dataExecCurta = { dateStyle: 'long', timeZone: 'Atlantic/Azores' }
  const dataRealizacaoBruta = isReparacao
    ? (relatorio?.dataRealizacao || reparacao?.data || '')
    : ''
  const dataAssin    = relatorio?.dataAssinatura
    ? new Date(relatorio.dataAssinatura).toLocaleString('pt-PT', dataExecOpts)
    : (relatorio?.dataCriacao
      ? new Date(relatorio.dataCriacao).toLocaleString('pt-PT', dataExecOpts)
      : '\u2014')
  const dataRealizacaoFmt = dataRealizacaoBruta
    ? new Date(
        String(dataRealizacaoBruta).includes('T') ? dataRealizacaoBruta : `${String(dataRealizacaoBruta).slice(0, 10)}T12:00:00`,
      ).toLocaleString('pt-PT', dataExecCurta)
    : dataAssin

  // ── Cabeçalho azul com logo ──────────────────────────────────────────────
  const headerH = 30
  pdf.setFillColor(30, 58, 95)
  pdf.rect(0, 0, W, headerH, 'F')

  let logoEndX = M
  try {
    const logoImg = await loadImageAsDataUrl(`${import.meta.env.BASE_URL}NAVEL_LOGO.jpg`)
    if (logoImg) {
      const lW = 40, lH = 13, pad = 3, r = 3
      const bx = M, by = (headerH - lH - pad * 2) / 2
      const bw = lW + pad * 2, bh = lH + pad * 2
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(bx, by, bw, bh, r, r, 'F')
      addImageFitInBoxMm(pdf, logoImg, bx + pad, by + pad, lW, lH)
      logoEndX = bx + bw + 4
    }
  } catch (_) { /* logo indisponível */ }

  let brandLogoSrc = (maquina?.marcaLogoUrl || '').trim()
  if (!brandLogoSrc && maquina?.marca && marcas.length > 0) {
    const mk = marcas.find(m => (m.nome || '').toLowerCase() === (maquina.marca || '').toLowerCase())
    if (mk?.logoUrl) brandLogoSrc = mk.logoUrl.trim()
  }
  if (brandLogoSrc) {
    try {
      const brandImg = await loadImageAsDataUrl(brandLogoSrc)
      if (brandImg) {
        // Mesma área interna e padding que o logo Navel (e que send-email.php FPDF)
        const bInnerW = 40
        const bInnerH = 13
        const bPad = 3
        const bR = 3
        const bY = (headerH - bInnerH - bPad * 2) / 2
        const bBoxW = bInnerW + bPad * 2
        const bBoxH = bInnerH + bPad * 2
        pdf.setFillColor(255, 255, 255)
        pdf.roundedRect(logoEndX, bY, bBoxW, bBoxH, bR, bR, 'F')
        addImageFitInBoxMm(pdf, brandImg, logoEndX + bPad, bY + bPad, bInnerW, bInnerH)
      }
    } catch (_) { /* logo marca indisponível */ }
  }

  const txR = W - M
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold')
  pdf.text(EMPRESA.nome, txR, 10, { align: 'right' })
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal')
  pdf.text("Pico d'Agua Park \u2022 www.navel.pt", txR, 17, { align: 'right' })
  pdf.text('S\u00e3o Miguel\u2013A\u00e7ores', txR, 23, { align: 'right' })

  let y = headerH + 8

  // ── Tipo de serviço + número ──────────────────────────────────────────────
  pdf.setTextColor(30, 58, 95)
  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold')
  pdf.text('Relat\u00f3rio de ' + tipoServico, M, y); y += 7

  pdf.setTextColor(13, 110, 253)
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold')
  pdf.text(numRel, M, y); y += 5

  pdf.setDrawColor(13, 110, 253); pdf.setLineWidth(0.5)
  pdf.line(M, y, W - M, y); y += 7

  const equipComContadorHoras = !isReparacao && maquina &&
    SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maquina.subcategoriaId)
  const horasPdf = horasContadorParaRelatorio(maquina, isReparacao ? null : manutencao, null, relatorio)
  const horasPdfLabel = horasPdf != null ? `${horasPdf} h` : '\u2014'
  const moradaCliente = resumoMeta.moradaCliente

  function renderResumoExecutivo() {
    if (isReparacao) {
      if (!resumoMeta.bullets.length) return
      if (y > 248) { pdf.addPage(); y = 20 }
      pdf.setFillColor(243, 244, 246)
      pdf.setDrawColor(30, 58, 95)
      pdf.setLineWidth(0.5)
      const pad = 5
      const bulletLines = resumoMeta.bullets.flatMap(b => pdf.splitTextToSize(`- ${b}`, cW - pad * 2))
      const boxH = 12 + bulletLines.length * 4.2 + pad
      if (y + boxH > 275) { pdf.addPage(); y = 20 }
      const y0 = y - 3
      pdf.rect(M, y0, cW, boxH, 'FD')
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
      pdf.text('RESUMO DA INTERVEN\u00c7\u00c3O', M + pad, y0 + 5)
      let yTxt = y0 + 11
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
      bulletLines.forEach((ln) => {
        pdf.text(ln, M + pad, yTxt)
        yTxt += 4.2
      })
      y = y0 + boxH + 4
      return
    }

    const style = resumoMeta.vereditoStyle
    if (!style) return
    if (y > 245) { pdf.addPage(); y = 20 }

    const pad = 5
    const bulletLines = resumoMeta.bullets.flatMap(b => pdf.splitTextToSize(`- ${b}`, cW - pad * 2 - 4))
    let extraH = 0
    if (resumoMeta.proximaData) extraH += 5
    const contagemLine = `${resumoMeta.nSim} conforme \u2022 ${resumoMeta.nNao} n\u00e3o conforme` +
      (resumoMeta.nNa ? ` \u2022 ${resumoMeta.nNa} N/A` : '')
    const boxH = 22 + bulletLines.length * 4.2 + extraH + pad
    if (y + boxH > 275) { pdf.addPage(); y = 20 }

    const y0 = y - 3
    pdf.setFillColor(...style.fill)
    pdf.setDrawColor(...style.border)
    pdf.setLineWidth(0.8)
    pdf.rect(M, y0, cW, boxH, 'FD')

    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...style.text)
    pdf.text(`RESUMO EXECUTIVO - ${style.label}`, M + pad + 2, y0 + 5)
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
    pdf.text(contagemLine, M + pad + 2, y0 + 11)

    let yTxt = y0 + 16
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
    bulletLines.forEach((ln) => {
      pdf.text(ln, M + pad + 2, yTxt)
      yTxt += 4.2
    })

    if (resumoMeta.proximaData) {
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
      pdf.text('Pr\u00f3xima manuten\u00e7\u00e3o prevista:', M + pad + 2, yTxt + 1)
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
      const proxTxt = `${formatDataRelatorioPdf(resumoMeta.proximaData)}` +
        (resumoMeta.proximaTecnico ? `  |  ${resumoMeta.proximaTecnico}` : '')
      pdf.text(proxTxt, M + pad + 46, yTxt + 1)
      yTxt += 5
    }

    y = y0 + boxH + 4
  }

  function renderPontosAtencao() {
    if (isReparacao || resumoMeta.naoConformes.length === 0) return
    if (y > 248) { pdf.addPage(); y = 20 }

    pdf.setFillColor(255, 251, 235)
    pdf.setDrawColor(217, 119, 6)
    pdf.setLineWidth(0.6)
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(180, 83, 9)
    pdf.text('PONTOS DE ATEN\u00c7\u00c3O (N\u00c3O CONFORMIDADES)', M, y)
    y += 6

    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal')
    resumoMeta.naoConformes.forEach((nc) => {
      const line = `${nc.index}. ${nc.texto}`
      const wrapped = pdf.splitTextToSize(line, cW - 6)
      const blockH = wrapped.length * 4.2 + 2
      if (y + blockH > 275) { pdf.addPage(); y = 20 }
      pdf.setTextColor(55, 65, 81)
      wrapped.forEach((ln, li) => { pdf.text(ln, M + 3, y + li * 4.2) })
      y += blockH
    })
    if (relatorio?.notas?.trim()) {
      const hint = pdf.splitTextToSize(
        `Observa\u00e7\u00f5es registadas: ${linhasNotasRelatorio(relatorio.notas).join(' | ')}`,
        cW - 6,
      )
      if (y + hint.length * 4 > 275) { pdf.addPage(); y = 20 }
      pdf.setFont('helvetica', 'italic'); pdf.setTextColor(107, 114, 128)
      hint.forEach((ln, li) => { pdf.text(ln, M + 3, y + li * 4) })
      y += hint.length * 4 + 2
    }
    y += 4
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3)
    pdf.line(M, y, W - M, y); y += 5
  }

  renderResumoExecutivo()

  // ── Dados do serviço (após resumo — alinhado a send-email.php FPDF) ───────
  const dataRows = isReparacao
    ? [
        ['CLIENTE',           cliente?.nome ?? '\u2014'],
        ...(resumoMeta.clienteNif ? [['NIF', resumoMeta.clienteNif]] : []),
        ...(moradaCliente !== '\u2014' ? [['LOCAL / INSTALA\u00c7\u00c3O', moradaCliente]] : []),
        ['EQUIPAMENTO',       equipDesc],
        ['DATA DE REALIZA\u00c7\u00c3O', dataRealizacaoFmt],
        ['T\u00c9CNICO',      relatorio?.tecnico ?? '\u2014'],
      ]
    : [
        ['CLIENTE',           cliente?.nome ?? '\u2014'],
        ...(resumoMeta.clienteNif ? [['NIF', resumoMeta.clienteNif]] : []),
        ...(moradaCliente !== '\u2014' ? [['LOCAL / INSTALA\u00c7\u00c3O', moradaCliente]] : []),
        ['EQUIPAMENTO',       equipDesc],
        ['TIPO DE INTERVEN\u00c7\u00c3O', resumoMeta.tipoIntervencao],
        ['PERIODICIDADE',     resumoMeta.periodicidadeLabel],
        ...(resumoMeta.dataAgendIso
          ? [['DATA DE AGENDAMENTO', formatDataRelatorioPdf(resumoMeta.dataAgendIso)]]
          : []),
        ...(equipComContadorHoras
          ? [['HORAS NO CONTADOR (ACUMULADAS)', horasPdfLabel]]
          : []),
        ['DATA DE EXECU\u00c7\u00c3O', dataAssin],
        ['T\u00c9CNICO',      relatorio?.tecnico ?? manutencao?.tecnico ?? '\u2014'],
        ['ASSINADO POR',      relatorio?.nomeAssinante ?? '\u2014'],
      ]
  if (isReparacao && relatorio?.numeroAviso?.trim()) {
    dataRows.push(['N.\u00ba AVISO / PEDIDO', relatorio.numeroAviso.trim()])
  }
  if (isReparacao && relatorio?.horasMaoObra != null && relatorio.horasMaoObra !== '') {
    dataRows.push(['HORAS DE M\u00c3O-DE-OBRA', `${relatorio.horasMaoObra} h`])
  }
  if (isReparacao) {
    dataRows.push(['ASSINADO POR', relatorio?.nomeAssinante ?? '\u2014'])
  }

  pdf.setFontSize(9)
  const dataLabelColW = 72
  const dataValueX = M + 74
  const dataValueMaxW = Math.max(24, W - M - dataValueX - 2)
  const dataLineH = 4.5
  dataRows.forEach(([label, val], i) => {
    if (y > 265) { pdf.addPage(); y = 20 }
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(107, 114, 128)
    const labelLines = pdf.splitTextToSize(label, dataLabelColW)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
    const valLines = pdf.splitTextToSize(String(val), dataValueMaxW)
    const nLines = Math.max(labelLines.length, valLines.length, 1)
    const rowH = Math.max(7.5, (nLines - 1) * dataLineH + 7)
    if (i % 2 === 1) { pdf.setFillColor(248, 249, 250); pdf.rect(M, y - 4, cW, rowH, 'F') }
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(107, 114, 128)
    labelLines.forEach((ln, li) => { pdf.text(ln, M + 1, y + li * dataLineH) })
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
    valLines.forEach((ln, li) => { pdf.text(ln, dataValueX, y + li * dataLineH) })
    y += rowH
  })

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3)
  pdf.line(M, y, W - M, y); y += 5

  renderPontosAtencao()

  const obrigaBlocoPecas = !isReparacao && relatorioObrigaBlocoConsumiveisPlano(maquina, manutencao)
  const secaoConsumiveisContador = relatorioIncluiSecaoConsumiveisContador(maquina, manutencao)
  const pecasRaw = Array.isArray(relatorio?.pecasUsadas) ? relatorio.pecasUsadas : []

  /** Reparação: texto longo fora da grelha; ordem das secções alinhada ao HTML e ao fluxo operacional. */
  function renderReparacaoNarrativa() {
    if (!isReparacao) return
    const bloco = (titulo, textoBruto) => {
      const texto = String(textoBruto ?? '').trim()
      if (!texto) return
      if (y > 235) { pdf.addPage(); y = 20 }
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
      pdf.text(titulo, M, y); y += 6
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
      const lines = pdf.splitTextToSize(texto, cW)
      pdf.text(lines, M, y); y += lines.length * 5 + 7
    }
    bloco('AVARIA / PROBLEMA REPORTADO', relatorio?.descricaoAvaria)
    bloco('TRABALHO REALIZADO', relatorio?.trabalhoRealizado)
  }

  function renderChecklistSection() {
    if (checklistItems.length === 0) return

    // Página A4 dedicada — checklist completa numa única folha
    pdf.addPage()
    y = 20
    const yMax = 274
    const headerBlockH = 13

    const textLeftCl = M + 8
    const badgeReserveMm = 18
    const textoItemMaxW = Math.max(40, W - M - badgeReserveMm - textLeftCl)

    const fontCandidates = [
      { fs: 8.5, lineMm: 3.65, rowGap: 3, stripeTop: 3.95, stripeBot: 1.85 },
      { fs: 8, lineMm: 3.35, rowGap: 2.5, stripeTop: 3.5, stripeBot: 1.5 },
      { fs: 7.5, lineMm: 3.1, rowGap: 2, stripeTop: 3.2, stripeBot: 1.3 },
      { fs: 7, lineMm: 2.85, rowGap: 1.6, stripeTop: 2.9, stripeBot: 1.1 },
      { fs: 6.5, lineMm: 2.65, rowGap: 1.2, stripeTop: 2.6, stripeBot: 0.9 },
    ]

    let chosen = fontCandidates[fontCandidates.length - 1]
    for (const cand of fontCandidates) {
      pdf.setFontSize(cand.fs)
      let needH = headerBlockH
      for (const item of checklistItems) {
        const linhasTxt = pdf.splitTextToSize(String(item.texto ?? ''), textoItemMaxW)
        const lastBaseline = cand.lineMm + (linhasTxt.length - 1) * cand.lineMm
        const textoBlockBottom = lastBaseline + 2.9
        const rowH = textoBlockBottom + cand.rowGap
        needH += rowH
      }
      if (needH <= yMax - y) {
        chosen = cand
        break
      }
    }

    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    const tituloChecklist = resumoMeta.naoConformes.length > 0
      ? 'DETALHE DA VERIFICA\u00c7\u00c3O (CHECKLIST COMPLETA)'
      : 'CHECKLIST DE VERIFICA\u00c7\u00c3O'
    pdf.text(tituloChecklist, M, y); y += 6

    const valsCh = Object.values(relatorio?.checklistRespostas ?? {})
    const nSim = valsCh.filter(v => v === 'sim' || v === 'OK').length
    const nNao = valsCh.filter(v => v === 'nao' || v === 'NOK').length
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
    pdf.text(`${nSim} conforme \u2022 ${nNao} n\u00e3o conforme \u2022 ${checklistItems.length} itens`, M, y); y += 5

    pdf.setFontSize(chosen.fs)
    checklistItems.forEach((item, i) => {
      const texto = String(item.texto ?? '')
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
      const linhasTxt = pdf.splitTextToSize(texto, textoItemMaxW)
      const checklistLineMm = chosen.lineMm
      const lastBaseline = y + (linhasTxt.length - 1) * checklistLineMm
      const textoBlockBottom = lastBaseline + 2.9

      const stripePadTop = chosen.stripeTop
      const stripePadBot = chosen.stripeBot
      const rowTop = y - stripePadTop
      const zebraH = textoBlockBottom - rowTop + stripePadBot

      if (i % 2 === 0) {
        pdf.setFillColor(249, 250, 251)
        pdf.rect(M, rowTop, cW, zebraH, 'F')
      }

      const resp = relatorio?.checklistRespostas?.[item.id]
      const badge = resp === 'sim' || resp === 'OK'
        ? 'SIM'
        : resp === 'nao' || resp === 'NOK'
          ? 'N\u00c3O'
          : resp === 'N/A'
            ? 'N/A'
            : '\u2014'
      const rgb = (resp === 'sim' || resp === 'OK')
        ? [22, 163, 74]
        : (resp === 'nao' || resp === 'NOK')
          ? [220, 38, 38]
          : [107, 114, 128]

      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
      pdf.text(String(i + 1) + '.', M + 1, y)

      pdf.setTextColor(55, 65, 81)
      linhasTxt.forEach((ln, li) => {
        pdf.text(ln, textLeftCl, y + li * checklistLineMm)
      })

      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb)
      pdf.text(badge, W - M - 2, y, { align: 'right' })

      y = textoBlockBottom + chosen.rowGap
    })
    y += 4
  }

  function renderNotasSection() {
    if (!relatorio?.notas) return
    const notaLinhas = linhasNotasRelatorio(relatorio.notas, getQuickNotes())
    if (notaLinhas.length === 0) return
    if (y > 240) { pdf.addPage(); y = 20 }
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('NOTAS ADICIONAIS', M, y); y += 6
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
    const lineH = 5
    const gapEntreNotas = 2
    notaLinhas.forEach((nota, idx) => {
      const wrapped = pdf.splitTextToSize(nota, cW)
      const blockH = wrapped.length * lineH + (idx < notaLinhas.length - 1 ? gapEntreNotas : 0)
      if (y + blockH > 280) { pdf.addPage(); y = 20 }
      pdf.text(wrapped, M, y)
      y += wrapped.length * lineH + gapEntreNotas
    })
    y += 3
  }

  async function renderFotosSection() {
    const fotosAll = normalizeRelatorioFotos(relatorio?.fotos)
    const nFotosTotal = fotosAll.length
    if (nFotosTotal > 0) {
      const fotosEmb = fotosAll.slice(0, MAX_FOTOS)
      const resolved = []
      for (const src of fotosEmb) {
        if (src.startsWith('data:')) {
          resolved.push(src)
        } else {
          const u = await loadImageAsDataUrl(src)
          if (u) resolved.push(u)
        }
      }

      if (y > 248) { pdf.addPage(); y = 20 }
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
      pdf.text('DOCUMENTA\u00c7\u00c3O FOTOGR\u00c1FICA', M, y); y += 5
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
      let sub = `${nFotosTotal} fotografia(s)`
      if (nFotosTotal > MAX_FOTOS) sub += ` (mostradas as primeiras ${MAX_FOTOS})`
      pdf.text(sub, M, y); y += 6

      if (resolved.length === 0) {
        pdf.setFontSize(8.5); pdf.setFont('helvetica', 'italic')
        pdf.text('N\u00e3o foi poss\u00edvel incorporar as imagens neste PDF.', M, y)
        y += 6
      } else {
        const cols = 4
        const gap = 2
        const cellW = (cW - (cols - 1) * gap) / cols
        const cellH = cellW * 0.72 + 4
        const nRowsF = Math.ceil(resolved.length / cols)
        for (let row = 0; row < nRowsF; row++) {
          if (y + cellH > 272) { pdf.addPage(); y = 20 }
          const y0 = y
          for (let c = 0; c < cols; c++) {
            const idx = row * cols + c
            if (idx >= resolved.length) break
            const x = M + c * (cellW + gap)
            addImageFitInBoxMm(pdf, resolved[idx], x, y0, cellW, cellH - 1)
          }
          y = y0 + cellH
        }
        y += 2
      }
    }
  }

  function renderPecasSection() {
    if (!obrigaBlocoPecas && pecasRaw.length === 0 && !secaoConsumiveisContador) return
    if (y > 220) { pdf.addPage(); y = 20 }
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    const tituloConsumiveis = obrigaBlocoPecas || secaoConsumiveisContador
      ? 'CONSUM\u00cdVEIS E PE\u00c7AS'
      : (isReparacao ? 'PE\u00c7AS E MATERIAIS UTILIZADOS' : 'CONSUM\u00cdVEIS E PE\u00c7AS')
    pdf.text(tituloConsumiveis, M, y); y += 6

    const normalizar = (p) => 'usado' in p ? p : { ...p, usado: (p.quantidadeUsada ?? p.quantidade ?? 0) > 0 }
    const pecas = pecasRaw.map(normalizar)
    if (pecas.length === 0) {
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(107, 114, 128)
      const msg = obrigaBlocoPecas
        ? 'Nenhuma linha do plano foi registada nesta interven\u00e7\u00e3o. Edite o relat\u00f3rio para associar o tipo A/B/C/D e as pe\u00e7as importadas por n.\u00ba de s\u00e9rie.'
        : (secaoConsumiveisContador
          ? (isReparacao
            ? 'Nenhuma pe\u00e7a ou material foi listado nesta repara\u00e7\u00e3o.'
            : 'Nenhum consum\u00edvel ou pe\u00e7a foi listado nesta interven\u00e7\u00e3o.')
          : (isReparacao
            ? 'Nenhuma pe\u00e7a ou material registado nesta repara\u00e7\u00e3o.'
            : 'Sem consum\u00edveis listados.'))
      const wrapped = pdf.splitTextToSize(msg, cW)
      pdf.text(wrapped, M, y)
      y += wrapped.length * 4 + 6
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
    } else {
      const usadas = pecas.filter(p => p.usado)
      const naoUsadas = pecas.filter(p => !p.usado)

      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
      if (isReparacao && !obrigaBlocoPecas) {
        pdf.text(`${pecas.length} linha(s) registada(s).`, M, y); y += 5
      } else {
        pdf.text(`${usadas.length} utilizado(s) \u2022 ${naoUsadas.length} n\u00e3o substitu\u00eddo(s) \u2022 ${pecas.length} no plano`, M, y); y += 5
      }

      pdf.setFontSize(8)
      pecas.forEach((p, i) => {
        if (y > 270) { pdf.addPage(); y = 20 }
        if (i % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(M, y - 3.5, cW, 6.5, 'F') }
        const icon = p.usado ? '\u2713' : '\u2717'
        const rgb = p.usado ? [22, 163, 74] : [107, 114, 128]
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb)
        pdf.text(icon, M + 1, y)
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
        const posTxt = p.posicao ? `${p.posicao} ` : ''
        const codigoP = p.codigoArtigo ?? p.codigo ?? ''
        const desc = `${posTxt}${codigoP ? codigoP + ' \u2014 ' : ''}${p.descricao ?? ''}`
        pdf.text(desc, M + 7, y, { maxWidth: cW - 30 })
        const q = p.quantidadeUsada ?? p.quantidade
        if (q != null && q !== '') {
          pdf.setTextColor(107, 114, 128)
          pdf.text(`${q} ${p.unidade ?? ''}`.trim(), W - M - 2, y, { align: 'right' })
        }
        y += 6.5
      })
      y += 4
    }
  }

  renderReparacaoNarrativa()
  if (isReparacao) {
    renderPecasSection()
    await renderFotosSection()
    renderNotasSection()
    renderChecklistSection()
  } else {
    renderChecklistSection()
    renderNotasSection()
    await renderFotosSection()
    renderPecasSection()
  }

  // ── Página final: próximas (lista completa) + declaração + assinaturas ─────
  pdf.addPage()
  y = 20
  const yClosingMax = 274

  if (!isReparacao) {
    const proximas = (proximasManutencoes ?? []).filter(pm => pm.data).sort((a, b) => a.data.localeCompare(b.data))
    const periMaqVal = maquina?.periodicidadeManut
    const periLabels = { trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual', mensal: 'Mensal' }
    const resolvePeriodicidade = (pm) => periLabels[pm.periodicidade] || periLabels[periMaqVal] || pm.tipo || '\u2014'

    const declTipoPreview = manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica'
    const declTextPreview = resolveDeclaracaoCliente(declTipoPreview, categoriaNome, declaracaoClienteDepois)
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal')
    const declLinesPreview = pdf.splitTextToSize(declTextPreview, cW - 12)
    const declBoxHPreview = 10 + declLinesPreview.length * 3.6 + 6
    const sigBoxHPreview = (tecnicoObj?.assinaturaDigital || relatorio?.assinaturaDigital) ? 38 : 20
    const reservedAfter = declBoxHPreview + sigBoxHPreview + 14

    if (proximas.length > 0 || periMaqVal) {
      const fmtD = (d) => { const s = String(d ?? '').slice(0, 10).split('-'); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : '\u2014' }
      pdf.setFillColor(243, 244, 246); pdf.setDrawColor(30, 58, 95); pdf.setLineWidth(0.5)

      if (proximas.length > 0) {
        const availTable = Math.max(50, yClosingMax - y - reservedAfter)
        const rowCandidates = [
          { fs: 8, rowMm: 7, headFs: 7.5 },
          { fs: 7.5, rowMm: 6.5, headFs: 7 },
          { fs: 7, rowMm: 6, headFs: 6.5 },
          { fs: 7, rowMm: 5.5, headFs: 6.5 },
          { fs: 6.5, rowMm: 5, headFs: 6 },
          { fs: 6.5, rowMm: 4.5, headFs: 6 },
          { fs: 6, rowMm: 4, headFs: 5.5 },
        ]
        let chosen = rowCandidates[rowCandidates.length - 1]
        for (const cand of rowCandidates) {
          const needH = 6 + 7 + proximas.length * cand.rowMm + 6
          if (needH <= availTable) {
            chosen = cand
            break
          }
        }

        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
        pdf.text('PR\u00d3XIMAS MANUTEN\u00c7\u00d5ES AGENDADAS', M, y); y += 6

        pdf.setFillColor(30, 58, 95); pdf.rect(M, y - 3.5, cW, 7, 'F')
        pdf.setFontSize(chosen.headFs); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255)
        pdf.text('N.\u00ba', M + 2, y)
        pdf.text('Data prevista', M + 14, y)
        pdf.text('Periodicidade', M + 60, y)
        pdf.text('T\u00e9cnico', M + 110, y)
        y += 5

        pdf.setFontSize(chosen.fs); pdf.setFont('helvetica', 'normal')
        proximas.forEach((pm, i) => {
          if (i % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(M, y - 3.5, cW, chosen.rowMm, 'F') }
          pdf.setTextColor(107, 114, 128); pdf.text(String(i + 1), M + 2, y)
          pdf.setTextColor(17, 24, 39); pdf.text(fmtD(pm.data), M + 14, y)
          pdf.setTextColor(55, 65, 81); pdf.text(resolvePeriodicidade(pm), M + 60, y)
          pdf.setTextColor(107, 114, 128); pdf.text(pm.tecnico ?? 'A designar', M + 110, y)
          y += chosen.rowMm
        })
        y += 4
      } else {
        const dataProxStr = '\u2014'
        const periStr = periLabels[periMaqVal] ?? ''
        const boxH = 14
        pdf.rect(M, y - 4, cW, boxH, 'FD')
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
        pdf.text('Pr\u00f3xima manuten\u00e7\u00e3o prevista:', M + 4, y)
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
        pdf.text(`${dataProxStr}${periStr ? ` (periodicidade ${periStr})` : ''}`, M + 60, y)
        y += boxH + 4
      }
    }
  }

  // ── Declaração de aceitação — imediatamente antes das assinaturas ───────────
  {
    const declTipo = isReparacao
      ? 'reparacao'
      : (manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica')
    const declText = resolveDeclaracaoCliente(declTipo, categoriaNome, declaracaoClienteDepois)
    const declPad = 6
    const declTextW = cW - declPad * 2
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal')
    const declLines = pdf.splitTextToSize(declText, declTextW)
    const declLineH = 3.6
    const declBoxH = 10 + declLines.length * declLineH + declPad
    const sigBoxHPreview = (tecnicoObj?.assinaturaDigital || relatorio?.assinaturaDigital) ? 38 : 20
    if (y + declBoxH + sigBoxHPreview + 8 > yClosingMax) { pdf.addPage(); y = 20 }
    pdf.setFillColor(243, 244, 246); pdf.setDrawColor(30, 58, 95); pdf.setLineWidth(0.8)
    pdf.rect(M, y - 4, cW, declBoxH, 'FD')
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('DECLARA\u00c7\u00c3O DE ACEITA\u00c7\u00c3O E COMPROMISSO DO CLIENTE', M + declPad, y + 1)
    y += 8
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
    declLines.forEach((line) => {
      pdf.text(line, M + declPad, y)
      y += declLineH
    })
    y += declPad + 4
  }

  // ── Bloco de assinaturas (técnico + cliente) ──

  const halfW = (cW - 4) / 2
  const hasTecSig = !!(tecnicoObj?.assinaturaDigital)
  const hasCliSig = !!(relatorio?.assinaturaDigital)
  const sigBoxH = (hasTecSig || hasCliSig) ? 38 : 20

  // Caixa do técnico (esquerda)
  pdf.setFillColor(243, 244, 246); pdf.setDrawColor(209, 213, 219)
  pdf.rect(M, y - 4, halfW, sigBoxH, 'FD')
  pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
  pdf.text('T\u00c9CNICO RESPONS\u00c1VEL', M + 2, y)
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
  pdf.text(relatorio?.tecnico ?? (isReparacao ? '\u2014' : manutencao?.tecnico) ?? '\u2014', M + 2, y + 5)
  if (tecnicoObj?.telefone) {
    pdf.setFontSize(7); pdf.setTextColor(107, 114, 128)
    pdf.text('Tel: ' + tecnicoObj.telefone, M + 2, y + 10)
  }
  if (hasTecSig) {
    try { pdf.addImage(tecnicoObj.assinaturaDigital, 'PNG', M + 2, y + 13, halfW - 8, 18, undefined, 'FAST') } catch (_) { /* sem imagem */ }
  }

  // Caixa do cliente (direita)
  const xRight = M + halfW + 4
  pdf.setFillColor(240, 253, 244); pdf.setDrawColor(187, 247, 208)
  pdf.rect(xRight, y - 4, halfW, sigBoxH, 'FD')
  pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(22, 163, 74)
  pdf.text('ASSINATURA DO CLIENTE', xRight + 2, y)
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39)
  pdf.text(relatorio?.nomeAssinante ?? '\u2014', xRight + 2, y + 5)
  pdf.setFontSize(7); pdf.setTextColor(107, 114, 128)
  pdf.text(`Assinado em ${dataAssin}`, xRight + 2, y + 10)
  if (hasCliSig) {
    try { pdf.addImage(relatorio.assinaturaDigital, 'PNG', xRight + 2, y + 13, halfW - 8, 18, undefined, 'FAST') } catch (_) { /* sem imagem */ }
  }

  y += sigBoxH + 8

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

/**
 * Logos em base64 (sem prefixo data:) para o PDF do servidor (send-email.php / FPDF).
 * Mesma lógica de carregamento que o cabeçalho de {@link gerarPdfCompacto} (incl. proxy para marcas).
 *
 * @param {{ maquina?: object, marcas?: object[] }} params
 * @returns {Promise<{ navelLogoB64: string, brandLogoB64: string }>}
 */
export async function getHeaderLogosB64ForEmail({ maquina, marcas = [] }) {
  let navelLogoB64 = ''
  let brandLogoB64 = ''
  try {
    const logoImg = await loadImageAsDataUrl(`${import.meta.env.BASE_URL}NAVEL_LOGO.jpg`)
    if (logoImg) {
      const comma = logoImg.indexOf(',')
      navelLogoB64 = comma >= 0 ? logoImg.substring(comma + 1) : ''
    }
  } catch (_) { /* noop */ }
  let brandLogoSrc = (maquina?.marcaLogoUrl || '').trim()
  if (!brandLogoSrc && maquina?.marca && marcas.length > 0) {
    const mk = marcas.find(m => (m.nome || '').toLowerCase() === (maquina.marca || '').toLowerCase())
    if (mk?.logoUrl) brandLogoSrc = mk.logoUrl.trim()
  }
  if (brandLogoSrc) {
    try {
      const brandImg = await loadImageAsDataUrl(brandLogoSrc)
      if (brandImg) {
        const comma = brandImg.indexOf(',')
        brandLogoB64 = comma >= 0 ? brandImg.substring(comma + 1) : ''
      }
    } catch (_) { /* noop */ }
  }
  return { navelLogoB64, brandLogoB64 }
}
