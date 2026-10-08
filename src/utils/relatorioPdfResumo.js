/**
 * Resumo executivo e não conformidades para PDF/email de relatórios de manutenção.
 */
import { linhasNotasRelatorio } from '../components/executarManutencao/execWizardHelpers.js'
import { INTERVALOS_KAESER } from '../domain/equipamentoDomain.js'
import {
  codigoResposta,
  emissaoDoRelatorio,
  ESTADOS_MANUTENCAO_ELEVADOR,
  decisaoOperacionalElevador,
  linhasContextoEmissao,
  NOTA_AMBITO_TITULO,
  pontosNotaAmbito,
  TITULO_RELATORIO_ELEVADOR,
} from '../domain/relatorioElevadorPreventivo.js'
import { resolvePeriodicidadeManutencao } from './relatorioManutencaoPayload.js'

const PERI_LABELS = {
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  mensal: 'Mensal',
}

/** @param {string} iso */
export function formatDataRelatorioPdf(iso) {
  const s = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/** @param {object|null|undefined} cliente */
export function formatMoradaCliente(cliente) {
  if (!cliente) return '—'
  const loc = [cliente.codigoPostal, cliente.localidade].filter(Boolean).join(' ').trim()
  const parts = [cliente.morada, loc].filter(p => p && String(p).trim())
  return parts.length ? parts.join(', ') : '—'
}

/** @param {{ manutencao?: object, relatorio?: object, isReparacao?: boolean }} p */
export function resolveTipoIntervencaoLabel({ manutencao, relatorio, isReparacao }) {
  if (isReparacao) return 'Reparação'
  if (manutencao?.tipo === 'montagem') return 'Montagem inicial'
  if (emissaoDoRelatorio(relatorio)) return TITULO_RELATORIO_ELEVADOR
  const kaeser = relatorio?.tipoManutKaeser
  if (kaeser) {
    const info = INTERVALOS_KAESER[kaeser]
    return info ? `Manutenção periódica — ${info.label}` : `Manutenção periódica — Tipo ${kaeser}`
  }
  return 'Manutenção periódica'
}

/** @param {{ maquina?: object, manutencao?: object }} p */
export function resolvePeriodicidadeLabel({ maquina, manutencao }) {
  const p = resolvePeriodicidadeManutencao({ maquina, manutencao })
  return PERI_LABELS[p] || (p ? String(p) : '—')
}

/** Data de execução (ISO yyyy-MM-dd) a partir do relatório. */
export function resolveDataExecucaoIso({ relatorio, manutencao, isReparacao, reparacao }) {
  if (isReparacao) {
    const bruta = relatorio?.dataRealizacao || reparacao?.data || ''
    return String(bruta).slice(0, 10) || ''
  }
  return (
    relatorio?.dataAssinatura?.slice(0, 10) ||
    relatorio?.dataCriacao?.slice(0, 10) ||
    manutencao?.dataExecucao?.slice?.(0, 10) ||
    ''
  )
}

/** Agendamento planeado quando distinto da execução. */
export function resolveDataAgendamentoIso({ manutencao, dataExecucaoIso }) {
  const ag = String(manutencao?.data ?? '').slice(0, 10)
  if (!ag || !dataExecucaoIso || ag === dataExecucaoIso) return null
  return ag
}

/** @param {object} checklistRespostas */
export function contagemChecklistRespostas(checklistRespostas = {}) {
  const vals = Object.values(checklistRespostas)
  const codigos = vals.map(codigoResposta)
  const nSim = codigos.filter(v => v === 'sim').length
  const nNao = codigos.filter(v => v === 'nao').length
  const nNa = codigos.filter(v => v === 'na').length
  const nParcial = codigos.filter(v => v === 'parcial').length
  const nPend = codigos.filter(v => !v).length
  return { nSim, nNao, nNa, nParcial, nPend, total: vals.length }
}

/**
 * @returns {'conforme'|'reservas'|'nao_conforme'}
 */
export function calcularVereditoChecklist(checklistRespostas = {}, checklistItems = []) {
  const { nSim, nNao } = contagemChecklistRespostas(checklistRespostas)
  const total = checklistItems.length || nSim + nNao
  if (total === 0 && nNao === 0) return 'conforme'
  if (nNao === 0) return 'conforme'
  if (nNao > nSim) return 'nao_conforme'
  return 'reservas'
}

export const VEREDITO_PDF = {
  conforme: {
    label: 'CONFORME',
    fill: [236, 253, 245],
    border: [22, 163, 74],
    text: [21, 128, 61],
  },
  reservas: {
    label: 'CONFORME COM RESERVAS',
    fill: [255, 251, 235],
    border: [217, 119, 6],
    text: [180, 83, 9],
  },
  nao_conforme: {
    label: 'NÃO CONFORME',
    fill: [254, 242, 242],
    border: [220, 38, 38],
    text: [185, 28, 28],
  },
  ambito_concluido: {
    label: 'MANUTENÇÃO CONCLUÍDA NO ÂMBITO IDENTIFICADO',
    fill: [239, 246, 255],
    border: [30, 58, 95],
    text: [30, 58, 95],
  },
  ambito_concluido_anomalias: {
    label: 'MANUTENÇÃO CONCLUÍDA NO ÂMBITO IDENTIFICADO',
    fill: [255, 251, 235],
    border: [217, 119, 6],
    text: [180, 83, 9],
  },
  ambito_parcial: {
    label: 'MANUTENÇÃO PARCIALMENTE EXECUTADA',
    fill: [255, 251, 235],
    border: [217, 119, 6],
    text: [180, 83, 9],
  },
  ambito_suspenso: {
    label: 'MANUTENÇÃO SUSPENSA / NÃO EXECUTADA',
    fill: [254, 242, 242],
    border: [220, 38, 38],
    text: [185, 28, 28],
  },
}

/** Itens com resposta não conforme. */
export function itensNaoConformes(relatorio, checklistItems = []) {
  const resp = relatorio?.checklistRespostas ?? {}
  return checklistItems
    .map((item, index) => {
      const r = resp[item.id]
      if (codigoResposta(r) !== 'nao') return null
      const detalhe = r && typeof r === 'object' ? r : null
      return {
        index: index + 1,
        id: item.id,
        texto: String(item.texto ?? '').trim(),
        descricao: String(detalhe?.descricao ?? '').trim(),
        recomendacao: String(detalhe?.recomendacao ?? '').trim(),
        papel: detalhe?.papel || '',
      }
    })
    .filter(Boolean)
}

/** Bullets para o resumo (máx. 6 — o PDF faz quebra de linha com splitTextToSize). */
export function buildResumoExecutivoBullets({ notas, naoConformes, max = 6 }) {
  const bullets = []
  for (const nc of naoConformes) {
    if (bullets.length >= max) break
    bullets.push(`Não conforme (${nc.index}): ${nc.texto}`)
  }
  const notaLinhas = linhasNotasRelatorio(notas)
  for (const line of notaLinhas) {
    if (bullets.length >= max) break
    if (bullets.some(b => b.includes(line))) continue
    bullets.push(line)
  }
  if (bullets.length === 0 && naoConformes.length === 0) {
    bullets.push('Verificação concluída sem não conformidades registadas.')
  }
  return bullets.slice(0, max)
}

function vereditoElevadorPreventivo(estado, nNao, nParcial) {
  if (estado === 'suspensa') return 'ambito_suspenso'
  if (estado === 'parcial' || nParcial > 0) return 'ambito_parcial'
  if (nNao > 0) return 'ambito_concluido_anomalias'
  return 'ambito_concluido'
}

export function itensPendentesElevador(relatorio, checklistItems = []) {
  const resp = relatorio?.checklistRespostas ?? {}
  return checklistItems
    .map((item, index) => {
      const r = resp[item.id]
      if (codigoResposta(r) !== 'parcial') return null
      const detalhe = r && typeof r === 'object' ? r : {}
      const descricao = String(detalhe.motivo || detalhe.descricao || detalhe.limitacao || '').trim()
      return {
        index: index + 1,
        id: item.id,
        texto: String(item.texto ?? '').trim(),
        descricao,
        recomendacao: '',
      }
    })
    .filter(Boolean)
}

function buildBulletsElevador({ notas, naoConformes, pendentes = [], max = 6 }) {
  const bullets = []
  for (const nc of naoConformes) {
    if (bullets.length >= max) break
    const extra = [nc.descricao, nc.recomendacao ? `Recomendação: ${nc.recomendacao}` : ''].filter(Boolean).join('. ')
    const prefixo = nc.papel === 'documento' ? 'Documento' : 'Anomalia'
    bullets.push(extra ? `${prefixo} (${nc.index}): ${nc.texto}. ${extra}` : `${prefixo} (${nc.index}): ${nc.texto}`)
  }
  for (const p of pendentes) {
    if (bullets.length >= max) break
    bullets.push(p.descricao ? `Pendente (${p.index}): ${p.texto}. ${p.descricao}` : `Pendente (${p.index}): ${p.texto}`)
  }
  for (const line of linhasNotasRelatorio(notas)) {
    if (bullets.length >= max) break
    if (bullets.some(b => b.includes(line))) continue
    bullets.push(line)
  }
  if (bullets.length === 0) {
    bullets.push('Pontos assinalados sem anomalia observada nesta intervenção.')
  }
  return bullets.slice(0, max)
}

/** Metadados do resumo executivo (PDF/email). */
export function buildResumoExecutivoMeta({
  relatorio,
  manutencao,
  maquina,
  cliente = null,
  checklistItems = [],
  proximasManutencoes = [],
  isReparacao = false,
  reparacao = null,
  categoriaNome = '',
}) {
  const { nSim, nNao, nNa, nParcial } = contagemChecklistRespostas(relatorio?.checklistRespostas)
  const emissao = isReparacao ? null : emissaoDoRelatorio(relatorio)
  const veredito = isReparacao
    ? null
    : emissao
      ? vereditoElevadorPreventivo(emissao.estado, nNao, nParcial)
      : calcularVereditoChecklist(relatorio?.checklistRespostas, checklistItems)
  const naoConformes = isReparacao ? [] : itensNaoConformes(relatorio, checklistItems)
  const pendentes = emissao ? itensPendentesElevador(relatorio, checklistItems) : []
  const bullets = isReparacao
    ? buildResumoExecutivoBullets({ notas: relatorio?.notas, naoConformes: [], max: 6 })
    : emissao
      ? buildBulletsElevador({ notas: relatorio?.notas, naoConformes, pendentes, max: 6 })
      : buildResumoExecutivoBullets({ notas: relatorio?.notas, naoConformes, max: 6 })
  const contagemLinha = emissao
    ? `Resumo de respostas: ${nSim} sem anomalia observada · ${nNao} anomalias${nParcial ? ` · ${nParcial} execução incompleta ou não observada` : ''}${nNa ? ` · ${nNa} não aplicável` : ''}`
    : ''
  const proxSorted = (proximasManutencoes ?? []).filter(pm => pm?.data).sort((a, b) => a.data.localeCompare(b.data))
  const proxima = proxSorted[0] ?? null
  const dataExecIso = resolveDataExecucaoIso({ relatorio, manutencao, isReparacao, reparacao })
  return {
    veredito,
    vereditoStyle: veredito ? VEREDITO_PDF[veredito] : null,
    nSim,
    nNao,
    nNa,
    naoConformes,
    bullets,
    proximaData: proxima?.data ?? null,
    proximaTecnico: proxima?.tecnico ?? '',
    dataExecIso,
    dataAgendIso: resolveDataAgendamentoIso({ manutencao, dataExecucaoIso: dataExecIso }),
    periodicidadeLabel: resolvePeriodicidadeLabel({ maquina, manutencao }),
    tipoIntervencao: resolveTipoIntervencaoLabel({ manutencao, relatorio, isReparacao }),
    moradaCliente: formatMoradaCliente(cliente),
    clienteNif: cliente?.nif ? String(cliente.nif) : '',
    contagemLinha,
    pendentes,
    recomendaRetirada: !!emissao?.recomendaRetirada,
    decisaoOperacional: emissao
      ? decisaoOperacionalElevador(checklistItems, relatorio?.checklistRespostas, {
          recomendaRetirada: !!emissao.recomendaRetirada,
        })
      : null,
    linhasContexto: emissao ? linhasContextoEmissao(emissao) : [],
    notaAmbitoTitulo: NOTA_AMBITO_TITULO,
    notaAmbitoPontos: pontosNotaAmbito({
      categoriaNome,
      tipoManutencao: manutencao?.tipo,
      isReparacao,
    }),
    declaracaoTitulo: emissao?.declaracaoTitulo || '',
    estadoManutencaoLabel: emissao ? (ESTADOS_MANUTENCAO_ELEVADOR[emissao.estado] || '') : '',
  }
}

/** Payload JSON para send-email.php (FPDF + corpo HTML alinhados ao jsPDF). */
export function buildResumoExecutivoEmailPayload({
  relatorio,
  manutencao,
  maquina,
  cliente = null,
  checklistItems = [],
  proximasManutencoes = [],
  isReparacao = false,
  reparacao = null,
  categoriaNome = '',
}) {
  const meta = buildResumoExecutivoMeta({
    relatorio,
    manutencao,
    maquina,
    cliente,
    checklistItems,
    proximasManutencoes,
    isReparacao,
    reparacao,
    categoriaNome,
  })
  const style = meta.vereditoStyle
  return {
    veredito: meta.veredito,
    vereditoLabel: style?.label ?? '',
    nSim: meta.nSim,
    nNao: meta.nNao,
    nNa: meta.nNa,
    bullets: meta.bullets,
    naoConformes: [
      ...meta.naoConformes,
      ...(meta.pendentes || []).map(p => ({
        ...p,
        texto: `Pendente: ${p.texto}`,
      })),
    ],
    recomendaRetirada: meta.recomendaRetirada,
    decisaoTitulo: meta.decisaoOperacional?.titulo || '',
    decisaoMotivo: meta.decisaoOperacional?.motivo || '',
    linhasContexto: meta.linhasContexto,
    proximaData: meta.proximaData,
    proximaDataFmt: meta.proximaData ? formatDataRelatorioPdf(meta.proximaData) : '',
    proximaTecnico: meta.proximaTecnico,
    clienteNif: meta.clienteNif,
    moradaCliente: meta.moradaCliente,
    periodicidadeLabel: meta.periodicidadeLabel,
    tipoIntervencao: meta.tipoIntervencao,
    contagemLinha: meta.contagemLinha,
    notaAmbitoTitulo: meta.notaAmbitoTitulo,
    notaAmbitoPontos: meta.notaAmbitoPontos,
    declaracaoTitulo: meta.declaracaoTitulo,
    dataAgendamento: meta.dataAgendIso ? formatDataRelatorioPdf(meta.dataAgendIso) : '',
  }
}
