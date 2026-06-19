/**
 * Resumo executivo e não conformidades para PDF/email de relatórios de manutenção.
 */
import { linhasNotasRelatorio } from '../components/executarManutencao/execWizardHelpers.js'
import { INTERVALOS_KAESER } from '../domain/equipamentoDomain.js'
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
  const nSim = vals.filter(v => v === 'sim' || v === 'OK').length
  const nNao = vals.filter(v => v === 'nao' || v === 'NOK').length
  const nNa = vals.filter(v => v === 'N/A').length
  const nPend = vals.filter(v => !v || (v !== 'sim' && v !== 'OK' && v !== 'nao' && v !== 'NOK' && v !== 'N/A')).length
  return { nSim, nNao, nNa, nPend, total: vals.length }
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
}

/** Itens com resposta não conforme. */
export function itensNaoConformes(relatorio, checklistItems = []) {
  const resp = relatorio?.checklistRespostas ?? {}
  return checklistItems
    .map((item, index) => {
      const r = resp[item.id]
      const nao = r === 'nao' || r === 'NOK'
      if (!nao) return null
      return { index: index + 1, id: item.id, texto: String(item.texto ?? '').trim() }
    })
    .filter(Boolean)
}

/** Bullets para o resumo (máx. 3). */
export function buildResumoExecutivoBullets({ notas, naoConformes, max = 3 }) {
  const bullets = []
  for (const nc of naoConformes) {
    if (bullets.length >= max) break
    const txt = nc.texto.length > 90 ? `${nc.texto.slice(0, 87)}…` : nc.texto
    bullets.push(`Não conforme (${nc.index}): ${txt}`)
  }
  const notaLinhas = linhasNotasRelatorio(notas)
  for (const line of notaLinhas) {
    if (bullets.length >= max) break
    if (bullets.some(b => b.includes(line))) continue
    bullets.push(line.length > 100 ? `${line.slice(0, 97)}…` : line)
  }
  if (bullets.length === 0 && naoConformes.length === 0) {
    bullets.push('Verificação concluída sem não conformidades registadas.')
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
}) {
  const { nSim, nNao, nNa } = contagemChecklistRespostas(relatorio?.checklistRespostas)
  const veredito = isReparacao ? null : calcularVereditoChecklist(relatorio?.checklistRespostas, checklistItems)
  const naoConformes = isReparacao ? [] : itensNaoConformes(relatorio, checklistItems)
  const bullets = isReparacao
    ? buildResumoExecutivoBullets({ notas: relatorio?.notas, naoConformes: [], max: 3 })
    : buildResumoExecutivoBullets({ notas: relatorio?.notas, naoConformes, max: 3 })
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
  })
  const style = meta.vereditoStyle
  return {
    veredito: meta.veredito,
    vereditoLabel: style?.label ?? '',
    nSim: meta.nSim,
    nNao: meta.nNao,
    nNa: meta.nNa,
    bullets: meta.bullets,
    naoConformes: meta.naoConformes,
    proximaData: meta.proximaData,
    proximaDataFmt: meta.proximaData ? formatDataRelatorioPdf(meta.proximaData) : '',
    proximaTecnico: meta.proximaTecnico,
    clienteNif: meta.clienteNif,
    moradaCliente: meta.moradaCliente,
    periodicidadeLabel: meta.periodicidadeLabel,
    tipoIntervencao: meta.tipoIntervencao,
    dataAgendamento: meta.dataAgendIso ? formatDataRelatorioPdf(meta.dataAgendIso) : '',
  }
}
