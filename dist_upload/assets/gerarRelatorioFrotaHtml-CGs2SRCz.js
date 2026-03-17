import{e as X}from"./emailConfig-mMFhqgpy.js";import{a as Z,p as P}from"./datasAzores-D98tNLGd.js";import{c as aa,h as ta,a as ea,e as sa,P as oa}from"./relatorioBaseStyles--Y-lSqCr.js";import"./index-B1mWfsSV.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";import"./vendor-icons-CvUwI5QC.js";const M=r=>{if(!r)return"—";const i=String(r).slice(0,10).split("-");return i.length<3?String(r):`${i[2]}-${i[1]}-${i[0]}`};function ma(r,i,B,H,O=[],T,U,A={}){const s=X,W=A.logoUrl??"/manut/logo-navel.png",f=new Date().toISOString().slice(0,10),Y=Z(f,!0),S=new Date().getFullYear(),g=!!A.periodoCustom,N=A.periodoLabel||String(S),L=new Set(i.map(a=>a.id)),b=B.filter(a=>L.has(a.maquinaId)),v=O.filter(a=>L.has(a.maquinaId)),x=new Map;b.forEach(a=>{x.has(a.maquinaId)||x.set(a.maquinaId,[]),x.get(a.maquinaId).push(a)});const $=new Map;v.forEach(a=>{$.has(a.maquinaId)||$.set(a.maquinaId,[]),$.get(a.maquinaId).push(a)});const _=new Map(H.filter(a=>b.some(t=>t.id===a.manutencaoId)).map(a=>[a.manutencaoId,a])),m=i.map(a=>{const t=T(a.subcategoriaId),e=t?U(t.categoriaId):null,o=x.get(a.id)||[],h=$.get(a.id)||[],n=o.filter(l=>l.status==="concluida").sort((l,F)=>F.data.localeCompare(l.data))[0],d=o.filter(l=>l.status==="agendada"||l.status==="pendente").sort((l,F)=>l.data.localeCompare(F.data))[0],y=d&&d.data<f,C=o.filter(l=>l.status==="concluida").length,D=h.filter(l=>l.status==="concluida").length,j=h.filter(l=>l.status!=="concluida").length,R=n?_.get(n.id):null;let q=null;d&&(q=Math.floor((P(f)-P(d.data))/864e5));let u,p;return a.proximaManut?y?(u="badge-atraso",p="Em atraso"):(u="badge-ok",p="Conforme"):(u="badge-montagem",p="Por instalar"),{m:a,sub:t,cat:e,ultima:n,proxima:d,emAtraso:y,diasAtraso:q,totalManuts:C,totalReps:D,repsAbertas:j,relUltima:R,estadoBadge:u,estadoLabel:p}}),E=i.length,k=m.filter(a=>a.emAtraso).length,G=m.filter(a=>!a.emAtraso&&a.m.proximaManut).length,I=E>0?Math.round(G/E*100):0,J=g?b.filter(a=>a.status==="concluida").length:b.filter(a=>a.status==="concluida"&&a.data?.startsWith(String(S))).length,K=g?v.filter(a=>a.status==="concluida").length:v.filter(a=>a.status==="concluida"&&a.data?.startsWith(String(S))).length,Q=m.reduce((a,t)=>a+t.repsAbertas,0),w=new Map;m.forEach(a=>{const t=a.cat?.id||"_sem_categoria",e=a.cat?.nome||"Sem categoria";w.has(t)||w.set(t,{nome:e,linhas:[]}),w.get(t).linhas.push(a)});const V=new Date(Date.now()-365*864e5).toISOString().slice(0,10),z=v.filter(a=>a.status==="concluida"&&(g||a.data>=V)).sort((a,t)=>t.data.localeCompare(a.data)).slice(0,20);let c=`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório Executivo de Frota — ${s(r.nome)}</title>
<style>${aa(oa.azulNavel,"rgba(26,72,128,0.12)")}
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
${ta(W)}
${ea("Relatório Executivo de Frota","Período",N)}
<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente</span><span class="c-value">${s(r.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF</span><span class="c-value">${s(r.nif??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade</span><span class="c-value">${s(r.localidade??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Morada</span><span class="c-value">${s(r.morada??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone</span><span class="c-value">${s(r.telefone??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Email</span><span class="c-value">${s(r.email??"—")}</span></div>
</div>
<div class="kpis">
  <div class="kpi-card"><div class="kpi-numero">${E}</div><div class="kpi-label">Equipamentos</div></div>
  <div class="kpi-card ${I>=80?"kpi-verde":I>=50?"kpi-laranja":"kpi-vermelho"}"><div class="kpi-numero">${I}%</div><div class="kpi-label">Conformidade</div></div>
  <div class="kpi-card ${k>0?"kpi-vermelho":"kpi-verde"}"><div class="kpi-numero">${k}</div><div class="kpi-label">Em atraso</div></div>
  <div class="kpi-card kpi-azul"><div class="kpi-numero">${J}</div><div class="kpi-label">Manutenções período</div></div>
  <div class="kpi-card ${Q>0?"kpi-laranja":""}"><div class="kpi-numero">${K}</div><div class="kpi-label">Reparações período</div></div>
</div>`;for(const[,a]of w){const t=a.linhas.filter(e=>e.emAtraso).length;c+=`<div class="cat-header">${s(a.nome)} (${a.linhas.length} equip.${t>0?` · <span class="atraso-count">${t} em atraso</span>`:""})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento / N.º Série</th>
  <th class="cell-center" style="width:10%">Última</th>
  <th class="cell-center" style="width:10%">Próxima</th>
  <th class="cell-center" style="width:7%">Dias</th>
  <th class="cell-center" style="width:6%">Man.</th>
  <th class="cell-center" style="width:6%">Rep.</th>
  <th class="cell-center" style="width:13%">Estado</th>
  <th class="cell-center" style="width:18%">Últ. rel.</th>
</tr></thead><tbody>`,a.linhas.sort((e,o)=>(o.diasAtraso??-9999)-(e.diasAtraso??-9999)).forEach(({m:e,sub:o,ultima:h,proxima:n,diasAtraso:d,totalManuts:y,totalReps:C,relUltima:D,estadoBadge:j,estadoLabel:R},q)=>{const u=d!=null?d>0?`<span class="data-atraso">+${d}</span>`:d===0?"Hoje":`<span class="data-ok">${d}</span>`:"—",p=q%2===0?"par":"";c+=`<tr class="eq-row ${p}">
        <td class="cell-eq"><span class="eq-nome">${s(e.marca)} ${s(e.modelo)}</span></td>
        <td class="cell-center">${h?M(h.data):"—"}</td>
        <td class="cell-center">${n?`<span class="${n.data<f?"data-atraso":"data-ok"}">${M(n.data)}</span>`:"—"}</td>
        <td class="cell-center cell-dias">${u}</td>
        <td class="cell-center cell-muted">${y||"—"}</td>
        <td class="cell-center cell-muted">${C||"—"}</td>
        <td class="cell-center"><span class="badge ${j}">${s(R)}</span></td>
        <td class="cell-center cell-rel">${D?.numeroRelatorio??"—"}</td>
      </tr><tr class="sub-row ${p}">
        <td colspan="1" class="cell-eq">${o?`<span class="eq-sub">${s(o.nome)}</span>`:""} ${e.numeroSerie?`<span class="eq-serie">S/N: ${s(e.numeroSerie)}</span>`:""}</td>
        <td colspan="7"></td>
      </tr>`}),c+="</tbody></table>"}if(k>0&&(c+=`<div class="secao-titulo vermelho">Manutenções em atraso (${k})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento</th><th class="cell-serie" style="width:16%">Nº Série</th>
  <th style="width:14%">Data prevista</th><th class="cell-center" style="width:10%">Dias atraso</th>
  <th style="width:30%">Observações</th>
</tr></thead><tbody>`,m.filter(a=>a.emAtraso).sort((a,t)=>(t.diasAtraso??0)-(a.diasAtraso??0)).forEach(({m:a,sub:t,proxima:e,diasAtraso:o})=>{c+=`<tr>
        <td><strong>${s(a.marca)} ${s(a.modelo)}</strong>${t?` <span class="sub-muted">· ${s(t.nome)}</span>`:""}</td>
        <td class="cell-serie">${s(a.numeroSerie)}</td>
        <td class="data-atraso">${M(e.data)}</td>
        <td class="data-atraso cell-center cell-dias">+${o??0}d</td>
        <td class="sub-muted">${s(e.observacoes??"")}</td>
      </tr>`}),c+="</tbody></table>"),z.length>0){const a=g?`${s(N)} — ${z.length}`:`últimos 12 meses — ${z.length}`;c+=`<div class="secao-titulo laranja">Reparações concluídas (${a})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:28%">Equipamento</th><th class="cell-serie" style="width:14%">Nº Série</th>
  <th style="width:12%">Data</th><th style="width:46%">Descrição</th>
</tr></thead><tbody>`;const t=new Map(i.map(e=>[e.id,e]));z.forEach(e=>{const o=t.get(e.maquinaId);c+=`<tr>
        <td><strong>${o?s(`${o.marca} ${o.modelo}`):"—"}</strong></td>
        <td class="cell-serie">${o?s(o.numeroSerie):"—"}</td>
        <td>${M(e.data)}</td>
        <td class="cell-desc">${s(e.descricao?.slice(0,120)||e.descricaoAvaria?.slice(0,120)||"—")}</td>
      </tr>`}),c+="</tbody></table>"}return c+=`${sa("Documento gerado em "+Y)}</body></html>`,c}export{ma as gerarRelatorioFrotaHtml};
