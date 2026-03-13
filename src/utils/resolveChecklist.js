/**
 * Devolve a checklist a usar na visualização/exportação de um relatório.
 *
 * - Se o relatório contém `checklistSnapshot` (criado após o deploy do
 *   versionamento), usa-o — garantindo que o relatório é auto-contido
 *   e imune a edições futuras da checklist.
 * - Caso contrário (relatórios antigos), faz fallback para a checklist
 *   live passada como segundo argumento.
 */
export function resolveChecklist(relatorio, liveItems = []) {
  const snap = relatorio?.checklistSnapshot
  if (Array.isArray(snap) && snap.length > 0) return snap
  return liveItems
}
