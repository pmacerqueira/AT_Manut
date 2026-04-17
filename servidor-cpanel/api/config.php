<?php
/**
 * config.php — Configuração central da API AT_Manut
 *
 * INSTALAR EM: public_html/api/config.php
 *
 * Credenciais: usa variáveis de ambiente quando definidas (recomendado em produção).
 * Em cPanel: Advanced → Environment Variables.
 * Fallback: valores abaixo (alterar antes de publicar).
 *
 * Variáveis de ambiente: ATM_DB_HOST, ATM_DB_NAME, ATM_DB_USER, ATM_DB_PASS,
 * ATM_JWT_SECRET, ATM_REPORT_AUTH_TOKEN, ATM_TECNICO_HORARIO_JSON, ATM_TECNICO_HORARIO_DISABLED.
 */

// ── Base de dados MySQL (cPanel) ──────────────────────────────────────────────
define('DB_HOST', getenv('ATM_DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('ATM_DB_NAME') ?: 'navel_atmanut');
define('DB_USER', getenv('ATM_DB_USER') ?: 'navel_atmanut');
define('DB_PASS', getenv('ATM_DB_PASS') ?: 'Za+7e\'_"5-Ut}~M');

// ── Segurança JWT ─────────────────────────────────────────────────────────────
define('JWT_SECRET', getenv('ATM_JWT_SECRET') ?: 'xK9mP2vL5nQ8wR3tY6uI0oA7sD4fG1hJ2kZ5bN8cV0xM3qW9eR2tY');

// Duração do token em segundos (28800 = 8 horas)
define('JWT_TTL', 28800);

// ── Token secreto para webhook ISTOBAL (Power Automate) ──────────────────────
// Gera um token forte em: https://www.uuidgenerator.net/ ou similar
// Deve ser igual ao valor configurado no HTTP Header do Power Automate
define('ATM_WEBHOOK_TOKEN', getenv('ATM_WEBHOOK_TOKEN') ?: '35338ce1-8050-4770-aa2f-8d8fb9912215');

// ── Token partilhado com a Área Reservada NAVEL (taxonomy-nodes.php) ─────────
// Consumido por: navel-site → documentos-api-config.php (campo taxonomy_auth_token).
// Se alterares aqui, altera lá também. Em alternativa, define a var ambiente ATM_TAXONOMY_TOKEN.
define('ATM_TAXONOMY_TOKEN', getenv('ATM_TAXONOMY_TOKEN') ?: 'a8f3c19d-4b25-47e6-9f8a-3c2e1d0b7a95');

// ── Origens CORS permitidas ───────────────────────────────────────────────────
define('CORS_ORIGINS', [
    'https://www.navel.pt',
    'https://navel.pt',
    'http://localhost:5173',
    'http://localhost:4173',
]);

define('ATM_TECNICO_HORARIO_JSON', getenv('ATM_TECNICO_HORARIO_JSON') ?: (__DIR__ . '/tecnico_horario_restrito.json'));
