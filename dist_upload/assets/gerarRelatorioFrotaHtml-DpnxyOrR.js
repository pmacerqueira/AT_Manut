import{e as xt}from"./horasContadorEquipamento-B78EdVss.js";import{f as $t,p as ot}from"./index-D42kKAXQ.js";import{P as s,h as kt,a as wt,b as yt,c as zt}from"./relatorioBaseStyles-CckSg55g.js";import{n as d,r as Et,d as K}from"./Clientes-CvAr0sqT.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";import"./vendor-icons-CsMwI86-.js";import"./vendor-datefns-CCZTWiZ_.js";import"./empresa-pV7uX3IF.js";import"./gerarHtmlHistoricoMaquina-DDZCnsAH.js";import"./kaeserCiclo-BSrwchLP.js";import"./pt-DInhV8Fk.js";import"./apiService-CcGZxH30.js";import"./RelatorioView-DUts0E4G.js";import"./emailService-DplNwpr3.js";import"./alertasConfig-5f3QpuRD.js";import"./MaquinaDocumentacaoLinks-C2jr5uDG.js";import"./useDeferredReady-TKwJyN-8.js";const qt=5,st=3,lt=2,L=n=>{if(!n)return"—";const l=String(n).slice(0,10).split("-");return l.length<3?String(n):`${l[2]}-${l[1]}-${l[0]}`};function Ct(n){const l=String(n??"/manut/logo-navel.png").trim();if(/^https?:\/\//i.test(l))return l;const y=l.startsWith("/")?l:`/${l}`;return typeof window<"u"&&window.location?.origin?`${window.location.origin}${y}`:`https://www.navel.pt${y}`}function Yt(n,l,y,rt,it=[],nt,ct,x={}){const o=xt,dt=Ct(x.logoUrl),z=new Date().toISOString().slice(0,10),pt=$t(z,!0),P=new Date().getFullYear(),E=!!x.periodoCustom,G=!!x.emailFragment,J=x.periodoLabel||String(P),Q=x.periodoInicio??null,V=x.periodoFim??null,B=t=>!(!t||Q&&t<Q||V&&t>V),Z=new Set(l.map(t=>d(t.id))),q=y.filter(t=>Z.has(d(t.maquinaId))),C=it.filter(t=>Z.has(d(t.maquinaId))),A=new Map;q.forEach(t=>{const e=d(t.maquinaId);A.has(e)||A.set(e,[]),A.get(e).push(t)});const M=new Map;C.forEach(t=>{const e=d(t.maquinaId);M.has(e)||M.set(e,[]),M.get(e).push(t)});const O=new Map;for(const t of rt){const e=d(t.manutencaoId);!e||!q.some(a=>d(a.id)===e)||O.set(e,t)}const k=l.map(t=>{const e=nt(t.subcategoriaId),a=e?ct(e.categoriaId):null,r=d(t.id),m=A.get(r)||[],D=M.get(r)||[],p=m.filter(i=>i.status==="concluida").sort((i,b)=>b.data.localeCompare(i.data))[0],F=Et(t,m,p),W=F.registo,f=F.dataKey||"",$=!!(f&&f<z),X=m.filter(i=>i.status==="concluida").length,R=D.filter(i=>i.status==="concluida").length,w=D.filter(i=>i.status!=="concluida").length,U=p?O.get(d(p.id)):null;let T=null;f&&(T=Math.floor((ot(z)-ot(f))/864e5));let u;!p&&!f?u="instalar":$?u="atraso":u="conforme";let g,v;u==="instalar"?(g="badge-montagem",v="Por instalar"):u==="atraso"?(g="badge-atraso",v="Não conforme"):(g="badge-ok",v="Conforme");const j=m.filter(i=>i.status==="concluida").sort((i,b)=>b.data.localeCompare(i.data));let h={nivel:"neutro",texto:"—",cor:s.muted};if(j.length>=2){const b=j.slice(0,qt).map(Y=>O.get(d(Y.id))).filter(Boolean).reduce((Y,at)=>{const vt=at.checklistSnapshot??[];return Y+vt.filter(bt=>at.checklistRespostas?.[bt.id]==="nao").length},0);$?h={nivel:"critico",texto:"⚠ Atraso",cor:s.vermelho}:b===0&&j.length>=st?h={nivel:"excelente",texto:"★ Excelente",cor:s.verde}:b===0?h={nivel:"bom",texto:"● Conforme",cor:s.verde}:b<=lt?h={nivel:"atencao",texto:"◐ Atenção",cor:s.amarelo}:h={nivel:"critico",texto:"⚠ Crítico",cor:s.vermelho}}else j.length===0&&u==="instalar"?h={nivel:"novo",texto:"○ Novo",cor:s.muted}:$&&(h={nivel:"critico",texto:"⚠ Atraso",cor:s.vermelho});return{m:t,sub:e,cat:a,ultima:p,proxima:W,emAtraso:$,diasAtraso:T,totalManuts:X,totalReps:R,repsAbertas:w,relUltima:U,estado:u,estadoBadge:g,estadoLabel:v,tendencia:h,proxDataKey:f}}),_=l.length,S=k.filter(t=>t.estado==="atraso").length,mt=k.filter(t=>t.estado==="conforme").length,H=_>0?Math.round(mt/_*100):0,ut=E?q.filter(t=>t.status==="concluida"&&B(K(t.data))).length:q.filter(t=>t.status==="concluida"&&t.data?.startsWith(String(P))).length,ft=E?C.filter(t=>t.status==="concluida"&&B(K(t.data))).length:C.filter(t=>t.status==="concluida"&&t.data?.startsWith(String(P))).length,ht=k.reduce((t,e)=>t+e.repsAbertas,0),I=new Map;k.forEach(t=>{const e=t.cat?.id||"_sem_categoria",a=t.cat?.nome||"Sem categoria";I.has(e)||I.set(e,{nome:a,linhas:[]}),I.get(e).linhas.push(t)});const gt=new Date(Date.now()-365*864e5).toISOString().slice(0,10),N=C.filter(t=>t.status!=="concluida"?!1:E?B(K(t.data)):t.data>=gt).sort((t,e)=>e.data.localeCompare(t.data)).slice(0,20),tt=`<style type="text/css">${zt(s.azulNavel,"rgba(26,72,128,0.12)")}
@page { size: A4 portrait; margin: 14mm 12mm 12mm }
:root { --verde-light: #dcfce7; --vermelho-light: #fee2e2; --laranja-light: #fef3c7 }
.secao-titulo{background:var(--azul);color:var(--branco);padding:5px 10px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px;border-radius:3px}
.secao-titulo.vermelho{background:#b91c1c}
.secao-titulo.laranja{background:#a16207}
.cliente-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;padding:8px 10px;background:var(--cinza);border-radius:4px;border:1px solid var(--borda);border-top:3px solid var(--azul);margin-bottom:10px}
/* Outlook ignora flex em muitos blocos — label+valor ficavam colados (ex.: NIF512...) */
.cliente-field{display:block;margin:0 0 8px 0;padding:0;line-height:1.45}
.cliente-field .c-label{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;display:inline}
.cliente-field .c-value{font-size:9pt;font-weight:700;color:var(--texto);display:inline}
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
</style>`,et=`${kt(dt)}
${wt("Relatório Executivo de Frota","Período",J)}
`;let c=G?`<div class="atm-frota-email-root" style="margin:0;padding:0;background:#fff;color:#111827" lang="pt">${tt}
${et}`:`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório Executivo de Frota — ${o(n.nome)}</title>
${tt}
</head><body>
${et}`;c+=`
<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente:</span> <span class="c-value">${o(n.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF:</span> <span class="c-value">${o(n.nif??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade:</span> <span class="c-value">${o(n.localidade??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Morada:</span> <span class="c-value">${o(n.morada??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone:</span> <span class="c-value">${o(n.telefone??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Email:</span> <span class="c-value">${o(n.email??"—")}</span></div>
</div>
<div class="kpis">
  <div class="kpi-card"><div class="kpi-numero">${_}</div><div class="kpi-label">Equipamentos</div></div>
  <div class="kpi-card ${H>=80?"kpi-verde":H>=50?"kpi-laranja":"kpi-vermelho"}"><div class="kpi-numero">${H}%</div><div class="kpi-label">Conformidade</div></div>
  <div class="kpi-card ${S>0?"kpi-vermelho":"kpi-verde"}"><div class="kpi-numero">${S}</div><div class="kpi-label">Em atraso</div></div>
  <div class="kpi-card kpi-azul"><div class="kpi-numero">${ut}</div><div class="kpi-label">Manutenções período</div></div>
  <div class="kpi-card ${ht>0?"kpi-laranja":""}"><div class="kpi-numero">${ft}</div><div class="kpi-label">Reparações período</div></div>
</div>`;for(const[,t]of I){const e=t.linhas.filter(a=>a.estado==="atraso").length;c+=`<div class="cat-header">${o(t.nome)} (${t.linhas.length} equip.${e>0?` · <span class="atraso-count">${e} em atraso</span>`:""})</div>
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
</tr></thead><tbody>`,t.linhas.sort((a,r)=>(r.diasAtraso??-9999)-(a.diasAtraso??-9999)).forEach(({m:a,sub:r,ultima:m,proxima:D,diasAtraso:p,totalManuts:F,totalReps:W,relUltima:f,estadoBadge:$,estadoLabel:X,tendencia:R,proxDataKey:w},U)=>{const T=p!=null?p>0?`<span class="data-atraso">+${p}</span>`:p===0?"Hoje":`<span class="data-ok">${p}</span>`:"—",u=U%2===0?"par":"",g=w||D?.data||a.proximaManut,v=[r?`<span class="eq-sub">${o(r.nome)}</span>`:"",a.numeroSerie?`<span class="eq-serie">S/N: ${o(a.numeroSerie)}</span>`:""].filter(Boolean).join(" ");c+=`<tr class="eq-row ${u}">
        <td class="cell-eq eq-cell-stack"><span class="eq-nome">${o(a.marca)} ${o(a.modelo)}</span>${v?`<br/>${v}`:""}</td>
        <td class="cell-center">${m?L(m.data):"—"}</td>
        <td class="cell-center">${g?`<span class="${w&&w<z?"data-atraso":"data-ok"}">${L(g)}</span>`:"—"}</td>
        <td class="cell-center cell-dias">${T}</td>
        <td class="cell-center cell-muted">${F||"—"}</td>
        <td class="cell-center cell-muted">${W||"—"}</td>
        <td class="cell-center"><span class="badge ${$}">${o(X)}</span></td>
        <td class="cell-center" style="font-size:7.5pt;font-weight:700;color:${R.cor}">${R.texto}</td>
        <td class="cell-center cell-rel">${f?.numeroRelatorio??"—"}</td>
      </tr>`}),c+="</tbody></table>"}if(S>0&&(c+=`<div class="secao-titulo vermelho">Manutenções em atraso (${S})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento</th><th class="cell-serie" style="width:16%">Nº Série</th>
  <th style="width:14%">Data prevista</th><th class="cell-center" style="width:10%">Dias atraso</th>
  <th style="width:30%">Observações</th>
</tr></thead><tbody>`,k.filter(t=>t.estado==="atraso").sort((t,e)=>(e.diasAtraso??0)-(t.diasAtraso??0)).forEach(({m:t,sub:e,proxima:a,diasAtraso:r})=>{const m=a?.data??t.proximaManut;c+=`<tr>
        <td><strong>${o(t.marca)} ${o(t.modelo)}</strong>${e?` <span class="sub-muted">· ${o(e.nome)}</span>`:""}</td>
        <td class="cell-serie">${o(t.numeroSerie)}</td>
        <td class="data-atraso">${L(m)}</td>
        <td class="data-atraso cell-center cell-dias">+${r??0}d</td>
        <td class="sub-muted">${o(a?.observacoes??"")}</td>
      </tr>`}),c+="</tbody></table>"),N.length>0){const t=E?`${o(J)} — ${N.length}`:`últimos 12 meses — ${N.length}`;c+=`<div class="secao-titulo laranja">Reparações concluídas (${t})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:28%">Equipamento</th><th class="cell-serie" style="width:14%">Nº Série</th>
  <th style="width:12%">Data</th><th style="width:46%">Descrição</th>
</tr></thead><tbody>`;const e=new Map(l.map(a=>[d(a.id),a]));N.forEach(a=>{const r=e.get(d(a.maquinaId));c+=`<tr>
        <td><strong>${r?o(`${r.marca} ${r.modelo}`):"—"}</strong></td>
        <td class="cell-serie">${r?o(r.numeroSerie):"—"}</td>
        <td>${L(a.data)}</td>
        <td class="cell-desc">${o(a.descricao?.slice(0,120)||a.descricaoAvaria?.slice(0,120)||"—")}</td>
      </tr>`}),c+="</tbody></table>"}return c+=`
<div style="margin-top:10px;padding:6px 10px;background:${s.cinza};border:1px solid ${s.bordaLeve};border-radius:4px;font-size:7.5pt;color:${s.muted};display:flex;gap:14px;flex-wrap:wrap;align-items:center;page-break-inside:avoid">
  <strong style="color:${s.azulNavel};text-transform:uppercase;letter-spacing:.04em;font-size:7pt">Legenda Tendência:</strong>
  <span style="color:${s.verde}">★ Excelente — ≥${st} sem anomalias</span>
  <span style="color:${s.verde}">● Conforme — sem anomalias</span>
  <span style="color:${s.amarelo}">◐ Atenção — anomalias pontuais (≤${lt})</span>
  <span style="color:${s.vermelho}">⚠ Crítico — múltiplas anomalias ou atraso</span>
  <span style="color:${s.muted}">○ Novo — sem histórico</span>
</div>`,c+=`${yt("Documento gerado em "+pt)}${G?"</div>":"</body></html>"}`,c}export{Yt as gerarRelatorioFrotaHtml};
