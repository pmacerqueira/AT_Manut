-- ============================================================
-- AT_Manut — Seed Mock Data v1.8.4
-- (10 clientes, 23 máquinas, 28 manutenções, 13 relatórios)
-- ============================================================
-- Executar APÓS setup.sql + migrations v1.8.x
-- Marcas correctas: compressores → KAESER/Fini/ECF/IES/LaPadana
--                   elevadores   → Cascos/Ravaglioli/Space/Kroftools/TwinBusch/Sunshine/Werther/Velyen
-- Ordem: clientes → maquinas → manutencoes → relatorios
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. CLIENTES (10 clientes açorianos) ──────────────────────
-- id = nif (chave natural; API usa nif para lookup)
INSERT IGNORE INTO `clientes` (`id`, `nif`, `nome`, `morada`, `codigo_postal`, `localidade`, `telefone`, `email`) VALUES
('511234567', '511234567', 'Mecânica Bettencourt Lda', 'Rua do Mercado, 12', '9500-050', 'Ponta Delgada', '296281234', 'geral@mecanicabettencourt.pt'),
('512345678', '512345678', 'Auto Serviço Ribeira', 'Av. do Porto, 45', '9600-030', 'Ribeira Grande', '296472345', 'autoservico@ribeira.pt'),
('513456789', '513456789', 'Oficina Sousa & Filhos Lda', 'Zona Industrial de Angra, Lote 7', '9700-011', 'Angra do Heroísmo', '295212456', 'oficina@sousafilhos.pt'),
('514567890', '514567890', 'Transportes Melo Lda', 'Rua da Fonte, 3', '9760-410', 'Praia da Vitória', '295512567', 'transportes@melo.pt'),
('515678901', '515678901', 'Mecânica Faial Lda', 'Rua Vasco da Gama, 88', '9900-014', 'Horta', '292292678', 'mecanica@faial.pt'),
('516789012', '516789012', 'Auto Pico Lda', 'Caminho de Baixo, 22', '9950-302', 'Madalena', '292622789', 'autopico@mail.pt'),
('517890123', '517890123', 'Serviços Técnicos Açores Lda', 'Parque Empresarial de Ponta Delgada, Lote 4', '9500-801', 'Ponta Delgada', '296305890', 'geral@stacores.pt'),
('518901234', '518901234', 'Oficina Graciosa Lda', 'Rua da Igreja, 15', '9880-352', 'Santa Cruz da Graciosa', '292780123', 'oficina@graciosa.pt'),
('519012345', '519012345', 'Mecânica Flores Lda', 'Largo do Município, 7', '9970-305', 'Santa Cruz das Flores', '292590456', 'mecanica@flores.pt'),
('510123456', '510123456', 'Auto São Jorge Lda', 'Rua do Comércio, 33', '9800-521', 'Calheta', '295410789', 'auto@saojorge.pt');

-- ── 2. MÁQUINAS (18 periódicas + 5 montagens) ─────────────────
-- Inclui posicao_kaeser para compressores (ciclo A/B/C/D anual nos Açores)
-- Requer migration v1.8.x (coluna posicao_kaeser na tabela maquinas)
INSERT IGNORE INTO `maquinas` (`id`, `cliente_id`, `cliente_nif`, `subcategoria_id`, `marca`, `modelo`, `numero_serie`, `ano_fabrico`, `periodicidade`, `proxima_manut`, `numero_documento_venda`, `documentos`, `ultima_manutencao_data`, `horas_totais_acumuladas`, `horas_servico_acumuladas`, `posicao_kaeser`) VALUES
-- Elevadores (Cascos, Ravaglioli, Space, Kroftools, TwinBusch, Werther, Sunshine, Velyen)
('m01', '511234567', '511234567', 'sub1',  'Cascos',     'CS 3.5T',      'CAS-CS35-001',   2021, 'anual',     '2026-12-10', 'FV-2021-001', '[]', '2025-12-10', 1340, 1265, NULL),
('m03', '512345678', '512345678', 'sub2',  'Ravaglioli', 'X132',         'RAV-X132-003',   2020, 'anual',     '2027-01-08', 'FV-2020-003', '[]', '2026-01-08', 980,  924,  NULL),
('m05', '513456789', '513456789', 'sub4',  'Space',      'TES-5T',       'SPA-TES-005',    2019, 'anual',     '2027-01-22', 'FV-2019-005', '[]', '2026-01-22', 2250, 2110, NULL),
('m09', '514567890', '514567890', 'sub12', 'TwinBusch',  'TWB-420',      'TWB-420-009',    2020, 'anual',     '2027-02-12', 'FV-2020-009', '[]', '2026-02-12', 1100, 1045, NULL),
('m10', '515678901', '515678901', 'sub13', 'Werther',    'W3000 XL',     'WER-3000-010',   2022, 'anual',     '2026-12-05', 'FV-2022-010', '[]', '2025-12-05', NULL, NULL, NULL),
('m16', '518901234', '518901234', 'sub1',  'Kroftools',  'KP-3500',      'KRO-KP35-016',   2020, 'anual',     '2026-01-25', 'FV-2020-016', '[]', '2025-01-25', NULL, NULL, NULL),
-- Outros (geradores, equilibradores, muda-pneus)
('m04', '512345678', '512345678', 'sub7',  'Perkins',    '404D-22',      'PRK-404-004',    2023, 'semestral', '2026-07-20', 'FV-2023-004', '[]', '2026-01-20', 830,  790,  NULL),
('m07', '513456789', '513456789', 'sub8',  'Corghi',     'Artiglio 46',  'COR-A46-007',    2021, 'semestral', '2026-08-05', 'FV-2021-007', '[]', '2026-02-05', NULL, NULL, NULL),
('m08', '514567890', '514567890', 'sub9',  'Hofmann',    'Monty 4200',   'HOF-M4200-008',  2023, 'semestral', '2026-08-12', 'FV-2023-008', '[]', '2026-02-12', NULL, NULL, NULL),
('m17', '519012345', '519012345', 'sub7',  'Caterpillar','C2.2',         'CAT-C22-017',    2022, 'semestral', '2026-02-05', 'FV-2022-017', '[]', '2025-08-05', 450,  420,  NULL),
('m18', '510123456', '510123456', 'sub8',  'Corghi',     'Artiglio 36',  'COR-A36-018',    2023, 'semestral', '2026-02-25', 'FV-2023-018', '[]', '2025-08-25', NULL, NULL, NULL),
-- Compressores de parafuso (KAESER/Fini/ECF/IES/LaPadana) — posicao_kaeser = posição no ciclo 12 anos
('m02', '511234567', '511234567', 'sub5',  'KAESER',     'ASK 28T',      '2735',           2020, 'anual',     '2026-03-15', 'FV-2020-002', '[]', '2025-03-15', 3200, 3050, 0),
('m06', '513456789', '513456789', 'sub6',  'Fini',       'K-MAX 15-13',  'FIN-KM15-006',   2022, 'anual',     '2026-02-01', 'FV-2022-006', '[]', '2025-11-01', 870,  820,  1),
('m11', '515678901', '515678901', 'sub10', 'ECF',        'EA 55 8',      'ECF-EA55-011',   2023, 'anual',     '2026-02-10', 'FV-2023-011', '[]', '2025-11-10', 210,  198,  0),
('m12', '516789012', '516789012', 'sub11', 'IES',        'IM 11 8',      'IES-IM11-012',   2021, 'anual',     '2026-05-15', 'FV-2021-012', '[]', '2025-11-15', 3400, 3210, 4),
('m13', '516789012', '516789012', 'sub14', 'KAESER',     'BSD 72 T',     'KAE-BSD72-013',  2022, 'anual',     '2026-03-15', 'FV-2022-013', '[]', '2025-12-15', 680,  645,  2),
('m14', '517890123', '517890123', 'sub15', 'LaPadana',   'VDX 25',       'LAP-VDX25-014',  2023, 'anual',     '2026-06-10', 'FV-2023-014', '[]', '2025-12-10', NULL, NULL, 0),
('m15', '517890123', '517890123', 'sub5',  'Fini',       'Plus 38-270',  'FIN-P38-015',    2024, 'anual',     '2026-04-20', 'FV-2024-015', '[]', '2025-10-20', 620,  590,  1),
-- Montagens pendentes (novos equipamentos a instalar)
('m19', '511234567', '511234567', 'sub2',  'Sunshine',   'SH-240',       'SUN-SH240-019',  2025, 'anual',     NULL, 'FV-2025-019', '[]', NULL, NULL, NULL, NULL),
('m20', '513456789', '513456789', 'sub4',  'Space',      'TES-8T',       'SPA-TES-020',    2025, 'anual',     NULL, 'FV-2025-020', '[]', NULL, NULL, NULL, NULL),
('m21', '514567890', '514567890', 'sub12', 'Velyen',     'VL-400',       'VEL-VL400-021',  2025, 'anual',     NULL, 'FV-2025-021', '[]', NULL, NULL, NULL, NULL),
('m22', '515678901', '515678901', 'sub2',  'Ravaglioli', 'X102',         'RAV-X102-022',   2025, 'anual',     NULL, 'FV-2025-022', '[]', NULL, NULL, NULL, NULL),
('m23', '516789012', '516789012', 'sub4',  'Kroftools',  'KP-5000',      'KRO-KP50-023',   2025, 'anual',     NULL, 'FV-2025-023', '[]', NULL, NULL, NULL, NULL);

-- ── 3. MANUTENÇÕES (20 periódicas + 8 montagens) ──────────────
-- Requer migration v1.8.x (colunas inicio_execucao, fim_execucao, tipo_manut_kaeser)
INSERT IGNORE INTO `manutencoes` (`id`, `maquina_id`, `tipo`, `data`, `tecnico`, `status`, `observacoes`, `horas_totais`, `horas_servico`, `tipo_manut_kaeser`) VALUES
-- Concluídas
('mt01', 'm01', 'periodica', '2025-12-10', 'Aurélio Almeida',  'concluida', 'Revisão anual. Verificação geral sem anomalias.',              1340, 1265, NULL),
('mt02', 'm03', 'periodica', '2026-01-08', 'Paulo Medeiros',   'concluida', 'Revisão anual. Vedante do cilindro substituído.',              980,  924,  NULL),
('mt03', 'm05', 'periodica', '2026-01-22', 'Aldevino Costa',   'concluida', 'Revisão anual. Lubrificação geral efetuada.',                 2250, 2110, NULL),
('mt04', 'm07', 'periodica', '2026-02-05', 'Aurélio Almeida',  'concluida', 'Semestral. Calibração e verificação de sensores.',            NULL, NULL, NULL),
('mt05', 'm09', 'periodica', '2026-02-12', 'Paulo Medeiros',   'concluida', 'Revisão anual. Sincronização das 4 colunas OK.',              1100, 1045, NULL),
('mt06', 'm02', 'periodica', '2025-03-15', 'Paulo Medeiros',   'concluida', 'Manutenção anual Tipo A. Filtros de ar e óleo substituídos.', 3200, 3050, 'A'),
('mt07', 'm04', 'periodica', '2026-01-20', 'Aldevino Costa',   'concluida', 'Semestral. Troca de óleo e filtros. Teste de carga OK.',      830,  790,  NULL),
('mt08', 'm06', 'periodica', '2025-11-01', 'Aurélio Almeida',  'concluida', 'Anual Tipo B. Verificação de pressão e drenagem.',            870,  820,  'B'),
('mt09', 'm08', 'periodica', '2026-02-12', 'Paulo Medeiros',   'concluida', 'Semestral. Lubrificação dos braços e verificação de fugas.',  NULL, NULL, NULL),
('mt10', 'm10', 'periodica', '2025-12-05', 'Aldevino Costa',   'concluida', 'Revisão anual. Cabos e polias verificados. Sem anomalias.',   NULL, NULL, NULL),
-- Pendentes (em atraso)
('mt11', 'm02', 'periodica', '2026-03-15', '', 'pendente', 'Anual em atraso. Aguarda agendamento. (Tipo A previsto)',    NULL, NULL, NULL),
('mt12', 'm06', 'periodica', '2026-02-01', '', 'pendente', 'Anual em atraso. Cliente contactado. (Tipo C previsto)',     NULL, NULL, NULL),
('mt13', 'm11', 'periodica', '2026-02-10', '', 'pendente', 'Anual em atraso. Aguardar peças de filtro. (Tipo A previsto)',NULL, NULL, NULL),
('mt14', 'm16', 'periodica', '2026-01-25', '', 'pendente', 'Revisão anual em atraso. Cliente na Graciosa.',              NULL, NULL, NULL),
('mt15', 'm17', 'periodica', '2026-02-05', '', 'pendente', 'Semestral em atraso. Gerador nas Flores.',                   NULL, NULL, NULL),
-- Agendadas
('mt16', 'm13', 'periodica', '2026-03-15', 'Aldevino Costa',   'agendada', '', NULL, NULL, NULL),
('mt17', 'm15', 'periodica', '2026-04-20', 'Paulo Medeiros',   'agendada', '', NULL, NULL, NULL),
('mt18', 'm12', 'periodica', '2026-05-15', 'Aurélio Almeida',  'agendada', '', NULL, NULL, NULL),
('mt19', 'm14', 'periodica', '2026-06-10', 'Aldevino Costa',   'agendada', '', NULL, NULL, NULL),
('mt20', 'm18', 'periodica', '2026-02-25', 'Paulo Medeiros',   'agendada', '', NULL, NULL, NULL),
-- Montagens
('mt21', 'm03', 'montagem', '2020-03-15', 'Paulo Medeiros',   'concluida', 'Montagem inicial elevador Ravaglioli X132. Colunas ancoradas.', 0, 0, NULL),
('mt22', 'm05', 'montagem', '2019-06-20', 'Aldevino Costa',   'concluida', 'Montagem inicial elevador Space TES-5T. Base de cimento conforme.', 0, 0, NULL),
('mt23', 'm09', 'montagem', '2020-04-10', 'Paulo Medeiros',   'concluida', 'Montagem inicial elevador TwinBusch TWB-420. 4 colunas sincronizadas.', 0, 0, NULL),
('mt24', 'm19', 'montagem', '2026-01-10', '', 'pendente', 'Montagem em atraso. Equipamento no armazém.', NULL, NULL, NULL),
('mt25', 'm20', 'montagem', '2026-02-01', '', 'pendente', 'Montagem em atraso. Base de cimento ainda em execução.', NULL, NULL, NULL),
('mt26', 'm21', 'montagem', '2026-03-15', 'Paulo Medeiros',   'agendada', '', NULL, NULL, NULL),
('mt27', 'm22', 'montagem', '2026-03-25', 'Aldevino Costa',   'agendada', '', NULL, NULL, NULL),
('mt28', 'm23', 'montagem', '2026-04-10', 'Aurélio Almeida',  'agendada', '', NULL, NULL, NULL);

-- ── 4. RELATÓRIOS (10 periódicas + 3 montagens) ───────────────
-- checklist_respostas e fotos em JSON; assinado_pelo_cliente = 1
-- Placeholder base64 1x1 PNG para fotos
SET @foto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

INSERT IGNORE INTO `relatorios` (`id`, `manutencao_id`, `numero_relatorio`, `data_criacao`, `data_assinatura`, `tecnico`, `nome_assinante`, `assinado_pelo_cliente`, `checklist_respostas`, `notas`, `fotos`, `ultimo_envio`, `tipo_manut_kaeser`, `pecas_usadas`) VALUES
('rr01', 'mt01', '2025.MP.00001', '2025-12-10 09:15:00', '2025-12-10 11:45:00', 'Aurélio Almeida', 'João Bettencourt', 1, '{"ch1":"sim","ch2":"sim","ch3":"sim","ch4":"sim","ch5":"sim","ch6":"sim","ch7":"sim","ch8":"sim","ch9":"sim","ch10":"sim","ch11":"sim","ch12":"sim","ch13":"nao","ch14":"sim","ch14b":"sim"}', 'Bloqueio de segurança com folga excessiva — reaperto efetuado.', JSON_ARRAY(@foto, @foto), '2025-12-10 12:00:00', NULL, NULL),
('rr02', 'mt02', '2026.MP.00001', '2026-01-08 08:30:00', '2026-01-08 10:20:00', 'Paulo Medeiros', 'Rui Silveira', 1, '{"ch21":"sim","ch22":"sim","ch23":"sim","ch24":"sim","ch25":"sim","ch26":"sim","ch27":"sim","ch28":"nao","ch29":"sim","ch30":"sim","ch31":"sim","ch32":"sim","ch33":"sim","ch34":"sim","ch34c":"sim","ch34d":"sim","ch34e":"sim","ch34f":"sim","ch34g":"sim","ch34b":"sim"}', 'Válvula limitadora de pressão com desgaste. Substituída em garantia. Sistema estanque.', JSON_ARRAY(@foto), '2026-01-08 10:45:00', NULL, NULL),
('rr03', 'mt03', '2026.MP.00002', '2026-01-22 09:00:00', '2026-01-22 12:10:00', 'Aldevino Costa', 'Manuel Sousa', 1, '{"ch61":"sim","ch62":"sim","ch63":"sim","ch64":"sim","ch65":"sim","ch66":"sim","ch67":"sim","ch68":"sim","ch69":"sim","ch70":"sim","ch71":"sim","ch72":"sim","ch73":"sim","ch74":"sim","ch74c":"sim","ch74d":"sim","ch74e":"sim","ch74f":"sim","ch74g":"sim","ch74b":"sim"}', 'Revisão anual sem anomalias. Óleo hidráulico substituído. Articulações lubrificadas.', JSON_ARRAY(@foto, @foto, @foto), '2026-01-22 12:30:00', NULL, NULL),
('rr04', 'mt04', '2026.MP.00003', '2026-02-05 10:00:00', '2026-02-05 13:30:00', 'Aurélio Almeida', 'António Sousa', 1, '{"ch801":"sim","ch802":"sim","ch803":"sim","ch804":"sim","ch805":"sim","ch806":"sim","ch807":"sim","ch808":"sim","ch809":"nao","ch810":"sim","ch811":"sim","ch812":"sim","ch813":"sim","ch814":"sim","ch815":"sim"}', 'Calibração de desequilíbrio fora dos parâmetros — recalibrado. Operacional.', JSON_ARRAY(@foto), '2026-02-05 14:00:00', NULL, NULL),
('rr05', 'mt05', '2026.MP.00004', '2026-02-12 08:45:00', '2026-02-12 11:00:00', 'Paulo Medeiros', 'Carlos Melo', 1, '{"ch81":"sim","ch82":"sim","ch83":"sim","ch84":"sim","ch85":"sim","ch86":"sim","ch87":"sim","ch88":"sim","ch89":"sim","ch90":"sim","ch91":"sim","ch92":"sim","ch93":"sim","ch94":"sim","ch94c":"sim","ch94d":"sim","ch94e":"sim","ch94f":"sim","ch94g":"sim","ch94b":"sim"}', 'Revisão anual. Sincronização das 4 colunas verificada. Sem fugas.', JSON_ARRAY(@foto, @foto), '2026-02-12 11:15:00', NULL, NULL),
('rr06', 'mt06', '2025.MP.00002', '2025-03-15 09:00:00', '2025-03-15 11:30:00', 'Paulo Medeiros', 'João Bettencourt', 1, '{"ch201":"sim","ch202":"sim","ch203":"sim","ch204":"sim","ch205":"sim","ch206":"sim","ch207":"sim","ch208":"sim","ch209":"sim","ch210":"sim","ch211":"sim","ch212":"sim","ch213":"sim","ch214":"sim","ch215":"sim"}', 'Manutenção anual Tipo A. Filtros de ar e óleo substituídos. 3050h de serviço.', JSON_ARRAY(), '2025-03-15 11:45:00', 'A', '[{"codigoArtigo":"490111.00030","descricao":"SET filtro compressor","quantidade":1,"unidade":"PÇ","usado":true},{"codigoArtigo":"9.0920.10030","descricao":"SIGMA FLUID MOL 5L","quantidade":3,"unidade":"PÇ","usado":true}]'),
('rr07', 'mt07', '2026.MP.00005', '2026-01-20 08:45:00', '2026-01-20 11:15:00', 'Aldevino Costa', 'Rui Silveira', 1, '{"ch701":"sim","ch702":"sim","ch703":"sim","ch704":"sim","ch705":"sim","ch706":"sim","ch707":"sim","ch708":"sim","ch709":"sim","ch710":"sim","ch711":"sim","ch712":"sim","ch713":"sim","ch714":"sim","ch715":"sim"}', 'Semestral. Troca de óleo e filtros. Teste de carga OK. Gerador em bom estado.', JSON_ARRAY(), '2026-01-20 11:30:00', NULL, NULL),
('rr08', 'mt08', '2025.MP.00003', '2025-11-01 10:00:00', '2025-11-01 12:20:00', 'Aurélio Almeida', 'Manuel Sousa', 1, '{"ch351":"sim","ch352":"sim","ch353":"sim","ch354":"sim","ch355":"sim","ch356":"sim","ch357":"sim","ch358":"sim","ch359":"sim","ch360":"sim","ch361":"sim","ch362":"sim","ch363":"sim","ch364":"sim","ch364b":"sim"}', 'Anual Tipo B. Verificação de pressão e drenagem de condensado. Conforme.', JSON_ARRAY(), '2025-11-01 12:35:00', 'B', NULL),
('rr09', 'mt09', '2026.MP.00006', '2026-02-12 09:15:00', '2026-02-12 11:45:00', 'Paulo Medeiros', 'Carlos Melo', 1, '{"ch901":"sim","ch902":"sim","ch903":"sim","ch904":"sim","ch905":"sim","ch906":"sim","ch907":"sim","ch908":"sim","ch909":"sim","ch910":"sim","ch911":"sim","ch912":"sim","ch913":"sim","ch914":"sim","ch915":"sim"}', 'Semestral. Lubrificação e verificação de fugas. Operacional.', JSON_ARRAY(), '2026-02-12 12:00:00', NULL, NULL),
('rr10', 'mt10', '2025.MP.00004', '2025-12-05 08:30:00', '2025-12-05 11:00:00', 'Aldevino Costa', 'Fernando Lopes', 1, '{"ch101":"sim","ch102":"sim","ch103":"sim","ch104":"sim","ch105":"sim","ch106":"sim","ch107":"sim","ch108":"sim","ch109":"sim","ch110":"sim","ch111":"sim","ch112":"sim","ch113":"sim","ch114":"sim","ch114b":"sim"}', 'Revisão anual. Cabos e polias verificados. Sem anomalias.', JSON_ARRAY(), '2025-12-05 11:20:00', NULL, NULL),
('rr11', 'mt21', '2020.MT.00001', '2020-03-15 09:00:00', '2020-03-15 12:30:00', 'Paulo Medeiros', 'Rui Silveira', 1, '{"ch2m01":"sim","ch2m02":"sim","ch2m03":"sim","ch2m04":"sim","ch2m05":"sim","ch2m06":"sim","ch2m07":"sim","ch2m08":"sim","ch2m09":"sim","ch2m10":"sim","ch2m11":"sim","ch2m12":"sim","ch2m13":"sim","ch2m14":"sim","ch2m15":"sim","ch2m16":"sim","ch2m17":"sim","ch2m18":"sim","ch2m19":"sim","ch2m20":"sim"}', 'Montagem inicial Ravaglioli X132. Todos os pontos verificados. Operacional.', JSON_ARRAY(@foto), '2020-03-15 13:00:00', NULL, NULL),
('rr12', 'mt22', '2019.MT.00001', '2019-06-20 08:30:00', '2019-06-20 14:00:00', 'Aldevino Costa', 'Manuel Sousa', 1, '{"ch4m01":"sim","ch4m02":"sim","ch4m03":"sim","ch4m04":"sim","ch4m05":"sim","ch4m06":"sim","ch4m07":"sim","ch4m08":"sim","ch4m09":"sim","ch4m10":"sim","ch4m11":"sim","ch4m12":"sim","ch4m13":"sim","ch4m14":"sim","ch4m15":"sim","ch4m16":"sim","ch4m17":"sim","ch4m18":"sim","ch4m19":"sim","ch4m20":"sim"}', 'Montagem Space TES-5T. Base de cimento conforme. Sincronização das plataformas OK.', JSON_ARRAY(@foto, @foto), '2019-06-20 14:30:00', NULL, NULL),
('rr13', 'mt23', '2020.MT.00002', '2020-04-10 09:15:00', '2020-04-10 15:45:00', 'Paulo Medeiros', 'Carlos Melo', 1, '{"ch12m01":"sim","ch12m02":"sim","ch12m03":"sim","ch12m04":"sim","ch12m05":"sim","ch12m06":"sim","ch12m07":"sim","ch12m08":"sim","ch12m09":"sim","ch12m10":"sim","ch12m11":"sim","ch12m12":"sim","ch12m13":"sim","ch12m14":"sim","ch12m15":"sim","ch12m16":"sim","ch12m17":"sim","ch12m18":"sim","ch12m19":"sim","ch12m20":"sim"}', 'Montagem TwinBusch TWB-420. 4 colunas sincronizadas. Equipamento pronto.', JSON_ARRAY(), '2020-04-10 16:00:00', NULL, NULL);

SET FOREIGN_KEY_CHECKS = 1;

-- ── Verificação rápida ───────────────────────────────────────
-- SELECT 'clientes' AS tbl, COUNT(*) AS n FROM clientes
-- UNION ALL SELECT 'maquinas', COUNT(*) FROM maquinas
-- UNION ALL SELECT 'manutencoes', COUNT(*) FROM manutencoes
-- UNION ALL SELECT 'relatorios', COUNT(*) FROM relatorios;
