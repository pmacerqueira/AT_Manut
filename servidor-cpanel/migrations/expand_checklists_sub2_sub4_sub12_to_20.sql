-- Migração: Expandir checklists sub2, sub4, sub12 de 15 para 20 itens
-- Base: Manual RAV261 (Ravaglioli), EN 1493:2020, boas práticas do sector
-- Mantém IDs existentes para compatibilidade com relatórios

-- ========== SUB2: Elevador electro-hidráulico 2 colunas ==========

-- MONTAGEM: adicionar itens 16-19; ch2m15 passa a ordem 20
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch2m16', 'sub2', 'montagem', 'electrica', 16, 'Verificação da sequência de fases e indicador de fase'),
('ch2m17', 'sub2', 'montagem', 'seguranca', 17, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch2m18', 'sub2', 'montagem', 'teste', 18, 'Teste de subida e descida em vazio (vários ciclos)'),
('ch2m19', 'sub2', 'montagem', 'teste', 19, 'Verificação de ruído e funcionamento suave (≤70 dB)')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch2m15' AND `subcategoria_id` = 'sub2';

-- PERIÓDICA: adicionar itens 16-19; ch34b passa a ordem 20
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch35', 'sub2', 'periodica', 'electrica', 16, 'Sequência de fases e indicador; cabos e terminais em bom estado'),
('ch36', 'sub2', 'periodica', 'seguranca', 17, 'Botão de emergência e paragem de emergência: teste de funcionamento'),
('ch37', 'sub2', 'periodica', 'geral', 18, 'Iluminação adequada da zona de trabalho e sinalização visível'),
('ch38', 'sub2', 'periodica', 'geral', 19, 'Nível de ruído em funcionamento (≤70 dB)')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch34b' AND `subcategoria_id` = 'sub2';

-- ========== SUB4: Elevador de tesoura ==========

-- MONTAGEM: adicionar itens 16-19; ch4m15 passa a ordem 20
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch4m16', 'sub4', 'montagem', 'electrica', 16, 'Verificação da sequência de fases e indicador de fase'),
('ch4m17', 'sub4', 'montagem', 'seguranca', 17, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch4m18', 'sub4', 'montagem', 'teste', 18, 'Teste de subida e descida em vazio; sincronização das plataformas'),
('ch4m19', 'sub4', 'montagem', 'teste', 19, 'Verificação de ruído e funcionamento suave (≤70 dB)')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch4m15' AND `subcategoria_id` = 'sub4';

-- PERIÓDICA: adicionar itens 16-19; ch74b passa a ordem 20
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch75', 'sub4', 'periodica', 'electrica', 16, 'Sequência de fases; cabos e terminais em bom estado'),
('ch76', 'sub4', 'periodica', 'seguranca', 17, 'Botão de emergência: teste de funcionamento'),
('ch77', 'sub4', 'periodica', 'geral', 18, 'Iluminação adequada e sinalização de aviso visível'),
('ch78', 'sub4', 'periodica', 'geral', 19, 'Nível de ruído em funcionamento (≤70 dB)')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch74b' AND `subcategoria_id` = 'sub4';

-- ========== SUB12: Elevador 4 colunas móveis independentes (Manual RAV261) ==========

-- MONTAGEM: adicionar itens 16-19; ch12m15 passa a ordem 20
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch12m16', 'sub12', 'montagem', 'electrica', 16, 'Verificação da sequência de fases e indicador de fase'),
('ch12m17', 'sub12', 'montagem', 'seguranca', 17, 'Sinalização de aviso, pictogramas e placa de capacidade visíveis'),
('ch12m18', 'sub12', 'montagem', 'teste', 18, 'Teste de sincronização das 4 colunas em modo individual e conjunto'),
('ch12m19', 'sub12', 'montagem', 'teste', 19, 'Verificação de ruído (≤70 dB) e funcionamento suave')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch12m15' AND `subcategoria_id` = 'sub12';

-- PERIÓDICA: adicionar itens 16-19 (Manual RAV261); ch94b passa a ordem 20
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch95', 'sub12', 'periodica', 'electrica', 16, 'Sequência de fases; cabos entre colunas e terminais em bom estado'),
('ch96', 'sub12', 'periodica', 'seguranca', 17, 'Botão de emergência e paragem de emergência: teste em cada coluna'),
('ch97', 'sub12', 'periodica', 'geral', 18, 'Iluminação adequada e sinalização de aviso visível'),
('ch98', 'sub12', 'periodica', 'geral', 19, 'Nível de ruído em funcionamento (≤70 dB)')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch94b' AND `subcategoria_id` = 'sub12';
