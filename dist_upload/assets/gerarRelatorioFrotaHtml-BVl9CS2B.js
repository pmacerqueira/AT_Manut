import{e as Q}from"./emailConfig-D1SCop7p.js";import{f as m,p as F}from"./datasAzores-vTPFpdRw.js";import{c as V,h as X,a as Z,b as aa,P as ta}from"./relatorioBaseStyles-BpzmBaWj.js";import"./index-D3qI2Gkl.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";import"./vendor-icons-V_-YTU67.js";function na(d,h,N,B,P=[],H,L,O={}){const e=Q,T=O.logoUrl??"/manut/logo-navel.png",f=new Date().toISOString().slice(0,10),U=m(f,!0),n=new Date().getFullYear(),R=new Set(h.map(a=>a.id)),z=N.filter(a=>R.has(a.maquinaId)),M=P.filter(a=>R.has(a.maquinaId)),g=new Map;z.forEach(a=>{g.has(a.maquinaId)||g.set(a.maquinaId,[]),g.get(a.maquinaId).push(a)});const b=new Map;M.forEach(a=>{b.has(a.maquinaId)||b.set(a.maquinaId,[]),b.get(a.maquinaId).push(a)});const W=new Map(B.filter(a=>z.some(t=>t.id===a.manutencaoId)).map(a=>[a.manutencaoId,a])),p=h.map(a=>{const t=H(a.subcategoriaId),s=t?L(t.categoriaId):null,c=g.get(a.id)||[],u=b.get(a.id)||[],i=c.filter(l=>l.status==="concluida").sort((l,j)=>j.data.localeCompare(l.data))[0],r=c.filter(l=>l.status==="agendada"||l.status==="pendente").sort((l,j)=>l.data.localeCompare(j.data))[0],k=r&&r.data<f,I=c.filter(l=>l.status==="concluida").length,S=u.filter(l=>l.status==="concluida").length,D=u.filter(l=>l.status!=="concluida").length,C=i?W.get(i.id):null;let $=null;r&&($=Math.floor((F(f)-F(r.data))/864e5));let w,y;return a.proximaManut?k?(w="badge-atraso",y="Em atraso"):(w="badge-ok",y="Conforme"):(w="badge-montagem",y="Por instalar"),{m:a,sub:t,cat:s,ultima:i,proxima:r,emAtraso:k,diasAtraso:$,totalManuts:I,totalReps:S,repsAbertas:D,relUltima:C,estadoBadge:w,estadoLabel:y}}),q=h.length,v=p.filter(a=>a.emAtraso).length,Y=p.filter(a=>!a.emAtraso&&a.m.proximaManut).length,A=q>0?Math.round(Y/q*100):0,_=z.filter(a=>a.status==="concluida"&&a.data?.startsWith(String(n))).length,G=M.filter(a=>a.status==="concluida"&&a.data?.startsWith(String(n))).length,J=p.reduce((a,t)=>a+t.repsAbertas,0),x=new Map;p.forEach(a=>{const t=a.cat?.id||"_sem_categoria",s=a.cat?.nome||"Sem categoria";x.has(t)||x.set(t,{nome:s,linhas:[]}),x.get(t).linhas.push(a)});const K=new Date(Date.now()-365*864e5).toISOString().slice(0,10),E=M.filter(a=>a.status==="concluida"&&a.data>=K).sort((a,t)=>t.data.localeCompare(a.data)).slice(0,20);let o=`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório Executivo de Frota — ${e(d.nome)}</title>
<style>${V(ta.azulNavel,"rgba(26,72,128,0.12)")}
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
.tabela-frota{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:6px}
.tabela-frota th{background:var(--azul);color:var(--branco);padding:4px 5px;text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.tabela-frota td{padding:4px 5px;border-bottom:1px solid var(--borda-leve);vertical-align:middle;color:var(--texto)}
.tabela-frota tr:nth-child(even) td{background:var(--cinza)}
.tabela-frota .cell-eq{width:26%}
.tabela-frota th.cell-serie{width:14%}
.tabela-frota td.cell-serie{font-family:'Courier New',monospace;font-size:8pt;color:var(--muted)}
.tabela-frota .cell-center{text-align:center}
.tabela-frota .cell-muted{color:var(--muted)}
.tabela-frota .cell-dias{font-weight:700}
.badge{display:inline-block;padding:1.5px 6px;border-radius:10px;font-size:8pt;font-weight:700;white-space:nowrap}
.badge-ok{background:#dcfce7;color:#14532d;border:1px solid #86efac}
.badge-atraso{background:#fee2e2;color:#7f1d1d;border:1px solid #fca5a5}
.badge-montagem{background:#fef3c7;color:#78350f;border:1px solid #fcd34d}
.data-atraso{color:#b91c1c;font-weight:700}
.data-ok{color:#15803d;font-weight:600}
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
${X(T)}
${Z("Relatório Executivo de Frota","Ano",String(n))}
<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente</span><span class="c-value">${e(d.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF</span><span class="c-value">${e(d.nif??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade</span><span class="c-value">${e(d.localidade??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Morada</span><span class="c-value">${e(d.morada??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone</span><span class="c-value">${e(d.telefone??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Email</span><span class="c-value">${e(d.email??"—")}</span></div>
</div>
<div class="kpis">
  <div class="kpi-card"><div class="kpi-numero">${q}</div><div class="kpi-label">Equipamentos</div></div>
  <div class="kpi-card ${A>=80?"kpi-verde":A>=50?"kpi-laranja":"kpi-vermelho"}"><div class="kpi-numero">${A}%</div><div class="kpi-label">Conformidade</div></div>
  <div class="kpi-card ${v>0?"kpi-vermelho":"kpi-verde"}"><div class="kpi-numero">${v}</div><div class="kpi-label">Em atraso</div></div>
  <div class="kpi-card kpi-azul"><div class="kpi-numero">${_}</div><div class="kpi-label">Manutenções ${n}</div></div>
  <div class="kpi-card ${J>0?"kpi-laranja":""}"><div class="kpi-numero">${G}</div><div class="kpi-label">Reparações ${n}</div></div>
</div>`;for(const[,a]of x){const t=a.linhas.filter(s=>s.emAtraso).length;o+=`<div class="cat-header">${e(a.nome)} (${a.linhas.length} equip.${t>0?` · <span class="atraso-count">${t} em atraso</span>`:""})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq">Equipamento</th><th class="cell-serie">Nº Série</th>
  <th class="cell-center" style="width:11%">Última</th><th class="cell-center" style="width:11%">Próxima</th>
  <th class="cell-center" style="width:6%">Dias</th><th class="cell-center" style="width:6%">Manut.</th>
  <th class="cell-center" style="width:6%">Rep.</th><th class="cell-center" style="width:10%">Estado</th>
  <th class="cell-center" style="width:10%">Últ. rel.</th>
</tr></thead><tbody>`,a.linhas.sort((s,c)=>(c.diasAtraso??-9999)-(s.diasAtraso??-9999)).forEach(({m:s,sub:c,ultima:u,proxima:i,diasAtraso:r,totalManuts:k,totalReps:I,relUltima:S,estadoBadge:D,estadoLabel:C})=>{const $=r!=null?r>0?`<span class="data-atraso">+${r}</span>`:r===0?"Hoje":`<span class="data-ok">${r}</span>`:"—";o+=`<tr>
        <td><strong>${e(s.marca)} ${e(s.modelo)}</strong>${c?`<br><span class="sub-muted">${e(c.nome)}</span>`:""}</td>
        <td class="cell-serie">${e(s.numeroSerie)}</td>
        <td class="cell-center">${u?m(u.data,!0):"—"}</td>
        <td class="cell-center">${i?`<span class="${i.data<f?"data-atraso":"data-ok"}">${m(i.data,!0)}</span>`:"—"}</td>
        <td class="cell-center">${$}</td>
        <td class="cell-center cell-muted">${k||"—"}</td>
        <td class="cell-center cell-muted">${I||"—"}</td>
        <td class="cell-center"><span class="badge ${D}">${e(C)}</span></td>
        <td class="cell-center cell-rel">${S?.numeroRelatorio??"—"}</td>
      </tr>`}),o+="</tbody></table>"}if(v>0&&(o+=`<div class="secao-titulo vermelho">Manutenções em atraso (${v})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento</th><th class="cell-serie" style="width:16%">Nº Série</th>
  <th style="width:14%">Data prevista</th><th class="cell-center" style="width:10%">Dias atraso</th>
  <th style="width:30%">Observações</th>
</tr></thead><tbody>`,p.filter(a=>a.emAtraso).sort((a,t)=>(t.diasAtraso??0)-(a.diasAtraso??0)).forEach(({m:a,sub:t,proxima:s,diasAtraso:c})=>{o+=`<tr>
        <td><strong>${e(a.marca)} ${e(a.modelo)}</strong>${t?` <span class="sub-muted">· ${e(t.nome)}</span>`:""}</td>
        <td class="cell-serie">${e(a.numeroSerie)}</td>
        <td class="data-atraso">${m(s.data,!0)}</td>
        <td class="data-atraso cell-center cell-dias">+${c??0}d</td>
        <td class="sub-muted">${e(s.observacoes??"")}</td>
      </tr>`}),o+="</tbody></table>"),E.length>0){o+=`<div class="secao-titulo laranja">Reparações concluídas (últimos 12 meses — ${E.length})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:28%">Equipamento</th><th class="cell-serie" style="width:14%">Nº Série</th>
  <th style="width:12%">Data</th><th style="width:46%">Descrição</th>
</tr></thead><tbody>`;const a=new Map(h.map(t=>[t.id,t]));E.forEach(t=>{const s=a.get(t.maquinaId);o+=`<tr>
        <td><strong>${s?e(`${s.marca} ${s.modelo}`):"—"}</strong></td>
        <td class="cell-serie">${s?e(s.numeroSerie):"—"}</td>
        <td>${m(t.data,!0)}</td>
        <td class="cell-desc">${e(t.descricao?.slice(0,120)||t.descricaoAvaria?.slice(0,120)||"—")}</td>
      </tr>`}),o+="</tbody></table>"}return o+=`${aa("Documento gerado em "+U)}</body></html>`,o}export{na as gerarRelatorioFrotaHtml};
