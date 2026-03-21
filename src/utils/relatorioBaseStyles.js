/**
 * relatorioBaseStyles — Estilos CSS e helpers HTML partilhados por TODOS os
 * geradores de relatório (manutenção, reparação, frota, histórico).
 *
 * Objectivos:
 *  - Paleta centralizada via CSS custom properties
 *  - Zero inline styles nos relatórios
 *  - Consistência gráfica e identidade Navel em todos os documentos
 *  - "Página do cliente" (assinaturas + declaração + agendamentos) sem cortes
 */
import { escapeHtml, safeDataImageUrl } from './sanitize'
import { APP_FOOTER_TEXT } from '../config/version'
import { EMPRESA } from '../constants/empresa'

const esc = escapeHtml

/* ────────────────────────────────────────────────────────────────────────────
 * 1. PALETA — cores da identidade Navel (configuráveis por relatório)
 * ──────────────────────────────────────────────────────────────────────────── */
export const PALETA = {
  azulNavel:  '#1a4880',
  azulMedio:  '#2d6eb5',
  laranja:    '#92400e',
  vermelho:   '#b91c1c',
  verde:      '#15803d',
  amarelo:    '#a16207',
  istobal:    '#c8102e',
  texto:      '#111827',
  muted:      '#374151',
  cinza:      '#f3f4f6',
  cinzaBorda: '#b0c4de',
  branco:     '#ffffff',
  bgAlt:      '#f9fafb',
  bordaLeve:  '#e5e7eb',
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. TIPOGRAFIA — constantes de tamanho (evita magic numbers)
 * ──────────────────────────────────────────────────────────────────────────── */
export const TIPO = {
  corpo:     '10.5px',
  pequeno:   '9.5px',
  label:     '9px',
  micro:     '8.5px',
  titulo:    '11.5px',
  numSerie:  '14px',
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. CSS BASE — incluir no <style> de cada relatório
 *    Recebe `brandPrimary` e `brandSoft` para personalização por marca.
 * ──────────────────────────────────────────────────────────────────────────── */
export function cssBase(brandPrimary = PALETA.azulNavel, brandSoft = 'rgba(26,72,128,0.12)') {
  return `
/* ── Página A4, margens de impressão ── */
@page { size: A4 portrait; margin: 8mm 11mm }
* { box-sizing: border-box; margin: 0; padding: 0 }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: ${TIPO.corpo};
  line-height: 1.42;
  color: var(--texto);
  background: var(--branco);
  padding: 0;
}

/* ── Paleta via custom properties ── */
:root {
  --azul: ${brandPrimary};
  --azul-med: ${brandPrimary};
  --azul-claro: ${brandSoft};
  --cinza: ${PALETA.cinza};
  --borda: ${PALETA.cinzaBorda};
  --borda-leve: ${PALETA.bordaLeve};
  --texto: ${PALETA.texto};
  --muted: ${PALETA.muted};
  --verde: ${PALETA.verde};
  --vermelho: ${PALETA.vermelho};
  --amarelo: ${PALETA.amarelo};
  --acento: ${brandPrimary};
  --branco: ${PALETA.branco};
  --bg-alt: ${PALETA.bgAlt};
}

/* ── Quebras de página ── */
section { margin-bottom: 10px; page-break-inside: avoid }
.section-can-break { page-break-inside: auto }
.page-break-before { page-break-before: always }
.no-break { page-break-inside: avoid }

/* ── Cabeçalho ── */
.rpt-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; padding-bottom: 10px;
  border-bottom: 3px solid var(--azul);
}
.rpt-logos { display: flex; align-items: center; gap: 12px }
.rpt-logo img, .rpt-logo-marca img {
  max-height: 44px; max-width: 180px; object-fit: contain; display: block;
}
.rpt-logo-fallback { font-size: 1.2em; font-weight: 800; color: var(--azul) }
.rpt-empresa {
  text-align: left; font-size: ${TIPO.pequeno}; line-height: 1.55; color: var(--texto);
}
.rpt-empresa strong { font-size: ${TIPO.corpo}; color: var(--azul) }
.rpt-empresa a { color: var(--azul); text-decoration: none; font-weight: 600 }

/* ── Barra de título ── */
.rpt-titulo-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--azul); color: var(--branco);
  padding: 7px 12px; margin: 8px 0 0; border-radius: 3px;
}
.rpt-titulo-bar h1 {
  font-size: ${TIPO.titulo}; font-weight: 800;
  letter-spacing: .08em; text-transform: uppercase;
}
.rpt-num-wrap { text-align: right }
.rpt-num-label {
  font-size: ${TIPO.micro}; color: rgba(255,255,255,.85); text-transform: uppercase;
  letter-spacing: .08em; display: block;
}
.rpt-num {
  font-size: ${TIPO.numSerie}; font-weight: 800;
  letter-spacing: .04em; font-family: 'Courier New', monospace;
}
.rpt-acento {
  height: 2px; background: linear-gradient(90deg, var(--acento), var(--azul-med));
  margin-bottom: 8px; border-radius: 0 0 2px 2px;
}

/* ── Secções genéricas ── */
.rpt-section-title {
  font-size: ${TIPO.label}; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: var(--azul);
  border-bottom: 1.5px solid var(--azul); padding-bottom: 3px; margin-bottom: 6px;
}

/* ── Grid de dados (2 colunas) ── */
.rpt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 10px }
.rpt-field { padding: 2.5px 0; border-bottom: 1px solid var(--borda-leve) }
.rpt-field:last-child { border-bottom: none }
.rpt-label {
  font-size: ${TIPO.label}; font-weight: 600; text-transform: uppercase;
  letter-spacing: .05em; color: var(--muted); display: block; margin-bottom: 1px;
}
.rpt-value { font-size: ${TIPO.corpo}; color: var(--texto) }
.rpt-value--bold { font-weight: 700 }
.rpt-value--mono { font-family: 'Courier New', monospace; letter-spacing: .03em }
.rpt-value--accent { color: var(--azul); font-weight: 600 }
.rpt-value--muted { color: var(--muted) }
.rpt-field--full { grid-column: 1 / -1 }

/* ── Bloco equipamento destacado ── */
.rpt-equip-band {
  background: var(--azul-claro); border: 1.5px solid var(--borda);
  border-top: 3px solid var(--azul);
  border-radius: 4px; padding: 8px 10px; margin-bottom: 8px;
}
.rpt-equip-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 12px;
}
.rpt-equip-item .rpt-label { font-size: ${TIPO.label} }
.rpt-equip-item .rpt-value { font-size: ${TIPO.corpo}; font-weight: 700; color: var(--texto) }

/* ── Notas ── */
.rpt-notas {
  background: var(--azul-claro); border-left: 3px solid var(--azul);
  padding: 7px 10px; border-radius: 0 4px 4px 0;
  font-size: ${TIPO.corpo}; color: var(--texto); line-height: 1.5;
}

/* ── Fotos — layout adaptativo por quantidade ── */
.rpt-fotos-section { margin-top: 8px }
.rpt-fotos-row {
  display: flex; gap: 10px; margin-bottom: 10px;
  page-break-inside: avoid;
}
.rpt-foto-item {
  flex: 1; min-width: 0; text-align: center;
}
.rpt-foto-item img {
  width: 100%; max-height: 180px; object-fit: contain;
  border-radius: 4px; border: 1.5px solid var(--borda);
  background: var(--cinza); display: block;
}
.rpt-foto-caption {
  font-size: ${TIPO.label}; color: var(--texto);
  margin-top: 3px; text-align: center; font-weight: 500;
}
/* 1 foto: centrada, max 60% largura */
.rpt-fotos-row--single .rpt-foto-item { flex: 0 1 60%; margin: 0 auto }
.rpt-fotos-row--single .rpt-foto-item img { max-height: 220px }
/* 2 fotos: 50% cada */
.rpt-fotos-row--pair .rpt-foto-item { flex: 0 1 50% }
.rpt-fotos-row--pair .rpt-foto-item img { max-height: 200px }
/* 3 fotos: terços */
.rpt-fotos-row--triple .rpt-foto-item { flex: 0 1 33.33% }
.rpt-fotos-row--triple .rpt-foto-item img { max-height: 170px }
/* 4 fotos: quarta parte da largura (A4 / impressão) */
.rpt-fotos-row--quad .rpt-foto-item { flex: 0 1 25% }
.rpt-fotos-row--quad .rpt-foto-item img { max-height: 150px }

/* ── Checklist ── */
.checklist-1col { width: 100% }
.checklist-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px }
.checklist-table { width: 100%; border-collapse: collapse; font-size: ${TIPO.pequeno} }
.checklist-table tr:nth-child(even) { background: var(--cinza) }
.checklist-table td {
  padding: 2.8px 4px; border-bottom: 1px solid var(--borda-leve); vertical-align: top;
}
.checklist-table td.cl-num {
  width: 1.6em; color: var(--muted); font-size: ${TIPO.label};
  padding-left: 2px; white-space: nowrap;
}
.checklist-table td.cl-texto { padding-right: 6px }
.checklist-table td.cl-badge { width: 32px; text-align: center; padding-right: 2px; white-space: nowrap }
.badge-sim {
  background: #dcfce7; color: #14532d;
  padding: 1.5px 6px; border-radius: 8px; font-size: ${TIPO.label}; font-weight: 700;
  border: 1px solid #86efac;
}
.badge-nao {
  background: #fee2e2; color: #7f1d1d;
  padding: 1.5px 6px; border-radius: 8px; font-size: ${TIPO.label}; font-weight: 700;
  border: 1px solid #fca5a5;
}
.badge-nd { color: var(--muted); font-size: ${TIPO.pequeno} }

/* ── Peças e consumíveis ── */
.pecas-table { width: 100%; border-collapse: collapse; font-size: ${TIPO.pequeno} }
.pecas-table thead { display: table-header-group }
.pecas-table th {
  background: var(--azul); color: var(--branco);
  padding: 4px 6px; text-align: left;
  font-size: ${TIPO.label}; text-transform: uppercase; letter-spacing: .04em;
}
.pecas-table td {
  padding: 3px 6px; border-bottom: 1px solid var(--borda-leve); vertical-align: middle;
}
.pecas-table tr.row-usado td { background: #f0fdf4 }
.pecas-table tr.row-nao-usado td { background: var(--bg-alt); color: #6b7280 }
.pecas-table tr.row-nao-usado .cell-desc { text-decoration: line-through }
.pecas-table .cell-status { width: 20px; text-align: center; font-size: ${TIPO.titulo}; font-weight: 700 }
.pecas-table .cell-pos { width: 46px; color: var(--muted); font-family: 'Courier New', monospace; font-size: ${TIPO.label} }
.pecas-table .cell-code { width: 118px; font-family: 'Courier New', monospace; font-size: ${TIPO.pequeno} }
.pecas-table .cell-qty { width: 36px; text-align: right; font-weight: 600 }
.pecas-table .cell-un { width: 34px; color: var(--muted); font-size: ${TIPO.label} }
.pecas-group-row td {
  background: var(--cinza) !important;
  font-size: ${TIPO.label}; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--muted); padding: 3px 6px;
  page-break-after: avoid;
}
.pecas-group-usado td { border-left: 3px solid var(--verde); color: var(--verde) }
.pecas-group-nao-usado td { border-left: 3px solid #6b7280 }
.pecas-resumo {
  display: flex; gap: 16px; padding: 4px 6px;
  background: var(--cinza); border-top: 1.5px solid var(--borda); font-size: ${TIPO.pequeno};
}
.pecas-resumo-item { display: flex; align-items: center; gap: 4px }
.pecas-resumo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0 }
.pecas-resumo-dot.verde { background: var(--verde) }
.pecas-resumo-dot.cinza { background: #6b7280 }

/* ═══════════════════════════════════════════════════════════════════════════
 * PÁGINA DO CLIENTE — assinaturas, declaração e próximas manutenções
 * Forçar sempre nova página; nunca cortar blocos internos.
 * ═══════════════════════════════════════════════════════════════════════════ */
.rpt-pagina-cliente {
  page-break-before: always;
}
.rpt-pagina-cliente-titulo {
  font-size: 12px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .1em; color: var(--branco);
  background: var(--azul); padding: 6px 10px; border-radius: 3px;
  margin-bottom: 12px;
}

/* ── Assinatura lado a lado ── */
.rpt-assinaturas-dual {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-top: 8px; overflow: hidden;
}
.rpt-assinatura-col {
  background: var(--branco); border: 1.5px solid var(--borda);
  border-top: 3px solid var(--azul);
  border-radius: 4px; padding: 10px 12px;
  box-sizing: border-box;
}
.rpt-assinatura-nome {
  font-size: ${TIPO.corpo}; font-weight: 700; color: var(--texto);
  margin-bottom: 3px;
}
.rpt-assinatura-detalhe { font-size: ${TIPO.label}; color: var(--muted) }
.rpt-assinatura-img img {
  max-width: 100%; max-height: 80px;
  width: auto; height: auto;
  border: 1px solid var(--borda); border-radius: 3px;
  margin-top: 8px; background: var(--branco); display: block;
}
.rpt-assinatura-placeholder {
  height: 70px; border-bottom: 1.5px dashed var(--borda);
  margin-top: 8px; margin-bottom: 4px;
}

/* ── Declaração do cliente ── */
.rpt-declaracao-box {
  background: var(--cinza); border: 1.5px solid var(--borda);
  border-left: 3px solid var(--azul);
  border-radius: 4px; padding: 10px 12px; margin-top: 12px;
}
.rpt-declaracao-titulo {
  font-size: ${TIPO.label}; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--azul); margin-bottom: 5px;
}
.rpt-declaracao-texto {
  font-size: ${TIPO.pequeno}; color: var(--texto); line-height: 1.6;
}

/* ── Tabela próximas manutenções ── */
.rpt-proximas-box { margin-top: 14px }
.proximas-table { width: 100%; border-collapse: collapse; margin-bottom: 6px }
.proximas-table th {
  background: var(--azul); color: var(--branco);
  padding: 5px 8px; font-size: ${TIPO.label}; text-transform: uppercase;
  letter-spacing: .04em; text-align: left; border: 1px solid var(--azul);
}
.proximas-table th:first-child { text-align: center; width: 30px }
.proximas-table td {
  padding: 4px 8px; font-size: ${TIPO.corpo}; color: var(--texto);
  border: 1px solid var(--borda-leve);
}
.proximas-table tr:nth-child(even) { background: var(--cinza) }
.proximas-nota {
  font-size: ${TIPO.pequeno}; color: var(--texto);
  margin: 4px 0 8px; line-height: 1.55;
  font-style: italic;
}

/* ── Último envio ── */
.rpt-ultimo-envio { font-size: ${TIPO.label}; color: var(--muted); margin-bottom: 6px; font-style: italic }

/* ── Rodapé ── */
.rpt-footer {
  margin-top: 10px; padding-top: 7px;
  border-top: 2px solid var(--azul);
  display: flex; justify-content: space-between; align-items: center;
  font-size: ${TIPO.label}; color: var(--texto);
}
`
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. HELPERS HTML — blocos reutilizáveis
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Cabeçalho do relatório (logo Navel + logo marca opcional + dados empresa).
 */
export function htmlHeader(logoSrc, logoMarcaSrc = '', logoMarcaAlt = '') {
  return `
<header class="rpt-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:3px solid ${PALETA.azulNavel}">
  <div class="rpt-logos" style="display:flex;align-items:center;gap:12px">
    <div class="rpt-logo">
      <img src="${logoSrc}" alt="Navel" width="160" height="44"
        style="max-height:44px;max-width:160px;width:auto;height:auto;display:block;object-fit:contain"
        onerror="this.parentNode.innerHTML='<span class=rpt-logo-fallback style=font-size:1.2em;font-weight:800;color:${PALETA.azulNavel}>Navel</span>'">
    </div>
    ${logoMarcaSrc ? `
    <div class="rpt-logo-marca">
      <img src="${logoMarcaSrc}" alt="${esc(logoMarcaAlt)}" width="120" height="40"
        style="max-height:40px;max-width:120px;width:auto;height:auto;display:block;object-fit:contain"
        onerror="this.parentNode.style.display='none'">
    </div>` : ''}
  </div>
  <div class="rpt-empresa" style="text-align:right;font-size:${TIPO.pequeno};line-height:1.55;color:${PALETA.texto}">
    <strong style="font-size:${TIPO.corpo};color:${PALETA.azulNavel}">${esc(EMPRESA.nome)}</strong><br>
    ${esc(EMPRESA.localidade)} &bull; <a href="https://${EMPRESA.web}" style="color:${PALETA.azulNavel};text-decoration:none;font-weight:600">${EMPRESA.web}</a><br>
    ${esc(EMPRESA.regiao)}
  </div>
</header>`
}

/**
 * Barra de título (azul) com nome do documento e número de serviço.
 * @param {string} titulo - Título principal (escapado)
 * @param {string} numLabel - Etiqueta do número (ex: "Nº de Serviço")
 * @param {string} numValue - Valor do número
 * @param {string} [tituloSuffix] - HTML bruto opcional (ex: badge ISTOBAL) anexado ao h1 sem escape
 */
export function htmlTituloBar(titulo, numLabel, numValue, tituloSuffix = '') {
  return `
<div class="rpt-titulo-bar" style="display:flex;align-items:center;justify-content:space-between;background:${PALETA.azulNavel};color:#fff;padding:7px 12px;margin:8px 0 0;border-radius:3px">
  <h1 style="font-size:${TIPO.titulo};font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0;color:#fff">${esc(titulo)}${tituloSuffix || ''}</h1>
  <div class="rpt-num-wrap" style="text-align:right">
    <span class="rpt-num-label" style="font-size:${TIPO.micro};color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.08em;display:block">${esc(numLabel)}</span>
    <span class="rpt-num" style="font-size:${TIPO.numSerie};font-weight:800;letter-spacing:.04em;font-family:'Courier New',monospace;color:#fff">${esc(numValue)}</span>
  </div>
</div>
<div class="rpt-acento" style="height:2px;background:linear-gradient(90deg,${PALETA.azulNavel},${PALETA.azulMedio});margin-bottom:8px;border-radius:0 0 2px 2px"></div>`
}

/**
 * Rodapé do relatório.
 * @param {string} [extraTexto] - Texto opcional acima do rodapé (ex: último envio)
 * @param {string} [footerSuffix] - Sufixo opcional no primeiro span (ex: "Relatório de Reparação X")
 * @param {string} [rightSpan] - Conteúdo opcional do span direito (caller must escape; quando omitido: EMPRESA.web | telefones)
 */
export function htmlFooter(extraTexto = '', footerSuffix = '', rightSpan = '') {
  const span1 = footerSuffix ? `${esc(APP_FOOTER_TEXT)} · ${esc(footerSuffix)}` : esc(APP_FOOTER_TEXT)
  const span2 = rightSpan || `${esc(EMPRESA.web)} &nbsp;|&nbsp; ${esc(EMPRESA.telefones)}`
  return `
${extraTexto ? `<p class="rpt-ultimo-envio" style="font-size:${TIPO.label};color:${PALETA.muted};margin-bottom:6px;font-style:italic">${esc(extraTexto)}</p>` : ''}
<div class="rpt-footer" style="margin-top:10px;padding-top:5px;border-top:1.5px solid ${PALETA.azulNavel};display:flex;justify-content:space-between;align-items:center;font-size:8px;color:${PALETA.muted}">
  <span style="font-size:8px;color:${PALETA.muted}">${span1}</span>
  <span style="font-size:8px;color:${PALETA.muted}">${span2}</span>
</div>`
}

/**
 * Página do cliente — assinaturas, declaração e próximas manutenções.
 * Inicia sempre em nova página (page-break-before: always).
 *
 * @param {Object} params
 * @param {string} params.tecnicoNome
 * @param {string} params.tecnicoTelefone
 * @param {string} params.tecnicoAssinatura - data URL
 * @param {string} params.clienteNome
 * @param {string} params.clienteAssinatura - data URL
 * @param {string} params.dataCriacao
 * @param {string} params.dataAssinatura
 * @param {string} params.declaracaoTexto
 * @param {Array}  params.proximasManutencoes - [{ data, periodicidade, tecnico }]
 */
export function htmlPaginaCliente({
  tecnicoNome = '—',
  tecnicoTelefone = '',
  tecnicoAssinatura = '',
  clienteNome = '—',
  clienteAssinatura = '',
  dataCriacao = '—',
  dataAssinatura = '—',
  declaracaoTexto = '',
  proximasManutencoes = [],
}) {
  const tecSigSafe = tecnicoAssinatura ? safeDataImageUrl(tecnicoAssinatura) : ''
  const cliSigSafe = clienteAssinatura ? safeDataImageUrl(clienteAssinatura) : ''

  const fmtD = (iso) => {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  const perioLabel = (p) => ({ trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' }[p] ?? p ?? '—')

  const S = {
    label: `font-size:${TIPO.label};font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:${PALETA.muted};display:block;margin-bottom:1px`,
    value: `font-size:${TIPO.corpo};color:${PALETA.texto}`,
    sectionTitle: `font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${PALETA.azulNavel};border-bottom:1.5px solid ${PALETA.azulNavel};padding-bottom:3px;margin-bottom:6px`,
    sigCol: `background:#fff;border:1.5px solid ${PALETA.cinzaBorda};border-top:3px solid ${PALETA.azulNavel};border-radius:4px;padding:10px 12px;box-sizing:border-box`,
    sigName: `font-size:${TIPO.corpo};font-weight:700;color:${PALETA.texto};margin-bottom:3px`,
    declBox: `background:${PALETA.cinza};border:1.5px solid ${PALETA.cinzaBorda};border-left:3px solid ${PALETA.azulNavel};border-radius:4px;padding:10px 12px;margin-top:12px`,
    declTitle: `font-size:${TIPO.label};font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${PALETA.azulNavel};margin-bottom:5px`,
    declText: `font-size:${TIPO.pequeno};color:${PALETA.texto};line-height:1.6`,
    thStyle: `background:${PALETA.azulNavel};color:#fff;padding:5px 8px;font-size:${TIPO.label};text-transform:uppercase;letter-spacing:.04em;text-align:left;border:1px solid ${PALETA.azulNavel}`,
    tdStyle: `padding:4px 8px;font-size:${TIPO.corpo};color:${PALETA.texto};border:1px solid ${PALETA.bordaLeve}`,
  }

  let html = `
<div class="rpt-pagina-cliente" style="page-break-before:always">
  <div class="rpt-pagina-cliente-titulo" style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#fff;background:${PALETA.azulNavel};padding:6px 10px;border-radius:3px;margin-bottom:12px">Registo, assinatura e conformidade</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px"><tr>
    <td width="50%" style="padding-right:5px">
      <div style="${S.label}">Data de criação do relatório</div>
      <div style="${S.value}">${esc(dataCriacao)}</div>
    </td>
    <td width="50%" style="padding-left:5px">
      <div style="${S.label}">Data de assinatura</div>
      <div style="${S.value}">${esc(dataAssinatura)}</div>
    </td>
  </tr></table>

  ${declaracaoTexto ? `
  <div class="rpt-declaracao-box no-break" style="${S.declBox}">
    <div style="${S.declTitle}">Declaração de aceitação e compromisso do cliente</div>
    <div style="${S.declText}">${esc(declaracaoTexto)}</div>
  </div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr>
    <td width="48%" style="vertical-align:top;padding-right:6px">
      <div style="${S.sigCol}">
        <div style="${S.label}">Técnico responsável</div>
        <div style="${S.sigName}">${esc(tecnicoNome)}</div>
        ${tecnicoTelefone ? `<div style="font-size:${TIPO.label};color:${PALETA.muted}">Tel: ${esc(tecnicoTelefone)}</div>` : ''}
        ${tecSigSafe ? `<div style="margin-top:8px"><img src="${tecSigSafe}" alt="Assinatura do técnico" style="max-width:100%;max-height:80px;width:auto;height:auto;border:1px solid ${PALETA.cinzaBorda};border-radius:3px;display:block"></div>` : `<div style="height:70px;border-bottom:1.5px dashed ${PALETA.cinzaBorda};margin-top:8px"></div>`}
      </div>
    </td>
    <td width="4%"></td>
    <td width="48%" style="vertical-align:top;padding-left:6px">
      <div style="${S.sigCol}">
        <div style="${S.label}">Assinado pelo cliente</div>
        <div style="${S.sigName}">${esc(clienteNome)}</div>
        ${cliSigSafe ? `<div style="margin-top:8px"><img src="${cliSigSafe}" alt="Assinatura do cliente" style="max-width:100%;max-height:80px;width:auto;height:auto;border:1px solid ${PALETA.cinzaBorda};border-radius:3px;display:block"></div>` : `<div style="height:70px;border-bottom:1.5px dashed ${PALETA.cinzaBorda};margin-top:8px"></div>`}
      </div>
    </td>
  </tr></table>`

  if (proximasManutencoes?.length > 0) {
    const rows = proximasManutencoes
      .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
      .map((pm, i) => `<tr${i % 2 === 1 ? ` style="background:${PALETA.cinza}"` : ''}>
        <td style="${S.tdStyle};text-align:center;width:30px">${i + 1}</td>
        <td style="${S.tdStyle}">${fmtD(pm.data)}</td>
        <td style="${S.tdStyle}">${esc(perioLabel(pm.periodicidade) || pm.tipo || '—')}</td>
        <td style="${S.tdStyle};color:${PALETA.muted}">${esc(pm.tecnico ?? 'A designar')}</td>
      </tr>`).join('')

    html += `
  <div class="rpt-proximas-box no-break" style="margin-top:14px">
    <div style="${S.sectionTitle}">Próximas manutenções agendadas</div>
    <p style="font-size:${TIPO.pequeno};color:${PALETA.texto};margin:4px 0 8px;line-height:1.55;font-style:italic">Informamos que foram nesta data agendadas as datas das manutenções futuras para este equipamento (datas estimativas, podem sofrer alterações):</p>
    <table class="proximas-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px">
      <thead><tr>
        <th style="${S.thStyle};text-align:center;width:30px">N.º</th>
        <th style="${S.thStyle}">Data prevista</th>
        <th style="${S.thStyle}">Periodicidade</th>
        <th style="${S.thStyle}">Técnico</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
  }

  html += `
</div>`

  return html
}

/**
 * Bloco de fotografias — até **4** por linha (largura A4), proporção preservada (`object-fit: contain`).
 * Cada linha com `page-break-inside: avoid` para reduzir cortes feios na impressão/PDF do browser.
 *
 * @param {string[]} fotosSafe - URLs seguras (data:image ou http)
 * @param {string}   titulo    - Título da secção (default: "Documentação fotográfica")
 */
export function htmlFotos(fotosSafe = [], titulo = 'Documentação fotográfica') {
  if (!fotosSafe.length) return ''

  const fotoItem = (src, idx) =>
    `<div class="rpt-foto-item">
      <img src="${src}" alt="Fotografia ${idx + 1}">
      <div class="rpt-foto-caption">Foto ${idx + 1}</div>
    </div>`

  const rowClassForCount = (n) => {
    if (n === 1) return 'rpt-fotos-row rpt-fotos-row--single'
    if (n === 2) return 'rpt-fotos-row rpt-fotos-row--pair'
    if (n === 3) return 'rpt-fotos-row rpt-fotos-row--triple'
    return 'rpt-fotos-row rpt-fotos-row--quad'
  }

  let rowsHtml = ''
  for (let i = 0; i < fotosSafe.length; ) {
    const remaining = fotosSafe.length - i
    const n = Math.min(4, remaining)
    const rowClass = rowClassForCount(n)
    rowsHtml += `<div class="${rowClass}">`
    for (let j = 0; j < n; j++) {
      const idx = i + j
      rowsHtml += fotoItem(fotosSafe[idx], idx)
    }
    rowsHtml += '</div>'
    i += n
  }

  return `
<section class="section-can-break">
  <div class="rpt-section-title">${esc(titulo)}</div>
  <div class="rpt-fotos-section">${rowsHtml}</div>
</section>`
}
