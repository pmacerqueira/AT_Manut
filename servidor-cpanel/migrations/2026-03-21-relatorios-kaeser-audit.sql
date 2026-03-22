-- AT_Manut — auditoria sugestão fase KAESER nos relatórios de manutenção
-- Executar no MySQL (phpMyAdmin / CLI) na base do AT_Manut, antes de usar a app com a nova versão.

ALTER TABLE relatorios
  ADD COLUMN tipo_manut_kaeser_sugerido VARCHAR(4) NULL DEFAULT NULL COMMENT 'Tipo A/B/C/D sugerido pela app' AFTER tipo_manut_kaeser,
  ADD COLUMN sugestao_fase_motivo VARCHAR(16) NULL DEFAULT NULL COMMENT 'anual|horas|ambos|manual|fallback' AFTER tipo_manut_kaeser_sugerido;
