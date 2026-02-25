-- ============================================================
-- AT_Manut v1.9.0 — Migração: Módulo Reparações
-- ============================================================
-- Adiciona as tabelas reparacoes e relatorios_reparacao.
-- As tabelas existentes NÃO são afectadas.
--
-- Como usar:
--   1. cPanel → phpMyAdmin → seleccionar a base de dados da app
--   2. Separador "SQL"
--   3. Colar este conteúdo e clicar "Executar"
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Tabela: reparacoes ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `reparacoes` (
  `id`               VARCHAR(32)  NOT NULL,
  `maquina_id`       VARCHAR(32)  DEFAULT NULL,
  `data`             DATE         NOT NULL,
  `tecnico`          VARCHAR(100) DEFAULT NULL,
  `status`           ENUM('pendente','em_progresso','concluida') NOT NULL DEFAULT 'pendente',
  `numero_aviso`     VARCHAR(100) DEFAULT NULL,
  `descricao_avaria` TEXT         DEFAULT NULL,
  `observacoes`      TEXT         DEFAULT NULL,
  `origem`           ENUM('manual','istobal_email') NOT NULL DEFAULT 'manual',
  `criado_em`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_maquina` (`maquina_id`),
  KEY `idx_status`  (`status`),
  KEY `idx_data`    (`data`),
  KEY `idx_origem`  (`origem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabela: relatorios_reparacao ──────────────────────────────

CREATE TABLE IF NOT EXISTS `relatorios_reparacao` (
  `id`                    VARCHAR(32)  NOT NULL,
  `reparacao_id`          VARCHAR(32)  NOT NULL,
  `numero_relatorio`      VARCHAR(20)  DEFAULT NULL,
  `data_criacao`          DATETIME     DEFAULT NULL,
  `data_assinatura`       DATETIME     DEFAULT NULL,
  `tecnico`               VARCHAR(100) DEFAULT NULL,
  `nome_assinante`        VARCHAR(255) DEFAULT NULL,
  `assinado_pelo_cliente` TINYINT(1)   NOT NULL DEFAULT 0,
  `assinatura_digital`    MEDIUMTEXT   DEFAULT NULL,
  `numero_aviso`          VARCHAR(100) DEFAULT NULL,
  `descricao_avaria`      TEXT         DEFAULT NULL,
  `trabalho_realizado`    TEXT         DEFAULT NULL,
  `horas_mao_obra`        DECIMAL(5,2) DEFAULT NULL,
  `checklist_respostas`   TEXT         DEFAULT NULL,
  `pecas_usadas`          TEXT         DEFAULT NULL,
  `fotos`                 LONGTEXT     DEFAULT NULL,
  `notas`                 TEXT         DEFAULT NULL,
  `ultimo_envio`          DATETIME     DEFAULT NULL,
  `criado_em`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reparacao`    (`reparacao_id`),
  UNIQUE KEY `uq_numero_relat` (`numero_relatorio`),
  KEY `idx_data_assinatura`    (`data_assinatura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Verificação ───────────────────────────────────────────────
-- Após executar, deverá mostrar as 2 tabelas criadas:
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('reparacoes','relatorios_reparacao');
