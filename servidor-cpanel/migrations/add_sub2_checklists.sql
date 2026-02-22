-- Migração: Checklists completas para sub2 (Elevador electro-hidráulico 2 colunas)
-- Base: Manual Twin Busch TW 242 PE, EN 1493:2020, DL 50/2005, DL 103/2008, Dir. 2006/42/CE
-- Executar no MySQL/cPanel após add_tipo_checklist.sql

-- 1. Adicionar coluna grupo (para agrupamento visual)
ALTER TABLE `checklist_items` ADD COLUMN `grupo` VARCHAR(50) DEFAULT NULL AFTER `tipo`;

-- 2. CHECKLIST MONTAGEM — sub2
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
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
('ch2m20', 'sub2', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);

-- 3. Atualizar checklist PERIÓDICA sub2 com grupos (manter IDs para compatibilidade)
UPDATE `checklist_items` SET `grupo` = 'documentacao' WHERE `id` IN ('ch21','ch22','ch23','ch26') AND `subcategoria_id` = 'sub2';
UPDATE `checklist_items` SET `grupo` = 'mecanica' WHERE `id` IN ('ch25','ch31','ch32','ch34') AND `subcategoria_id` = 'sub2';
UPDATE `checklist_items` SET `grupo` = 'hidraulica' WHERE `id` IN ('ch27','ch28','ch29','ch30') AND `subcategoria_id` = 'sub2';
UPDATE `checklist_items` SET `grupo` = 'seguranca' WHERE `id` IN ('ch24','ch33') AND `subcategoria_id` = 'sub2';
UPDATE `checklist_items` SET `grupo` = 'teste' WHERE `id` = 'ch34b' AND `subcategoria_id` = 'sub2';
