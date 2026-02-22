-- ============================================================
-- AT_Manut — Schema MySQL + Dados Iniciais
-- ============================================================
-- 1. Cria a base de dados (ajusta o nome conforme o teu cPanel)
-- 2. Corre em phpMyAdmin ou MySQL shell
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ── Tabelas ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(32)  NOT NULL,
  `username`      VARCHAR(50)  NOT NULL,
  `nome`          VARCHAR(100) NOT NULL,
  `role`          ENUM('admin','tecnico') NOT NULL DEFAULT 'tecnico',
  `password_hash` VARCHAR(255) NOT NULL,
  `ativo`         TINYINT(1)   NOT NULL DEFAULT 1,
  `criado_em`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categorias` (
  `id`            VARCHAR(32)  NOT NULL,
  `nome`          VARCHAR(255) NOT NULL,
  `intervalo_tipo` VARCHAR(20)  NOT NULL DEFAULT 'anual',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subcategorias` (
  `id`            VARCHAR(32)  NOT NULL,
  `categoria_id`  VARCHAR(32)  NOT NULL,
  `nome`          VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_categoria` (`categoria_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_items` (
  `id`              VARCHAR(32) NOT NULL,
  `subcategoria_id` VARCHAR(32) NOT NULL,
  `tipo`            ENUM('montagem','periodica') NOT NULL DEFAULT 'periodica',
  `grupo`           VARCHAR(50) DEFAULT NULL,
  `ordem`           INT         NOT NULL DEFAULT 0,
  `texto`           TEXT        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subcategoria` (`subcategoria_id`),
  KEY `idx_subcategoria_tipo` (`subcategoria_id`, `tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `clientes` (
  `id`            VARCHAR(32)  NOT NULL,
  `nif`           VARCHAR(20)  DEFAULT NULL,
  `nome`          VARCHAR(255) NOT NULL,
  `morada`        TEXT         DEFAULT NULL,
  `codigo_postal` VARCHAR(20)  DEFAULT NULL,
  `localidade`    VARCHAR(100) DEFAULT NULL,
  `telefone`      VARCHAR(30)  DEFAULT NULL,
  `email`         VARCHAR(255) DEFAULT NULL,
  `notas`         TEXT         DEFAULT NULL,
  `criado_em`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `maquinas` (
  `id`                        VARCHAR(32)  NOT NULL,
  `cliente_id`                VARCHAR(32)  DEFAULT NULL,
  `cliente_nif`               VARCHAR(20)  DEFAULT NULL,
  `subcategoria_id`           VARCHAR(32)  NOT NULL,
  `marca`                     VARCHAR(100) DEFAULT NULL,
  `modelo`                    VARCHAR(100) DEFAULT NULL,
  `numero_serie`              VARCHAR(100) DEFAULT NULL,
  `ano_fabrico`               INT          DEFAULT NULL,
  `periodicidade`             VARCHAR(20)  NOT NULL DEFAULT 'anual',
  `proxima_manut`             DATE         DEFAULT NULL,
  `numero_documento_venda`    VARCHAR(100) DEFAULT NULL,
  `notas`                     TEXT         DEFAULT NULL,
  `documentos`                MEDIUMTEXT   DEFAULT NULL,
  `ultima_manutencao_data`    DATE         DEFAULT NULL,
  `horas_totais_acumuladas`   INT          DEFAULT NULL,
  `horas_servico_acumuladas`  INT          DEFAULT NULL,
  `criado_em`                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cliente` (`cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manutencoes` (
  `id`          VARCHAR(32)  NOT NULL,
  `maquina_id`  VARCHAR(32)  NOT NULL,
  `tipo`        ENUM('montagem','periodica') NOT NULL DEFAULT 'periodica',
  `data`        DATE         NOT NULL,
  `tecnico`     VARCHAR(100) DEFAULT NULL,
  `status`      ENUM('agendada','pendente','concluida') NOT NULL DEFAULT 'agendada',
  `observacoes` TEXT         DEFAULT NULL,
  `horas_totais`  INT        DEFAULT NULL,
  `horas_servico` INT        DEFAULT NULL,
  `criado_em`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_maquina` (`maquina_id`),
  KEY `idx_status`  (`status`),
  KEY `idx_data`    (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `relatorios` (
  `id`                    VARCHAR(32)  NOT NULL,
  `manutencao_id`         VARCHAR(32)  NOT NULL,
  `numero_relatorio`      VARCHAR(20)  DEFAULT NULL,
  `data_criacao`          DATETIME     DEFAULT NULL,
  `data_assinatura`       DATETIME     DEFAULT NULL,
  `tecnico`               VARCHAR(100) DEFAULT NULL,
  `nome_assinante`        VARCHAR(255) DEFAULT NULL,
  `assinado_pelo_cliente` TINYINT(1)   NOT NULL DEFAULT 0,
  `assinatura_digital`    MEDIUMTEXT   DEFAULT NULL,
  `checklist_respostas`   TEXT         DEFAULT NULL,
  `notas`                 TEXT         DEFAULT NULL,
  `fotos`                 LONGTEXT     DEFAULT NULL,
  `ultimo_envio`          DATETIME     DEFAULT NULL,
  `criado_em`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_manutencao`     (`manutencao_id`),
  UNIQUE KEY `uq_numero_relat`   (`numero_relatorio`),
  KEY `idx_data_assinatura` (`data_assinatura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Utilizadores (hashes bcrypt compatíveis com PHP password_verify) ──────────

INSERT IGNORE INTO `users` (`id`, `username`, `nome`, `role`, `password_hash`) VALUES
('admin',    'Admin',    'Administrador',       'admin',   '$2b$10$YK4siN1Sxh2IiO1HSBqt1u/YhFNcwmjFqXEwMggFdY5l9WgNXgezK'),
('atecnica', 'ATecnica', 'Assistência Técnica', 'tecnico', '$2b$10$0zN/OJa0V13ARPGHl3YDBO/IrAj9Y1awEPmaWQmN8xrKw6JK55kDe');

-- ── Categorias ────────────────────────────────────────────────

INSERT IGNORE INTO `categorias` (`id`, `nome`, `intervalo_tipo`) VALUES
('cat1', 'Elevadores de veículos ligeiros e pesados', 'anual'),
('cat2', 'Compressores', 'trimestral'),
('cat3', 'Geradores', 'semestral'),
('cat4', 'Equipamentos de trabalho em pneus', 'semestral');

-- ── Subcategorias ─────────────────────────────────────────────

INSERT IGNORE INTO `subcategorias` (`id`, `categoria_id`, `nome`) VALUES
('sub1',  'cat1', 'Elevador electromecânico de ligeiros 2 ou 4 colunas'),
('sub2',  'cat1', 'Elevador electro-hidráulico de 2 colunas'),
('sub4',  'cat1', 'Elevador de tesoura'),
('sub12', 'cat1', 'Elevador electro-hidráulico de pesados 4 colunas móveis independentes'),
('sub13', 'cat1', 'Elevador electromecânico de pesados com 4 colunas independentes'),
('sub5',  'cat2', 'Compressor de parafuso'),
('sub14', 'cat2', 'Compressor de parafuso com secador'),
('sub10', 'cat2', 'Compressor portátil diesel/gasolina'),
('sub6',  'cat2', 'Compressor de pistão'),
('sub15', 'cat2', 'Compressor de alta pressão'),
('sub11', 'cat2', 'Blower (soprador)'),
('sub16', 'cat2', 'Secadores (unidade de tratamento de ar comprimido)'),
('sub7',  'cat3', 'Gerador diesel'),
('sub8',  'cat4', 'Equilibrador de pneus'),
('sub9',  'cat4', 'Máquina de trocar pneus');

-- ── Checklist Items ───────────────────────────────────────────

INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `ordem`, `texto`) VALUES
-- sub1: Elevador electromecânico ligeiros
('ch1',  'sub1', 1,  'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)'),
('ch2',  'sub1', 2,  'Manual de instruções em português disponível e legível (DL 103/2008)'),
('ch3',  'sub1', 3,  'Declaração CE de conformidade disponível'),
('ch4',  'sub1', 4,  'Dispositivos de segurança em funcionamento correto (EN 1493:2020)'),
('ch5',  'sub1', 5,  'Condições de montagem e fixação'),
('ch6',  'sub1', 6,  'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)'),
('ch7',  'sub1', 7,  'Redutor, motor e travão: ruídos, vibrações e ferodos'),
('ch8',  'sub1', 8,  'Nível de óleo do redutor e atestar se necessário'),
('ch9',  'sub1', 9,  'Cabos de aço: estado e aderência nas polias (EN 16625:2013)'),
('ch10', 'sub1', 10, 'Polias e roçadeiras em bom estado'),
('ch11', 'sub1', 11, 'Suportes de carga: bloqueio dos braços (máx. 150 mm)'),
('ch12', 'sub1', 12, 'Sistema de fim de curso e limitadores'),
('ch13', 'sub1', 13, 'Bloqueio de segurança para permanecer debaixo do elevador'),
('ch14', 'sub1', 14, 'Estado geral de conservação do equipamento'),
('ch14b','sub1', 15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub2: Elevador electro-hidráulico 2 colunas
('ch21', 'sub2', 1,  'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)'),
('ch22', 'sub2', 2,  'Manual de instruções em português disponível e legível (DL 103/2008)'),
('ch23', 'sub2', 3,  'Declaração CE de conformidade disponível'),
('ch24', 'sub2', 4,  'Dispositivos de segurança em funcionamento correto (EN 1493:2020)'),
('ch25', 'sub2', 5,  'Condições de montagem e fixação'),
('ch26', 'sub2', 6,  'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)'),
('ch27', 'sub2', 7,  'Nível de óleo da central hidráulica'),
('ch28', 'sub2', 8,  'Válvula limitadora de pressão e ausência de fugas'),
('ch29', 'sub2', 9,  'Cilindro(s) hidráulico(s): estanquicidade e funcionamento'),
('ch30', 'sub2', 10, 'Válvulas de segurança e bomba manual de subida'),
('ch31', 'sub2', 11, 'Suportes de carga: bloqueio dos braços (máx. 150 mm)'),
('ch32', 'sub2', 12, 'Sistema de fim de curso e limitadores'),
('ch33', 'sub2', 13, 'Bloqueio de segurança para permanecer debaixo do elevador'),
('ch34', 'sub2', 14, 'Estado geral de conservação do equipamento'),
('ch34c', 'sub2', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch34d', 'sub2', 16, 'Ruídos e vibrações anormais'),
('ch34e', 'sub2', 17, 'Parafusos de ancoragem firmes'),
('ch34f', 'sub2', 18, 'Sinalização e pictogramas de segurança visíveis'),
('ch34g', 'sub2', 19, 'Teste de comando subida e descida'),
('ch34b','sub2', 20, 'Limpeza final do equipamento e teste em funcionamento');

-- sub2: Checklist MONTAGEM (Elevador electro-hidráulico 2 colunas) — EN 1493:2020, DL 50/2005, Dir. 2006/42/CE
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch2m01', 'sub2', 'montagem', 'mecanica', 1,  'Colunas verticais (90°) e paralelas entre si'),
('ch2m02', 'sub2', 'montagem', 'mecanica', 2,  'Base de fixação e ancoragem conforme plano de fundação'),
('ch2m03', 'sub2', 'montagem', 'mecanica', 3,  'Cabos de aço de sincronização conectados e tensionados'),
('ch2m04', 'sub2', 'montagem', 'mecanica', 4,  'Braços de suporte instalados e bloqueio operacional'),
('ch2m05', 'sub2', 'montagem', 'mecanica', 5,  'Placa de passagem e carros de elevação montados'),
('ch2m06', 'sub2', 'montagem', 'electrica', 6,  'Ligação elétrica conforme especificações (400V/50Hz)'),
('ch2m07', 'sub2', 'montagem', 'electrica', 7,  'Aterramento e proteções elétricas instaladas'),
('ch2m08', 'sub2', 'montagem', 'electrica', 8,  'Unidade de controlo e interruptor de limite montados'),
('ch2m09', 'sub2', 'montagem', 'hidraulica', 9,  'Linhas hidráulicas conectadas e sem fugas'),
('ch2m10', 'sub2', 'montagem', 'hidraulica', 10, 'Óleo hidráulico HLP 32 (cerca de 80% do tanque)'),
('ch2m11', 'sub2', 'montagem', 'hidraulica', 11, 'Unidade motora e bomba instaladas'),
('ch2m12', 'sub2', 'montagem', 'seguranca', 12, 'Travas de segurança instaladas e funcionais'),
('ch2m13', 'sub2', 'montagem', 'seguranca', 13, 'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020'),
('ch2m14', 'sub2', 'montagem', 'seguranca', 14, 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)'),
('ch2m15', 'sub2', 'montagem', 'electrica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch2m16', 'sub2', 'montagem', 'seguranca', 16, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch2m17', 'sub2', 'montagem', 'teste', 17, 'Teste de subida e descida em vazio (vários ciclos)'),
('ch2m18', 'sub2', 'montagem', 'teste', 18, 'Verificação de ruído e funcionamento suave (≤70 dB)'),
('ch2m19', 'sub2', 'montagem', 'teste', 19, 'Vias de evacuação e área de circulação livres'),
('ch2m20', 'sub2', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento');

-- sub4: Elevador de tesoura (continuação do INSERT inicial)
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `ordem`, `texto`) VALUES
('ch61', 'sub4', 1,  'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)'),
('ch62', 'sub4', 2,  'Manual de instruções em português disponível e legível (DL 103/2008)'),
('ch63', 'sub4', 3,  'Declaração CE de conformidade disponível'),
('ch64', 'sub4', 4,  'Dispositivos de segurança em funcionamento correto (EN 1493:2020)'),
('ch65', 'sub4', 5,  'Integridade estrutural: trincas ou danos nos componentes'),
('ch66', 'sub4', 6,  'Guarda-corpo e proteções em boas condições'),
('ch67', 'sub4', 7,  'Comandos e botão de emergência: teste de funcionamento'),
('ch68', 'sub4', 8,  'Limitadores de curso operacionais'),
('ch69', 'sub4', 9,  'Piso da plataforma: estabilidade e antiderrapante'),
('ch70', 'sub4', 10, 'Sistema hidráulico: verificar vazamentos de óleo'),
('ch71', 'sub4', 11, 'Cilindros hidráulicos: funcionamento e estanquicidade'),
('ch72', 'sub4', 12, 'Articulações e dobradiças: desgaste e lubrificação'),
('ch73', 'sub4', 13, 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)'),
('ch74', 'sub4', 14, 'Estado geral de conservação do equipamento'),
('ch74c', 'sub4', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch74d', 'sub4', 16, 'Parafusos de expansão e ancoragem firmes'),
('ch74e', 'sub4', 17, 'Sinalização e pictogramas de segurança visíveis'),
('ch74f', 'sub4', 18, 'Teste de comando subida e descida'),
('ch74g', 'sub4', 19, 'Nivelamento das plataformas em altura máxima'),
('ch74b','sub4', 20, 'Limpeza final do equipamento e teste em funcionamento');

-- sub12: Elev. pesados hidráulico 4 colunas (periódica)
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `ordem`, `texto`) VALUES
('ch81', 'sub12',1,  'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)'),
('ch82', 'sub12',2,  'Manual de instruções em português disponível e legível (DL 103/2008)'),
('ch83', 'sub12',3,  'Declaração CE de conformidade disponível'),
('ch84', 'sub12',4,  'Dispositivos de segurança em funcionamento correto (EN 1493:2020)'),
('ch85', 'sub12',5,  'Condições de montagem e fixação'),
('ch86', 'sub12',6,  'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)'),
('ch87', 'sub12',7,  'Nível de óleo da central hidráulica'),
('ch88', 'sub12',8,  'Válvula limitadora de pressão e ausência de fugas'),
('ch89', 'sub12',9,  'Sincronização das 4 colunas móveis independentes'),
('ch90', 'sub12',10, 'Cilindros telescópicos: estanquicidade em cada coluna'),
('ch91', 'sub12',11, 'Válvulas de segurança e bomba manual de subida'),
('ch92', 'sub12',12, 'Suportes de carga e bloqueio dos braços'),
('ch93', 'sub12',13, 'Sistema de fim de curso e limitadores'),
('ch94', 'sub12',14, 'Estado geral de conservação do equipamento'),
('ch94c', 'sub12',15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch94d', 'sub12',16, 'Desgaste da porca principal e cabo de segurança (RAV261)'),
('ch94e', 'sub12',17, 'Sinalização e pictogramas de segurança visíveis'),
('ch94f', 'sub12',18, 'Teste de comando subida e descida'),
('ch94g', 'sub12',19, 'Controlo fim de curso e movimento do carrinho'),
('ch94b','sub12',20, 'Limpeza final do equipamento e teste em funcionamento');

-- sub4: Checklist MONTAGEM (Elevador de tesoura) — EN 1493:2020, DL 50/2005, Dir. 2006/42/CE
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch4m01', 'sub4', 'montagem', 'mecanica', 1,  'Base de cimento/concreto conforme plano (espessura ≥150mm, nivelamento ≤10mm)'),
('ch4m02', 'sub4', 'montagem', 'mecanica', 2,  'Placas de base e ancoragem com parafusos de expansão'),
('ch4m03', 'sub4', 'montagem', 'mecanica', 3,  'Plataformas de elevação (estrutura tesoura) montadas e paralelas entre si'),
('ch4m04', 'sub4', 'montagem', 'mecanica', 4,  'Espaçamento entre plataformas conforme especificação do fabricante'),
('ch4m05', 'sub4', 'montagem', 'mecanica', 5,  'Articulações e pinos da tesoura montados e lubrificados'),
('ch4m06', 'sub4', 'montagem', 'electrica', 6,  'Ligação elétrica conforme especificações (400V/50Hz ou 230V)'),
('ch4m07', 'sub4', 'montagem', 'electrica', 7,  'Aterramento e proteções elétricas instaladas'),
('ch4m08', 'sub4', 'montagem', 'electrica', 8,  'Caixa de comandos, interruptores de fim de curso e limitadores montados'),
('ch4m09', 'sub4', 'montagem', 'hidraulica', 9,  'Mangueiras/tubos hidráulicos conectados e sem fugas'),
('ch4m10', 'sub4', 'montagem', 'hidraulica', 10, 'Óleo hidráulico no reservatório (conforme manual do fabricante)'),
('ch4m11', 'sub4', 'montagem', 'hidraulica', 11, 'Unidade de bomba e cilindros hidráulicos instalados'),
('ch4m12', 'sub4', 'montagem', 'seguranca', 12, 'Trincos de segurança (bloqueio mecânico) instalados e funcionais'),
('ch4m13', 'sub4', 'montagem', 'seguranca', 13, 'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020'),
('ch4m14', 'sub4', 'montagem', 'seguranca', 14, 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)'),
('ch4m15', 'sub4', 'montagem', 'electrica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch4m16', 'sub4', 'montagem', 'seguranca', 16, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch4m17', 'sub4', 'montagem', 'teste', 17, 'Teste de subida e descida em vazio; sincronização das plataformas'),
('ch4m18', 'sub4', 'montagem', 'teste', 18, 'Verificação de ruído e funcionamento suave (≤70 dB)'),
('ch4m19', 'sub4', 'montagem', 'teste', 19, 'Vias de evacuação e área de circulação livres'),
('ch4m20', 'sub4', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento');

-- sub12: Checklist MONTAGEM (Elevador electro-hidráulico pesados 4 colunas móveis independentes)
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch12m01', 'sub12', 'montagem', 'mecanica', 1,  'Pavimento conforme plano (carga ≥5t/m² por coluna, cimento ou betão)'),
('ch12m02', 'sub12', 'montagem', 'mecanica', 2,  'Posicionamento das 4 colunas verticais conforme dimensões do fabricante'),
('ch12m03', 'sub12', 'montagem', 'mecanica', 3,  'Rodas articuladas e base côncava assente no solo em cada coluna'),
('ch12m04', 'sub12', 'montagem', 'mecanica', 4,  'Alinhamento e paralelismo das 4 colunas; espaço ≥2000mm à volta do veículo'),
('ch12m05', 'sub12', 'montagem', 'mecanica', 5,  'Suportes de carga (forklift) instalados em cada coluna e bloqueio operacional'),
('ch12m06', 'sub12', 'montagem', 'electrica', 6,  'Ligação elétrica 400V trifásico 50Hz conforme especificações'),
('ch12m07', 'sub12', 'montagem', 'electrica', 7,  'Cabos entre coluna principal e secundárias conectados conforme diagrama'),
('ch12m08', 'sub12', 'montagem', 'electrica', 8,  'Caixas de controlo principal e secundárias, interruptores de fim de curso e 24V'),
('ch12m09', 'sub12', 'montagem', 'hidraulica', 9,  'Linhas hidráulicas conectadas entre central e cilindros (sem fugas)'),
('ch12m10', 'sub12', 'montagem', 'hidraulica', 10, 'Óleo hidráulico HLP no reservatório (conforme manual do fabricante)'),
('ch12m11', 'sub12', 'montagem', 'hidraulica', 11, 'Unidade de bomba e cilindros telescópicos instalados em cada coluna'),
('ch12m12', 'sub12', 'montagem', 'seguranca', 12, 'Travas de segurança e cabo de segurança instalados e funcionais'),
('ch12m13', 'sub12', 'montagem', 'seguranca', 13, 'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020'),
('ch12m14', 'sub12', 'montagem', 'seguranca', 14, 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)'),
('ch12m15', 'sub12', 'montagem', 'electrica', 15, 'Verificação da tensão de alimentação e sequência de fases (RAV261)'),
('ch12m16', 'sub12', 'montagem', 'seguranca', 16, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch12m17', 'sub12', 'montagem', 'teste', 17, 'Teste de sincronização das 4 colunas em subida e descida'),
('ch12m18', 'sub12', 'montagem', 'teste', 18, 'Verificação de ruído e funcionamento suave'),
('ch12m19', 'sub12', 'montagem', 'teste', 19, 'Comando subida/descida e fim de curso operacionais'),
('ch12m20', 'sub12', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento');

-- sub13: Elev. pesados electromecânico 4 colunas
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `ordem`, `texto`) VALUES
('ch101','sub13',1,  'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)'),
('ch102','sub13',2,  'Manual de instruções em português disponível e legível (DL 103/2008)'),
('ch103','sub13',3,  'Declaração CE de conformidade disponível'),
('ch104','sub13',4,  'Dispositivos de segurança em funcionamento correto (EN 1493:2020)'),
('ch105','sub13',5,  'Condições de montagem e fixação'),
('ch106','sub13',6,  'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)'),
('ch107','sub13',7,  'Redutor, motor e travão: ruídos e vibrações'),
('ch108','sub13',8,  'Sincronização das 4 colunas independentes'),
('ch109','sub13',9,  'Cabos de aço: estado e aderência (EN 16625:2013)'),
('ch110','sub13',10, 'Polias, roçadeiras e guias'),
('ch111','sub13',11, 'Suportes de carga e bloqueio dos braços'),
('ch112','sub13',12, 'Sistema de fim de curso e limitadores'),
('ch113','sub13',13, 'Bloqueio de segurança para permanecer debaixo do elevador'),
('ch114','sub13',14, 'Estado geral de conservação do equipamento'),
('ch114b','sub13',15,'Limpeza final do equipamento e teste em funcionamento'),
-- sub5: Compressor de parafuso
('ch201','sub5', 1,  'Segurança operacional conforme manual de serviço (Dir. 2006/42/CE)'),
('ch202','sub5', 2,  'Marcação CE, manual em português e declaração de conformidade'),
('ch203','sub5', 3,  'Registo de intervenções e manutenção atualizado (DL 50/2005)'),
('ch204','sub5', 4,  'Inspecionar vazamentos de ar ou óleo em conexões e tubulações'),
('ch205','sub5', 5,  'Nível de óleo e drenar condensado dos reservatórios e separadores'),
('ch206','sub5', 6,  'Limpar resfriadores/arrefecedores e filtro de ar'),
('ch207','sub5', 7,  'Verificar correias: tensão e estado (substituir conforme fabricante)'),
('ch208','sub5', 8,  'Verificar transmissão motor-airend, válvulas e regulador proporcional'),
('ch209','sub5', 9,  'Substituir filtro de ar, filtro de óleo e separador ar/óleo conforme especificação'),
('ch210','sub5', 10, 'Trocar óleo lubrificante (conforme manual do fabricante)'),
('ch211','sub5', 11, 'Testar válvula de segurança, pressostato e termostato'),
('ch212','sub5', 12, 'Verificar válvulas de alívio e descarga de pressão'),
('ch213','sub5', 13, 'Verificar cabos elétricos, terminais e relés de sobrecarga'),
('ch214','sub5', 14, 'Monitorar indicadores: pressão de descarga e temperatura de operação'),
('ch215','sub5', 15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub14: Compressor parafuso com secador
('ch301','sub14',1,  'Marcação CE, manual e declaração de conformidade (Dir. 2006/42/CE)'),
('ch302','sub14',2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch303','sub14',3,  'Itens compressor: filtros, óleo, separador ar/óleo'),
('ch304','sub14',4,  'Limpar condensador refrigerante e alhetas de arrefecimento'),
('ch305','sub14',5,  'Verificar ventilador do motor, pás e proteções'),
('ch306','sub14',6,  'Purga de condensados do secador e rede de ar comprimido'),
('ch307','sub14',7,  'Ponto de orvalho e fugas no circuito refrigerante'),
('ch308','sub14',8,  'Verificar pressostato e pressão de corte (alta, baixa)'),
('ch309','sub14',9,  'Trocar elemento(s) dos filtros de linha e tratamento'),
('ch310','sub14',10, 'Temperatura ar comprimido: entrada e saída'),
('ch310b','sub14',11,'Verificar válvula de segurança e dispositivos de proteção'),
('ch310c','sub14',12,'Verificar vazamentos em conexões e tubulações'),
('ch310d','sub14',13,'Estado geral de conservação do equipamento'),
('ch310e','sub14',14,'Teste funcionamento: arranque, vazio, carga, paragem'),
('ch310f','sub14',15,'Limpeza final do equipamento e teste em funcionamento'),
-- sub10: Compressor portátil diesel
('ch251','sub10',1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch252','sub10',2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch253','sub10',3,  'Nível de óleo lubrificante e combustível (qualidade)'),
('ch254','sub10',4,  'Nível do líquido de arrefecimento (radiador com motor frio)'),
('ch255','sub10',5,  'Bateria: carga, polos limpos, voltagem (12,4V–12,7V)'),
('ch256','sub10',6,  'Trocar pré-filtro/filtro de combustível, óleo e filtro motor'),
('ch257','sub10',7,  'Trocar cartucho separador de óleo'),
('ch258','sub10',8,  'Tensão da correia do alternador; lubrificar chassi'),
('ch259','sub10',9,  'Manutenção válvulas e regulador proporcional'),
('ch260','sub10',10, 'Verificar válvula de segurança e dispositivos de proteção'),
('ch261','sub10',11, 'Inspecionar vazamentos de ar, óleo e combustível'),
('ch262','sub10',12, 'Indicadores do painel: pressão, temperatura'),
('ch263','sub10',13, 'Estado geral de conservação do equipamento'),
('ch264','sub10',14, 'Teste: partida, alívio, carga, parada'),
('ch265','sub10',15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub6: Compressor de pistão
('ch351','sub6', 1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch352','sub6', 2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch353','sub6', 3,  'Nível de óleo entre mínimo e máximo; drenar água acumulada'),
('ch354','sub6', 4,  'Limpar parte externa, filtro de ar e aberturas de refrigeração'),
('ch355','sub6', 5,  'Verificar parafusos de fixação e vazamentos de ar ou óleo'),
('ch356','sub6', 6,  'Trocar óleo e limpar trocadores de calor conforme manual'),
('ch357','sub6', 7,  'Limpar válvulas entre cilindro e tampa (conforme especificação)'),
('ch358','sub6', 8,  'Verificar válvula de segurança e dispositivos de proteção'),
('ch359','sub6', 9,  'Testar e calibrar pressostato e manómetro'),
('ch360','sub6', 10, 'Verificar cabos elétricos e relés de sobrecarga'),
('ch361','sub6', 11, 'Monitorar indicadores de pressão e temperatura'),
('ch362','sub6', 12, 'Condições de montagem e fixação'),
('ch363','sub6', 13, 'Estado geral de conservação do equipamento'),
('ch364','sub6', 14, 'Teste: arranque, carga, paragem'),
('ch364b','sub6',15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub15: Compressor alta pressão
('ch401','sub15',1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch402','sub15',2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch403','sub15',3,  'Nível de óleo; drenar condensado dos reservatórios e separadores'),
('ch404','sub15',4,  'Limpar alhetas do pós-refrigerador, arrefecedor de óleo e filtro de ar'),
('ch405','sub15',5,  'Inspecionar vazamentos em conexões e tubulações'),
('ch406','sub15',6,  'Trocar óleo, filtro de ar e separador de óleo conforme especificação'),
('ch407','sub15',7,  'Verificar válvula de segurança e dispositivos de proteção'),
('ch408','sub15',8,  'Verificar manómetros, indicadores e definições de pressão'),
('ch409','sub15',9,  'Aperto de parafusos de fixação'),
('ch410','sub15',10, 'Verificar cabos elétricos e proteções'),
('ch411','sub15',11, 'Monitorar pressão de descarga e temperatura'),
('ch412','sub15',12, 'Condições de montagem e fixação'),
('ch413','sub15',13, 'Estado geral de conservação do equipamento'),
('ch414','sub15',14, 'Teste: arranque, carga, paragem'),
('ch414b','sub15',15,'Limpeza final do equipamento e teste em funcionamento'),
-- sub16: Secadores
('ch451','sub16',1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch452','sub16',2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch453','sub16',3,  'Limpar condensador refrigerante e alhetas'),
('ch454','sub16',4,  'Verificar funcionamento ventilador e grelhas'),
('ch455','sub16',5,  'Drenar condensados do secador e purga'),
('ch456','sub16',6,  'Inspecionar fugas no circuito refrigerante'),
('ch457','sub16',7,  'Trocar elementos dos filtros de linha conforme especificação'),
('ch458','sub16',8,  'Verificar temperatura ar entrada e saída; ponto de orvalho'),
('ch459','sub16',9,  'Verificar pressostato (alta/baixa pressão)'),
('ch460','sub16',10, 'Verificar válvulas de segurança e dispositivos de proteção'),
('ch461','sub16',11, 'Condições de montagem e fixação'),
('ch461b','sub16',12,'Estado geral de conservação do equipamento'),
('ch461c','sub16',13,'Verificar vazamentos em conexões'),
('ch461d','sub16',14,'Teste: arranque, vazio, carga, paragem'),
('ch461e','sub16',15,'Limpeza final do equipamento e teste em funcionamento'),
-- sub11: Blower / Soprador
('ch271','sub11',1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch272','sub11',2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch273','sub11',3,  'Condições de segurança conforme manual de serviço'),
('ch274','sub11',4,  'Proteções e extrator de pó da hélice em bom estado'),
('ch275','sub11',5,  'Verificar mecanismo do bloco, vedação do eixo e manga de proteção'),
('ch276','sub11',6,  'Correias em V e polia: tensão e estado'),
('ch277','sub11',7,  'Nível de óleo; trocar filtro de ar e filtro de óleo conforme especificação'),
('ch278','sub11',8,  'Tubos de drenagem, conexões e compensadores'),
('ch279','sub11',9,  'Válvulas de partida, retenção e alívio de pressão'),
('ch280','sub11',10, 'Cabos elétricos, terminais e relés de sobrecarga'),
('ch281','sub11',11, 'Indicadores e consumo de energia'),
('ch282','sub11',12, 'Limpar superfícies da unidade e do motor'),
('ch283','sub11',13, 'Estado geral de conservação do equipamento'),
('ch284','sub11',14, 'Teste: partida, carregamento, parada'),
('ch285','sub11',15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub7: Gerador diesel
('ch701','sub7', 1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch702','sub7', 2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch703','sub7', 3,  'Nível de óleo lubrificante (vareta de medição)'),
('ch704','sub7', 4,  'Nível de combustível e qualidade do diesel'),
('ch705','sub7', 5,  'Nível do líquido de arrefecimento (radiador com motor frio)'),
('ch706','sub7', 6,  'Bateria: carga, polos limpos, voltagem (12,4V–12,7V)'),
('ch707','sub7', 7,  'Inspecionar vazamentos de óleo, diesel e líquido de arrefecimento'),
('ch708','sub7', 8,  'Filtro de ar e filtro de combustível'),
('ch709','sub7', 9,  'Correias, mangueiras e abraçadeiras do sistema de arrefecimento'),
('ch710','sub7', 10, 'Ventilador e colmeia do radiador'),
('ch711','sub7', 11, 'Sistema elétrico: terminais e proteções'),
('ch712','sub7', 12, 'Indicadores do painel: temperatura, pressão óleo, tensão'),
('ch713','sub7', 13, 'Condições de montagem, fixação e ventilação'),
('ch714','sub7', 14, 'Estado geral de conservação do equipamento'),
('ch715','sub7', 15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub8: Equilibrador de pneus
('ch801','sub8', 1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch802','sub8', 2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch803','sub8', 3,  'Proteções e dispositivos de segurança em funcionamento'),
('ch804','sub8', 4,  'Condições de montagem e fixação à bancada'),
('ch805','sub8', 5,  'Eixo e cone de fixação: estado e folgas'),
('ch806','sub8', 6,  'Cabos elétricos e proteções'),
('ch807','sub8', 7,  'Lubrificação de eixos e rolamentos'),
('ch808','sub8', 8,  'Tampa de proteção do eixo e sensores'),
('ch809','sub8', 9,  'Calibração e precisão da medição de desequilíbrio'),
('ch810','sub8', 10, 'Comandos e botão de emergência'),
('ch811','sub8', 11, 'Display e indicadores em funcionamento'),
('ch812','sub8', 12, 'Vibrações anormais e ruídos'),
('ch813','sub8', 13, 'Estado geral de conservação do equipamento'),
('ch814','sub8', 14, 'Teste de equilíbrio com roda de referência'),
('ch815','sub8', 15, 'Limpeza final do equipamento e teste em funcionamento'),
-- sub9: Máquina de trocar pneus
('ch901','sub9', 1,  'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)'),
('ch902','sub9', 2,  'Registo de manutenção atualizado (DL 50/2005)'),
('ch903','sub9', 3,  'Proteções e dispositivos de segurança em funcionamento'),
('ch904','sub9', 4,  'Condições de montagem e fixação'),
('ch905','sub9', 5,  'Braços de trabalho: folgas, lubrificação e estado'),
('ch906','sub9', 6,  'Desmontador de pneus: bordas e ferramentas em bom estado'),
('ch907','sub9', 7,  'Sistema pneumático: pressão, fugas e válvulas'),
('ch908','sub9', 8,  'Cabos elétricos e proteções do motor'),
('ch909','sub9', 9,  'Pedal ou comando de controlo de segurança'),
('ch910','sub9', 10, 'Comandos e botão de emergência'),
('ch911','sub9', 11, 'Mesa rotativa: funcionamento e travão'),
('ch912','sub9', 12, 'Parafusos de fixação e articulações'),
('ch913','sub9', 13, 'Estado geral de conservação do equipamento'),
('ch914','sub9', 14, 'Teste de desmontagem/montagem com pneu e jante'),
('ch915','sub9', 15, 'Limpeza final do equipamento e teste em funcionamento');

SET FOREIGN_KEY_CHECKS = 1;

-- ── Notas de configuração ─────────────────────────────────────
-- Após correr este script:
-- 1. Edita api/config.php com as credenciais da base de dados
-- 2. Credenciais de login: Admin/admin123%  |  ATecnica/tecnica123%
-- 3. Recomendado: SET GLOBAL max_allowed_packet = 67108864; (64 MB para fotos)
