const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/apiService-ztsgq9LE.js","assets/index-B1mWfsSV.js","assets/vendor-Bk0NZ5Or.js","assets/vendor-pdf-hYLUQ4hX.js","assets/vendor-icons-CvUwI5QC.js","assets/index-DUiEMYya.css","assets/limits-CwjsBkae.js"])))=>i.map(i=>d[i]);
import{_ as va}from"./vendor-pdf-hYLUQ4hX.js";import{b as na,a as la,c as wa,R as Sa,m as Ma,n as ya,o as $a,j as a,S as ua,d as Da,q as ba,u as Ia,g as Pa,i as Ea,e as Fa,T as ma}from"./index-B1mWfsSV.js";import{r as w}from"./vendor-Bk0NZ5Or.js";import{g as Ta,p as ia,a as aa,f as ka}from"./datasAzores-D98tNLGd.js";import{f as ja}from"./vendor-datefns-Bx-fPEFT.js";import{p as Ca}from"./pt-d6krgdcU.js";import{V as za,X as pa,Y as Ua,Z as La,n as Ra,w as ra,x as Aa,I as Ha}from"./vendor-icons-CvUwI5QC.js";import{a as ha,s as ga,e as Ka}from"./emailConfig-mMFhqgpy.js";import{T as B,c as Oa,h as _a,a as Ba,e as Va,P as Ga}from"./relatorioBaseStyles--Y-lSqCr.js";const ea=(u,f)=>u(f)?.nome?.toLowerCase().includes("levador")??!1,sa=u=>["sub5","sub14"].includes(u),Wa=u=>ba.includes(u);function Za(u=[]){return[...u].sort((f,o)=>{const h=(f?.nome??"").trim(),l=(o?.nome??"").trim();return h.localeCompare(l,"pt",{sensitivity:"base"})})}function ta(u){const f=String(u?.id??"").trim();if(f)return`id:${f}`;const o=(u?.nome??"").trim().toLowerCase();return o?`name:${o}`:""}function Ya(u){return new Promise((f,o)=>{const h=new FileReader;h.onerror=o,h.onload=()=>f(String(h.result||"")),h.readAsDataURL(u)})}function Qa(u){return new Promise((f,o)=>{const h=new Image;h.onerror=o,h.onload=()=>{const y=Math.min(1200/h.width,360/h.height,1),$=Math.max(1,Math.round(h.width*y)),j=Math.max(1,Math.round(h.height*y)),c=document.createElement("canvas");c.width=$,c.height=j;const E=c.getContext("2d");E.clearRect(0,0,$,j),E.drawImage(h,0,0,$,j),f(c.toDataURL("image/png",.92))},h.src=u})}function ne({isOpen:u,onClose:f,mode:o,clienteNifLocked:h,maquina:l,onSave:U}){const{clientes:y,categorias:$,marcas:j,maquinas:c,INTERVALOS:E,getSubcategoriasByCategoria:v,getSubcategoria:i,getCategoria:N,addMarca:I,addMaquina:C,updateMaquina:m,addManutencao:b,manutencoes:R,updateManutencao:Z}=na(),{showToast:P}=la(),{user:T}=wa(),K=T?.role===Sa.ADMIN,[q,D]=w.useState(""),V=w.useMemo(()=>{const e=new Date().getFullYear(),t=new Set;for(let p=e-1;p<=e+3;p++)Ma(p).forEach(M=>t.add(M));return t},[]),O=w.useCallback(e=>{if(!e)return D(""),!0;const t=new Date(e+"T12:00:00");if(ya(t)){const p=t.getDay()===0?"Domingo":"Sábado";return D(`${p} — não é dia útil. Escolha um dia de semana.`),!1}return $a(t,V)?(D("Esta data é feriado. Escolha outro dia."),!1):(D(""),!0)},[V]),H=w.useRef(!1),[n,x]=w.useState({clienteNif:"",categoriaId:"",subcategoriaId:"",periodicidadeManut:"",marcaId:"",marca:"",marcaLogoUrl:"",modelo:"",numeroSerie:"",anoFabrico:"",numeroDocumentoVenda:"",proximaManut:"",refKitManut3000h:"",refKitManut6000h:"",refCorreia:"",refFiltroOleo:"",refFiltroSeparador:"",refFiltroAr:"",posicaoKaeser:null}),G=n.categoriaId?v(n.categoriaId):[],[F,_]=w.useState(!1),[k,L]=w.useState({nome:"",logoUrl:"",corHex:"#1a4880"}),[X,r]=w.useState(!1),s=Za(j),d=e=>s.find(t=>String(t?.id)===String(e)),S=e=>s.find(t=>(t?.nome??"").trim().toLowerCase()===String(e??"").trim().toLowerCase()),Y=e=>s.find(t=>ta(t)===e),W=(()=>{if(F)return"__new__";if(n.marcaId){const e=d(n.marcaId);if(e)return ta(e)}if(n.marca){const e=S(n.marca);if(e)return ta(e)}return""})();w.useEffect(()=>{const e=u&&!H.current;if(H.current=u,!!e){if(o==="add"){const p=$[0]?.id||"",g=v(p)[0]?.id||"",A=ea(N,p)?"anual":"";x({clienteNif:h||y[0]?.nif||"",categoriaId:p,subcategoriaId:g,periodicidadeManut:A,marcaId:"",marca:"",marcaLogoUrl:"",marcaCorHex:"",modelo:"",numeroSerie:"",anoFabrico:new Date().getFullYear(),numeroDocumentoVenda:"",proximaManut:Ta(),refKitManut3000h:"",refKitManut6000h:"",refCorreia:"",refFiltroOleo:"",refFiltroSeparador:"",refFiltroAr:"",posicaoKaeser:sa(g)?0:null}),_(!1),L({nome:"",logoUrl:"",corHex:"#1a4880"})}else if(l){const t=i(l.subcategoriaId);N(t?.categoriaId);const p=l.periodicidadeManut??(ea(N,t?.categoriaId)?"anual":""),M=j.find(g=>(g.nome??"").toLowerCase()===(l.marca??"").toLowerCase());x({id:l.id,clienteNif:l.clienteNif,categoriaId:t?.categoriaId||"",subcategoriaId:l.subcategoriaId,periodicidadeManut:p,marcaId:l.marcaId!=null?String(l.marcaId):M?.id!=null?String(M.id):"",marca:l.marca,marcaLogoUrl:l.marcaLogoUrl||"",marcaCorHex:l.marcaCorHex||M?.corHex||"",modelo:l.modelo,numeroSerie:l.numeroSerie,anoFabrico:l.anoFabrico||"",numeroDocumentoVenda:l.numeroDocumentoVenda||"",proximaManut:l.proximaManut,refKitManut3000h:l.refKitManut3000h||"",refKitManut6000h:l.refKitManut6000h||"",refCorreia:l.refCorreia||"",refFiltroOleo:l.refFiltroOleo||"",refFiltroSeparador:l.refFiltroSeparador||"",refFiltroAr:l.refFiltroAr||"",posicaoKaeser:l.posicaoKaeser??(sa(l.subcategoriaId)?0:null)}),_(!1),L({nome:"",logoUrl:"",corHex:"#1a4880"})}}},[u,o,h,l,$,y,j,v,i,N,E]);const Q=async e=>{if(e.preventDefault(),!K&&!O(n.proximaManut)){P("A data escolhida não é dia útil. Selecione outro dia.","warning");return}const{categoriaId:t,id:p,...M}=n;let g={...M};try{if(F){const A=k.nome.trim();if(!A){P("Indique o nome da nova marca.","warning");return}const z=k.logoUrl.trim(),ca=(k.corHex||"").trim(),da=await I({nome:A,logoUrl:z,corHex:ca}),Na=da!=null?String(da):"";g={...g,marcaId:Na,marca:A,marcaLogoUrl:z,marcaCorHex:ca}}else if(g.marcaId||g.marca){const A=g.marcaId?j.find(z=>String(z.id)===String(g.marcaId)):j.find(z=>(z?.nome??"").trim().toLowerCase()===String(g.marca??"").trim().toLowerCase());A&&(g={...g,marcaId:A.id!=null&&String(A.id).trim()!==""?String(A.id):"",marca:A.nome||g.marca||"",marcaLogoUrl:A.logoUrl||g.marcaLogoUrl||"",marcaCorHex:A.corHex||g.marcaCorHex||""})}if(o==="add"){const A=await C(g);g.proximaManut&&b({maquinaId:A,data:g.proximaManut,tipo:"periodica",status:"pendente",observacoes:"",tecnico:""}),P("Equipamento adicionado com sucesso.","success"),U?.({id:A,...g},"add")}else{if(await m(p,g),g.proximaManut&&g.proximaManut!==l?.proximaManut){const A=R.find(z=>z.maquinaId===p&&(z.status==="pendente"||z.status==="agendada"));A?Z(A.id,{data:g.proximaManut}):b({maquinaId:p,data:g.proximaManut,tipo:"periodica",status:"pendente",observacoes:"",tecnico:""})}P("Equipamento actualizado com sucesso.","success"),U?.({id:p,...g},"edit")}f()}catch(A){P(A?.message||"Falha ao guardar equipamento/marca.","error",4e3)}};if(!u)return null;const J=async e=>{if(e){if(!e.type?.startsWith("image/")){P("Selecione um ficheiro de imagem válido.","warning");return}r(!0);try{const t=await Ya(e),p=await Qa(t),{apiUploadMarcaLogo:M}=await va(async()=>{const{apiUploadMarcaLogo:z}=await import("./apiService-ztsgq9LE.js");return{apiUploadMarcaLogo:z}},__vite__mapDeps([0,1,2,3,4,5,6])),g=k.nome.trim()||"marca",A=await M({dataUrl:p,brandName:g});L(z=>({...z,logoUrl:A?.url||""})),P("Logotipo carregado e otimizado com sucesso.","success")}catch(t){P(`Falha no upload do logotipo: ${t?.message||"erro desconhecido"}`,"error",4e3)}finally{r(!1)}}};return a.jsx("div",{className:"modal-overlay",onClick:f,children:a.jsxs("div",{className:"modal",onClick:e=>e.stopPropagation(),children:[a.jsx("h2",{children:o==="add"?"Nova máquina":"Editar máquina"}),a.jsxs("form",{onSubmit:Q,children:[a.jsxs("label",{children:["Cliente",a.jsx("select",{required:!0,value:n.clienteNif,onChange:e=>x(t=>({...t,clienteNif:e.target.value})),disabled:!!h,className:h?"readonly":"",children:[...y].sort((e,t)=>(e.nome||"").localeCompare(t.nome||"","pt")).map(e=>a.jsxs("option",{value:e.nif,children:[e.nome," (NIF: ",e.nif,")"]},e.nif))})]}),a.jsxs("label",{children:["Categoria",a.jsx("select",{required:!0,value:n.categoriaId,onChange:e=>{const t=e.target.value,p=v(t),M=ea(N,t)?"anual":"";x(g=>({...g,categoriaId:t,subcategoriaId:p[0]?.id||"",periodicidadeManut:M}))},children:$.map(e=>a.jsxs("option",{value:e.id,children:[e.nome," (",e.intervaloTipo,")"]},e.id))})]}),a.jsxs("label",{children:["Subcategoria (tipo de máquina)",a.jsx("select",{required:!0,value:n.subcategoriaId,onChange:e=>x(t=>({...t,subcategoriaId:e.target.value})),children:G.map(e=>a.jsx("option",{value:e.id,children:e.nome},e.id))})]}),ea(N,n.categoriaId)&&a.jsxs("label",{children:["Periodicidade de manutenção",a.jsxs("select",{required:!0,value:n.periodicidadeManut,onChange:e=>x(t=>({...t,periodicidadeManut:e.target.value})),children:[a.jsx("option",{value:"trimestral",children:"3 meses (trimestral)"}),a.jsx("option",{value:"semestral",children:"6 meses (semestral)"}),a.jsx("option",{value:"anual",children:"1 ano (anual)"})]})]}),!ea(N,n.categoriaId)&&n.categoriaId&&a.jsxs("label",{children:["Periodicidade de manutenção",a.jsxs("select",{value:n.periodicidadeManut,onChange:e=>x(t=>({...t,periodicidadeManut:e.target.value})),children:[a.jsx("option",{value:"",children:"Usar da categoria"}),a.jsx("option",{value:"trimestral",children:"3 meses (trimestral)"}),a.jsx("option",{value:"semestral",children:"6 meses (semestral)"}),a.jsx("option",{value:"anual",children:"1 ano (anual)"})]})]}),a.jsxs("div",{className:"form-row",children:[a.jsxs("label",{children:["Marca",a.jsxs("select",{value:W,onChange:e=>{const t=e.target.value;if(t==="__new__"){_(!0),x(M=>({...M,marcaId:"",marca:"",marcaLogoUrl:"",marcaCorHex:""}));return}if(!t){_(!1),L({nome:"",logoUrl:"",corHex:"#1a4880"}),x(M=>({...M,marcaId:"",marca:"",marcaLogoUrl:"",marcaCorHex:""}));return}const p=Y(t);_(!1),L({nome:"",logoUrl:"",corHex:"#1a4880"}),x(M=>({...M,marcaId:p?.id!=null&&String(p.id).trim()!==""?String(p.id):"",marca:p?.nome||"",marcaLogoUrl:p?.logoUrl||"",marcaCorHex:p?.corHex||""}))},children:[a.jsx("option",{value:"",children:"— Selecionar marca —"}),s.map(e=>a.jsx("option",{value:ta(e),children:e.nome},ta(e)||`marca-${(e?.nome??"").toLowerCase()}`)),a.jsx("option",{value:"__new__",children:"+ Nova Marca…"})]}),!F&&!n.marcaId&&a.jsx("small",{className:"text-muted",children:"Selecione uma marca ou crie uma nova."})]}),F&&a.jsxs(a.Fragment,{children:[a.jsxs("label",{children:["Nova marca",a.jsx("input",{value:k.nome,onChange:e=>L(t=>({...t,nome:e.target.value})),placeholder:"Ex: ISTOBAL"})]}),a.jsxs("label",{children:["URL do logotipo da marca",a.jsx("input",{type:"url",value:k.logoUrl,onChange:e=>L(t=>({...t,logoUrl:e.target.value})),placeholder:"https://.../logo-marca.png"})]}),a.jsxs("label",{children:["Cor institucional da marca",a.jsxs("div",{style:{display:"flex",gap:"0.5rem",alignItems:"center"},children:[a.jsx("input",{type:"color",value:k.corHex||"#1a4880",onChange:e=>L(t=>({...t,corHex:e.target.value})),style:{width:"48px",height:"34px",padding:0}}),a.jsx("input",{type:"text",value:k.corHex,onChange:e=>L(t=>({...t,corHex:e.target.value})),placeholder:"#c8102e"})]})]}),a.jsxs("label",{children:["Upload do logotipo (recomendado)",a.jsx("input",{type:"file",accept:"image/png,image/jpeg,image/webp,image/svg+xml",onChange:async e=>{const t=e.target.files?.[0];await J(t),e.target.value=""},disabled:X}),a.jsx("small",{className:"text-muted",children:X?"A otimizar e enviar logotipo...":"A imagem é otimizada automaticamente para documentos."})]}),k.logoUrl&&a.jsxs("div",{className:"form-group",children:[a.jsx("small",{className:"text-muted",children:"Pré-visualização do logotipo:"}),a.jsx("div",{style:{marginTop:"0.35rem",padding:"0.45rem",border:"1px solid #e2e8f0",borderRadius:"6px",background:"#fff"},children:a.jsx("img",{src:k.logoUrl,alt:"Preview logotipo da marca",style:{maxHeight:"42px",maxWidth:"170px",objectFit:"contain"}})})]})]}),a.jsxs("label",{children:["Modelo",a.jsx("input",{value:n.modelo,onChange:e=>x(t=>({...t,modelo:e.target.value})),placeholder:"Ex: EV-4P"})]}),a.jsxs("label",{children:["Nº Série",a.jsx("input",{required:!0,value:n.numeroSerie,onChange:e=>x(t=>({...t,numeroSerie:e.target.value})),placeholder:"Ex: NAV-EV-001"})]})]}),a.jsxs("div",{className:"form-row",children:[a.jsxs("label",{children:["Ano de fabrico",a.jsx("input",{type:"number",min:1900,max:2100,value:n.anoFabrico,onChange:e=>x(t=>({...t,anoFabrico:e.target.value?Number(e.target.value):""})),placeholder:"Ex: 2022"})]}),a.jsxs("label",{children:["Nº documento de venda",a.jsx("input",{value:n.numeroDocumentoVenda,onChange:e=>x(t=>({...t,numeroDocumentoVenda:e.target.value})),placeholder:"Ex: FV-2022-001"})]})]}),a.jsxs("label",{children:["Próxima data de manutenção",a.jsx("input",{type:"date",required:!0,value:n.proximaManut,onChange:e=>{const t=e.target.value;x(p=>({...p,proximaManut:t})),O(t)}}),q&&a.jsx("span",{className:"form-aviso-data",children:q})]}),o==="edit"&&(()=>{const e=c.find(t=>t.id===n.id);return!e||!Wa(e.subcategoriaId)||!e.ultimaManutencaoData&&e.horasTotaisAcumuladas==null&&e.horasServicoAcumuladas==null?null:a.jsxs("div",{className:"form-section horas-acumuladas-section",children:[a.jsx("h3",{children:"Contadores (atualizados à última manutenção)"}),a.jsxs("p",{className:"horas-info",children:[e.ultimaManutencaoData&&a.jsxs("span",{children:["Última manutenção: ",ja(new Date(e.ultimaManutencaoData+"T12:00:00"),"d MMM yyyy",{locale:Ca})]}),e.ultimaManutencaoData&&(e.horasTotaisAcumuladas!=null||e.horasServicoAcumuladas!=null)&&" · ",e.horasTotaisAcumuladas!=null&&a.jsxs("span",{children:["Horas totais: ",e.horasTotaisAcumuladas,"h"]}),e.horasTotaisAcumuladas!=null&&e.horasServicoAcumuladas!=null&&" · ",e.horasServicoAcumuladas!=null&&a.jsxs("span",{children:["Horas de serviço: ",e.horasServicoAcumuladas,"h"]})]})]})})(),sa(n.subcategoriaId)&&a.jsxs("div",{className:"form-section",children:[a.jsx("h3",{children:"Ciclo de manutenção KAESER (A/B/C/D)"}),a.jsx("p",{className:"horas-info",children:"Sequência anual: A → B → A → C → A → B → A → C → A → B → A → D (ciclo de 12 anos)"}),a.jsxs("label",{children:["Posição actual no ciclo (0 = Ano 1 Tipo A, 1 = Ano 2 Tipo B, ...)",a.jsx("select",{value:n.posicaoKaeser??0,onChange:e=>x(t=>({...t,posicaoKaeser:Number(e.target.value)})),children:ua.map((e,t)=>a.jsxs("option",{value:t,children:["Ano ",t+1," — Tipo ",e,t===(n.posicaoKaeser??0)?" (actual)":""]},t))})]}),n.posicaoKaeser!=null&&a.jsxs("p",{className:"horas-info",style:{marginTop:"0.25rem"},children:[a.jsx("strong",{children:"Próxima manutenção:"})," ",Da((n.posicaoKaeser+1)%ua.length)]})]}),sa(n.subcategoriaId)&&a.jsxs("div",{className:"form-section consumiveis-section",children:[a.jsx("h3",{children:"Consumíveis (manutenção regular)"}),a.jsxs("div",{className:"form-row",children:[a.jsxs("label",{children:["Refª kit manutenção 3000h",a.jsx("input",{value:n.refKitManut3000h,onChange:e=>x(t=>({...t,refKitManut3000h:e.target.value})),placeholder:"Ex: 1900 1466 00"})]}),a.jsxs("label",{children:["Refª kit manutenção 6000h",a.jsx("input",{value:n.refKitManut6000h,onChange:e=>x(t=>({...t,refKitManut6000h:e.target.value})),placeholder:"Ex: 1900 1467 00"})]})]}),a.jsxs("div",{className:"form-row",children:[a.jsxs("label",{children:["Refª correia",a.jsx("input",{value:n.refCorreia,onChange:e=>x(t=>({...t,refCorreia:e.target.value})),placeholder:"Ex: 1900 1468 00"})]}),a.jsxs("label",{children:["Refª filtro de óleo",a.jsx("input",{value:n.refFiltroOleo,onChange:e=>x(t=>({...t,refFiltroOleo:e.target.value})),placeholder:"Ex: 1900 1469 00"})]})]}),a.jsxs("div",{className:"form-row",children:[a.jsxs("label",{children:["Refª filtro separador",a.jsx("input",{value:n.refFiltroSeparador,onChange:e=>x(t=>({...t,refFiltroSeparador:e.target.value})),placeholder:"Ex: 1900 1470 00"})]}),a.jsxs("label",{children:["Refª filtro do ar",a.jsx("input",{value:n.refFiltroAr,onChange:e=>x(t=>({...t,refFiltroAr:e.target.value})),placeholder:"Ex: 1900 1471 00"})]})]})]}),a.jsxs("div",{className:"form-actions",children:[a.jsx("button",{type:"button",className:"btn secondary",onClick:f,children:"Cancelar"}),a.jsx("button",{type:"submit",className:"btn",children:o==="add"?"Adicionar":"Guardar"})]})]})]})})}function qa(u){const f=["A","B","C","D"],o={A:[],B:[],C:[],D:[]};let h=null;const l=u.split(/\r?\n/);for(const U of l){const y=U.trim();if(!y)continue;if(f.includes(y)&&U.length<5){h=y;continue}const $=y.match(/^(\d{4})\s+/);if(!$||!h)continue;const j=$[1],c=y.slice(4).trim(),E=c.match(/\s+(\d+(?:[.,]\d+)?)\s+([A-ZÇ]{2,4})\s*$/);let v=1,i="PÇ",N=c;E&&(v=parseFloat(E[1].replace(",","."))||1,i=E[2].replace("Ç","Ç"),i==="PC"&&(i="PÇ"),N=c.slice(0,c.length-E[0].length).trim());const I=N.match(/^([\d.]+(?:E\d+)?)\s+(.+)$/s);let C="",m=N;if(I&&I[1].includes(".")){const b=I[1];/^[\d.]+(?:E\d+)?$/.test(b)&&(C=b,m=I[2].trim())}!m||m.length<2||o[h].push({posicao:j,codigoArtigo:C||j,descricao:m,quantidade:v,unidade:i})}return o}const xa=[{id:"A",label:"Tipo A",hint:"3.000h / 1 ano"},{id:"B",label:"Tipo B",hint:"6.000h"},{id:"C",label:"Tipo C",hint:"12.000h"},{id:"D",label:"Tipo D",hint:"36.000h"},{id:"periodica",label:"Periódica",hint:"Manutenção periódica standard"}],fa=["PÇ","TER","L","KG","M","UN"],oa={posicao:"",codigoArtigo:"",descricao:"",quantidade:1,unidade:"PÇ"};function le({isOpen:u,onClose:f,maquina:o,modoInicial:h=!1}){const{getPecasPlanoByMaquina:l,addPecaPlano:U,addPecasPlanoLote:y,updatePecaPlano:$,removePecaPlano:j,removePecasPlanoByMaquina:c,getSubcategoria:E}=na(),{showToast:v}=la(),{showGlobalLoading:i,hideGlobalLoading:N}=Ia(),I=w.useRef(null),[C,m]=w.useState("A"),[b,R]=w.useState(oa),[Z,P]=w.useState(null),[T,K]=w.useState(oa),[q,D]=w.useState(!1),[V,O]=w.useState(null),H=o?E(o.subcategoriaId):null;o&&Pa.includes(o.subcategoriaId);const n=o&&Ea(o.marca),x=n?xa:xa.filter(s=>s.id==="periodica");w.useEffect(()=>{x.length>0&&!x.some(s=>s.id===C)&&m(x[0].id)},[o?.id,x,C]);const G=w.useMemo(()=>o?l(o.id,C):[],[o,C,l]),F=w.useMemo(()=>o?l(o.id).length:0,[o,l]);if(!u||!o)return null;const _=s=>{if(s.preventDefault(),!b.codigoArtigo.trim()||!b.descricao.trim()){v("Código de artigo e descrição são obrigatórios.","warning");return}U({...b,maquinaId:o.id,tipoManut:C}),R(oa),v("Peça adicionada ao plano.","success")},k=s=>{if(!T.codigoArtigo.trim()||!T.descricao.trim()){v("Código de artigo e descrição são obrigatórios.","warning");return}$(s,T),P(null),v("Peça actualizada.","success")},L=async s=>{const d=s.target.files?.[0];if(!(!d||!o)){if(s.target.value="",!d.name.toLowerCase().endsWith(".pdf")){v("Seleccione um ficheiro PDF.","warning");return}i();try{const{PDFParse:S}=await va(async()=>{const{PDFParse:p}=await import("./pdf-parse.es-DWQLbnCA.js");return{PDFParse:p}},[]);S.setWorker("/manut/pdf.worker.mjs");const Y=await d.arrayBuffer(),W=new S({data:new Uint8Array(Y)}),{text:Q}=await W.getText();W.destroy?.();const J=qa(Q||""),e=[];for(const p of["A","B","C","D"])for(const M of J[p]||[])e.push({...M,maquinaId:o.id,tipoManut:p});if(e.length===0){v("Não foi possível extrair peças do PDF. Verifique se o formato é um plano KAESER A/B/C/D.","warning");return}c(o.id),y(e);const t={A:0,B:0,C:0,D:0};e.forEach(p=>{t[p.tipoManut]=(t[p.tipoManut]||0)+1}),v(`${e.length} peças importadas (A: ${t.A}, B: ${t.B}, C: ${t.C}, D: ${t.D}).`,"success")}catch(S){v(`Erro ao ler PDF: ${S?.message||"desconhecido"}`,"error")}finally{N()}}},X=()=>{G.forEach(s=>j(s.id)),D(!1),v(`Plano Tipo ${C} limpo.`,"success")},r=()=>{c(o.id),D(!1),v("Todos os planos desta máquina foram eliminados.","success")};return a.jsx("div",{className:"modal-overlay",onClick:f,children:a.jsxs("div",{className:"modal modal-pecas-plano",onClick:s=>s.stopPropagation(),children:[a.jsxs("div",{className:"modal-pecas-header",children:[a.jsxs("div",{children:[a.jsxs("h2",{children:[a.jsx(za,{size:20})," Plano de peças e consumíveis"]}),a.jsxs("p",{className:"modal-pecas-sub",children:[o.marca," ",o.modelo," — Nº Série: ",a.jsx("strong",{children:o.numeroSerie}),H&&a.jsxs(a.Fragment,{children:["  ·  ",H.nome]})]})]}),a.jsx("button",{className:"icon-btn",onClick:f,title:"Fechar",children:a.jsx(pa,{size:20})})]}),a.jsxs("div",{className:"modal-pecas-tabs",children:[x.map(s=>{const d=o?l(o.id,s.id).length:0;return a.jsxs("button",{className:`tab-tipo ${C===s.id?"active":""}`,onClick:()=>{m(s.id),P(null),R(oa)},children:[a.jsx("span",{className:"tab-tipo-label",children:s.label}),a.jsx("span",{className:"tab-tipo-hint",children:s.hint}),d>0&&a.jsx("span",{className:"tab-tipo-count",children:d})]},s.id)}),a.jsx("span",{className:"tab-total",children:F>0?`${F} peças no total`:"Sem peças configuradas"})]}),h&&F===0&&a.jsxs("div",{className:"modal-pecas-boas-vindas",children:[a.jsx("strong",{children:"Equipamento criado!"}),n?a.jsxs(a.Fragment,{children:[" Configure o plano de consumíveis deste compressor KAESER. Use ",a.jsx("em",{children:'"Importar template para esta máquina"'})," para carregar o plano a partir do PDF e ajuste os artigos ao número de série."]}):a.jsx(a.Fragment,{children:" Configure os consumíveis recomendados para as manutenções periódicas deste equipamento. Adicione cada artigo manualmente."})]}),n&&C!=="periodica"&&a.jsxs("div",{className:"modal-pecas-import",children:[a.jsx("input",{ref:I,type:"file",accept:".pdf",className:"hidden-file-input",onChange:L,"aria-label":"Seleccionar PDF do plano de manutenção"}),a.jsx("span",{className:"import-hint",children:"Selecione o PDF do plano de manutenção desta máquina (formato KAESER A/B/C/D)."}),a.jsxs("button",{type:"button",className:"btn btn-sm primary",onClick:()=>I.current?.click(),children:[a.jsx(Ua,{size:14})," Importar template para esta máquina"]})]}),a.jsx("div",{className:"modal-pecas-table-wrap",children:G.length===0?a.jsxs("p",{className:"modal-pecas-vazio",children:["Sem peças configuradas para ",a.jsxs("strong",{children:["Tipo ",C==="periodica"?"Periódica":C]}),".",n&&C!=="periodica"&&' Use "Importar template para esta máquina" para carregar o plano a partir de um PDF.',!n&&" Adicione cada consumível manualmente no formulário abaixo."]}):a.jsxs("table",{className:"tabela-pecas",children:[a.jsx("thead",{children:a.jsxs("tr",{children:[a.jsx("th",{children:"Pos."}),a.jsx("th",{children:"Código artigo"}),a.jsx("th",{children:"Descrição"}),a.jsx("th",{children:"Qtd"}),a.jsx("th",{children:"Un."}),a.jsx("th",{})]})}),a.jsx("tbody",{children:G.map(s=>Z===s.id?a.jsxs("tr",{className:"row-edit",children:[a.jsx("td",{children:a.jsx("input",{className:"input-sm",value:T.posicao,onChange:d=>K(S=>({...S,posicao:d.target.value})),placeholder:"Ex: 0512",style:{width:"60px"}})}),a.jsx("td",{children:a.jsx("input",{className:"input-sm",value:T.codigoArtigo,onChange:d=>K(S=>({...S,codigoArtigo:d.target.value})),required:!0,style:{width:"130px"}})}),a.jsx("td",{children:a.jsx("input",{className:"input-sm",value:T.descricao,onChange:d=>K(S=>({...S,descricao:d.target.value})),required:!0,style:{width:"100%"}})}),a.jsx("td",{children:a.jsx("input",{className:"input-sm",type:"number",min:.01,step:.01,value:T.quantidade,onChange:d=>K(S=>({...S,quantidade:parseFloat(d.target.value)||1})),style:{width:"60px"}})}),a.jsx("td",{children:a.jsx("select",{className:"input-sm",value:T.unidade,onChange:d=>K(S=>({...S,unidade:d.target.value})),children:fa.map(d=>a.jsx("option",{children:d},d))})}),a.jsxs("td",{className:"cell-actions",children:[a.jsx("button",{className:"icon-btn success",onClick:()=>k(s.id),title:"Guardar",children:a.jsx(La,{size:14})}),a.jsx("button",{className:"icon-btn",onClick:()=>P(null),title:"Cancelar",children:a.jsx(pa,{size:14})})]})]},s.id):a.jsxs("tr",{children:[a.jsx("td",{className:"cell-pos",children:s.posicao||"—"}),a.jsx("td",{className:"cell-code",children:s.codigoArtigo}),a.jsx("td",{children:s.descricao}),a.jsx("td",{className:"cell-qty",children:s.quantidade}),a.jsx("td",{className:"cell-un",children:s.unidade}),a.jsxs("td",{className:"cell-actions",children:[a.jsx("button",{className:"icon-btn secondary",onClick:()=>{P(s.id),K({posicao:s.posicao||"",codigoArtigo:s.codigoArtigo,descricao:s.descricao,quantidade:s.quantidade,unidade:s.unidade})},title:"Editar",children:a.jsx(Ra,{size:14})}),V===s.id?a.jsxs(a.Fragment,{children:[a.jsx("button",{className:"icon-btn danger",onClick:()=>{j(s.id),O(null),v("Peça removida.","success")},title:"Confirmar",children:"Sim"}),a.jsx("button",{className:"icon-btn secondary",onClick:()=>O(null),title:"Cancelar",children:"Não"})]}):a.jsx("button",{className:"icon-btn danger",onClick:()=>O(s.id),title:"Remover",children:a.jsx(ra,{size:14})})]})]},s.id))})]})}),a.jsxs("form",{className:"modal-pecas-add-row",onSubmit:_,children:[a.jsx("input",{className:"input-sm",placeholder:"Posição",value:b.posicao,onChange:s=>R(d=>({...d,posicao:s.target.value})),style:{width:"65px",flexShrink:0}}),a.jsx("input",{className:"input-sm",placeholder:"Código artigo *",value:b.codigoArtigo,onChange:s=>R(d=>({...d,codigoArtigo:s.target.value})),style:{width:"135px",flexShrink:0}}),a.jsx("input",{className:"input-sm",placeholder:"Descrição *",value:b.descricao,onChange:s=>R(d=>({...d,descricao:s.target.value})),style:{flex:1}}),a.jsx("input",{className:"input-sm",type:"number",min:.01,step:.01,value:b.quantidade,onChange:s=>R(d=>({...d,quantidade:parseFloat(s.target.value)||1})),style:{width:"60px",flexShrink:0}}),a.jsx("select",{className:"input-sm",value:b.unidade,onChange:s=>R(d=>({...d,unidade:s.target.value})),style:{width:"70px",flexShrink:0},children:fa.map(s=>a.jsx("option",{children:s},s))}),a.jsxs("button",{type:"submit",className:"btn btn-sm primary",style:{flexShrink:0},children:[a.jsx(Aa,{size:14})," Adicionar"]})]}),a.jsx("div",{className:"modal-pecas-footer form-actions",children:q?a.jsxs("div",{className:"confirmar-limpar",children:[a.jsx("button",{type:"button",className:"btn btn-sm secondary",onClick:()=>D(!1),children:"Cancelar"}),a.jsx("span",{className:"confirmar-limpar-label",children:"Eliminar:"}),a.jsxs("button",{type:"button",className:"btn btn-sm danger",onClick:X,children:["Só Tipo ",C==="periodica"?"Periódica":C," (",G.length,")"]}),a.jsxs("button",{type:"button",className:"btn btn-sm danger",onClick:r,children:["Toda a máquina (",F,")"]})]}):a.jsxs(a.Fragment,{children:[F>0&&a.jsxs("button",{type:"button",className:"btn btn-sm btn-outline-muted",onClick:()=>D(!0),children:[a.jsx(ra,{size:13})," Limpar plano…"]}),a.jsx("button",{type:"button",className:"btn secondary modal-pecas-fechar",onClick:f,children:"Fechar"})]})})]})})}function ce({isOpen:u,onClose:f,maquina:o}){const{maquinas:h,addDocumentoMaquina:l,removeDocumentoMaquina:U}=na(),{showToast:y}=la(),{isAdmin:$}=Fa(),[j,c]=w.useState({tipo:"manual_utilizador",titulo:"",url:""}),[E,v]=w.useState(null);if(!u)return null;const i=h.find(m=>m.id===o?.id)??o,N=i?i.documentos??[]:[],I=m=>ma.find(b=>b.id===m)?.label??m,C=m=>{if(m.preventDefault(),!j.titulo.trim()||!j.url.trim())return;const b=ha(j.url.trim());if(b==="#"){y("URL inválida. Use um link que comece por https:// ou http://","warning");return}l(i.id,{tipo:j.tipo,titulo:j.titulo.trim(),url:b}),c({tipo:"manual_utilizador",titulo:"",url:""})};return a.jsx("div",{className:"modal-overlay",onClick:f,children:a.jsxs("div",{className:"modal modal-documentacao",onClick:m=>m.stopPropagation(),children:[a.jsxs("h2",{children:["Documentação — ",i?.marca," ",i?.modelo]}),a.jsx("p",{className:"modal-hint",children:"Adicione manuais, esquemas e planos de manutenção para os técnicos consultarem."}),ba.includes(i?.subcategoriaId)&&(i?.ultimaManutencaoData||i?.horasTotaisAcumuladas!=null||i?.horasServicoAcumuladas!=null)&&a.jsxs("div",{className:"consumiveis-card",children:[a.jsx("h4",{children:"Contadores (à data da última manutenção)"}),a.jsxs("div",{className:"consumiveis-grid",children:[i.ultimaManutencaoData&&a.jsxs("span",{children:[a.jsx("strong",{children:"Última manut.:"})," ",ja(ia(i.ultimaManutencaoData),"d MMM yyyy",{locale:Ca})]}),i.horasTotaisAcumuladas!=null&&a.jsxs("span",{children:[a.jsx("strong",{children:"Horas totais:"})," ",i.horasTotaisAcumuladas,"h"]}),i.horasServicoAcumuladas!=null&&a.jsxs("span",{children:[a.jsx("strong",{children:"Horas serviço:"})," ",i.horasServicoAcumuladas,"h"]})]})]}),["sub5","sub14"].includes(i?.subcategoriaId)&&(i?.refKitManut3000h||i?.refKitManut6000h||i?.refCorreia||i?.refFiltroOleo||i?.refFiltroSeparador||i?.refFiltroAr)&&a.jsxs("div",{className:"consumiveis-card",children:[a.jsx("h4",{children:"Consumíveis"}),a.jsxs("div",{className:"consumiveis-grid",children:[i.refKitManut3000h&&a.jsxs("span",{children:[a.jsx("strong",{children:"Kit 3000h:"})," ",i.refKitManut3000h]}),i.refKitManut6000h&&a.jsxs("span",{children:[a.jsx("strong",{children:"Kit 6000h:"})," ",i.refKitManut6000h]}),i.refCorreia&&a.jsxs("span",{children:[a.jsx("strong",{children:"Correia:"})," ",i.refCorreia]}),i.refFiltroOleo&&a.jsxs("span",{children:[a.jsx("strong",{children:"Filtro óleo:"})," ",i.refFiltroOleo]}),i.refFiltroSeparador&&a.jsxs("span",{children:[a.jsx("strong",{children:"Filtro separador:"})," ",i.refFiltroSeparador]}),i.refFiltroAr&&a.jsxs("span",{children:[a.jsx("strong",{children:"Filtro ar:"})," ",i.refFiltroAr]})]})]}),a.jsxs("div",{className:"doc-lista",children:[N.map(m=>a.jsxs("div",{className:"doc-item",children:[a.jsxs("div",{className:"doc-item-info",children:[a.jsx("span",{className:"doc-tipo",children:I(m.tipo)}),a.jsx("span",{className:"doc-titulo",children:m.titulo})]}),a.jsxs("div",{className:"doc-item-actions",children:[a.jsx("a",{href:ha(m.url),target:"_blank",rel:"noopener noreferrer",className:"icon-btn secondary",title:"Abrir",children:a.jsx(Ha,{size:16})}),$&&E===m.id?a.jsxs(a.Fragment,{children:[a.jsx("button",{type:"button",className:"icon-btn danger",onClick:()=>{U(i.id,m.id),v(null),y("Documento removido.","success")},title:"Confirmar",children:"Sim"}),a.jsx("button",{type:"button",className:"icon-btn secondary",onClick:()=>v(null),title:"Cancelar",children:"Não"})]}):$&&a.jsx("button",{type:"button",className:"icon-btn danger",onClick:()=>v(m.id),title:"Remover",children:a.jsx(ra,{size:16})})]})]},m.id)),N.length===0&&a.jsx("p",{className:"doc-empty",children:"Nenhum documento associado."})]}),$&&a.jsxs("form",{onSubmit:C,className:"form-add-doc",children:[a.jsxs("div",{className:"form-row",children:[a.jsxs("label",{children:["Tipo",a.jsx("select",{value:j.tipo,onChange:m=>c(b=>({...b,tipo:m.target.value})),children:ma.map(m=>a.jsx("option",{value:m.id,children:m.label},m.id))})]}),a.jsxs("label",{style:{flex:1},children:["Título",a.jsx("input",{value:j.titulo,onChange:m=>c(b=>({...b,titulo:m.target.value})),placeholder:"Ex: Manual GA-22",required:!0})]})]}),a.jsxs("label",{children:["URL (link para PDF ou ficheiro)",a.jsx("input",{type:"url",value:j.url,onChange:m=>c(b=>({...b,url:m.target.value})),placeholder:"https://...",required:!0})]}),a.jsxs("button",{type:"submit",className:"btn-add-doc",children:[a.jsx(Aa,{size:16})," Adicionar documento"]})]}),a.jsx("div",{className:"form-actions",children:a.jsx("button",{type:"button",className:"btn secondary",onClick:f,children:"Fechar"})})]})})}function de({maquina:u,cliente:f,subcategoria:o,categoria:h,manutencoes:l=[],relatorios:U=[],reparacoes:y=[],tecnicos:$=[],logoUrl:j}){const c=Ka,E=j??"/manut/logo-navel.png",v=new Date,i=v.toLocaleString("pt-PT",{dateStyle:"long",timeStyle:"short",timeZone:"Atlantic/Azores"}),N=[...l].sort((r,s)=>s.data.localeCompare(r.data)),I=N.length,C=N.filter(r=>r.status==="concluida"),m=N.filter(r=>r.status!=="concluida"),b=m.filter(r=>ia(r.data)<v),R=m.filter(r=>ia(r.data)>=v),Z=C[0],P=R.reduce((r,s)=>!r||s.data<r.data?s:r,null),T=Z?aa(Z.data,!0):"—",K=P?aa(P.data,!0):"—",q=u.proximaManut?aa(u.proximaManut,!0):K,D=C.map(r=>U.find(s=>s.manutencaoId===r.id)).find(r=>r?.assinaturaDigital),V=D?.assinaturaDigital?ga(D.assinaturaDigital):null,O=Z?.tecnico||D?.tecnico||null,H=O?$.find(r=>r.nome===O&&r.ativo!==!1):null,n=H?.assinaturaDigital?ga(H.assinaturaDigital):null,x=o?`${o.nome} — ${u.marca} ${u.modelo}`:`${u.marca} ${u.modelo}`,G=(r,s)=>{const d=U.find(p=>p.manutencaoId===r.id),S=r.tipo==="montagem"?"Montagem":"Periódica",Y=aa(r.data,!0),W=c(d?.tecnico??r.tecnico??"—"),Q=d?.nomeAssinante?c(d.nomeAssinante):"—",J=d?.notas?c(d.notas.length>90?d.notas.slice(0,90)+"…":d.notas):"—",e=r.status==="concluida"?'<span class="badge-ok">Executada</span>':ia(r.data)<v?'<span class="badge-err">Em atraso</span>':'<span class="badge-pend">Agendada</span>';return`<tr${s%2===1?' class="row-alt"':""}>
      <td class="td-c">${s+1}</td>
      <td>${Y}</td>
      <td class="td-c">${S}</td>
      <td class="td-c">${e}</td>
      <td>${W}</td>
      <td>${Q}</td>
      <td class="td-notes">${J}</td>
    </tr>`},F=[...y].sort((r,s)=>(s.data||"").localeCompare(r.data||"")),_={pendente:"Pendente",em_progresso:"Em progresso",concluida:"Concluída"},k={pendente:"badge-pend",em_progresso:"badge-pend",concluida:"badge-ok"},L=(r,s)=>{const d=r.data?aa(r.data,!0):"—",S=c(r.tecnico??"—"),Y=`<span class="${k[r.status]??"badge-pend"}">${_[r.status]??r.status}</span>`,W=c((r.descricaoAvaria||"—").slice(0,100)),Q=c((r.observacoes||"—").slice(0,80));return`<tr${s%2===1?' class="row-alt"':""}>
      <td class="td-c">${s+1}</td>
      <td>${d}</td>
      <td>${S}</td>
      <td class="td-c">${Y}</td>
      <td class="td-notes">${W}</td>
      <td class="td-notes">${Q}</td>
    </tr>`},X=`
/* Margens de impressão (histórico usa 10mm 13mm) */
@page { margin: 10mm 13mm; }

/* Override título bar para "Gerado em" (data em vez de nº serviço) */
.rpt-titulo-bar .rpt-num { font-size: 9.5px; font-family: inherit; }
.rpt-titulo-bar .rpt-num-label { font-size: 8.5px; color: rgba(255,255,255,.85); }

/* Ficha do equipamento */
.ficha-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid var(--borda); border-radius:4px; overflow:hidden; margin-bottom:10px; }
.ficha-col { padding:8px 10px; }
.ficha-col + .ficha-col { border-left:1px solid var(--borda); background:var(--cinza); }
.ficha-field { margin-bottom:5px; }
.ficha-field:last-child { margin-bottom:0; }
.ficha-label { display:block; font-size:${B.micro}; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin-bottom:1px; }
.ficha-value { font-size:${B.corpo}; color:var(--texto); font-weight:500; }
.ficha-value-lg { font-size:13px; font-weight:700; color:var(--azul); }

/* Estatísticas */
.stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:12px; }
.stat-box { border:1px solid var(--borda); border-radius:4px; padding:6px 8px; text-align:center; background:var(--cinza); }
.stat-num { display:block; font-size:18px; font-weight:800; line-height:1.1; color:var(--azul); }
.stat-num.red { color:var(--vermelho); }
.stat-num.green { color:var(--verde); }
.stat-num.orange { color:var(--laranja); }
.stat-lbl { display:block; font-size:${B.micro}; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-top:2px; }
.stat-num.ultima-exec { font-size:${T.length>8?"9":"13"}px; padding-top:${T.length>8?"5":"2"}px; }

/* Tabela histórico */
.hist-table { width:100%; border-collapse:collapse; font-size:${B.pequeno}; margin-bottom:14px; page-break-inside:auto; }
.hist-table th { background:var(--azul); color:var(--branco); padding:4px 6px; text-align:left; font-size:${B.micro}; font-weight:600; letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; }
.hist-table th.th-n { width:22px; }
.hist-table th.th-data { width:62px; }
.hist-table th.th-tipo { width:58px; }
.hist-table th.th-estado { width:68px; }
.hist-table th.th-tecnico { width:80px; }
.hist-table th.th-assin { width:90px; }
.hist-table td { padding:4px 6px; border-bottom:1px solid var(--borda-leve); vertical-align:top; }
.hist-table tr.row-alt td { background:var(--cinza); }
.td-c { text-align:center; }
.td-notes { font-size:${B.label}; color:var(--muted); max-width:140px; }

/* Badges estado */
.badge-ok   { background:#dcfce7; color:#14532d; padding:1.5px 6px; border-radius:8px; font-size:${B.micro}; font-weight:700; white-space:nowrap; border:1px solid #86efac; }
.badge-err  { background:#fee2e2; color:#7f1d1d; padding:1.5px 6px; border-radius:8px; font-size:${B.micro}; font-weight:700; white-space:nowrap; border:1px solid #fca5a5; }
.badge-pend { background:#fef3c7; color:#78350f; padding:1.5px 6px; border-radius:8px; font-size:${B.micro}; font-weight:700; white-space:nowrap; border:1px solid #fcd34d; }

.hist-empty { color:var(--muted); font-size:10px; margin-bottom:12px; font-style:italic; }
.hist-reps-title { margin-top:14px; }
.hist-table.reps-table th.th-tecnico { width:70px; }

@media print {
  .hist-table tr { page-break-inside:avoid; }
  .hist-table thead { display:table-header-group; }
}
`;return`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Histórico de Manutenção — ${c(u.marca)} ${c(u.modelo)}</title>
<style>
${Oa(Ga.azulNavel,"rgba(26,72,128,0.12)")}
${X}
</style>
</head>
<body>

${_a(E)}

${Ba("Histórico Completo de Manutenção","Gerado em",i)}

<div class="rpt-section-title">Ficha do equipamento</div>
<div class="ficha-grid">
  <div class="ficha-col">
    <div class="ficha-field">
      <span class="ficha-label">Equipamento</span>
      <span class="ficha-value ficha-value-lg">${c(u.marca)} ${c(u.modelo)}</span>
    </div>
    <div class="ficha-field">
      <span class="ficha-label">Nº de Série</span>
      <span class="ficha-value">${c(u.numeroSerie||"—")}</span>
    </div>
    ${o?`<div class="ficha-field">
      <span class="ficha-label">Tipo / Subcategoria</span>
      <span class="ficha-value">${c(o.nome)}${h?` &mdash; ${c(h.nome)}`:""}</span>
    </div>`:""}
    ${u.localizacao?`<div class="ficha-field">
      <span class="ficha-label">Localização</span>
      <span class="ficha-value">${c(u.localizacao)}</span>
    </div>`:""}
  </div>
  <div class="ficha-col">
    <div class="ficha-field">
      <span class="ficha-label">Cliente</span>
      <span class="ficha-value ficha-value-lg">${c(f?.nome??"—")}</span>
    </div>
    ${f?.nif?`<div class="ficha-field">
      <span class="ficha-label">NIF</span>
      <span class="ficha-value">${c(f.nif)}</span>
    </div>`:""}
    ${f?.morada?`<div class="ficha-field">
      <span class="ficha-label">Morada</span>
      <span class="ficha-value">${c(f.morada)}</span>
    </div>`:""}
    <div class="ficha-field">
      <span class="ficha-label">Próxima manutenção</span>
      <span class="ficha-value">${q}</span>
    </div>
  </div>
</div>

<div class="rpt-section-title">Estatísticas globais</div>
<div class="stats-row">
  <div class="stat-box">
    <span class="stat-num">${I}</span>
    <span class="stat-lbl">Total</span>
  </div>
  <div class="stat-box">
    <span class="stat-num green">${C.length}</span>
    <span class="stat-lbl">Executadas</span>
  </div>
  <div class="stat-box">
    <span class="stat-num orange">${R.length}</span>
    <span class="stat-lbl">Agendadas</span>
  </div>
  <div class="stat-box">
    <span class="stat-num${b.length>0?" red":""}">${b.length}</span>
    <span class="stat-lbl">Em atraso</span>
  </div>
  <div class="stat-box">
    <span class="stat-num ultima-exec">${T}</span>
    <span class="stat-lbl">Última execução</span>
  </div>
</div>

<div class="rpt-section-title">
  Registo histórico — ${I} intervenç${I===1?"ão":"ões"} (mais recente primeiro)
</div>
${I===0?'<p class="hist-empty">Nenhuma manutenção registada para este equipamento.</p>':`<table class="hist-table">
  <thead>
    <tr>
      <th class="td-c th-n">#</th>
      <th class="th-data">Data</th>
      <th class="td-c th-tipo">Tipo</th>
      <th class="td-c th-estado">Estado</th>
      <th class="th-tecnico">Técnico</th>
      <th class="th-assin">Assinado por</th>
      <th>Observações</th>
    </tr>
  </thead>
  <tbody>
    ${N.map((r,s)=>G(r,s)).join(`
    `)}
  </tbody>
</table>`}

${F.length>0?`
<div class="rpt-section-title hist-reps-title">
  Reparações — ${F.length} registo${F.length===1?"":"s"}
</div>
<table class="hist-table reps-table">
  <thead>
    <tr>
      <th class="td-c th-n">#</th>
      <th class="th-data">Data</th>
      <th class="th-tecnico">Técnico</th>
      <th class="td-c th-estado">Estado</th>
      <th>Descrição da avaria</th>
      <th>Observações</th>
    </tr>
  </thead>
  <tbody>
    ${F.map((r,s)=>L(r,s)).join(`
    `)}
  </tbody>
</table>`:""}

${V||n?`
<div class="rpt-section-title">Última assinatura registada</div>
<div class="rpt-assinaturas-dual">
  ${n?`<div class="rpt-assinatura-col">
    <div class="rpt-label">Técnico responsável</div>
    <div class="rpt-assinatura-nome">${c(H?.nome||"")}</div>
    ${H?.telefone?`<div class="rpt-assinatura-detalhe">Tel: ${c(H.telefone)}</div>`:""}
    <div class="rpt-assinatura-img"><img src="${n}" alt="Assinatura do técnico"></div>
  </div>`:"<div></div>"}
  ${V?`<div class="rpt-assinatura-col">
    <div class="rpt-label">Assinatura do cliente</div>
    <div class="rpt-assinatura-img"><img src="${V}" alt="Assinatura do cliente"></div>
    ${D?.nomeAssinante?`<div class="rpt-assinatura-detalhe">Assinado por: <strong>${c(D.nomeAssinante)}</strong>${D.dataAssinatura?` &nbsp;&mdash;&nbsp; ${ka(D.dataAssinatura)}`:""}</div>`:""}
  </div>`:"<div></div>"}
</div>`:""}

${Va("","",`${c(x)} &nbsp;&middot;&nbsp; S/N: ${c(u.numeroSerie||"—")}`)}

</body>
</html>`}export{ce as D,ne as M,le as P,de as g};
