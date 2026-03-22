/** Estados que contam para «próxima» na agenda (lista Manutenções → próximas). */
export const STATUS_MANUTENCAO_ABERTA = new Set(['pendente', 'agendada', 'em_progresso'])

const STATUS_PROXIMA = STATUS_MANUTENCAO_ABERTA

/** IDs vindos da API podem ser number ou string — comparação estrita falhava e deixava proximaManut vazio. */
function nid(v) {
  if (v == null || v === '') return ''
  return String(v)
}

/**
 * Menor data `YYYY-MM-DD` entre manutenções ainda não concluídas para a máquina.
 * Alinha ficha de cliente e campo `maquinas.proximaManut` com a lista «próximas».
 */
export function minDataManutencaoAberta(maquinaId, listaManutencoes) {
  if (!maquinaId || !Array.isArray(listaManutencoes)) return null
  const mid = nid(maquinaId)
  let min = null
  for (const m of listaManutencoes) {
    if (nid(m.maquinaId) !== mid) continue
    if (!STATUS_PROXIMA.has(m.status)) continue
    const d = m.data
    if (d == null || d === '') continue
    if (min == null || d < min) min = d
  }
  return min
}

/**
 * Manutenções abertas da máquina, ordenadas por data asc e id (determinístico).
 * Usado para escolher qual intervenção executar quando o modal abre só com `maquina`.
 */
export function listManutencoesAbertasOrdenadas(maquinaId, listaManutencoes) {
  if (!maquinaId || !Array.isArray(listaManutencoes)) return []
  const mid = nid(maquinaId)
  return listaManutencoes
    .filter(m => nid(m.maquinaId) === mid && STATUS_PROXIMA.has(m.status))
    .filter(m => m.data != null && m.data !== '')
    .sort((a, b) => {
      const c = String(a.data).localeCompare(String(b.data))
      if (c !== 0) return c
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
}

/** Candidatos com a mesma data mínima (primeira janela da agenda para a máquina). */
export function candidatosMesmaDataMinimaAberta(maquinaId, listaManutencoes) {
  const ordenadas = listManutencoesAbertasOrdenadas(maquinaId, listaManutencoes)
  if (ordenadas.length === 0) return []
  const minD = ordenadas[0].data
  return ordenadas.filter(m => m.data === minD)
}
