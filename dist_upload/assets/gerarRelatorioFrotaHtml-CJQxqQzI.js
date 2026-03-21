import{e as ca}from"./sanitize-Bc5btBtG.js";import{f as ia,p as X}from"./index-BUMVVrTU.js";import{P as l,c as na,h as da,a as pa,b as ma}from"./relatorioBaseStyles-B9A9iJcy.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";import"./vendor-icons-BCyyJ6Nm.js";import"./vendor-datefns-CCZTWiZ_.js";const ua=5,U=3,W=2,I=i=>{if(!i)return"—";const d=String(i).slice(0,10).split("-");return d.length<3?String(i):`${d[2]}-${d[1]}-${d[0]}`};function wa(i,d,Y,G,J=[],K,Q,S={}){const o=ca,V=S.logoUrl??"/manut/logo-navel.png",k=new Date().toISOString().slice(0,10),Z=ia(k,!0),N=new Date().getFullYear(),w=!!S.periodoCustom,O=S.periodoLabel||String(N),B=new Set(d.map(a=>a.id)),y=Y.filter(a=>B.has(a.maquinaId)),z=J.filter(a=>B.has(a.maquinaId)),q=new Map;y.forEach(a=>{q.has(a.maquinaId)||q.set(a.maquinaId,[]),q.get(a.maquinaId).push(a)});const E=new Map;z.forEach(a=>{E.has(a.maquinaId)||E.set(a.maquinaId,[]),E.get(a.maquinaId).push(a)});const H=new Map(G.filter(a=>y.some(t=>t.id===a.manutencaoId)).map(a=>[a.manutencaoId,a])),v=d.map(a=>{const t=K(a.subcategoriaId),e=t?Q(t.categoriaId):null,r=q.get(a.id)||[],x=E.get(a.id)||[],u=r.filter(s=>s.status==="concluida").sort((s,p)=>p.data.localeCompare(s.data))[0],n=r.filter(s=>s.status==="agendada"||s.status==="pendente").sort((s,p)=>s.data.localeCompare(p.data))[0],f=n&&n.data<k,T=r.filter(s=>s.status==="concluida").length,j=x.filter(s=>s.status==="concluida").length,L=x.filter(s=>s.status!=="concluida").length,F=u?H.get(u.id):null;let $=null;n&&($=Math.floor((X(k)-X(n.data))/864e5));let g,b;a.proximaManut?f?(g="badge-atraso",b="Em atraso"):(g="badge-ok",b="Conforme"):(g="badge-montagem",b="Por instalar");const h=r.filter(s=>s.status==="concluida").sort((s,p)=>p.data.localeCompare(s.data));let m={nivel:"neutro",texto:"—",cor:l.muted};if(h.length>=2){const p=h.slice(0,ua).map(_=>H.get(_.id)).filter(Boolean).reduce((_,P)=>{const la=P.checklistSnapshot??[];return _+la.filter(ra=>P.checklistRespostas?.[ra.id]==="nao").length},0);f?m={nivel:"critico",texto:"⚠ Atraso",cor:l.vermelho}:p===0&&h.length>=U?m={nivel:"excelente",texto:"★ Excelente",cor:l.verde}:p===0?m={nivel:"bom",texto:"● Conforme",cor:l.verde}:p<=W?m={nivel:"atencao",texto:"◐ Atenção",cor:l.amarelo}:m={nivel:"critico",texto:"⚠ Crítico",cor:l.vermelho}}else h.length===0&&!a.proximaManut?m={nivel:"novo",texto:"○ Novo",cor:l.muted}:f&&(m={nivel:"critico",texto:"⚠ Atraso",cor:l.vermelho});return{m:a,sub:t,cat:e,ultima:u,proxima:n,emAtraso:f,diasAtraso:$,totalManuts:T,totalReps:j,repsAbertas:L,relUltima:F,estadoBadge:g,estadoLabel:b,tendencia:m}}),D=d.length,A=v.filter(a=>a.emAtraso).length,aa=v.filter(a=>!a.emAtraso&&a.m.proximaManut).length,R=D>0?Math.round(aa/D*100):0,ta=w?y.filter(a=>a.status==="concluida").length:y.filter(a=>a.status==="concluida"&&a.data?.startsWith(String(N))).length,ea=w?z.filter(a=>a.status==="concluida").length:z.filter(a=>a.status==="concluida"&&a.data?.startsWith(String(N))).length,oa=v.reduce((a,t)=>a+t.repsAbertas,0),C=new Map;v.forEach(a=>{const t=a.cat?.id||"_sem_categoria",e=a.cat?.nome||"Sem categoria";C.has(t)||C.set(t,{nome:e,linhas:[]}),C.get(t).linhas.push(a)});const sa=new Date(Date.now()-365*864e5).toISOString().slice(0,10),M=z.filter(a=>a.status==="concluida"&&(w||a.data>=sa)).sort((a,t)=>t.data.localeCompare(a.data)).slice(0,20);let c=`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório Executivo de Frota — ${o(i.nome)}</title>
<style>${na(l.azulNavel,"rgba(26,72,128,0.12)")}
@page { size: A4 portrait; margin: 14mm 12mm 12mm }
:root { --verde-light: #dcfce7; --vermelho-light: #fee2e2; --laranja-light: #fef3c7 }
.secao-titulo{background:var(--azul);color:var(--branco);padding:5px 10px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px;border-radius:3px}
.secao-titulo.vermelho{background:#b91c1c}
.secao-titulo.laranja{background:#a16207}
.cliente-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;padding:8px 10px;background:var(--cinza);border-radius:4px;border:1px solid var(--borda);border-top:3px solid var(--azul);margin-bottom:10px}
.cliente-field{display:flex;flex-direction:column;gap:1px}
.cliente-field .c-label{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.cliente-field .c-value{font-size:9pt;font-weight:700;color:var(--texto)}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}
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
.tabela-frota .eq-row td{border-top:1px solid var(--borda-leve);padding-top:4px;padding-bottom:1px}
.tabela-frota .sub-row td{padding-top:0;padding-bottom:4px;border-bottom:1px solid var(--borda)}
.tabela-frota .eq-row.par td,.tabela-frota .sub-row.par td{background:var(--cinza)}
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
.eq-serie{font-family:'Courier New',monospace;font-size:7pt;color:var(--muted)}
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
</style>
</head><body>
${da(V)}
${pa("Relatório Executivo de Frota","Período",O)}
<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente</span><span class="c-value">${o(i.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF</span><span class="c-value">${o(i.nif??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade</span><span class="c-value">${o(i.localidade??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Morada</span><span class="c-value">${o(i.morada??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone</span><span class="c-value">${o(i.telefone??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Email</span><span class="c-value">${o(i.email??"—")}</span></div>
</div>
<div class="kpis">
  <div class="kpi-card"><div class="kpi-numero">${D}</div><div class="kpi-label">Equipamentos</div></div>
  <div class="kpi-card ${R>=80?"kpi-verde":R>=50?"kpi-laranja":"kpi-vermelho"}"><div class="kpi-numero">${R}%</div><div class="kpi-label">Conformidade</div></div>
  <div class="kpi-card ${A>0?"kpi-vermelho":"kpi-verde"}"><div class="kpi-numero">${A}</div><div class="kpi-label">Em atraso</div></div>
  <div class="kpi-card kpi-azul"><div class="kpi-numero">${ta}</div><div class="kpi-label">Manutenções período</div></div>
  <div class="kpi-card ${oa>0?"kpi-laranja":""}"><div class="kpi-numero">${ea}</div><div class="kpi-label">Reparações período</div></div>
</div>`;for(const[,a]of C){const t=a.linhas.filter(e=>e.emAtraso).length;c+=`<div class="cat-header">${o(a.nome)} (${a.linhas.length} equip.${t>0?` · <span class="atraso-count">${t} em atraso</span>`:""})</div>
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
</tr></thead><tbody>`,a.linhas.sort((e,r)=>(r.diasAtraso??-9999)-(e.diasAtraso??-9999)).forEach(({m:e,sub:r,ultima:x,proxima:u,diasAtraso:n,totalManuts:f,totalReps:T,relUltima:j,estadoBadge:L,estadoLabel:F,tendencia:$},g)=>{const b=n!=null?n>0?`<span class="data-atraso">+${n}</span>`:n===0?"Hoje":`<span class="data-ok">${n}</span>`:"—",h=g%2===0?"par":"";c+=`<tr class="eq-row ${h}">
        <td class="cell-eq"><span class="eq-nome">${o(e.marca)} ${o(e.modelo)}</span></td>
        <td class="cell-center">${x?I(x.data):"—"}</td>
        <td class="cell-center">${u?`<span class="${u.data<k?"data-atraso":"data-ok"}">${I(u.data)}</span>`:"—"}</td>
        <td class="cell-center cell-dias">${b}</td>
        <td class="cell-center cell-muted">${f||"—"}</td>
        <td class="cell-center cell-muted">${T||"—"}</td>
        <td class="cell-center"><span class="badge ${L}">${o(F)}</span></td>
        <td class="cell-center" style="font-size:7.5pt;font-weight:700;color:${$.cor}">${$.texto}</td>
        <td class="cell-center cell-rel">${j?.numeroRelatorio??"—"}</td>
      </tr><tr class="sub-row ${h}">
        <td colspan="1" class="cell-eq">${r?`<span class="eq-sub">${o(r.nome)}</span>`:""} ${e.numeroSerie?`<span class="eq-serie">S/N: ${o(e.numeroSerie)}</span>`:""}</td>
        <td colspan="8"></td>
      </tr>`}),c+="</tbody></table>"}if(A>0&&(c+=`<div class="secao-titulo vermelho">Manutenções em atraso (${A})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento</th><th class="cell-serie" style="width:16%">Nº Série</th>
  <th style="width:14%">Data prevista</th><th class="cell-center" style="width:10%">Dias atraso</th>
  <th style="width:30%">Observações</th>
</tr></thead><tbody>`,v.filter(a=>a.emAtraso).sort((a,t)=>(t.diasAtraso??0)-(a.diasAtraso??0)).forEach(({m:a,sub:t,proxima:e,diasAtraso:r})=>{c+=`<tr>
        <td><strong>${o(a.marca)} ${o(a.modelo)}</strong>${t?` <span class="sub-muted">· ${o(t.nome)}</span>`:""}</td>
        <td class="cell-serie">${o(a.numeroSerie)}</td>
        <td class="data-atraso">${I(e.data)}</td>
        <td class="data-atraso cell-center cell-dias">+${r??0}d</td>
        <td class="sub-muted">${o(e.observacoes??"")}</td>
      </tr>`}),c+="</tbody></table>"),M.length>0){const a=w?`${o(O)} — ${M.length}`:`últimos 12 meses — ${M.length}`;c+=`<div class="secao-titulo laranja">Reparações concluídas (${a})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:28%">Equipamento</th><th class="cell-serie" style="width:14%">Nº Série</th>
  <th style="width:12%">Data</th><th style="width:46%">Descrição</th>
</tr></thead><tbody>`;const t=new Map(d.map(e=>[e.id,e]));M.forEach(e=>{const r=t.get(e.maquinaId);c+=`<tr>
        <td><strong>${r?o(`${r.marca} ${r.modelo}`):"—"}</strong></td>
        <td class="cell-serie">${r?o(r.numeroSerie):"—"}</td>
        <td>${I(e.data)}</td>
        <td class="cell-desc">${o(e.descricao?.slice(0,120)||e.descricaoAvaria?.slice(0,120)||"—")}</td>
      </tr>`}),c+="</tbody></table>"}return c+=`
<div style="margin-top:10px;padding:6px 10px;background:${l.cinza};border:1px solid ${l.bordaLeve};border-radius:4px;font-size:7.5pt;color:${l.muted};display:flex;gap:14px;flex-wrap:wrap;align-items:center;page-break-inside:avoid">
  <strong style="color:${l.azulNavel};text-transform:uppercase;letter-spacing:.04em;font-size:7pt">Legenda Tendência:</strong>
  <span style="color:${l.verde}">★ Excelente — ≥${U} sem anomalias</span>
  <span style="color:${l.verde}">● Conforme — sem anomalias</span>
  <span style="color:${l.amarelo}">◐ Atenção — anomalias pontuais (≤${W})</span>
  <span style="color:${l.vermelho}">⚠ Crítico — múltiplas anomalias ou atraso</span>
  <span style="color:${l.muted}">○ Novo — sem histórico</span>
</div>`,c+=`${ma("Documento gerado em "+Z)}</body></html>`,c}export{wa as gerarRelatorioFrotaHtml};
