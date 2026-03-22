/*
  AT_Manut — Coluna do plano por fases na ficha do compressor (KAESER A/B/C/D, …).
  Sem esta coluna, o UPDATE de `maquinas` falha no MySQL (coluna desconhecida) quando
  o frontend envia `planoManutencaoCompressor` — sintoma: parece que só gravam marca/modelo/série.

  Correr UMA vez no phpMyAdmin (base navel_atmanut).
*/

ALTER TABLE `maquinas`
  ADD COLUMN `plano_manutencao_compressor` VARCHAR(32) NULL
    COMMENT 'Plano por fases: kaeser_abcd, … (NULL ou vazio = sem plano A/B/C/D)';
