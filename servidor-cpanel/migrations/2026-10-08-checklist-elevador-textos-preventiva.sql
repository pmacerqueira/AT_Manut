-- Manutenção periódica de elevadores: perguntas alinhadas com a reflexão.
-- Não reescreve checklist_snapshot. Não altera compressores nem montagem.
-- Correr na publicação, depois de 2026-10-08-checklist-elevador-sem-citacao-norma.sql.

UPDATE checklist_items SET texto = 'Marcação CE no equipamento'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Marcação CE presente no equipamento';

UPDATE checklist_items SET texto = 'Manual de instruções do fabricante'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Manual de instruções em português disponível e legível';

UPDATE checklist_items SET texto = 'Declaração de conformidade do fabricante'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Declaração CE de conformidade disponível';

UPDATE checklist_items SET texto = 'Outros dispositivos de segurança previstos no manual'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Dispositivos de segurança em funcionamento correto';

UPDATE checklist_items SET texto = 'Registo de intervenções'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Registo de intervenções e manutenção periódica atualizado';

UPDATE checklist_items SET texto = 'Fixação e ancoragem visíveis, sem validar a instalação original'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Condições de montagem e fixação';

UPDATE checklist_items SET texto = 'Válvula limitadora de pressão e fugas'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Válvula limitadora de pressão e ausência de fugas';

UPDATE checklist_items SET texto = 'Bloqueio dos braços nos suportes de carga'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Suportes de carga: bloqueio dos braços (máx. 150 mm)';

UPDATE checklist_items SET texto = 'Guarda-corpo e proteções'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Guarda-corpo e proteções em boas condições';

UPDATE checklist_items SET texto = 'Teste do botão de emergência'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto IN (
     'Comandos e botão de emergência: teste de funcionamento',
     'Botão de emergência: teste de funcionamento',
     'Botão de emergência e paragem de emergência: teste de funcionamento'
   );

UPDATE checklist_items SET texto = 'Ruído e vibração na subida e na descida'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Ruídos e vibrações anormais';

UPDATE checklist_items SET texto = 'Porca de carga e cabo de segurança, quando existirem'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Desgaste da porca principal e cabo de segurança (RAV261)';

UPDATE checklist_items SET texto = 'Polias e roçadeiras: desgaste observado'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Polias e roçadeiras em bom estado';

UPDATE checklist_items SET texto = 'Nível de óleo do redutor'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Nível de óleo do redutor e atestar se necessário';

UPDATE checklist_items SET texto = 'Teste funcional com carga: veículo na função habitual, 2 ciclos completos de subida e descida'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto IN ('Teste de comando subida e descida', 'Teste funcional de subida e descida');

UPDATE checklist_items SET texto = 'Sistema hidráulico: fugas de óleo'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Sistema hidráulico: verificar vazamentos de óleo';

UPDATE checklist_items SET texto = 'Tensão de alimentação e sequência de fases observadas'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto = 'Verificação da tensão de alimentação e sequência de fases';

UPDATE checklist_items SET texto = 'Estrutura visível'
 WHERE subcategoria_id IN ('sub1','sub2','sub4','sub12','sub13')
   AND texto IN (
     'Estado geral de conservação do equipamento',
     'Conservação visível de estrutura e pintura'
   );

UPDATE checklist_items SET texto = 'Sequência de fases e indicador; cabos e terminais'
 WHERE texto = 'Sequência de fases e indicador; cabos e terminais em bom estado';

UPDATE checklist_items SET texto = 'Sequência de fases; cabos e terminais'
 WHERE texto = 'Sequência de fases; cabos e terminais em bom estado';

UPDATE checklist_items SET texto = 'Sequência de fases; cabos entre colunas e terminais'
 WHERE texto = 'Sequência de fases; cabos entre colunas e terminais em bom estado';

-- Separar redutor, motor e travão. A ordem dos pontos seguintes sobe duas posições.
UPDATE checklist_items SET ordem = ordem + 2
 WHERE id IN ('ch8','ch9','ch10','ch11','ch12','ch13','ch14','ch14b')
   AND (SELECT COUNT(*) FROM (SELECT id FROM checklist_items WHERE id = 'ch7b') AS ja) = 0;

UPDATE checklist_items SET texto = 'Redutor: ruído e vibração' WHERE id = 'ch7';

INSERT INTO checklist_items (id, subcategoria_id, ordem, texto)
SELECT 'ch7b', 'sub1', 8, 'Motor de Accionamento'
 WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE id = 'ch7b');

INSERT INTO checklist_items (id, subcategoria_id, ordem, texto)
SELECT 'ch7c', 'sub1', 9, 'Trancas de Segurança'
 WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE id = 'ch7c');

UPDATE checklist_items SET ordem = ordem + 2
 WHERE id IN ('ch108','ch109','ch110','ch111','ch112','ch113','ch114','ch114b')
   AND (SELECT COUNT(*) FROM (SELECT id FROM checklist_items WHERE id = 'ch107b') AS ja) = 0;

UPDATE checklist_items SET texto = 'Redutor: ruído e vibração' WHERE id = 'ch107';

INSERT INTO checklist_items (id, subcategoria_id, ordem, texto)
SELECT 'ch107b', 'sub13', 8, 'Motor de Accionamento'
 WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE id = 'ch107b');

INSERT INTO checklist_items (id, subcategoria_id, ordem, texto)
SELECT 'ch107c', 'sub13', 9, 'Trancas de Segurança'
 WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE id = 'ch107c');

-- Onde já existe um teste de subida e descida, a última linha fica só a limpeza.
UPDATE checklist_items SET texto = 'Limpeza do equipamento no fim da intervenção'
 WHERE id IN ('ch34b','ch74b','ch94b');

-- Onde a última linha era o único teste, passa a ser o teste funcional e a limpeza fica à parte.
UPDATE checklist_items SET texto = 'Teste funcional com carga: veículo na função habitual, 2 ciclos completos de subida e descida'
 WHERE id IN ('ch14b','ch114b');

INSERT INTO checklist_items (id, subcategoria_id, ordem, texto)
SELECT 'ch14c', 'sub1', 18, 'Limpeza do equipamento no fim da intervenção'
 WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE id = 'ch14c');

INSERT INTO checklist_items (id, subcategoria_id, ordem, texto)
SELECT 'ch114c', 'sub13', 18, 'Limpeza do equipamento no fim da intervenção'
 WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE id = 'ch114c');

UPDATE checklist_items SET texto = 'Motor de Accionamento' WHERE id IN ('ch7b', 'ch107b');
UPDATE checklist_items SET texto = 'Trancas de Segurança' WHERE id IN ('ch7c', 'ch107c');
