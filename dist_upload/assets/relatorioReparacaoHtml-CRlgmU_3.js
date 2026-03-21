import{f as w,v as A}from"./index-BUMVVrTU.js";import{a as Y,e as G}from"./sanitize-Bc5btBtG.js";import{g as W}from"./emailConfig-C2BdRTvi.js";import{M as Z}from"./limits-C3hP4_4k.js";import{a as q,T as r,P as s,c as aa,h as ta,d as ea,e as sa,b as oa}from"./relatorioBaseStyles-B9A9iJcy.js";import"./vendor-Bk0NZ5Or.js";import"./vendor-pdf-hYLUQ4hX.js";import"./vendor-icons-BCyyJ6Nm.js";import"./vendor-datefns-CCZTWiZ_.js";function k(a,l){const e=String(a??"").trim();return/^#[0-9a-fA-F]{6}$/.test(e)?e.toLowerCase():/^#[0-9a-fA-F]{3}$/.test(e)?`#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}`.toLowerCase():l}function N(a,l){const e=k(a,"#000000"),i=Number.parseInt(e.slice(1,3),16),b=Number.parseInt(e.slice(3,5),16),g=Number.parseInt(e.slice(5,7),16);return`rgba(${i}, ${b}, ${g}, ${l})`}function fa(a,l,e,i,b=[],g={}){if(!a)return"";const{subcategoriaNome:m,logoUrl:R,istobalLogoUrl:C,tecnicoObj:f}=g,S=R??"/manut/logo-navel.png",O=C??"/manut/logo-istobal.png",o=G,x=l?.origem==="istobal_email"||/istobal/i.test(String(e?.marca??""))||/istobal/i.test(String(m??"")),P=e?.marcaLogoUrl||(x?O:""),T=e?.marca?`Logotipo ${e.marca}`:"Logotipo da marca",c=k(e?.marcaCorHex,x?"#c8102e":"#b45309"),$=N(c,.09),D=N(c,.28),L=a.dataCriacao?w(a.dataCriacao,!0):"—",B=a.dataAssinatura?A(a.dataAssinatura):"Pendente de assinatura",v=a.dataRealizacao||l?.data||a.dataAssinatura||a.dataCriacao,I=v?w(v,!0):"Pendente de preenchimento",M=a.dataCriacao?A(a.dataCriacao):"—",U=e&&m?o(`${m} — ${e.marca} ${e.modelo} — Nº Série: ${e.numeroSerie}`):e?o(`${e.marca} ${e.modelo} — Nº Série: ${e.numeroSerie}`):"—";let n=[];try{const t=typeof a.pecasUsadas=="string"?JSON.parse(a.pecasUsadas||"[]"):a.pecasUsadas??[];n=Array.isArray(t)?t:[]}catch{}const H=n.length>0&&n.some(t=>t.descricao?.trim());let u={};try{const t=typeof a.checklistRespostas=="string"?JSON.parse(a.checklistRespostas||"{}"):a.checklistRespostas??{};u=t&&typeof t=="object"&&!Array.isArray(t)?t:{}}catch{}const h=Object.entries(u),E=h.length>0;let z=[];try{const t=typeof a.fotos=="string"?JSON.parse(a.fotos||"[]"):a.fotos??[];z=Array.isArray(t)?t:[]}catch{}const K=z.map(t=>Y(t)).filter(Boolean).slice(0,Z),y={};b.forEach(t=>{y[t.id]=t.texto??t.descricao??t.nome??t.id});const j=([t,d],p)=>{const Q=y[t]??t,V=d==="OK"?'<span class="badge-sim" style="background:#dcfce7;color:#14532d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #86efac">OK</span>':d==="NOK"?'<span class="badge-nao" style="background:#fee2e2;color:#7f1d1d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #fca5a5">NOK</span>':`<span class="badge-nd" style="color:${s.muted}">N/A</span>`,X=p%2===1?`;background:${s.cinza}`:"";return`<tr style="border-bottom:1px solid ${s.bordaLeve}${X}"><td class="cl-num" style="width:1.6em;color:${s.muted};font-size:${r.label};padding:3px 4px;white-space:nowrap;vertical-align:top;text-align:right;padding-right:6px">${p+1}.</td><td class="cl-texto" style="padding:3px 6px 3px 4px;vertical-align:top;font-size:${r.pequeno};color:${s.texto}">${o(Q)}</td><td class="cl-badge" style="width:32px;text-align:center;padding:3px 2px;white-space:nowrap;vertical-align:top">${V}</td></tr>`},F=l?.origem==="istobal_email"?' <span class="rpt-istobal-badge">⚡ ISTOBAL</span>':"",J=q("Relatório de Reparação","Nº Relatório",a.numeroRelatorio??"—",F),_=`
/* ── Reparação: variáveis de marca ── */
:root { --rep: ${c}; --rep-bg: ${$}; --rep-borda: ${D} }

/* Bloco de texto longo */
.rpt-text-block {
  background: var(--cinza); border-radius: 3px; padding: 5px 7px;
  font-size: 9.5px; line-height: 1.5; color: var(--texto);
  white-space: pre-wrap; word-break: break-word;
}

/* Peças (reparação: código, descrição, qtd) */
.pecas-table .td-qtd { text-align: center; font-weight: 700; width: 3rem }

/* Checklist reparação (OK/NOK/N/A) */
.cl-table { width: 100%; border-collapse: collapse; font-size: 9.5px }
.cl-table td { padding: 2px 4px; border-bottom: 1px solid var(--borda-leve); vertical-align: middle }
.cl-table tr:last-child td { border-bottom: none }
.cl-num { width: 1.5rem; color: var(--muted); text-align: right; padding-right: 6px }
.cl-texto { flex: 1 }
.cl-badge { text-align: right; width: 2.5rem }

/* Aviso ISTOBAL */
.rpt-istobal-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: #fff7ed; color: var(--rep);
  border: 1px solid var(--rep-borda); border-radius: 3px;
  padding: 1.5px 6px; font-size: 8.5px; font-weight: 700; margin-left: 6px;
}
`;return`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Reparação ${o(a.numeroRelatorio??"")} — Navel</title>
<style>
${aa(c,$)}
${_}
</style>
</head>
<body>

<section>
${ta(S,P,T)}
${J}
</section>

<!-- Dados gerais -->
<section>
  <div class="rpt-section-title">Dados da Intervenção</div>
  <div class="rpt-grid">
    <div class="rpt-field"><span class="rpt-label">Data de realização</span><span class="rpt-value">${o(I)}</span></div>
    <div class="rpt-field"><span class="rpt-label">Data de emissão do relatório</span><span class="rpt-value">${o(L)}</span></div>
    <div class="rpt-field"><span class="rpt-label">Técnico</span><span class="rpt-value">${o(a.tecnico??"—")}</span></div>
    <div class="rpt-field"><span class="rpt-label">Equipamento</span><span class="rpt-value">${U}</span></div>
    <div class="rpt-field"><span class="rpt-label">Cliente</span><span class="rpt-value">${o(i?.nome??"—")}</span></div>
    ${a.numeroAviso?`<div class="rpt-field"><span class="rpt-label">Nº Aviso / Pedido</span><span class="rpt-value">${o(a.numeroAviso)}</span></div>`:""}
    ${a.horasMaoObra!=null?`<div class="rpt-field"><span class="rpt-label">Horas de mão de obra</span><span class="rpt-value">${o(String(a.horasMaoObra))} h</span></div>`:""}
    ${i?.morada?`<div class="rpt-field"><span class="rpt-label">Localização</span><span class="rpt-value">${o(i.morada)}${i.localidade?`, ${o(i.localidade)}`:""}</span></div>`:""}
    ${e?.numeroSerie?`<div class="rpt-field"><span class="rpt-label">Nº de Série</span><span class="rpt-value">${o(e.numeroSerie)}</span></div>`:""}
  </div>
</section>

<!-- Avaria -->
${a.descricaoAvaria?`
<section>
  <div class="rpt-section-title">Avaria / Problema Reportado</div>
  <div class="rpt-text-block">${o(a.descricaoAvaria)}</div>
</section>
`:""}

<!-- Trabalho realizado -->
${a.trabalhoRealizado?`
<section>
  <div class="rpt-section-title">Trabalho Realizado</div>
  <div class="rpt-text-block">${o(a.trabalhoRealizado)}</div>
</section>
`:""}

<!-- Peças / Consumíveis -->
${H?`
<section>
  <div class="rpt-section-title" style="font-size:${r.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${s.azulNavel};border-bottom:1.5px solid ${s.azulNavel};padding-bottom:3px;margin-bottom:6px">Peças / Consumíveis Utilizados</div>
  <table class="pecas-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:${r.pequeno};margin-bottom:4px">
    <thead>
      <tr>
        <th style="background:${s.azulNavel};color:#fff;padding:4px 6px;text-align:left;font-size:${r.label};text-transform:uppercase;letter-spacing:.04em">Código</th>
        <th style="background:${s.azulNavel};color:#fff;padding:4px 6px;text-align:left;font-size:${r.label};text-transform:uppercase;letter-spacing:.04em">Descrição</th>
        <th style="background:${s.azulNavel};color:#fff;padding:4px 6px;text-align:center;font-size:${r.label};text-transform:uppercase;letter-spacing:.04em;width:3rem">Qtd</th>
      </tr>
    </thead>
    <tbody>
      ${n.filter(t=>t.descricao?.trim()||t.codigo?.trim()).map((t,d)=>{const p=d%2===1?`;background:${s.cinza}`:"";return`<tr style="border-bottom:1px solid ${s.bordaLeve}${p}"><td style="padding:3px 6px;vertical-align:middle;font-size:${r.pequeno};color:${s.texto};font-family:'Courier New',monospace">${o(t.codigo??"—")}</td><td style="padding:3px 6px;vertical-align:middle;font-size:${r.pequeno};color:${s.texto}">${o(t.descricao??"—")}</td><td class="td-qtd" style="padding:3px 6px;vertical-align:middle;text-align:center;font-weight:700;font-size:${r.pequeno};color:${s.texto}">${o(String(t.quantidade??1))}</td></tr>`}).join("")}
    </tbody>
  </table>
</section>
`:""}

<!-- Checklist -->
${E?`
<section>
  <div class="rpt-section-title" style="font-size:${r.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${s.azulNavel};border-bottom:1.5px solid ${s.azulNavel};padding-bottom:3px;margin-bottom:6px">Checklist de Verificação</div>
  <table class="cl-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:${r.pequeno}">
    <tbody>
      ${h.map(j).join("")}
    </tbody>
  </table>
</section>
`:""}

<!-- Notas -->
${a.notas?`
<section>
  <div class="rpt-section-title" style="font-size:${r.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${s.azulNavel};border-bottom:1.5px solid ${s.azulNavel};padding-bottom:3px;margin-bottom:6px">Notas / Observações</div>
  <div class="rpt-text-block" style="background:rgba(26,72,128,0.10);border-left:3px solid ${s.azulNavel};padding:7px 10px;border-radius:0 4px 4px 0;font-size:${r.corpo};color:${s.texto};line-height:1.5;white-space:pre-wrap;word-break:break-word">${o(a.notas)}</div>
</section>
`:""}

${ea(K)}

<!-- Assinatura e declaração (página do cliente) + rodapé -->
${sa({tecnicoNome:a.tecnico??"—",tecnicoTelefone:f?.telefone??"",tecnicoAssinatura:f?.assinaturaDigital??"",clienteNome:a.nomeAssinante??"—",clienteAssinatura:a.assinaturaDigital??"",dataCriacao:M,dataAssinatura:B,declaracaoTexto:W("reparacao"),proximasManutencoes:[]})}

${oa("",`Relatório de Reparação ${a.numeroRelatorio??""}`)}

</body>
</html>`}export{fa as relatorioReparacaoParaHtml};
