/*
  AT_Manut — Referências de consumíveis (manutenção regular) na ficha do equipamento.
  Compressor parafuso / KAESER. Correr UMA vez no phpMyAdmin na base navel_atmanut.

  camelCase no JS -> snake_case na BD (ex.: refKitManut3000h -> ref_kit_manut3000h).

  IMPORTANTE: Em SQL, comentários de linha são DOIS hífens seguidos de espaço: --
  Um único hífen (-) NÃO é comentário e gera erro #1064.

  Identificadores (tabela/colunas): usar crases ` assim, NÃO aspas simples '.
*/

ALTER TABLE `maquinas`
  ADD COLUMN `ref_kit_manut3000h`   VARCHAR(120) DEFAULT NULL,
  ADD COLUMN `ref_kit_manut6000h`   VARCHAR(120) DEFAULT NULL,
  ADD COLUMN `ref_correia`          VARCHAR(120) DEFAULT NULL,
  ADD COLUMN `ref_filtro_oleo`      VARCHAR(120) DEFAULT NULL,
  ADD COLUMN `ref_filtro_separador` VARCHAR(120) DEFAULT NULL,
  ADD COLUMN `ref_filtro_ar`        VARCHAR(120) DEFAULT NULL;
