/**
 * agendaDomain — Lógica pura de geração de manutenções periódicas futuras.
 * Partilhada por prepararManutencoesPeriodicas, recalcularPeriodicasAposExecucao
 * e sincronizarAgendaCompleta (DataContext).
 */
import { buildFeriadosSet, encontrarDiaLivre } from '../utils/diasUteis.js'
import { STATUS_MANUTENCAO_ABERTA } from '../utils/proximaManutAgenda.js'
import { normEntityId } from '../utils/frotaReportHelpers.js'
import { INTERVALOS } from './equipamentoDomain.js'

/** Horizonte de geração de periódicas (~3 anos). */
export const THREE_YEARS_MS = 3 * 365.25 * 24 * 3600 * 1000

/**
 * Linhas de agenda que pertencem à cadeia periódica e ainda estão abertas.
 * Exclui montagem — não é limpa no recálculo pós-periódica / sincronização global.
 */
export function isSlotCadeiaPeriodicaAberta(m, maquinaId) {
  if (normEntityId(m.maquinaId) !== normEntityId(maquinaId)) return false
  if (!STATUS_MANUTENCAO_ABERTA.has(m.status)) return false
  return m.tipo !== 'montagem'
}

export function dateToIsoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dias já ocupados por manutenções agendadas ou pendentes. */
export function buildDiasOcupadosFromManutencoes(manutencoes, { excludeIds } = {}) {
  const excl = excludeIds ? new Set(excludeIds) : null
  return new Set(
    manutencoes
      .filter(m => (!excl || !excl.has(m.id)) && (m.status === 'agendada' || m.status === 'pendente'))
      .map(m => m.data),
  )
}

export function calcLimiteMontagemMs(dataBaseIso) {
  return new Date(dataBaseIso).getTime() + THREE_YEARS_MS
}

export function calcLimiteExecucaoMs(dataExecIso, hojeStr) {
  const dataBaseMs = new Date(`${dataExecIso}T12:00:00`).getTime()
  const hojeNoonMs = new Date(`${hojeStr}T12:00:00`).getTime()
  return Math.max(dataBaseMs + THREE_YEARS_MS, hojeNoonMs + THREE_YEARS_MS)
}

/**
 * Gera slots de manutenções periódicas futuras a partir de dataBase + intervalo.
 * @returns {{ novas: object[], conflitos?: object[] }}
 */
export function gerarManutencoesPeriodicasFuturas({
  dataBaseIso,
  periodicidade,
  intervaloDias,
  maquinaId,
  tecnico = '',
  limiteMs,
  diasOcupados,
  hojeStr = null,
  observacoes,
  idSeed = Date.now(),
  idSuffixRandom = false,
  trackConflitos = false,
  manutencoesForConflitos = [],
  incluirCriadoEm = false,
}) {
  const anoInicio = new Date(dataBaseIso).getFullYear()
  const anoFim = new Date(limiteMs).getFullYear()
  const feriadosSet = buildFeriadosSet(anoInicio, anoFim)
  const ocupados = new Set(diasOcupados)
  const novas = []
  const conflitos = []
  let d = new Date(`${dataBaseIso}T12:00:00`)

  while (true) {
    d = new Date(d.getTime() + intervaloDias * 24 * 3600 * 1000)
    if (d.getTime() > limiteMs) break

    const { data: dAjustada, conflito } = encontrarDiaLivre(d, feriadosSet, ocupados)
    const iso = dateToIsoLocal(dAjustada)
    if (hojeStr && iso < hojeStr) continue

    const idx = novas.length
    const id = idSuffixRandom
      ? `mp${idSeed}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      : `mp${idSeed}_${idx + 1}`

    const row = {
      id,
      maquinaId,
      tipo: 'periodica',
      periodicidade,
      data: iso,
      tecnico: tecnico || '',
      status: 'agendada',
      observacoes,
    }
    if (incluirCriadoEm) row.criadoEm = new Date().toISOString()
    novas.push(row)

    if (trackConflitos && conflito) {
      const existentes = manutencoesForConflitos.filter(
        m => (m.status === 'agendada' || m.status === 'pendente') && m.data === iso,
      ).length
      conflitos.push({ index: idx, data: iso, existentes })
    }
    ocupados.add(iso)
  }

  return trackConflitos ? { novas, conflitos } : { novas }
}

export function periodicidadeEfetivaParaMaquina(maq, subcategorias, categorias) {
  let p = maq.periodicidadeManut
  if (p && INTERVALOS[p]) return p
  const sub = subcategorias.find(s => String(s.id) === String(maq.subcategoriaId))
  const cat = sub ? categorias.find(c => String(c.id) === String(sub.categoriaId)) : null
  p = cat?.intervaloTipo
  return p && INTERVALOS[p] ? p : null
}

/** Última data de execução: max(ficha.ultimaManutencaoData, última concluída na agenda). */
export function resolverDataExecucaoParaMaquina(maq, manutencoes, sameMid) {
  let dataExec = maq.ultimaManutencaoData ? String(maq.ultimaManutencaoData).slice(0, 10) : null
  const concl = manutencoes.filter(m => sameMid(m, maq.id) && m.status === 'concluida' && m.data)
  if (concl.length > 0) {
    concl.sort((a, b) => b.data.localeCompare(a.data))
    const ultimaConcl = concl[0].data
    if (!dataExec || ultimaConcl > dataExec) dataExec = ultimaConcl
  }
  return dataExec
}

/**
 * Recalcula slots periódicos futuros no array de manutenções (pós-execução).
 * @returns {{ next: object[], idsRemover: string[], novas: object[], novaCount: number }}
 */
export function recalcularPeriodicasNoEstado(prev, {
  maquinaId,
  periodicidade,
  dataExecucao,
  tecnico = '',
  hojeStr,
  intervalos,
  idSeed = Date.now(),
  observacoes = 'Reagendamento automático pós-execução periódica.',
}) {
  if (!periodicidade || !intervalos?.[periodicidade]) {
    return { next: prev, idsRemover: [], novas: [], novaCount: 0 }
  }

  const intervaloDias = intervalos[periodicidade].dias
  const limiteMs = calcLimiteExecucaoMs(dataExecucao, hojeStr)
  const aRemover = prev.filter(m => isSlotCadeiaPeriodicaAberta(m, maquinaId))
  const idsRemover = aRemover.map(m => m.id)
  const idsRemoverSet = new Set(idsRemover)
  const semFuturas = prev.filter(m => !idsRemoverSet.has(m.id))
  const diasOcupados = buildDiasOcupadosFromManutencoes(semFuturas)
  const { novas } = gerarManutencoesPeriodicasFuturas({
    dataBaseIso: dataExecucao,
    periodicidade,
    intervaloDias,
    maquinaId,
    tecnico,
    limiteMs,
    diasOcupados,
    hojeStr,
    observacoes,
    idSeed,
  })

  return {
    next: [...semFuturas, ...novas],
    idsRemover,
    novas,
    novaCount: novas.length,
  }
}

/**
 * Um equipamento na sincronização completa da agenda: remove cadeia aberta e gera novas ≥ hoje.
 * @returns {{ acc: object[], idsRemover: string[], novas: object[], recalculada: boolean }}
 */
export function recalcularAgendaMaquinaNoAcc(acc, {
  maq,
  subcategorias,
  categorias,
  hojeStr,
  intervalos,
  sameMid,
  idSeed,
}) {
  const periodicidade = periodicidadeEfetivaParaMaquina(maq, subcategorias, categorias)
  if (!periodicidade) {
    return { acc, idsRemover: [], novas: [], recalculada: false }
  }

  const dataExec = resolverDataExecucaoParaMaquina(maq, acc, sameMid)
  if (!dataExec) {
    return { acc, idsRemover: [], novas: [], recalculada: false }
  }

  const aRemover = acc.filter(m => isSlotCadeiaPeriodicaAberta(m, maq.id))
  const idsRemover = aRemover.map(m => m.id)
  const idsRemoverSet = new Set(idsRemover)
  let nextAcc = acc.filter(m => !idsRemoverSet.has(m.id))

  const diasOcupados = buildDiasOcupadosFromManutencoes(nextAcc)
  const conclConc = nextAcc
    .filter(m => sameMid(m, maq.id) && m.status === 'concluida' && m.data)
    .sort((a, b) => b.data.localeCompare(a.data))
  const tecnico = conclConc[0]?.tecnico || ''

  const intervaloDias = intervalos[periodicidade].dias
  const limiteMs = calcLimiteExecucaoMs(dataExec, hojeStr)
  const { novas } = gerarManutencoesPeriodicasFuturas({
    dataBaseIso: dataExec,
    periodicidade,
    intervaloDias,
    maquinaId: maq.id,
    tecnico,
    limiteMs,
    diasOcupados,
    hojeStr,
    observacoes: 'Reagendamento automático (sincronização completa da agenda).',
    idSeed,
    idSuffixRandom: true,
    incluirCriadoEm: true,
  })

  nextAcc = [...nextAcc, ...novas]
  return { acc: nextAcc, idsRemover, novas, recalculada: true }
}
