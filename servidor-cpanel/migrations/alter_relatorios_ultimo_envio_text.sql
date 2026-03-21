-- ultimo_envio: o frontend grava objecto { data, destinatario }; js_to_row faz json_encode.
-- Coluna DATETIME rejeita ou corrompe esse valor. TEXT + json_cols em data.php resolve.
-- Executar uma vez na base AT_Manut (phpMyAdmin).

ALTER TABLE `relatorios`
  MODIFY COLUMN `ultimo_envio` TEXT NULL DEFAULT NULL
  COMMENT 'JSON {data, destinatario} ou valor legado em texto';
