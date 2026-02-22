-- Migração: Checklists completas para sub12 (Elevador electro-hidráulico de pesados 4 colunas móveis independentes)
-- Base: Manual Twin Busch TW 550/750 4C independentes, EN 1493:2020, DL 50/2005, DL 103/2008, Dir. 2006/42/CE
-- Manual em inglês; instruções adaptadas para português

-- 2. CHECKLIST MONTAGEM — sub12 (4 colunas móveis independentes)
INSERT INTO `checklist_items` (`id`, `subcategoria_id`, `tipo`, `grupo`, `ordem`, `texto`) VALUES
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
('ch12m20', 'sub12', 'montagem', 'teste', 20, 'Limpeza final do equipamento e teste em funcionamento')
ON DUPLICATE KEY UPDATE `grupo` = VALUES(`grupo`), `texto` = VALUES(`texto`), `ordem` = VALUES(`ordem`);

-- 3. Atualizar checklist PERIÓDICA sub12 com grupos (manter IDs para compatibilidade)
UPDATE `checklist_items` SET `grupo` = 'documentacao' WHERE `id` IN ('ch81','ch82','ch83','ch86') AND `subcategoria_id` = 'sub12';
UPDATE `checklist_items` SET `grupo` = 'seguranca' WHERE `id` IN ('ch84','ch92','ch93') AND `subcategoria_id` = 'sub12';
UPDATE `checklist_items` SET `grupo` = 'mecanica' WHERE `id` IN ('ch85','ch89') AND `subcategoria_id` = 'sub12';
UPDATE `checklist_items` SET `grupo` = 'hidraulica' WHERE `id` IN ('ch87','ch88','ch90','ch91') AND `subcategoria_id` = 'sub12';
UPDATE `checklist_items` SET `grupo` = 'teste' WHERE `id` = 'ch94b' AND `subcategoria_id` = 'sub12';
UPDATE `checklist_items` SET `grupo` = 'geral' WHERE `id` = 'ch94' AND `subcategoria_id` = 'sub12';
