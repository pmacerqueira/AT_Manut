/**
 * kpis.js — Funções de cálculo de indicadores de desempenho (KPIs) da frota.
 *
 * Todos os cálculos são feitos localmente sobre os dados do DataContext.
 * Os resultados devem ser memorizados (useMemo) para evitar recálculos desnecessários.
 */

import { subMonths, isAfter, isBefore, parseISO, differenceInDays, format, startOfWeek, endOfWeek, addWeeks } from 'date-fns'
import { pt } from 'date-fns/locale'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseData = (str) => {
  if (!str) return null
  try { return parseISO(str) } catch { return null }
}

// ─── KPIs gerais ─────────────────────────────────────────────────────────────

/**
 * Resumo de contagens gerais da frota.
 */
export function calcResumoCounts({ clientes, maquinas, manutencoes, relatorios }) {
  const hoje = new Date()
  const emAtraso   = maquinas.filter(m => {
    const prox = parseData(m.proxima_manut ?? m.proximaManut)
    return prox && isBefore(prox, hoje)
  })
  const semEmail = clientes.filter(c => !c.email || c.email.trim() === '')

  return {
    totalClientes:    clientes.length,
    totalMaquinas:    maquinas.length,
    totalManutencoes: manutencoes.length,
    totalRelatorios:  relatorios.length,
    emAtraso:         emAtraso.length,
    semEmail:         semEmail.length,
  }
}

/**
 * Taxa de cumprimento: % de manutenções concluídas nos últimos N meses, no prazo.
 * "No prazo" = status 'concluida' ou 'concluído'.
 */
export function calcTaxaCumprimento({ manutencoes, meses = 12 }) {
  const limite = subMonths(new Date(), meses)
  const recentes = manutencoes.filter(m => {
    const d = parseData(m.data)
    return d && isAfter(d, limite)
  })
  if (recentes.length === 0) return { percentagem: null, total: 0, concluidas: 0 }

  const concluidas = recentes.filter(m =>
    m.status === 'concluida' || m.status === 'concluído' || m.status === 'concluida'
  )
  return {
    percentagem: Math.round((concluidas.length / recentes.length) * 100),
    total:       recentes.length,
    concluidas:  concluidas.length,
  }
}

/**
 * Próximas manutenções agrupadas por semana (próximas 8 semanas).
 * Devolve array de { semana, label, pendentes, agendadas }.
 */
export function calcProximasSemanas({ manutencoes, semanas = 8 }) {
  const hoje = new Date()
  const resultado = []

  for (let i = 0; i < semanas; i++) {
    const inicio = startOfWeek(addWeeks(hoje, i), { weekStartsOn: 1 })
    const fim    = endOfWeek(addWeeks(hoje, i), { weekStartsOn: 1 })

    const daSemana = manutencoes.filter(m => {
      const d = parseData(m.data)
      return d && !isBefore(d, inicio) && !isAfter(d, fim) &&
             (m.status === 'pendente' || m.status === 'agendada')
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
 * Top clientes com mais manutenções em atraso.
 * Devolve array de { clienteId, nome, totalMaquinas, emAtraso }.
 */
export function calcTopClientesAtraso({ clientes, maquinas }) {
  const hoje = new Date()

  const porCliente = clientes.map(c => {
    const maqsCliente = maquinas.filter(m => m.cliente_id === c.id)
    const emAtraso    = maqsCliente.filter(m => {
      const prox = parseData(m.proxima_manut ?? m.proximaManut)
      return prox && isBefore(prox, hoje)
    })
    return {
      clienteId:    c.id,
      nome:         c.nome ?? '(sem nome)',
      totalMaquinas: maqsCliente.length,
      emAtraso:      emAtraso.length,
    }
  })

  return porCliente
    .filter(c => c.emAtraso > 0)
    .sort((a, b) => b.emAtraso - a.emAtraso)
    .slice(0, 5)
}

/**
 * Distribuição do status das manutenções pendentes/agendadas actuais.
 */
export function calcDistribuicaoStatus({ manutencoes }) {
  const activas = manutencoes.filter(m =>
    m.status === 'pendente' || m.status === 'agendada' || m.status === 'concluida' || m.status === 'concluído'
  )
  const grupos = {}
  for (const m of activas) {
    const s = m.status ?? 'desconhecido'
    grupos[s] = (grupos[s] ?? 0) + 1
  }
  return Object.entries(grupos).map(([status, count]) => ({ status, count }))
}

/**
 * Evolução mensal de manutenções concluídas (últimos N meses).
 * Para gráfico de linha ou barra histórico.
 */
export function calcEvolucaoMensal({ manutencoes, meses = 6 }) {
  const hoje   = new Date()
  const resultado = []

  for (let i = meses - 1; i >= 0; i--) {
    const mes    = subMonths(hoje, i)
    const ano    = mes.getFullYear()
    const mesNum = mes.getMonth()

    const doMes = manutencoes.filter(m => {
      const d = parseData(m.data)
      return d && d.getFullYear() === ano && d.getMonth() === mesNum
    })

    resultado.push({
      label:      format(mes, 'MMM yy', { locale: pt }),
      concluidas: doMes.filter(m => m.status === 'concluida' || m.status === 'concluído').length,
      pendentes:  doMes.filter(m => m.status === 'pendente').length,
      agendadas:  doMes.filter(m => m.status === 'agendada').length,
      total:      doMes.length,
    })
  }

  return resultado
}

/**
 * Calcula o MTBF médio da frota (Mean Time Between Failures / periodicidade real).
 * Baseado no intervalo médio entre relatórios de cada máquina.
 */
export function calcMtbfMedio({ maquinas, relatorios }) {
  const intervalos = []

  for (const maq of maquinas) {
    const rels = relatorios
      .filter(r => {
        // relatorios podem ter manutencao_id, não maquina_id directamente
        return r.maquinaId === maq.id || r.maquina_id === maq.id
      })
      .map(r => parseData(r.data_criacao ?? r.dataCriacao))
      .filter(Boolean)
      .sort((a, b) => a - b)

    for (let i = 1; i < rels.length; i++) {
      const diff = differenceInDays(rels[i], rels[i - 1])
      if (diff > 0 && diff < 730) intervalos.push(diff)
    }
  }

  if (intervalos.length === 0) return null
  return Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length)
}
