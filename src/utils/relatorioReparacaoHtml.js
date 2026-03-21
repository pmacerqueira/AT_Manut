/**
 * relatorioReparacaoParaHtml – Gera HTML do relatório de reparação para visualização/email/impressão.
 * Design: mesmo estilo industrial Navel, com secções específicas de reparação
 * (avaria, trabalho realizado, peças/consumíveis, checklist, assinatura).
 */
import { formatDataHoraAzores, formatDataAzores } from './datasAzores'
import { escapeHtml, safeDataImageUrl } from './sanitize'
import { resolveChecklist } from './resolveChecklist'
import { getDeclaracaoCliente } from '../constants/relatorio'
import { MAX_FOTOS } from '../config/limits'
import {
  cssBase,
  htmlHeader,
  htmlTituloBar,
  htmlPaginaCliente,
  htmlFooter,
  htmlFotos,
  PALETA,
  TIPO,
} from './relatorioBaseStyles'

function normalizeHexColor(value, fallback) {
  const raw = String(value ?? '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase()
  }
  return fallback
}

function hexToRgba(hex, alpha) {
  const h = normalizeHexColor(hex, '#000000')
  const r = Number.parseInt(h.slice(1, 3), 16)
  const g = Number.parseInt(h.slice(3, 5), 16)
  const b = Number.parseInt(h.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function relatorioReparacaoParaHtml(relatorio, reparacao, maquina, cliente, checklistItems = [], options = {}) {
  if (!relatorio) return ''
  const { subcategoriaNome, logoUrl, istobalLogoUrl, tecnicoObj } = options
  const logoSrc = logoUrl ?? '/manut/logo-navel.png'
  const logoIstobalSrc = istobalLogoUrl ?? '/manut/logo-istobal.png'
  const esc = escapeHtml
  const isIstobalReport = (
    reparacao?.origem === 'istobal_email' ||
    /istobal/i.test(String(maquina?.marca ?? '')) ||
    /istobal/i.test(String(subcategoriaNome ?? ''))
  )
  const logoMarcaSrc = maquina?.marcaLogoUrl || (isIstobalReport ? logoIstobalSrc : '')
  const logoMarcaAlt = maquina?.marca ? `Logotipo ${maquina.marca}` : 'Logotipo da marca'
  const brandPrimary = normalizeHexColor(maquina?.marcaCorHex, isIstobalReport ? '#c8102e' : '#b45309')
  const brandSoft = hexToRgba(brandPrimary, 0.09)
  const brandBorder = hexToRgba(brandPrimary, 0.28)

  // ── Datas ──
  const dataEmissao = relatorio.dataCriacao
    ? formatDataAzores(relatorio.dataCriacao, true) : '—'
  const dataAssinatura = relatorio.dataAssinatura
    ? formatDataHoraAzores(relatorio.dataAssinatura)
    : 'Pendente de assinatura'
  const dataRealizacaoBruta = relatorio.dataRealizacao || reparacao?.data || relatorio.dataAssinatura || relatorio.dataCriacao
  const dataRealizacao = dataRealizacaoBruta
    ? formatDataAzores(dataRealizacaoBruta, true)
    : 'Pendente de preenchimento'
  const dataCriacao = relatorio.dataCriacao
    ? formatDataHoraAzores(relatorio.dataCriacao) : '—'

  // ── Equipamento ──
  const equipCompleto = maquina && subcategoriaNome
    ? esc(`${subcategoriaNome} — ${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}`)
    : maquina ? esc(`${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}`) : '—'

  // ── Peças ──
  let pecas = []
  try {
    const p = typeof relatorio.pecasUsadas === 'string'
      ? JSON.parse(relatorio.pecasUsadas || '[]') : (relatorio.pecasUsadas ?? [])
    pecas = Array.isArray(p) ? p : []
  } catch { /* empty */ }
  const temPecas = pecas.length > 0 && pecas.some(p => p.descricao?.trim())

  // ── Checklist ──
  let checklistRespostas = {}
  try {
    const cr = typeof relatorio.checklistRespostas === 'string'
      ? JSON.parse(relatorio.checklistRespostas || '{}') : (relatorio.checklistRespostas ?? {})
    checklistRespostas = (cr && typeof cr === 'object' && !Array.isArray(cr)) ? cr : {}
  } catch { /* empty */ }
  const checklistEntries = Object.entries(checklistRespostas)
  const temChecklist = checklistEntries.length > 0

  // ── Fotos ──
  let fotos = []
  try {
    const f = typeof relatorio.fotos === 'string'
      ? JSON.parse(relatorio.fotos || '[]') : (relatorio.fotos ?? [])
    fotos = Array.isArray(f) ? f : []
  } catch { /* empty */ }
  const fotosSafe = fotos.map(f => safeDataImageUrl(f)).filter(Boolean).slice(0, MAX_FOTOS)

  // Mapa id → texto legível para lookup rápido
  const checklistMap = {}
  checklistItems.forEach(it => { checklistMap[it.id] = it.texto ?? it.descricao ?? it.nome ?? it.id })

  const buildCheckRow = ([id, resp], i) => {
    const texto = checklistMap[id] ?? id
    const badge = resp === 'OK'
      ? `<span class="badge-sim" style="background:#dcfce7;color:#14532d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #86efac">OK</span>`
      : resp === 'NOK' ? `<span class="badge-nao" style="background:#fee2e2;color:#7f1d1d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #fca5a5">NOK</span>` : `<span class="badge-nd" style="color:${PALETA.muted}">N/A</span>`
    const rowBg = i % 2 === 1 ? `;background:${PALETA.cinza}` : ''
    return `<tr style="border-bottom:1px solid ${PALETA.bordaLeve}${rowBg}"><td class="cl-num" style="width:1.6em;color:${PALETA.muted};font-size:${TIPO.label};padding:3px 4px;white-space:nowrap;vertical-align:top;text-align:right;padding-right:6px">${i + 1}.</td><td class="cl-texto" style="padding:3px 6px 3px 4px;vertical-align:top;font-size:${TIPO.pequeno};color:${PALETA.texto}">${esc(texto)}</td><td class="cl-badge" style="width:32px;text-align:center;padding:3px 2px;white-space:nowrap;vertical-align:top">${badge}</td></tr>`
  }

  const istobalBadge = reparacao?.origem === 'istobal_email'
    ? ' <span class="rpt-istobal-badge">⚡ ISTOBAL</span>' : ''
  const tituloBar = htmlTituloBar(
    'Relatório de Reparação',
    'Nº Relatório',
    relatorio.numeroRelatorio ?? '—',
    istobalBadge
  )

  const cssReparacao = `
/* ── Reparação: variáveis de marca ── */
:root { --rep: ${brandPrimary}; --rep-bg: ${brandSoft}; --rep-borda: ${brandBorder} }

/* Bloco de texto longo */
.rpt-text-block {
  background: var(--cinza); border-radius: 3px; padding: 5px 7px;
  font-size: 9.5px; line-height: 1.5; color: var(--texto);
  white-space: pre-wrap; word-break: break-word;
}

/* Peças (reparação: código, descrição, qtd) */
.pecas-table .td-qtd { text-align: center; font-weight: 700; width: 3rem }

/* Checklist reparação (OK/NOK/N/A) */
.cl-table { width: 100%; border-collapse: collapse; font-size: 9.5px }
.cl-table td { padding: 2px 4px; border-bottom: 1px solid var(--borda-leve); vertical-align: middle }
.cl-table tr:last-child td { border-bottom: none }
.cl-num { width: 1.5rem; color: var(--muted); text-align: right; padding-right: 6px }
.cl-texto { flex: 1 }
.cl-badge { text-align: right; width: 2.5rem }

/* Aviso ISTOBAL */
.rpt-istobal-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: #fff7ed; color: var(--rep);
  border: 1px solid var(--rep-borda); border-radius: 3px;
  padding: 1.5px 6px; font-size: 8.5px; font-weight: 700; margin-left: 6px;
}
`

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Reparação ${esc(relatorio.numeroRelatorio ?? '')} — Navel</title>
<style>
${cssBase(brandPrimary, brandSoft)}
${cssReparacao}
</style>
</head>
<body>

<section>
${htmlHeader(logoSrc, logoMarcaSrc, logoMarcaAlt)}
${tituloBar}
</section>

<!-- Dados gerais -->
<section>
  <div class="rpt-section-title">Dados da Intervenção</div>
  <div class="rpt-grid">
    <div class="rpt-field"><span class="rpt-label">Data de realização</span><span class="rpt-value">${esc(dataRealizacao)}</span></div>
    <div class="rpt-field"><span class="rpt-label">Data de emissão do relatório</span><span class="rpt-value">${esc(dataEmissao)}</span></div>
    <div class="rpt-field"><span class="rpt-label">Técnico</span><span class="rpt-value">${esc(relatorio.tecnico ?? '—')}</span></div>
    <div class="rpt-field"><span class="rpt-label">Equipamento</span><span class="rpt-value">${equipCompleto}</span></div>
    <div class="rpt-field"><span class="rpt-label">Cliente</span><span class="rpt-value">${esc(cliente?.nome ?? '—')}</span></div>
    ${relatorio.numeroAviso ? `<div class="rpt-field"><span class="rpt-label">Nº Aviso / Pedido</span><span class="rpt-value">${esc(relatorio.numeroAviso)}</span></div>` : ''}
    ${relatorio.horasMaoObra != null ? `<div class="rpt-field"><span class="rpt-label">Horas de mão de obra</span><span class="rpt-value">${esc(String(relatorio.horasMaoObra))} h</span></div>` : ''}
    ${cliente?.morada ? `<div class="rpt-field"><span class="rpt-label">Localização</span><span class="rpt-value">${esc(cliente.morada)}${cliente.localidade ? `, ${esc(cliente.localidade)}` : ''}</span></div>` : ''}
    ${maquina?.numeroSerie ? `<div class="rpt-field"><span class="rpt-label">Nº de Série</span><span class="rpt-value">${esc(maquina.numeroSerie)}</span></div>` : ''}
  </div>
</section>

<!-- Avaria -->
${relatorio.descricaoAvaria ? `
<section>
  <div class="rpt-section-title">Avaria / Problema Reportado</div>
  <div class="rpt-text-block">${esc(relatorio.descricaoAvaria)}</div>
</section>
` : ''}

<!-- Trabalho realizado -->
${relatorio.trabalhoRealizado ? `
<section>
  <div class="rpt-section-title">Trabalho Realizado</div>
  <div class="rpt-text-block">${esc(relatorio.trabalhoRealizado)}</div>
</section>
` : ''}

<!-- Peças / Consumíveis -->
${temPecas ? `
<section>
  <div class="rpt-section-title" style="font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px">Peças / Consumíveis Utilizados</div>
  <table class="pecas-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:${TIPO.pequeno};margin-bottom:4px">
    <thead>
      <tr>
        <th style="background:${PALETA.azulNavel};color:#fff;padding:4px 6px;text-align:left;font-size:${TIPO.label};text-transform:uppercase;letter-spacing:.04em">Código</th>
        <th style="background:${PALETA.azulNavel};color:#fff;padding:4px 6px;text-align:left;font-size:${TIPO.label};text-transform:uppercase;letter-spacing:.04em">Descrição</th>
        <th style="background:${PALETA.azulNavel};color:#fff;padding:4px 6px;text-align:center;font-size:${TIPO.label};text-transform:uppercase;letter-spacing:.04em;width:3rem">Qtd</th>
      </tr>
    </thead>
    <tbody>
      ${pecas.filter(p => p.descricao?.trim() || p.codigo?.trim()).map((p, i) => {
        const bg = i % 2 === 1 ? `;background:${PALETA.cinza}` : ''
        return `<tr style="border-bottom:1px solid ${PALETA.bordaLeve}${bg}"><td style="padding:3px 6px;vertical-align:middle;font-size:${TIPO.pequeno};color:${PALETA.texto};font-family:'Courier New',monospace">${esc(p.codigo ?? '—')}</td><td style="padding:3px 6px;vertical-align:middle;font-size:${TIPO.pequeno};color:${PALETA.texto}">${esc(p.descricao ?? '—')}</td><td class="td-qtd" style="padding:3px 6px;vertical-align:middle;text-align:center;font-weight:700;font-size:${TIPO.pequeno};color:${PALETA.texto}">${esc(String(p.quantidade ?? 1))}</td></tr>`
      }).join('')}
    </tbody>
  </table>
</section>
` : ''}

<!-- Checklist -->
${temChecklist ? `
<section>
  <div class="rpt-section-title" style="font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px">Checklist de Verificação</div>
  <table class="cl-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:${TIPO.pequeno}">
    <tbody>
      ${checklistEntries.map(buildCheckRow).join('')}
    </tbody>
  </table>
</section>
` : ''}

<!-- Notas -->
${relatorio.notas ? `
<section>
  <div class="rpt-section-title" style="font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px">Notas / Observações</div>
  <div class="rpt-text-block" style="background:rgba(26,72,128,0.10);border-left:3px solid ${PALETA.azulNavel};padding:7px 10px;border-radius:0 4px 4px 0;font-size:${TIPO.corpo};color:${PALETA.texto};line-height:1.5;white-space:pre-wrap;word-break:break-word">${esc(relatorio.notas)}</div>
</section>
` : ''}

${htmlFotos(fotosSafe)}

<!-- Assinatura e declaração (página do cliente) + rodapé -->
${htmlPaginaCliente({
  tecnicoNome: relatorio.tecnico ?? '—',
  tecnicoTelefone: tecnicoObj?.telefone ?? '',
  tecnicoAssinatura: tecnicoObj?.assinaturaDigital ?? '',
  clienteNome: relatorio.nomeAssinante ?? '—',
  clienteAssinatura: relatorio.assinaturaDigital ?? '',
  dataCriacao,
  dataAssinatura,
  declaracaoTexto: getDeclaracaoCliente('reparacao'),
  proximasManutencoes: [],
})}

${htmlFooter('', `Relatório de Reparação ${relatorio.numeroRelatorio ?? ''}`)}

</body>
</html>`

  return html
}
