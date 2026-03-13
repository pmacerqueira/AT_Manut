import{f as y,a as K}from"./datasAzores-CBhl9I61.js";import{a as k,e as _}from"./emailConfig-CkDfPUDM.js";import{A as J}from"./index-Bi7PFevD.js";import{E as i}from"./empresa-DQbPD-Qf.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";function w(a,r){const s=String(a??"").trim();return/^#[0-9a-fA-F]{6}$/.test(s)?s.toLowerCase():/^#[0-9a-fA-F]{3}$/.test(s)?`#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase():r}function A(a,r){const s=w(a,"#000000"),o=Number.parseInt(s.slice(1,3),16),d=Number.parseInt(s.slice(3,5),16),c=Number.parseInt(s.slice(5,7),16);return`rgba(${o}, ${d}, ${c}, ${r})`}function q(a,r,s,o,d=[],c={}){if(!a)return"";const{subcategoriaNome:b,logoUrl:R,istobalLogoUrl:S}=c,C=R??"/manut/logo-navel.png",N=S??"/manut/logo-istobal.png",t=_,g=r?.origem==="istobal_email"||/istobal/i.test(String(s?.marca??""))||/istobal/i.test(String(b??"")),m=s?.marcaLogoUrl||(g?N:""),O=s?.marca?`Logotipo ${s.marca}`:"Logotipo da marca",n=w(s?.marcaCorHex,g?"#c8102e":"#b45309"),D=A(n,.09),P=A(n,.28),j=a.dataCriacao?y(a.dataCriacao,!0):"—",E=a.dataAssinatura?K(a.dataAssinatura):"Pendente de assinatura",f=a.dataRealizacao||r?.data||a.dataAssinatura||a.dataCriacao,T=f?y(f,!0):"Pendente de preenchimento",L=s&&b?t(`${b} — ${s.marca} ${s.modelo} — Nº Série: ${s.numeroSerie}`):s?t(`${s.marca} ${s.modelo} — Nº Série: ${s.numeroSerie}`):"—",x=a.assinaturaDigital?k(a.assinaturaDigital):"";let l=[];try{const e=typeof a.pecasUsadas=="string"?JSON.parse(a.pecasUsadas||"[]"):a.pecasUsadas??[];l=Array.isArray(e)?e:[]}catch{}const I=l.length>0&&l.some(e=>e.descricao?.trim());let v={};try{const e=typeof a.checklistRespostas=="string"?JSON.parse(a.checklistRespostas||"{}"):a.checklistRespostas??{};v=e&&typeof e=="object"&&!Array.isArray(e)?e:{}}catch{}const u=Object.entries(v),U=u.length>0;let h=[];try{const e=typeof a.fotos=="string"?JSON.parse(a.fotos||"[]"):a.fotos??[];h=Array.isArray(e)?e:[]}catch{}const $=h.map(e=>k(e)).filter(Boolean),z={};d.forEach(e=>{z[e.id]=e.texto??e.descricao??e.nome??e.id});const F=([e,p],H)=>{const M=z[e]??e,B=p==="OK"?'<span class="badge-sim">OK</span>':p==="NOK"?'<span class="badge-nao">NOK</span>':'<span class="badge-nd">N/A</span>';return`<tr><td class="cl-num">${H+1}.</td><td class="cl-texto">${t(M)}</td><td class="cl-badge">${B}</td></tr>`};return`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Reparação ${t(a.numeroRelatorio??"")} — Navel</title>
<style>
@page{size:A4 portrait;margin:8mm 11mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;line-height:1.42;color:#1a1a2e;background:#fff;padding:0}

:root{
  --azul:#1a4880;--azul-med:#2d6eb5;--azul-claro:#e8f2fa;
  --cinza:#f4f6f8;--borda:#c6d8ec;--texto:#1a1a2e;--muted:#5a6a7e;
  --verde:#16a34a;--vermelho:#dc2626;--acento:#f0a500;
  --rep:${n};--rep-bg:${D};--rep-borda:${P};--acento:${n};
}

section{margin-bottom:10px;page-break-inside:avoid}
.section-can-break{page-break-inside:auto}
.page-break-before{page-break-before:always}
.no-break{page-break-inside:avoid}

/* Cabeçalho */
.rpt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:2.5px solid var(--azul)}
.rpt-logos{display:flex;align-items:center;gap:10px}
.rpt-logo img{max-height:42px;max-width:170px;object-fit:contain;display:block}
.rpt-logo-istobal img{max-height:42px;max-width:170px;object-fit:contain;display:block}
.rpt-logo-fallback{font-size:1.2em;font-weight:700;color:var(--azul)}
.rpt-empresa{text-align:right;font-size:9px;line-height:1.5;color:var(--muted)}
.rpt-empresa strong{display:block;font-size:10px;color:var(--azul);margin-bottom:1px}
.rpt-empresa a{color:var(--azul-med);text-decoration:none}

/* Título — barra de reparação (laranja) */
.rpt-titulo-bar{display:flex;align-items:center;justify-content:space-between;background:var(--rep);color:#fff;padding:5px 10px;margin:7px 0 0;border-radius:3px}
.rpt-titulo-bar h1{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rpt-num-wrap{text-align:right}
.rpt-num-label{font-size:8px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;display:block}
.rpt-num{font-size:14px;font-weight:800;letter-spacing:.04em;font-family:'Courier New',monospace}
.rpt-acento{height:2px;background:linear-gradient(90deg,var(--acento),var(--rep));margin-bottom:8px;border-radius:0 0 2px 2px}

/* Secções */
.rpt-section-title{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--rep);border-bottom:1px solid var(--rep-borda);padding-bottom:2px;margin-bottom:5px}

/* Grid de dados */
.rpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px}
.rpt-field{padding:2.5px 0;border-bottom:1px solid #edf2f7}
.rpt-field:last-child{border-bottom:none}
.rpt-label{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);display:block;margin-bottom:0}
.rpt-value{font-size:10px;color:var(--texto);font-weight:500}

/* Bloco de texto longo */
.rpt-text-block{background:var(--cinza);border-radius:3px;padding:5px 7px;font-size:9.5px;line-height:1.5;color:var(--texto);white-space:pre-wrap;word-break:break-word}

/* Peças */
.pecas-table{width:100%;border-collapse:collapse;font-size:9px}
.pecas-table th{background:var(--rep);color:#fff;padding:3px 6px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.05em}
.pecas-table td{padding:3px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.pecas-table tr:last-child td{border-bottom:none}
.pecas-table tr:nth-child(even) td{background:#fafafa}
.pecas-table .td-qtd{text-align:center;font-weight:700;width:3rem}

/* Checklist */
.cl-table{width:100%;border-collapse:collapse;font-size:9px}
.cl-table td{padding:2px 4px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.cl-table tr:last-child td{border-bottom:none}
.cl-num{width:1.5rem;color:var(--muted);text-align:right;padding-right:6px}
.cl-texto{flex:1}
.cl-badge{text-align:right;width:2.5rem}
.badge-sim{background:#dcfce7;color:#166534;padding:1px 5px;border-radius:3px;font-size:7.5px;font-weight:700}
.badge-nao{background:#fee2e2;color:#991b1b;padding:1px 5px;border-radius:3px;font-size:7.5px;font-weight:700}
.badge-nd{background:#f1f5f9;color:#64748b;padding:1px 5px;border-radius:3px;font-size:7.5px;font-weight:700}

/* Fotos */
.fotos-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.foto-item img{max-width:140px;max-height:100px;object-fit:cover;border-radius:3px;border:1px solid var(--borda)}

/* Assinatura */
.rpt-assinatura-bloco{display:flex;gap:20px;align-items:flex-start}
.rpt-assinatura-left{flex:1}
.rpt-assinatura-right{flex:1;text-align:center}
.rpt-assinatura-canvas{display:block;max-width:200px;max-height:70px;object-fit:contain;margin:0 auto 2px}
.rpt-assinatura-label{font-size:7.5px;color:var(--muted);text-align:center;margin-top:2px;padding-top:3px;border-top:1px solid var(--borda)}
.rpt-assinatura-nome{font-size:9px;font-weight:700;color:var(--texto);text-align:center;margin-bottom:1px}
.rpt-assinatura-legenda{margin-top:4px;font-size:8px;color:var(--muted);text-align:center;line-height:1.35}

/* Aviso ISTOBAL */
.rpt-istobal-badge{display:inline-flex;align-items:center;gap:4px;background:#fff7ed;color:var(--rep);border:1px solid var(--rep-borda);border-radius:3px;padding:1px 6px;font-size:8px;font-weight:700;margin-left:6px}

/* Rodapé */
.rpt-footer{border-top:1px solid var(--borda);padding-top:5px;text-align:center;font-size:8px;color:var(--muted);margin-top:10px}
</style>
</head>
<body>

<!-- Cabeçalho -->
<section>
  <div class="rpt-header">
    <div class="rpt-logos">
      <div class="rpt-logo">
        <img src="${C}" alt="Navel" onerror="this.parentNode.innerHTML='<span class=\\'rpt-logo-fallback\\'>NAVEL</span>'" />
      </div>
      ${m?`
      <div class="rpt-logo-istobal">
        <img src="${m}" alt="${t(O)}" onerror="this.parentNode.style.display='none'" />
      </div>`:""}
    </div>
    <div class="rpt-empresa">
      <strong>${t(i.nome)}</strong>
      ${t(i.divisaoComercial)}<br>
      ${t(i.sede)}<br>
      ${t(i.telefones)} · <a href="https://${t(i.web)}">${t(i.web)}</a>
    </div>
  </div>
  <div class="rpt-titulo-bar">
    <h1>Relatório de Reparação${r?.origem==="istobal_email"?' <span class="rpt-istobal-badge">⚡ ISTOBAL</span>':""}</h1>
    <div class="rpt-num-wrap">
      <span class="rpt-num-label">Nº Relatório</span>
      <span class="rpt-num">${t(a.numeroRelatorio??"—")}</span>
    </div>
  </div>
  <div class="rpt-acento"></div>
</section>

<!-- Dados gerais -->
<section>
  <div class="rpt-section-title">Dados da Intervenção</div>
  <div class="rpt-grid">
    <div class="rpt-field"><span class="rpt-label">Data de realização</span><span class="rpt-value">${t(T)}</span></div>
    <div class="rpt-field"><span class="rpt-label">Data de emissão do relatório</span><span class="rpt-value">${t(j)}</span></div>
    <div class="rpt-field"><span class="rpt-label">Técnico</span><span class="rpt-value">${t(a.tecnico??"—")}</span></div>
    <div class="rpt-field"><span class="rpt-label">Equipamento</span><span class="rpt-value">${L}</span></div>
    <div class="rpt-field"><span class="rpt-label">Cliente</span><span class="rpt-value">${t(o?.nome??"—")}</span></div>
    ${a.numeroAviso?`<div class="rpt-field"><span class="rpt-label">Nº Aviso / Pedido</span><span class="rpt-value">${t(a.numeroAviso)}</span></div>`:""}
    ${a.horasMaoObra!=null?`<div class="rpt-field"><span class="rpt-label">Horas de mão de obra</span><span class="rpt-value">${t(String(a.horasMaoObra))} h</span></div>`:""}
    ${o?.morada?`<div class="rpt-field"><span class="rpt-label">Localização</span><span class="rpt-value">${t(o.morada)}${o.localidade?`, ${t(o.localidade)}`:""}</span></div>`:""}
    ${s?.numeroSerie?`<div class="rpt-field"><span class="rpt-label">Nº de Série</span><span class="rpt-value">${t(s.numeroSerie)}</span></div>`:""}
  </div>
</section>

<!-- Avaria -->
${a.descricaoAvaria?`
<section>
  <div class="rpt-section-title">Avaria / Problema Reportado</div>
  <div class="rpt-text-block">${t(a.descricaoAvaria)}</div>
</section>
`:""}

<!-- Trabalho realizado -->
${a.trabalhoRealizado?`
<section>
  <div class="rpt-section-title">Trabalho Realizado</div>
  <div class="rpt-text-block">${t(a.trabalhoRealizado)}</div>
</section>
`:""}

<!-- Peças / Consumíveis -->
${I?`
<section>
  <div class="rpt-section-title">Peças / Consumíveis Utilizados</div>
  <table class="pecas-table">
    <thead>
      <tr><th>Código</th><th>Descrição</th><th class="td-qtd">Qtd</th></tr>
    </thead>
    <tbody>
      ${l.filter(e=>e.descricao?.trim()||e.codigo?.trim()).map(e=>`<tr><td>${t(e.codigo??"—")}</td><td>${t(e.descricao??"—")}</td><td class="td-qtd">${t(String(e.quantidade??1))}</td></tr>`).join("")}
    </tbody>
  </table>
</section>
`:""}

<!-- Checklist -->
${U?`
<section>
  <div class="rpt-section-title">Checklist de Verificação</div>
  <table class="cl-table">
    <tbody>
      ${u.map(F).join("")}
    </tbody>
  </table>
</section>
`:""}

<!-- Notas -->
${a.notas?`
<section>
  <div class="rpt-section-title">Notas / Observações</div>
  <div class="rpt-text-block">${t(a.notas)}</div>
</section>
`:""}

<!-- Fotos -->
${$.length>0?`
<section class="section-can-break">
  <div class="rpt-section-title">Documentação Fotográfica</div>
  <div class="fotos-grid">
    ${$.map((e,p)=>`<div class="foto-item"><img src="${e}" alt="Foto ${p+1}" /></div>`).join("")}
  </div>
</section>
`:""}

<!-- Assinatura -->
<section class="no-break">
  <div class="rpt-section-title">Assinatura e Declaração</div>
  <div class="rpt-assinatura-bloco">
    <div class="rpt-assinatura-left">
      <div class="rpt-field"><span class="rpt-label">Data</span><span class="rpt-value">${t(E)}</span></div>
      ${a.nomeAssinante?`<div class="rpt-field"><span class="rpt-label">Assinado por</span><span class="rpt-value">${t(a.nomeAssinante)}</span></div>`:""}
      ${o?.nome?`<div class="rpt-field"><span class="rpt-label">Entidade</span><span class="rpt-value">${t(o.nome)}</span></div>`:""}
      <p style="font-size:8px;color:#64748b;margin-top:6px;line-height:1.5;">
        O cliente declara ter recebido e aprovado a intervenção descrita neste documento.
      </p>
    </div>
    <div class="rpt-assinatura-right">
      ${x?`<img class="rpt-assinatura-canvas" src="${x}" alt="Assinatura digital" />`:'<div style="height:60px;border-bottom:1px solid #cbd5e1;margin-bottom:4px;"></div>'}
      <div class="rpt-assinatura-nome">${t(a.nomeAssinante??"—")}</div>
      <div class="rpt-assinatura-label">Assinatura do Cliente</div>
      <div class="rpt-assinatura-legenda">Relatório assinado pelo cliente / responsável no local: <strong>${t(a.nomeAssinante??"—")}</strong></div>
    </div>
  </div>
</section>

<!-- Rodapé -->
<div class="rpt-footer">
  ${t(J)} · Relatório de Reparação ${t(a.numeroRelatorio??"")}
</div>

</body>
</html>`}export{q as relatorioReparacaoParaHtml};
