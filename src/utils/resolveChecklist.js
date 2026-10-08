/**
 * Devolve a checklist a usar na visualização/exportação de um relatório.
 *
 * - Se o relatório contém `checklistSnapshot` (array legado ou `{ itens, emissao }`),
 *   usa esses itens — o relatório fica imune a edições futuras da checklist.
 * - Caso contrário, faz fallback para a checklist live.
 */
import { itensDoSnapshot } from '../domain/relatorioElevadorPreventivo.js'

export function resolveChecklist(relatorio, liveItems = []) {
  const snap = itensDoSnapshot(relatorio?.checklistSnapshot)
  if (snap.length > 0) return snap
  return liveItems
}
