/*
  AT_Manut — Snapshot da leitura do contador de horas no relatório (PDF/email/HTML).
  Garante que o valor registado na intervenção permanece no documento mesmo que
  a ficha da máquina ou a linha de manutenção sejam alteradas depois.

  Correr UMA vez no phpMyAdmin (base navel_atmanut) se a coluna ainda não existir.
*/

ALTER TABLE `relatorios`
  ADD COLUMN `horas_leitura_contador` INT NULL DEFAULT NULL
    COMMENT 'Leitura acumulada no contador à data deste relatório (h)'
    AFTER `pecas_usadas`;
