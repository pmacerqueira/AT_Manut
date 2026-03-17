/**
 * relatorioParaHtml – Gera HTML do relatório de manutenção para visualização/impressão.
 * Design: cabeçalho com logo + dados empresa, estilo industrial minimalista, paleta Navel.
 * Para compressores KAESER: secção dedicada com horas, ciclo A/B/C/D e tabela de consumíveis.
 * @see DESENVOLVIMENTO.md §4.1
 */
import { formatDataHoraAzores, formatDataAzores } from './datasAzores'
import { getDeclaracaoCliente } from '../constants/relatorio'
import { escapeHtml, safeDataImageUrl } from './sanitize'
import {
  INTERVALOS_KAESER,
  SEQUENCIA_KAESER,
  tipoKaeserNaPosicao,
  proximaPosicaoKaeser,
  descricaoCicloKaeser,
  isKaeserMarca,
} from '../context/DataContext'
import { resolveChecklist } from './resolveChecklist'
import { cssBase, htmlHeader, htmlTituloBar, htmlPaginaCliente, htmlFooter, htmlFotos, PALETA, TIPO } from './relatorioBaseStyles'

const HISTORIAL_MAX = 5
const ANOMALIA_TEXTO_MAX = 80

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

export function relatorioParaHtml(relatorio, manutencao, maquina, cliente, checklistItemsLive = [], options = {}) {
  if (!relatorio) return ''
  const checklistItems = resolveChecklist(relatorio, checklistItemsLive)
  const { subcategoriaNome, ultimoEnvio, logoUrl, istobalLogoUrl, tecnicoObj, proximasManutencoes, historicoRelatorios } = options
  const logoSrc = logoUrl ?? '/manut/logo-navel.png'
  const logoIstobalSrc = istobalLogoUrl ?? '/manut/logo-istobal.png'
  const esc = escapeHtml
  const isIstobalReport = (
    /istobal/i.test(String(maquina?.marca ?? '')) ||
    /istobal/i.test(String(subcategoriaNome ?? ''))
  )
  const logoMarcaSrc = maquina?.marcaLogoUrl || (isIstobalReport ? logoIstobalSrc : '')
  const logoMarcaAlt = maquina?.marca ? `Logotipo ${maquina.marca}` : 'Logotipo da marca'
  const brandPrimary = normalizeHexColor(maquina?.marcaCorHex, isIstobalReport ? '#c8102e' : '#1a4880')
  const brandSoft = hexToRgba(brandPrimary, 0.12)

  // ── Detecção KAESER — baseada na marca da máquina (não na subcategoria)
  // KAESER é exclusivo da categoria Compressores; outras marcas (Fini, ECF, IES, LaPadana)
  // também são compressores mas não usam o formato de relatório KAESER dedicado.
  const isKaeser = !!(
    relatorio.tipoManutKaeser ||
    isKaeserMarca(maquina?.marca)
  )
  const tipoKaeser       = relatorio.tipoManutKaeser ?? ''
  const infoTipoKaeser   = tipoKaeser ? INTERVALOS_KAESER[tipoKaeser] : null
  const posicaoAtual     = maquina?.posicaoKaeser ?? null
  const posicaoProxima   = posicaoAtual != null ? proximaPosicaoKaeser(posicaoAtual) : null
  const cicloAtualDesc   = posicaoAtual != null ? descricaoCicloKaeser(posicaoAtual) : null
  const cicloProximoDesc = posicaoProxima != null ? descricaoCicloKaeser(posicaoProxima) : null

  // ── Datas ──
  const dataCriacao    = relatorio.dataCriacao    ? formatDataHoraAzores(relatorio.dataCriacao)    : '—'
  const dataAssinatura = relatorio.dataAssinatura
    ? formatDataHoraAzores(relatorio.dataAssinatura)
    : 'Pendente de assinatura'
  const dataAgendada   = manutencao?.data ? formatDataAzores(manutencao.data, true) : '—'
  const dataRealizacao = relatorio.dataAssinatura
    ? formatDataAzores(relatorio.dataAssinatura, true)
    : (relatorio.dataCriacao ? formatDataAzores(relatorio.dataCriacao, true) : 'Pendente de preenchimento')

  const ultimoEnvioLinha = ultimoEnvio?.data && ultimoEnvio?.destinatario
    ? `Último envio por email: ${formatDataHoraAzores(ultimoEnvio.data)} para ${esc(ultimoEnvio.destinatario)}`
    : null
  const tecnicoNome    = esc(manutencao?.tecnico || relatorio?.tecnico || '—')
  const safeAssinatura = relatorio.assinaturaDigital ? safeDataImageUrl(relatorio.assinaturaDigital) : ''
  const tecSigSafe     = tecnicoObj?.assinaturaDigital ? safeDataImageUrl(tecnicoObj.assinaturaDigital) : ''
  const tecTelefone    = tecnicoObj?.telefone ? esc(tecnicoObj.telefone) : ''

  // ── Checklist — 2 colunas (geral) ou coluna única (KAESER, mais legível) ──
  const half = Math.ceil((checklistItems ?? []).length / 2)
  const col1 = (checklistItems ?? []).slice(0, half)
  const col2 = (checklistItems ?? []).slice(half)

  const buildCheckRow = (item, i, offset = 0) => {
    const r = relatorio.checklistRespostas?.[item.id]
    const badge = r === 'sim'
      ? `<span class="badge-sim" style="background:#dcfce7;color:#14532d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #86efac">SIM</span>`
      : r === 'nao' ? `<span class="badge-nao" style="background:#fee2e2;color:#7f1d1d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #fca5a5">NÃO</span>` : '<span class="badge-nd" style="color:#374151">—</span>'
    const rowBg = (i + offset) % 2 === 1 ? `;background:${PALETA.cinza}` : ''
    return `<tr style="border-bottom:1px solid ${PALETA.bordaLeve}${rowBg}"><td class="cl-num" style="width:1.6em;color:${PALETA.muted};font-size:${TIPO.label};padding:3px 4px;white-space:nowrap;vertical-align:top">${i + offset + 1}.</td><td class="cl-texto" style="padding:3px 6px 3px 4px;vertical-align:top;font-size:${TIPO.pequeno};color:${PALETA.texto}">${esc(item.texto)}</td><td class="cl-badge" style="width:32px;text-align:center;padding:3px 2px;white-space:nowrap;vertical-align:top">${badge}</td></tr>`
  }

  let html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Manutenção — Navel</title>
<style>
${cssBase(brandPrimary, brandSoft)}
/* ── KAESER (específico deste relatório) ── */
:root{--kaeser:#92400e;--kaeser-bg:#fffbeb;--kaeser-borda:#fde68a}
.kaeser-band{background:var(--kaeser-bg);border:1.5px solid var(--kaeser-borda);border-radius:5px;margin-bottom:9px;overflow:hidden;page-break-inside:avoid}
.kaeser-band-header{background:var(--kaeser);color:#fff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.kaeser-band-titulo{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.kaeser-band-subtitulo{font-size:9.5px;color:var(--muted)}
.kaeser-band-body{padding:7px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 14px}
.kaeser-item-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;display:block;margin-bottom:1px}
.kaeser-item-valor{font-size:11px;font-weight:600;color:var(--texto)}
.kaeser-item-valor.destaque{font-size:13px;font-weight:800;color:var(--kaeser)}
.kaeser-item-val-sub{font-size:9px;color:var(--muted);display:block}
.kaeser-seq{grid-column:1/-1;margin-top:4px;border-top:1px solid var(--kaeser-borda);padding-top:5px}
.kaeser-seq-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;margin-bottom:3px}
.kaeser-seq-dots{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.kaeser-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1.5px solid transparent;flex-shrink:0}
.kaeser-dot.passado{background:#e5e7eb;color:#4b5563;border-color:#d1d5db}
.kaeser-dot.atual{background:var(--kaeser);color:#fff;border-color:var(--kaeser)}
.kaeser-dot.proximo{background:#fff;color:var(--kaeser);border-color:var(--kaeser)}
.kaeser-dot.futuro{background:#f9fafb;color:#6b7280;border-color:#e5e7eb}
.kaeser-dot-sep{color:#6b7280;font-size:10px;padding:0 1px}
.kaeser-legend{font-size:8.5px;color:#6b7280;margin-left:6px}
.pecas-resumo-total{margin-left:auto;color:var(--muted)}
</style>
</head>
<body>

${htmlHeader(logoSrc, logoMarcaSrc, logoMarcaAlt)}

${htmlTituloBar('Relatório de Manutenção' + (isKaeser ? ' — Compressor' : ''), 'Nº de Serviço', relatorio?.numeroRelatorio ?? manutencao?.id ?? '—')}`

  // ── Bloco KAESER ── mostrado antes dos dados gerais
  if (isKaeser) {
    const tipoLabel    = infoTipoKaeser?.label ?? (tipoKaeser ? `Tipo ${tipoKaeser}` : 'Compressor')
    const tipoDesc     = infoTipoKaeser?.descricao ?? ''
    const horTotal     = maquina?.horasTotaisAcumuladas  ?? form?.horasTotais  ?? null
    const horServico   = maquina?.horasServicoAcumuladas ?? form?.horasServico ?? null
    const anoFabrico   = maquina?.anoFabrico ?? '—'
    const marca        = esc(maquina?.marca ?? '—')
    const modelo       = esc(maquina?.modelo ?? '—')
    const numSerie     = esc(maquina?.numeroSerie ?? '—')
    const numDocVenda  = esc(maquina?.numeroDocumentoVenda ?? '')

    // Sequência do ciclo (mostrar todos os 12 anos com destaque no actual e próximo)
    const seqDots = SEQUENCIA_KAESER.map((t, idx) => {
      let cls = 'futuro'
      if (posicaoAtual != null) {
        if (idx < posicaoAtual) cls = 'passado'
        else if (idx === posicaoAtual) cls = 'atual'
        else if (idx === posicaoProxima) cls = 'proximo'
      }
      return `<span class="kaeser-dot ${cls}" title="Ano ${idx+1}">${t}</span>`
    }).join('<span class="kaeser-dot-sep">·</span>')

    html += `
<div class="kaeser-band">
  <div class="kaeser-band-header">
    <span class="kaeser-band-titulo">Manutenção KAESER — ${esc(tipoLabel)}</span>
    ${tipoDesc ? `<span class="kaeser-band-subtitulo">${esc(tipoDesc)}</span>` : ''}
  </div>
  <div class="kaeser-band-body">
    <div class="kaeser-item">
      <span class="kaeser-item-label">Fabricante / Modelo</span>
      <span class="kaeser-item-valor">${marca} ${modelo}</span>
    </div>
    <div class="kaeser-item">
      <span class="kaeser-item-label">Número de série</span>
      <span class="kaeser-item-valor destaque">${numSerie}</span>
    </div>
    <div class="kaeser-item">
      <span class="kaeser-item-label">Ano de fabrico</span>
      <span class="kaeser-item-valor">${anoFabrico}</span>
      ${numDocVenda ? `<span class="kaeser-item-val-sub">Doc. venda: ${numDocVenda}</span>` : ''}
    </div>
    ${horTotal != null ? `
    <div class="kaeser-item">
      <span class="kaeser-item-label">Horas totais acumuladas</span>
      <span class="kaeser-item-valor destaque">${horTotal} h</span>
    </div>` : ''}
    ${horServico != null ? `
    <div class="kaeser-item">
      <span class="kaeser-item-label">Horas de serviço</span>
      <span class="kaeser-item-valor">${horServico} h</span>
    </div>` : ''}
    ${cicloAtualDesc ? `
    <div class="kaeser-item">
      <span class="kaeser-item-label">Ciclo efectuado</span>
      <span class="kaeser-item-valor">${esc(cicloAtualDesc)}</span>
      ${cicloProximoDesc ? `<span class="kaeser-item-val-sub">Próxima: ${esc(cicloProximoDesc)}</span>` : ''}
    </div>` : ''}
    <div class="kaeser-seq">
      <div class="kaeser-seq-label">Sequência do ciclo de manutenção (12 anos)</div>
      <div class="kaeser-seq-dots">
        ${seqDots}
        ${posicaoAtual != null ? `<span class="kaeser-legend">
          ● Efetuado &nbsp; ○ Próximo &nbsp; · Futuro
        </span>` : ''}
      </div>
    </div>
  </div>
</div>`
  }

  // ── Periodicidade legível ──
  const periodicidadeLabel = manutencao?.periodicidade
    ? ({ trimestral: 'Trimestral (90 dias)', semestral: 'Semestral (180 dias)', anual: 'Anual (365 dias)' }[manutencao.periodicidade] ?? manutencao.periodicidade)
    : (maquina?.periodicidadeManut
      ? ({ trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' }[maquina.periodicidadeManut] ?? maquina.periodicidadeManut)
      : null)

  // ── Bloco: Identificação do cliente ──
  html += `
<section>
  <div class="rpt-section-title">Identificação do cliente</div>
  <div class="rpt-grid">
    <div class="rpt-field">
      <span class="rpt-label">Nome / Empresa</span>
      <span class="rpt-value rpt-value--bold">${esc(cliente?.nome ?? '—')}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">NIF</span>
      <span class="rpt-value rpt-value--mono">${esc(cliente?.nif ?? '—')}</span>
    </div>
    ${cliente?.localidade ? `<div class="rpt-field">
      <span class="rpt-label">Localidade</span>
      <span class="rpt-value">${esc(cliente.localidade)}</span>
    </div>` : ''}
    ${cliente?.telefone ? `<div class="rpt-field">
      <span class="rpt-label">Telefone</span>
      <span class="rpt-value">${esc(cliente.telefone)}</span>
    </div>` : ''}
  </div>
</section>`

  // ── Bloco: Equipamento (não-KAESER — KAESER tem o seu próprio bloco acima) ──
  if (!isKaeser && maquina) {
    html += `
<section>
  <div class="rpt-section-title">Equipamento</div>
  <div class="rpt-equip-band">
    <div class="rpt-equip-grid">
      <div class="rpt-equip-item">
        <span class="rpt-label">Marca / Modelo</span>
        <span class="rpt-value">${esc(maquina.marca ?? '')} ${esc(maquina.modelo ?? '')}</span>
      </div>
      <div class="rpt-equip-item">
        <span class="rpt-label">Número de série</span>
        <span class="rpt-value rpt-value--mono rpt-value--accent">${esc(maquina.numeroSerie ?? '—')}</span>
      </div>
      ${subcategoriaNome ? `<div class="rpt-equip-item">
        <span class="rpt-label">Tipo / Subcategoria</span>
        <span class="rpt-value">${esc(subcategoriaNome)}</span>
      </div>` : ''}
      ${periodicidadeLabel ? `<div class="rpt-equip-item">
        <span class="rpt-label">Periodicidade</span>
        <span class="rpt-value">${esc(periodicidadeLabel)}</span>
      </div>` : ''}
      ${maquina.anoFabrico ? `<div class="rpt-equip-item">
        <span class="rpt-label">Ano de fabrico</span>
        <span class="rpt-value">${esc(String(maquina.anoFabrico))}</span>
      </div>` : ''}
      ${maquina.numeroDocumentoVenda ? `<div class="rpt-equip-item">
        <span class="rpt-label">Doc. venda</span>
        <span class="rpt-value">${esc(maquina.numeroDocumentoVenda)}</span>
      </div>` : ''}
    </div>
  </div>
</section>`
  }

  // ── Bloco: Dados da manutenção ──
  html += `
<section>
  <div class="rpt-section-title">Dados da manutenção</div>
  <div class="rpt-grid">
    <div class="rpt-field">
      <span class="rpt-label">Data agendada</span>
      <span class="rpt-value">${dataAgendada}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Data de realização</span>
      <span class="rpt-value">${dataRealizacao}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Técnico responsável</span>
      <span class="rpt-value">${tecnicoNome}</span>
    </div>
    ${periodicidadeLabel && isKaeser ? `<div class="rpt-field">
      <span class="rpt-label">Periodicidade</span>
      <span class="rpt-value">${esc(periodicidadeLabel)}</span>
    </div>` : ''}
    ${(manutencao?.horasTotais != null || manutencao?.horasServico != null) && !isKaeser ? `
    <div class="rpt-field rpt-field--full">
      <span class="rpt-label">Contadores de horas</span>
      <span class="rpt-value">${manutencao.horasTotais != null ? `Total: ${manutencao.horasTotais} h` : ''}${manutencao.horasTotais != null && manutencao.horasServico != null ? ' · ' : ''}${manutencao.horasServico != null ? `Serviço: ${manutencao.horasServico} h` : ''}</span>
    </div>` : ''}
  </div>
</section>`

  // ── Checklist ──
  if (checklistItems?.length > 0) {
    const secTitleS = `font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px`

    if (isKaeser) {
      html += `
<section class="section-can-break">
  <div class="rpt-section-title" style="${secTitleS}">Checklist de verificação — ${checklistItems.length} pontos</div>
  <div class="checklist-1col">
    <table class="checklist-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
      ${(checklistItems ?? []).map((item, i) => buildCheckRow(item, i, 0)).join('')}
    </tbody></table>
  </div>
</section>`
    } else {
      html += `
<section>
  <div class="rpt-section-title" style="${secTitleS}">Checklist de verificação</div>
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="49%" style="vertical-align:top">
      <table class="checklist-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
        ${col1.map((item, i) => buildCheckRow(item, i, 0)).join('')}
      </tbody></table>
    </td>
    <td width="2%"></td>
    <td width="49%" style="vertical-align:top">
      <table class="checklist-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
        ${col2.map((item, i) => buildCheckRow(item, i, half)).join('')}
      </tbody></table>
    </td>
  </tr></table>
</section>`
    }
  }

  // ── Notas ──
  if (relatorio.notas) {
    html += `
<section>
  <div class="rpt-section-title" style="font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px">Notas do técnico</div>
  <div class="rpt-notas" style="background:rgba(26,72,128,0.12);border-left:3px solid ${PALETA.azulNavel};padding:7px 10px;border-radius:0 4px 4px 0;font-size:${TIPO.corpo};color:${PALETA.texto};line-height:1.5">${esc(relatorio.notas).replace(/\n/g, '<br>')}</div>
</section>`
  }

  // ── Fotografias (secção separada, layout adaptativo, sem cortes) ──
  const fotosSafe = (relatorio.fotos ?? []).map(f => safeDataImageUrl(f)).filter(Boolean)
  html += htmlFotos(fotosSafe)

  // ── Consumíveis e peças ──
  if (relatorio.pecasUsadas?.length > 0) {
    const normalizar = (p) => {
      if ('usado' in p) return p
      return { ...p, usado: (p.quantidadeUsada ?? p.quantidade ?? 0) > 0 }
    }
    const pecas     = relatorio.pecasUsadas.map(normalizar)
    const usadas    = pecas.filter(p => p.usado)
    const naoUsadas = pecas.filter(p => !p.usado)

    const tipoHeaderLabel = tipoKaeser
      ? `Consumíveis e peças — Manutenção Tipo ${tipoKaeser}${infoTipoKaeser ? ` · ${infoTipoKaeser.label}` : ''}`
      : 'Consumíveis e peças'

    const thS = `background:${PALETA.azulNavel};color:#fff;padding:4px 6px;text-align:left;font-size:${TIPO.label};text-transform:uppercase;letter-spacing:.04em`
    const tdS = `padding:3px 6px;border-bottom:1px solid ${PALETA.bordaLeve};vertical-align:middle;font-size:${TIPO.pequeno};color:${PALETA.texto}`

    let pecaIdx = 0
    const linhaHtml = (p, rowClass) => {
      const isUsado = rowClass === 'row-usado'
      const bg = pecaIdx++ % 2 === 1 ? `;background:${PALETA.cinza}` : ''
      const txtDeco = isUsado ? '' : ';text-decoration:line-through;color:#6b7280'
      const statusIcon = isUsado ? '✓' : '✗'
      const statusColor = isUsado ? PALETA.verde : '#6b7280'
      return `
      <tr class="${rowClass} no-break" style="page-break-inside:avoid${bg}">
        <td class="cell-status" style="${tdS};width:20px;text-align:center;font-size:${TIPO.titulo};font-weight:700;color:${statusColor}">${statusIcon}</td>
        <td class="cell-pos" style="${tdS};width:46px;color:${PALETA.muted};font-family:'Courier New',monospace;font-size:${TIPO.label}">${esc(p.posicao ?? '')}</td>
        <td class="cell-code" style="${tdS};width:118px;font-family:'Courier New',monospace">${esc(p.codigoArtigo ?? '')}</td>
        <td style="${tdS}${txtDeco}">${esc(p.descricao ?? '')}</td>
        <td class="cell-qty" style="${tdS};width:36px;text-align:right;font-weight:600">${p.quantidade ?? ''}</td>
        <td class="cell-un" style="${tdS};width:34px;color:${PALETA.muted};font-size:${TIPO.label}">${esc(p.unidade ?? '')}</td>
      </tr>`
    }

    const grpS = `${tdS};background:${PALETA.cinza} !important;font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${PALETA.muted};padding:4px 6px`

    html += `
<section class="section-can-break${isKaeser ? ' page-break-before' : ''}">
  <div class="rpt-section-title" style="font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px">${tipoHeaderLabel}</div>
  <table class="pecas-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:${TIPO.pequeno};margin-bottom:4px">
    <thead>
      <tr>
        <th style="${thS};width:20px"></th>
        <th style="${thS};width:46px">Pos.</th>
        <th style="${thS};width:118px">Código artigo</th>
        <th style="${thS}">Descrição</th>
        <th style="${thS};width:36px;text-align:right">Qtd.</th>
        <th style="${thS};width:34px">Un.</th>
      </tr>
    </thead>
    <tbody>
      ${usadas.length > 0 ? `<tr class="pecas-group-row pecas-group-usado"><td colspan="6" style="${grpS};border-left:3px solid ${PALETA.verde};color:${PALETA.verde}">✓ Utilizados — ${usadas.length} artigo${usadas.length !== 1 ? 's' : ''}</td></tr>` : ''}
      ${usadas.map(p => linhaHtml(p, 'row-usado')).join('')}
      ${(() => { pecaIdx = 0; return '' })()}
      ${naoUsadas.length > 0 ? `<tr class="pecas-group-row pecas-group-nao-usado"><td colspan="6" style="${grpS};border-left:3px solid #6b7280">✗ Não utilizados — ${naoUsadas.length} artigo${naoUsadas.length !== 1 ? 's' : ''}</td></tr>` : ''}
      ${naoUsadas.map(p => linhaHtml(p, 'row-nao-usado')).join('')}
    </tbody>
  </table>
  <div class="pecas-resumo" style="display:flex;gap:16px;padding:4px 6px;background:${PALETA.cinza};border-top:1.5px solid ${PALETA.cinzaBorda};font-size:${TIPO.pequeno}">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:${PALETA.verde};display:inline-block"></span>${usadas.length} artigo${usadas.length !== 1 ? 's' : ''} utilizado${usadas.length !== 1 ? 's' : ''}</span>
    ${naoUsadas.length > 0 ? `<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#6b7280;display:inline-block"></span>${naoUsadas.length} artigo${naoUsadas.length !== 1 ? 's' : ''} não substituído${naoUsadas.length !== 1 ? 's' : ''}</span>` : ''}
    <span style="margin-left:auto;color:${PALETA.muted}">${pecas.length} artigo${pecas.length !== 1 ? 's' : ''} no plano</span>
  </div>
</section>`
  }

  // ── R3: Próxima manutenção prevista ──
  const proximaAgendada = (proximasManutencoes ?? [])
    .filter(pm => pm.data)
    .sort((a, b) => a.data.localeCompare(b.data))[0]
  const periMaq = maquina?.periodicidadeManut
  const periLabelsMap = { trimestral: 'trimestral', semestral: 'semestral', anual: 'anual', mensal: 'mensal' }
  if (proximaAgendada || periMaq) {
    const fmtDShort = (d) => { const s = String(d ?? '').slice(0,10).split('-'); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : '—' }
    const dataProxStr = proximaAgendada ? fmtDShort(proximaAgendada.data) : '(a confirmar)'
    const periStr = periLabelsMap[periMaq] ?? ''
    html += `
<div style="background:${PALETA.cinza};border:1px solid ${PALETA.bordaLeve};border-left:3px solid ${PALETA.azulNavel};border-radius:4px;padding:8px 12px;margin-top:10px;page-break-inside:avoid">
  <div style="font-size:${TIPO.corpo};color:${PALETA.texto}">
    <strong style="color:${PALETA.azulNavel}">Próxima manutenção prevista:</strong> ${esc(dataProxStr)}${periStr ? ` <span style="color:${PALETA.muted}">(periodicidade ${esc(periStr)})</span>` : ''}
  </div>
  <div style="font-size:${TIPO.label};color:${PALETA.muted};margin-top:3px;font-style:italic">
    Este equipamento é sujeito a manutenção periódica de conformidade, de acordo com a legislação em vigor.
  </div>
</div>`
  }

  // ── R1: Historial compacto de anomalias ──
  const histRels = (historicoRelatorios ?? []).slice(0, HISTORIAL_MAX)
  if (histRels.length > 0) {
    const fmtDH = (d) => { const s = String(d ?? '').slice(0,10).split('-'); return s.length === 3 ? `${s[2]}-${s[1]}-${s[0]}` : '—' }
    const tipoLabelFn = (t) => ({ montagem: 'Montagem', periodica: 'Periódica' }[t] ?? t ?? '—')
    const totalAnomalias = histRels.reduce((n, hr) => n + (hr.anomalias?.length ?? 0), 0)
    const thSH = `background:${PALETA.azulNavel};color:#fff;padding:4px 6px;font-size:${TIPO.label};text-transform:uppercase;letter-spacing:.04em;text-align:left`
    const tdSH = `padding:3px 6px;border-bottom:1px solid ${PALETA.bordaLeve};vertical-align:top;font-size:${TIPO.pequeno};color:${PALETA.texto}`
    html += `
<section style="page-break-inside:avoid;margin-top:10px">
  <div class="rpt-section-title" style="font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px">Historial recente — ${esc(maquina?.marca ?? '')} ${esc(maquina?.modelo ?? '')} (últimas ${histRels.length})</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <thead><tr>
      <th style="${thSH}">Data</th>
      <th style="${thSH}">Tipo</th>
      <th style="${thSH}">Técnico</th>
      <th style="${thSH}">Anomalias (checklist)</th>
    </tr></thead>
    <tbody>
      ${histRels.map((hr, i) => {
        const truncate = (s) => s.length > ANOMALIA_TEXTO_MAX ? s.slice(0, ANOMALIA_TEXTO_MAX) + '…' : s
        const anomTxt = hr.anomalias?.length > 0
          ? hr.anomalias.map(a => esc(truncate(a))).join('; ')
          : `<span style="color:${PALETA.verde}">Nenhuma</span>`
        return `<tr style="${i % 2 === 1 ? `background:${PALETA.cinza}` : ''}">
          <td style="${tdSH}">${fmtDH(hr.data)}</td>
          <td style="${tdSH}">${esc(tipoLabelFn(hr.tipo))}</td>
          <td style="${tdSH}">${esc(hr.tecnico ?? '—')}</td>
          <td style="${tdSH};font-size:${TIPO.label}">${anomTxt}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
  ${totalAnomalias === 0
    ? `<p style="font-size:${TIPO.pequeno};color:${PALETA.verde};font-style:italic;margin:4px 0 0">✓ Sem anomalias registadas nas últimas ${histRels.length} manutenções.</p>`
    : `<p style="font-size:${TIPO.pequeno};color:${PALETA.muted};font-style:italic;margin:4px 0 0">${totalAnomalias} anomalia${totalAnomalias !== 1 ? 's' : ''} identificada${totalAnomalias !== 1 ? 's' : ''} no período — acompanhar na próxima intervenção.</p>`}
</section>`
  }

  // ── Página do cliente (assinatura, declaração, próximas manutenções) + rodapé ──
  html += `
${htmlPaginaCliente({
  tecnicoNome,
  tecnicoTelefone: tecTelefone,
  tecnicoAssinatura: tecnicoObj?.assinaturaDigital,
  clienteNome: relatorio.nomeAssinante ?? '—',
  clienteAssinatura: relatorio.assinaturaDigital,
  dataCriacao,
  dataAssinatura,
  declaracaoTexto: getDeclaracaoCliente(manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica'),
  proximasManutencoes,
})}

${htmlFooter(ultimoEnvioLinha)}

</body></html>`

  return html
}
