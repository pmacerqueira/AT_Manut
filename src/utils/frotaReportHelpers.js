/**
 * Helpers partilhados pelo relatório de frota (HTML + PDF).
 * IDs vindos da API podem ser number ou string — joins com Set/Map falham sem normalização.
 */
import { STATUS_MANUTENCAO_ABERTA } from './proximaManutAgenda'
import { computarProximasDatas } from './diasUteis'

/** @param {unknown} v */
export function normEntityId(v) {
  if (v == null || v === '') return ''
  return String(v)
}

/**
 * Extrai yyyy-mm-dd para comparações com intervalos do modal de frota.
 * @param {unknown} d
 */
export function dateKeyForFilter(d) {
  if (d == null || d === '') return ''
  const s = String(d).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const dm = s.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/)
  if (dm) return `${dm[3]}-${dm[2]}-${dm[1]}`
  return s.length >= 10 ? s.slice(0, 10) : s
}

/**
 * yyyy-mm-dd para ordenar / filtrar relatórios (assinatura, criação ou registo `criadoEm` na BD).
 * Sem isto, `bestRel` fica vazio quando só `criadoEm` vem preenchido e a coluna «Últ. rel.» passa a «—».
 * @param {object | null | undefined} r
 */
export function reportDateSortKey(r) {
  if (!r) return ''
  const raw = r.dataAssinatura ?? r.dataCriacao ?? r.criadoEm ?? r.criado_em ?? ''
  return dateKeyForFilter(raw)
}

/**
 * @param {object | null | undefined} a
 * @param {object | null | undefined} b
 * @returns {number} comparador sort: mais recente primeiro
 */
function compareRelatorioDesc(a, b) {
  const da = reportDateSortKey(a)
  const db = reportDateSortKey(b)
  if (da !== db) {
    if (!da) return 1
    if (!db) return -1
    return db.localeCompare(da)
  }
  const na = String(a?.numeroRelatorio ?? '')
  const nb = String(b?.numeroRelatorio ?? '')
  if (na !== nb) return nb.localeCompare(na, undefined, { numeric: true })
  return String(b?.id ?? '').localeCompare(String(a?.id ?? ''))
}

/** Mantém o relatório mais recente quando existem várias entradas para a mesma manutenção. */
export function mergeRelatorioPreferNewer(prev, next) {
  if (!prev) return next
  if (!next) return prev
  return compareRelatorioDesc(prev, next) <= 0 ? prev : next
}

/**
 * Relatório mais recente ligado a intervenções deste equipamento (`midSet` = ids de manutenções da máquina).
 * @param {Set<string>} midSet
 * @param {object[]} relatorios
 */
export function pickNewestRelatorioForMidSet(midSet, relatorios) {
  const list = (relatorios || []).filter(r => midSet.has(normEntityId(r.manutencaoId)))
  if (!list.length) return null
  return [...list].sort(compareRelatorioDesc)[0]
}

/**
 * Equipamento pertence ao cliente (NIF pode ter espaços; legado usa clienteId).
 * @param {{ clienteNif?: string, clienteId?: string }} m
 * @param {{ nif?: string }} cliente
 */
export function maquinaPertenceCliente(m, cliente) {
  const raw = String(cliente?.nif ?? '').trim()
  if (!raw) return false
  const cn = String(m?.clienteNif ?? '').trim()
  const ci = String(m?.clienteId ?? '').trim()
  const compact = (x) => x.replace(/\s+/g, '')
  return cn === raw || ci === raw || compact(cn) === compact(raw) || compact(ci) === compact(raw)
}

/**
 * Próxima data para frota / fichas: agenda (pendente, agendada, em_progresso), depois
 * `maquinas.proximaManut`, depois cálculo a partir da última concluída + periodicidade
 * (mesma regra que PDF de manutenção — dias úteis).
 *
 * @param {object} maquina
 * @param {object[]} manutsM – manutenções desta máquina
 * @param {object | undefined} ultimaConcluida – última manutenção com status concluida
 * @returns {{ dataKey: string, registo: object | null, fonte: 'agenda' | 'maquina' | 'computada' | null }}
 */
export function resolveProximaManutParaFrota(maquina, manutsM, ultimaConcluida) {
  const open = (manutsM || [])
    .filter(mt => STATUS_MANUTENCAO_ABERTA.has(mt.status))
    .filter(mt => mt.data != null && mt.data !== '')
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
  const firstOpen = open[0] || null
  if (firstOpen?.data) {
    return { dataKey: String(firstOpen.data).slice(0, 10), registo: firstOpen, fonte: 'agenda' }
  }
  if (maquina?.proximaManut) {
    return { dataKey: String(maquina.proximaManut).slice(0, 10), registo: null, fonte: 'maquina' }
  }
  const peri = maquina?.periodicidadeManut
  const ultimaData = ultimaConcluida?.data != null ? String(ultimaConcluida.data).slice(0, 10) : ''
  if (ultimaData && peri) {
    const comp = computarProximasDatas(ultimaData, peri, { count: 1 })
    if (comp[0]?.data) {
      return { dataKey: comp[0].data, registo: null, fonte: 'computada' }
    }
  }
  return { dataKey: '', registo: null, fonte: null }
}

/** Status «concluída» tolerante a capitalização e espaços (respostas API legadas). */
export function isManutencaoConcluida(mt) {
  return String(mt?.status ?? '').toLowerCase().trim() === 'concluida'
}

/**
 * Última execução para colunas «Última» e «Últ. rel.» no relatório de frota.
 * Cruza manutenções concluídas com data, `maquinas.ultimaManutencaoData` e datas dos relatórios
 * ligados às intervenções do equipamento — evita «—» quando só falha o campo `data` na linha
 * ou o join relatório/manutenção está desalinhado com `ultima` vazia.
 *
 * @param {object} maquina
 * @param {object[]} manutsM
 * @param {object[]} relatorios — relatórios de manutenção (lista global)
 * @param {Map<string, object>} relMap — manutencaoId → relatorio
 * @returns {{ dataUltimaKey: string, ultima: object | null, relUltima: object | null }}
 */
export function resolveUltimaParaFrota(maquina, manutsM, relatorios, relMap) {
  const midSet = new Set((manutsM || []).map(mt => normEntityId(mt.id)))

  const concluidas = (manutsM || []).filter(isManutencaoConcluida)
  const conclComData = concluidas
    .map(mt => ({ mt, dk: dateKeyForFilter(mt.data) }))
    .filter(x => x.dk)
    .sort((a, b) => b.dk.localeCompare(a.dk))

  const bestManut = conclComData[0]?.mt ?? null
  const bestManutKey = conclComData[0]?.dk ?? ''

  const fichaKey = dateKeyForFilter(maquina?.ultimaManutencaoData)

  const bestRel = pickNewestRelatorioForMidSet(midSet, relatorios)
  const bestRelKey = reportDateSortKey(bestRel) || ''

  const candidates = [bestManutKey, fichaKey, bestRelKey].filter(Boolean)
  const dataUltimaKey = candidates.length === 0
    ? ''
    : candidates.reduce((a, b) => (a > b ? a : b))

  let ultima = bestManut
  if (dataUltimaKey && bestManutKey !== dataUltimaKey) {
    ultima = concluidas.find(mt => dateKeyForFilter(mt.data) === dataUltimaKey) || null
  }
  if (!ultima && dataUltimaKey && concluidas.length) {
    ultima = conclComData.find(x => x.dk === dataUltimaKey)?.mt
      ?? conclComData[0]?.mt
      ?? concluidas[0]
  }

  let relUltima = ultima ? relMap.get(normEntityId(ultima.id)) : null
  if (!relUltima && dataUltimaKey) {
    relUltima = (relatorios || []).find(
      r => midSet.has(normEntityId(r.manutencaoId))
        && reportDateSortKey(r) === dataUltimaKey,
    ) || null
  }
  if (!relUltima && bestRel) relUltima = bestRel

  return { dataUltimaKey, ultima, relUltima }
}
