-- ============================================================
-- AT_Manut v1.9.0 — Mock Data: Módulo Reparações
-- ============================================================
-- Insere dados de teste para o módulo de Reparações:
--   • Nova categoria/subcategoria para máquinas de lavagem ISTOBAL
--   • 3 clientes genéricos (compressor, elevador, gerador)
--     → cada um com 1 máquina e 3 reparações (2 concluídas + 1 em curso)
--   • 1 cliente com máquinas de lavagem ISTOBAL
--     → 5 reparações via "email ISTOBAL" (avisos ES...), 3 concluídas + 2 em curso
--
-- ATENÇÃO: Executar APENAS numa BD de teste / desenvolvimento.
-- Não executar em produção se já houver dados reais.
--
-- Como usar:
--   phpMyAdmin → base de dados da app → separador SQL → colar e executar
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Nova subcategoria para máquinas de lavagem ISTOBAL ─────────────────────

INSERT IGNORE INTO `categorias` (`id`, `nome`, `intervalo_tipo`)
VALUES ('cat5', 'Equipamentos de Lavagem de Viaturas', 'semestral');

INSERT IGNORE INTO `subcategorias` (`id`, `categoria_id`, `nome`)
VALUES ('sub17', 'cat5', 'Máquina de lavagem automática de viaturas');

-- ── 2. Clientes genéricos (reparações manuais) ───────────────────────────────

INSERT IGNORE INTO `clientes` (`id`, `nif`, `nome`, `morada`, `codigo_postal`, `localidade`, `telefone`, `email`, `notas`)
VALUES
  ('cli-mock-001', '508111222', 'Auto-Peças Melo, Lda.',
   'Rua da Liberdade, 45', '9500-123', 'Ponta Delgada', '296 111 222', 'geral@autopecasmelo.pt',
   'Cliente de oficina — compressor KAESER'),

  ('cli-mock-002', '508333444', 'Oficina Ribeiro & Filhos, Lda.',
   'Estrada Regional 1, Km 12', '9560-456', 'Ribeira Grande', '296 333 444', 'oficina@ribeirofilhos.pt',
   'Elevador 2 colunas — necessita de manutenção regular'),

  ('cli-mock-003', '508555666', 'Transportes Faria, Lda.',
   'Zona Industrial do Relvão, Lote 7', '9700-789', 'Angra do Heroísmo', '295 555 666', 'admin@tfaria.pt',
   'Gerador de emergência principal — manutenção semestral');

-- ── 3. ISTOBAL Portugal como cliente de faturação ────────────────────────────
--
-- Estrutura do grupo ISTOBAL relevante para a Navel:
--   • ISTOBAL España (fabricante) — fornecedor de máquinas; a Navel compra-lhes equipamentos
--   • ISTOBAL Portugal (subsidiária) — gere os contratos de assistência em Portugal;
--     é a entidade a quem a Navel fatura os serviços de reparação mensalmente
--
-- Fluxo dos avisos:
--   1. ISTOBAL envia email (isat@istobal.com) com aviso "ES-..." → registo automático na app
--   2. Navel executa a reparação → cliente final assina o relatório
--   3. Relatório enviado para: Admin (comercial@navel.pt) + Luísa Monteiro/ISTOBAL PT (lmonteiro.pt@istobal.com) + cliente final
--   4. No final do mês, resumo mensal (horas M.O. + materiais) emitido e enviado à ISTOBAL Portugal
--      para servir de base à fatura mensal

INSERT IGNORE INTO `clientes` (`id`, `nif`, `nome`, `morada`, `codigo_postal`, `localidade`, `telefone`, `email`, `notas`)
VALUES
  ('cli-istobal', '509876543', 'ISTOBAL Portugal, Lda.',
   'Rua dos Inventores, Lote 12, Parque Tecnológico de Sintra-Cascais', '2710-089', 'Sintra', '+351 219 000 000', 'lmonteiro.pt@istobal.com',
   'Subsidiária portuguesa do grupo ISTOBAL España. Responsável pela gestão dos contratos de assistência em Portugal. Cliente de faturação mensal: a Navel emite fatura mensal à ISTOBAL Portugal pelo total de horas M.O. e materiais das reparações dos avisos ES-... recebidos. NÃO confundir com ISTOBAL España (fabricante/fornecedor de máquinas).');

-- Clientes finais com máquinas ISTOBAL instaladas (eles assinam o relatório de reparação)

INSERT IGNORE INTO `clientes` (`id`, `nif`, `nome`, `morada`, `codigo_postal`, `localidade`, `telefone`, `email`, `notas`)
VALUES
  ('cli-mock-004', '508777888', 'Lavagem Express Açores, Lda.',
   'Av. Infante Dom Henrique, 200', '9500-321', 'Ponta Delgada', '296 777 888', 'geral@lavemexpress.pt',
   'Duas máquinas de lavagem automática ISTOBAL. Contrato de assistência gerido pela ISTOBAL — avisos ES-....');

-- ── 4. Máquinas ───────────────────────────────────────────────────────────────

INSERT IGNORE INTO `maquinas`
  (`id`, `cliente_nif`, `subcategoria_id`, `marca`, `modelo`, `numero_serie`, `periodicidade`, `notas`)
VALUES
  -- Compressor KAESER (Auto-Peças Melo)
  ('maq-mock-001', '508111222', 'sub5',  'KAESER',   'SK 22',      'SK22-AZ-20019', 'trimestral',
   'Compressor de parafuso 22 kW. Instalado em Outubro 2019.'),

  -- Elevador 2 colunas (Oficina Ribeiro)
  ('maq-mock-002', '508333444', 'sub2',  'CASTOR',   'CT-2000',    'CT2K-AZ-20218', 'anual',
   'Elevador electro-hidráulico 2 colunas 3000 kg. Instalado em Fevereiro 2018.'),

  -- Gerador diesel (Transportes Faria)
  ('maq-mock-003', '508555666', 'sub7',  'CUMMINS',  'C20D6',      'C20D6-AZ-21031', 'semestral',
   'Grupo gerador diesel 20 kVA. Backup de energia para frotas.'),

  -- ISTOBAL M'NEX 40 (Lavagem Express — máquina 1)
  ('maq-mock-ist1', '508777888', 'sub17', 'ISTOBAL', "M'NEX 40",   'ISTMN40-AZ-20189', 'semestral',
   'Máquina de lavagem automática rollover. Ligeiros até SUV. Instalada Setembro 2018.'),

  -- ISTOBAL TW COMPACT (Lavagem Express — máquina 2)
  ('maq-mock-ist2', '508777888', 'sub17', 'ISTOBAL', 'TW COMPACT', 'ISTTW-AZ-22041',  'semestral',
   'Máquina de lavagem automática por túnel. Ligeiros e comerciais. Instalada Abril 2022.');

-- ── 5. Reparações genéricas ───────────────────────────────────────────────────

INSERT IGNORE INTO `reparacoes`
  (`id`, `maquina_id`, `data`, `tecnico`, `status`, `numero_aviso`, `descricao_avaria`, `observacoes`, `origem`)
VALUES

  -- === Auto-Peças Melo — KAESER SK 22 ===

  ('rep-mock-001', 'maq-mock-001', '2025-12-10', 'Pedro Medeiros', 'concluida',
   'AV-2025-001', 'Válvula de descarga com fuga de ar e perda de pressão no circuito principal.',
   'Intervenção urgente solicitada pelo cliente.', 'manual'),

  ('rep-mock-002', 'maq-mock-001', '2026-01-22', 'Rui Nunes', 'concluida',
   'AV-2026-001', 'Sensor de temperatura do bloco do compressor com leitura errada. Alarme recorrente.',
   NULL, 'manual'),

  ('rep-mock-003', 'maq-mock-001', '2026-02-15', 'Pedro Medeiros', 'em_progresso',
   'AV-2026-005', 'Vibração excessiva no motor eléctrico durante arranque. Possível problema de rolamentos.',
   'Aguarda entrega de rolamentos encomendados.', 'manual'),

  -- === Oficina Ribeiro — Elevador CASTOR CT-2000 ===

  ('rep-mock-004', 'maq-mock-002', '2025-12-18', 'Rui Nunes', 'concluida',
   'AV-2025-002', 'Motor da bomba hidráulica não arranca. Condensador de arranque avariado.',
   NULL, 'manual'),

  ('rep-mock-005', 'maq-mock-002', '2026-01-08', 'Pedro Medeiros', 'concluida',
   'AV-2026-002', 'Dispositivo de bloqueio de segurança não enclava em posição elevada. Risco de operação.',
   'Imobilizado por segurança até reparação.', 'manual'),

  ('rep-mock-006', 'maq-mock-002', '2026-02-10', 'Rui Nunes', 'em_progresso',
   'AV-2026-006', 'Fuga de óleo no cilindro hidráulico direito. Descida lenta e irregular.',
   'Óleo a acumular sob o elevador.', 'manual'),

  -- === Transportes Faria — Gerador CUMMINS C20D6 ===

  ('rep-mock-007', 'maq-mock-003', '2026-01-05', 'Pedro Medeiros', 'concluida',
   'AV-2026-003', 'Grupo gerador não arranca automaticamente em teste semanal. Bateria de arranque sem carga.',
   NULL, 'manual'),

  ('rep-mock-008', 'maq-mock-003', '2026-01-30', 'Rui Nunes', 'concluida',
   'AV-2026-004', 'Tensão de saída instável (230V ±15%). Oscilações afectam equipamentos ligados.',
   'Gerador colocado em modo manual até reparação.', 'manual'),

  ('rep-mock-009', 'maq-mock-003', '2026-02-18', 'Pedro Medeiros', 'em_progresso',
   'AV-2026-007', 'Regulador de tensão AVR com comportamento errático. Possível falha electrónica interna.',
   'Aguarda confirmação de peça com o fornecedor.', 'manual');

-- ── 6. Reparações ISTOBAL (via email) ────────────────────────────────────────

INSERT IGNORE INTO `reparacoes`
  (`id`, `maquina_id`, `data`, `tecnico`, `status`, `numero_aviso`, `descricao_avaria`, `observacoes`, `origem`)
VALUES

  ('rep-mock-ist1', 'maq-mock-ist1', '2026-01-08', 'Pedro Medeiros', 'concluida',
   'ES-2026-00121',
   'Fallo en bomba de alta presión. La presión de lavado cae por debajo de 80 bar durante el ciclo principal.',
   'Aviso recebido de isat@istobal.com.', 'istobal_email'),

  ('rep-mock-ist2', 'maq-mock-ist1', '2026-01-19', 'Rui Nunes', 'concluida',
   'ES-2026-00234',
   'Error en sensor de posición de cepillos laterales. La máquina interrumpe el ciclo en posición intermedia.',
   'Aviso recebido de isat@istobal.com.', 'istobal_email'),

  ('rep-mock-ist3', 'maq-mock-ist2', '2026-02-03', 'Pedro Medeiros', 'concluida',
   'ES-2026-00345',
   'Fallo en sistema de secado por sopladores. Los ventiladores de secado no alcanzan la velocidad nominal.',
   'Aviso recebido de isat@istobal.com.', 'istobal_email'),

  ('rep-mock-ist4', 'maq-mock-ist1', '2026-02-14', 'Rui Nunes', 'em_progresso',
   'ES-2026-00412',
   'Error en cuadro eléctrico principal. Disparo de diferencial residual al activar el arco de enjuague.',
   'Aviso recebido de isat@istobal.com. Em diagnóstico.', 'istobal_email'),

  ('rep-mock-ist5', 'maq-mock-ist2', '2026-02-20', 'Pedro Medeiros', 'em_progresso',
   'ES-2026-00501',
   'Fallo en programa de lavado "Expres". Selector de programa no responde a la selección del cliente.',
   'Aviso recebido de isat@istobal.com. Aguarda peça.', 'istobal_email');

-- ── 7. Relatórios de reparação concluídos ─────────────────────────────────────
-- (apenas para reparações com status = concluida)

INSERT IGNORE INTO `relatorios_reparacao`
  (`id`, `reparacao_id`, `numero_relatorio`, `data_criacao`, `data_assinatura`,
   `tecnico`, `nome_assinante`, `assinado_pelo_cliente`,
   `numero_aviso`, `descricao_avaria`, `trabalho_realizado`, `horas_mao_obra`,
   `checklist_respostas`, `pecas_usadas`, `fotos`, `notas`)
VALUES

  -- Relatório reparação rep-mock-001 (KAESER SK22 — válvula descarga)
  ('rr-mock-001', 'rep-mock-001', '2025.RP.00001',
   '2025-12-10 14:30:00', '2025-12-10 16:45:00',
   'Pedro Medeiros', 'António Melo', 1,
   'AV-2025-001',
   'Válvula de descarga com fuga de ar e perda de pressão no circuito principal.',
   'Substituída válvula de descarga mínima danificada. Testada estanquicidade. Verificação de todos os aneIs O-Ring. Pressão de serviço reposta a 8 bar.',
   2.5,
   '{}',
   '[{"codigo":"KAE-VDM-0852","descricao":"Válvula de descarga mínima KAESER SK22","quantidade":1},{"codigo":"OR-NBR-24","descricao":"Kit O-Ring NBR \\u00f3leo/ar (embalagem 24 un.)","quantidade":1},{"codigo":"LUB-KAE-1L","descricao":"Óleo KAESER SIGMA FLUID Plus 1L","quantidade":0.5}]',
   '[]',
   'Pressão testada durante 30 min sem registo de fugas.'),

  -- Relatório reparação rep-mock-002 (KAESER SK22 — sensor temperatura)
  ('rr-mock-002', 'rep-mock-002', '2026.RP.00001',
   '2026-01-22 09:00:00', '2026-01-22 11:30:00',
   'Rui Nunes', 'António Melo', 1,
   'AV-2026-001',
   'Sensor de temperatura do bloco do compressor com leitura errada. Alarme recorrente.',
   'Substituído sensor NTC de temperatura do bloco compressor. Reiniciada unidade de controlo SIGMA CONTROL 2. Calibração verificada. Alarme limpo.',
   1.5,
   '{}',
   '[{"codigo":"KAE-SNTC-100","descricao":"Sensor NTC temperatura bloco KAESER (100°C)","quantidade":1},{"codigo":"CABO-CONX-05","descricao":"Cabo de ligação sensor 0.5m","quantidade":1}]',
   '[]',
   'Sistema operacional. Temperatura de serviço estabilizou em 78°C.'),

  -- Relatório reparação rep-mock-004 (Elevador CASTOR — condensador motor)
  ('rr-mock-004', 'rep-mock-004', '2026.RP.00002',
   '2025-12-18 10:00:00', '2025-12-18 12:00:00',
   'Rui Nunes', 'José Ribeiro', 1,
   'AV-2025-002',
   'Motor da bomba hidráulica não arranca. Condensador de arranque avariado.',
   'Substituído condensador de arranque do motor da bomba. Verificação de contactores e protecções eléctricas. Teste de subida/descida em carga. Nível de óleo hidráulico verificado.',
   2.0,
   '{}',
   '[{"codigo":"COND-450V-25","descricao":"Condensador arranque 25µF 450V","quantidade":1},{"codigo":"OIL-HLP32-5L","descricao":"Óleo hidráulico HLP 32 5L","quantidade":1}]',
   '[]',
   'Elevador operacional. Ciclos de subida e descida testados com carga de 2.500 kg.'),

  -- Relatório reparação rep-mock-005 (Elevador CASTOR — dispositivo segurança)
  ('rr-mock-005', 'rep-mock-005', '2026.RP.00003',
   '2026-01-08 14:00:00', '2026-01-08 16:30:00',
   'Pedro Medeiros', 'José Ribeiro', 1,
   'AV-2026-002',
   'Dispositivo de bloqueio de segurança não enclava em posição elevada.',
   'Substituída mola e trinco do dispositivo de bloqueio coluna esquerda. Lubrificação dos trilhos de segurança. Ajuste da sincronização entre colunas. Teste de segurança realizado conforme EN 1493:2020.',
   3.0,
   '{}',
   '[{"codigo":"CAST-TRNCO-01","descricao":"Trinco de segurança CASTOR CT-2000","quantidade":2},{"codigo":"CAST-MOLA-S","descricao":"Mola de retorno trinco","quantidade":2},{"codigo":"LUB-W40-300","descricao":"Lubrificante WD-40 300ml","quantidade":1}]',
   '[]',
   'Equipamento certificado para operação. Cliente informado de próxima manutenção anual em Janeiro 2027.'),

  -- Relatório reparação rep-mock-007 (Gerador CUMMINS — bateria)
  ('rr-mock-007', 'rep-mock-007', '2026.RP.00004',
   '2026-01-05 09:30:00', '2026-01-05 11:00:00',
   'Pedro Medeiros', 'Carlos Faria', 1,
   'AV-2026-003',
   'Grupo gerador não arranca automaticamente. Bateria de arranque sem carga.',
   'Substituída bateria de arranque 12V/100Ah. Verificação do carregador de bateria (AVR interno). Teste de arranque automático em simulação de falha de rede. Actualização do registo de manutenção.',
   1.5,
   '{}',
   '[{"codigo":"BAT-12V-100AH","descricao":"Bateria arranque 12V 100Ah AGM","quantidade":1},{"codigo":"TERM-BAT-M8","descricao":"Terminais bateria M8 (par)","quantidade":2}]',
   '[]',
   'Arranque automático testado 5 vezes consecutivas. Tempo de arranque: 8s. Dentro da especificação.'),

  -- Relatório reparação rep-mock-008 (Gerador CUMMINS — tensão)
  ('rr-mock-008', 'rep-mock-008', '2026.RP.00005',
   '2026-01-30 10:00:00', '2026-01-30 13:30:00',
   'Rui Nunes', 'Carlos Faria', 1,
   'AV-2026-004',
   'Tensão de saída instável (230V ±15%). Oscilações afectam equipamentos ligados.',
   'Substituído regulador automático de tensão (AVR) do alternador. Ajuste fino da tensão de referência. Verificação das bobinas do alternador (sem danos). Teste com carga resistiva nominal durante 1h.',
   3.5,
   '{}',
   '[{"codigo":"AVR-SE350","descricao":"Regulador automático de tensão SE350 (compatível CUMMINS)","quantidade":1},{"codigo":"COND-FILM-047","descricao":"Condensador film 47nF (kit reparação AVR)","quantidade":3}]',
   '[]',
   'Tensão estabilizada em 230V ±1%. Frequência 50Hz ±0.5Hz. Cliente retomou operação normal.'),

  -- Relatório reparação ISTOBAL rep-mock-ist1 (bomba alta pressão)
  ('rr-mock-ist1', 'rep-mock-ist1', '2026.RP.00006',
   '2026-01-08 09:00:00', '2026-01-08 17:00:00',
   'Pedro Medeiros', 'Sónia Pacheco', 1,
   'ES-2026-00121',
   'Fallo en bomba de alta presión. La presión de lavado cae por debajo de 80 bar durante el ciclo principal.',
   'Substituída bomba de alta pressão CAT 310 por unidade nova. Substituição de vedantes e O-Rings do colector. Purga do circuito de água. Regulação de pressão para 120 bar (especificação ISTOBAL). Teste completo de todos os programas de lavagem.',
   5.0,
   '{}',
   '[{"codigo":"IST-PUMP-CAT310","descricao":"Bomba alta pressão CAT 310 ISTOBAL M NEX 40","quantidade":1},{"codigo":"IST-ORING-KIT","descricao":"Kit vedantes e O-Rings colector","quantidade":1},{"codigo":"OIL-PUMP-1L","descricao":"Óleo bomba SAE 30W 1L","quantidade":1}]',
   '[]',
   'Aviso ISTOBAL ES-2026-00121. Pressão verificada em todos os bicos. Todos os programas testados OK.'),

  -- Relatório reparação ISTOBAL rep-mock-ist2 (sensor cepilhos)
  ('rr-mock-ist2', 'rep-mock-ist2', '2026.RP.00007',
   '2026-01-19 10:00:00', '2026-01-19 13:00:00',
   'Rui Nunes', 'Sónia Pacheco', 1,
   'ES-2026-00234',
   'Error en sensor de posición de cepillos laterales.',
   'Substituído sensor indutivo de posição dos escovas laterais (par). Ajuste mecânico da guia de esgotamento. Calibração da distância de detecção (15mm). Teste de programa completo "Basic Wash" e "Premium Wash".',
   2.5,
   '{}',
   '[{"codigo":"IST-SENS-IND-M18","descricao":"Sensor indutivo posição M18 ISTOBAL (par)","quantidade":2},{"codigo":"IST-CABO-SENS","descricao":"Cabo ligação sensor 2m","quantidade":2}]',
   '[]',
   'Aviso ISTOBAL ES-2026-00234. Sensores calibrados. Máquina completa ciclos sem interrupções.'),

  -- Relatório reparação ISTOBAL rep-mock-ist3 (sistema secado)
  ('rr-mock-ist3', 'rep-mock-ist3', '2026.RP.00008',
   '2026-02-03 09:00:00', '2026-02-03 16:00:00',
   'Pedro Medeiros', 'Sónia Pacheco', 1,
   'ES-2026-00345',
   'Fallo en sistema de secado por sopladores. Los ventiladores de secado no alcanzan la velocidad nominal.',
   'Substituídos 2 ventiladores de secado do arco de saída (modelo ISTEC 2.2kW). Verificação de condensadores de arranque e contactores. Teste de velocidade nominal (2850 rpm). Ajuste da deflectores de ar.',
   4.0,
   '{}',
   '[{"codigo":"IST-FAN-220-TW","descricao":"Ventilador secagem ISTOBAL TW 2.2kW 2850rpm","quantidade":2},{"codigo":"COND-RUN-20UF","descricao":"Condensador de trabalho 20µF 450V","quantidade":2},{"codigo":"CONT-AC-9A","descricao":"Contactor AC-3 9A 230V","quantidade":1}]',
   '[]',
   'Aviso ISTOBAL ES-2026-00345. Velocidade de secagem verificada. Eficiência de secagem correcta em teste com veículo.');

SET FOREIGN_KEY_CHECKS = 1;

-- ── Verificação ───────────────────────────────────────────────────────────────

SELECT
  r.id,
  r.numero_aviso,
  r.status,
  r.origem,
  c.nome AS cliente,
  CONCAT(m.marca, ' ', m.modelo) AS maquina,
  rr.numero_relatorio
FROM reparacoes r
LEFT JOIN maquinas m ON m.id = r.maquina_id
LEFT JOIN clientes c ON c.nif = m.cliente_nif
LEFT JOIN relatorios_reparacao rr ON rr.reparacao_id = r.id
WHERE r.id LIKE 'rep-mock-%'
ORDER BY r.origem, r.data;
