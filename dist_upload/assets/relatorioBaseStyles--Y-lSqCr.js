import{s as $,e as N}from"./emailConfig-mMFhqgpy.js";import{A as z}from"./index-B1mWfsSV.js";const d={nome:"JOSÉ GONÇALVES CERQUEIRA (NAVEL-AÇORES), Lda.",divisaoComercial:"Div. Comercial: Pico d'Água Park, Rua 5, n.º13-15 · 9600-049 Pico da Pedra",sede:"Sede / Divisão Oficinas: Rua Engº Abel Ferin Coutinho · Apt. 1481 · 9501-802 Ponta Delgada",telefones:"Tel: 296 205 290 / 296 630 120",pais:"Açores — Portugal",web:"www.navel.pt"},a=N,e={azulNavel:"#1a4880",azulMedio:"#2d6eb5",vermelho:"#b91c1c",verde:"#15803d",amarelo:"#a16207",texto:"#111827",muted:"#374151",cinza:"#f3f4f6",cinzaBorda:"#b0c4de",branco:"#ffffff",bgAlt:"#f9fafb",bordaLeve:"#e5e7eb"},t={corpo:"10.5px",pequeno:"9.5px",label:"9px",micro:"8.5px",titulo:"11.5px",numSerie:"14px"};function C(r=e.azulNavel,i="rgba(26,72,128,0.12)"){return`
/* ── Página A4, margens de impressão ── */
@page { size: A4 portrait; margin: 8mm 11mm }
* { box-sizing: border-box; margin: 0; padding: 0 }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: ${t.corpo};
  line-height: 1.42;
  color: var(--texto);
  background: var(--branco);
  padding: 0;
}

/* ── Paleta via custom properties ── */
:root {
  --azul: ${r};
  --azul-med: ${r};
  --azul-claro: ${i};
  --cinza: ${e.cinza};
  --borda: ${e.cinzaBorda};
  --borda-leve: ${e.bordaLeve};
  --texto: ${e.texto};
  --muted: ${e.muted};
  --verde: ${e.verde};
  --vermelho: ${e.vermelho};
  --amarelo: ${e.amarelo};
  --acento: ${r};
  --branco: ${e.branco};
  --bg-alt: ${e.bgAlt};
}

/* ── Quebras de página ── */
section { margin-bottom: 10px; page-break-inside: avoid }
.section-can-break { page-break-inside: auto }
.page-break-before { page-break-before: always }
.no-break { page-break-inside: avoid }

/* ── Cabeçalho ── */
.rpt-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; padding-bottom: 10px;
  border-bottom: 3px solid var(--azul);
}
.rpt-logos { display: flex; align-items: center; gap: 12px }
.rpt-logo img, .rpt-logo-marca img {
  max-height: 44px; max-width: 180px; object-fit: contain; display: block;
}
.rpt-logo-fallback { font-size: 1.2em; font-weight: 800; color: var(--azul) }
.rpt-empresa {
  text-align: left; font-size: ${t.pequeno}; line-height: 1.55; color: var(--texto);
}
.rpt-empresa strong { font-size: ${t.corpo}; color: var(--azul) }
.rpt-empresa a { color: var(--azul); text-decoration: none; font-weight: 600 }

/* ── Barra de título ── */
.rpt-titulo-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--azul); color: var(--branco);
  padding: 7px 12px; margin: 8px 0 0; border-radius: 3px;
}
.rpt-titulo-bar h1 {
  font-size: ${t.titulo}; font-weight: 800;
  letter-spacing: .08em; text-transform: uppercase;
}
.rpt-num-wrap { text-align: right }
.rpt-num-label {
  font-size: ${t.micro}; color: rgba(255,255,255,.85); text-transform: uppercase;
  letter-spacing: .08em; display: block;
}
.rpt-num {
  font-size: ${t.numSerie}; font-weight: 800;
  letter-spacing: .04em; font-family: 'Courier New', monospace;
}
.rpt-acento {
  height: 2px; background: linear-gradient(90deg, var(--acento), var(--azul-med));
  margin-bottom: 8px; border-radius: 0 0 2px 2px;
}

/* ── Secções genéricas ── */
.rpt-section-title {
  font-size: ${t.label}; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: var(--azul);
  border-bottom: 1.5px solid var(--azul); padding-bottom: 3px; margin-bottom: 6px;
}

/* ── Grid de dados (2 colunas) ── */
.rpt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 10px }
.rpt-field { padding: 2.5px 0; border-bottom: 1px solid var(--borda-leve) }
.rpt-field:last-child { border-bottom: none }
.rpt-label {
  font-size: ${t.label}; font-weight: 600; text-transform: uppercase;
  letter-spacing: .05em; color: var(--muted); display: block; margin-bottom: 1px;
}
.rpt-value { font-size: ${t.corpo}; color: var(--texto) }
.rpt-value--bold { font-weight: 700 }
.rpt-value--mono { font-family: 'Courier New', monospace; letter-spacing: .03em }
.rpt-value--accent { color: var(--azul); font-weight: 600 }
.rpt-value--muted { color: var(--muted) }
.rpt-field--full { grid-column: 1 / -1 }

/* ── Bloco equipamento destacado ── */
.rpt-equip-band {
  background: var(--azul-claro); border: 1.5px solid var(--borda);
  border-top: 3px solid var(--azul);
  border-radius: 4px; padding: 8px 10px; margin-bottom: 8px;
}
.rpt-equip-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 12px;
}
.rpt-equip-item .rpt-label { font-size: ${t.label} }
.rpt-equip-item .rpt-value { font-size: ${t.corpo}; font-weight: 700; color: var(--texto) }

/* ── Notas ── */
.rpt-notas {
  background: var(--azul-claro); border-left: 3px solid var(--azul);
  padding: 7px 10px; border-radius: 0 4px 4px 0;
  font-size: ${t.corpo}; color: var(--texto); line-height: 1.5;
}

/* ── Fotos — layout adaptativo por quantidade ── */
.rpt-fotos-section { margin-top: 8px }
.rpt-fotos-row {
  display: flex; gap: 10px; margin-bottom: 10px;
  page-break-inside: avoid;
}
.rpt-foto-item {
  flex: 1; min-width: 0; text-align: center;
}
.rpt-foto-item img {
  width: 100%; max-height: 180px; object-fit: contain;
  border-radius: 4px; border: 1.5px solid var(--borda);
  background: var(--cinza); display: block;
}
.rpt-foto-caption {
  font-size: ${t.label}; color: var(--texto);
  margin-top: 3px; text-align: center; font-weight: 500;
}
/* 1 foto: centrada, max 60% largura */
.rpt-fotos-row--single .rpt-foto-item { flex: 0 1 60%; margin: 0 auto }
.rpt-fotos-row--single .rpt-foto-item img { max-height: 220px }
/* 2 fotos: 50% cada */
.rpt-fotos-row--pair .rpt-foto-item { flex: 0 1 50% }
.rpt-fotos-row--pair .rpt-foto-item img { max-height: 200px }

/* ── Checklist ── */
.checklist-1col { width: 100% }
.checklist-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px }
.checklist-table { width: 100%; border-collapse: collapse; font-size: ${t.pequeno} }
.checklist-table tr:nth-child(even) { background: var(--cinza) }
.checklist-table td {
  padding: 2.8px 4px; border-bottom: 1px solid var(--borda-leve); vertical-align: top;
}
.checklist-table td.cl-num {
  width: 1.6em; color: var(--muted); font-size: ${t.label};
  padding-left: 2px; white-space: nowrap;
}
.checklist-table td.cl-texto { padding-right: 6px }
.checklist-table td.cl-badge { width: 32px; text-align: center; padding-right: 2px; white-space: nowrap }
.badge-sim {
  background: #dcfce7; color: #14532d;
  padding: 1.5px 6px; border-radius: 8px; font-size: ${t.label}; font-weight: 700;
  border: 1px solid #86efac;
}
.badge-nao {
  background: #fee2e2; color: #7f1d1d;
  padding: 1.5px 6px; border-radius: 8px; font-size: ${t.label}; font-weight: 700;
  border: 1px solid #fca5a5;
}
.badge-nd { color: var(--muted); font-size: ${t.pequeno} }

/* ── Peças e consumíveis ── */
.pecas-table { width: 100%; border-collapse: collapse; font-size: ${t.pequeno} }
.pecas-table thead { display: table-header-group }
.pecas-table th {
  background: var(--azul); color: var(--branco);
  padding: 4px 6px; text-align: left;
  font-size: ${t.label}; text-transform: uppercase; letter-spacing: .04em;
}
.pecas-table td {
  padding: 3px 6px; border-bottom: 1px solid var(--borda-leve); vertical-align: middle;
}
.pecas-table tr.row-usado td { background: #f0fdf4 }
.pecas-table tr.row-nao-usado td { background: var(--bg-alt); color: #6b7280 }
.pecas-table tr.row-nao-usado .cell-desc { text-decoration: line-through }
.pecas-table .cell-status { width: 20px; text-align: center; font-size: ${t.titulo}; font-weight: 700 }
.pecas-table .cell-pos { width: 46px; color: var(--muted); font-family: 'Courier New', monospace; font-size: ${t.label} }
.pecas-table .cell-code { width: 118px; font-family: 'Courier New', monospace; font-size: ${t.pequeno} }
.pecas-table .cell-qty { width: 36px; text-align: right; font-weight: 600 }
.pecas-table .cell-un { width: 34px; color: var(--muted); font-size: ${t.label} }
.pecas-group-row td {
  background: var(--cinza) !important;
  font-size: ${t.label}; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--muted); padding: 3px 6px;
  page-break-after: avoid;
}
.pecas-group-usado td { border-left: 3px solid var(--verde); color: var(--verde) }
.pecas-group-nao-usado td { border-left: 3px solid #6b7280 }
.pecas-resumo {
  display: flex; gap: 16px; padding: 4px 6px;
  background: var(--cinza); border-top: 1.5px solid var(--borda); font-size: ${t.pequeno};
}
.pecas-resumo-item { display: flex; align-items: center; gap: 4px }
.pecas-resumo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0 }
.pecas-resumo-dot.verde { background: var(--verde) }
.pecas-resumo-dot.cinza { background: #6b7280 }

/* ═══════════════════════════════════════════════════════════════════════════
 * PÁGINA DO CLIENTE — assinaturas, declaração e próximas manutenções
 * Forçar sempre nova página; nunca cortar blocos internos.
 * ═══════════════════════════════════════════════════════════════════════════ */
.rpt-pagina-cliente {
  page-break-before: always;
}
.rpt-pagina-cliente-titulo {
  font-size: 12px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .1em; color: var(--branco);
  background: var(--azul); padding: 6px 10px; border-radius: 3px;
  margin-bottom: 12px;
}

/* ── Assinatura lado a lado ── */
.rpt-assinaturas-dual {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-top: 8px; overflow: hidden;
}
.rpt-assinatura-col {
  background: var(--branco); border: 1.5px solid var(--borda);
  border-top: 3px solid var(--azul);
  border-radius: 4px; padding: 10px 12px;
  box-sizing: border-box;
}
.rpt-assinatura-nome {
  font-size: ${t.corpo}; font-weight: 700; color: var(--texto);
  margin-bottom: 3px;
}
.rpt-assinatura-detalhe { font-size: ${t.label}; color: var(--muted) }
.rpt-assinatura-img img {
  max-width: 100%; max-height: 80px;
  width: auto; height: auto;
  border: 1px solid var(--borda); border-radius: 3px;
  margin-top: 8px; background: var(--branco); display: block;
}
.rpt-assinatura-placeholder {
  height: 70px; border-bottom: 1.5px dashed var(--borda);
  margin-top: 8px; margin-bottom: 4px;
}

/* ── Declaração do cliente ── */
.rpt-declaracao-box {
  background: var(--cinza); border: 1.5px solid var(--borda);
  border-left: 3px solid var(--azul);
  border-radius: 4px; padding: 10px 12px; margin-top: 12px;
}
.rpt-declaracao-titulo {
  font-size: ${t.label}; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--azul); margin-bottom: 5px;
}
.rpt-declaracao-texto {
  font-size: ${t.pequeno}; color: var(--texto); line-height: 1.6;
}

/* ── Tabela próximas manutenções ── */
.rpt-proximas-box { margin-top: 14px }
.proximas-table { width: 100%; border-collapse: collapse; margin-bottom: 6px }
.proximas-table th {
  background: var(--azul); color: var(--branco);
  padding: 5px 8px; font-size: ${t.label}; text-transform: uppercase;
  letter-spacing: .04em; text-align: left; border: 1px solid var(--azul);
}
.proximas-table th:first-child { text-align: center; width: 30px }
.proximas-table td {
  padding: 4px 8px; font-size: ${t.corpo}; color: var(--texto);
  border: 1px solid var(--borda-leve);
}
.proximas-table tr:nth-child(even) { background: var(--cinza) }
.proximas-nota {
  font-size: ${t.pequeno}; color: var(--texto);
  margin: 4px 0 8px; line-height: 1.55;
  font-style: italic;
}

/* ── Último envio ── */
.rpt-ultimo-envio { font-size: ${t.label}; color: var(--muted); margin-bottom: 6px; font-style: italic }

/* ── Rodapé ── */
.rpt-footer {
  margin-top: 10px; padding-top: 7px;
  border-top: 2px solid var(--azul);
  display: flex; justify-content: space-between; align-items: center;
  font-size: ${t.label}; color: var(--texto);
}
`}function S(r,i="",p=""){return`
<header class="rpt-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:3px solid ${e.azulNavel}">
  <div class="rpt-logos" style="display:flex;align-items:center;gap:12px">
    <div class="rpt-logo">
      <img src="${r}" alt="Navel" width="160" height="44"
        style="max-height:44px;max-width:160px;width:auto;height:auto;display:block;object-fit:contain"
        onerror="this.parentNode.innerHTML='<span class=rpt-logo-fallback style=font-size:1.2em;font-weight:800;color:${e.azulNavel}>Navel</span>'">
    </div>
    ${i?`
    <div class="rpt-logo-marca">
      <img src="${i}" alt="${a(p)}" width="120" height="40"
        style="max-height:40px;max-width:120px;width:auto;height:auto;display:block;object-fit:contain"
        onerror="this.parentNode.style.display='none'">
    </div>`:""}
  </div>
  <div class="rpt-empresa" style="text-align:left;font-size:${t.pequeno};line-height:1.55;color:${e.texto}">
    <strong style="font-size:${t.corpo};color:${e.azulNavel}">${a(d.nome)}</strong><br>
    ${a(d.divisaoComercial)}<br>
    ${a(d.sede)}<br>
    ${a(d.telefones)} &nbsp;|&nbsp; <a href="https://${d.web}" style="color:${e.azulNavel};text-decoration:none;font-weight:600">${d.web}</a><br>
    ${a(d.pais)}
  </div>
</header>`}function T(r,i,p,s=""){return`
<div class="rpt-titulo-bar" style="display:flex;align-items:center;justify-content:space-between;background:${e.azulNavel};color:#fff;padding:7px 12px;margin:8px 0 0;border-radius:3px">
  <h1 style="font-size:${t.titulo};font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0;color:#fff">${a(r)}${s||""}</h1>
  <div class="rpt-num-wrap" style="text-align:right">
    <span class="rpt-num-label" style="font-size:${t.micro};color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.08em;display:block">${a(i)}</span>
    <span class="rpt-num" style="font-size:${t.numSerie};font-weight:800;letter-spacing:.04em;font-family:'Courier New',monospace;color:#fff">${a(p)}</span>
  </div>
</div>
<div class="rpt-acento" style="height:2px;background:linear-gradient(90deg,${e.azulNavel},${e.azulMedio});margin-bottom:8px;border-radius:0 0 2px 2px"></div>`}function P(r="",i="",p=""){const s=i?`${a(z)} · ${a(i)}`:a(z),l=p||`${a(d.web)} &nbsp;|&nbsp; ${a(d.telefones)}`;return`
${r?`<p class="rpt-ultimo-envio" style="font-size:${t.label};color:${e.muted};margin-bottom:6px;font-style:italic">${a(r)}</p>`:""}
<div class="rpt-footer" style="margin-top:10px;padding-top:5px;border-top:1.5px solid ${e.azulNavel};display:flex;justify-content:space-between;align-items:center;font-size:8px;color:${e.muted}">
  <span style="font-size:8px;color:${e.muted}">${s}</span>
  <span style="font-size:8px;color:${e.muted}">${l}</span>
</div>`}function B({tecnicoNome:r="—",tecnicoTelefone:i="",tecnicoAssinatura:p="",clienteNome:s="—",clienteAssinatura:l="",dataCriacao:c="—",dataAssinatura:m="—",declaracaoTexto:u="",proximasManutencoes:f=[]}){const v=p?$(p):"",h=l?$(l):"",y=g=>{if(!g)return"—";const[n,x,k]=g.split("-");return`${k}/${x}/${n}`},w=g=>({trimestral:"Trimestral",semestral:"Semestral",anual:"Anual"})[g]??g??"—",o={label:`font-size:${t.label};font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:${e.muted};display:block;margin-bottom:1px`,value:`font-size:${t.corpo};color:${e.texto}`,sectionTitle:`font-size:${t.label};font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${e.azulNavel};border-bottom:1.5px solid ${e.azulNavel};padding-bottom:3px;margin-bottom:6px`,sigCol:`background:#fff;border:1.5px solid ${e.cinzaBorda};border-top:3px solid ${e.azulNavel};border-radius:4px;padding:10px 12px;box-sizing:border-box`,sigName:`font-size:${t.corpo};font-weight:700;color:${e.texto};margin-bottom:3px`,declBox:`background:${e.cinza};border:1.5px solid ${e.cinzaBorda};border-left:3px solid ${e.azulNavel};border-radius:4px;padding:10px 12px;margin-top:12px`,declTitle:`font-size:${t.label};font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${e.azulNavel};margin-bottom:5px`,declText:`font-size:${t.pequeno};color:${e.texto};line-height:1.6`,thStyle:`background:${e.azulNavel};color:#fff;padding:5px 8px;font-size:${t.label};text-transform:uppercase;letter-spacing:.04em;text-align:left;border:1px solid ${e.azulNavel}`,tdStyle:`padding:4px 8px;font-size:${t.corpo};color:${e.texto};border:1px solid ${e.bordaLeve}`};let b=`
<div class="rpt-pagina-cliente" style="page-break-before:always">
  <div class="rpt-pagina-cliente-titulo" style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#fff;background:${e.azulNavel};padding:6px 10px;border-radius:3px;margin-bottom:12px">Registo, assinatura e conformidade</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px"><tr>
    <td width="50%" style="padding-right:5px">
      <div style="${o.label}">Data de criação do relatório</div>
      <div style="${o.value}">${a(c)}</div>
    </td>
    <td width="50%" style="padding-left:5px">
      <div style="${o.label}">Data de assinatura</div>
      <div style="${o.value}">${a(m)}</div>
    </td>
  </tr></table>

  ${u?`
  <div class="rpt-declaracao-box no-break" style="${o.declBox}">
    <div style="${o.declTitle}">Declaração de aceitação e compromisso do cliente</div>
    <div style="${o.declText}">${a(u)}</div>
  </div>`:""}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr>
    <td width="48%" style="vertical-align:top;padding-right:6px">
      <div style="${o.sigCol}">
        <div style="${o.label}">Técnico responsável</div>
        <div style="${o.sigName}">${a(r)}</div>
        ${i?`<div style="font-size:${t.label};color:${e.muted}">Tel: ${a(i)}</div>`:""}
        ${v?`<div style="margin-top:8px"><img src="${v}" alt="Assinatura do técnico" style="max-width:100%;max-height:80px;width:auto;height:auto;border:1px solid ${e.cinzaBorda};border-radius:3px;display:block"></div>`:`<div style="height:70px;border-bottom:1.5px dashed ${e.cinzaBorda};margin-top:8px"></div>`}
      </div>
    </td>
    <td width="4%"></td>
    <td width="48%" style="vertical-align:top;padding-left:6px">
      <div style="${o.sigCol}">
        <div style="${o.label}">Assinado pelo cliente</div>
        <div style="${o.sigName}">${a(s)}</div>
        ${h?`<div style="margin-top:8px"><img src="${h}" alt="Assinatura do cliente" style="max-width:100%;max-height:80px;width:auto;height:auto;border:1px solid ${e.cinzaBorda};border-radius:3px;display:block"></div>`:`<div style="height:70px;border-bottom:1.5px dashed ${e.cinzaBorda};margin-top:8px"></div>`}
      </div>
    </td>
  </tr></table>`;if(f?.length>0){const g=f.sort((n,x)=>(n.data??"").localeCompare(x.data??"")).map((n,x)=>`<tr${x%2===1?` style="background:${e.cinza}"`:""}>
        <td style="${o.tdStyle};text-align:center;width:30px">${x+1}</td>
        <td style="${o.tdStyle}">${y(n.data)}</td>
        <td style="${o.tdStyle}">${a(w(n.periodicidade)||n.tipo||"—")}</td>
        <td style="${o.tdStyle};color:${e.muted}">${a(n.tecnico??"A designar")}</td>
      </tr>`).join("");b+=`
  <div class="rpt-proximas-box no-break" style="margin-top:14px">
    <div style="${o.sectionTitle}">Próximas manutenções agendadas</div>
    <p style="font-size:${t.pequeno};color:${e.texto};margin:4px 0 8px;line-height:1.55;font-style:italic">Informamos que foram nesta data agendadas as datas das manutenções futuras para este equipamento (datas estimativas, podem sofrer alterações):</p>
    <table class="proximas-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px">
      <thead><tr>
        <th style="${o.thStyle};text-align:center;width:30px">N.º</th>
        <th style="${o.thStyle}">Data prevista</th>
        <th style="${o.thStyle}">Periodicidade</th>
        <th style="${o.thStyle}">Técnico</th>
      </tr></thead>
      <tbody>${g}</tbody>
    </table>
  </div>`}return b+=`
</div>`,b}function E(r=[],i="Documentação fotográfica"){if(!r.length)return"";const p=(l,c)=>`<div class="rpt-foto-item">
      <img src="${l}" alt="Fotografia ${c+1}">
      <div class="rpt-foto-caption">Foto ${c+1}</div>
    </div>`;let s="";if(r.length===1)s=`<div class="rpt-fotos-row rpt-fotos-row--single">${p(r[0],0)}</div>`;else for(let l=0;l<r.length;l+=2){const c=l+1>=r.length;s+=`<div class="${c?"rpt-fotos-row rpt-fotos-row--single":"rpt-fotos-row rpt-fotos-row--pair"}">`,s+=p(r[l],l),c||(s+=p(r[l+1],l+1)),s+="</div>"}return`
<section class="section-can-break">
  <div class="rpt-section-title">${a(i)}</div>
  <div class="rpt-fotos-section">${s}</div>
</section>`}export{d as E,e as P,t as T,T as a,E as b,C as c,B as d,P as e,S as h};
