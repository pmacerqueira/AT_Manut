/**
 * gerarRelatorioFrota – Relatório executivo de frota para um cliente.
 * Documento HTML/PDF profissional com sumário de equipamentos, estado das manutenções,
 * reparações e análise de conformidade. Entregue ao cliente como PDF.
 *
 * v1.12.0: Agrupamento por categoria, secção de reparações, resumo anual.
 */
import { escapeHtml } from './sanitize'
import { formatDataAzores, parseDateLocal } from './datasAzores'
import { APP_FOOTER_TEXT } from '../config/version'
import { EMPRESA } from '../constants/empresa'

/**
 * @param {object}   cliente
 * @param {object[]} maquinas       — máquinas do cliente
 * @param {object[]} manutencoes    — todas as manutenções
 * @param {object[]} relatorios     — todos os relatórios de manutenção
 * @param {object[]} reparacoes     — todas as reparações
 * @param {Function} getSubcategoria
 * @param {Function} getCategoria
 * @param {object}   options        — { logoUrl }
 */
export function gerarRelatorioFrotaHtml(cliente, maquinas, manutencoes, relatorios, reparacoes = [], getSubcategoria, getCategoria, options = {}) {
  const esc = escapeHtml
  const logoSrc = options.logoUrl ?? '/manut/logo-navel.png'
  const hoje = new Date().toISOString().slice(0, 10)
  const hojeFormatado = formatDataAzores(hoje, true)
  const ano = new Date().getFullYear()

  // ── Por cada máquina, calcular estado ──────────────────────────────────────
  const linhas = maquinas.map(m => {
    const sub = getSubcategoria(m.subcategoriaId)
    const cat = sub ? getCategoria(sub.categoriaId) : null
    const manutsM = manutencoes.filter(mt => mt.maquinaId === m.id)
    const repsM   = reparacoes.filter(r => r.maquinaId === m.id)
    const ultima  = manutsM.filter(mt => mt.status === 'concluida').sort((a, b) => b.data.localeCompare(a.data))[0]
    const proxima = manutsM
      .filter(mt => mt.status === 'agendada' || mt.status === 'pendente')
      .sort((a, b) => a.data.localeCompare(b.data))[0]
    const emAtraso = proxima && proxima.data < hoje
    const totalManuts = manutsM.filter(mt => mt.status === 'concluida').length
    const totalReps   = repsM.filter(r => r.status === 'concluida').length
    const repsAbertas = repsM.filter(r => r.status !== 'concluida').length
    const relUltima   = ultima ? relatorios.find(r => r.manutencaoId === ultima.id) : null

    // Dias de atraso (positivo) ou dias até próxima (negativo)
    let diasAtraso = null
    if (proxima) {
      diasAtraso = Math.floor((parseDateLocal(hoje) - parseDateLocal(proxima.data)) / 86400000)
    }

    let estadoBadge, estadoLabel
    if (!m.proximaManut) {
      estadoBadge = 'badge-montagem'; estadoLabel = 'Por instalar'
    } else if (emAtraso) {
      estadoBadge = 'badge-atraso'; estadoLabel = 'Em atraso'
    } else {
      estadoBadge = 'badge-ok'; estadoLabel = 'Conforme'
    }

    return { m, sub, cat, ultima, proxima, emAtraso, diasAtraso, totalManuts, totalReps, repsAbertas, relUltima, estadoBadge, estadoLabel }
  })

  // ── KPIs globais ───────────────────────────────────────────────────────────
  const totalEquip      = maquinas.length
  const totalAtraso     = linhas.filter(l => l.emAtraso).length
  const totalConformes  = linhas.filter(l => !l.emAtraso && l.m.proximaManut).length
  const totalPorInstalar = linhas.filter(l => !l.m.proximaManut).length
  const taxaCumprimento = totalEquip > 0 ? Math.round((totalConformes / totalEquip) * 100) : 0
  const totalManutsAno  = manutencoes.filter(mt => mt.status === 'concluida' && mt.data?.startsWith(String(ano))).length
  const totalRepsAno    = reparacoes.filter(r => r.status === 'concluida' && r.data?.startsWith(String(ano))).length
  const totalRepsAbertas = linhas.reduce((s, l) => s + l.repsAbertas, 0)

  // ── Agrupar por categoria ──────────────────────────────────────────────────
  const categoriasMap = new Map()
  linhas.forEach(l => {
    const catId = l.cat?.id || '_sem_categoria'
    const catNome = l.cat?.nome || 'Sem categoria'
    if (!categoriasMap.has(catId)) categoriasMap.set(catId, { nome: catNome, linhas: [] })
    categoriasMap.get(catId).linhas.push(l)
  })

  // ── Reparações recentes (últimos 12 meses) ────────────────────────────────
  const umAnoAtras = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const repsRecentes = reparacoes
    .filter(r => r.status === 'concluida' && r.data >= umAnoAtras && maquinas.some(m => m.id === r.maquinaId))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 20)

  // ── HTML ───────────────────────────────────────────────────────────────────
  let html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório Executivo de Frota — ${esc(cliente.nome)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:14mm 12mm 12mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:9pt;color:#1e293b;background:#fff;line-height:1.4}
:root{
  --azul:#0f4c81;--azul-light:#e8f1fb;--cinza:#f8fafc;
  --verde:#15803d;--verde-light:#dcfce7;
  --vermelho:#dc2626;--vermelho-light:#fee2e2;
  --laranja:#d97706;--laranja-light:#fef3c7;
  --muted:#64748b;--border:#e2e8f0;
}
.header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:8px;border-bottom:2px solid var(--azul);margin-bottom:10px}
.header-logo img{height:36px;object-fit:contain}
.header-empresa{text-align:right;font-size:7.5pt;color:var(--muted);line-height:1.5}
.header-empresa strong{color:var(--azul);font-size:8.5pt}
.secao-titulo{background:var(--azul);color:#fff;padding:4px 8px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px;border-radius:3px}
.secao-titulo.vermelho{background:var(--vermelho)}
.secao-titulo.laranja{background:var(--laranja)}
.cliente-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 12px;padding:8px 10px;background:var(--cinza);border-radius:4px;border:1px solid var(--border);margin-bottom:10px}
.cliente-field{display:flex;flex-direction:column;gap:1px}
.c-label{font-size:7pt;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.c-value{font-size:8.5pt;font-weight:600;color:#1e293b}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}
.kpi-card{background:var(--cinza);border:1px solid var(--border);border-radius:5px;padding:7px 8px;text-align:center}
.kpi-card.kpi-verde{background:var(--verde-light);border-color:var(--verde)}
.kpi-card.kpi-vermelho{background:var(--vermelho-light);border-color:var(--vermelho)}
.kpi-card.kpi-laranja{background:var(--laranja-light);border-color:var(--laranja)}
.kpi-card.kpi-azul{background:var(--azul-light);border-color:var(--azul)}
.kpi-numero{font-size:18pt;font-weight:800;line-height:1.1}
.kpi-verde .kpi-numero{color:var(--verde)}
.kpi-vermelho .kpi-numero{color:var(--vermelho)}
.kpi-laranja .kpi-numero{color:var(--laranja)}
.kpi-azul .kpi-numero{color:var(--azul)}
.kpi-label{font-size:7pt;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.tabela-frota{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px}
.tabela-frota th{background:var(--azul);color:#fff;padding:4px 5px;text-align:left;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.tabela-frota td{padding:3.5px 5px;border-bottom:1px solid var(--border);vertical-align:middle}
.tabela-frota tr:nth-child(even) td{background:var(--cinza)}
.badge{display:inline-block;padding:1.5px 6px;border-radius:10px;font-size:7pt;font-weight:700;white-space:nowrap}
.badge-ok{background:var(--verde-light);color:var(--verde)}
.badge-atraso{background:var(--vermelho-light);color:var(--vermelho)}
.badge-montagem{background:var(--laranja-light);color:var(--laranja)}
.badge-rep{background:var(--azul-light);color:var(--azul)}
.data-atraso{color:var(--vermelho);font-weight:600}
.data-ok{color:var(--verde)}
.cat-header{background:var(--azul-light);padding:4px 8px;font-size:8pt;font-weight:700;color:var(--azul);margin:8px 0 4px;border-radius:3px;border-left:3px solid var(--azul)}
.resumo-anual{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.resumo-box{background:var(--cinza);border:1px solid var(--border);border-radius:4px;padding:8px 10px}
.resumo-box h4{font-size:8pt;color:var(--azul);margin-bottom:4px;text-transform:uppercase}
.resumo-stat{display:flex;justify-content:space-between;font-size:8.5pt;padding:2px 0;border-bottom:1px dotted var(--border)}
.resumo-stat:last-child{border-bottom:none}
.rodape{margin-top:12px;padding-top:6px;border-top:1px solid var(--border);font-size:7pt;color:var(--muted);display:flex;justify-content:space-between;align-items:center}
</style>
</head>
<body>

<div class="header">
  <div class="header-logo"><img src="${logoSrc}" alt="Navel-Açores"></div>
  <div class="header-empresa">
    <strong>${esc(EMPRESA.nome)}</strong><br>
    ${esc(EMPRESA.sede)}<br>
    ${esc(EMPRESA.telefones)} · ${esc(EMPRESA.web)}
  </div>
</div>

<div class="secao-titulo">Relatório Executivo de Frota — ${ano}</div>

<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente</span><span class="c-value">${esc(cliente.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF</span><span class="c-value">${esc(cliente.nif ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade</span><span class="c-value">${esc(cliente.localidade ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Morada</span><span class="c-value">${esc(cliente.morada ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone</span><span class="c-value">${esc(cliente.telefone ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Email</span><span class="c-value">${esc(cliente.email ?? '—')}</span></div>
</div>

<!-- KPIs -->
<div class="kpis">
  <div class="kpi-card">
    <div class="kpi-numero">${totalEquip}</div>
    <div class="kpi-label">Equipamentos</div>
  </div>
  <div class="kpi-card ${taxaCumprimento >= 80 ? 'kpi-verde' : taxaCumprimento >= 50 ? 'kpi-laranja' : 'kpi-vermelho'}">
    <div class="kpi-numero">${taxaCumprimento}%</div>
    <div class="kpi-label">Conformidade</div>
  </div>
  <div class="kpi-card ${totalAtraso > 0 ? 'kpi-vermelho' : 'kpi-verde'}">
    <div class="kpi-numero">${totalAtraso}</div>
    <div class="kpi-label">Em atraso</div>
  </div>
  <div class="kpi-card kpi-azul">
    <div class="kpi-numero">${totalManutsAno}</div>
    <div class="kpi-label">Manutenções ${ano}</div>
  </div>
  <div class="kpi-card ${totalRepsAbertas > 0 ? 'kpi-laranja' : ''}">
    <div class="kpi-numero">${totalRepsAno}</div>
    <div class="kpi-label">Reparações ${ano}</div>
  </div>
</div>

<!-- Resumo anual -->
<div class="resumo-anual">
  <div class="resumo-box">
    <h4>Manutenções ${ano}</h4>
    <div class="resumo-stat"><span>Executadas</span><strong>${totalManutsAno}</strong></div>
    <div class="resumo-stat"><span>Pendentes / Agendadas</span><strong>${manutencoes.filter(mt => (mt.status === 'pendente' || mt.status === 'agendada') && maquinas.some(mm => mm.id === mt.maquinaId)).length}</strong></div>
    <div class="resumo-stat"><span>Em atraso</span><strong style="color:var(--vermelho)">${totalAtraso}</strong></div>
  </div>
  <div class="resumo-box">
    <h4>Reparações ${ano}</h4>
    <div class="resumo-stat"><span>Concluídas</span><strong>${totalRepsAno}</strong></div>
    <div class="resumo-stat"><span>Em curso / Pendentes</span><strong>${totalRepsAbertas}</strong></div>
    <div class="resumo-stat"><span>Total intervenções ${ano}</span><strong style="color:var(--azul)">${totalManutsAno + totalRepsAno}</strong></div>
  </div>
</div>`

  // ── Frota agrupada por categoria ─────────────────────────────────────────
  for (const [, grupo] of categoriasMap) {
    const grupoAtraso = grupo.linhas.filter(l => l.emAtraso).length
    html += `
<div class="cat-header">${esc(grupo.nome)} (${grupo.linhas.length} equip.${grupoAtraso > 0 ? ` · <span style="color:var(--vermelho)">${grupoAtraso} em atraso</span>` : ''})</div>
<table class="tabela-frota">
  <thead><tr>
    <th style="width:26%">Equipamento</th>
    <th style="width:14%">Nº Série</th>
    <th style="width:11%;text-align:center">Última</th>
    <th style="width:11%;text-align:center">Próxima</th>
    <th style="width:6%;text-align:center">Dias</th>
    <th style="width:6%;text-align:center">Manut.</th>
    <th style="width:6%;text-align:center">Rep.</th>
    <th style="width:10%;text-align:center">Estado</th>
    <th style="width:10%;text-align:center">Últ. rel.</th>
  </tr></thead>
  <tbody>`

    grupo.linhas
      .sort((a, b) => (b.diasAtraso ?? -9999) - (a.diasAtraso ?? -9999))
      .forEach(({ m, sub, ultima, proxima, diasAtraso, totalManuts, totalReps, relUltima, estadoBadge, estadoLabel }) => {
        const diasStr = diasAtraso != null
          ? (diasAtraso > 0 ? `<span class="data-atraso">+${diasAtraso}</span>` : diasAtraso === 0 ? 'Hoje' : `<span class="data-ok">${diasAtraso}</span>`)
          : '—'
        html += `
    <tr>
      <td><strong>${esc(m.marca)} ${esc(m.modelo)}</strong>${sub ? `<br><span style="font-size:7pt;color:var(--muted)">${esc(sub.nome)}</span>` : ''}</td>
      <td style="font-family:monospace;font-size:7.5pt;color:var(--muted)">${esc(m.numeroSerie)}</td>
      <td style="text-align:center">${ultima ? formatDataAzores(ultima.data, true) : '—'}</td>
      <td style="text-align:center">${proxima
        ? `<span class="${proxima.data < hoje ? 'data-atraso' : 'data-ok'}">${formatDataAzores(proxima.data, true)}</span>`
        : (m.proximaManut ? `<span class="${m.proximaManut < hoje ? 'data-atraso' : 'data-ok'}">${formatDataAzores(m.proximaManut, true)}</span>` : '—')}</td>
      <td style="text-align:center">${diasStr}</td>
      <td style="text-align:center;color:var(--muted)">${totalManuts || '—'}</td>
      <td style="text-align:center;color:var(--muted)">${totalReps || '—'}</td>
      <td style="text-align:center"><span class="badge ${estadoBadge}">${esc(estadoLabel)}</span></td>
      <td style="text-align:center;font-size:7pt">${relUltima?.numeroRelatorio ?? '—'}</td>
    </tr>`
      })

    html += `
  </tbody>
</table>`
  }

  // ── Manutenções em atraso ────────────────────────────────────────────────
  if (totalAtraso > 0) {
    html += `
<div class="secao-titulo vermelho">Manutenções em atraso (${totalAtraso})</div>
<table class="tabela-frota">
  <thead><tr>
    <th style="width:30%">Equipamento</th>
    <th style="width:16%">Nº Série</th>
    <th style="width:14%">Data prevista</th>
    <th style="width:10%;text-align:center">Dias atraso</th>
    <th style="width:30%">Observações</th>
  </tr></thead>
  <tbody>`
    linhas.filter(l => l.emAtraso)
      .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0))
      .forEach(({ m, sub, proxima, diasAtraso }) => {
        html += `
    <tr>
      <td><strong>${esc(m.marca)} ${esc(m.modelo)}</strong>${sub ? ` <span style="color:var(--muted);font-size:7pt">· ${esc(sub.nome)}</span>` : ''}</td>
      <td style="font-family:monospace;font-size:7.5pt">${esc(m.numeroSerie)}</td>
      <td class="data-atraso">${formatDataAzores(proxima.data, true)}</td>
      <td class="data-atraso" style="text-align:center;font-weight:700">+${diasAtraso ?? 0}d</td>
      <td style="font-size:7.5pt;color:var(--muted)">${esc(proxima.observacoes ?? '')}</td>
    </tr>`
      })
    html += `
  </tbody>
</table>`
  }

  // ── Reparações recentes (últimos 12 meses) ────────────────────────────────
  if (repsRecentes.length > 0) {
    html += `
<div class="secao-titulo laranja">Reparações concluídas (últimos 12 meses — ${repsRecentes.length})</div>
<table class="tabela-frota">
  <thead><tr>
    <th style="width:28%">Equipamento</th>
    <th style="width:14%">Nº Série</th>
    <th style="width:12%">Data</th>
    <th style="width:46%">Descrição</th>
  </tr></thead>
  <tbody>`
    repsRecentes.forEach(r => {
      const maq = maquinas.find(mm => mm.id === r.maquinaId)
      html += `
    <tr>
      <td><strong>${maq ? esc(`${maq.marca} ${maq.modelo}`) : '—'}</strong></td>
      <td style="font-family:monospace;font-size:7.5pt;color:var(--muted)">${maq ? esc(maq.numeroSerie) : '—'}</td>
      <td>${formatDataAzores(r.data, true)}</td>
      <td style="font-size:7.5pt">${esc(r.descricao?.slice(0, 120) || r.descricaoAvaria?.slice(0, 120) || '—')}</td>
    </tr>`
    })
    html += `
  </tbody>
</table>`
  }

  // ── Rodapé ────────────────────────────────────────────────────────────────
  html += `
<div class="rodape">
  <span>${esc(APP_FOOTER_TEXT)}</span>
  <span>Documento gerado em ${hojeFormatado}</span>
</div>
</body>
</html>`

  return html
}
