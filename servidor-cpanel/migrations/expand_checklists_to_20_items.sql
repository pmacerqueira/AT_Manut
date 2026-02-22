-- Migração: Expandir checklists sub2, sub4, sub12 para 20 itens (montagem + periódica)
-- Base: Manual RAV261, EN 1493:2020, DL 50/2005, DL 103/2008, Dir. 2006/42/CE
-- Executar após add_sub2_checklists, add_sub4_checklists, add_sub12_checklists

-- sub2: Novos itens periódica (ch34c-ch34g)
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `ordem`, `texto`) VALUES
('ch34c', 'sub2', 'periodica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch34d', 'sub2', 'periodica', 16, 'Ruídos e vibrações anormais'),
('ch34e', 'sub2', 'periodica', 17, 'Parafusos de ancoragem firmes'),
('ch34f', 'sub2', 'periodica', 18, 'Sinalização e pictogramas de segurança visíveis'),
('ch34g', 'sub2', 'periodica', 19, 'Teste de comando subida e descida');
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch34b' AND `subcategoria_id` = 'sub2';

-- sub2: Novos itens montagem (ch2m15-ch2m20)
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch2m15', 'sub2', 'montagem', 'electrica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch2m16', 'sub2', 'montagem', 'seguranca', 16, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch2m17', 'sub2', 'montagem', 'teste', 17, 'Teste de subida e descida em vazio (vários ciclos)'),
('ch2m18', 'sub2', 'montagem', 'teste', 18, 'Verificação de ruído e funcionamento suave (≤70 dB)'),
('ch2m19', 'sub2', 'montagem', 'teste', 19, 'Vias de evacuação e área de circulação livres'),
('ch2m20', 'sub2', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);

-- sub4: Novos itens periódica (ch74c-ch74g)
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `ordem`, `texto`) VALUES
('ch74c', 'sub4', 'periodica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch74d', 'sub4', 'periodica', 16, 'Parafusos de expansão e ancoragem firmes'),
('ch74e', 'sub4', 'periodica', 17, 'Sinalização e pictogramas de segurança visíveis'),
('ch74f', 'sub4', 'periodica', 18, 'Teste de comando subida e descida'),
('ch74g', 'sub4', 'periodica', 19, 'Nivelamento das plataformas em altura máxima');
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch74b' AND `subcategoria_id` = 'sub4';

-- sub4: Novos itens montagem (ch4m15-ch4m20)
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch4m15', 'sub4', 'montagem', 'electrica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch4m16', 'sub4', 'montagem', 'seguranca', 16, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch4m17', 'sub4', 'montagem', 'teste', 17, 'Teste de subida e descida em vazio; sincronização das plataformas'),
('ch4m18', 'sub4', 'montagem', 'teste', 18, 'Verificação de ruído e funcionamento suave (≤70 dB)'),
('ch4m19', 'sub4', 'montagem', 'teste', 19, 'Vias de evacuação e área de circulação livres'),
('ch4m20', 'sub4', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);

-- sub12: Novos itens periódica (ch94c-ch94g)
INSERT IGNORE INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `ordem`, `texto`) VALUES
('ch94c', 'sub12', 'periodica', 15, 'Verificação da tensão de alimentação e sequência de fases'),
('ch94d', 'sub12', 'periodica', 16, 'Desgaste da porca principal e cabo de segurança (RAV261)'),
('ch94e', 'sub12', 'periodica', 17, 'Sinalização e pictogramas de segurança visíveis'),
('ch94f', 'sub12', 'periodica', 18, 'Teste de comando subida e descida'),
('ch94g', 'sub12', 'periodica', 19, 'Controlo fim de curso e movimento do carrinho');
UPDATE `checklist_items` SET `ordem` = 20 WHERE `id` = 'ch94b' AND `subcategoria_id` = 'sub12';

-- sub12: Novos itens montagem (ch12m15-ch12m20)
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
('ch12m15', 'sub12', 'montagem', 'electrica', 15, 'Verificação da tensão de alimentação e sequência de fases (RAV261)'),
('ch12m16', 'sub12', 'montagem', 'seguranca', 16, 'Sinalização de aviso e pictogramas de segurança visíveis'),
('ch12m17', 'sub12', 'montagem', 'teste', 17, 'Teste de sincronização das 4 colunas em subida e descida'),
('ch12m18', 'sub12', 'montagem', 'teste', 18, 'Verificação de ruído e funcionamento suave'),
('ch12m19', 'sub12', 'montagem', 'teste', 19, 'Comando subida/descida e fim de curso operacionais'),
('ch12m20', 'sub12', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);
