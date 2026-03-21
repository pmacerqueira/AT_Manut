/**
 * gerarRelatorioFrotaHtml – Versão HTML do relatório de frota.
 * Usado para envio por email (o email precisa de HTML inline).
 * Para visualização/download PDF, usar gerarRelatorioFrotaPdf.
 */
import { escapeHtml } from './sanitize'
import { formatDataAzores, parseDateLocal } from './datasAzores'
import { cssBase, htmlHeader, htmlTituloBar, htmlFooter, PALETA } from './relatorioBaseStyles'
import { normEntityId, dateKeyForFilter } from './frotaReportHelpers'

const TENDENCIA_HISTORICO_MAX = 5
const TENDENCIA_EXCELENTE_MIN = 3
const TENDENCIA_ATENCAO_MAX = 2

const fmtD = (dateStr) => {
  if (!dateStr) return '—'
  const s = String(dateStr).slice(0, 10).split('-')
  if (s.length < 3) return String(dateStr)
  return `${s[2]}-${s[1]}-${s[0]}`
}

export function gerarRelatorioFrotaHtml(cliente, maquinas, manutencoes, relatorios, reparacoes = [], getSubcategoria, getCategoria, options = {}) {
  const esc = escapeHtml
  const logoSrc = options.logoUrl ?? '/manut/logo-navel.png'
  const hoje = new Date().toISOString().slice(0, 10)
  const hojeFormatado = formatDataAzores(hoje, true)
  const ano = new Date().getFullYear()
  const periodoCustom = !!options.periodoCustom
  const periodoLabel = options.periodoLabel || String(ano)
  const pinicio = options.periodoInicio ?? null
  const pfim = options.periodoFim ?? null
  const dataDentroPeriodo = (dk) => {
    if (!dk) return false
    if (pinicio && dk < pinicio) return false
    if (pfim && dk > pfim) return false
    return true
  }

  const maqIds = new Set(maquinas.map(m => normEntityId(m.id)))
  const manutsCliente = manutencoes.filter(mt => maqIds.has(normEntityId(mt.maquinaId)))
  const repsCliente = reparacoes.filter(r => maqIds.has(normEntityId(r.maquinaId)))

  const manutsByMaq = new Map()
  manutsCliente.forEach(mt => {
    const k = normEntityId(mt.maquinaId)
    if (!manutsByMaq.has(k)) manutsByMaq.set(k, [])
    manutsByMaq.get(k).push(mt)
  })
  const repsByMaq = new Map()
  repsCliente.forEach(r => {
    const k = normEntityId(r.maquinaId)
    if (!repsByMaq.has(k)) repsByMaq.set(k, [])
    repsByMaq.get(k).push(r)
  })
  const relMap = new Map()
  for (const r of relatorios) {
    const rid = normEntityId(r.manutencaoId)
    if (!rid || !manutsCliente.some(mt => normEntityId(mt.id) === rid)) continue
    relMap.set(rid, r)
  }

  const linhas = maquinas.map(m => {
    const sub = getSubcategoria(m.subcategoriaId)
    const cat = sub ? getCategoria(sub.categoriaId) : null
    const mid = normEntityId(m.id)
    const manutsM = manutsByMaq.get(mid) || []
    const repsM = repsByMaq.get(mid) || []
    const ultima = manutsM.filter(mt => mt.status === 'concluida').sort((a, b) => b.data.localeCompare(a.data))[0]
    const proxima = manutsM
      .filter(mt => mt.status === 'agendada' || mt.status === 'pendente')
      .sort((a, b) => a.data.localeCompare(b.data))[0]
    const proxDataKey = proxima?.data != null
      ? String(proxima.data).slice(0, 10)
      : (m.proximaManut ? String(m.proximaManut).slice(0, 10) : '')
    const emAtraso = !!(proxDataKey && proxDataKey < hoje)
    const totalManuts = manutsM.filter(mt => mt.status === 'concluida').length
    const totalReps = repsM.filter(r => r.status === 'concluida').length
    const repsAbertas = repsM.filter(r => r.status !== 'concluida').length
    const relUltima = ultima ? relMap.get(normEntityId(ultima.id)) : null

    const proximaParaDias = proxima?.data ?? m.proximaManut
    let diasAtraso = null
    if (proximaParaDias) diasAtraso = Math.floor((parseDateLocal(hoje) - parseDateLocal(proximaParaDias)) / 86400000)

    let estado
    if (!ultima && !proxDataKey) estado = 'instalar'
    else if (emAtraso) estado = 'atraso'
    else estado = 'conforme'

    let estadoBadge, estadoLabel
    if (estado === 'instalar') { estadoBadge = 'badge-montagem'; estadoLabel = 'Por instalar' }
    else if (estado === 'atraso') { estadoBadge = 'badge-atraso'; estadoLabel = 'N\u00e3o conforme' }
    else { estadoBadge = 'badge-ok'; estadoLabel = 'Conforme' }

    // R2: Indicador de tendência
    const manutsConclM = manutsM.filter(mt => mt.status === 'concluida').sort((a, b) => b.data.localeCompare(a.data))
    let tendencia = { nivel: 'neutro', texto: '—', cor: PALETA.muted }
    if (manutsConclM.length >= 2) {
      const relsConcl = manutsConclM.slice(0, TENDENCIA_HISTORICO_MAX).map(mt => relMap.get(normEntityId(mt.id))).filter(Boolean)
      const anomaliasTotal = relsConcl.reduce((n, r) => {
        const snap = r.checklistSnapshot ?? []
        return n + snap.filter(item => r.checklistRespostas?.[item.id] === 'nao').length
      }, 0)
      if (emAtraso) {
        tendencia = { nivel: 'critico', texto: '⚠ Atraso', cor: PALETA.vermelho }
      } else if (anomaliasTotal === 0 && manutsConclM.length >= TENDENCIA_EXCELENTE_MIN) {
        tendencia = { nivel: 'excelente', texto: '★ Excelente', cor: PALETA.verde }
      } else if (anomaliasTotal === 0) {
        tendencia = { nivel: 'bom', texto: '● Conforme', cor: PALETA.verde }
      } else if (anomaliasTotal <= TENDENCIA_ATENCAO_MAX) {
        tendencia = { nivel: 'atencao', texto: '◐ Atenção', cor: PALETA.amarelo }
      } else {
        tendencia = { nivel: 'critico', texto: '⚠ Crítico', cor: PALETA.vermelho }
      }
    } else if (manutsConclM.length === 0 && estado === 'instalar') {
      tendencia = { nivel: 'novo', texto: '○ Novo', cor: PALETA.muted }
    } else if (emAtraso) {
      tendencia = { nivel: 'critico', texto: '⚠ Atraso', cor: PALETA.vermelho }
    }

    return { m, sub, cat, ultima, proxima, emAtraso, diasAtraso, totalManuts, totalReps, repsAbertas, relUltima, estado, estadoBadge, estadoLabel, tendencia, proxDataKey }
  })

  const totalEquip = maquinas.length
  const totalAtraso = linhas.filter(l => l.estado === 'atraso').length
  const totalConformes = linhas.filter(l => l.estado === 'conforme').length
  const taxaCumprimento = totalEquip > 0 ? Math.round((totalConformes / totalEquip) * 100) : 0
  const totalManutsAno = periodoCustom
    ? manutsCliente.filter(mt => mt.status === 'concluida' && dataDentroPeriodo(dateKeyForFilter(mt.data))).length
    : manutsCliente.filter(mt => mt.status === 'concluida' && mt.data?.startsWith(String(ano))).length
  const totalRepsAno = periodoCustom
    ? repsCliente.filter(r => r.status === 'concluida' && dataDentroPeriodo(dateKeyForFilter(r.data))).length
    : repsCliente.filter(r => r.status === 'concluida' && r.data?.startsWith(String(ano))).length
  const totalRepsAbertas = linhas.reduce((s, l) => s + l.repsAbertas, 0)

  const categoriasMap = new Map()
  linhas.forEach(l => {
    const catId = l.cat?.id || '_sem_categoria'
    const catNome = l.cat?.nome || 'Sem categoria'
    if (!categoriasMap.has(catId)) categoriasMap.set(catId, { nome: catNome, linhas: [] })
    categoriasMap.get(catId).linhas.push(l)
  })

  const umAnoAtras = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const repsRecentes = repsCliente
    .filter(r => {
      if (r.status !== 'concluida') return false
      if (periodoCustom) return dataDentroPeriodo(dateKeyForFilter(r.data))
      return r.data >= umAnoAtras
    })
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 20)

  const cssFrota = `
@page { size: A4 portrait; margin: 14mm 12mm 12mm }
:root { --verde-light: #dcfce7; --vermelho-light: #fee2e2; --laranja-light: #fef3c7 }
.secao-titulo{background:var(--azul);color:var(--branco);padding:5px 10px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px;border-radius:3px}
.secao-titulo.vermelho{background:#b91c1c}
.secao-titulo.laranja{background:#a16207}
.cliente-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;padding:8px 10px;background:var(--cinza);border-radius:4px;border:1px solid var(--borda);border-top:3px solid var(--azul);margin-bottom:10px}
.cliente-field{display:flex;flex-direction:column;gap:1px}
.cliente-field .c-label{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.cliente-field .c-value{font-size:9pt;font-weight:700;color:var(--texto)}
.kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;margin-bottom:10px}
.kpi-card{background:var(--cinza);border:1px solid var(--borda);border-radius:5px;padding:7px 8px;text-align:center}
.kpi-card.kpi-verde{background:#dcfce7;border-color:#15803d}
.kpi-card.kpi-vermelho{background:#fee2e2;border-color:#b91c1c}
.kpi-card.kpi-laranja{background:#fef3c7;border-color:#a16207}
.kpi-card.kpi-azul{background:var(--azul-claro);border-color:var(--azul)}
.kpi-numero{font-size:18pt;font-weight:800;line-height:1.1}
.kpi-verde .kpi-numero{color:#14532d}
.kpi-vermelho .kpi-numero{color:#7f1d1d}
.kpi-laranja .kpi-numero{color:#78350f}
.kpi-azul .kpi-numero{color:var(--azul)}
.kpi-label{font-size:8pt;color:var(--texto);text-transform:uppercase;letter-spacing:.04em;margin-top:2px;font-weight:600}
.tabela-frota{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px}
.tabela-frota th{background:var(--azul);color:var(--branco);padding:4px 5px;text-align:left;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.tabela-frota td{padding:3px 5px;vertical-align:top;color:var(--texto)}
.tabela-frota .eq-row td{border-top:1px solid var(--borda-leve);padding-top:4px;padding-bottom:4px;border-bottom:1px solid var(--borda)}
.tabela-frota .eq-row.par td{background:var(--cinza)}
.tabela-frota .eq-cell-stack .eq-nome{display:block;margin-bottom:2px}
.tabela-frota .cell-eq{width:30%}
.tabela-frota .cell-center{text-align:center}
.tabela-frota .cell-muted{color:var(--muted)}
.tabela-frota .cell-dias{font-weight:700}
.badge{display:inline-block;padding:1.5px 6px;border-radius:10px;font-size:7.5pt;font-weight:700;white-space:nowrap}
.badge-ok{background:#dcfce7;color:#14532d;border:1px solid #86efac}
.badge-atraso{background:#fee2e2;color:#7f1d1d;border:1px solid #fca5a5}
.badge-montagem{background:#fef3c7;color:#78350f;border:1px solid #fcd34d}
.data-atraso{color:#b91c1c;font-weight:700}
.data-ok{color:#15803d;font-weight:600}
.eq-nome{font-weight:700;font-size:8.5pt}
.eq-sub{font-size:7pt;color:var(--muted)}
.eq-serie{font-family:'Courier New',monospace;font-size:7pt;color:var(--muted);word-break:break-all;overflow-wrap:anywhere;max-width:100%}
.cat-header{background:var(--azul-claro);padding:5px 8px;font-size:9pt;font-weight:700;color:var(--azul);margin:8px 0 4px;border-radius:3px;border-left:3px solid var(--azul)}
.cat-header .atraso-count{color:#b91c1c}
.resumo-anual{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.resumo-box{background:var(--cinza);border:1px solid var(--borda);border-radius:4px;padding:8px 10px}
.resumo-box h4{font-size:9pt;color:var(--azul);margin-bottom:4px;text-transform:uppercase;font-weight:700}
.resumo-stat{display:flex;justify-content:space-between;font-size:9pt;padding:3px 0;border-bottom:1px dotted var(--borda-leve);color:var(--texto)}
.resumo-stat:last-child{border-bottom:none}
.resumo-stat .stat-accent{color:var(--azul);font-weight:700}
.resumo-stat .stat-atraso{color:#b91c1c;font-weight:700}
.sub-muted{font-size:8pt;color:var(--muted)}
.cell-desc{font-size:8pt}
.cell-rel{font-size:8pt}
`

  let html = `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório Executivo de Frota — ${esc(cliente.nome)}</title>
<style>${cssBase(PALETA.azulNavel, 'rgba(26,72,128,0.12)')}${cssFrota}</style>
</head><body>
${htmlHeader(logoSrc)}
${htmlTituloBar('Relatório Executivo de Frota', 'Período', periodoLabel)}
<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente</span><span class="c-value">${esc(cliente.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF</span><span class="c-value">${esc(cliente.nif ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade</span><span class="c-value">${esc(cliente.localidade ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Morada</span><span class="c-value">${esc(cliente.morada ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone</span><span class="c-value">${esc(cliente.telefone ?? '—')}</span></div>
  <div class="cliente-field"><span class="c-label">Email</span><span class="c-value">${esc(cliente.email ?? '—')}</span></div>
</div>
<div class="kpis">
  <div class="kpi-card"><div class="kpi-numero">${totalEquip}</div><div class="kpi-label">Equipamentos</div></div>
  <div class="kpi-card ${taxaCumprimento >= 80 ? 'kpi-verde' : taxaCumprimento >= 50 ? 'kpi-laranja' : 'kpi-vermelho'}"><div class="kpi-numero">${taxaCumprimento}%</div><div class="kpi-label">Conformidade</div></div>
  <div class="kpi-card ${totalAtraso > 0 ? 'kpi-vermelho' : 'kpi-verde'}"><div class="kpi-numero">${totalAtraso}</div><div class="kpi-label">Em atraso</div></div>
  <div class="kpi-card kpi-azul"><div class="kpi-numero">${totalManutsAno}</div><div class="kpi-label">Manutenções período</div></div>
  <div class="kpi-card ${totalRepsAbertas > 0 ? 'kpi-laranja' : ''}"><div class="kpi-numero">${totalRepsAno}</div><div class="kpi-label">Reparações período</div></div>
</div>`

  for (const [, grupo] of categoriasMap) {
    const grupoAtraso = grupo.linhas.filter(l => l.estado === 'atraso').length
    html += `<div class="cat-header">${esc(grupo.nome)} (${grupo.linhas.length} equip.${grupoAtraso > 0 ? ` · <span class="atraso-count">${grupoAtraso} em atraso</span>` : ''})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:26%">Equipamento / N.º Série</th>
  <th class="cell-center" style="width:9%">Última</th>
  <th class="cell-center" style="width:9%">Próxima</th>
  <th class="cell-center" style="width:6%">Dias</th>
  <th class="cell-center" style="width:5%">Man.</th>
  <th class="cell-center" style="width:5%">Rep.</th>
  <th class="cell-center" style="width:11%">Estado</th>
  <th class="cell-center" style="width:11%">Tendência</th>
  <th class="cell-center" style="width:18%">Últ. rel.</th>
</tr></thead><tbody>`
    grupo.linhas.sort((a, b) => (b.diasAtraso ?? -9999) - (a.diasAtraso ?? -9999)).forEach(({ m, sub, ultima, proxima, diasAtraso, totalManuts, totalReps, relUltima, estadoBadge, estadoLabel, tendencia, proxDataKey }, idx) => {
      const diasStr = diasAtraso != null ? (diasAtraso > 0 ? `<span class="data-atraso">+${diasAtraso}</span>` : diasAtraso === 0 ? 'Hoje' : `<span class="data-ok">${diasAtraso}</span>`) : '—'
      const parClass = idx % 2 === 0 ? 'par' : ''
      const proximaRaw = proxima?.data ?? m.proximaManut
      const subSerie = [sub ? `<span class="eq-sub">${esc(sub.nome)}</span>` : '', m.numeroSerie ? `<span class="eq-serie">S/N: ${esc(m.numeroSerie)}</span>` : ''].filter(Boolean).join(' ')
      html += `<tr class="eq-row ${parClass}">
        <td class="cell-eq eq-cell-stack"><span class="eq-nome">${esc(m.marca)} ${esc(m.modelo)}</span>${subSerie ? `<br/>${subSerie}` : ''}</td>
        <td class="cell-center">${ultima ? fmtD(ultima.data) : '—'}</td>
        <td class="cell-center">${proximaRaw ? `<span class="${proxDataKey && proxDataKey < hoje ? 'data-atraso' : 'data-ok'}">${fmtD(proximaRaw)}</span>` : '—'}</td>
        <td class="cell-center cell-dias">${diasStr}</td>
        <td class="cell-center cell-muted">${totalManuts || '—'}</td>
        <td class="cell-center cell-muted">${totalReps || '—'}</td>
        <td class="cell-center"><span class="badge ${estadoBadge}">${esc(estadoLabel)}</span></td>
        <td class="cell-center" style="font-size:7.5pt;font-weight:700;color:${tendencia.cor}">${tendencia.texto}</td>
        <td class="cell-center cell-rel">${relUltima?.numeroRelatorio ?? '—'}</td>
      </tr>`
    })
    html += `</tbody></table>`
  }

  if (totalAtraso > 0) {
    html += `<div class="secao-titulo vermelho">Manutenções em atraso (${totalAtraso})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento</th><th class="cell-serie" style="width:16%">Nº Série</th>
  <th style="width:14%">Data prevista</th><th class="cell-center" style="width:10%">Dias atraso</th>
  <th style="width:30%">Observações</th>
</tr></thead><tbody>`
    linhas.filter(l => l.estado === 'atraso').sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0)).forEach(({ m, sub, proxima, diasAtraso }) => {
      const dataPrev = proxima?.data ?? m.proximaManut
      html += `<tr>
        <td><strong>${esc(m.marca)} ${esc(m.modelo)}</strong>${sub ? ` <span class="sub-muted">· ${esc(sub.nome)}</span>` : ''}</td>
        <td class="cell-serie">${esc(m.numeroSerie)}</td>
        <td class="data-atraso">${fmtD(dataPrev)}</td>
        <td class="data-atraso cell-center cell-dias">+${diasAtraso ?? 0}d</td>
        <td class="sub-muted">${esc(proxima?.observacoes ?? '')}</td>
      </tr>`
    })
    html += `</tbody></table>`
  }

  if (repsRecentes.length > 0) {
    const repSecLabelHtml = periodoCustom ? `${esc(periodoLabel)} — ${repsRecentes.length}` : `últimos 12 meses — ${repsRecentes.length}`
    html += `<div class="secao-titulo laranja">Reparações concluídas (${repSecLabelHtml})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:28%">Equipamento</th><th class="cell-serie" style="width:14%">Nº Série</th>
  <th style="width:12%">Data</th><th style="width:46%">Descrição</th>
</tr></thead><tbody>`
    const maqMap = new Map(maquinas.map(mm => [normEntityId(mm.id), mm]))
    repsRecentes.forEach(r => {
      const maq = maqMap.get(normEntityId(r.maquinaId))
      html += `<tr>
        <td><strong>${maq ? esc(`${maq.marca} ${maq.modelo}`) : '—'}</strong></td>
        <td class="cell-serie">${maq ? esc(maq.numeroSerie) : '—'}</td>
        <td>${fmtD(r.data)}</td>
        <td class="cell-desc">${esc(r.descricao?.slice(0, 120) || r.descricaoAvaria?.slice(0, 120) || '—')}</td>
      </tr>`
    })
    html += `</tbody></table>`
  }

  html += `
<div style="margin-top:10px;padding:6px 10px;background:${PALETA.cinza};border:1px solid ${PALETA.bordaLeve};border-radius:4px;font-size:7.5pt;color:${PALETA.muted};display:flex;gap:14px;flex-wrap:wrap;align-items:center;page-break-inside:avoid">
  <strong style="color:${PALETA.azulNavel};text-transform:uppercase;letter-spacing:.04em;font-size:7pt">Legenda Tendência:</strong>
  <span style="color:${PALETA.verde}">★ Excelente — ≥${TENDENCIA_EXCELENTE_MIN} sem anomalias</span>
  <span style="color:${PALETA.verde}">● Conforme — sem anomalias</span>
  <span style="color:${PALETA.amarelo}">◐ Atenção — anomalias pontuais (≤${TENDENCIA_ATENCAO_MAX})</span>
  <span style="color:${PALETA.vermelho}">⚠ Crítico — múltiplas anomalias ou atraso</span>
  <span style="color:${PALETA.muted}">○ Novo — sem histórico</span>
</div>`

  html += `${htmlFooter('Documento gerado em ' + hojeFormatado)}</body></html>`
  return html
}
