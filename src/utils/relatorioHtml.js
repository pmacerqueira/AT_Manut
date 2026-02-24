/**
 * relatorioParaHtml – Gera HTML do relatório de manutenção para visualização/impressão.
 * Design: cabeçalho com logo + dados empresa, estilo industrial minimalista, paleta Navel.
 * Para compressores KAESER: secção dedicada com horas, ciclo A/B/C/D e tabela de consumíveis.
 * @see DESENVOLVIMENTO.md §4.1
 */
import { formatDataHoraAzores, formatDataAzores } from './datasAzores'
import { DECLARACAO_CLIENTE } from '../constants/relatorio'
import { escapeHtml, safeDataImageUrl } from './sanitize'
import { APP_FOOTER_TEXT } from '../config/version'
import {
  INTERVALOS_KAESER,
  SEQUENCIA_KAESER,
  tipoKaeserNaPosicao,
  proximaPosicaoKaeser,
  descricaoCicloKaeser,
  isKaeserMarca,
} from '../context/DataContext'

const EMPRESA = {
  nome:        'JOSÉ GONÇALVES CERQUEIRA (NAVEL-AÇORES), Lda.',
  divisaoComercial: 'Div. Comercial: Pico d\'Agua Park, Rua 5, n.º13-15 · 9600-049 Pico da Pedra',
  sede:        'Sede / Divisão Oficinas: Rua Engº Abel Ferin Coutinho · Apt. 1481 · 9501-802 Ponta Delgada',
  telefones:   'Tel: 296 205 290 / 296 630 120',
  pais:        'Açores — Portugal',
  web:         'www.navel.pt',
}

export function relatorioParaHtml(relatorio, manutencao, maquina, cliente, checklistItems = [], options = {}) {
  if (!relatorio) return ''
  const { subcategoriaNome, ultimoEnvio, logoUrl } = options
  const logoSrc = logoUrl ?? '/manut/logo.png'
  const esc = escapeHtml

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
  const dataAssinatura = relatorio.dataAssinatura ? formatDataHoraAzores(relatorio.dataAssinatura) : '—'
  const dataAgendada   = manutencao?.data ? formatDataAzores(manutencao.data, true) : '—'
  const dataRealizacao = relatorio.dataAssinatura
    ? formatDataAzores(relatorio.dataAssinatura, true)
    : (relatorio.dataCriacao ? formatDataAzores(relatorio.dataCriacao, true) : '—')

  // ── Texto do equipamento ──
  const equipCompleto = maquina && subcategoriaNome
    ? esc(`${subcategoriaNome} — ${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}`)
    : maquina ? esc(`${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}`) : '—'

  const ultimoEnvioLinha = ultimoEnvio?.data && ultimoEnvio?.destinatario
    ? `Último envio por email: ${formatDataHoraAzores(ultimoEnvio.data)} para ${esc(ultimoEnvio.destinatario)}`
    : null
  const tecnicoNome    = esc(manutencao?.tecnico || relatorio?.tecnico || '—')
  const safeAssinatura = relatorio.assinaturaDigital ? safeDataImageUrl(relatorio.assinaturaDigital) : ''

  // ── Checklist — 2 colunas (geral) ou coluna única (KAESER, mais legível) ──
  const half = Math.ceil((checklistItems ?? []).length / 2)
  const col1 = (checklistItems ?? []).slice(0, half)
  const col2 = (checklistItems ?? []).slice(half)

  const buildCheckRow = (item, i, offset = 0) => {
    const r = relatorio.checklistRespostas?.[item.id]
    const badge = r === 'sim'
      ? '<span class="badge-sim">SIM</span>'
      : r === 'nao' ? '<span class="badge-nao">NÃO</span>' : '<span class="badge-nd">—</span>'
    return `<tr><td class="cl-num">${i + offset + 1}.</td><td class="cl-texto">${esc(item.texto)}</td><td class="cl-badge">${badge}</td></tr>`
  }

  let html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Manutenção — Navel</title>
<style>
/* ── Página A4, margens de impressão ── */
@page{size:A4 portrait;margin:8mm 11mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;line-height:1.42;color:#1a1a2e;background:#fff;padding:0}

/* ── Paleta ── */
:root{
  --azul:#1a4880;--azul-med:#2d6eb5;--azul-claro:#e8f2fa;
  --cinza:#f4f6f8;--borda:#c6d8ec;--texto:#1a1a2e;--muted:#5a6a7e;
  --verde:#16a34a;--vermelho:#dc2626;--acento:#f0a500;
  --kaeser:#b45309;--kaeser-bg:#fffbeb;--kaeser-borda:#fde68a;
}

/* ── Quebras de página ── */
section{margin-bottom:10px;page-break-inside:avoid}
.section-can-break{page-break-inside:auto}
.page-break-before{page-break-before:always}
.no-break{page-break-inside:avoid}

/* ── Cabeçalho ── */
.rpt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:2.5px solid var(--azul)}
.rpt-logo img{max-height:42px;max-width:150px;object-fit:contain;display:block}
.rpt-logo-fallback{font-size:1.2em;font-weight:700;color:var(--azul)}
.rpt-empresa{text-align:right;font-size:9px;line-height:1.5;color:var(--muted)}
.rpt-empresa strong{display:block;font-size:10px;color:var(--azul);margin-bottom:1px}
.rpt-empresa a{color:var(--azul-med);text-decoration:none}

/* ── Título ── */
.rpt-titulo-bar{display:flex;align-items:center;justify-content:space-between;background:var(--azul);color:#fff;padding:5px 10px;margin:7px 0 0;border-radius:3px}
.rpt-titulo-bar h1{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rpt-num-wrap{text-align:right}
.rpt-num-label{font-size:8px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;display:block}
.rpt-num{font-size:14px;font-weight:800;letter-spacing:.04em;font-family:'Courier New',monospace}
.rpt-acento{height:2px;background:linear-gradient(90deg,var(--acento),var(--azul-med));margin-bottom:8px;border-radius:0 0 2px 2px}

/* ── Secções ── */
.rpt-section-title{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--azul-med);border-bottom:1px solid var(--borda);padding-bottom:2px;margin-bottom:5px}

/* ── Grid de dados (2 colunas) ── */
.rpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px}
.rpt-field{padding:2.5px 0;border-bottom:1px solid #edf2f7}
.rpt-field:last-child{border-bottom:none}
.rpt-label{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);display:block;margin-bottom:0}
.rpt-value{font-size:10.5px;color:var(--texto)}
.rpt-field--full{grid-column:1/-1}

/* ── Bloco KAESER ── */
.kaeser-band{background:var(--kaeser-bg);border:1.5px solid var(--kaeser-borda);border-radius:5px;margin-bottom:9px;overflow:hidden;page-break-inside:avoid}
.kaeser-band-header{background:var(--kaeser);color:#fff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.kaeser-band-titulo{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.kaeser-band-subtitulo{font-size:9px;opacity:.85}
.kaeser-band-body{padding:7px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 14px}
.kaeser-item{}
.kaeser-item-label{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;display:block;margin-bottom:1px}
.kaeser-item-valor{font-size:11px;font-weight:600;color:var(--texto)}
.kaeser-item-valor.destaque{font-size:13px;font-weight:800;color:var(--kaeser)}
.kaeser-item-val-sub{font-size:8.5px;color:var(--muted);display:block}
.kaeser-seq{grid-column:1/-1;margin-top:4px;border-top:1px solid var(--kaeser-borda);padding-top:5px}
.kaeser-seq-label{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;margin-bottom:3px}
.kaeser-seq-dots{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.kaeser-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1.5px solid transparent;flex-shrink:0}
.kaeser-dot.passado{background:#e5e7eb;color:#6b7280;border-color:#d1d5db}
.kaeser-dot.atual{background:var(--kaeser);color:#fff;border-color:var(--kaeser)}
.kaeser-dot.proximo{background:#fff;color:var(--kaeser);border-color:var(--kaeser)}
.kaeser-dot.futuro{background:#f9fafb;color:#9ca3af;border-color:#e5e7eb}
.kaeser-dot-sep{color:#9ca3af;font-size:10px;padding:0 1px}

/* ── Checklist coluna única ── */
.checklist-1col{width:100%}
.checklist-2col{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.checklist-table{width:100%;border-collapse:collapse;font-size:9.5px}
.checklist-table tr:nth-child(even){background:var(--cinza)}
.checklist-table td{padding:2.8px 4px;border-bottom:1px solid #edf2f7;vertical-align:top}
.checklist-table td.cl-num{width:1.6em;color:var(--muted);font-size:8.5px;padding-left:2px;white-space:nowrap}
.checklist-table td.cl-texto{padding-right:6px}
.checklist-table td.cl-badge{width:32px;text-align:center;padding-right:2px;white-space:nowrap}
.badge-sim{background:rgba(22,163,74,.15);color:var(--verde);padding:1px 5px;border-radius:8px;font-size:8.5px;font-weight:700}
.badge-nao{background:rgba(220,38,38,.12);color:var(--vermelho);padding:1px 5px;border-radius:8px;font-size:8.5px;font-weight:700}
.badge-nd{color:var(--muted);font-size:9px}

/* ── Notas ── */
.rpt-notas{background:var(--azul-claro);border-left:2.5px solid var(--azul-med);padding:5px 9px;border-radius:0 3px 3px 0;font-size:10px;color:var(--texto)}

/* ── Fotos ── */
.rpt-fotos-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}
.rpt-fotos-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:3px;border:1px solid var(--borda);display:block}

/* ── Peças e consumíveis ── */
.pecas-table{width:100%;border-collapse:collapse;font-size:9.5px}
.pecas-table thead{display:table-header-group}
.pecas-table th{background:var(--azul);color:#fff;padding:4px 6px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em}
.pecas-table td{padding:3px 6px;border-bottom:1px solid #edf2f7;vertical-align:middle}
.pecas-table tr.row-usado td{background:#f0fdf4}
.pecas-table tr.row-nao-usado td{background:#fafafa;color:#9ca3af}
.pecas-table tr.row-nao-usado .cell-desc{text-decoration:line-through}
.pecas-table .cell-status{width:20px;text-align:center;font-size:11px;font-weight:700}
.pecas-table .cell-pos{width:46px;color:var(--muted);font-family:'Courier New',monospace;font-size:8.5px}
.pecas-table .cell-code{width:118px;font-family:'Courier New',monospace;font-size:9px}
.pecas-table .cell-qty{width:36px;text-align:right;font-weight:600}
.pecas-table .cell-un{width:34px;color:var(--muted);font-size:8.5px}
.pecas-group-row td{background:var(--cinza)!important;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:3px 6px;page-break-after:avoid}
.pecas-group-usado td{border-left:3px solid var(--verde);color:var(--verde)}
.pecas-group-nao-usado td{border-left:3px solid #9ca3af}
.pecas-resumo{display:flex;gap:16px;padding:4px 6px;background:var(--cinza);border-top:1.5px solid var(--borda);font-size:9px}
.pecas-resumo-item{display:flex;align-items:center;gap:4px}
.pecas-resumo-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.pecas-resumo-dot.verde{background:var(--verde)}
.pecas-resumo-dot.cinza{background:#9ca3af}

/* ── Assinatura + declaração lado a lado ── */
.rpt-bottom{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}
.rpt-assinatura-box{background:var(--cinza);border:1px solid var(--borda);border-radius:4px;padding:7px 10px}
.rpt-assinatura-img img{max-width:180px;max-height:70px;border:1px solid var(--borda);border-radius:3px;margin-top:4px;background:#fff;display:block}
.rpt-declaracao{background:var(--cinza);border:1px solid var(--borda);border-radius:4px;padding:7px 10px;font-size:8.5px;color:var(--muted);line-height:1.55}

/* ── Rodapé ── */
.rpt-footer{margin-top:8px;padding-top:6px;border-top:1px solid var(--borda);display:flex;justify-content:space-between;font-size:8.5px;color:var(--muted)}
</style>
</head>
<body>

<header class="rpt-header">
  <div class="rpt-logo">
    <img src="${logoSrc}" alt="Navel"
      onerror="this.parentNode.innerHTML='<span class=rpt-logo-fallback>Navel</span>'">
  </div>
  <div class="rpt-empresa">
    <strong>${esc(EMPRESA.nome)}</strong>
    ${esc(EMPRESA.divisaoComercial)}<br>
    ${esc(EMPRESA.sede)}<br>
    ${esc(EMPRESA.telefones)} &nbsp;|&nbsp; <a href="https://${EMPRESA.web}">${EMPRESA.web}</a><br>
    ${esc(EMPRESA.pais)}
  </div>
</header>

<div class="rpt-titulo-bar">
  <h1>Relatório de Manutenção${isKaeser ? ' — Compressor' : ''}</h1>
  <div class="rpt-num-wrap">
    <span class="rpt-num-label">Nº de Serviço</span>
    <span class="rpt-num">${esc(relatorio?.numeroRelatorio ?? manutencao?.id ?? '—')}</span>
  </div>
</div>
<div class="rpt-acento"></div>`

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
        ${posicaoAtual != null ? `<span style="font-size:8px;color:#9ca3af;margin-left:6px">
          ● Efectuado &nbsp; ○ Próximo &nbsp; · Futuro
        </span>` : ''}
      </div>
    </div>
  </div>
</div>`
  }

  // ── Dados gerais da manutenção ──
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
    ${!isKaeser ? `
    <div class="rpt-field rpt-field--full">
      <span class="rpt-label">Equipamento</span>
      <span class="rpt-value">${equipCompleto}</span>
    </div>` : ''}
    <div class="rpt-field">
      <span class="rpt-label">Cliente</span>
      <span class="rpt-value">${esc(cliente?.nome ?? '—')}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Técnico responsável</span>
      <span class="rpt-value">${tecnicoNome}</span>
    </div>
    ${(manutencao?.horasTotais != null || manutencao?.horasServico != null) && !isKaeser ? `
    <div class="rpt-field rpt-field--full">
      <span class="rpt-label">Contadores de horas</span>
      <span class="rpt-value">${manutencao.horasTotais != null ? `Total: ${manutencao.horasTotais} h` : ''}${manutencao.horasTotais != null && manutencao.horasServico != null ? ' · ' : ''}${manutencao.horasServico != null ? `Serviço: ${manutencao.horasServico} h` : ''}</span>
    </div>` : ''}
  </div>
</section>`

  // ── Checklist ──
  if (checklistItems?.length > 0) {
    if (isKaeser) {
      // Coluna única para KAESER — mais legível, sem limite de espaço
      html += `
<section class="section-can-break">
  <div class="rpt-section-title">Checklist de verificação — ${checklistItems.length} pontos</div>
  <div class="checklist-1col">
    <table class="checklist-table"><tbody>
      ${(checklistItems ?? []).map((item, i) => buildCheckRow(item, i, 0)).join('')}
    </tbody></table>
  </div>
</section>`
    } else {
      html += `
<section>
  <div class="rpt-section-title">Checklist de verificação</div>
  <div class="checklist-2col">
    <table class="checklist-table"><tbody>
      ${col1.map((item, i) => buildCheckRow(item, i, 0)).join('')}
    </tbody></table>
    <table class="checklist-table"><tbody>
      ${col2.map((item, i) => buildCheckRow(item, i, half)).join('')}
    </tbody></table>
  </div>
</section>`
    }
  }

  // ── Notas e fotografias ──
  if (relatorio.notas || relatorio.fotos?.length > 0) {
    html += `<section><div class="rpt-section-title">Notas e fotografias</div>`
    if (relatorio.notas) {
      html += `<div class="rpt-notas">${esc(relatorio.notas).replace(/\n/g, '<br>')}</div>`
    }
    if (relatorio.fotos?.length > 0) {
      html += `<div class="rpt-fotos-grid">`
      relatorio.fotos.forEach((src, i) => {
        const safe = safeDataImageUrl(src)
        if (safe) html += `<img src="${safe}" alt="Fotografia ${i + 1}">`
      })
      html += `</div>`
    }
    html += `</section>`
  }

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

    const linhaHtml = (p, rowClass) => `
      <tr class="${rowClass} no-break">
        <td class="cell-status">${rowClass === 'row-usado' ? '✓' : '✗'}</td>
        <td class="cell-pos">${esc(p.posicao ?? '')}</td>
        <td class="cell-code">${esc(p.codigoArtigo ?? '')}</td>
        <td>${esc(p.descricao ?? '')}</td>
        <td class="cell-qty">${p.quantidade ?? ''}</td>
        <td class="cell-un">${esc(p.unidade ?? '')}</td>
      </tr>`

    html += `
<section class="section-can-break${isKaeser ? ' page-break-before' : ''}">
  <div class="rpt-section-title">${tipoHeaderLabel}</div>
  <table class="pecas-table">
    <thead>
      <tr>
        <th style="width:20px"></th>
        <th style="width:46px">Pos.</th>
        <th style="width:118px">Código artigo</th>
        <th>Descrição</th>
        <th style="width:36px;text-align:right">Qtd.</th>
        <th style="width:34px">Un.</th>
      </tr>
    </thead>
    <tbody>
      ${usadas.length > 0 ? `<tr class="pecas-group-row pecas-group-usado"><td colspan="6">✓ Utilizados — ${usadas.length} artigo${usadas.length !== 1 ? 's' : ''}</td></tr>` : ''}
      ${usadas.map(p => linhaHtml(p, 'row-usado')).join('')}
      ${naoUsadas.length > 0 ? `<tr class="pecas-group-row pecas-group-nao-usado"><td colspan="6">✗ Não utilizados — ${naoUsadas.length} artigo${naoUsadas.length !== 1 ? 's' : ''}</td></tr>` : ''}
      ${naoUsadas.map(p => linhaHtml(p, 'row-nao-usado')).join('')}
    </tbody>
  </table>
  <div class="pecas-resumo">
    <span class="pecas-resumo-item"><span class="pecas-resumo-dot verde"></span>${usadas.length} artigo${usadas.length !== 1 ? 's' : ''} utilizado${usadas.length !== 1 ? 's' : ''}</span>
    ${naoUsadas.length > 0 ? `<span class="pecas-resumo-item"><span class="pecas-resumo-dot cinza"></span>${naoUsadas.length} artigo${naoUsadas.length !== 1 ? 's' : ''} não substituído${naoUsadas.length !== 1 ? 's' : ''}</span>` : ''}
    <span style="margin-left:auto;color:var(--muted)">${pecas.length} artigo${pecas.length !== 1 ? 's' : ''} no plano</span>
  </div>
</section>`
  }

  // ── Assinatura + Declaração ──
  html += `
<section class="no-break">
  <div class="rpt-section-title">Registo e assinatura</div>
  <div class="rpt-bottom">
    <div class="rpt-assinatura-box">
      <div class="rpt-grid">
        <div class="rpt-field">
          <span class="rpt-label">Data de criação</span>
          <span class="rpt-value">${dataCriacao}</span>
        </div>
        <div class="rpt-field">
          <span class="rpt-label">Data de assinatura</span>
          <span class="rpt-value">${dataAssinatura}</span>
        </div>
        <div class="rpt-field rpt-field--full">
          <span class="rpt-label">Assinado pelo cliente</span>
          <span class="rpt-value">${esc(relatorio.nomeAssinante ?? '—')}</span>
        </div>
      </div>
      ${safeAssinatura ? `
      <div class="rpt-assinatura-img">
        <span class="rpt-label" style="margin-top:5px;display:block">Assinatura manuscrita</span>
        <img src="${safeAssinatura}" alt="Assinatura do cliente">
      </div>` : ''}
    </div>
    <div class="rpt-declaracao">${esc(DECLARACAO_CLIENTE)}</div>
  </div>
</section>

${ultimoEnvioLinha ? `<p style="font-size:8.5px;color:#888;margin-bottom:5px">${ultimoEnvioLinha}</p>` : ''}
<footer class="rpt-footer">
  <span>${esc(APP_FOOTER_TEXT)}</span>
  <span>${esc(EMPRESA.web)} &nbsp;|&nbsp; ${esc(EMPRESA.telefones)}</span>
</footer>

</body></html>`

  return html
}
