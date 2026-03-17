import{a as L,f as K}from"./datasAzores-vTPFpdRw.js";import{r as ba,a as R,g as ua,e as ga}from"./emailConfig-D1SCop7p.js";import{o as ma,s as va,k as $a,m as O,r as fa}from"./index-D3qI2Gkl.js";import{c as ha,h as xa,a as ka,T as d,P as t,d as ya,e as wa,b as za}from"./relatorioBaseStyles-BpzmBaWj.js";function V(s,l){const a=String(s??"").trim();return/^#[0-9a-fA-F]{6}$/.test(a)?a.toLowerCase():/^#[0-9a-fA-F]{3}$/.test(a)?`#${a[1]}${a[1]}${a[2]}${a[2]}${a[3]}${a[3]}`.toLowerCase():l}function Sa(s,l){const a=V(s,"#000000"),g=Number.parseInt(a.slice(1,3),16),T=Number.parseInt(a.slice(3,5),16),D=Number.parseInt(a.slice(5,7),16);return`rgba(${g}, ${T}, ${D}, ${l})`}function Da(s,l,a,g,T=[],D={}){if(!s)return"";const h=ba(s,T),{subcategoriaNome:E,ultimoEnvio:z,logoUrl:q,istobalLogoUrl:Q,tecnicoObj:k,proximasManutencoes:_}=D,Y=q??"/manut/logo-navel.png",G=Q??"/manut/logo-istobal.png",e=ga,U=/istobal/i.test(String(a?.marca??""))||/istobal/i.test(String(E??"")),J=a?.marcaLogoUrl||(U?G:""),W=a?.marca?`Logotipo ${a.marca}`:"Logotipo da marca",F=V(a?.marcaCorHex,U?"#c8102e":"#1a4880"),X=Sa(F,.12),$=!!(s.tipoManutKaeser||ma(a?.marca)),x=s.tipoManutKaeser??"",S=x?va[x]:null,m=a?.posicaoKaeser??null,M=m!=null?fa(m):null,H=m!=null?O(m):null,j=M!=null?O(M):null,Z=s.dataCriacao?L(s.dataCriacao):"—",aa=s.dataAssinatura?L(s.dataAssinatura):"Pendente de assinatura",ea=l?.data?K(l.data,!0):"—",sa=s.dataAssinatura?K(s.dataAssinatura,!0):s.dataCriacao?K(s.dataCriacao,!0):"Pendente de preenchimento",ta=z?.data&&z?.destinatario?`Último envio por email: ${L(z.data)} para ${e(z.destinatario)}`:null,B=e(l?.tecnico||s?.tecnico||"—");s.assinaturaDigital&&R(s.assinaturaDigital),k?.assinaturaDigital&&R(k.assinaturaDigital);const oa=k?.telefone?e(k.telefone):"",P=Math.ceil((h??[]).length/2),la=(h??[]).slice(0,P),ra=(h??[]).slice(P),I=(p,i,r=0)=>{const n=s.checklistRespostas?.[p.id],y=n==="sim"?'<span class="badge-sim" style="background:#dcfce7;color:#14532d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #86efac">SIM</span>':n==="nao"?'<span class="badge-nao" style="background:#fee2e2;color:#7f1d1d;padding:1.5px 6px;border-radius:8px;font-size:9px;font-weight:700;border:1px solid #fca5a5">NÃO</span>':'<span class="badge-nd" style="color:#374151">—</span>',b=(i+r)%2===1?`;background:${t.cinza}`:"";return`<tr style="border-bottom:1px solid ${t.bordaLeve}${b}"><td class="cl-num" style="width:1.6em;color:${t.muted};font-size:${d.label};padding:3px 4px;white-space:nowrap;vertical-align:top">${i+r+1}.</td><td class="cl-texto" style="padding:3px 6px 3px 4px;vertical-align:top;font-size:${d.pequeno};color:${t.texto}">${e(p.texto)}</td><td class="cl-badge" style="width:32px;text-align:center;padding:3px 2px;white-space:nowrap;vertical-align:top">${y}</td></tr>`};let c=`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório de Manutenção — Navel</title>
<style>
${ha(F,X)}
/* ── KAESER (específico deste relatório) ── */
:root{--kaeser:#92400e;--kaeser-bg:#fffbeb;--kaeser-borda:#fde68a}
.kaeser-band{background:var(--kaeser-bg);border:1.5px solid var(--kaeser-borda);border-radius:5px;margin-bottom:9px;overflow:hidden;page-break-inside:avoid}
.kaeser-band-header{background:var(--kaeser);color:#fff;padding:4px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.kaeser-band-titulo{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.kaeser-band-subtitulo{font-size:9.5px;color:var(--muted)}
.kaeser-band-body{padding:7px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 14px}
.kaeser-item-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;display:block;margin-bottom:1px}
.kaeser-item-valor{font-size:11px;font-weight:600;color:var(--texto)}
.kaeser-item-valor.destaque{font-size:13px;font-weight:800;color:var(--kaeser)}
.kaeser-item-val-sub{font-size:9px;color:var(--muted);display:block}
.kaeser-seq{grid-column:1/-1;margin-top:4px;border-top:1px solid var(--kaeser-borda);padding-top:5px}
.kaeser-seq-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--kaeser);font-weight:700;margin-bottom:3px}
.kaeser-seq-dots{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.kaeser-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1.5px solid transparent;flex-shrink:0}
.kaeser-dot.passado{background:#e5e7eb;color:#4b5563;border-color:#d1d5db}
.kaeser-dot.atual{background:var(--kaeser);color:#fff;border-color:var(--kaeser)}
.kaeser-dot.proximo{background:#fff;color:var(--kaeser);border-color:var(--kaeser)}
.kaeser-dot.futuro{background:#f9fafb;color:#6b7280;border-color:#e5e7eb}
.kaeser-dot-sep{color:#6b7280;font-size:10px;padding:0 1px}
.kaeser-legend{font-size:8.5px;color:#6b7280;margin-left:6px}
.pecas-resumo-total{margin-left:auto;color:var(--muted)}
</style>
</head>
<body>

${xa(Y,J,W)}

${ka("Relatório de Manutenção"+($?" — Compressor":""),"Nº de Serviço",s?.numeroRelatorio??l?.id??"—")}`;if($){const p=S?.label??(x?`Tipo ${x}`:"Compressor"),i=S?.descricao??"",r=a?.horasTotaisAcumuladas??form?.horasTotais??null,n=a?.horasServicoAcumuladas??form?.horasServico??null,y=a?.anoFabrico??"—",b=e(a?.marca??"—"),u=e(a?.modelo??"—"),C=e(a?.numeroSerie??"—"),w=e(a?.numeroDocumentoVenda??""),N=$a.map((o,f)=>{let v="futuro";return m!=null&&(f<m?v="passado":f===m?v="atual":f===M&&(v="proximo")),`<span class="kaeser-dot ${v}" title="Ano ${f+1}">${o}</span>`}).join('<span class="kaeser-dot-sep">·</span>');c+=`
<div class="kaeser-band">
  <div class="kaeser-band-header">
    <span class="kaeser-band-titulo">Manutenção KAESER — ${e(p)}</span>
    ${i?`<span class="kaeser-band-subtitulo">${e(i)}</span>`:""}
  </div>
  <div class="kaeser-band-body">
    <div class="kaeser-item">
      <span class="kaeser-item-label">Fabricante / Modelo</span>
      <span class="kaeser-item-valor">${b} ${u}</span>
    </div>
    <div class="kaeser-item">
      <span class="kaeser-item-label">Número de série</span>
      <span class="kaeser-item-valor destaque">${C}</span>
    </div>
    <div class="kaeser-item">
      <span class="kaeser-item-label">Ano de fabrico</span>
      <span class="kaeser-item-valor">${y}</span>
      ${w?`<span class="kaeser-item-val-sub">Doc. venda: ${w}</span>`:""}
    </div>
    ${r!=null?`
    <div class="kaeser-item">
      <span class="kaeser-item-label">Horas totais acumuladas</span>
      <span class="kaeser-item-valor destaque">${r} h</span>
    </div>`:""}
    ${n!=null?`
    <div class="kaeser-item">
      <span class="kaeser-item-label">Horas de serviço</span>
      <span class="kaeser-item-valor">${n} h</span>
    </div>`:""}
    ${H?`
    <div class="kaeser-item">
      <span class="kaeser-item-label">Ciclo efectuado</span>
      <span class="kaeser-item-valor">${e(H)}</span>
      ${j?`<span class="kaeser-item-val-sub">Próxima: ${e(j)}</span>`:""}
    </div>`:""}
    <div class="kaeser-seq">
      <div class="kaeser-seq-label">Sequência do ciclo de manutenção (12 anos)</div>
      <div class="kaeser-seq-dots">
        ${N}
        ${m!=null?`<span class="kaeser-legend">
          ● Efetuado &nbsp; ○ Próximo &nbsp; · Futuro
        </span>`:""}
      </div>
    </div>
  </div>
</div>`}const A=l?.periodicidade?{trimestral:"Trimestral (90 dias)",semestral:"Semestral (180 dias)",anual:"Anual (365 dias)"}[l.periodicidade]??l.periodicidade:a?.periodicidadeManut?{trimestral:"Trimestral",semestral:"Semestral",anual:"Anual"}[a.periodicidadeManut]??a.periodicidadeManut:null;if(c+=`
<section>
  <div class="rpt-section-title">Identificação do cliente</div>
  <div class="rpt-grid">
    <div class="rpt-field">
      <span class="rpt-label">Nome / Empresa</span>
      <span class="rpt-value rpt-value--bold">${e(g?.nome??"—")}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">NIF</span>
      <span class="rpt-value rpt-value--mono">${e(g?.nif??"—")}</span>
    </div>
    ${g?.localidade?`<div class="rpt-field">
      <span class="rpt-label">Localidade</span>
      <span class="rpt-value">${e(g.localidade)}</span>
    </div>`:""}
    ${g?.telefone?`<div class="rpt-field">
      <span class="rpt-label">Telefone</span>
      <span class="rpt-value">${e(g.telefone)}</span>
    </div>`:""}
  </div>
</section>`,!$&&a&&(c+=`
<section>
  <div class="rpt-section-title">Equipamento</div>
  <div class="rpt-equip-band">
    <div class="rpt-equip-grid">
      <div class="rpt-equip-item">
        <span class="rpt-label">Marca / Modelo</span>
        <span class="rpt-value">${e(a.marca??"")} ${e(a.modelo??"")}</span>
      </div>
      <div class="rpt-equip-item">
        <span class="rpt-label">Número de série</span>
        <span class="rpt-value rpt-value--mono rpt-value--accent">${e(a.numeroSerie??"—")}</span>
      </div>
      ${E?`<div class="rpt-equip-item">
        <span class="rpt-label">Tipo / Subcategoria</span>
        <span class="rpt-value">${e(E)}</span>
      </div>`:""}
      ${A?`<div class="rpt-equip-item">
        <span class="rpt-label">Periodicidade</span>
        <span class="rpt-value">${e(A)}</span>
      </div>`:""}
      ${a.anoFabrico?`<div class="rpt-equip-item">
        <span class="rpt-label">Ano de fabrico</span>
        <span class="rpt-value">${e(String(a.anoFabrico))}</span>
      </div>`:""}
      ${a.numeroDocumentoVenda?`<div class="rpt-equip-item">
        <span class="rpt-label">Doc. venda</span>
        <span class="rpt-value">${e(a.numeroDocumentoVenda)}</span>
      </div>`:""}
    </div>
  </div>
</section>`),c+=`
<section>
  <div class="rpt-section-title">Dados da manutenção</div>
  <div class="rpt-grid">
    <div class="rpt-field">
      <span class="rpt-label">Data agendada</span>
      <span class="rpt-value">${ea}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Data de realização</span>
      <span class="rpt-value">${sa}</span>
    </div>
    <div class="rpt-field">
      <span class="rpt-label">Técnico responsável</span>
      <span class="rpt-value">${B}</span>
    </div>
    ${A&&$?`<div class="rpt-field">
      <span class="rpt-label">Periodicidade</span>
      <span class="rpt-value">${e(A)}</span>
    </div>`:""}
    ${(l?.horasTotais!=null||l?.horasServico!=null)&&!$?`
    <div class="rpt-field rpt-field--full">
      <span class="rpt-label">Contadores de horas</span>
      <span class="rpt-value">${l.horasTotais!=null?`Total: ${l.horasTotais} h`:""}${l.horasTotais!=null&&l.horasServico!=null?" · ":""}${l.horasServico!=null?`Serviço: ${l.horasServico} h`:""}</span>
    </div>`:""}
  </div>
</section>`,h?.length>0){const p=`font-size:${d.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${t.azulNavel};border-bottom:1.5px solid ${t.azulNavel};padding-bottom:3px;margin-bottom:6px`;$?c+=`
<section class="section-can-break">
  <div class="rpt-section-title" style="${p}">Checklist de verificação — ${h.length} pontos</div>
  <div class="checklist-1col">
    <table class="checklist-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
      ${(h??[]).map((i,r)=>I(i,r,0)).join("")}
    </tbody></table>
  </div>
</section>`:c+=`
<section>
  <div class="rpt-section-title" style="${p}">Checklist de verificação</div>
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="49%" style="vertical-align:top">
      <table class="checklist-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
        ${la.map((i,r)=>I(i,r,0)).join("")}
      </tbody></table>
    </td>
    <td width="2%"></td>
    <td width="49%" style="vertical-align:top">
      <table class="checklist-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
        ${ra.map((i,r)=>I(i,r,P)).join("")}
      </tbody></table>
    </td>
  </tr></table>
</section>`}s.notas&&(c+=`
<section>
  <div class="rpt-section-title" style="font-size:${d.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${t.azulNavel};border-bottom:1.5px solid ${t.azulNavel};padding-bottom:3px;margin-bottom:6px">Notas do técnico</div>
  <div class="rpt-notas" style="background:rgba(26,72,128,0.12);border-left:3px solid ${t.azulNavel};padding:7px 10px;border-radius:0 4px 4px 0;font-size:${d.corpo};color:${t.texto};line-height:1.5">${e(s.notas).replace(/\n/g,"<br>")}</div>
</section>`);const ia=(s.fotos??[]).map(p=>R(p)).filter(Boolean);if(c+=ya(ia),s.pecasUsadas?.length>0){const p=o=>"usado"in o?o:{...o,usado:(o.quantidadeUsada??o.quantidade??0)>0},i=s.pecasUsadas.map(p),r=i.filter(o=>o.usado),n=i.filter(o=>!o.usado),y=x?`Consumíveis e peças — Manutenção Tipo ${x}${S?` · ${S.label}`:""}`:"Consumíveis e peças",b=`background:${t.azulNavel};color:#fff;padding:4px 6px;text-align:left;font-size:${d.label};text-transform:uppercase;letter-spacing:.04em`,u=`padding:3px 6px;border-bottom:1px solid ${t.bordaLeve};vertical-align:middle;font-size:${d.pequeno};color:${t.texto}`;let C=0;const w=(o,f)=>{const v=f==="row-usado",na=C++%2===1?`;background:${t.cinza}`:"",da=v?"":";text-decoration:line-through;color:#6b7280",ca=v?"✓":"✗",pa=v?t.verde:"#6b7280";return`
      <tr class="${f} no-break" style="page-break-inside:avoid${na}">
        <td class="cell-status" style="${u};width:20px;text-align:center;font-size:${d.titulo};font-weight:700;color:${pa}">${ca}</td>
        <td class="cell-pos" style="${u};width:46px;color:${t.muted};font-family:'Courier New',monospace;font-size:${d.label}">${e(o.posicao??"")}</td>
        <td class="cell-code" style="${u};width:118px;font-family:'Courier New',monospace">${e(o.codigoArtigo??"")}</td>
        <td style="${u}${da}">${e(o.descricao??"")}</td>
        <td class="cell-qty" style="${u};width:36px;text-align:right;font-weight:600">${o.quantidade??""}</td>
        <td class="cell-un" style="${u};width:34px;color:${t.muted};font-size:${d.label}">${e(o.unidade??"")}</td>
      </tr>`},N=`${u};background:${t.cinza} !important;font-size:${d.label};font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${t.muted};padding:4px 6px`;c+=`
<section class="section-can-break${$?" page-break-before":""}">
  <div class="rpt-section-title" style="font-size:${d.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${t.azulNavel};border-bottom:1.5px solid ${t.azulNavel};padding-bottom:3px;margin-bottom:6px">${y}</div>
  <table class="pecas-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:${d.pequeno};margin-bottom:4px">
    <thead>
      <tr>
        <th style="${b};width:20px"></th>
        <th style="${b};width:46px">Pos.</th>
        <th style="${b};width:118px">Código artigo</th>
        <th style="${b}">Descrição</th>
        <th style="${b};width:36px;text-align:right">Qtd.</th>
        <th style="${b};width:34px">Un.</th>
      </tr>
    </thead>
    <tbody>
      ${r.length>0?`<tr class="pecas-group-row pecas-group-usado"><td colspan="6" style="${N};border-left:3px solid ${t.verde};color:${t.verde}">✓ Utilizados — ${r.length} artigo${r.length!==1?"s":""}</td></tr>`:""}
      ${r.map(o=>w(o,"row-usado")).join("")}
      ${C=0,""}
      ${n.length>0?`<tr class="pecas-group-row pecas-group-nao-usado"><td colspan="6" style="${N};border-left:3px solid #6b7280">✗ Não utilizados — ${n.length} artigo${n.length!==1?"s":""}</td></tr>`:""}
      ${n.map(o=>w(o,"row-nao-usado")).join("")}
    </tbody>
  </table>
  <div class="pecas-resumo" style="display:flex;gap:16px;padding:4px 6px;background:${t.cinza};border-top:1.5px solid ${t.cinzaBorda};font-size:${d.pequeno}">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:${t.verde};display:inline-block"></span>${r.length} artigo${r.length!==1?"s":""} utilizado${r.length!==1?"s":""}</span>
    ${n.length>0?`<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#6b7280;display:inline-block"></span>${n.length} artigo${n.length!==1?"s":""} não substituído${n.length!==1?"s":""}</span>`:""}
    <span style="margin-left:auto;color:${t.muted}">${i.length} artigo${i.length!==1?"s":""} no plano</span>
  </div>
</section>`}return c+=`
${wa({tecnicoNome:B,tecnicoTelefone:oa,tecnicoAssinatura:k?.assinaturaDigital,clienteNome:s.nomeAssinante??"—",clienteAssinatura:s.assinaturaDigital,dataCriacao:Z,dataAssinatura:aa,declaracaoTexto:ua(l?.tipo==="montagem"?"montagem":"periodica"),proximasManutencoes:_})}

${za(ta)}

</body></html>`,c}export{Da as r};
