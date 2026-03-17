/**
 * gerarHtmlHistoricoMaquina — Gera o HTML completo do histórico de manutenção
 * de uma máquina para impressão / PDF via window.print().
 *
 * Reutiliza relatorioBaseStyles (paleta Navel, layout A4).
 * Formato: capa com dados da máquina + estatísticas + tabela cronológica
 * de todas as manutenções + última assinatura.
 */
import { formatDataAzores, formatDataHoraAzores, parseDateLocal } from './datasAzores'
import { escapeHtml, safeDataImageUrl } from './sanitize'
import { cssBase, htmlHeader, htmlTituloBar, htmlFooter, PALETA, TIPO } from './relatorioBaseStyles'

/**
 * @param {object} params
 * @param {object}      params.maquina
 * @param {object|null} params.cliente
 * @param {object|null} params.subcategoria
 * @param {object|null} params.categoria
 * @param {Array}       params.manutencoes   — manutenções desta máquina (qualquer estado)
 * @param {Array}       params.relatorios    — todos os relatórios do sistema
 * @param {Array}       [params.reparacoes]  — reparações desta máquina
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
  reparacoes  = [],
  tecnicos    = [],
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
  const emAtraso   = pendentes.filter(m => parseDateLocal(m.data) < hoje)
  const proximas   = pendentes.filter(m => parseDateLocal(m.data) >= hoje)
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

  // ── Último técnico com assinatura registada ─────────────────────────────────
  const ultimoTecNome = ultimaExec?.tecnico || ultimoRelAssin?.tecnico || null
  const tecObj = ultimoTecNome ? tecnicos.find(t => t.nome === ultimoTecNome && t.ativo !== false) : null
  const safeTecAssin = tecObj?.assinaturaDigital ? safeDataImageUrl(tecObj.assinaturaDigital) : null

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
      : parseDateLocal(m.data) < hoje
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

  // ── Reparações ──────────────────────────────────────────────────────────────
  const repsOrdenadas = [...reparacoes].sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  const statusRepLabel = { pendente: 'Pendente', em_progresso: 'Em progresso', concluida: 'Concluída' }
  const statusRepClass = { pendente: 'badge-pend', em_progresso: 'badge-pend', concluida: 'badge-ok' }

  const buildRepRow = (r, i) => {
    const dataStr   = r.data ? formatDataAzores(r.data, true) : '—'
    const tecnico   = esc(r.tecnico ?? '—')
    const estado    = `<span class="${statusRepClass[r.status] ?? 'badge-pend'}">${statusRepLabel[r.status] ?? r.status}</span>`
    const descAvaria = esc((r.descricaoAvaria || '—').slice(0, 100))
    const obs       = esc((r.observacoes || '—').slice(0, 80))
    const rowClass  = i % 2 === 1 ? ' class="row-alt"' : ''
    return `<tr${rowClass}>
      <td class="td-c">${i + 1}</td>
      <td>${dataStr}</td>
      <td>${tecnico}</td>
      <td class="td-c">${estado}</td>
      <td class="td-notes">${descAvaria}</td>
      <td class="td-notes">${obs}</td>
    </tr>`
  }

  // ── CSS específico do histórico (timeline, badges, stats, ficha) ──────────────
  const cssHistorico = `
/* Margens de impressão (histórico usa 10mm 13mm) */
@page { margin: 10mm 13mm; }

/* Override título bar para "Gerado em" (data em vez de nº serviço) */
.rpt-titulo-bar .rpt-num { font-size: 9.5px; font-family: inherit; }
.rpt-titulo-bar .rpt-num-label { font-size: 8.5px; color: rgba(255,255,255,.85); }

/* Ficha do equipamento */
.ficha-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid var(--borda); border-radius:4px; overflow:hidden; margin-bottom:10px; }
.ficha-col { padding:8px 10px; }
.ficha-col + .ficha-col { border-left:1px solid var(--borda); background:var(--cinza); }
.ficha-field { margin-bottom:5px; }
.ficha-field:last-child { margin-bottom:0; }
.ficha-label { display:block; font-size:${TIPO.micro}; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin-bottom:1px; }
.ficha-value { font-size:${TIPO.corpo}; color:var(--texto); font-weight:500; }
.ficha-value-lg { font-size:13px; font-weight:700; color:var(--azul); }

/* Estatísticas */
.stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:12px; }
.stat-box { border:1px solid var(--borda); border-radius:4px; padding:6px 8px; text-align:center; background:var(--cinza); }
.stat-num { display:block; font-size:18px; font-weight:800; line-height:1.1; color:var(--azul); }
.stat-num.red { color:var(--vermelho); }
.stat-num.green { color:var(--verde); }
.stat-num.orange { color:var(--laranja); }
.stat-lbl { display:block; font-size:${TIPO.micro}; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-top:2px; }
.stat-num.ultima-exec { font-size:${ultimaExecStr.length > 8 ? '9' : '13'}px; padding-top:${ultimaExecStr.length > 8 ? '5' : '2'}px; }

/* Tabela histórico */
.hist-table { width:100%; border-collapse:collapse; font-size:${TIPO.pequeno}; margin-bottom:14px; page-break-inside:auto; }
.hist-table th { background:var(--azul); color:var(--branco); padding:4px 6px; text-align:left; font-size:${TIPO.micro}; font-weight:600; letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; }
.hist-table th.th-n { width:22px; }
.hist-table th.th-data { width:62px; }
.hist-table th.th-tipo { width:58px; }
.hist-table th.th-estado { width:68px; }
.hist-table th.th-tecnico { width:80px; }
.hist-table th.th-assin { width:90px; }
.hist-table td { padding:4px 6px; border-bottom:1px solid var(--borda-leve); vertical-align:top; }
.hist-table tr.row-alt td { background:var(--cinza); }
.td-c { text-align:center; }
.td-notes { font-size:${TIPO.label}; color:var(--muted); max-width:140px; }

/* Badges estado */
.badge-ok   { background:#dcfce7; color:#14532d; padding:1.5px 6px; border-radius:8px; font-size:${TIPO.micro}; font-weight:700; white-space:nowrap; border:1px solid #86efac; }
.badge-err  { background:#fee2e2; color:#7f1d1d; padding:1.5px 6px; border-radius:8px; font-size:${TIPO.micro}; font-weight:700; white-space:nowrap; border:1px solid #fca5a5; }
.badge-pend { background:#fef3c7; color:#78350f; padding:1.5px 6px; border-radius:8px; font-size:${TIPO.micro}; font-weight:700; white-space:nowrap; border:1px solid #fcd34d; }

.hist-empty { color:var(--muted); font-size:10px; margin-bottom:12px; font-style:italic; }
.hist-reps-title { margin-top:14px; }
.hist-table.reps-table th.th-tecnico { width:70px; }

@media print {
  .hist-table tr { page-break-inside:avoid; }
  .hist-table thead { display:table-header-group; }
}
`

  // ── HTML completo ────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Histórico de Manutenção — ${esc(maquina.marca)} ${esc(maquina.modelo)}</title>
<style>
${cssBase(PALETA.azulNavel, 'rgba(26,72,128,0.12)')}
${cssHistorico}
</style>
</head>
<body>

${htmlHeader(logoSrc)}

${htmlTituloBar('Histórico Completo de Manutenção', 'Gerado em', geradoEm)}

<div class="rpt-section-title">Ficha do equipamento</div>
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

<div class="rpt-section-title">Estatísticas globais</div>
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
    <span class="stat-num ultima-exec">${ultimaExecStr}</span>
    <span class="stat-lbl">Última execução</span>
  </div>
</div>

<div class="rpt-section-title">
  Registo histórico — ${total} intervenç${total === 1 ? 'ão' : 'ões'} (mais recente primeiro)
</div>
${total === 0
  ? '<p class="hist-empty">Nenhuma manutenção registada para este equipamento.</p>'
  : `<table class="hist-table">
  <thead>
    <tr>
      <th class="td-c th-n">#</th>
      <th class="th-data">Data</th>
      <th class="td-c th-tipo">Tipo</th>
      <th class="td-c th-estado">Estado</th>
      <th class="th-tecnico">Técnico</th>
      <th class="th-assin">Assinado por</th>
      <th>Observações</th>
    </tr>
  </thead>
  <tbody>
    ${manutOrdenadas.map((m, i) => buildRow(m, i)).join('\n    ')}
  </tbody>
</table>`
}

${repsOrdenadas.length > 0 ? `
<div class="rpt-section-title hist-reps-title">
  Reparações — ${repsOrdenadas.length} registo${repsOrdenadas.length === 1 ? '' : 's'}
</div>
<table class="hist-table reps-table">
  <thead>
    <tr>
      <th class="td-c th-n">#</th>
      <th class="th-data">Data</th>
      <th class="th-tecnico">Técnico</th>
      <th class="td-c th-estado">Estado</th>
      <th>Descrição da avaria</th>
      <th>Observações</th>
    </tr>
  </thead>
  <tbody>
    ${repsOrdenadas.map((r, i) => buildRepRow(r, i)).join('\n    ')}
  </tbody>
</table>` : ''}

${(safeAssin || safeTecAssin) ? `
<div class="rpt-section-title">Última assinatura registada</div>
<div class="rpt-assinaturas-dual">
  ${safeTecAssin ? `<div class="rpt-assinatura-col">
    <div class="rpt-label">Técnico responsável</div>
    <div class="rpt-assinatura-nome">${esc(tecObj?.nome || '')}</div>
    ${tecObj?.telefone ? `<div class="rpt-assinatura-detalhe">Tel: ${esc(tecObj.telefone)}</div>` : ''}
    <div class="rpt-assinatura-img"><img src="${safeTecAssin}" alt="Assinatura do técnico"></div>
  </div>` : '<div></div>'}
  ${safeAssin ? `<div class="rpt-assinatura-col">
    <div class="rpt-label">Assinatura do cliente</div>
    <div class="rpt-assinatura-img"><img src="${safeAssin}" alt="Assinatura do cliente"></div>
    ${ultimoRelAssin?.nomeAssinante
      ? `<div class="rpt-assinatura-detalhe">Assinado por: <strong>${esc(ultimoRelAssin.nomeAssinante)}</strong>${ultimoRelAssin.dataAssinatura ? ` &nbsp;&mdash;&nbsp; ${formatDataHoraAzores(ultimoRelAssin.dataAssinatura)}` : ''}</div>`
      : ''}
  </div>` : '<div></div>'}
</div>` : ''}

${htmlFooter('', '', `${esc(equipDesc)} &nbsp;&middot;&nbsp; S/N: ${esc(maquina.numeroSerie || '—')}`)}

</body>
</html>`
}
