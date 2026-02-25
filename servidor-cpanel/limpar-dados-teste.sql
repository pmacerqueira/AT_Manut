-- ============================================================
-- AT_Manut — Limpeza de dados de teste
-- ============================================================
-- ATENÇÃO: Este script apaga TODOS os clientes, máquinas,
-- manutenções e relatórios. As categorias, subcategorias,
-- checklist_items e users NÃO são afectados.
--
-- Como usar:
--   1. cPanel → phpMyAdmin → seleccionar a base de dados da app
--   2. Separador "SQL"
--   3. Colar este conteúdo e clicar "Executar"
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `relatorios`;
DELETE FROM `manutencoes`;
DELETE FROM `maquinas`;
DELETE FROM `clientes`;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificação: deverá mostrar 0 em todas as tabelas abaixo
SELECT 'relatorios'  AS tabela, COUNT(*) AS registos FROM `relatorios`
UNION ALL
SELECT 'manutencoes', COUNT(*) FROM `manutencoes`
UNION ALL
SELECT 'maquinas',    COUNT(*) FROM `maquinas`
UNION ALL
SELECT 'clientes',    COUNT(*) FROM `clientes`;

-- ============================================================
-- Depois de correr este script no phpMyAdmin, no browser onde
-- tens a app aberta corre o seguinte no console (F12):
--
--   localStorage.removeItem('atm_pecas_plano');
--   localStorage.removeItem('atm_cache');
--   location.reload();
--
-- Isto limpa o cache offline e os planos de peças de teste.
-- ============================================================
