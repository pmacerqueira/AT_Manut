/**
 * gerarRelatorioFrota – Relatório executivo de frota para um cliente.
 * Documento HTML/PDF profissional com sumário de equipamentos, estado das manutenções
 * e análise de conformidade. Entregue ao cliente como PDF.
 */
import { escapeHtml } from './sanitize'
import { formatDataAzores } from './datasAzores'
import { APP_FOOTER_TEXT } from '../config/version'

const EMPRESA = {
  nome:      'JOSÉ GONÇALVES CERQUEIRA (NAVEL-AÇORES), Lda.',
  sede:      'Rua Engº Abel Ferin Coutinho · Apt. 1481 · 9501-802 Ponta Delgada',
  telefones: 'Tel: 296 205 290 / 296 630 120',
  web:       'www.navel.pt',
}

/**
 * Gera HTML do relatório executivo de frota para um cliente.
 *
 * @param {object}   cliente     — dados do cliente
 * @param {object[]} maquinas    — máquinas do cliente
 * @param {object[]} manutencoes — todas as manutenções (filtradas por maquinaId internamente)
 * @param {object[]} relatorios  — todos os relatórios
 * @param {Function} getSubcategoria — helper de DataContext
 * @param {object}   options     — { logoUrl }
 */
export function gerarRelatorioFrotaHtml(cliente, maquinas, manutencoes, relatorios, getSubcategoria, options = {}) {
  const esc = escapeHtml
  const logoSrc = options.logoUrl ?? '/manut/logo.png'
  const hoje = new Date().toISOString().slice(0, 10)
  const hojeFormatado = formatDataAzores(hoje, true)
  const ano = new Date().getFullYear()

  // ── Por cada máquina, calcular estado ──────────────────────────────────────
  const linhas = maquinas.map(m => {
    const sub = getSubcategoria(m.subcategoriaId)
    const manutsM = manutencoes.filter(mt => mt.maquinaId === m.id)
    const ultima  = manutsM.filter(mt => mt.status === 'concluida').sort((a, b) => b.data.localeCompare(a.data))[0]
    const proxima = manutsM
      .filter(mt => mt.status === 'agendada' || mt.status === 'pendente')
      .sort((a, b) => a.data.localeCompare(b.data))[0]
    const emAtraso = proxima && proxima.data < hoje
    const totalManuts = manutsM.filter(mt => mt.status === 'concluida').length
    const relUltima   = ultima ? relatorios.find(r => r.manutencaoId === ultima.id) : null

    let estadoBadge, estadoLabel
    if (!m.proximaManut) {
      estadoBadge = 'badge-montagem'; estadoLabel = 'Por instalar'
    } else if (emAtraso) {
      estadoBadge = 'badge-atraso'; estadoLabel = 'Em atraso'
    } else {
      estadoBadge = 'badge-ok'; estadoLabel = 'Conforme'
    }

    return { m, sub, ultima, proxima, emAtraso, totalManuts, relUltima, estadoBadge, estadoLabel }
  })

  const totalEquip     = maquinas.length
  const totalAtraso    = linhas.filter(l => l.emAtraso).length
  const totalConformes = linhas.filter(l => !l.emAtraso && l.m.proximaManut).length
  const totalPorInstalar = linhas.filter(l => !l.m.proximaManut).length
  const taxaCumprimento  = totalEquip > 0
    ? Math.round((totalConformes / totalEquip) * 100)
    : 0

  // ── HTML ───────────────────────────────────────────────────────────────────
  let html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Frota — ${esc(cliente.nome)}</title>
<style>
/* ── Reset / Página ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:14mm 12mm 12mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:9pt;color:#1e293b;background:#fff;line-height:1.4}
/* ── Paleta ── */
:root{
  --azul:#0f4c81;--azul-light:#e8f1fb;--cinza:#f8fafc;
  --verde:#15803d;--verde-light:#dcfce7;
  --vermelho:#dc2626;--vermelho-light:#fee2e2;
  --laranja:#d97706;--laranja-light:#fef3c7;
  --muted:#64748b;--border:#e2e8f0;
}
/* ── Cabeçalho ── */
.header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:8px;border-bottom:2px solid var(--azul);margin-bottom:10px}
.header-logo img{height:36px;object-fit:contain}
.header-empresa{text-align:right;font-size:7.5pt;color:var(--muted);line-height:1.5}
.header-empresa strong{color:var(--azul);font-size:8.5pt}
/* ── Títulos de secção ── */
.secao-titulo{background:var(--azul);color:#fff;padding:4px 8px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px;border-radius:3px}
/* ── Ficha do cliente ── */
.cliente-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 12px;padding:8px 10px;background:var(--cinza);border-radius:4px;border:1px solid var(--border);margin-bottom:10px}
.cliente-field{display:flex;flex-direction:column;gap:1px}
.c-label{font-size:7pt;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.c-value{font-size:8.5pt;font-weight:600;color:#1e293b}
/* ── KPIs ── */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.kpi-card{background:var(--cinza);border:1px solid var(--border);border-radius:5px;padding:7px 8px;text-align:center}
.kpi-card.kpi-verde{background:var(--verde-light);border-color:var(--verde)}
.kpi-card.kpi-vermelho{background:var(--vermelho-light);border-color:var(--vermelho)}
.kpi-card.kpi-laranja{background:var(--laranja-light);border-color:var(--laranja)}
.kpi-numero{font-size:18pt;font-weight:800;line-height:1.1}
.kpi-verde .kpi-numero{color:var(--verde)}
.kpi-vermelho .kpi-numero{color:var(--vermelho)}
.kpi-laranja .kpi-numero{color:var(--laranja)}
.kpi-label{font-size:7pt;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
/* ── Tabela de frota ── */
.tabela-frota{width:100%;border-collapse:collapse;font-size:8pt}
.tabela-frota th{background:var(--azul);color:#fff;padding:4px 5px;text-align:left;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.tabela-frota td{padding:3.5px 5px;border-bottom:1px solid var(--border);vertical-align:middle}
.tabela-frota tr:nth-child(even) td{background:var(--cinza)}
.tabela-frota tr:hover td{background:var(--azul-light)}
.col-equip{width:28%}
.col-serie{width:16%;font-family:monospace;font-size:7.5pt;color:var(--muted)}
.col-ultima{width:14%;text-align:center}
.col-proxima{width:14%;text-align:center}
.col-total{width:8%;text-align:center;color:var(--muted)}
.col-estado{width:13%;text-align:center}
.col-num{width:7%;text-align:center;color:var(--muted);font-size:7pt}
/* ── Badges ── */
.badge{display:inline-block;padding:1.5px 6px;border-radius:10px;font-size:7pt;font-weight:700;white-space:nowrap}
.badge-ok{background:var(--verde-light);color:var(--verde)}
.badge-atraso{background:var(--vermelho-light);color:var(--vermelho)}
.badge-montagem{background:var(--laranja-light);color:var(--laranja)}
.data-atraso{color:var(--vermelho);font-weight:600}
.data-ok{color:var(--verde)}
/* ── Rodapé ── */
.rodape{margin-top:12px;padding-top:6px;border-top:1px solid var(--border);font-size:7pt;color:var(--muted);display:flex;justify-content:space-between;align-items:center}
.rodape-data{font-size:7pt;color:var(--muted)}
</style>
</head>
<body>

<!-- Cabeçalho -->
<div class="header">
  <div class="header-logo">
    <img src="${logoSrc}" alt="Navel-Açores">
  </div>
  <div class="header-empresa">
    <strong>${esc(EMPRESA.nome)}</strong><br>
    ${esc(EMPRESA.sede)}<br>
    ${esc(EMPRESA.telefones)} · ${esc(EMPRESA.web)}
  </div>
</div>

<!-- Título -->
<div class="secao-titulo">Relatório Executivo de Frota — ${ano}</div>

<!-- Ficha do cliente -->
<div class="cliente-grid">
  <div class="cliente-field">
    <span class="c-label">Cliente</span>
    <span class="c-value">${esc(cliente.nome)}</span>
  </div>
  <div class="cliente-field">
    <span class="c-label">NIF</span>
    <span class="c-value">${esc(cliente.nif ?? '—')}</span>
  </div>
  <div class="cliente-field">
    <span class="c-label">Localidade</span>
    <span class="c-value">${esc(cliente.localidade ?? '—')}</span>
  </div>
  <div class="cliente-field">
    <span class="c-label">Morada</span>
    <span class="c-value">${esc(cliente.morada ?? '—')}</span>
  </div>
  <div class="cliente-field">
    <span class="c-label">Telefone</span>
    <span class="c-value">${esc(cliente.telefone ?? '—')}</span>
  </div>
  <div class="cliente-field">
    <span class="c-label">Email</span>
    <span class="c-value">${esc(cliente.email ?? '—')}</span>
  </div>
</div>

<!-- KPIs -->
<div class="kpis">
  <div class="kpi-card">
    <div class="kpi-numero">${totalEquip}</div>
    <div class="kpi-label">Equipamentos</div>
  </div>
  <div class="kpi-card ${taxaCumprimento >= 80 ? 'kpi-verde' : taxaCumprimento >= 50 ? 'kpi-laranja' : 'kpi-vermelho'}">
    <div class="kpi-numero">${taxaCumprimento}%</div>
    <div class="kpi-label">Taxa de cumprimento</div>
  </div>
  <div class="kpi-card ${totalAtraso > 0 ? 'kpi-vermelho' : 'kpi-verde'}">
    <div class="kpi-numero">${totalAtraso}</div>
    <div class="kpi-label">Em atraso</div>
  </div>
  <div class="kpi-card ${totalPorInstalar > 0 ? 'kpi-laranja' : ''}">
    <div class="kpi-numero">${totalPorInstalar}</div>
    <div class="kpi-label">Por instalar</div>
  </div>
</div>

<!-- Tabela de frota -->
<div class="secao-titulo">Frota de equipamentos (${totalEquip})</div>
<table class="tabela-frota">
  <thead>
    <tr>
      <th class="col-equip">Equipamento / Modelo</th>
      <th class="col-serie">Nº Série</th>
      <th class="col-ultima">Última manut.</th>
      <th class="col-proxima">Próxima manut.</th>
      <th class="col-total">Nº serv.</th>
      <th class="col-estado">Estado</th>
      <th class="col-num">Últ. relatório</th>
    </tr>
  </thead>
  <tbody>
    ${linhas.map(({ m, sub, ultima, proxima, relUltima, estadoBadge, estadoLabel }) => `
    <tr>
      <td class="col-equip">
        <strong>${esc(m.marca)} ${esc(m.modelo)}</strong>
        ${sub ? `<br><span style="font-size:7pt;color:var(--muted)">${esc(sub.nome)}</span>` : ''}
      </td>
      <td class="col-serie">${esc(m.numeroSerie)}</td>
      <td class="col-ultima" style="text-align:center">${ultima ? formatDataAzores(ultima.data, true) : '—'}</td>
      <td class="col-proxima" style="text-align:center">
        ${proxima
          ? `<span class="${proxima.data < hoje ? 'data-atraso' : 'data-ok'}">${formatDataAzores(proxima.data, true)}</span>`
          : (m.proximaManut
              ? `<span class="${m.proximaManut < hoje ? 'data-atraso' : 'data-ok'}">${formatDataAzores(m.proximaManut, true)}</span>`
              : '—')}
      </td>
      <td class="col-total">${m.proximaManut ? (manutencoes.filter(mt => mt.maquinaId === m.id && mt.status === 'concluida').length) : '—'}</td>
      <td class="col-estado" style="text-align:center"><span class="badge ${estadoBadge}">${esc(estadoLabel)}</span></td>
      <td class="col-num">${relUltima?.numeroRelatorio ? `<span style="font-size:7pt">${esc(relUltima.numeroRelatorio)}</span>` : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>

${totalAtraso > 0 ? `
<div class="secao-titulo" style="background:var(--vermelho);margin-top:12px">Manutenções em atraso (${totalAtraso})</div>
<table class="tabela-frota">
  <thead>
    <tr>
      <th style="width:35%">Equipamento</th>
      <th style="width:18%">Nº Série</th>
      <th style="width:15%">Data prevista</th>
      <th style="width:10%">Dias atraso</th>
      <th style="width:22%">Observações</th>
    </tr>
  </thead>
  <tbody>
    ${linhas.filter(l => l.emAtraso).map(({ m, sub, proxima }) => {
      const diasAtraso = Math.max(0, Math.floor((new Date(hoje) - new Date(proxima.data)) / 86400000))
      return `<tr>
        <td><strong>${esc(m.marca)} ${esc(m.modelo)}</strong>${sub ? ` <span style="color:var(--muted);font-size:7pt">· ${esc(sub.nome)}</span>` : ''}</td>
        <td style="font-family:monospace;font-size:7.5pt">${esc(m.numeroSerie)}</td>
        <td class="data-atraso">${formatDataAzores(proxima.data, true)}</td>
        <td class="data-atraso" style="text-align:center;font-weight:700">${diasAtraso}d</td>
        <td style="font-size:7.5pt;color:var(--muted)">${esc(proxima.observacoes ?? '')}</td>
      </tr>`
    }).join('')}
  </tbody>
</table>` : ''}

<!-- Rodapé -->
<div class="rodape">
  <span>${esc(APP_FOOTER_TEXT)}</span>
  <span class="rodape-data">Documento gerado em ${hojeFormatado}</span>
</div>

</body>
</html>`

  return html
}
