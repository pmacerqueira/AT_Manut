-- Estado de envio do relatório ao cliente (semáforo verde na lista de executadas).
-- Executar no phpMyAdmin / MySQL na base AT_Manut (uma vez).

ALTER TABLE `relatorios`
  ADD COLUMN `enviado_para_cliente` TEXT NULL DEFAULT NULL
  COMMENT 'JSON: {data, email} — envio ao cliente (não só ao admin)';
-- (sem AFTER — compatível com esquemas antigos sem pecas_usadas)
