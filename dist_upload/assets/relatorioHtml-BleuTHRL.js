import{a as N,f as D}from"./datasAzores-CBhl9I61.js";import{D as ta}from"./relatorio-BzlDvam2.js";import{a as U,e as oa}from"./emailConfig-CkDfPUDM.js";import{s as ra,I as ia,A as la,p as na,q as H,x as pa}from"./index-Bi7PFevD.js";import{E as d}from"./empresa-DQbPD-Qf.js";function F(s,r){const a=String(s??"").trim();return/^#[0-9a-fA-F]{6}$/.test(a)?a.toLowerCase():/^#[0-9a-fA-F]{3}$/.test(a)?`#${a[1]}${a[1]}${a[2]}${a[2]}${a[3]}${a[3]}`.toLowerCase():r}function da(s,r){const a=F(s,"#000000"),w=Number.parseInt(a.slice(1,3),16),c=Number.parseInt(a.slice(3,5),16),y=Number.parseInt(a.slice(5,7),16);return`rgba(${w}, ${c}, ${y}, ${r})`}function ma(s,r,a,w,c=[],y={}){if(!s)return"";const{subcategoriaNome:A,ultimoEnvio:m,logoUrl:I,istobalLogoUrl:O}=y,_=I??"/manut/logo-navel.png",Q=O??"/manut/logo-istobal.png",e=oa,T=/istobal/i.test(String(a?.marca??""))||/istobal/i.test(String(A??"")),R=a?.marcaLogoUrl||(T?Q:""),V=a?.marca?`Logotipo ${a.marca}`:"Logotipo da marca",v=F(a?.marcaCorHex,T?"#c8102e":"#1a4880"),B=da(v,.12),b=!!(s.tipoManutKaeser||ra(a?.marca)),u=s.tipoManutKaeser??"",x=u?ia[u]:null,g=a?.posicaoKaeser??null,S=g!=null?pa(g):null,P=g!=null?H(g):null,j=S!=null?H(S):null,G=s.dataCriacao?N(s.dataCriacao):"—",X=s.dataAssinatura?N(s.dataAssinatura):"Pendente de assinatura",Y=r?.data?D(r.data,!0):"—",J=s.dataAssinatura?D(s.dataAssinatura,!0):s.dataCriacao?D(s.dataCriacao,!0):"Pendente de preenchimento",W=a&&A?e(`${A} — ${a.marca} ${a.modelo} — Nº Série: ${a.numeroSerie}`):a?e(`${a.marca} ${a.modelo} — Nº Série: ${a.numeroSerie}`):"—",M=m?.data&&m?.destinatario?`Último envio por email: ${N(m.data)} para ${e(m.destinatario)}`:null,Z=e(r?.tecnico||s?.tecnico||"—"),K=s.assinaturaDigital?U(s.assinaturaDigital):"",C=Math.ceil((c??[]).length/2),q=(c??[]).slice(0,C),aa=(c??[]).slice(C),E=(l,o,i=0)=>{const n=s.checklistRespostas?.[l.id],f=n==="sim"?'<span class="badge-sim">SIM</span>':n==="nao"?'<span class="badge-nao">NÃO</span>':'<span class="badge-nd">—</span>';return`<tr><td class="cl-num">${o+i+1}.</td><td class="cl-texto">${e(l.texto)}</td><td class="cl-badge">${f}</td></tr>`};let p=`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Manutenção — Navel</title>
<style>
/* ── Página A4, margens de impressão ── */
@page{size:A4 portrait;margin:8mm 11mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;line-height:1.42;color:#1a1a2e;background:#fff;padding:0}

/* ── Paleta ── */
:root{
  --azul:${v};--azul-med:${v};--azul-claro:${B};
  --cinza:#f4f6f8;--borda:#c6d8ec;--texto:#1a1a2e;--muted:#5a6a7e;
  --verde:#16a34a;--vermelho:#dc2626;--acento:${v};
  --kaeser:#b45309;--kaeser-bg:#fffbeb;--kaeser-borda:#fde68a;
}

/* ── Quebras de página ── */
section{margin-bottom:10px;page-break-inside:avoid}
.section-can-break{page-break-inside:auto}
.page-break-before{page-break-before:always}
.no-break{page-break-inside:avoid}

/* ── Cabeçalho ── */
.rpt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:2.5px solid var(--azul)}
.rpt-logos{display:flex;align-items:center;gap:10px}
.rpt-logo img{max-height:42px;max-width:170px;object-fit:contain;display:block}
.rpt-logo-istobal img{max-height:42px;max-width:170px;object-fit:contain;display:block}
.rpt-logo-fallback{font-size:1.2em;font-weight:700;color:var(--azul)}
.rpt-empresa{text-align:right;font-size:9px;line-height:1.5;color:var(--muted)}
.rpt-empresa strong{display:block;font-size:10px;color:var(--azul);margin-bottom:1px}
.rpt-empresa a{color:var(--azul-med);text-decoration:none}

/* ── Título ── */
.rpt-titulo-bar{display:flex;align-items:center;justify-content:space-between;background:var(--azul);color:#fff;padding:5px 10px;margin:7px 0 0;border-radius:3px}
.rpt-titulo-bar h1{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rpt-num-wrap{text-align:right}
.rpt-num-label{font-size:8px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;display:block}
.rpt-num{font-size:14px;font-weight:800;letter-spacing:.04em;font-family:'Courier New',monospace}
.rpt-acento{height:2px;background:linear-gradient(90deg,var(--acento),var(--azul-med));margin-bottom:8px;border-radius:0 0 2px 2px}

/* ── Secções ── */
.rpt-section-title{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--azul-med);border-bottom:1px solid var(--borda);padding-bottom:2px;margin-bottom:5px}

/* ── Grid de dados (2 colunas) ── */
.rpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px}
.rpt-field{padding:2.5px 0;border-bottom:1px solid #edf2f7}
.rpt-field:last-child{border-bottom:none}
.rpt-label{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);display:block;margin-bottom:0}
.rpt-value{font-size:10.5px;color:var(--texto)}
.rpt-field--full{grid-column:1/-1}

/* ── Bloco KAESER ── */
.kaeser-band{background:var(--kaeser-bg);border:1.5px solid var(--kaeser-borda);border-radius:5px;margin-bottom:9px;overflow:hidden;page-break-inside:avoid}
.kaeser-band-header{background:var(--kaeser);color:#fff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.kaeser-band-titulo{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.kaeser-band-subtitulo{font-size:9px;opacity:.85}
.kaeser-band-body{padding:7px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 14px}
.kaeser-item{}
.kaeser-item-label{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;display:block;margin-bottom:1px}
.kaeser-item-valor{font-size:11px;font-weight:600;color:var(--texto)}
.kaeser-item-valor.destaque{font-size:13px;font-weight:800;color:var(--kaeser)}
.kaeser-item-val-sub{font-size:8.5px;color:var(--muted);display:block}
.kaeser-seq{grid-column:1/-1;margin-top:4px;border-top:1px solid var(--kaeser-borda);padding-top:5px}
.kaeser-seq-label{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;margin-bottom:3px}
.kaeser-seq-dots{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.kaeser-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1.5px solid transparent;flex-shrink:0}
.kaeser-dot.passado{background:#e5e7eb;color:#6b7280;border-color:#d1d5db}
.kaeser-dot.atual{background:var(--kaeser);color:#fff;border-color:var(--kaeser)}
.kaeser-dot.proximo{background:#fff;color:var(--kaeser);border-color:var(--kaeser)}
.kaeser-dot.futuro{background:#f9fafb;color:#9ca3af;border-color:#e5e7eb}
.kaeser-dot-sep{color:#9ca3af;font-size:10px;padding:0 1px}

/* ── Checklist coluna única ── */
.checklist-1col{width:100%}
.checklist-2col{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.checklist-table{width:100%;border-collapse:collapse;font-size:9.5px}
.checklist-table tr:nth-child(even){background:var(--cinza)}
.checklist-table td{padding:2.8px 4px;border-bottom:1px solid #edf2f7;vertical-align:top}
.checklist-table td.cl-num{width:1.6em;color:var(--muted);font-size:8.5px;padding-left:2px;white-space:nowrap}
.checklist-table td.cl-texto{padding-right:6px}
.checklist-table td.cl-badge{width:32px;text-align:center;padding-right:2px;white-space:nowrap}
.badge-sim{background:rgba(22,163,74,.15);color:var(--verde);padding:1px 5px;border-radius:8px;font-size:8.5px;font-weight:700}
.badge-nao{background:rgba(220,38,38,.12);color:var(--vermelho);padding:1px 5px;border-radius:8px;font-size:8.5px;font-weight:700}
.badge-nd{color:var(--muted);font-size:9px}

/* ── Notas ── */
.rpt-notas{background:var(--azul-claro);border-left:2.5px solid var(--azul-med);padding:5px 9px;border-radius:0 3px 3px 0;font-size:10px;color:var(--texto)}

/* ── Fotos ── */
.rpt-fotos-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}
.rpt-fotos-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:3px;border:1px solid var(--borda);display:block}

/* ── Peças e consumíveis ── */
.pecas-table{width:100%;border-collapse:collapse;font-size:9.5px}
.pecas-table thead{display:table-header-group}
.pecas-table th{background:var(--azul);color:#fff;padding:4px 6px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em}
.pecas-table td{padding:3px 6px;border-bottom:1px solid #edf2f7;vertical-align:middle}
.pecas-table tr.row-usado td{background:#f0fdf4}
.pecas-table tr.row-nao-usado td{background:#fafafa;color:#9ca3af}
.pecas-table tr.row-nao-usado .cell-desc{text-decoration:line-through}
.pecas-table .cell-status{width:20px;text-align:center;font-size:11px;font-weight:700}
.pecas-table .cell-pos{width:46px;color:var(--muted);font-family:'Courier New',monospace;font-size:8.5px}
.pecas-table .cell-code{width:118px;font-family:'Courier New',monospace;font-size:9px}
.pecas-table .cell-qty{width:36px;text-align:right;font-weight:600}
.pecas-table .cell-un{width:34px;color:var(--muted);font-size:8.5px}
.pecas-group-row td{background:var(--cinza)!important;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:3px 6px;page-break-after:avoid}
.pecas-group-usado td{border-left:3px solid var(--verde);color:var(--verde)}
.pecas-group-nao-usado td{border-left:3px solid #9ca3af}
.pecas-resumo{display:flex;gap:16px;padding:4px 6px;background:var(--cinza);border-top:1.5px solid var(--borda);font-size:9px}
.pecas-resumo-item{display:flex;align-items:center;gap:4px}
.pecas-resumo-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.pecas-resumo-dot.verde{background:var(--verde)}
.pecas-resumo-dot.cinza{background:#9ca3af}

/* ── Assinatura + declaração lado a lado ── */
.rpt-bottom{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}
.rpt-assinatura-box{background:var(--cinza);border:1px solid var(--borda);border-radius:4px;padding:7px 10px}
.rpt-assinatura-img img{max-width:180px;max-height:70px;border:1px solid var(--borda);border-radius:3px;margin-top:4px;background:#fff;display:block}
.rpt-assinatura-legenda{margin-top:5px;font-size:8px;color:var(--muted);line-height:1.35}
.rpt-declaracao{background:var(--cinza);border:1px solid var(--borda);border-radius:4px;padding:7px 10px;font-size:8.5px;color:var(--muted);line-height:1.55}

/* ── Rodapé ── */
.rpt-footer{margin-top:8px;padding-top:6px;border-top:1px solid var(--borda);display:flex;justify-content:space-between;font-size:8.5px;color:var(--muted)}
</style>
</head>
<body>

<header class="rpt-header">
  <div class="rpt-logos">
    <div class="rpt-logo">
      <img src="${_}" alt="Navel"
        onerror="this.parentNode.innerHTML='<span class=rpt-logo-fallback>Navel</span>'">
    </div>
    ${R?`
    <div class="rpt-logo-istobal">
      <img src="${R}" alt="${e(V)}" onerror="this.parentNode.style.display='none'">
    </div>`:""}
  </div>
  <div class="rpt-empresa">
    <strong>${e(d.nome)}</strong>
    ${e(d.divisaoComercial)}<br>
    ${e(d.sede)}<br>
    ${e(d.telefones)} &nbsp;|&nbsp; <a href="https://${d.web}">${d.web}</a><br>
    ${e(d.pais)}
  </div>
</header>

<div class="rpt-titulo-bar">
  <h1>Relatório de Manutenção${b?" — Compressor":""}</h1>
  <div class="rpt-num-wrap">
    <span class="rpt-num-label">Nº de Serviço</span>
    <span class="rpt-num">${e(s?.numeroRelatorio??r?.id??"—")}</span>
  </div>
</div>
<div class="rpt-acento"></div>`;if(b){const l=x?.label??(u?`Tipo ${u}`:"Compressor"),o=x?.descricao??"",i=a?.horasTotaisAcumuladas??form?.horasTotais??null,n=a?.horasServicoAcumuladas??form?.horasServico??null,f=a?.anoFabrico??"—",h=e(a?.marca??"—"),t=e(a?.modelo??"—"),k=e(a?.numeroSerie??"—"),L=e(a?.numeroDocumentoVenda??""),ea=na.map((sa,$)=>{let z="futuro";return g!=null&&($<g?z="passado":$===g?z="atual":$===S&&(z="proximo")),`<span class="kaeser-dot ${z}" title="Ano ${$+1}">${sa}</span>`}).join('<span class="kaeser-dot-sep">·</span>');p+=`
<div class="kaeser-band">
  <div class="kaeser-band-header">
    <span class="kaeser-band-titulo">Manutenção KAESER — ${e(l)}</span>
    ${o?`<span class="kaeser-band-subtitulo">${e(o)}</span>`:""}
  </div>
  <div class="kaeser-band-body">
    <div class="kaeser-item">
      <span class="kaeser-item-label">Fabricante / Modelo</span>
      <span class="kaeser-item-valor">${h} ${t}</span>
    </div>
    <div class="kaeser-item">
      <span class="kaeser-item-label">Número de série</span>
      <span class="kaeser-item-valor destaque">${k}</span>
    </div>
    <div class="kaeser-item">
      <span class="kaeser-item-label">Ano de fabrico</span>
      <span class="kaeser-item-valor">${f}</span>
      ${L?`<span class="kaeser-item-val-sub">Doc. venda: ${L}</span>`:""}
    </div>
    ${i!=null?`
    <div class="kaeser-item">
      <span class="kaeser-item-label">Horas totais acumuladas</span>
      <span class="kaeser-item-valor destaque">${i} h</span>
    </div>`:""}
    ${n!=null?`
    <div class="kaeser-item">
      <span class="kaeser-item-label">Horas de serviço</span>
      <span class="kaeser-item-valor">${n} h</span>
    </div>`:""}
    ${P?`
    <div class="kaeser-item">
      <span class="kaeser-item-label">Ciclo efectuado</span>
      <span class="kaeser-item-valor">${e(P)}</span>
      ${j?`<span class="kaeser-item-val-sub">Próxima: ${e(j)}</span>`:""}
    </div>`:""}
    <div class="kaeser-seq">
      <div class="kaeser-seq-label">Sequência do ciclo de manutenção (12 anos)</div>
      <div class="kaeser-seq-dots">
        ${ea}
        ${g!=null?`<span style="font-size:8px;color:#9ca3af;margin-left:6px">
          ● Efectuado &nbsp; ○ Próximo &nbsp; · Futuro
        </span>`:""}
      </div>
    </div>
  </div>
</div>`}if(p+=`
<section>
  <div class="rpt-section-title">Dados da manutenção</div>
  <div class="rpt-grid">
    <div class="rpt-field">
      <span class="rpt-label">Data agendada</span>
      <span class="rpt-value">${Y}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Data de realização</span>
      <span class="rpt-value">${J}</span>
    </div>
    ${b?"":`
    <div class="rpt-field rpt-field--full">
      <span class="rpt-label">Equipamento</span>
      <span class="rpt-value">${W}</span>
    </div>`}
    <div class="rpt-field">
      <span class="rpt-label">Cliente</span>
      <span class="rpt-value">${e(w?.nome??"—")}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Técnico responsável</span>
      <span class="rpt-value">${Z}</span>
    </div>
    ${(r?.horasTotais!=null||r?.horasServico!=null)&&!b?`
    <div class="rpt-field rpt-field--full">
      <span class="rpt-label">Contadores de horas</span>
      <span class="rpt-value">${r.horasTotais!=null?`Total: ${r.horasTotais} h`:""}${r.horasTotais!=null&&r.horasServico!=null?" · ":""}${r.horasServico!=null?`Serviço: ${r.horasServico} h`:""}</span>
    </div>`:""}
  </div>
</section>`,c?.length>0&&(b?p+=`
<section class="section-can-break">
  <div class="rpt-section-title">Checklist de verificação — ${c.length} pontos</div>
  <div class="checklist-1col">
    <table class="checklist-table"><tbody>
      ${(c??[]).map((l,o)=>E(l,o,0)).join("")}
    </tbody></table>
  </div>
</section>`:p+=`
<section>
  <div class="rpt-section-title">Checklist de verificação</div>
  <div class="checklist-2col">
    <table class="checklist-table"><tbody>
      ${q.map((l,o)=>E(l,o,0)).join("")}
    </tbody></table>
    <table class="checklist-table"><tbody>
      ${aa.map((l,o)=>E(l,o,C)).join("")}
    </tbody></table>
  </div>
</section>`),(s.notas||s.fotos?.length>0)&&(p+='<section><div class="rpt-section-title">Notas e fotografias</div>',s.notas&&(p+=`<div class="rpt-notas">${e(s.notas).replace(/\n/g,"<br>")}</div>`),s.fotos?.length>0&&(p+='<div class="rpt-fotos-grid">',s.fotos.forEach((l,o)=>{const i=U(l);i&&(p+=`<img src="${i}" alt="Fotografia ${o+1}">`)}),p+="</div>"),p+="</section>"),s.pecasUsadas?.length>0){const l=t=>"usado"in t?t:{...t,usado:(t.quantidadeUsada??t.quantidade??0)>0},o=s.pecasUsadas.map(l),i=o.filter(t=>t.usado),n=o.filter(t=>!t.usado),f=u?`Consumíveis e peças — Manutenção Tipo ${u}${x?` · ${x.label}`:""}`:"Consumíveis e peças",h=(t,k)=>`
      <tr class="${k} no-break">
        <td class="cell-status">${k==="row-usado"?"✓":"✗"}</td>
        <td class="cell-pos">${e(t.posicao??"")}</td>
        <td class="cell-code">${e(t.codigoArtigo??"")}</td>
        <td>${e(t.descricao??"")}</td>
        <td class="cell-qty">${t.quantidade??""}</td>
        <td class="cell-un">${e(t.unidade??"")}</td>
      </tr>`;p+=`
<section class="section-can-break${b?" page-break-before":""}">
  <div class="rpt-section-title">${f}</div>
  <table class="pecas-table">
    <thead>
      <tr>
        <th style="width:20px"></th>
        <th style="width:46px">Pos.</th>
        <th style="width:118px">Código artigo</th>
        <th>Descrição</th>
        <th style="width:36px;text-align:right">Qtd.</th>
        <th style="width:34px">Un.</th>
      </tr>
    </thead>
    <tbody>
      ${i.length>0?`<tr class="pecas-group-row pecas-group-usado"><td colspan="6">✓ Utilizados — ${i.length} artigo${i.length!==1?"s":""}</td></tr>`:""}
      ${i.map(t=>h(t,"row-usado")).join("")}
      ${n.length>0?`<tr class="pecas-group-row pecas-group-nao-usado"><td colspan="6">✗ Não utilizados — ${n.length} artigo${n.length!==1?"s":""}</td></tr>`:""}
      ${n.map(t=>h(t,"row-nao-usado")).join("")}
    </tbody>
  </table>
  <div class="pecas-resumo">
    <span class="pecas-resumo-item"><span class="pecas-resumo-dot verde"></span>${i.length} artigo${i.length!==1?"s":""} utilizado${i.length!==1?"s":""}</span>
    ${n.length>0?`<span class="pecas-resumo-item"><span class="pecas-resumo-dot cinza"></span>${n.length} artigo${n.length!==1?"s":""} não substituído${n.length!==1?"s":""}</span>`:""}
    <span style="margin-left:auto;color:var(--muted)">${o.length} artigo${o.length!==1?"s":""} no plano</span>
  </div>
</section>`}return p+=`
<section class="no-break">
  <div class="rpt-section-title">Registo e assinatura</div>
  <div class="rpt-bottom">
    <div class="rpt-assinatura-box">
      <div class="rpt-grid">
        <div class="rpt-field">
          <span class="rpt-label">Data de criação</span>
          <span class="rpt-value">${G}</span>
        </div>
        <div class="rpt-field">
          <span class="rpt-label">Data de assinatura</span>
          <span class="rpt-value">${X}</span>
        </div>
        <div class="rpt-field rpt-field--full">
          <span class="rpt-label">Assinado pelo cliente</span>
          <span class="rpt-value">${e(s.nomeAssinante??"—")}</span>
        </div>
      </div>
      ${K?`
      <div class="rpt-assinatura-img">
        <span class="rpt-label" style="margin-top:5px;display:block">Assinatura manuscrita</span>
        <img src="${K}" alt="Assinatura do cliente">
      </div>`:""}
      <div class="rpt-assinatura-legenda">Relatório assinado pelo cliente / responsável no local: <strong>${e(s.nomeAssinante??"—")}</strong></div>
    </div>
    <div class="rpt-declaracao">${e(ta)}</div>
  </div>
</section>

${M?`<p style="font-size:8.5px;color:#888;margin-bottom:5px">${M}</p>`:""}
<footer class="rpt-footer">
  <span>${e(la)}</span>
  <span>${e(d.web)} &nbsp;|&nbsp; ${e(d.telefones)}</span>
</footer>

</body></html>`,p}export{ma as r};
