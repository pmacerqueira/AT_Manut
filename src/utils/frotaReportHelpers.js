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
  return m ? m[1] : (s.length >= 10 ? s.slice(0, 10) : s)
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
