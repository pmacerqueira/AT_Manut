import{e as we}from"./horasContadorEquipamento-CtzZOQDv.js";import{f as ye,n as d,d as ze,e as qe,m as Ee,r as Me,h as Ce,i as Ae,k as L,o as V,q as Se,p as ie}from"./index-ZNCc7Dn2.js";import{P as s,h as Ie,a as Ne,b as Re,c as De}from"./relatorioBaseStyles-CGzrwWs_.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";import"./vendor-icons-CsMwI86-.js";import"./vendor-datefns-CCZTWiZ_.js";import"./empresa-pV7uX3IF.js";const Fe=5,ne=3,ce=2,B=i=>{if(!i)return"—";const r=String(i).slice(0,10).split("-");return r.length<3?String(i):`${r[2]}-${r[1]}-${r[0]}`};function Pe(i){const r=String(i??"/manut/logo-navel.png").trim();if(/^https?:\/\//i.test(r))return r;const $=r.startsWith("/")?r:`/${r}`;return typeof window<"u"&&window.location?.origin?`${window.location.origin}${$}`:`https://www.navel.pt${$}`}function Xe(i,r,$,Z,de=[],pe,me,x={}){const o=we,ue=Pe(x.logoUrl),q=new Date().toISOString().slice(0,10),fe=ye(q,!0),O=new Date().getFullYear(),E=!!x.periodoCustom,ee=!!x.emailFragment,te=x.periodoLabel||String(O),ae=x.periodoInicio??null,oe=x.periodoFim??null,_=e=>!(!e||ae&&e<ae||oe&&e>oe),H=new Set(r.map(e=>d(e.id))),M=$.filter(e=>H.has(d(e.maquinaId))),C=de.filter(e=>H.has(d(e.maquinaId))),A=new Map;M.forEach(e=>{const t=d(e.maquinaId);A.has(t)||A.set(t,[]),A.get(t).push(e)});const S=new Map;C.forEach(e=>{const t=d(e.maquinaId);S.has(t)||S.set(t,[]),S.get(t).push(e)});const I=new Map;for(const e of Z){const t=ze(e);if(!t)continue;const a=qe(e),l=M.some(h=>d(h.id)===t),p=a&&H.has(a);!l&&!p||I.set(t,Ee(I.get(t),e))}const k=r.map(e=>{const t=pe(e.subcategoriaId),a=t?me(t.categoriaId):null,l=d(e.id),p=A.get(l)||[],h=S.get(l)||[],{dataUltimaKey:w,ultima:u,relUltima:X}=Me(e,p,Z,I,$),J=Ce(u,w),F=Ae(e,p,J),Y=F.registo,f=F.dataKey||"",v=!!(f&&f<q),y=p.filter(L).length,K=h.filter(m=>m.status==="concluida").length,G=h.filter(m=>m.status!=="concluida").length;let P=null;f&&(P=Math.floor((ie(q)-ie(f))/864e5));let c;!w&&!f?c="instalar":v?c="atraso":c="conforme";let b,T;c==="instalar"?(b="badge-montagem",T="Por instalar"):c==="atraso"?(b="badge-atraso",T="Não conforme"):(b="badge-ok",T="Conforme");const j=p.filter(L).filter(m=>m.data!=null&&m.data!=="").sort((m,z)=>String(z.data).localeCompare(String(m.data)));let g={nivel:"neutro",texto:"—",cor:s.muted};if(j.length>=2){const z=j.slice(0,Fe).map(Q=>I.get(d(Q.id))).filter(Boolean).reduce((Q,re)=>{const $e=re.checklistSnapshot??[];return Q+$e.filter(ke=>re.checklistRespostas?.[ke.id]==="nao").length},0);v?g={nivel:"critico",texto:"⚠ Atraso",cor:s.vermelho}:z===0&&j.length>=ne?g={nivel:"excelente",texto:"★ Excelente",cor:s.verde}:z===0?g={nivel:"bom",texto:"● Conforme",cor:s.verde}:z<=ce?g={nivel:"atencao",texto:"◐ Atenção",cor:s.amarelo}:g={nivel:"critico",texto:"⚠ Crítico",cor:s.vermelho}}else j.length===0&&c==="instalar"?g={nivel:"novo",texto:"○ Novo",cor:s.muted}:v&&(g={nivel:"critico",texto:"⚠ Atraso",cor:s.vermelho});return{m:e,sub:t,cat:a,ultima:u,dataUltimaKey:w,proxima:Y,emAtraso:v,diasAtraso:P,totalManuts:y,totalReps:K,repsAbertas:G,relUltima:X,estado:c,estadoBadge:b,estadoLabel:T,tendencia:g,proxDataKey:f}}),U=r.length,N=k.filter(e=>e.estado==="atraso").length,ge=k.filter(e=>e.estado==="conforme").length,W=U>0?Math.round(ge/U*100):0,he=E?M.filter(e=>L(e)&&_(V(e.data))).length:M.filter(e=>L(e)&&e.data?.startsWith(String(O))).length,ve=E?C.filter(e=>e.status==="concluida"&&_(V(e.data))).length:C.filter(e=>e.status==="concluida"&&e.data?.startsWith(String(O))).length,be=k.reduce((e,t)=>e+t.repsAbertas,0),R=new Map;k.forEach(e=>{const t=e.cat?.id||"_sem_categoria",a=e.cat?.nome||"Sem categoria";R.has(t)||R.set(t,{nome:a,linhas:[]}),R.get(t).linhas.push(e)});const xe=new Date(Date.now()-365*864e5).toISOString().slice(0,10),D=C.filter(e=>e.status!=="concluida"?!1:E?_(V(e.data)):e.data>=xe).sort((e,t)=>t.data.localeCompare(e.data)).slice(0,20),se=`<style type="text/css">${De(s.azulNavel,"rgba(26,72,128,0.12)")}
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
</style>`,le=`${Ie(ue)}
${Ne("Relatório Executivo de Frota","Período",te)}
`;let n=ee?`<div class="atm-frota-email-root" style="margin:0;padding:0;background:#fff;color:#111827" lang="pt">${se}
${le}`:`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório Executivo de Frota — ${o(i.nome)}</title>
${se}
</head><body>
${le}`;n+=`
<div class="cliente-grid">
  <div class="cliente-field"><span class="c-label">Cliente:</span> <span class="c-value">${o(i.nome)}</span></div>
  <div class="cliente-field"><span class="c-label">NIF:</span> <span class="c-value">${o(i.nif??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Localidade:</span> <span class="c-value">${o(i.localidade??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Morada:</span> <span class="c-value">${o(i.morada??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Telefone:</span> <span class="c-value">${o(i.telefone??"—")}</span></div>
  <div class="cliente-field"><span class="c-label">Email:</span> <span class="c-value">${o(i.email??"—")}</span></div>
</div>
<div class="kpis">
  <div class="kpi-card"><div class="kpi-numero">${U}</div><div class="kpi-label">Equipamentos</div></div>
  <div class="kpi-card ${W>=80?"kpi-verde":W>=50?"kpi-laranja":"kpi-vermelho"}"><div class="kpi-numero">${W}%</div><div class="kpi-label">Conformidade</div></div>
  <div class="kpi-card ${N>0?"kpi-vermelho":"kpi-verde"}"><div class="kpi-numero">${N}</div><div class="kpi-label">Em atraso</div></div>
  <div class="kpi-card kpi-azul"><div class="kpi-numero">${he}</div><div class="kpi-label">Manutenções período</div></div>
  <div class="kpi-card ${be>0?"kpi-laranja":""}"><div class="kpi-numero">${ve}</div><div class="kpi-label">Reparações período</div></div>
</div>`;for(const[,e]of R){const t=e.linhas.filter(a=>a.estado==="atraso").length;n+=`<div class="cat-header">${o(e.nome)} (${e.linhas.length} equip.${t>0?` · <span class="atraso-count">${t} em atraso</span>`:""})</div>
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
</tr></thead><tbody>`,e.linhas.sort((a,l)=>(l.diasAtraso??-9999)-(a.diasAtraso??-9999)).forEach(({m:a,sub:l,ultima:p,dataUltimaKey:h,proxima:w,diasAtraso:u,totalManuts:X,totalReps:J,relUltima:F,estadoBadge:Y,estadoLabel:f,tendencia:v,proxDataKey:y},K)=>{const G=u!=null?u>0?`<span class="data-atraso">+${u}</span>`:u===0?"Hoje":`<span class="data-ok">${u}</span>`:"—",P=K%2===0?"par":"",c=y||w?.data||a.proximaManut,b=[l?`<span class="eq-sub">${o(l.nome)}</span>`:"",a.numeroSerie?`<span class="eq-serie">S/N: ${o(a.numeroSerie)}</span>`:""].filter(Boolean).join(" ");n+=`<tr class="eq-row ${P}">
        <td class="cell-eq eq-cell-stack"><span class="eq-nome">${o(a.marca)} ${o(a.modelo)}</span>${b?`<br/>${b}`:""}</td>
        <td class="cell-center">${h?B(h):"—"}</td>
        <td class="cell-center">${c?`<span class="${y&&y<q?"data-atraso":"data-ok"}">${B(c)}</span>`:"—"}</td>
        <td class="cell-center cell-dias">${G}</td>
        <td class="cell-center cell-muted">${X||"—"}</td>
        <td class="cell-center cell-muted">${J||"—"}</td>
        <td class="cell-center"><span class="badge ${Y}">${o(f)}</span></td>
        <td class="cell-center" style="font-size:7.5pt;font-weight:700;color:${v.cor}">${v.texto}</td>
        <td class="cell-center cell-rel">${Se(F)||"—"}</td>
      </tr>`}),n+="</tbody></table>"}if(N>0&&(n+=`<div class="secao-titulo vermelho">Manutenções em atraso (${N})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:30%">Equipamento</th><th class="cell-serie" style="width:16%">Nº Série</th>
  <th style="width:14%">Data prevista</th><th class="cell-center" style="width:10%">Dias atraso</th>
  <th style="width:30%">Observações</th>
</tr></thead><tbody>`,k.filter(e=>e.estado==="atraso").sort((e,t)=>(t.diasAtraso??0)-(e.diasAtraso??0)).forEach(({m:e,sub:t,proxima:a,diasAtraso:l})=>{const p=a?.data??e.proximaManut;n+=`<tr>
        <td><strong>${o(e.marca)} ${o(e.modelo)}</strong>${t?` <span class="sub-muted">· ${o(t.nome)}</span>`:""}</td>
        <td class="cell-serie">${o(e.numeroSerie)}</td>
        <td class="data-atraso">${B(p)}</td>
        <td class="data-atraso cell-center cell-dias">+${l??0}d</td>
        <td class="sub-muted">${o(a?.observacoes??"")}</td>
      </tr>`}),n+="</tbody></table>"),D.length>0){const e=E?`${o(te)} — ${D.length}`:`últimos 12 meses — ${D.length}`;n+=`<div class="secao-titulo laranja">Reparações concluídas (${e})</div>
<table class="tabela-frota"><thead><tr>
  <th class="cell-eq" style="width:28%">Equipamento</th><th class="cell-serie" style="width:14%">Nº Série</th>
  <th style="width:12%">Data</th><th style="width:46%">Descrição</th>
</tr></thead><tbody>`;const t=new Map(r.map(a=>[d(a.id),a]));D.forEach(a=>{const l=t.get(d(a.maquinaId));n+=`<tr>
        <td><strong>${l?o(`${l.marca} ${l.modelo}`):"—"}</strong></td>
        <td class="cell-serie">${l?o(l.numeroSerie):"—"}</td>
        <td>${B(a.data)}</td>
        <td class="cell-desc">${o(a.descricao?.slice(0,120)||a.descricaoAvaria?.slice(0,120)||"—")}</td>
      </tr>`}),n+="</tbody></table>"}return n+=`
<div style="margin-top:10px;padding:6px 10px;background:${s.cinza};border:1px solid ${s.bordaLeve};border-radius:4px;font-size:7.5pt;color:${s.muted};display:flex;gap:14px;flex-wrap:wrap;align-items:center;page-break-inside:avoid">
  <strong style="color:${s.azulNavel};text-transform:uppercase;letter-spacing:.04em;font-size:7pt">Legenda Tendência:</strong>
  <span style="color:${s.verde}">★ Excelente — ≥${ne} sem anomalias</span>
  <span style="color:${s.verde}">● Conforme — sem anomalias</span>
  <span style="color:${s.amarelo}">◐ Atenção — anomalias pontuais (≤${ce})</span>
  <span style="color:${s.vermelho}">⚠ Crítico — múltiplas anomalias ou atraso</span>
  <span style="color:${s.muted}">○ Novo — sem histórico</span>
</div>`,n+=`${Re("Documento gerado em "+fe)}${ee?"</div>":"</body></html>"}`,n}export{Xe as gerarRelatorioFrotaHtml};
