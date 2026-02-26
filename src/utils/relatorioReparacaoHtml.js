/**
 * relatorioReparacaoParaHtml – Gera HTML do relatório de reparação para visualização/email/impressão.
 * Design: mesmo estilo industrial Navel, com secções específicas de reparação
 * (avaria, trabalho realizado, peças/consumíveis, checklist, assinatura).
 */
import { formatDataHoraAzores, formatDataAzores } from './datasAzores'
import { escapeHtml, safeDataImageUrl } from './sanitize'
import { APP_FOOTER_TEXT } from '../config/version'

const EMPRESA = {
  nome:             'JOSÉ GONÇALVES CERQUEIRA (NAVEL-AÇORES), Lda.',
  divisaoComercial: "Div. Comercial: Pico d'Agua Park, Rua 5, n.º13-15 · 9600-049 Pico da Pedra",
  sede:             'Sede / Divisão Oficinas: Rua Engº Abel Ferin Coutinho · Apt. 1481 · 9501-802 Ponta Delgada',
  telefones:        'Tel: 296 205 290 / 296 630 120',
  pais:             'Açores — Portugal',
  web:              'www.navel.pt',
}

export function relatorioReparacaoParaHtml(relatorio, reparacao, maquina, cliente, checklistItems = [], options = {}) {
  if (!relatorio) return ''
  const { subcategoriaNome, logoUrl } = options
  const logoSrc = logoUrl ?? '/manut/logo.png'
  const esc = escapeHtml

  // ── Datas ──
  const dataAssinatura = relatorio.dataAssinatura
    ? formatDataHoraAzores(relatorio.dataAssinatura) : '—'
  const dataRealizacao = relatorio.dataAssinatura
    ? formatDataAzores(relatorio.dataAssinatura, true)
    : (relatorio.dataCriacao ? formatDataAzores(relatorio.dataCriacao, true) : '—')

  // ── Equipamento ──
  const equipCompleto = maquina && subcategoriaNome
    ? esc(`${subcategoriaNome} — ${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}`)
    : maquina ? esc(`${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}`) : '—'

  const safeAssinatura = relatorio.assinaturaDigital
    ? safeDataImageUrl(relatorio.assinaturaDigital) : ''

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
  const fotosSafe = fotos.map(f => safeDataImageUrl(f)).filter(Boolean)

  // Mapa id → texto legível para lookup rápido
  const checklistMap = {}
  checklistItems.forEach(it => { checklistMap[it.id] = it.texto ?? it.descricao ?? it.nome ?? it.id })

  const buildCheckRow = ([id, resp], i) => {
    const texto = checklistMap[id] ?? id   // fallback ao ID se não encontrar
    const badge = resp === 'OK'
      ? '<span class="badge-sim">OK</span>'
      : resp === 'NOK' ? '<span class="badge-nao">NOK</span>' : '<span class="badge-nd">N/A</span>'
    return `<tr><td class="cl-num">${i + 1}.</td><td class="cl-texto">${esc(texto)}</td><td class="cl-badge">${badge}</td></tr>`
  }

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Reparação ${esc(relatorio.numeroRelatorio ?? '')} — Navel</title>
<style>
@page{size:A4 portrait;margin:8mm 11mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;line-height:1.42;color:#1a1a2e;background:#fff;padding:0}

:root{
  --azul:#1a4880;--azul-med:#2d6eb5;--azul-claro:#e8f2fa;
  --cinza:#f4f6f8;--borda:#c6d8ec;--texto:#1a1a2e;--muted:#5a6a7e;
  --verde:#16a34a;--vermelho:#dc2626;--acento:#f0a500;
  --rep:#b45309;--rep-bg:#fff7ed;--rep-borda:#fed7aa;
}

section{margin-bottom:10px;page-break-inside:avoid}
.section-can-break{page-break-inside:auto}
.page-break-before{page-break-before:always}
.no-break{page-break-inside:avoid}

/* Cabeçalho */
.rpt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:2.5px solid var(--azul)}
.rpt-logo img{max-height:42px;max-width:150px;object-fit:contain;display:block}
.rpt-logo-fallback{font-size:1.2em;font-weight:700;color:var(--azul)}
.rpt-empresa{text-align:right;font-size:9px;line-height:1.5;color:var(--muted)}
.rpt-empresa strong{display:block;font-size:10px;color:var(--azul);margin-bottom:1px}
.rpt-empresa a{color:var(--azul-med);text-decoration:none}

/* Título — barra de reparação (laranja) */
.rpt-titulo-bar{display:flex;align-items:center;justify-content:space-between;background:var(--rep);color:#fff;padding:5px 10px;margin:7px 0 0;border-radius:3px}
.rpt-titulo-bar h1{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rpt-num-wrap{text-align:right}
.rpt-num-label{font-size:8px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;display:block}
.rpt-num{font-size:14px;font-weight:800;letter-spacing:.04em;font-family:'Courier New',monospace}
.rpt-acento{height:2px;background:linear-gradient(90deg,var(--acento),var(--rep));margin-bottom:8px;border-radius:0 0 2px 2px}

/* Secções */
.rpt-section-title{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--rep);border-bottom:1px solid var(--rep-borda);padding-bottom:2px;margin-bottom:5px}

/* Grid de dados */
.rpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px}
.rpt-field{padding:2.5px 0;border-bottom:1px solid #edf2f7}
.rpt-field:last-child{border-bottom:none}
.rpt-label{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);display:block;margin-bottom:0}
.rpt-value{font-size:10px;color:var(--texto);font-weight:500}

/* Bloco de texto longo */
.rpt-text-block{background:var(--cinza);border-radius:3px;padding:5px 7px;font-size:9.5px;line-height:1.5;color:var(--texto);white-space:pre-wrap;word-break:break-word}

/* Peças */
.pecas-table{width:100%;border-collapse:collapse;font-size:9px}
.pecas-table th{background:var(--rep);color:#fff;padding:3px 6px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.05em}
.pecas-table td{padding:3px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.pecas-table tr:last-child td{border-bottom:none}
.pecas-table tr:nth-child(even) td{background:#fafafa}
.pecas-table .td-qtd{text-align:center;font-weight:700;width:3rem}

/* Checklist */
.cl-table{width:100%;border-collapse:collapse;font-size:9px}
.cl-table td{padding:2px 4px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.cl-table tr:last-child td{border-bottom:none}
.cl-num{width:1.5rem;color:var(--muted);text-align:right;padding-right:6px}
.cl-texto{flex:1}
.cl-badge{text-align:right;width:2.5rem}
.badge-sim{background:#dcfce7;color:#166534;padding:1px 5px;border-radius:3px;font-size:7.5px;font-weight:700}
.badge-nao{background:#fee2e2;color:#991b1b;padding:1px 5px;border-radius:3px;font-size:7.5px;font-weight:700}
.badge-nd{background:#f1f5f9;color:#64748b;padding:1px 5px;border-radius:3px;font-size:7.5px;font-weight:700}

/* Fotos */
.fotos-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.foto-item img{max-width:140px;max-height:100px;object-fit:cover;border-radius:3px;border:1px solid var(--borda)}

/* Assinatura */
.rpt-assinatura-bloco{display:flex;gap:20px;align-items:flex-start}
.rpt-assinatura-left{flex:1}
.rpt-assinatura-right{flex:1;text-align:center}
.rpt-assinatura-canvas{display:block;max-width:200px;max-height:70px;object-fit:contain;margin:0 auto 2px}
.rpt-assinatura-label{font-size:7.5px;color:var(--muted);text-align:center;margin-top:2px;padding-top:3px;border-top:1px solid var(--borda)}
.rpt-assinatura-nome{font-size:9px;font-weight:700;color:var(--texto);text-align:center;margin-bottom:1px}

/* Aviso ISTOBAL */
.rpt-istobal-badge{display:inline-flex;align-items:center;gap:4px;background:#fff7ed;color:var(--rep);border:1px solid var(--rep-borda);border-radius:3px;padding:1px 6px;font-size:8px;font-weight:700;margin-left:6px}

/* Rodapé */
.rpt-footer{border-top:1px solid var(--borda);padding-top:5px;text-align:center;font-size:8px;color:var(--muted);margin-top:10px}
</style>
</head>
<body>

<!-- Cabeçalho -->
<section>
  <div class="rpt-header">
    <div class="rpt-logo">
      <img src="${logoSrc}" alt="Navel" onerror="this.parentNode.innerHTML='<span class=\\'rpt-logo-fallback\\'>NAVEL</span>'" />
    </div>
    <div class="rpt-empresa">
      <strong>${esc(EMPRESA.nome)}</strong>
      ${esc(EMPRESA.divisaoComercial)}<br>
      ${esc(EMPRESA.sede)}<br>
      ${esc(EMPRESA.telefones)} · <a href="https://${esc(EMPRESA.web)}">${esc(EMPRESA.web)}</a>
    </div>
  </div>
  <div class="rpt-titulo-bar">
    <h1>Relatório de Reparação${reparacao?.origem === 'istobal_email' ? ' <span class="rpt-istobal-badge">⚡ ISTOBAL</span>' : ''}</h1>
    <div class="rpt-num-wrap">
      <span class="rpt-num-label">Nº Relatório</span>
      <span class="rpt-num">${esc(relatorio.numeroRelatorio ?? '—')}</span>
    </div>
  </div>
  <div class="rpt-acento"></div>
</section>

<!-- Dados gerais -->
<section>
  <div class="rpt-section-title">Dados da Intervenção</div>
  <div class="rpt-grid">
    <div class="rpt-field"><span class="rpt-label">Data de realização</span><span class="rpt-value">${esc(dataRealizacao)}</span></div>
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
  <div class="rpt-section-title">Peças / Consumíveis Utilizados</div>
  <table class="pecas-table">
    <thead>
      <tr><th>Código</th><th>Descrição</th><th class="td-qtd">Qtd</th></tr>
    </thead>
    <tbody>
      ${pecas.filter(p => p.descricao?.trim() || p.codigo?.trim()).map(p =>
        `<tr><td>${esc(p.codigo ?? '—')}</td><td>${esc(p.descricao ?? '—')}</td><td class="td-qtd">${esc(String(p.quantidade ?? 1))}</td></tr>`
      ).join('')}
    </tbody>
  </table>
</section>
` : ''}

<!-- Checklist -->
${temChecklist ? `
<section>
  <div class="rpt-section-title">Checklist de Verificação</div>
  <table class="cl-table">
    <tbody>
      ${checklistEntries.map(buildCheckRow).join('')}
    </tbody>
  </table>
</section>
` : ''}

<!-- Notas -->
${relatorio.notas ? `
<section>
  <div class="rpt-section-title">Notas / Observações</div>
  <div class="rpt-text-block">${esc(relatorio.notas)}</div>
</section>
` : ''}

<!-- Fotos -->
${fotosSafe.length > 0 ? `
<section class="section-can-break">
  <div class="rpt-section-title">Documentação Fotográfica</div>
  <div class="fotos-grid">
    ${fotosSafe.map((f, i) => `<div class="foto-item"><img src="${f}" alt="Foto ${i + 1}" /></div>`).join('')}
  </div>
</section>
` : ''}

<!-- Assinatura -->
<section class="no-break">
  <div class="rpt-section-title">Assinatura e Declaração</div>
  <div class="rpt-assinatura-bloco">
    <div class="rpt-assinatura-left">
      <div class="rpt-field"><span class="rpt-label">Data</span><span class="rpt-value">${esc(dataAssinatura)}</span></div>
      ${relatorio.nomeAssinante ? `<div class="rpt-field"><span class="rpt-label">Assinado por</span><span class="rpt-value">${esc(relatorio.nomeAssinante)}</span></div>` : ''}
      ${cliente?.nome ? `<div class="rpt-field"><span class="rpt-label">Entidade</span><span class="rpt-value">${esc(cliente.nome)}</span></div>` : ''}
      <p style="font-size:8px;color:#64748b;margin-top:6px;line-height:1.5;">
        O cliente declara ter recebido e aprovado a intervenção descrita neste documento.
      </p>
    </div>
    <div class="rpt-assinatura-right">
      ${safeAssinatura
        ? `<img class="rpt-assinatura-canvas" src="${safeAssinatura}" alt="Assinatura digital" />`
        : '<div style="height:60px;border-bottom:1px solid #cbd5e1;margin-bottom:4px;"></div>'
      }
      <div class="rpt-assinatura-nome">${esc(relatorio.nomeAssinante ?? '—')}</div>
      <div class="rpt-assinatura-label">Assinatura do Cliente</div>
    </div>
  </div>
</section>

<!-- Rodapé -->
<div class="rpt-footer">
  ${esc(APP_FOOTER_TEXT)} · Relatório de Reparação ${esc(relatorio.numeroRelatorio ?? '')}
</div>

</body>
</html>`

  return html
}
