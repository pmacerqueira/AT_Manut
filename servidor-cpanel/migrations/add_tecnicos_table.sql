-- Migration: criar tabela tecnicos (ficha de dados com assinatura digitalizada)
-- Executar em phpMyAdmin ou via CLI no cPanel

CREATE TABLE IF NOT EXISTS `tecnicos` (
  `id`                  VARCHAR(32)  NOT NULL,
  `nome`                VARCHAR(100) NOT NULL,
  `telefone`            VARCHAR(30)  DEFAULT NULL,
  `assinatura_digital`  LONGTEXT     DEFAULT NULL,
  `ativo`               TINYINT(1)   NOT NULL DEFAULT 1,
  `criado_em`           DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: técnicos actuais + Admin (sem assinatura — será preenchida pelo Admin na app)
INSERT IGNORE INTO `tecnicos` (`id`, `nome`, `telefone`, `ativo`) VALUES
  ('tec-admin',   'Admin',           NULL, 1),
  ('tec-aurelio', 'Aurélio Almeida', NULL, 1),
  ('tec-paulo',   'Paulo Medeiros',  NULL, 1),
  ('tec-aldevino','Aldevino Costa',  NULL, 1);
