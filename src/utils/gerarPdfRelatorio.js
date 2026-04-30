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
import {
  INTERVALOS_KAESER,
  descricaoCicloKaeser,
  proximaPosicaoKaeser,
} from '../context/DataContext'
import {
  relatorioIncluiResumoPlanoNoPdf,
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

  // ── Dados do serviço ──────────────────────────────────────────────────────
  const horasPdf = horasContadorParaRelatorio(maquina, isReparacao ? null : manutencao, null, relatorio)
  const dataRows = isReparacao
    ? [
        ['CLIENTE',           cliente?.nome ?? '\u2014'],
        ['EQUIPAMENTO',       equipDesc],
        ['DATA DE REALIZA\u00c7\u00c3O', dataRealizacaoFmt],
        ['T\u00c9CNICO',      relatorio?.tecnico ?? '\u2014'],
      ]
    : [
        ['CLIENTE',           cliente?.nome ?? '\u2014'],
        ['EQUIPAMENTO',       equipDesc],
        ['DATA DE EXECU\u00c7\u00c3O', dataAssin],
        ['T\u00c9CNICO',      relatorio?.tecnico ?? manutencao?.tecnico ?? '\u2014'],
        ['ASSINADO POR',      relatorio?.nomeAssinante ?? '\u2014'],
      ]
  if (isReparacao && relatorio?.numeroAviso?.trim()) {
    dataRows.push(['N.\u00ba AVISO / PEDIDO', relatorio.numeroAviso.trim()])
  }
  if (horasPdf != null) {
    dataRows.push(['HORAS NO CONTADOR (ACUMULADAS)', `${horasPdf} h`])
  }
  if (isReparacao && relatorio?.horasMaoObra != null && relatorio.horasMaoObra !== '') {
    dataRows.push(['HORAS DE M\u00c3O-DE-OBRA', `${relatorio.horasMaoObra} h`])
  }
  if (isReparacao) {
    dataRows.push(['ASSINADO POR', relatorio?.nomeAssinante ?? '\u2014'])
  }

  pdf.setFontSize(9)
  /** Largura máx. da coluna de rótulos (mm) — evita sobrepor o valor (ex.: «HORAS NO CONTADOR (ACUMULADAS)»). */
  const dataLabelColW = 72
  const dataValueX = M + 74
  const dataValueMaxW = Math.max(24, W - M - dataValueX - 2)
  const dataLineH = 4.5
  dataRows.forEach(([label, val], i) => {
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

  if (!isReparacao && relatorioIncluiResumoPlanoNoPdf(maquina, manutencao)) {
    if (y > 248) { pdf.addPage(); y = 20 }
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('PLANO DE MANUTEN\u00c7\u00c3O (FABRICANTE / N.\u00ba DE S\u00c9RIE)', M, y)
    y += 5
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
    const tipoEf = relatorio?.tipoManutKaeser ?? ''
    const infoTipo = tipoEf && INTERVALOS_KAESER[tipoEf] ? INTERVALOS_KAESER[tipoEf].label : ''
    const linhasPlano = []
    if (horasPdf != null) {
      linhasPlano.push(`Horas no contador (acumuladas): ${horasPdf} h`)
    }
    if (tipoEf) linhasPlano.push(`Tipo efectivo nesta interven\u00e7\u00e3o: ${tipoEf}${infoTipo ? ` (${infoTipo})` : ''}`)
    else linhasPlano.push('Tipo efectivo nesta interven\u00e7\u00e3o: \u2014 (n\u00e3o indicado no relat\u00f3rio)')
    const pos = maquina?.posicaoKaeser
    if (pos != null) {
      linhasPlano.push(`Ciclo na ficha (refer\u00eancia): ${descricaoCicloKaeser(pos)}`)
      linhasPlano.push(`Seguinte no ciclo (12 anos): ${descricaoCicloKaeser(proximaPosicaoKaeser(pos))}`)
    } else {
      linhasPlano.push('Posi\u00e7\u00e3o no ciclo A/B/C/D: a definir na ficha / primeira execu\u00e7\u00e3o com plano.')
    }
    if (relatorio?.tipoManutKaeserSugerido || relatorio?.sugestaoFaseMotivo) {
      const sug = relatorio.tipoManutKaeserSugerido ?? ''
      const mot = relatorio.sugestaoFaseMotivo ?? ''
      let aud = 'Auditoria de sugest\u00e3o'
      if (sug) aud += `: sugerido ${sug}`
      if (mot) aud += ` (${mot})`
      linhasPlano.push(aud)
    }
    linhasPlano.forEach((line) => {
      const wrapped = pdf.splitTextToSize(line, cW)
      if (y + wrapped.length * 4 > 270) { pdf.addPage(); y = 20 }
      pdf.text(wrapped, M, y)
      y += wrapped.length * 4 + 1
    })
    y += 3
  }

  y += 3
  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3)
  pdf.line(M, y, W - M, y); y += 7

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
    if (y > 260) { pdf.addPage(); y = 20 }
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('CHECKLIST DE VERIFICA\u00c7\u00c3O', M, y); y += 6

    const valsCh = Object.values(relatorio?.checklistRespostas ?? {})
    const nSim = valsCh.filter(v => v === 'sim' || v === 'OK').length
    const nNao = valsCh.filter(v => v === 'nao' || v === 'NOK').length
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128)
    pdf.text(`${nSim} conforme \u2022 ${nNao} n\u00e3o conforme \u2022 ${checklistItems.length} itens`, M, y); y += 5

    const textLeftCl = M + 8
    /** Coluna SIM/NÃO alinhada \u00e0 direita; reserva espa\u00e7o para n\u00e3o cortar o texto antes do estado. */
    const badgeReserveMm = 18
    const textoItemMaxW = Math.max(40, W - M - badgeReserveMm - textLeftCl)

    pdf.setFontSize(8.5)
    checklistItems.forEach((item, i) => {
      const texto = String(item.texto ?? '')
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
      const linhasTxt = pdf.splitTextToSize(texto, textoItemMaxW)

      /** Espaço entre linhas (~8.5 pt), alinhado a outros blocos do PDF compacto */
      const checklistLineMm = 3.65
      /** Folha seguinte at\u00e9 o texto (todas as linhas) caber acima do rodap\u00e9 seguro */
      while (true) {
        const textoBlockBottomTry = y + (linhasTxt.length - 1) * checklistLineMm + 2.9
        if (textoBlockBottomTry <= 274) break
        pdf.addPage()
        y = 20
      }
      const lastBaseline = y + (linhasTxt.length - 1) * checklistLineMm
      const textoBlockBottom = lastBaseline + 2.9

      const stripePadTop = 3.95
      const stripePadBot = 1.85
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

      y = textoBlockBottom + 3
    })
    y += 4
  }

  function renderNotasSection() {
    if (!relatorio?.notas) return
    if (y > 240) { pdf.addPage(); y = 20 }
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
    pdf.text('NOTAS ADICIONAIS', M, y); y += 6
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81)
    const lines = pdf.splitTextToSize(relatorio.notas, cW)
    pdf.text(lines, M, y); y += lines.length * 5 + 5
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
    const subTit = relatorio?.tipoManutKaeser && INTERVALOS_KAESER[relatorio.tipoManutKaeser]
      ? ` \u2014 Tipo ${relatorio.tipoManutKaeser}`
      : ''
    const tituloConsumiveis = obrigaBlocoPecas
      ? `CONSUM\u00cdVEIS E PE\u00c7AS (PLANO FABRICANTE)${subTit}`
      : (secaoConsumiveisContador
        ? (isReparacao ? 'PE\u00c7AS E MATERIAIS (INTERVEN\u00c7\u00c3O)' : 'CONSUM\u00cdVEIS E PE\u00c7AS (INTERVEN\u00c7\u00c3O)')
        : (isReparacao ? 'PE\u00c7AS E MATERIAIS UTILIZADOS' : `CONSUM\u00cdVEIS E PE\u00c7AS (PLANO FABRICANTE)${subTit}`))
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

  // ── Declaração de aceitação do cliente ──────────────────────────────────────
  {
    if (y > 220) { pdf.addPage(); y = 20 }
    pdf.setFillColor(243, 244, 246); pdf.setDrawColor(30, 58, 95); pdf.setLineWidth(0.8)
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
    if (y + declBoxH > 270) { pdf.addPage(); y = 20 }
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

  // ── Próximas manutenções agendadas (omitir em relatórios de reparação) ─────
  if (!isReparacao) {
    const proximas = (proximasManutencoes ?? []).filter(pm => pm.data).sort((a, b) => a.data.localeCompare(b.data))
    const periMaqVal = maquina?.periodicidadeManut
    const periLabels = { trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual', mensal: 'Mensal' }
    const resolvePeriodicidade = (pm) => periLabels[pm.periodicidade] || periLabels[periMaqVal] || pm.tipo || '\u2014'

    if (proximas.length > 0 || periMaqVal) {
      if (y > 250) { pdf.addPage(); y = 20 }
      const fmtD = (d) => { const s = String(d ?? '').slice(0, 10).split('-'); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : '\u2014' }
      pdf.setFillColor(243, 244, 246); pdf.setDrawColor(30, 58, 95); pdf.setLineWidth(0.5)

      if (proximas.length > 0) {
        const tblH = 8 + proximas.length * 7 + 6
        if (y + tblH > 270) { pdf.addPage(); y = 20 }
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95)
        pdf.text('PR\u00d3XIMAS MANUTEN\u00c7\u00d5ES AGENDADAS', M, y); y += 6

        pdf.setFillColor(30, 58, 95); pdf.rect(M, y - 3.5, cW, 7, 'F')
        pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255)
        pdf.text('N.\u00ba', M + 2, y)
        pdf.text('Data prevista', M + 14, y)
        pdf.text('Periodicidade', M + 60, y)
        pdf.text('T\u00e9cnico', M + 110, y)
        y += 5

        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal')
        proximas.forEach((pm, i) => {
          if (y > 270) { pdf.addPage(); y = 20 }
          if (i % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(M, y - 3.5, cW, 7, 'F') }
          pdf.setTextColor(107, 114, 128); pdf.text(String(i + 1), M + 2, y)
          pdf.setTextColor(17, 24, 39); pdf.text(fmtD(pm.data), M + 14, y)
          pdf.setTextColor(55, 65, 81); pdf.text(resolvePeriodicidade(pm), M + 60, y)
          pdf.setTextColor(107, 114, 128); pdf.text(pm.tecnico ?? 'A designar', M + 110, y)
          y += 7
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

  // ── Bloco de assinaturas (técnico + cliente) ──
  if (y > 230) { pdf.addPage(); y = 20 }

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
