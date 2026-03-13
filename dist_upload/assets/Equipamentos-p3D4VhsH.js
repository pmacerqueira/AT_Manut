import{j as a,Q as U,X as xa,o as ha,A as ga,b as ba,i as fa,a as va,u as ja,n as ea,t as B}from"./index-Bi7PFevD.js";import{g as Na,r as p,d as ya,u as qa,i as wa}from"./vendor-Bk0NZ5Or.js";import{F as sa,a as ta,M as za,D as ka,P as $a}from"./DocumentacaoModal-D0EREZ7c.js";import{E as Ea}from"./ExecutarManutencaoModal-hC1GTniI.js";import{r as Sa}from"./vendor-qr-DgLtAz-0.js";import{P as Ca}from"./printer-LpC7mkMc.js";import{f as G,a as Aa}from"./datasAzores-CBhl9I61.js";import{a as Pa,e as Da}from"./emailConfig-CkDfPUDM.js";import{E as M}from"./empresa-DQbPD-Qf.js";import{i as Ma}from"./gerarPdfRelatorio-DJ0vKqEq.js";import{A as ia}from"./arrow-left-DhCCLn4a.js";import{P as Ia}from"./play-BMRgHfyD.js";import{F as oa}from"./file-text-BOhD1PLO.js";import{P as na}from"./pencil-CP6Gc0iu.js";import{T as Ra}from"./trash-2-DMrRjyVo.js";import{i as La}from"./isBefore-CyjzPuBp.js";import{f as ra}from"./format-BvtC0E8y.js";import{p as la}from"./pt-BAJJYN30.js";import"./vendor-pdf-hYLUQ4hX.js";import"./upload-SpoOuyRx.js";import"./save-CS0RNVjJ.js";import"./chevron-down-Dq407vZx.js";import"./plus-DeRFU-Tm.js";import"./relatorio-BzlDvam2.js";import"./emailService-xsUK1auz.js";import"./alertasConfig-BJisxGia.js";import"./relatorioHtml-BleuTHRL.js";import"./limits-CwjsBkae.js";import"./circle-check-RR6fl8vU.js";import"./calendar-clock-CXKwl619.js";import"./pen-line-CUIRMwwU.js";import"./addDays-EA-Jdp2P.js";var Ta=Sa();const Fa=Na(Ta);function Oa({isOpen:r,onClose:l,maquina:n,subcategoria:q,cliente:w}){const[m,z]=p.useState(null);return p.useEffect(()=>{if(!r||!n)return;const u=`${window.location.origin}/manut/equipamentos?maquina=${encodeURIComponent(n.id)}`;Fa.toDataURL(u,{width:400,margin:1,color:{dark:"#0d2340",light:"#ffffff"},errorCorrectionLevel:"H"}).then(z).catch(()=>z(null))},[r,n]),p.useEffect(()=>{if(!r)return;const u=v=>{v.key==="Escape"&&l()};return document.addEventListener("keydown",u),()=>document.removeEventListener("keydown",u)},[r,l]),!r||!n?null:a.jsx("div",{className:"modal-overlay qr-modal-overlay",onClick:l,children:a.jsxs("div",{className:"modal qr-modal",onClick:u=>u.stopPropagation(),role:"dialog","aria-modal":"true","aria-label":"Etiqueta QR",children:[a.jsxs("div",{className:"modal-header qr-modal-header no-print",children:[a.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[a.jsx(U,{size:20}),a.jsxs("h2",{style:{margin:0,fontSize:"1rem"},children:["Etiqueta QR — ",n.marca," ",n.modelo]})]}),a.jsx("button",{type:"button",className:"icon-btn secondary",onClick:l,"aria-label":"Fechar",children:a.jsx(xa,{size:20})})]}),a.jsxs("div",{className:"qr-modal-body",children:[a.jsxs("p",{className:"no-print qr-modal-hint",children:["Pré-visualização da etiqueta ",a.jsx("strong",{children:"90 × 50 mm"}),". Imprima, recorte e cole na máquina. A câmara do telemóvel lê o QR e abre directamente a ficha da máquina."]}),a.jsxs("div",{className:"qr-etiqueta",id:"qr-etiqueta-print",children:[a.jsxs("div",{className:"qr-etiqueta-left",children:[a.jsx("div",{className:"qr-etiqueta-logo-wrap",children:a.jsx("img",{src:"/manut/logo-navel.png",alt:"Navel",className:"qr-etiqueta-logo",onError:u=>{u.currentTarget.style.display="none"}})}),a.jsx("div",{className:"qr-etiqueta-sep"}),q?.nome&&a.jsx("div",{className:"qr-etiqueta-type",children:q.nome}),a.jsxs("div",{className:"qr-etiqueta-machine",children:[a.jsxs("div",{className:"qr-etiqueta-nome",children:[n.marca," ",n.modelo]}),a.jsxs("div",{className:"qr-etiqueta-serie",children:["S/N: ",a.jsx("strong",{children:n.numeroSerie||"—"})]}),w&&a.jsx("div",{className:"qr-etiqueta-cliente",children:w.nome}),n.localizacao&&a.jsx("div",{className:"qr-etiqueta-local",children:n.localizacao})]})]}),a.jsxs("div",{className:"qr-etiqueta-right",children:[m?a.jsx("img",{src:m,alt:"QR Code",className:"qr-etiqueta-img"}):a.jsxs("div",{className:"qr-etiqueta-loading",children:[a.jsx(U,{size:28,strokeWidth:1.2}),a.jsx("span",{children:"A gerar…"})]}),a.jsx("div",{className:"qr-etiqueta-scan-hint",children:"Digitalizar"})]}),a.jsxs("div",{className:"qr-etiqueta-footer",children:["Navel-Açores, Lda  ·  AT_Manut v",ha]})]}),a.jsxs("div",{className:"qr-modal-actions no-print",children:[a.jsx("button",{type:"button",className:"btn secondary",onClick:l,children:"Fechar"}),a.jsxs("button",{type:"button",className:"btn primary",onClick:()=>window.print(),disabled:!m,children:[a.jsx(Ca,{size:16})," Imprimir etiqueta"]})]})]})]})})}function Ha({maquina:r,cliente:l,subcategoria:n,categoria:q,manutencoes:w=[],relatorios:m=[],logoUrl:z}){const o=Da,u=z??"/manut/logo-navel.png",v=new Date,I=v.toLocaleString("pt-PT",{dateStyle:"long",timeStyle:"short",timeZone:"Atlantic/Azores"}),j=[...w].sort((i,d)=>d.data.localeCompare(i.data)),k=j.length,S=j.filter(i=>i.status==="concluida"),$=j.filter(i=>i.status!=="concluida"),g=$.filter(i=>new Date(i.data)<v),b=$.filter(i=>new Date(i.data)>=v),N=S[0],y=b.reduce((i,d)=>!i||d.data<i.data?d:i,null),x=N?G(N.data,!0):"—",R=y?G(y.data,!0):"—",C=r.proximaManut?G(r.proximaManut,!0):R,f=S.map(i=>m.find(d=>d.manutencaoId===i.id)).find(i=>i?.assinaturaDigital),E=f?.assinaturaDigital?Pa(f.assinaturaDigital):null,L=n?`${n.nome} — ${r.marca} ${r.modelo}`:`${r.marca} ${r.modelo}`,T=(i,d)=>{const h=m.find(P=>P.manutencaoId===i.id),A=i.tipo==="montagem"?"Montagem":"Periódica",F=G(i.data,!0),O=o(h?.tecnico??i.tecnico??"—"),V=h?.nomeAssinante?o(h.nomeAssinante):"—",H=h?.notas?o(h.notas.length>90?h.notas.slice(0,90)+"…":h.notas):"—",Q=i.status==="concluida"?'<span class="badge-ok">Executada</span>':new Date(i.data)<v?'<span class="badge-err">Em atraso</span>':'<span class="badge-pend">Agendada</span>';return`<tr${d%2===1?' class="row-alt"':""}>
      <td class="td-c">${d+1}</td>
      <td>${F}</td>
      <td class="td-c">${A}</td>
      <td class="td-c">${Q}</td>
      <td>${O}</td>
      <td>${V}</td>
      <td class="td-notes">${H}</td>
    </tr>`};return`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Histórico de Manutenção — ${o(r.marca)} ${o(r.modelo)}</title>
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
    <img src="${u}" alt="Navel"
      onerror="this.parentNode.innerHTML='<strong style=color:#1a4880;font-size:14px>NAVEL</strong>'">
  </div>
  <div class="rpt-empresa">
    <strong>${o(M.nome)}</strong>
    ${o(M.divisaoComercial)}<br>
    ${o(M.sede)}<br>
    ${o(M.telefones)} &nbsp;|&nbsp; ${o(M.web)}
  </div>
</header>

<div class="rpt-titulo-bar">
  <h1>Histórico Completo de Manutenção</h1>
  <span class="rpt-gerado">Gerado em ${I}</span>
</div>
<div class="rpt-acento"></div>

<div class="section-title">Ficha do equipamento</div>
<div class="ficha-grid">
  <div class="ficha-col">
    <div class="ficha-field">
      <span class="ficha-label">Equipamento</span>
      <span class="ficha-value ficha-value-lg">${o(r.marca)} ${o(r.modelo)}</span>
    </div>
    <div class="ficha-field">
      <span class="ficha-label">Nº de Série</span>
      <span class="ficha-value">${o(r.numeroSerie||"—")}</span>
    </div>
    ${n?`<div class="ficha-field">
      <span class="ficha-label">Tipo / Subcategoria</span>
      <span class="ficha-value">${o(n.nome)}${q?` &mdash; ${o(q.nome)}`:""}</span>
    </div>`:""}
    ${r.localizacao?`<div class="ficha-field">
      <span class="ficha-label">Localização</span>
      <span class="ficha-value">${o(r.localizacao)}</span>
    </div>`:""}
  </div>
  <div class="ficha-col">
    <div class="ficha-field">
      <span class="ficha-label">Cliente</span>
      <span class="ficha-value ficha-value-lg">${o(l?.nome??"—")}</span>
    </div>
    ${l?.nif?`<div class="ficha-field">
      <span class="ficha-label">NIF</span>
      <span class="ficha-value">${o(l.nif)}</span>
    </div>`:""}
    ${l?.morada?`<div class="ficha-field">
      <span class="ficha-label">Morada</span>
      <span class="ficha-value">${o(l.morada)}</span>
    </div>`:""}
    <div class="ficha-field">
      <span class="ficha-label">Próxima manutenção</span>
      <span class="ficha-value">${C}</span>
    </div>
  </div>
</div>

<div class="section-title">Estatísticas globais</div>
<div class="stats-row">
  <div class="stat-box">
    <span class="stat-num">${k}</span>
    <span class="stat-lbl">Total</span>
  </div>
  <div class="stat-box">
    <span class="stat-num green">${S.length}</span>
    <span class="stat-lbl">Executadas</span>
  </div>
  <div class="stat-box">
    <span class="stat-num orange">${b.length}</span>
    <span class="stat-lbl">Agendadas</span>
  </div>
  <div class="stat-box">
    <span class="stat-num${g.length>0?" red":""}">${g.length}</span>
    <span class="stat-lbl">Em atraso</span>
  </div>
  <div class="stat-box">
    <span class="stat-num" style="font-size:${x.length>8?"9":"13"}px;padding-top:${x.length>8?"5":"2"}px">${x}</span>
    <span class="stat-lbl">Última execução</span>
  </div>
</div>

<div class="section-title">
  Registo histórico — ${k} intervenç${k===1?"ão":"ões"} (mais recente primeiro)
</div>
${k===0?'<p style="color:#5a6a7e;font-size:10px;margin-bottom:12px;font-style:italic">Nenhuma manutenção registada para este equipamento.</p>':`<table class="hist-table">
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
    ${j.map((i,d)=>T(i,d)).join(`
    `)}
  </tbody>
</table>`}

${E?`<div class="section-title">Última assinatura registada</div>
<div class="assin-box">
  <span class="ficha-label">Assinatura manuscrita do cliente</span>
  <img src="${E}" alt="Assinatura do cliente">
  ${f?.nomeAssinante?`<div class="assin-meta">Assinado por: <strong>${o(f.nomeAssinante)}</strong>${f.dataAssinatura?` &nbsp;&mdash;&nbsp; ${Aa(f.dataAssinatura)}`:""}</div>`:""}
</div>`:""}

<footer class="rpt-footer">
  <span>${o(ga)}</span>
  <span>${o(L)} &nbsp;&middot;&nbsp; S/N: ${o(r.numeroSerie||"—")}</span>
</footer>

</body>
</html>`}function Ne(){const{clientes:r,categorias:l,maquinas:n,INTERVALOS:q,getSubcategoriasByCategoria:w,getSubcategoria:m,manutencoes:z,relatorios:o,removeMaquina:u}=ba(),{canDelete:v,isAdmin:I}=fa(),{showToast:j}=va(),{showGlobalLoading:k,hideGlobalLoading:S}=ja(),[$,g]=p.useState("categorias"),[b,N]=p.useState(null),[y,x]=p.useState(null),[R,C]=p.useState(null),[f,E]=p.useState(null),[L,T]=p.useState(null),[i,d]=p.useState(null),[h,A]=p.useState(null),[F,O]=p.useState(null),V=ya(),H=qa(),[Q,_]=wa(),P=Q.get("filter")==="atraso";p.useEffect(()=>{const e=Q.get("maquina");if(!e)return;const s=n.find(c=>c.id===e);if(!s)return;const t=m(s.subcategoriaId);if(t){const c=l.find(D=>D.id===t.categoriaId);c&&(N(c),x(t),g("maquinas"))}_(c=>(c.delete("maquina"),c),{replace:!0})},[n]),p.useEffect(()=>{const e=H.state?.highlightId;if(!e)return;const s=n.find(c=>c.id===e);if(!s)return;const t=m(s.subcategoriaId);if(t){const c=l.find(D=>D.id===t.categoriaId);c&&(N(c),x(t),g("maquinas"))}},[H.state]);const K=e=>r.find(s=>s.nif===e),X=e=>{O(e.id),k();try{const s=m(e.subcategoriaId),t=s?l.find(W=>W.id===s.categoriaId):null,c=K(e.clienteNif),D=z.filter(W=>W.maquinaId===e.id),ua=Ha({maquina:e,cliente:c,subcategoria:s,categoria:t,manutencoes:D,relatorios:o});Ma(ua)}catch{j("Erro ao gerar histórico PDF.","error")}finally{S(),O(null)}},Y=n.filter(e=>La(new Date(e.proximaManut),new Date)),ca=e=>{N(e),x(null),g("subcategorias")},da=e=>{x(e),g("maquinas")},Z=()=>{g("categorias"),N(null),x(null)},pa=()=>{g("subcategorias"),x(null)},ma=b?w(b.id):[],J=(y?n.filter(e=>e.subcategoriaId===y.id):[]).reduce((e,s)=>{const t=K(s.clienteNif)?.nome??"Sem cliente";return e[t]||(e[t]=[]),e[t].push(s),e},{}),aa=Object.keys(J).sort((e,s)=>e.localeCompare(s));return a.jsxs("div",{className:"page",children:[a.jsxs("div",{className:"page-header",children:[a.jsxs("div",{children:[a.jsxs("button",{type:"button",className:"btn-back",onClick:()=>V(-1),children:[a.jsx(ia,{size:20}),"Voltar atrás"]}),a.jsx("h1",{children:"Equipamentos"}),a.jsx("p",{className:"page-sub",children:P?"Equipamentos em atraso de manutenção":"Navegação por categorias e subcategorias"})]}),P&&a.jsx("button",{type:"button",className:"secondary",onClick:()=>_({}),children:"Ver todos"})]}),P?a.jsx("div",{className:"table-card card",children:Y.length===0?a.jsx("p",{className:"text-muted",style:{padding:"1.5rem"},children:"Nenhum equipamento em atraso de manutenção."}):a.jsx("div",{className:"maquinas-por-cliente-lista",children:Object.entries(Y.reduce((e,s)=>{const t=K(s.clienteNif)?.nome??"Sem cliente";return e[t]||(e[t]=[]),e[t].push(s),e},{})).sort((e,s)=>e[0].localeCompare(s[0])).map(([e,s])=>a.jsxs("div",{className:"maquinas-por-cliente",children:[a.jsx("h4",{children:e}),s.map(t=>{const c=m(t.subcategoriaId);return a.jsxs("div",{className:"maquina-row",style:{borderLeft:"3px solid var(--color-danger)"},children:[a.jsxs("div",{className:"maquina-row-info",children:[a.jsxs("div",{className:"equip-desc-block",children:[a.jsxs("strong",{children:[c?.nome||""," — ",t.marca," ",t.modelo]}),a.jsxs("span",{className:"text-muted equip-num-serie",children:["Nº Série: ",t.numeroSerie]})]}),a.jsxs("div",{style:{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap"},children:[ea.includes(t.subcategoriaId)&&t.posicaoKaeser!=null&&a.jsxs("span",{className:`badge kaeser-tipo-badge${t.marca?.toLowerCase()==="kaeser"?"":" kaeser-tipo-badge--outro"}`,title:`Próxima manutenção Tipo ${B(t.posicaoKaeser)}`,children:[t.marca?.toLowerCase()==="kaeser"?"KAESER":t.marca," ",B(t.posicaoKaeser)]}),a.jsxs("span",{className:"badge badge-danger",children:["Próx. manut.: ",ra(new Date(t.proximaManut),"d MMM yyyy",{locale:la})]})]})]}),a.jsxs("div",{className:"actions",children:[a.jsxs("button",{type:"button",className:"btn-executar-manut",onClick:()=>T({maquina:t}),title:"Executar manutenção",children:[a.jsx(Ia,{size:12})," Executar"]}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>X(t),title:"Histórico completo em PDF",disabled:F===t.id,children:a.jsx(oa,{size:16})}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>d(t),title:"Gerar etiqueta QR",children:a.jsx(U,{size:16})}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>E(t),title:"Documentação",children:a.jsx(sa,{size:16})}),I&&a.jsxs(a.Fragment,{children:[a.jsx("button",{className:"icon-btn secondary",onClick:()=>A(t),title:"Plano de peças e consumíveis",children:a.jsx(ta,{size:16})}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>C(t),title:"Editar",children:a.jsx(na,{size:16})})]})]})]},t.id)})]},e))})}):a.jsxs(a.Fragment,{children:[$==="categorias"&&a.jsx("div",{className:"categorias-grid",children:l.map(e=>a.jsxs("button",{type:"button",className:"categoria-card",onClick:()=>ca(e),children:[a.jsx("h3",{children:e.nome}),a.jsxs("p",{children:[n.filter(s=>m(s.subcategoriaId)?.categoriaId===e.id).length," equipamento(s)"]})]},e.id))}),$==="subcategorias"&&b&&a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"equipamentos-nav",children:[a.jsxs("button",{type:"button",className:"breadcrumb-btn",onClick:Z,children:[a.jsx(ia,{size:16})," Equipamentos"]}),a.jsxs("span",{className:"breadcrumb",children:["/ ",b.nome]})]}),a.jsx("div",{className:"categorias-grid",children:ma.map(e=>{const s=n.filter(t=>t.subcategoriaId===e.id).length;return a.jsxs("button",{type:"button",className:"categoria-card",onClick:()=>da(e),children:[a.jsx("h3",{children:e.nome}),a.jsxs("p",{children:[s," equipamento(s)"]})]},e.id)})})]}),$==="maquinas"&&y&&b&&a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"equipamentos-nav",children:[a.jsx("button",{type:"button",className:"breadcrumb-btn",onClick:Z,children:"Equipamentos"}),a.jsx("span",{className:"breadcrumb",children:"/"}),a.jsx("button",{type:"button",className:"breadcrumb-btn",onClick:pa,children:b.nome}),a.jsxs("span",{className:"breadcrumb",children:["/ ",y.nome]})]}),a.jsx("div",{className:"maquinas-por-cliente-lista",children:aa.length===0?a.jsx("p",{className:"text-muted",children:"Nenhum equipamento registado nesta subcategoria."}):aa.map(e=>a.jsxs("div",{className:"maquinas-por-cliente",children:[a.jsx("h4",{children:e}),J[e].map(s=>a.jsxs("div",{className:"maquina-row",children:[a.jsxs("div",{children:[a.jsxs("strong",{children:[s.marca," ",s.modelo]}),a.jsxs("span",{className:"text-muted",children:[" — Nº Série: ",s.numeroSerie]}),ea.includes(s.subcategoriaId)&&s.posicaoKaeser!=null&&a.jsxs("span",{className:`badge kaeser-tipo-badge${s.marca?.toLowerCase()==="kaeser"?"":" kaeser-tipo-badge--outro"}`,title:`Ciclo de manutenção — próximo: Tipo ${B(s.posicaoKaeser)}`,children:[s.marca?.toLowerCase()==="kaeser"?"KAESER":s.marca," ",B(s.posicaoKaeser)]}),s.ultimaManutencaoData&&a.jsxs("span",{className:"text-muted",style:{marginLeft:"0.5rem",fontSize:"0.85em"},children:["· Última manut.: ",ra(new Date(s.ultimaManutencaoData),"d MMM yyyy",{locale:la})]})]}),a.jsxs("div",{className:"actions",children:[a.jsx("button",{className:"icon-btn secondary",onClick:()=>X(s),title:"Histórico completo em PDF",disabled:F===s.id,children:a.jsx(oa,{size:16})}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>d(s),title:"Gerar etiqueta QR",children:a.jsx(U,{size:16})}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>E(s),title:"Documentação",children:a.jsx(sa,{size:16})}),I&&a.jsxs(a.Fragment,{children:[a.jsx("button",{className:"icon-btn secondary",onClick:()=>A(s),title:"Plano de peças e consumíveis",children:a.jsx(ta,{size:16})}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>C(s),title:"Editar",children:a.jsx(na,{size:16})})]}),v&&a.jsx("button",{className:"icon-btn danger",onClick:()=>{u(s.id),j("Equipamento eliminado.","info")},title:"Eliminar",children:a.jsx(Ra,{size:16})})]})]},s.id))]},e))})]})]}),R&&a.jsx(za,{isOpen:!0,onClose:()=>C(null),mode:"edit",maquina:R}),a.jsx(ka,{isOpen:!!f,onClose:()=>E(null),maquina:f}),a.jsx(Oa,{isOpen:!!i,onClose:()=>d(null),maquina:i,subcategoria:i?m(i.subcategoriaId):null,cliente:i?K(i.clienteNif):null}),L&&a.jsx(Ea,{isOpen:!0,onClose:()=>T(null),manutencao:null,maquina:L.maquina}),a.jsx($a,{isOpen:!!h,onClose:()=>A(null),maquina:h})]})}export{Ne as default};
