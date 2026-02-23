/**
 * gerarHtmlHistoricoMaquina — Gera o HTML completo do histórico de manutenção
 * de uma máquina para impressão / PDF via window.print().
 *
 * Reutiliza o estilo visual de relatorioHtml.js (paleta Navel, layout A4).
 * Formato: capa com dados da máquina + estatísticas + tabela cronológica
 * de todas as manutenções + última assinatura.
 */
import { formatDataAzores, formatDataHoraAzores } from './datasAzores'
import { escapeHtml, safeDataImageUrl } from './sanitize'
import { APP_FOOTER_TEXT } from '../config/version'

const EMPRESA = {
  nome:    'JOSÉ GONÇALVES CERQUEIRA (NAVEL-AÇORES), Lda.',
  divisao: "Div. Comercial: Pico d'Água Park, Rua 5, n.º13-15 · 9600-049 Pico da Pedra",
  sede:    'Sede / Div. Oficinas: Rua Engº Abel Ferin Coutinho · Apt. 1481 · 9501-802 Ponta Delgada',
  tel:     'Tel: 296 205 290 / 296 630 120',
  web:     'www.navel.pt',
}

/**
 * @param {object} params
 * @param {object}      params.maquina
 * @param {object|null} params.cliente
 * @param {object|null} params.subcategoria
 * @param {object|null} params.categoria
 * @param {Array}       params.manutencoes   — manutenções desta máquina (qualquer estado)
 * @param {Array}       params.relatorios    — todos os relatórios do sistema
 * @param {string}      [params.logoUrl]
 * @returns {string}    HTML completo
 */
export function gerarHtmlHistoricoMaquina({
  maquina,
  cliente,
  subcategoria,
  categoria,
  manutencoes = [],
  relatorios  = [],
  logoUrl,
}) {
  const esc     = escapeHtml
  const logoSrc = logoUrl ?? '/manut/logo-navel.png'
  const hoje    = new Date()

  const geradoEm = hoje.toLocaleString('pt-PT', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Atlantic/Azores',
  })

  // ── Ordenar: mais recente primeiro ──────────────────────────────────────────
  const manutOrdenadas = [...manutencoes].sort((a, b) => b.data.localeCompare(a.data))

  // ── Estatísticas ─────────────────────────────────────────────────────────────
  const total      = manutOrdenadas.length
  const executadas = manutOrdenadas.filter(m => m.status === 'concluida')
  const pendentes  = manutOrdenadas.filter(m => m.status !== 'concluida')
  const emAtraso   = pendentes.filter(m => new Date(m.data) < hoje)
  const proximas   = pendentes.filter(m => new Date(m.data) >= hoje)
  const ultimaExec = executadas[0]
  const proximaAge = proximas.reduce((min, m) => (!min || m.data < min.data) ? m : min, null)

  const ultimaExecStr  = ultimaExec ? formatDataAzores(ultimaExec.data, true) : '—'
  const proximaAgeStr  = proximaAge ? formatDataAzores(proximaAge.data, true) : '—'
  const proximaManutStr = maquina.proximaManut
    ? formatDataAzores(maquina.proximaManut, true)
    : proximaAgeStr

  // ── Última assinatura disponível ─────────────────────────────────────────────
  const ultimoRelAssin = executadas
    .map(m => relatorios.find(r => r.manutencaoId === m.id))
    .find(r => r?.assinaturaDigital)
  const safeAssin = ultimoRelAssin?.assinaturaDigital
    ? safeDataImageUrl(ultimoRelAssin.assinaturaDigital)
    : null

  // ── Descrição curta do equipamento ──────────────────────────────────────────
  const equipDesc = subcategoria
    ? `${subcategoria.nome} — ${maquina.marca} ${maquina.modelo}`
    : `${maquina.marca} ${maquina.modelo}`

  // ── Linha da tabela ──────────────────────────────────────────────────────────
  const buildRow = (m, i) => {
    const rel       = relatorios.find(r => r.manutencaoId === m.id)
    const tipo      = m.tipo === 'montagem' ? 'Montagem' : 'Periódica'
    const dataStr   = formatDataAzores(m.data, true)
    const tecnico   = esc(rel?.tecnico ?? m.tecnico ?? '—')
    const assinante = rel?.nomeAssinante ? esc(rel.nomeAssinante) : '—'
    const notas     = rel?.notas
      ? esc(rel.notas.length > 90 ? rel.notas.slice(0, 90) + '…' : rel.notas)
      : '—'

    const statusBadge = m.status === 'concluida'
      ? '<span class="badge-ok">Executada</span>'
      : new Date(m.data) < hoje
        ? '<span class="badge-err">Em atraso</span>'
        : '<span class="badge-pend">Agendada</span>'

    const rowClass = i % 2 === 1 ? ' class="row-alt"' : ''
    return `<tr${rowClass}>
      <td class="td-c">${i + 1}</td>
      <td>${dataStr}</td>
      <td class="td-c">${tipo}</td>
      <td class="td-c">${statusBadge}</td>
      <td>${tecnico}</td>
      <td>${assinante}</td>
      <td class="td-notes">${notas}</td>
    </tr>`
  }

  // ── HTML completo ────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Histórico de Manutenção — ${esc(maquina.marca)} ${esc(maquina.modelo)}</title>
<style>
@page { size: A4 portrait; margin: 10mm 13mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; line-height: 1.4; color: #1a1a2e; background: #fff; }

:root {
  --azul:#1a4880; --azul-med:#2d6eb5; --azul-claro:#e8f2fa;
  --cinza:#f4f6f8; --borda:#c6d8ec; --texto:#1a1a2e; --muted:#5a6a7e;
  --verde:#16a34a; --vermelho:#dc2626; --laranja:#d97706; --acento:#f0a500;
}

/* ── Cabeçalho ── */
.rpt-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom:8px; border-bottom:2.5px solid var(--azul); }
.rpt-logo img { max-height:38px; max-width:140px; object-fit:contain; display:block; }
.rpt-empresa { text-align:right; font-size:8.5px; line-height:1.55; color:var(--muted); }
.rpt-empresa strong { display:block; font-size:9.5px; color:var(--azul); margin-bottom:1px; }

/* ── Barra de título ── */
.rpt-titulo-bar { display:flex; align-items:center; justify-content:space-between; background:var(--azul); color:#fff; padding:5px 10px; margin:7px 0 0; border-radius:3px; }
.rpt-titulo-bar h1 { font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }
.rpt-gerado { font-size:7.5px; opacity:.75; }
.rpt-acento { height:2px; background:linear-gradient(90deg,var(--acento),var(--azul-med)); margin-bottom:11px; border-radius:0 0 2px 2px; }

/* ── Ficha do equipamento ── */
.section-title { font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--azul-med); border-bottom:1px solid var(--borda); padding-bottom:3px; margin:0 0 6px; }
.ficha-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid var(--borda); border-radius:4px; overflow:hidden; margin-bottom:10px; }
.ficha-col { padding:8px 10px; }
.ficha-col + .ficha-col { border-left:1px solid var(--borda); background:var(--cinza); }
.ficha-field { margin-bottom:5px; }
.ficha-field:last-child { margin-bottom:0; }
.ficha-label { display:block; font-size:7.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin-bottom:1px; }
.ficha-value { font-size:10.5px; color:var(--texto); font-weight:500; }
.ficha-value-lg { font-size:13px; font-weight:700; color:var(--azul); }

/* ── Estatísticas ── */
.stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:12px; }
.stat-box { border:1px solid var(--borda); border-radius:4px; padding:6px 8px; text-align:center; background:var(--cinza); }
.stat-num { display:block; font-size:18px; font-weight:800; line-height:1.1; color:var(--azul); }
.stat-num.red { color:var(--vermelho); }
.stat-num.green { color:var(--verde); }
.stat-num.orange { color:var(--laranja); }
.stat-lbl { display:block; font-size:7.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-top:2px; }

/* ── Tabela histórico ── */
.hist-table { width:100%; border-collapse:collapse; font-size:9px; margin-bottom:14px; page-break-inside:auto; }
.hist-table th { background:var(--azul); color:#fff; padding:4px 6px; text-align:left; font-size:8px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; }
.hist-table td { padding:4px 6px; border-bottom:1px solid #edf2f7; vertical-align:top; }
.hist-table tr.row-alt td { background:var(--cinza); }
.td-c { text-align:center; }
.td-notes { font-size:8.5px; color:var(--muted); max-width:140px; }

/* ── Badges ── */
.badge-ok   { background:rgba(22,163,74,.14);  color:var(--verde);    padding:1px 5px; border-radius:8px; font-size:8px; font-weight:700; white-space:nowrap; }
.badge-err  { background:rgba(220,38,38,.12);  color:var(--vermelho); padding:1px 5px; border-radius:8px; font-size:8px; font-weight:700; white-space:nowrap; }
.badge-pend { background:rgba(217,119,6,.12);  color:var(--laranja);  padding:1px 5px; border-radius:8px; font-size:8px; font-weight:700; white-space:nowrap; }

/* ── Assinatura ── */
.assin-box { border:1px solid var(--borda); border-radius:4px; padding:8px 10px; background:var(--cinza); display:inline-block; margin-bottom:12px; }
.assin-box img { display:block; max-width:200px; max-height:80px; margin-top:5px; border:1px solid var(--borda); background:#fff; border-radius:3px; }
.assin-meta { font-size:8.5px; color:var(--muted); margin-top:3px; }

/* ── Rodapé ── */
.rpt-footer { margin-top:10px; padding-top:6px; border-top:1px solid var(--borda); display:flex; justify-content:space-between; font-size:8.5px; color:var(--muted); }

@media print {
  .hist-table tr { page-break-inside:avoid; }
  .hist-table thead { display:table-header-group; }
}
</style>
</head>
<body>

<header class="rpt-header">
  <div class="rpt-logo">
    <img src="${logoSrc}" alt="Navel"
      onerror="this.parentNode.innerHTML='<strong style=color:#1a4880;font-size:14px>NAVEL</strong>'">
  </div>
  <div class="rpt-empresa">
    <strong>${esc(EMPRESA.nome)}</strong>
    ${esc(EMPRESA.divisao)}<br>
    ${esc(EMPRESA.sede)}<br>
    ${esc(EMPRESA.tel)} &nbsp;|&nbsp; ${esc(EMPRESA.web)}
  </div>
</header>

<div class="rpt-titulo-bar">
  <h1>Histórico Completo de Manutenção</h1>
  <span class="rpt-gerado">Gerado em ${geradoEm}</span>
</div>
<div class="rpt-acento"></div>

<div class="section-title">Ficha do equipamento</div>
<div class="ficha-grid">
  <div class="ficha-col">
    <div class="ficha-field">
      <span class="ficha-label">Equipamento</span>
      <span class="ficha-value ficha-value-lg">${esc(maquina.marca)} ${esc(maquina.modelo)}</span>
    </div>
    <div class="ficha-field">
      <span class="ficha-label">Nº de Série</span>
      <span class="ficha-value">${esc(maquina.numeroSerie || '—')}</span>
    </div>
    ${subcategoria ? `<div class="ficha-field">
      <span class="ficha-label">Tipo / Subcategoria</span>
      <span class="ficha-value">${esc(subcategoria.nome)}${categoria ? ` &mdash; ${esc(categoria.nome)}` : ''}</span>
    </div>` : ''}
    ${maquina.localizacao ? `<div class="ficha-field">
      <span class="ficha-label">Localização</span>
      <span class="ficha-value">${esc(maquina.localizacao)}</span>
    </div>` : ''}
  </div>
  <div class="ficha-col">
    <div class="ficha-field">
      <span class="ficha-label">Cliente</span>
      <span class="ficha-value ficha-value-lg">${esc(cliente?.nome ?? '—')}</span>
    </div>
    ${cliente?.nif ? `<div class="ficha-field">
      <span class="ficha-label">NIF</span>
      <span class="ficha-value">${esc(cliente.nif)}</span>
    </div>` : ''}
    ${cliente?.morada ? `<div class="ficha-field">
      <span class="ficha-label">Morada</span>
      <span class="ficha-value">${esc(cliente.morada)}</span>
    </div>` : ''}
    <div class="ficha-field">
      <span class="ficha-label">Próxima manutenção</span>
      <span class="ficha-value">${proximaManutStr}</span>
    </div>
  </div>
</div>

<div class="section-title">Estatísticas globais</div>
<div class="stats-row">
  <div class="stat-box">
    <span class="stat-num">${total}</span>
    <span class="stat-lbl">Total</span>
  </div>
  <div class="stat-box">
    <span class="stat-num green">${executadas.length}</span>
    <span class="stat-lbl">Executadas</span>
  </div>
  <div class="stat-box">
    <span class="stat-num orange">${proximas.length}</span>
    <span class="stat-lbl">Agendadas</span>
  </div>
  <div class="stat-box">
    <span class="stat-num${emAtraso.length > 0 ? ' red' : ''}">${emAtraso.length}</span>
    <span class="stat-lbl">Em atraso</span>
  </div>
  <div class="stat-box">
    <span class="stat-num" style="font-size:${ultimaExecStr.length > 8 ? '9' : '13'}px;padding-top:${ultimaExecStr.length > 8 ? '5' : '2'}px">${ultimaExecStr}</span>
    <span class="stat-lbl">Última execução</span>
  </div>
</div>

<div class="section-title">
  Registo histórico — ${total} intervenç${total === 1 ? 'ão' : 'ões'} (mais recente primeiro)
</div>
${total === 0
  ? '<p style="color:#5a6a7e;font-size:10px;margin-bottom:12px;font-style:italic">Nenhuma manutenção registada para este equipamento.</p>'
  : `<table class="hist-table">
  <thead>
    <tr>
      <th class="td-c" style="width:22px">#</th>
      <th style="width:62px">Data</th>
      <th class="td-c" style="width:58px">Tipo</th>
      <th class="td-c" style="width:68px">Estado</th>
      <th style="width:80px">Técnico</th>
      <th style="width:90px">Assinado por</th>
      <th>Observações</th>
    </tr>
  </thead>
  <tbody>
    ${manutOrdenadas.map((m, i) => buildRow(m, i)).join('\n    ')}
  </tbody>
</table>`
}

${safeAssin ? `<div class="section-title">Última assinatura registada</div>
<div class="assin-box">
  <span class="ficha-label">Assinatura manuscrita do cliente</span>
  <img src="${safeAssin}" alt="Assinatura do cliente">
  ${ultimoRelAssin?.nomeAssinante
    ? `<div class="assin-meta">Assinado por: <strong>${esc(ultimoRelAssin.nomeAssinante)}</strong>${ultimoRelAssin.dataAssinatura ? ` &nbsp;&mdash;&nbsp; ${formatDataHoraAzores(ultimoRelAssin.dataAssinatura)}` : ''}</div>`
    : ''}
</div>` : ''}

<footer class="rpt-footer">
  <span>${esc(APP_FOOTER_TEXT)}</span>
  <span>${esc(equipDesc)} &nbsp;&middot;&nbsp; S/N: ${esc(maquina.numeroSerie || '—')}</span>
</footer>

</body>
</html>`
}
