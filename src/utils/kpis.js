/**
 * kpis.js — Funções de cálculo de indicadores de desempenho (KPIs) da frota.
 *
 * Todos os cálculos são feitos localmente sobre os dados do DataContext.
 * Definições alinhadas com a lista Manutenções (data yyyy-MM-dd, fuso Açores) e
 * com o Dashboard para os mesmos números nos dois ecrãs.
 */

import {
  subMonths,
  isBefore,
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  addMonths,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { pt } from 'date-fns/locale'
import { getHojeAzores, parseDateLocal } from './datasAzores'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isManutencaoPendenteOuAgendada(m) {
  return m.status === 'pendente' || m.status === 'agendada'
}

export function isManutencaoConcluidaStatus(m) {
  return m.status === 'concluida' || m.status === 'concluído'
}

/** Hoje (início do dia civil) no calendário dos Açores — igual à lista Manutenções / Dashboard. */
export function refDiaAzores() {
  return startOfDay(parseDateLocal(getHojeAzores()))
}

/** Intervenções agendadas/pendentes com data anterior a hoje (igual a /manutencoes?filter=atraso). */
export function filterManutencoesEmAtraso(manutencoes, hojeStr = getHojeAzores()) {
  return manutencoes.filter(m => isManutencaoPendenteOuAgendada(m) && m.data < hojeStr)
}

/** Hoje ou futuro (inclui o dia de hoje). */
export function filterManutencoesProximas(manutencoes, hojeStr = getHojeAzores()) {
  return manutencoes.filter(m => isManutencaoPendenteOuAgendada(m) && m.data >= hojeStr)
}

/** Próximas dentro de N meses a partir de hoje (hoje inclusivo, limite exclusivo por dia). */
export function filterManutencoesProximasProximosMeses(manutencoes, meses, hojeStr = getHojeAzores()) {
  const hoje = startOfDay(parseDateLocal(hojeStr))
  const limite = startOfDay(addMonths(hoje, meses))
  return manutencoes.filter(m => {
    if (!isManutencaoPendenteOuAgendada(m)) return false
    const d = startOfDay(parseDateLocal(m.data))
    return !isBefore(d, hoje) && isBefore(d, limite)
  })
}

// ─── KPIs gerais ─────────────────────────────────────────────────────────────

/**
 * Resumo de contagens gerais da frota.
 * emAtraso = mesma regra que o cartão «Em atraso» do Dashboard (registos pendentes/agendados com data &lt; hoje).
 */
export function calcResumoCounts({ clientes, maquinas, manutencoes, relatorios }) {
  const semEmail = clientes.filter(c => !c.email || c.email.trim() === '')

  return {
    totalClientes:    clientes.length,
    totalMaquinas:    maquinas.length,
    totalManutencoes: manutencoes.length,
    totalRelatorios:  relatorios.length,
    emAtraso:         filterManutencoesEmAtraso(manutencoes).length,
    semEmail:         semEmail.length,
  }
}

/**
 * Taxa de cumprimento: % de manutenções concluídas entre todas as registadas
 * cuja data cai na janela móvel dos últimos N meses (dias civis, início inclusivo).
 */
export function calcTaxaCumprimento({ manutencoes, meses = 12 }) {
  const hoje = refDiaAzores()
  const limite = startOfDay(subMonths(hoje, meses))
  const recentes = manutencoes.filter(m => {
    const d = startOfDay(parseDateLocal(m.data))
    return !isBefore(d, limite)
  })
  if (recentes.length === 0) return { percentagem: null, total: 0, concluidas: 0 }

  const concluidas = recentes.filter(m => isManutencaoConcluidaStatus(m))
  return {
    percentagem: Math.round((concluidas.length / recentes.length) * 100),
    total:       recentes.length,
    concluidas:  concluidas.length,
  }
}

/**
 * Próximas manutenções agrupadas por semana (próximas 8 semanas).
 */
export function calcProximasSemanas({ manutencoes, semanas = 8 }) {
  const refDia = refDiaAzores()
  const resultado = []

  for (let i = 0; i < semanas; i++) {
    const semanaRef = addWeeks(refDia, i)
    const inicio = startOfDay(startOfWeek(semanaRef, { weekStartsOn: 1 }))
    const fim = endOfDay(endOfWeek(semanaRef, { weekStartsOn: 1 }))

    const daSemana = manutencoes.filter(m => {
      if (!isManutencaoPendenteOuAgendada(m)) return false
      const d = startOfDay(parseDateLocal(m.data))
      return !isBefore(d, inicio) && !isBefore(fim, d)
    })

    resultado.push({
      semana:    i,
      label:     i === 0
        ? 'Esta semana'
        : i === 1
          ? 'Próxima semana'
          : `Sem. ${format(inicio, 'd MMM', { locale: pt })}`,
      labelCurto: format(inicio, 'd/MM', { locale: pt }),
      pendentes:  daSemana.filter(m => m.status === 'pendente').length,
      agendadas:  daSemana.filter(m => m.status === 'agendada').length,
      total:      daSemana.length,
    })
  }

  return resultado
}

/**
 * Top clientes com mais equipamentos com pelo menos uma manutenção em atraso
 * (mesma regra que emAtraso / lista Manutenções).
 */
export function calcTopClientesAtraso({ clientes, maquinas, manutencoes }) {
  const hojeStr = getHojeAzores()
  const maquinasComAtraso = new Set()
  for (const m of manutencoes) {
    if (isManutencaoPendenteOuAgendada(m) && m.data < hojeStr) {
      maquinasComAtraso.add(m.maquinaId)
    }
  }

  const porCliente = clientes.map(c => {
    const nif = c.nif ?? c.id
    const maqsCliente = maquinas.filter(
      mq => mq.clienteNif === nif || mq.clienteId === nif || mq.cliente_id === c.id
    )
    const ids = new Set(maqsCliente.map(mq => mq.id))
    let emAtraso = 0
    for (const mid of maquinasComAtraso) {
      if (ids.has(mid)) emAtraso++
    }
    return {
      clienteId:     c.id,
      nome:          c.nome ?? '(sem nome)',
      totalMaquinas: maqsCliente.length,
      emAtraso,
    }
  })

  return porCliente
    .filter(c => c.emAtraso > 0)
    .sort((a, b) => b.emAtraso - a.emAtraso)
    .slice(0, 5)
}

/**
 * Evolução mensal (últimos N meses, ancorado ao dia de hoje nos Açores).
 */
export function calcEvolucaoMensal({ manutencoes, meses = 6 }) {
  const refDia = refDiaAzores()
  const resultado = []

  for (let i = meses - 1; i >= 0; i--) {
    const mes = subMonths(refDia, i)
    const ano = mes.getFullYear()
    const mesNum = mes.getMonth()

    const doMes = manutencoes.filter(m => {
      const d = parseDateLocal(m.data)
      return d.getFullYear() === ano && d.getMonth() === mesNum
    })

    resultado.push({
      label:      format(mes, 'MMM yy', { locale: pt }),
      concluidas: doMes.filter(m => isManutencaoConcluidaStatus(m)).length,
      pendentes:  doMes.filter(m => m.status === 'pendente').length,
      agendadas:  doMes.filter(m => m.status === 'agendada').length,
      total:      doMes.length,
    })
  }

  return resultado
}
