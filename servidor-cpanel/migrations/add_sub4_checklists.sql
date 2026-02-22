-- Migração: Checklists completas para sub4 (Elevador de tesoura)
-- Base: Manual Twin Busch TW S3-18U, Manual Maqser REF 9810, EN 1493:2020, DL 50/2005, DL 103/2008, Dir. 2006/42/CE
-- Executar no MySQL/cPanel após add_tipo_checklist.sql (se grupo ainda não existir)

-- 1. Garantir coluna grupo (se não existir)
-- ALTER TABLE `checklist_items` ADD COLUMN IF NOT EXISTS `grupo` VARCHAR(50) DEFAULT NULL AFTER `tipo`;

-- 2. CHECKLIST MONTAGEM — sub4 (Elevador de tesoura electro-hidráulico)
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
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
('ch4m20', 'sub4', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);

-- 3. Atualizar checklist PERIÓDICA sub4 com grupos (manter IDs para compatibilidade)
UPDATE `checklist_items` SET `grupo` = 'documentacao' WHERE `id` IN ('ch61','ch62','ch63','ch73') AND `subcategoria_id` = 'sub4';
UPDATE `checklist_items` SET `grupo` = 'seguranca' WHERE `id` IN ('ch64','ch66','ch67','ch68') AND `subcategoria_id` = 'sub4';
UPDATE `checklist_items` SET `grupo` = 'mecanica' WHERE `id` IN ('ch65','ch69','ch72') AND `subcategoria_id` = 'sub4';
UPDATE `checklist_items` SET `grupo` = 'hidraulica' WHERE `id` IN ('ch70','ch71') AND `subcategoria_id` = 'sub4';
UPDATE `checklist_items` SET `grupo` = 'teste' WHERE `id` = 'ch74b' AND `subcategoria_id` = 'sub4';
UPDATE `checklist_items` SET `grupo` = 'geral' WHERE `id` = 'ch74' AND `subcategoria_id` = 'sub4';
