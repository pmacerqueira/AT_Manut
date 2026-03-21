/**
 * emailService.js — Envio de relatórios por email.
 *
 * Dois endpoints no cPanel:
 *   send-email.php  — recebe dados estruturados, gera PDF com FPDF, envia com anexo
 *   send-report.php — recebe HTML pré-renderizado; se `pdf_base64`+`pdf_filename` forem enviados, anexa PDF (multipart)
 *
 * Funções exportadas:
 *   enviarRelatorioEmail       — manutenções (dados → send-email.php → PDF anexo)
 *   enviarRelatorioHtmlEmail   — HTML no corpo (reparações, frota, etc.); PDF opcional via base64
 *   enviarLembreteEmail        — alertas de manutenção próxima (dados → send-email.php)
 */
import { formatDataHoraAzores, formatDataAzores } from '../utils/datasAzores'
import { computarProximasDatas } from '../utils/diasUteis'
import { getHeaderLogosB64ForEmail } from '../utils/gerarPdfRelatorio'
import { resolveChecklist } from '../utils/resolveChecklist'
import { EMAIL_CONFIG, isEmailConfigured } from '../config/emailConfig'
import { APP_VERSION } from '../config/version'
import { logger } from '../utils/logger'
import { marcarAlertaEnviado } from '../config/alertasConfig'

// ── Resize de foto com compressão adaptativa ─────────────────────────────────
//
// Redimensiona para maxW e testa qualidades decrescentes até o raw base64
// caber em maxB64Chars. Usado com:
//   - Primeiras 2 fotos: 400px, 12 KB cada (melhor qualidade no PDF)
//   - Restantes: 160px, 3.5 KB cada (thumbnails no corpo do email)
//
// Sequência: 68% → 55% → 42% → 30% → 20% → 14%

async function resizirParaThumb(dataUrl, maxW = 160, _qualidadeIgnorada, maxB64Chars = 3500) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)

      // Testa qualidades da melhor para a pior; retorna a 1ª que cabe no cap.
      const qualidades = [0.68, 0.55, 0.42, 0.30, 0.20, 0.14]
      for (const q of qualidades) {
        const out   = c.toDataURL('image/jpeg', q)
        const comma = out.indexOf(',')
        const raw   = comma >= 0 ? out.substring(comma + 1) : out
        if (raw.length <= maxB64Chars) {
          resolve(out)
          return
        }
      }
      // Último recurso: abaixo do cap garantido
      resolve(c.toDataURL('image/jpeg', 0.10))
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

// ── Envio principal ──────────────────────────────────────────────────────────

/**
 * Envia o relatório de manutenção por email via cPanel (noreply@navel.pt).
 *
 * @param {object} params
 * @returns {Promise<{ ok: boolean, message: string, isMailto?: boolean }>}
 */
export async function enviarRelatorioEmail({
  emailDestinatario,
  relatorio,
  manutencao,
  maquina,
  cliente,
  checklistItems  = [],
  subcategoriaNome = '',
  logoUrl          = '',
  tecnicoObj       = null,
  marcas           = [],
}) {
  if (!emailDestinatario?.trim()) {
    return { ok: false, message: 'Endereço de email em falta.' }
  }

  const tipoServico = manutencao?.tipo === 'montagem' ? 'Montagem' : 'Manutenção Periódica'
  const numeroRel   = relatorio?.numeroRelatorio ?? 'S/N'
  const equipDesc   = maquina
    ? `${maquina.marca} ${maquina.modelo} (${maquina.numeroSerie})`
    : '—'
  const dataReal = relatorio?.dataAssinatura
    ? formatDataHoraAzores(relatorio.dataAssinatura)
    : '—'

  // ── Envio via PHP no cPanel ──────────────────────────────────────────────────
  if (isEmailConfigured()) {
    try {
      // Usar snapshot do relatório quando disponível (imutabilidade)
      const itemsResolvidos = resolveChecklist(relatorio, checklistItems)
      const checklistJson = JSON.stringify(
        itemsResolvidos.map(item => ({
          texto: item.texto,
          resp:  relatorio?.checklistRespostas?.[item.id] ?? '',
        }))
      )

      // Fotos: 1-2 primeiras com melhor qualidade para o PDF; restantes como thumbnails.
      // CRÍTICO: enviar APENAS o raw base64 sem o prefixo "data:image/jpeg;base64,".
      const fotosOriginais = relatorio?.fotos ?? []
      // Primeiras 2 fotos: 400px, até 12 KB cada (melhor qualidade no PDF); restantes: 160px
      let photosJson = '[]'
      if (fotosOriginais.length > 0) {
        const thumbs  = await Promise.all(fotosOriginais.slice(0, 5).map((f, i) =>
          resizirParaThumb(f, i < 2 ? 400 : 160, null, i < 2 ? 12000 : 3500)
        ))
        const rawB64  = thumbs
          .filter(Boolean)
          .map(dataUrl => {
            const comma = dataUrl.indexOf(',')
            return comma >= 0 ? dataUrl.substring(comma + 1) : null
          })
          .filter(Boolean)
        if (rawB64.length > 0) photosJson = JSON.stringify(rawB64)
      }

      // Data da próxima manutenção agendada (da ficha da máquina) — texto informativo no email
      const proximaManutRaw = maquina?.proximaManut ?? ''
      const proximaManutFmt = proximaManutRaw
        ? formatDataAzores(proximaManutRaw, true)
        : ''

      // Mesma lógica que gerarPdfCompacto / Obter PDF: próximas datas + declaração no PDF anexo
      const dataExec =
        relatorio?.dataCriacao?.slice(0, 10) ||
        relatorio?.dataAssinatura?.slice(0, 10) ||
        manutencao?.data ||
        ''
      const periMaq = maquina?.periodicidadeManut
      const proximasManutencoes =
        periMaq && dataExec
          ? computarProximasDatas(dataExec, periMaq, {
              tecnico: manutencao?.tecnico || relatorio?.tecnico || '',
            })
          : []
      const manutencaoTipo = manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica'
      const pecasUsadas = relatorio?.pecasUsadas ?? []

      const { navelLogoB64, brandLogoB64 } = await getHeaderLogosB64ForEmail({ maquina, marcas })

      // Enviamos um JSON body (Content-Type: application/json).
      // As regras ModSecurity para URL-encoded POST (que filtram @ e $) NÃO se aplicam
      // a JSON bodies. O preflight OPTIONS resultante tem apenas "content-type" no
      // Access-Control-Request-Headers — muito menos provável de ser bloqueado pelo WAF
      // do que custom headers como X-Api-Key ou X-To-Email.
      // Assinatura digital: raw base64 (sem prefixo data:) para evitar ModSecurity
      let assinaturaB64 = ''
      if (relatorio?.assinaturaDigital) {
        const comma = relatorio.assinaturaDigital.indexOf(',')
        assinaturaB64 = comma >= 0 ? relatorio.assinaturaDigital.substring(comma + 1) : relatorio.assinaturaDigital
      }

      let tecnicoAssinaturaB64 = ''
      if (tecnicoObj?.assinaturaDigital) {
        const c = tecnicoObj.assinaturaDigital.indexOf(',')
        tecnicoAssinaturaB64 = c >= 0 ? tecnicoObj.assinaturaDigital.substring(c + 1) : tecnicoObj.assinaturaDigital
      }

      const payload = {
        auth_token:       EMAIL_CONFIG.AUTH_TOKEN,
        app_version:      APP_VERSION,
        to_email:         emailDestinatario.trim(),
        to_name:          cliente?.nome ?? '',
        numero_relatorio: numeroRel,
        tipo_servico:     tipoServico,
        equipamento:      equipDesc,
        data_realizacao:  dataReal,
        tecnico:          relatorio?.tecnico ?? manutencao?.tecnico ?? '—',
        assinado_por:     relatorio?.nomeAssinante ?? '',
        data_assinatura:  relatorio?.dataAssinatura ?? '',
        assinatura_digital: assinaturaB64,
        notas:            relatorio?.notas ?? '',
        checklist_json:   checklistJson,
        photos_json:      photosJson,
        n_fotos:          fotosOriginais.length,
        proxima_manut:    proximaManutFmt,
        /** PDF FPDF: alinhar com Obter PDF (gerarPdfCompacto) */
        manutencao_tipo:          manutencaoTipo,
        periodicidade_maquina:    periMaq ?? '',
        proximas_manutencoes_json: JSON.stringify(proximasManutencoes),
        pecas_usadas_json:        JSON.stringify(pecasUsadas),
        /** Cabeçalho FPDF: mesmos logos que "Obter PDF" (base64 raw, sem prefixo data:) */
        navel_logo_b64:  navelLogoB64 || '',
        brand_logo_b64:  brandLogoB64 || '',
        tecnico_telefone:       tecnicoObj?.telefone ?? '',
        tecnico_assinatura_b64: tecnicoAssinaturaB64,
      }

      const bodyStr = JSON.stringify(payload)

      const response = await fetch(EMAIL_CONFIG.ENDPOINT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    bodyStr,
      })

      const json = await response.json().catch(() => ({ ok: false, message: `HTTP ${response.status}` }))

      if (response.ok && json.ok) {
        logger.action('emailService', 'sendEmail',
          `Relatório ${numeroRel} enviado para ${emailDestinatario}`,
          { numeroRel, destinatario: emailDestinatario })
        return { ok: true, message: `Email enviado com sucesso para ${emailDestinatario}.` }
      }

      const errMsg = json.message ?? `Erro no servidor de email (HTTP ${response.status}).`
      logger.error('emailService', 'sendEmail',
        `Falha ao enviar relatório ${numeroRel}: ${errMsg}`,
        { numeroRel, destinatario: emailDestinatario, status: response.status })
      return { ok: false, message: errMsg }
    } catch (err) {
      logger.error('emailService', 'sendEmail',
        `Erro de rede ao enviar relatório ${numeroRel}: ${err.message}`,
        { numeroRel, destinatario: emailDestinatario, errorMessage: err.message })
      return {
        ok:      false,
        message: `Não foi possível contactar o servidor de email. Verifique a ligação à internet. (${err.message})`,
      }
    }
  }

  // ── Fallback: mailto: (endpoint ainda não configurado) ───────────────────
  const subject = encodeURIComponent(`Relatório de Manutenção N.º ${numeroRel} — ${equipDesc}`)
  const body    = encodeURIComponent(
    `Exmo(a) Sr(a) ${cliente?.nome ?? ''},\n\n` +
    `Relatório de ${tipoServico} N.º ${numeroRel}.\n\n` +
    `Equipamento: ${equipDesc}\n` +
    `Data de execução: ${dataReal}\n` +
    `Técnico: ${relatorio?.tecnico ?? '—'}\n\n` +
    `Com os melhores cumprimentos,\nNAVEL \u2013 AÇORES\nwww.navel.pt`
  )
  window.open(`mailto:${emailDestinatario}?subject=${subject}&body=${body}`, '_blank')

  return {
    ok:       true,
    message:  `Cliente de email aberto para ${emailDestinatario}. Anexe o PDF e envie.\n(Endpoint PHP não configurado — ver src/config/emailConfig.js)`,
    isMailto: true,
  }
}

// ── Envio de relatório com HTML pré-renderizado (reparações, etc.) ───────────

/**
 * Envia um relatório cujo HTML já foi gerado no frontend (via send-report.php).
 * Usado para reparações e qualquer fluxo onde o HTML é criado client-side.
 *
 * @param {object} params
 * @param {string} params.destinatario  - Email do destinatário
 * @param {string} params.assunto       - Assunto do email
 * @param {string} params.html          - Corpo HTML completo pré-renderizado
 * @param {string} [params.cc]          - Email em cópia (default: comercial@navel.pt)
 * @param {string} [params.nomeCliente] - Nome do cliente (para logging)
 * @param {string} [params.pdfBase64]   - PDF em base64 sem prefixo data: (anexo multipart)
 * @param {string} [params.pdfFilename] - Nome do ficheiro anexo (default relatorio.pdf)
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function enviarRelatorioHtmlEmail({
  destinatario,
  assunto,
  html,
  cc = 'comercial@navel.pt',
  nomeCliente = '',
  pdfBase64 = '',
  pdfFilename = 'relatorio.pdf',
}) {
  if (!destinatario?.trim()) {
    return { ok: false, message: 'Endereço de email em falta.' }
  }

  if (!isEmailConfigured()) {
    const subject = encodeURIComponent(assunto || 'Relatório — Navel')
    const body = encodeURIComponent(
      `Exmo(a) Sr(a) ${nomeCliente},\n\nSegue em anexo o relatório.\n\nNAVEL \u2013 AÇORES\nwww.navel.pt`
    )
    window.open(`mailto:${destinatario}?subject=${subject}&body=${body}`, '_blank')
    return { ok: true, message: `Cliente de email aberto para ${destinatario}.`, isMailto: true }
  }

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL
      || (typeof window !== 'undefined' ? window.location.origin : '')
    const url = apiBase
      ? `${apiBase.replace(/\/$/, '')}/api/send-report.php`
      : '/api/send-report.php'

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: EMAIL_CONFIG.AUTH_TOKEN,
        destinatario: destinatario.trim(),
        cc,
        assunto: assunto || 'Relatório — Navel',
        corpoHtml: html,
        ...(pdfBase64 ? { pdf_base64: pdfBase64, pdf_filename: pdfFilename } : {}),
      }),
    })

    const json = await response.json().catch(() => ({ ok: false, message: `HTTP ${response.status}` }))

    if (response.ok && json.ok) {
      logger.action('emailService', 'sendHtmlEmail',
        `${pdfBase64 ? 'Email HTML+PDF' : 'Email HTML'} enviado para ${destinatario}`,
        { destinatario, assunto: assunto?.substring(0, 60), comAnexo: !!pdfBase64 })
      return { ok: true, message: `Email enviado com sucesso para ${destinatario}.` }
    }

    const errMsg = json.message ?? json.erro ?? `Erro no servidor (HTTP ${response.status}).`
    logger.error('emailService', 'sendHtmlEmail', errMsg, { destinatario, status: response.status })
    return { ok: false, message: errMsg }
  } catch (err) {
    logger.error('emailService', 'sendHtmlEmail',
      `Erro de rede: ${err.message}`, { destinatario, errorMessage: err.message })
    return {
      ok: false,
      message: `Não foi possível contactar o servidor de email. (${err.message})`,
      isNetworkError: true,
    }
  }
}

// ── Lembrete de manutenção próxima ───────────────────────────────────────────

/**
 * Envia lembretes de manutenções próximas para um cliente.
 *
 * @param {object} params
 * @param {string} params.emailDestinatario   - Email do cliente
 * @param {string} params.clienteNome         - Nome do cliente
 * @param {Array}  params.alertas             - Array de { maquina, manutencao, diasRestantes }
 * @param {string} [params.logoUrl]           - URL do logótipo para o email
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function enviarLembreteEmail({ emailDestinatario, clienteNome, alertas, logoUrl = '' }) {
  if (!emailDestinatario?.trim()) {
    return { ok: false, message: 'Endereço de email em falta.' }
  }
  if (!alertas?.length) {
    return { ok: false, message: 'Sem manutenções a notificar.' }
  }

  const alertasJson = JSON.stringify(
    alertas.map(a => ({
      maquina:       `${a.maquina?.marca ?? ''} ${a.maquina?.modelo ?? ''}`.trim(),
      serie:         a.maquina?.numeroSerie ?? '',
      data:          a.manutencao?.data ?? '',
      diasRestantes: a.diasRestantes,
    }))
  )

  if (isEmailConfigured()) {
    try {
      const payload = {
        auth_token:     EMAIL_CONFIG.AUTH_TOKEN,
        app_version:    APP_VERSION,
        tipo_email:     'lembrete',
        to_email:       emailDestinatario.trim(),
        to_name:        clienteNome,
        alertas_json:   alertasJson,
        logo_url:       logoUrl,
      }

      const response = await fetch(EMAIL_CONFIG.ENDPOINT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      const json = await response.json().catch(() => ({ ok: false, message: `HTTP ${response.status}` }))

      if (response.ok && json.ok) {
        // Registar alertas como enviados
        alertas.forEach(a => marcarAlertaEnviado(a.maquina?.id, a.manutencao?.data))
        logger.action('emailService', 'sendLembrete',
          `Lembrete enviado para ${emailDestinatario} (${alertas.length} manutenção/ões)`,
          { destinatario: emailDestinatario, n: alertas.length })
        return { ok: true, message: `Lembrete enviado para ${emailDestinatario}.` }
      }

      const errMsg = json.message ?? `Erro no servidor de email (HTTP ${response.status}).`
      logger.error('emailService', 'sendLembrete', errMsg, { destinatario: emailDestinatario })
      return { ok: false, message: errMsg }
    } catch (err) {
      logger.error('emailService', 'sendLembrete', `Erro de rede: ${err.message}`, { errorMessage: err.message })
      return { ok: false, message: `Não foi possível contactar o servidor. (${err.message})` }
    }
  }

  // Fallback: mailto:
  const subjectFallback = encodeURIComponent(`Lembrete: Manutenções programadas — ${clienteNome}`)
  const bodyFallback    = encodeURIComponent(
    `Exmo(a) Sr(a) ${clienteNome},\n\n` +
    `Informamos que tem as seguintes manutenções programadas:\n\n` +
    alertas.map(a =>
      `• ${a.maquina?.marca ?? ''} ${a.maquina?.modelo ?? ''} (S/N: ${a.maquina?.numeroSerie ?? '—'})` +
      ` — Data: ${a.manutencao?.data ?? '?'} (daqui a ${a.diasRestantes} dia(s))`
    ).join('\n') +
    `\n\nCom os melhores cumprimentos,\nNAVEL \u2013 AÇORES\nwww.navel.pt`
  )
  window.open(`mailto:${emailDestinatario}?subject=${subjectFallback}&body=${bodyFallback}`, '_blank')
  alertas.forEach(a => marcarAlertaEnviado(a.maquina?.id, a.manutencao?.data))
  return {
    ok:       true,
    message:  `Cliente de email aberto para ${emailDestinatario}.`,
    isMailto: true,
  }
}

/**
 * Converte Blob (ex. PDF gerado no browser) para base64 **sem** prefixo `data:*;base64,`
 * — formato de `pdf_base64` em {@link enviarRelatorioHtmlEmail} / `send-report.php`.
 */
export function blobToRawBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => {
      const s = String(r.result || '')
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : '')
    }
    r.onerror = () => reject(new Error('Leitura do ficheiro falhou'))
    r.readAsDataURL(blob)
  })
}
