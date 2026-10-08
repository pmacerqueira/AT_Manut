/**
 * Manutenção preventiva de elevadores — modelo de emissão 2026-10.
 * Relatórios sem este modelo (array antigo em checklistSnapshot) mantêm
 * o veredito e a declaração anteriores.
 */
import { limparCitacaoNormaChecklist } from './notaLegalColocacaoMercado.js'

export const MODELO_ELEVADOR_PREVENTIVO = 'elevador-preventiva-2026-10'

export const TITULO_RELATORIO_ELEVADOR = 'Relatório de Manutenção Preventiva'

export const TITULO_RECECAO_ELEVADOR = 'Receção do relatório e tomada de conhecimento'

export const NOTA_AMBITO_TITULO = 'Âmbito e limites do serviço'

export const NOTA_AMBITO_PONTOS = [
  '1) O presente documento constitui exclusivamente um relatório de manutenção preventiva / diagnóstico técnico, limitado às operações e pontos de inspeção expressamente identificados.',
  '2) Não constitui declaração CE/UE de conformidade, certificação, avaliação integral de conformidade legal, validação da instalação original, reconstituição do processo técnico do fabricante, ensaio estrutural, ensaio de carga, nem autorização autónoma de colocação ou manutenção em serviço do equipamento.',
  '3) A conclusão é válida apenas para a data, local, condições de acesso, configuração e componentes observados. Não abrange defeitos ocultos, intervenções anteriores de terceiros, alterações não comunicadas, fundações, ancoragens, instalação elétrica, dimensionamento da alimentação, documentação não disponibilizada ou utilização posterior indevida.',
]

export const TEXTO_AMBITO_ELEVADOR =
  'O presente relatório documenta exclusivamente a manutenção preventiva realizada pela NAVEL, incluindo as operações executadas, as observações efetuadas e os testes funcionais expressamente identificados, nas condições existentes à data da intervenção. Não constitui certificação, declaração de conformidade, verificação legal de segurança, avaliação integral da segurança do equipamento ou validação da instalação original. As anomalias observadas e as recomendações correspondentes são comunicadas ao cliente nos termos registados neste documento. Esta delimitação não afasta as responsabilidades da NAVEL pela manutenção efetivamente realizada nem dispensa o cliente das suas obrigações próprias.'

/** Falha nestes pontos: o relatório recomenda fora de serviço, sem ser interdição legal. */
const RE_PONTO_FORA_DE_SERVICO = /bloqueio|cabos de a[cç]o|cabo de seguran[cç]a|porca de carga|trav[aã]o|sincroniza|fim de curso|limitador|bra[cç]os?|suportes? de carga|estrutura|ancoragem|fixa[cç][aã]o|reten[cç][aã]o/i

export const TEXTO_RECOMENDACAO_FORA_DE_SERVICO =
  'Colocar o equipamento fora de serviço de imediato, após a tomada de conhecimento, a assinatura e o envio deste relatório, até correção da deficiência.'

export const AVISO_FORA_DE_SERVICO =
  'Recomendação ao cliente: colocar o equipamento fora de serviço de imediato, após a tomada de conhecimento, a assinatura e o envio deste relatório, até correção da deficiência. As datas seguintes são planeamento e não autorizam o uso.'

export const TITULO_DECISAO_FORA_DE_SERVICO = 'Decisão operacional: Fora de serviço imediato'

/** Quadro de conclusão, só quando há recomendação de fora de serviço. */
export function decisaoOperacionalElevador(items, respostas, { recomendaRetirada = false } = {}) {
  const nomes = (items || [])
    .filter(it => pontoImplicaForaDeServico(it) && anomaliaNoPonto(respostas?.[it.id]))
    .map(it => String(it.texto ?? '').trim())
    .filter(Boolean)
  if (!recomendaRetirada && nomes.length === 0) return null
  const onde = nomes.length
    ? nomes.join('; ')
    : 'componentes relevantes para a segurança de elevação e controlo'
  return {
    titulo: TITULO_DECISAO_FORA_DE_SERVICO,
    motivo: `Motivo: foram identificadas anomalias em ${onde}. Recomenda-se ao cliente colocar o equipamento fora de serviço de imediato, após a tomada de conhecimento, a assinatura e o envio deste relatório, até correção da deficiência.`,
  }
}

export function pontoImplicaForaDeServico(item) {
  return RE_PONTO_FORA_DE_SERVICO.test(String(item?.texto ?? ''))
}

function anomaliaNoPonto(valor) {
  return codigoResposta(valor) === 'nao' || valor?.observacao === 'anomalia'
}

export function haForaDeServico(items, respostas) {
  return (items || []).some(it => pontoImplicaForaDeServico(it) && anomaliaNoPonto(respostas?.[it.id]))
}

/** Garante a recomendação nos pontos críticos com anomalia. Não apaga o que o técnico descreveu. */
export function aplicarForaDeServico(items, respostas) {
  const next = { ...(respostas || {}) }
  for (const it of items || []) {
    if (!pontoImplicaForaDeServico(it)) continue
    const v = next[it.id]
    if (!v || typeof v !== 'object' || !anomaliaNoPonto(v)) continue
    const rec = String(v.recomendacao || '').trim()
    const ja = /fora de servi[cç]o/i.test(rec)
    next[it.id] = {
      ...v,
      recomendaRetirada: true,
      recomendacao: ja ? rec : (rec ? `${rec} ${TEXTO_RECOMENDACAO_FORA_DE_SERVICO}` : TEXTO_RECOMENDACAO_FORA_DE_SERVICO),
    }
  }
  return next
}

export const TEXTO_RECECAO_ELEVADOR =
  'O representante do cliente confirma a receção do presente relatório e a comunicação das anomalias, limitações e recomendações nele expressamente registadas. Quando recomendada a retirada de serviço, foi informado da necessidade de impedir a utilização até à correção das deficiências e à avaliação aplicável. A assinatura não constitui certificação, autorização de uso ou exoneração da NAVEL das responsabilidades que legalmente lhe caibam. Mantêm-se as obrigações próprias do cliente enquanto titular, utilizador ou empregador.'

export const ESTADOS_MANUTENCAO_ELEVADOR = {
  concluida_ambito: 'Concluída no âmbito identificado',
  parcial: 'Parcialmente executada, com pendências',
  suspensa: 'Suspensa / não executada',
}

const FRASES_POSITIVAS_BLOQUEADAS = [
  'Equipamento em bom estado geral',
  'Desgaste normal, dentro do esperado',
  'Sem observações adicionais',
]

const DETALHE_MIN = 8

export function aplicaModeloElevadorPreventivo({ categoriaNome, tipoManutencao } = {}) {
  if (tipoManutencao === 'montagem') return false
  return String(categoriaNome ?? '').toLowerCase().includes('levador')
}

export function itensDoSnapshot(snap) {
  if (Array.isArray(snap)) return snap
  if (snap && Array.isArray(snap.itens)) return snap.itens
  return []
}

export function emissaoDoRelatorio(relatorio) {
  const snap = relatorio?.checklistSnapshot
  const em = snap && !Array.isArray(snap) ? snap.emissao : null
  if (em?.modelo === MODELO_ELEVADOR_PREVENTIVO) return em
  return null
}

export function textoDeclaracaoElevadorNovo() {
  return TEXTO_RECECAO_ELEVADOR
}

/** Âmbito da secção 11 da reflexão, só na manutenção periódica de elevador. */
export function pontosNotaAmbito({ categoriaNome, tipoManutencao, isReparacao = false } = {}) {
  if (!isReparacao && aplicaModeloElevadorPreventivo({ categoriaNome, tipoManutencao })) {
    return [TEXTO_AMBITO_ELEVADOR]
  }
  return [...NOTA_AMBITO_PONTOS]
}

/** Se a declaração gravada ainda começa pelo âmbito, o fecho mostra só a receção. */
export function textoRececaoVisivel(texto) {
  const t = String(texto ?? '').trim()
  if (t.startsWith(TEXTO_AMBITO_ELEVADOR)) {
    return t.slice(TEXTO_AMBITO_ELEVADOR.length).trim()
  }
  return t
}

export function buildEmissaoElevador({ estado = 'concluida_ambito', retificaDe = null, retificaNumero = null, contexto = null } = {}) {
  const estadoOk = estado in ESTADOS_MANUTENCAO_ELEVADOR ? estado : 'concluida_ambito'
  return {
    modelo: MODELO_ELEVADOR_PREVENTIVO,
    titulo: TITULO_RELATORIO_ELEVADOR,
    estado: estadoOk,
    declaracaoTitulo: TITULO_RECECAO_ELEVADOR,
    declaracaoTexto: textoDeclaracaoElevadorNovo(),
    notaAmbitoTitulo: NOTA_AMBITO_TITULO,
    notaAmbitoPontos: [TEXTO_AMBITO_ELEVADOR],
    ...(contexto && typeof contexto === 'object' ? contexto : {}),
    ...(retificaDe ? { retificaDe, retificaNumero: retificaNumero || '' } : {}),
  }
}

export function embalarSnapshotChecklist(itens, emissao) {
  return { itens, emissao }
}

export function snapshotChecklistParaRelatorio(items, { modeloElevador = false, estado, retificaDe, retificaNumero, contexto } = {}) {
  const itens = (items || []).map(it => ({
    id: it.id,
    texto: limparCitacaoNormaChecklist(it.texto),
    ordem: it.ordem,
    grupo: it.grupo ?? null,
    papel: modeloElevador ? papelDoPonto(it) : undefined,
  }))
  if (!modeloElevador) return itens.map(({ papel, ...resto }) => resto)
  return embalarSnapshotChecklist(itens, buildEmissaoElevador({ estado, retificaDe, retificaNumero, contexto }))
}

/** @returns {'documento'|'teste'|'operacao'} */
export function papelDoPonto(item) {
  const t = String(item?.texto ?? '').toLowerCase()
  if (/marca[cç][aã]o ce|manual de instru|declara[cç][aã]o ce|declara[cç][aã]o de conformidade|registo de interven/.test(t)) return 'documento'
  if (/teste em funcionamento|teste de comando|teste de subida|teste de sincroniza|teste funcional|teste do bot[aã]o|bot[aã]o de emerg[eê]ncia/.test(t)) return 'teste'
  return 'operacao'
}

/** Fundamento quando o ponto não existe naquela configuração. Vazio se aplicável. */
export function fundamentoInaplicavel(item, subcategoriaId) {
  const t = String(item?.texto ?? '').toLowerCase()
  const hidraulico = subcategoriaId === 'sub2' || subcategoriaId === 'sub4' || subcategoriaId === 'sub12'
  const electromecanico = subcategoriaId === 'sub1' || subcategoriaId === 'sub13'
  if (hidraulico && /redutor|cabos de a[cç]o|ferodos|polias/.test(t)) {
    return 'Este tipo de elevador não tem este componente.'
  }
  if (electromecanico && /central hidr[aá]ulica|cilindro|v[aá]lvula limitadora|óleo da central|oleo da central/.test(t)) {
    return 'Este tipo de elevador não tem circuito hidráulico.'
  }
  return ''
}

export function respostaOperacao({ execucao, observacao, descricao = '', recomendacao = '', fundamento = '', motivo = '', recomendaRetirada = false }) {
  const ex = execucao || ''
  const ob = observacao || ''
  let r = ''
  if (ex === 'na' || ob === 'na') r = 'na'
  else if (ob === 'anomalia') r = 'nao'
  else if (ex === 'executado' && ob === 'sem_anomalia') r = 'sim'
  else if (ex === 'parcial' || ex === 'nao_executado' || ob === 'nao_observado') r = 'parcial'
  return { r, papel: 'operacao', execucao: ex, observacao: ob, descricao, recomendacao, fundamento, motivo, recomendaRetirada: !!recomendaRetirada }
}

export function respostaDocumento(estado, extra = {}) {
  const mapa = {
    analisado: 'sim',
    nao_analisado: 'nao',
    nao_disponibilizado: 'nao',
    ilegivel: 'nao',
    na: 'na',
  }
  return {
    r: mapa[estado] || '',
    papel: 'documento',
    documento: estado,
    descricao: extra.descricao || '',
    recomendacao: extra.recomendacao || '',
    fundamento: extra.fundamento || '',
  }
}

export const TEXTO_TESTE_COM_CARGA =
  'Elevado um veículo na função habitual de trabalho, com 2 ciclos completos de subida e descida. Não é ensaio formal de carga.'

export function testeConfirmaCargaVeiculo(item) {
  return /subida e descida|teste funcional com carga/.test(String(item?.texto ?? '').toLowerCase())
}

export function respostaTeste({ executado, carga = '', observacao = '', motivo = '', limitacao = '', descricao = '', recomendacao = '' }) {
  let r = ''
  if (!executado) r = 'parcial'
  else if (observacao === 'anomalia') r = 'nao'
  else if (observacao === 'sem_anomalia') r = 'sim'
  else if (observacao === 'nao_observado') r = 'parcial'
  else if (observacao === 'na') r = 'na'
  return {
    r,
    papel: 'teste',
    executado: !!executado,
    carga,
    observacao,
    motivo,
    limitacao: carga === 'com_carga' ? TEXTO_TESTE_COM_CARGA : limitacao,
    descricao,
    recomendacao,
  }
}

export function respostaInaplicavel(item, fundamento) {
  const papel = papelDoPonto(item)
  if (papel === 'documento') return respostaDocumento('na', { fundamento })
  if (papel === 'teste') return { ...respostaTeste({ executado: false, motivo: fundamento }), r: 'na', fundamento }
  return respostaOperacao({ execucao: 'na', observacao: 'na', fundamento })
}

export function rotuloRespostaPdf(valor) {
  if (!valor || typeof valor !== 'object' || !valor.papel) return ''
    if (valor.papel === 'documento') {
    const doc = {
      analisado: 'ANALIS.',
      nao_analisado: 'N/ ANALIS.',
      nao_disponibilizado: 'AUSENTE',
      ilegivel: 'ILEGIVEL',
      na: 'N/A',
    }
    return doc[valor.documento] || ''
  }
  if (valor.papel === 'teste') {
    if (!valor.executado) return 'S/ TESTE'
    if (valor.observacao === 'anomalia') return 'ANOM.'
    if (valor.carga === 'com_carga') return '2 CICLOS'
    if (valor.carga === 'sem_carga') return 'S/ CARGA'
    return 'TESTE'
  }
  if (valor.r === 'nao' || valor.observacao === 'anomalia') return 'ANOM.'
  if (valor.execucao === 'parcial') return 'PARCIAL'
  if (valor.execucao === 'nao_executado') return 'N/ EXEC.'
  if (valor.observacao === 'nao_observado') return 'N/ OBS.'
  if (valor.r === 'na') return 'N/A'
  if (valor.r === 'sim') return 'EXEC.'
  return ''
}

const ROTULO_SIM_NAO = { sim: 'Sim', nao: 'Não', desconhecido: 'Desconhecido' }

export const TEXTO_PEDIDO_FORA_AMBITO =
  'Não foi executado nesta visita. Não gera reparação, alteração nem certificação.'

export function mensagemPedidoForaAmbito(form) {
  const extra = form?.pedidoExtra || ''
  if (extra !== 'nao' && extra !== 'sim') {
    return 'Indique se o cliente pediu também reparação, alteração ou certificação.'
  }
  if (extra === 'sim' && String(form?.pedidoExtraDescricao || '').trim().length < DETALHE_MIN) {
    return 'Descreva o pedido de reparação, alteração ou certificação. Fica fora desta visita e não é executado.'
  }
  return ''
}

export function linhasContextoEmissao(emissao) {
  if (!emissao || typeof emissao !== 'object') return []
  const sn = (v) => ROTULO_SIM_NAO[v] || ''
  const rows = []
  if (emissao.serieConfirmada) rows.push(['SÉRIE CONFIRMADA NO LOCAL', sn(emissao.serieConfirmada) || String(emissao.serieConfirmada)])
  if (emissao.anoFabrico) rows.push(['ANO DE FABRICO', String(emissao.anoFabrico)])
  if (emissao.capacidadeComunicada) rows.push(['CAPACIDADE COMUNICADA', String(emissao.capacidadeComunicada)])
  if (emissao.fornecidoPelaNavel) rows.push(['FORNECIDO PELA NAVEL', sn(emissao.fornecidoPelaNavel)])
  if (emissao.instaladoPelaNavel) rows.push(['INSTALADO PELA NAVEL', sn(emissao.instaladoPelaNavel)])
  if (emissao.funcaoAssinante) rows.push(['FUNÇÃO DE QUEM RECEBE', String(emissao.funcaoAssinante)])
  if (emissao.assinaturaRecusada) rows.push(['ASSINATURA DO CLIENTE', `Recusada. Canal: ${emissao.canalAlternativo || '—'}`])
  if (emissao.pedidoSoPreventiva) rows.push(['PEDIDO', 'Só manutenção preventiva'])
  if (emissao.pedidoExtra === 'sim' && emissao.pedidoExtraDescricao) {
    rows.push(['PEDIDO FORA DO ÂMBITO', `${emissao.pedidoExtraDescricao}. ${TEXTO_PEDIDO_FORA_AMBITO}`])
  }
  if (emissao.limitacoesAdmissao) rows.push(['LIMITAÇÕES DO PEDIDO', String(emissao.limitacoesAdmissao)])
  return rows
}

export function contextoEmissaoFromForm(form, items, extra = {}) {
  const respostas = form?.checklistRespostas || {}
  const recomenda = haForaDeServico(items, respostas) || (items || []).some(it => {
    const v = respostas[it.id]
    if (!v || typeof v !== 'object') return false
    if (v.recomendaRetirada) return true
    const t = `${v.recomendacao || ''} ${v.descricao || ''}`
    return /n[aã]o utilizar|retirada de servi[cç]o|fora de servi[cç]o|impedir a utiliza/i.test(t)
  })
  return {
    funcaoAssinante: String(form?.funcaoAssinante || '').trim(),
    assinaturaRecusada: extra.assinaturaRecusada != null ? !!extra.assinaturaRecusada : !!form?.assinaturaRecusada,
    canalAlternativo: String(form?.canalAlternativo || '').trim(),
    serieConfirmada: form?.serieConfirmada || '',
    anoFabrico: String(form?.anoFabrico || '').trim(),
    capacidadeComunicada: String(form?.capacidadeComunicada || '').trim(),
    fornecidoPelaNavel: form?.fornecidoPelaNavel || '',
    instaladoPelaNavel: form?.instaladoPelaNavel || '',
    pedidoSoPreventiva: !!form?.pedidoSoPreventiva,
    pedidoExtra: form?.pedidoExtra === 'sim' ? 'sim' : (form?.pedidoExtra === 'nao' ? 'nao' : ''),
    pedidoExtraDescricao: form?.pedidoExtra === 'sim' ? String(form?.pedidoExtraDescricao || '').trim() : '',
    limitacoesAdmissao: String(form?.limitacoesAdmissao || '').trim(),
    recomendaRetirada: recomenda,
  }
}

/** @returns {'sim'|'nao'|'na'|'parcial'|''} */
export function codigoResposta(valor) {
  if (valor && typeof valor === 'object') {
    const r = String(valor.r ?? valor.valor ?? '')
    if (r === 'sim' || r === 'OK') return 'sim'
    if (r === 'nao' || r === 'NOK') return 'nao'
    if (r === 'na' || r === 'N/A') return 'na'
    if (r === 'parcial') return 'parcial'
    return ''
  }
  if (valor === 'sim' || valor === 'OK') return 'sim'
  if (valor === 'nao' || valor === 'NOK') return 'nao'
  if (valor === 'na' || valor === 'N/A') return 'na'
  return ''
}

export function checklistEstaCompleta(items, respostas, { elevador = false } = {}) {
  if (!items?.length) return true
  return items.every(it => {
    const c = codigoResposta(respostas?.[it.id])
    if (elevador) return c === 'sim' || c === 'nao' || c === 'na' || c === 'parcial'
    return c === 'sim' || c === 'nao'
  })
}

export function temAnomaliaChecklist(items, respostas) {
  return (items || []).some(it => codigoResposta(respostas?.[it.id]) === 'nao')
}

function detalheCurto(valor) {
  return String(valor ?? '').trim().length >= DETALHE_MIN
}

export function validarChecklistElevador(items, respostas) {
  const erros = []
  const lista = items || []
  const haAnomalia = lista.some(it => {
    const valor = respostas?.[it.id]
    if ((valor?.papel || papelDoPonto(it)) === 'documento') return false
    return codigoResposta(valor) === 'nao'
  })
  for (const [i, it] of lista.entries()) {
    const valor = respostas?.[it.id]
    const c = codigoResposta(valor)
    const rotulo = String(it.texto ?? `ponto ${i + 1}`).trim()
    const papel = valor?.papel || ''
    if (c !== 'sim' && c !== 'nao' && c !== 'na' && c !== 'parcial') {
      erros.push(`Ponto ${i + 1}: preencha a execução e o que foi observado.`)
      continue
    }
    if (papel === 'documento') {
      if (!valor.documento) erros.push(`Documento «${rotulo}»: indique se foi disponibilizado e analisado.`)
      if (valor.documento === 'na' && !detalheCurto(valor.fundamento)) {
        erros.push(`Documento «${rotulo}»: indique o fundamento de não aplicável.`)
      }
      continue
    }
    if (papel === 'teste') {
      if (!valor.executado && !detalheCurto(valor.motivo)) {
        erros.push(`Teste «${rotulo}»: indique porque não foi executado.`)
      }
      if (testeConfirmaCargaVeiculo(it) && valor.executado && valor.carga !== 'sem_carga' && valor.carga !== 'com_carga') {
        erros.push(`Teste «${rotulo}»: confirme se foi sem carga ou com carga (veículo na função habitual, 2 ciclos completos).`)
      }
      if (valor.observacao === 'anomalia' && !detalheCurto(valor.descricao)) {
        erros.push(`Teste «${rotulo}»: descreva a anomalia observada.`)
      }
      continue
    }
    if (papel === 'operacao') {
      if (!valor.execucao || !valor.observacao) {
        erros.push(`Ponto ${i + 1}: indique o que foi feito e o que foi observado.`)
        continue
      }
      if ((valor.execucao === 'parcial' || valor.execucao === 'nao_executado') && !detalheCurto(valor.motivo)) {
        erros.push(`«${rotulo}»: indique o motivo de não estar totalmente executado.`)
      }
      if (valor.observacao === 'nao_observado' && !detalheCurto(valor.motivo)) {
        erros.push(`«${rotulo}»: indique porque não foi observado.`)
      }
      if ((valor.execucao === 'na' || valor.observacao === 'na') && !detalheCurto(valor.fundamento)) {
        erros.push(`Não aplicável em «${rotulo}»: indique o fundamento.`)
      }
      if (valor.observacao === 'anomalia') {
        if (!detalheCurto(valor.descricao)) erros.push(`Anomalia em «${rotulo}»: descreva o que observou.`)
        if (!detalheCurto(valor.recomendacao)) erros.push(`Anomalia em «${rotulo}»: indique a recomendação transmitida ao cliente.`)
      }
      if (haAnomalia && valor.observacao === 'sem_anomalia' && /estado geral|conserva[cç][aã]o vis[ií]vel|estrutura vis[ií]vel/i.test(rotulo)) {
        erros.push('Há anomalias noutros pontos. A conservação visível não pode ficar sem anomalia observada.')
      }
      continue
    }
    if (c === 'nao') {
      if (!detalheCurto(valor?.descricao)) erros.push(`Anomalia em «${rotulo}»: descreva o que observou.`)
      if (!detalheCurto(valor?.recomendacao)) erros.push(`Anomalia em «${rotulo}»: indique a recomendação transmitida ao cliente.`)
    }
    if (c === 'na' && !detalheCurto(valor?.fundamento)) {
      erros.push(`Não aplicável em «${rotulo}»: indique o fundamento.`)
    }
  }
  return erros
}

export function notasRapidasParaElevador(lista) {
  return (lista || []).filter(q => !FRASES_POSITIVAS_BLOQUEADAS.includes(q))
}

export function mensagemNotasContraditoriasElevador(notas) {
  const t = String(notas ?? '')
  const hit = FRASES_POSITIVAS_BLOQUEADAS.find(f => t.includes(f))
  if (!hit) return ''
  return `Esta nota não descreve a intervenção. Retire «${hit}».`
}

export function numeroAditamento(numeroOriginal, relatorios) {
  const base = String(numeroOriginal || 'ADIT')
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${esc}-A(\\d+)$`)
  let max = 0
  for (const r of relatorios || []) {
    const m = String(r?.numeroRelatorio || '').match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${base}-A${max + 1}`
}

export function linhaPontoAtencao(nc) {
  const base = `${nc.index}. ${nc.texto}`
  const extra = [
    nc.descricao,
    nc.recomendacao ? `Recomendação: ${nc.recomendacao}` : '',
  ].filter(Boolean)
  return extra.length ? `${base} — ${extra.join('. ')}` : base
}
