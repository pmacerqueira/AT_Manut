-- Retira das perguntas de elevador citações que não descrevem a observação.
-- Não altera checklist_snapshot dos relatórios já gravados.

UPDATE checklist_items SET texto = 'Marcação CE presente no equipamento'
 WHERE texto = 'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)';

UPDATE checklist_items SET texto = 'Manual de instruções em português disponível e legível'
 WHERE texto = 'Manual de instruções em português disponível e legível (DL 103/2008)';

UPDATE checklist_items SET texto = 'Dispositivos de segurança em funcionamento correto'
 WHERE texto = 'Dispositivos de segurança em funcionamento correto (EN 1493:2020)';

UPDATE checklist_items SET texto = 'Registo de intervenções e manutenção periódica atualizado'
 WHERE texto = 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)';

UPDATE checklist_items SET texto = 'Cabos de aço: estado e aderência nas polias'
 WHERE texto = 'Cabos de aço: estado e aderência nas polias (EN 16625:2013)';

UPDATE checklist_items SET texto = 'Cabos de aço: estado e aderência'
 WHERE texto = 'Cabos de aço: estado e aderência (EN 16625:2013)';

UPDATE checklist_items SET texto = 'Bloqueio dos braços (máx. 150 mm)'
 WHERE texto IN (
   'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020',
   'Bloqueio dos braços (máx. 150 mm) - EN 1493:2020'
 );

UPDATE checklist_items SET texto = 'Marcação CE, manual em português e declaração CE'
 WHERE texto = 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)';
