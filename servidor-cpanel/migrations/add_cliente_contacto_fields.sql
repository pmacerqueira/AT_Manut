-- Migration: adicionar campos nome_contacto e assinatura_contacto à tabela clientes
-- Estes campos guardam o nome e assinatura digital do contacto do cliente
-- para pré-preenchimento em futuras manutenções (evita repetir dados).
-- Executar em phpMyAdmin ou via CLI no cPanel.
-- Data: 2026-03-12

ALTER TABLE `clientes`
  ADD COLUMN `nome_contacto`       VARCHAR(255) DEFAULT NULL AFTER `notas`,
  ADD COLUMN `assinatura_contacto` LONGTEXT     DEFAULT NULL AFTER `nome_contacto`;
