-- Plano de peças/consumíveis por máquina (KAESER A–D, Periódica, etc.) — sincronizado na BD
-- Correr uma vez no MySQL (phpMyAdmin) antes de usar o recurso `pecasPlano` na API.

CREATE TABLE IF NOT EXISTS `pecas_plano` (
  `id`             VARCHAR(32)  NOT NULL,
  `maquina_id`     VARCHAR(32)  NOT NULL,
  `tipo_manut`     VARCHAR(20)  NOT NULL DEFAULT 'A',
  `posicao`        VARCHAR(50)   DEFAULT NULL,
  `codigo_artigo`  VARCHAR(120) NOT NULL DEFAULT '',
  `descricao`      TEXT,
  `quantidade`     DECIMAL(12,4) NOT NULL DEFAULT 1,
  `unidade`        VARCHAR(10)  NOT NULL DEFAULT 'PÇ',
  `criado_em`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pecas_maquina` (`maquina_id`),
  KEY `idx_pecas_maquina_tipo` (`maquina_id`, `tipo_manut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
