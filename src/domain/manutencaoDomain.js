/**
 * manutencaoDomain — regras puras sobre linhas de manutenção na agenda.
 */
import { normEntityId } from '../utils/frotaReportHelpers.js'

const sameMaquinaId = (a, b) => normEntityId(a) === normEntityId(b)

/**
 * IDs a remover ao eliminar uma manutenção (inclui periódicas futuras se a alvo for concluída).
 * @returns {{ idsRemover: Set<string>, alvo: object|null, cascadeFuturas: boolean }}
 */
export function resolverIdsRemoverAoEliminarConcluida(prev, id) {
  const alvo = prev.find(m => m.id === id) ?? null
  const idsRemover = new Set([id])
  if (!alvo) return { idsRemover, alvo: null, cascadeFuturas: false }

  let cascadeFuturas = false
  if (alvo.status === 'concluida' && alvo.maquinaId) {
    prev.forEach(m => {
      if (m.id === id) return
      if (!sameMaquinaId(m.maquinaId, alvo.maquinaId)) return
      if (m.status !== 'pendente' && m.status !== 'agendada') return
      if (m.data > alvo.data) idsRemover.add(m.id)
    })
    cascadeFuturas = idsRemover.size > 1
  }

  return { idsRemover, alvo, cascadeFuturas }
}
