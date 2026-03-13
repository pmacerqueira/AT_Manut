-- Adicionar coluna checklist_snapshot às tabelas de relatórios.
-- Guarda um snapshot JSON da checklist no momento da execução, tornando
-- cada relatório auto-contido e imune a edições futuras da checklist.
-- Relatórios antigos (sem snapshot) continuam a usar a checklist live como fallback.

ALTER TABLE `relatorios`
  ADD COLUMN `checklist_snapshot` TEXT DEFAULT NULL
  AFTER `checklist_respostas`;

ALTER TABLE `relatorios_reparacao`
  ADD COLUMN `checklist_snapshot` TEXT DEFAULT NULL
  AFTER `checklist_respostas`;
