-- AT_Manut: texto opcional da declaração de aceitação por categoria de equipamento
-- Executar uma vez na BD existente (phpMyAdmin / mysql CLI).

ALTER TABLE `categorias`
  ADD COLUMN `declaracao_cliente_depois` TEXT DEFAULT NULL
  COMMENT 'Opcional: sufixo da declaração após «na {serviço} »; vazio = texto canónico da app'
  AFTER `intervalo_tipo`;
