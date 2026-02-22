-- ============================================================
-- AT_Manut — Mock Data v4 · Fev 2026
-- ============================================================
-- 10 clientes, 23 máquinas, 28 manutenções (incl. 8 montagens: 3 concluídas, 2 atraso, 3 próximas),
-- 13 relatórios completos (10 periódicas + 3 montagens).
--
-- Executar em phpMyAdmin na base navel_atmanut.
-- NOTA: Se já tiver dados em clientes/maquinas/manutencoes/relatorios,
--       apague-os primeiro ou este script falhará por IDs duplicados.
-- ============================================================

SET NAMES utf8mb4;

SET @foto_placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

-- ── 1. CLIENTES (10) ──────────────────────────────────────────────────────────

INSERT INTO `clientes` (`id`, `nif`, `nome`, `morada`, `codigo_postal`, `localidade`, `telefone`, `email`, `notas`) VALUES
('c1', '511234567', 'Mecânica Bettencourt Lda', 'Rua do Mercado, 12', '9500-050', 'Ponta Delgada', '296281234', 'geral@mecanicabettencourt.pt', NULL),
('c2', '512345678', 'Auto Serviço Ribeira', 'Av. do Porto, 45', '9600-030', 'Ribeira Grande', '296472345', 'autoservico@ribeira.pt', NULL),
('c3', '513456789', 'Oficina Sousa & Filhos Lda', 'Zona Industrial de Angra, Lote 7', '9700-011', 'Angra do Heroísmo', '295212456', 'oficina@sousafilhos.pt', NULL),
('c4', '514567890', 'Transportes Melo Lda', 'Rua da Fonte, 3', '9760-410', 'Praia da Vitória', '295512567', 'transportes@melo.pt', NULL),
('c5', '515678901', 'Mecânica Faial Lda', 'Rua Vasco da Gama, 88', '9900-014', 'Horta', '292292678', 'mecanica@faial.pt', NULL),
('c6', '516789012', 'Auto Pico Lda', 'Caminho de Baixo, 22', '9950-302', 'Madalena', '292622789', 'autopico@mail.pt', NULL),
('c7', '517890123', 'Serviços Técnicos Açores Lda', 'Parque Empresarial de Ponta Delgada, Lote 4', '9500-801', 'Ponta Delgada', '296305890', 'geral@stacores.pt', NULL),
('c8', '518901234', 'Oficina Graciosa Lda', 'Rua da Igreja, 15', '9880-352', 'Santa Cruz da Graciosa', '292780123', 'oficina@graciosa.pt', NULL),
('c9', '519012345', 'Mecânica Flores Lda', 'Largo do Município, 7', '9970-305', 'Santa Cruz das Flores', '292590456', 'mecanica@flores.pt', NULL),
('c10', '510123456', 'Auto São Jorge Lda', 'Rua do Comércio, 33', '9800-521', 'Calheta', '295410789', 'auto@saojorge.pt', NULL);

-- ── 2. MÁQUINAS (23: 18 periódicas + 5 para montagem) ─────────────────────────

INSERT INTO `maquinas` (`id`, `cliente_id`, `cliente_nif`, `subcategoria_id`, `marca`, `modelo`, `numero_serie`, `ano_fabrico`, `periodicidade`, `proxima_manut`, `numero_documento_venda`, `ultima_manutencao_data`, `horas_totais_acumuladas`, `horas_servico_acumuladas`, `notas`) VALUES
('m01', 'c1', '511234567', 'sub1', 'Navel', 'EV-4P', 'NAV-EV-001', 2021, 'anual', '2026-12-10', 'FV-2021-001', '2025-12-10', 1340, 1265, NULL),
('m02', 'c1', '511234567', 'sub5', 'Atlas Copco', 'GA-22', 'AC-GA22-002', 2022, 'trimestral', '2026-01-15', 'FV-2022-002', '2025-10-15', 520, 488, NULL),
('m03', 'c2', '512345678', 'sub2', 'Navel', 'EH-2C', 'NAV-EH-003', 2020, 'anual', '2027-01-08', 'FV-2020-003', '2026-01-08', 980, 924, NULL),
('m04', 'c2', '512345678', 'sub7', 'Perkins', '404D-22', 'PRK-404-004', 2023, 'semestral', '2026-07-20', 'FV-2023-004', '2026-01-20', 830, 790, NULL),
('m05', 'c3', '513456789', 'sub4', 'Navel', 'TES-5T', 'NAV-TES-005', 2019, 'anual', '2027-01-22', 'FV-2019-005', '2026-01-22', 2250, 2110, NULL),
('m06', 'c3', '513456789', 'sub6', 'Abac', 'B30 FM', 'ABA-B30-006', 2022, 'trimestral', '2026-02-01', 'FV-2022-006', '2025-11-01', NULL, NULL, NULL),
('m07', 'c3', '513456789', 'sub8', 'Corghi', 'Artiglio 46', 'COR-A46-007', 2021, 'semestral', '2026-08-05', 'FV-2021-007', '2026-02-05', NULL, NULL, NULL),
('m08', 'c4', '514567890', 'sub9', 'Hofmann', 'Monty 4200', 'HOF-M4200-008', 2023, 'semestral', '2026-08-12', 'FV-2023-008', '2026-02-12', NULL, NULL, NULL),
('m09', 'c4', '514567890', 'sub12', 'Navel', 'EH-P4', 'NAV-EHP4-009', 2020, 'anual', '2027-02-12', 'FV-2020-009', '2026-02-12', 1100, 1045, NULL),
('m10', 'c5', '515678901', 'sub13', 'Navel', 'EM-P4', 'NAV-EMP4-010', 2022, 'anual', '2026-12-05', 'FV-2022-010', '2025-12-05', NULL, NULL, NULL),
('m11', 'c5', '515678901', 'sub10', 'Atlas Copco', 'XAS 47', 'AC-XAS47-011', 2023, 'trimestral', '2026-02-10', 'FV-2023-011', '2025-11-10', 210, 198, NULL),
('m12', 'c6', '516789012', 'sub11', 'Rietschle', 'SVC 150', 'RIE-SVC-012', 2021, 'trimestral', '2026-05-15', 'FV-2021-012', '2025-11-15', 3400, 3210, NULL),
('m13', 'c6', '516789012', 'sub14', 'Atlas Copco', 'CD-11', 'AC-CD11-013', 2022, 'trimestral', '2026-03-15', 'FV-2022-013', '2025-12-15', 680, 645, NULL),
('m14', 'c7', '517890123', 'sub15', 'Bauer', 'PE-100', 'BAU-PE100-014', 2023, 'trimestral', '2026-06-10', 'FV-2023-014', '2025-12-10', NULL, NULL, NULL),
('m15', 'c7', '517890123', 'sub16', 'Atlas Copco', 'FD-50', 'AC-FD50-015', 2024, 'trimestral', '2026-04-20', 'FV-2024-015', '2025-10-20', NULL, NULL, NULL),
('m16', 'c8', '518901234', 'sub1', 'Navel', 'EV-2P', 'NAV-EV-016', 2020, 'anual', '2026-01-25', 'FV-2020-016', '2025-01-25', NULL, NULL, NULL),
('m17', 'c9', '519012345', 'sub7', 'Caterpillar', 'C2.2', 'CAT-C22-017', 2022, 'semestral', '2026-02-05', 'FV-2022-017', '2025-08-05', 450, 420, NULL),
('m18', 'c10', '510123456', 'sub8', 'Corghi', 'Artiglio 36', 'COR-A36-018', 2023, 'semestral', '2026-02-25', 'FV-2023-018', '2025-08-25', NULL, NULL, NULL),
-- Montagens — equipamentos à espera de instalação
('m19', 'c1', '511234567', 'sub2', 'Navel', 'EH-2C', 'NAV-EH-019', 2025, 'anual', NULL, 'FV-2025-019', NULL, NULL, NULL, NULL),
('m20', 'c3', '513456789', 'sub4', 'Navel', 'TES-5T', 'NAV-TES-020', 2025, 'anual', NULL, 'FV-2025-020', NULL, NULL, NULL, NULL),
('m21', 'c4', '514567890', 'sub12', 'Navel', 'EH-P4', 'NAV-EHP4-021', 2025, 'anual', NULL, 'FV-2025-021', NULL, NULL, NULL, NULL),
('m22', 'c5', '515678901', 'sub2', 'Navel', 'EH-2C', 'NAV-EH-022', 2025, 'anual', NULL, 'FV-2025-022', NULL, NULL, NULL, NULL),
('m23', 'c6', '516789012', 'sub4', 'Navel', 'TES-5T', 'NAV-TES-023', 2025, 'anual', NULL, 'FV-2025-023', NULL, NULL, NULL, NULL);

-- ── 3. MANUTENÇÕES (28: 20 periódicas + 8 montagens) ───────────────────────────

INSERT INTO `manutencoes` (`id`, `maquina_id`, `tipo`, `data`, `tecnico`, `status`, `observacoes`, `horas_totais`, `horas_servico`) VALUES
-- Concluídas (10)
('mt01', 'm01', 'periodica', '2025-12-10', 'Aurélio Almeida', 'concluida', 'Revisão anual. Óleo e filtros substituídos.', 1340, 1265),
('mt02', 'm03', 'periodica', '2026-01-08', 'Paulo Medeiros', 'concluida', 'Revisão anual. Vedante do cilindro substituído.', 980, 924),
('mt03', 'm05', 'periodica', '2026-01-22', 'Aldevino Costa', 'concluida', 'Revisão anual. Lubrificação geral efetuada.', 2250, 2110),
('mt04', 'm07', 'periodica', '2026-02-05', 'Aurélio Almeida', 'concluida', 'Semestral. Calibração e verificação de sensores.', NULL, NULL),
('mt05', 'm09', 'periodica', '2026-02-12', 'Paulo Medeiros', 'concluida', 'Revisão anual. Sincronização das 4 colunas OK.', 1100, 1045),
('mt06', 'm02', 'periodica', '2025-10-15', 'Paulo Medeiros', 'concluida', 'Trimestral. Filtros de ar e óleo substituídos.', 520, 488),
('mt07', 'm04', 'periodica', '2026-01-20', 'Aldevino Costa', 'concluida', 'Semestral. Troca de óleo e filtros. Teste de carga OK.', 830, 790),
('mt08', 'm06', 'periodica', '2025-11-01', 'Aurélio Almeida', 'concluida', 'Trimestral. Verificação de pressão e drenagem de condensado.', NULL, NULL),
('mt09', 'm08', 'periodica', '2026-02-12', 'Paulo Medeiros', 'concluida', 'Semestral. Lubrificação dos braços e verificação de fugas.', NULL, NULL),
('mt10', 'm10', 'periodica', '2025-12-05', 'Aldevino Costa', 'concluida', 'Revisão anual. Cabos e polias verificados. Sem anomalias.', NULL, NULL),
-- Em atraso (5)
('mt11', 'm02', 'periodica', '2026-01-15', NULL, 'pendente', 'Trimestral em atraso. Aguarda agendamento.', NULL, NULL),
('mt12', 'm06', 'periodica', '2026-02-01', NULL, 'pendente', 'Trimestral em atraso. Cliente contactado.', NULL, NULL),
('mt13', 'm11', 'periodica', '2026-02-10', NULL, 'pendente', 'Trimestral em atraso. Aguardar peças de filtro.', NULL, NULL),
('mt14', 'm16', 'periodica', '2026-01-25', NULL, 'pendente', 'Revisão anual em atraso. Cliente na Graciosa.', NULL, NULL),
('mt15', 'm17', 'periodica', '2026-02-05', NULL, 'pendente', 'Semestral em atraso. Gerador nas Flores.', NULL, NULL),
-- Próximas (5)
('mt16', 'm13', 'periodica', '2026-03-15', 'Aldevino Costa', 'agendada', NULL, NULL, NULL),
('mt17', 'm15', 'periodica', '2026-04-20', 'Paulo Medeiros', 'agendada', NULL, NULL, NULL),
('mt18', 'm12', 'periodica', '2026-05-15', 'Aurélio Almeida', 'agendada', NULL, NULL, NULL),
('mt19', 'm14', 'periodica', '2026-06-10', 'Aldevino Costa', 'agendada', NULL, NULL, NULL),
('mt20', 'm18', 'periodica', '2026-02-25', 'Paulo Medeiros', 'agendada', NULL, NULL, NULL),
-- Montagens: 3 concluídas · 2 em atraso · 3 próximas
('mt21', 'm03', 'montagem', '2020-03-15', 'Paulo Medeiros', 'concluida', 'Montagem inicial elevador EH-2C. Colunas ancoradas e sistema hidráulico verificado.', 0, 0),
('mt22', 'm05', 'montagem', '2019-06-20', 'Aldevino Costa', 'concluida', 'Montagem inicial elevador de tesoura. Base de cimento conforme plano.', 0, 0),
('mt23', 'm09', 'montagem', '2020-04-10', 'Paulo Medeiros', 'concluida', 'Montagem inicial elevador EH-P4. Sincronização das 4 colunas verificada.', 0, 0),
('mt24', 'm19', 'montagem', '2026-01-10', NULL, 'pendente', 'Montagem em atraso. Equipamento no armazém. Aguarda disponibilidade do cliente.', NULL, NULL),
('mt25', 'm20', 'montagem', '2026-02-01', NULL, 'pendente', 'Montagem em atraso. Base de cimento ainda em execução.', NULL, NULL),
('mt26', 'm21', 'montagem', '2026-03-15', 'Paulo Medeiros', 'agendada', NULL, NULL, NULL),
('mt27', 'm22', 'montagem', '2026-03-25', 'Aldevino Costa', 'agendada', NULL, NULL, NULL),
('mt28', 'm23', 'montagem', '2026-04-10', 'Aurélio Almeida', 'agendada', NULL, NULL, NULL);

-- ── 4. RELATÓRIOS (13: 10 periódicas + 3 montagens) ────────────────────────────

INSERT INTO `relatorios` (`id`, `manutencao_id`, `numero_relatorio`, `data_criacao`, `data_assinatura`, `tecnico`, `nome_assinante`, `assinado_pelo_cliente`, `assinatura_digital`, `checklist_respostas`, `notas`, `fotos`, `ultimo_envio`) VALUES
('rr01', 'mt01', '2025.MP.00001', '2025-12-10 09:15:00', '2025-12-10 11:45:00', 'Aurélio Almeida', 'João Bettencourt', 1, NULL, '{"ch1":"sim","ch2":"sim","ch3":"sim","ch4":"sim","ch5":"sim","ch6":"sim","ch7":"sim","ch8":"sim","ch9":"sim","ch10":"sim","ch11":"sim","ch12":"sim","ch13":"nao","ch14":"sim","ch14b":"sim"}', 'Bloqueio de segurança com folga excessiva — reaperto efetuado. Restantes pontos em conformidade.', CONCAT('["', @foto_placeholder, '","', @foto_placeholder, '"]'), '2025-12-10 12:00:00'),
('rr02', 'mt02', '2026.MP.00001', '2026-01-08 08:30:00', '2026-01-08 10:20:00', 'Paulo Medeiros', 'Rui Silveira', 1, NULL, '{"ch21":"sim","ch22":"sim","ch23":"sim","ch24":"sim","ch25":"sim","ch26":"sim","ch27":"sim","ch28":"nao","ch29":"sim","ch30":"sim","ch31":"sim","ch32":"sim","ch33":"sim","ch34":"sim","ch34c":"sim","ch34d":"sim","ch34e":"sim","ch34f":"sim","ch34g":"sim","ch34b":"sim"}', 'Válvula limitadora de pressão com desgaste. Substituída em garantia. Sistema estanque após intervenção.', CONCAT('["', @foto_placeholder, '"]'), '2026-01-08 10:45:00'),
('rr03', 'mt03', '2026.MP.00002', '2026-01-22 09:00:00', '2026-01-22 12:10:00', 'Aldevino Costa', 'Manuel Sousa', 1, NULL, '{"ch61":"sim","ch62":"sim","ch63":"sim","ch64":"sim","ch65":"sim","ch66":"sim","ch67":"sim","ch68":"sim","ch69":"sim","ch70":"sim","ch71":"sim","ch72":"sim","ch73":"sim","ch74":"sim","ch74c":"sim","ch74d":"sim","ch74e":"sim","ch74f":"sim","ch74g":"sim","ch74b":"sim"}', 'Revisão anual sem anomalias. Óleo hidráulico substituído. Articulações lubrificadas.', CONCAT('["', @foto_placeholder, '","', @foto_placeholder, '","', @foto_placeholder, '"]'), '2026-01-22 12:30:00'),
('rr04', 'mt04', '2026.MP.00003', '2026-02-05 10:00:00', '2026-02-05 13:30:00', 'Aurélio Almeida', 'António Sousa', 1, NULL, '{"ch801":"sim","ch802":"sim","ch803":"sim","ch804":"sim","ch805":"sim","ch806":"sim","ch807":"sim","ch808":"sim","ch809":"nao","ch810":"sim","ch811":"sim","ch812":"sim","ch813":"sim","ch814":"sim","ch815":"sim"}', 'Calibração de desequilíbrio fora dos parâmetros — recalibrado com roda de referência. Equipamento operacional.', CONCAT('["', @foto_placeholder, '"]'), '2026-02-05 14:00:00'),
('rr05', 'mt05', '2026.MP.00004', '2026-02-12 08:45:00', '2026-02-12 11:00:00', 'Paulo Medeiros', 'Carlos Melo', 1, NULL, '{"ch81":"sim","ch82":"sim","ch83":"sim","ch84":"sim","ch85":"sim","ch86":"sim","ch87":"sim","ch88":"sim","ch89":"sim","ch90":"sim","ch91":"sim","ch92":"sim","ch93":"sim","ch94":"sim","ch94c":"sim","ch94d":"sim","ch94e":"sim","ch94f":"sim","ch94g":"sim","ch94b":"sim"}', 'Revisão anual. Sincronização das 4 colunas verificada e ajustada. Sem fugas no sistema hidráulico.', CONCAT('["', @foto_placeholder, '","', @foto_placeholder, '"]'), '2026-02-12 11:15:00'),
('rr06', 'mt06', '2025.MP.00002', '2025-10-15 09:00:00', '2025-10-15 11:30:00', 'Paulo Medeiros', 'João Bettencourt', 1, NULL, '{"ch201":"sim","ch202":"sim","ch203":"sim","ch204":"sim","ch205":"sim","ch206":"sim","ch207":"sim","ch208":"sim","ch209":"sim","ch210":"sim","ch211":"sim","ch212":"sim","ch213":"sim","ch214":"sim","ch215":"sim"}', 'Trimestral. Filtros de ar e óleo substituídos. Compressor operacional.', '[]', '2025-10-15 11:45:00'),
('rr07', 'mt07', '2026.MP.00005', '2026-01-20 08:45:00', '2026-01-20 11:15:00', 'Aldevino Costa', 'Rui Silveira', 1, NULL, '{"ch701":"sim","ch702":"sim","ch703":"sim","ch704":"sim","ch705":"sim","ch706":"sim","ch707":"sim","ch708":"sim","ch709":"sim","ch710":"sim","ch711":"sim","ch712":"sim","ch713":"sim","ch714":"sim","ch715":"sim"}', 'Semestral. Troca de óleo e filtros. Teste de carga OK. Gerador em bom estado.', '[]', '2026-01-20 11:30:00'),
('rr08', 'mt08', '2025.MP.00003', '2025-11-01 10:00:00', '2025-11-01 12:20:00', 'Aurélio Almeida', 'Manuel Sousa', 1, NULL, '{"ch351":"sim","ch352":"sim","ch353":"sim","ch354":"sim","ch355":"sim","ch356":"sim","ch357":"sim","ch358":"sim","ch359":"sim","ch360":"sim","ch361":"sim","ch362":"sim","ch363":"sim","ch364":"sim","ch364b":"sim"}', 'Trimestral. Verificação de pressão e drenagem de condensado. Equipamento conforme.', '[]', '2025-11-01 12:35:00'),
('rr09', 'mt09', '2026.MP.00006', '2026-02-12 09:15:00', '2026-02-12 11:45:00', 'Paulo Medeiros', 'Carlos Melo', 1, NULL, '{"ch901":"sim","ch902":"sim","ch903":"sim","ch904":"sim","ch905":"sim","ch906":"sim","ch907":"sim","ch908":"sim","ch909":"sim","ch910":"sim","ch911":"sim","ch912":"sim","ch913":"sim","ch914":"sim","ch915":"sim"}', 'Semestral. Lubrificação dos braços e verificação de fugas. Máquina de trocar pneus operacional.', '[]', '2026-02-12 12:00:00'),
('rr10', 'mt10', '2025.MP.00004', '2025-12-05 08:30:00', '2025-12-05 11:00:00', 'Aldevino Costa', 'Fernando Lopes', 1, NULL, '{"ch101":"sim","ch102":"sim","ch103":"sim","ch104":"sim","ch105":"sim","ch106":"sim","ch107":"sim","ch108":"sim","ch109":"sim","ch110":"sim","ch111":"sim","ch112":"sim","ch113":"sim","ch114":"sim","ch114b":"sim"}', 'Revisão anual. Cabos e polias verificados. Sincronização das colunas OK. Sem anomalias.', '[]', '2025-12-05 11:20:00'),
-- Montagens (checklist ch2m, ch4m, ch12m)
('rr11', 'mt21', '2020.MT.00001', '2020-03-15 09:00:00', '2020-03-15 12:30:00', 'Paulo Medeiros', 'Rui Silveira', 1, NULL, '{"ch2m01":"sim","ch2m02":"sim","ch2m03":"sim","ch2m04":"sim","ch2m05":"sim","ch2m06":"sim","ch2m07":"sim","ch2m08":"sim","ch2m09":"sim","ch2m10":"sim","ch2m11":"sim","ch2m12":"sim","ch2m13":"sim","ch2m14":"sim","ch2m15":"sim","ch2m16":"sim","ch2m17":"sim","ch2m18":"sim","ch2m19":"sim","ch2m20":"sim"}', 'Montagem inicial elevador EH-2C. Todos os pontos do checklist verificados. Equipamento operacional.', CONCAT('["', @foto_placeholder, '"]'), '2020-03-15 13:00:00'),
('rr12', 'mt22', '2019.MT.00001', '2019-06-20 08:30:00', '2019-06-20 14:00:00', 'Aldevino Costa', 'Manuel Sousa', 1, NULL, '{"ch4m01":"sim","ch4m02":"sim","ch4m03":"sim","ch4m04":"sim","ch4m05":"sim","ch4m06":"sim","ch4m07":"sim","ch4m08":"sim","ch4m09":"sim","ch4m10":"sim","ch4m11":"sim","ch4m12":"sim","ch4m13":"sim","ch4m14":"sim","ch4m15":"sim","ch4m16":"sim","ch4m17":"sim","ch4m18":"sim","ch4m19":"sim","ch4m20":"sim"}', 'Montagem inicial elevador de tesoura. Base de cimento conforme plano. Sincronização das plataformas OK.', CONCAT('["', @foto_placeholder, '","', @foto_placeholder, '"]'), '2019-06-20 14:30:00'),
('rr13', 'mt23', '2020.MT.00002', '2020-04-10 09:15:00', '2020-04-10 15:45:00', 'Paulo Medeiros', 'Carlos Melo', 1, NULL, '{"ch12m01":"sim","ch12m02":"sim","ch12m03":"sim","ch12m04":"sim","ch12m05":"sim","ch12m06":"sim","ch12m07":"sim","ch12m08":"sim","ch12m09":"sim","ch12m10":"sim","ch12m11":"sim","ch12m12":"sim","ch12m13":"sim","ch12m14":"sim","ch12m15":"sim","ch12m16":"sim","ch12m17":"sim","ch12m18":"sim","ch12m19":"sim","ch12m20":"sim"}', 'Montagem inicial elevador EH-P4. Sincronização das 4 colunas verificada. Equipamento pronto para utilização.', '[]', '2020-04-10 16:00:00');
