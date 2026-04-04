/**
 * Helpers partilhados pelo relatório de frota (HTML + PDF).
 * IDs vindos da API podem ser number ou string — joins com Set/Map falham sem normalização.
 */
import { STATUS_MANUTENCAO_ABERTA } from './proximaManutAgenda.js'
import { computarProximasDatas } from './diasUteis.js'

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
  const na = String(numeroRelatorioLegivel(a) ?? '')
  const nb = String(numeroRelatorioLegivel(b) ?? '')
  if (na !== nb) return nb.localeCompare(na, undefined, { numeric: true })
  return String(b?.id ?? '').localeCompare(String(a?.id ?? ''))
}

/** Nº de relatório (API camelCase, cache legado snake_case). */
export function numeroRelatorioLegivel(r) {
  if (!r || typeof r !== 'object') return ''
  const n = r.numeroRelatorio ?? r.numero_relatorio
  return n != null && String(n).trim() !== '' ? String(n).trim() : ''
}

/**
 * IDs de intervenções ligadas ao equipamento — usa a lista global de manutenções,
 * não só `manutsM` (agrupado), para o join com `relatorios` não falhar quando o Map fica vazio.
 */
export function normManutencaoMaquinaId(mt) {
  return normEntityId(mt?.maquinaId ?? mt?.maquina_id)
}

export function midSetParaRelatoriosDaMaquina(maquina, manutencoesGlobal, manutsM) {
  const midMaq = normEntityId(maquina?.id)
  const s = new Set()
  for (const list of [manutencoesGlobal, manutsM]) {
    if (!list?.length) continue
    for (const mt of list) {
      if (normManutencaoMaquinaId(mt) === midMaq) s.add(normEntityId(mt.id))
    }
  }
  return s
}

/** Mantém o relatório mais recente; prioriza entrada com nº de relatório preenchido. */
export function mergeRelatorioPreferNewer(prev, next) {
  if (!prev) return next
  if (!next) return prev
  const pNum = numeroRelatorioLegivel(prev)
  const nNum = numeroRelatorioLegivel(next)
  if (pNum && !nNum) return prev
  if (!pNum && nNum) return next
  return compareRelatorioDesc(prev, next) <= 0 ? prev : next
}

function normNumeroSerieMaq(m) {
  return String(m?.numeroSerie ?? m?.numero_serie ?? '').trim().toLowerCase()
}

/** Join relatório → manutenção (camelCase ou snake_case em cache legado). */
export function normRelatorioManutencaoId(r) {
  return normEntityId(r?.manutencaoId ?? r?.manutencao_id)
}

/** `maquina_id` vindo da API (JOIN manutencoes) — ver `data.php` list/get relatorios. */
export function normRelatorioMaquinaIdJoin(r) {
  return normEntityId(r?.manutencaoMaquinaId ?? r?.manutencao_maquina_id)
}

/**
 * Relatório conta para esta linha de equipamento: manutenção no `midSet`, JOIN API, ou mesmo **nº de série**
 * que outra ficha do cliente (duplicados de equipamento com ids diferentes).
 */
export function relatorioLigadoAoEquipamento(r, midSet, maquina, manutencoesGlobal = null, maquinasDoCliente = null) {
  if (midSet.has(normRelatorioManutencaoId(r))) return true
  const midMaq = normEntityId(maquina?.id)
  if (midMaq && normRelatorioMaquinaIdJoin(r) === midMaq) return true
  const rid = normRelatorioManutencaoId(r)
  if (!rid || !manutencoesGlobal?.length || !maquinasDoCliente?.length) return false
  const mt = manutencoesGlobal.find(x => normEntityId(x.id) === rid)
  if (!mt) return false
  const maqRelId = normManutencaoMaquinaId(mt)
  const maqRel = maquinasDoCliente.find(x => normEntityId(x.id) === maqRelId)
  const serieRel = normNumeroSerieMaq(maqRel)
  const serieAlvo = normNumeroSerieMaq(maquina)
  return !!(serieRel && serieAlvo && serieRel === serieAlvo)
}

export function pickNewestRelatorioForMidSet(midSet, relatorios) {
  const list = (relatorios || []).filter(r => midSet.has(normRelatorioManutencaoId(r)))
  if (!list.length) return null
  return [...list].sort(compareRelatorioDesc)[0]
}

/** Relatório entra no `relMap` pré-frota (todas as máquinas do cliente listadas). */
export function relatorioVisivelNaFrotaCliente(r, maqIds, manutsCliente, manutencoes, maquinas) {
  const rid = normRelatorioManutencaoId(r)
  if (!rid) return false
  const mqJoin = normRelatorioMaquinaIdJoin(r)
  if (manutsCliente.some(mt => normEntityId(mt.id) === rid)) return true
  if (mqJoin && maqIds.has(mqJoin)) return true
  if (!manutencoes?.length || !maquinas?.length) return false
  const mt = manutencoes.find(x => normEntityId(x.id) === rid)
  if (!mt) return false
  const maqRelId = normManutencaoMaquinaId(mt)
  const maqRel = maquinas.find(x => normEntityId(x.id) === maqRelId)
  const serieRel = normNumeroSerieMaq(maqRel)
  if (!serieRel) return false
  return maquinas.some(m => maqIds.has(normEntityId(m.id)) && normNumeroSerieMaq(m) === serieRel)
}

/**
 * Entre relatórios do equipamento, preferem-se os com **nº oficial** — rascunhos mais recentes
 * sem número deixavam a frota sem «Últ. rel.» e com data errada.
 */
export function pickNewestRelatorioParaEquipamento(midSet, maquina, relatorios, manutencoesGlobal = null, maquinasDoCliente = null) {
  const list = (relatorios || []).filter(r =>
    relatorioLigadoAoEquipamento(r, midSet, maquina, manutencoesGlobal, maquinasDoCliente),
  )
  if (!list.length) return null
  const withNum = list.filter(r => numeroRelatorioLegivel(r))
  const pool = withNum.length ? withNum : list
  return [...pool].sort(compareRelatorioDesc)[0]
}

/** Se `rel` não tem nº, tenta outra entrada com o mesmo `manutencaoId` (lista pode ter duplicados). */
function enrichRelatorioComNumero(rel, relatorios) {
  if (!rel || numeroRelatorioLegivel(rel)) return rel
  const rid = normRelatorioManutencaoId(rel)
  if (!rid) return rel
  const other = (relatorios || []).find(
    r => normRelatorioManutencaoId(r) === rid && numeroRelatorioLegivel(r),
  )
  if (!other) return rel
  return { ...rel, numeroRelatorio: numeroRelatorioLegivel(other) }
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
 * Registo passado a `resolveProximaManutParaFrota`: quando a data efectiva (`dataUltimaKey`)
 * vem do relatório e a linha `manutencoes.data` está desactualizada, usa-se `dataUltimaKey`
 * para o cálculo da próxima periodicidade.
 */
export function ultimaRegistroParaProxima(ultima, dataUltimaKey) {
  if (!dataUltimaKey) return ultima || null
  if (!ultima) return { data: dataUltimaKey }
  const dk = dateKeyForFilter(ultima.data)
  if (dk && dk === dataUltimaKey) return ultima
  return { ...ultima, data: dataUltimaKey }
}

/**
 * Última execução para colunas «Última» e «Últ. rel.» no relatório de frota.
 *
 * **Regra de datas:** a data do **relatório** (assinatura/criação) tem prioridade sobre a linha
 * em `manutencoes` e sobre `maquinas.ultimaManutencaoData`. A ficha pode estar à frente do
 * relatório (sincronização ou edição) e gerava «Última» posteriors ao PDF — ver casos com
 * relatório emitido e frota a mostrar data errada.
 *
 * @param {object} maquina
 * @param {object[]} manutsM
 * @param {object[]} relatorios — relatórios de manutenção (lista global)
 * @param {Map<string, object>} relMap — manutencaoId → relatorio
 * @param {object[] | null} [manutencoesGlobal] — todas as manutenções em memória
 * @param {object[] | null} [maquinasDoCliente] — frota do cliente (mesmo NIF), para fallback por nº de série
 * @returns {{ dataUltimaKey: string, ultima: object | null, relUltima: object | null }}
 */
export function resolveUltimaParaFrota(maquina, manutsM, relatorios, relMap, manutencoesGlobal = null, maquinasDoCliente = null) {
  const midSet = midSetParaRelatoriosDaMaquina(maquina, manutencoesGlobal || [], manutsM)

  const concluidas = (manutsM || []).filter(isManutencaoConcluida)
  const conclComData = concluidas
    .map(mt => ({ mt, dk: dateKeyForFilter(mt.data) }))
    .filter(x => x.dk)
    .sort((a, b) => b.dk.localeCompare(a.dk))

  const bestManut = conclComData[0]?.mt ?? null
  const bestManutKey = conclComData[0]?.dk ?? ''

  const fichaKey = dateKeyForFilter(maquina?.ultimaManutencaoData)

  const bestRel = pickNewestRelatorioParaEquipamento(midSet, maquina, relatorios, manutencoesGlobal, maquinasDoCliente)
  const bestRelKey = reportDateSortKey(bestRel) || ''

  let dataUltimaKey = ''
  if (bestRelKey) {
    dataUltimaKey = bestRelKey
  } else {
    const rest = [bestManutKey, fichaKey].filter(Boolean)
    dataUltimaKey = rest.length === 0 ? '' : rest.reduce((a, b) => (a > b ? a : b))
  }

  let ultima = null
  if (bestRel) {
    const rid = normRelatorioManutencaoId(bestRel)
    ultima = (manutsM || []).find(mt => normEntityId(mt.id) === rid) || null
  }
  if (!ultima) {
    ultima = bestManut
    if (dataUltimaKey && bestManutKey !== dataUltimaKey) {
      ultima = concluidas.find(mt => dateKeyForFilter(mt.data) === dataUltimaKey) || null
    }
    if (!ultima && dataUltimaKey && concluidas.length) {
      ultima = conclComData.find(x => x.dk === dataUltimaKey)?.mt
        ?? conclComData[0]?.mt
        ?? concluidas[0]
    }
  }

  let relUltima = bestRel ? enrichRelatorioComNumero(bestRel, relatorios) : null
  if (!relUltima && ultima) {
    relUltima = relMap.get(normEntityId(ultima.id))
  }
  if (!relUltima && dataUltimaKey) {
    relUltima = (relatorios || []).find(
      r => relatorioLigadoAoEquipamento(r, midSet, maquina, manutencoesGlobal, maquinasDoCliente)
        && reportDateSortKey(r) === dataUltimaKey,
    ) || null
  }
  if (!relUltima && bestRel) relUltima = enrichRelatorioComNumero(bestRel, relatorios)

  relUltima = enrichRelatorioComNumero(relUltima, relatorios)

  return { dataUltimaKey, ultima, relUltima }
}
