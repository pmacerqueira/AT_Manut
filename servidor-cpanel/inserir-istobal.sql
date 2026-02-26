-- ============================================================
-- AT_Manut — Inserção ISTOBAL PORTUGAL (completo, IDs controlados)
-- ============================================================
-- Cria/substitui:
--   1. Categoria    "ISTOBAL - Equipamentos de Lavagem"
--   2. Subcategorias (4): Aspiradores, Outros Periféricos,
--                         Pórticos Ligeiros, Pórticos Pesados
--   3. Cliente      ISTOBAL PORTUGAL UNIPESSOAL, LDA.
--   4. Máquina      Pórtico MSTART 270 (Repsol Rotunda Açores)
--
-- NOTA: apaga subcategorias anteriores criadas pela app para esta
--       categoria, para evitar duplicados com IDs desconhecidos.
--
-- Como usar:
--   cPanel → phpMyAdmin → navel_atmanut → SQL → Colar e Executar
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. CATEGORIA (manter se já existir) ──────────────────────

INSERT IGNORE INTO `categorias` (`id`, `nome`, `intervalo_tipo`) VALUES
('cat-lavagem', 'ISTOBAL - Equipamentos de Lavagem', 'anual');

-- ── 2. LIMPAR subcategorias antigas desta categoria ──────────
-- (foram criadas via app com IDs auto-gerados desconhecidos)

DELETE FROM `subcategorias` WHERE `categoria_id` = 'cat-lavagem';

-- ── 3. SUBCATEGORIAS com IDs controlados ─────────────────────

INSERT INTO `subcategorias` (`id`, `categoria_id`, `nome`) VALUES
('sub-istobal-aspiradores', 'cat-lavagem', 'Aspiradores'),
('sub-istobal-perifericos', 'cat-lavagem', 'Outros Periféricos'),
('sub-istobal-ligeiros',    'cat-lavagem', 'Pórticos de Lavagem — Veículos Ligeiros'),
('sub-istobal-pesados',     'cat-lavagem', 'Pórticos de Lavagem — Veículos Pesados');

-- ── 4. CLIENTE ───────────────────────────────────────────────

INSERT IGNORE INTO `clientes`
  (`id`, `nif`, `nome`, `morada`, `codigo_postal`, `localidade`, `telefone`, `email`)
VALUES (
  '510067662',
  '510067662',
  'ISTOBAL PORTUGAL UNIPESSOAL, LDA.',
  'Rua António Conceição Dinis, 5',
  '2600-613',
  'Castanheira do Ribatejo',
  '263277457',
  'pmcerqueira@navel.pt'
);

-- ── 5. MÁQUINA ───────────────────────────────────────────────
-- Subcategoria: Pórticos de Lavagem — Veículos Ligeiros
-- Modelo técnico 4PD6005215 e local de instalação em notas

INSERT IGNORE INTO `maquinas`
  (`id`, `cliente_id`, `cliente_nif`, `subcategoria_id`,
   `marca`, `modelo`, `numero_serie`, `ano_fabrico`,
   `periodicidade`, `proxima_manut`, `notas`, `documentos`)
VALUES (
  'maq-istobal-repsol',
  '510067662',
  '510067662',
  'sub-istobal-ligeiros',
  'ISTOBAL',
  'MSTART 270',
  '180914-MNM00741336',
  2018,
  'anual',
  '2027-02-22',
  'Modelo técnico: 4PD6005215 | Local: 5638052076 - ES REPSOL Nº 2001 ROTUNDA AÇORES',
  '[]'
);

SET FOREIGN_KEY_CHECKS = 1;

-- ── Verificação ───────────────────────────────────────────────
SELECT 'Categoria'    AS tipo, id, nome FROM categorias   WHERE id = 'cat-lavagem'
UNION ALL
SELECT 'Subcategoria', id, nome FROM subcategorias WHERE categoria_id = 'cat-lavagem'
UNION ALL
SELECT 'Cliente',      id, nome FROM clientes       WHERE nif = '510067662'
UNION ALL
SELECT 'Máquina',      id, CONCAT(marca, ' ', modelo, ' — S/N: ', numero_serie)
  FROM maquinas WHERE id = 'maq-istobal-repsol';
