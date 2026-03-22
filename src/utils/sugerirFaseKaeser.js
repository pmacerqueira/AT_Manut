/**
 * Motor de sugestão de fase KAESER: combina janela anual (dias) e Δh desde a última referência.
 * Não altera estado; puro para testes e UI.
 */
import { differenceInCalendarDays } from 'date-fns'
import {
  SEQUENCIA_KAESER,
  KAESER_INTERVALO_HORAS_REF,
  KAESER_ANUAL_MIN_DIAS,
  tipoKaeserNaPosicao,
  tipoKaeserSugeridoPorHorasServico,
} from '../constants/kaeserCiclo.js'
import { horasContadorNaFicha } from './horasContadorEquipamento.js'

/** Valores persistíveis em `sugestaoFaseMotivo` no relatório. */
export const SUGESTAO_FASE_MOTIVOS = ['anual', 'horas', 'ambos', 'manual', 'fallback']

function parseYmdLocal(ymd) {
  if (!ymd || typeof ymd !== 'string') return null
  const d = new Date(`${ymd.trim().slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Tipo sugerido por Δh: avança `floor(deltaH / intervaloH)` posições no ciclo a partir de `posicaoKaeser`
 * (ou 0 se desconhecida). Só aplica quando deltaH >= intervaloH.
 *
 * @param {number} deltaH — horas de serviço desde a última referência
 * @param {number|null|undefined} posicaoKaeser — índice 0..11 na ficha
 * @returns {string|null} letra A/B/C/D ou null se Δh insuficiente
 */
export function tipoKaeserSugeridoPorDeltaHoras(deltaH, posicaoKaeser) {
  if (deltaH == null || !Number.isFinite(Number(deltaH))) return null
  const d = Math.max(0, Number(deltaH))
  if (d < KAESER_INTERVALO_HORAS_REF) return null
  const steps = Math.floor(d / KAESER_INTERVALO_HORAS_REF)
  const ref = ((posicaoKaeser ?? 0) % SEQUENCIA_KAESER.length + SEQUENCIA_KAESER.length) % SEQUENCIA_KAESER.length
  const idx = (ref + steps) % SEQUENCIA_KAESER.length
  return SEQUENCIA_KAESER[idx] || null
}

/**
 * @param {object} params
 * @param {object|null} params.maquina — ficha (ultimaManutencaoData, horasServicoAcumuladas, posicaoKaeser)
 * @param {number|string} params.horasServicoAtuais — leitura actual
 * @param {string} params.dataExecucao — yyyy-MM-dd (hoje ou data histórica)
 * @param {string|null} [params.fallbackUltimaData] — se `ultimaManutencaoData` vazia (ex.: 1.ª manutenção concluída)
 */
export function sugerirFaseKaeser({ maquina, horasServicoAtuais, dataExecucao, fallbackUltimaData = null }) {
  const dataUltimaReferencia = (maquina?.ultimaManutencaoData || fallbackUltimaData || '').trim() || null
  const dExec = parseYmdLocal(dataExecucao)
  const dUlt = parseYmdLocal(dataUltimaReferencia)
  const diasDesdeUltima =
    dExec && dUlt != null ? differenceInCalendarDays(dExec, dUlt) : null

  const horasUltima = horasContadorNaFicha(maquina)
  const horasAtuais = Number(horasServicoAtuais)
  const horasAtuaisOk = Number.isFinite(horasAtuais) && horasAtuais >= 0

  const deltaH =
    horasUltima != null && Number.isFinite(horasUltima) && horasAtuaisOk
      ? Math.max(0, horasAtuais - horasUltima)
      : null

  const disparouAnual = diasDesdeUltima != null && diasDesdeUltima >= KAESER_ANUAL_MIN_DIAS
  const disparouHoras = deltaH != null && deltaH >= KAESER_INTERVALO_HORAS_REF

  const posOk = maquina?.posicaoKaeser != null && maquina.posicaoKaeser !== ''
  const tipoSugeridoCalendario = posOk ? tipoKaeserNaPosicao(maquina.posicaoKaeser) : null

  const tipoSugeridoHoras = disparouHoras
    ? tipoKaeserSugeridoPorDeltaHoras(deltaH, maquina?.posicaoKaeser)
    : null

  const mostrarDual =
    !!tipoSugeridoCalendario &&
    !!tipoSugeridoHoras &&
    tipoSugeridoCalendario !== tipoSugeridoHoras &&
    disparouAnual &&
    disparouHoras

  let motivoPrincipal = 'fallback'
  if (mostrarDual) {
    motivoPrincipal = 'ambos'
  } else if (disparouAnual && (tipoSugeridoCalendario || horasAtuaisOk)) {
    motivoPrincipal = 'anual'
  } else if (disparouHoras && tipoSugeridoHoras) {
    motivoPrincipal = 'horas'
  }

  /** Pré-selecção: dual → calendário primeiro; só horas → horas; só anual → calendário; senão absoluto. */
  let tipoPreSelecao = horasAtuaisOk ? tipoKaeserSugeridoPorHorasServico(horasAtuais) : 'A'
  if (mostrarDual && tipoSugeridoCalendario && tipoSugeridoHoras) {
    tipoPreSelecao = tipoSugeridoCalendario
  } else if (motivoPrincipal === 'horas' && tipoSugeridoHoras) {
    tipoPreSelecao = tipoSugeridoHoras
  } else if (motivoPrincipal === 'anual' && tipoSugeridoCalendario) {
    tipoPreSelecao = tipoSugeridoCalendario
  } else if (tipoSugeridoCalendario && !tipoSugeridoHoras) {
    tipoPreSelecao = tipoSugeridoCalendario
  } else if (tipoSugeridoHoras) {
    tipoPreSelecao = tipoSugeridoHoras
  }

  return {
    tipoSugeridoCalendario,
    tipoSugeridoHoras,
    motivoPrincipal,
    mostrarDual,
    tipoPreSelecao,
    detalhes: {
      diasDesdeUltima,
      deltaH,
      horasUltima,
      horasAtuais: horasAtuaisOk ? horasAtuais : null,
      dataUltimaReferencia,
      disparouAnual,
      disparouHoras,
      posicaoKaeser: maquina?.posicaoKaeser ?? null,
    },
  }
}
