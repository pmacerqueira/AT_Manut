-- Migração: adicionar coluna tipo aos checklist_items
-- Permite checklists diferentes para Montagem vs Manutenção Periódica
-- Executar no MySQL/cPanel: ALTER TABLE checklist_items ADD COLUMN ...

ALTER TABLE `checklist_items` 
ADD COLUMN `tipo` ENUM('montagem','periodica') NOT NULL DEFAULT 'periodica' 
AFTER `subcategoria_id`;

-- Índice para filtrar por subcategoria + tipo
CREATE INDEX `idx_subcategoria_tipo` ON `checklist_items` (`subcategoria_id`, `tipo`);
