<?php
/**
 * config.php — Configuração central da API AT_Manut
 *
 * INSTALAR EM: public_html/api/config.php
 *
 * PRODUÇÃO — ordem recomendada (actualizado 2026-04-24, ticket CiberConceito #225838):
 *   1) RewriteRule ^ - [E=ATM_*:...] no .htaccess — única via fiável em
 *      LiteSpeed/LSPHP deste alojamento (mod_env não está carregado; `SetEnv`
 *      é ignorado silenciosamente). Gerido pelo script
 *      `navel-site/scripts/cpanel-migrate-setenv.mjs`.
 *   2) Fallback legado: config.deploy-secrets.php (gitignored). Em produção
 *      está arquivado como `config.deploy-secrets.php.disabled-TS` após a
 *      validação do método 1 — renomear de volta em caso de rollback.
 *
 * Obrigatórios típicos: ATM_DB_USER, ATM_DB_PASS, ATM_DB_NAME, ATM_JWT_SECRET,
 *   ATM_TAXONOMY_TOKEN, ATM_REPORT_AUTH_TOKEN (send-email, send-report, log-receiver, cron HTTP).
 * Opcionais: ATM_DB_HOST (omissão: localhost), ATM_WEBHOOK_TOKEN, ATM_NAVEL_*,
 *   ATM_NAVEL_DOC_PROXY_MAX_RESPONSE_BYTES (proxy documentos; omissão 12 MiB),
 *   ATM_TECNICO_HORARIO_JSON, ATM_TECNICO_HORARIO_DISABLED
 *
 * Leitura: atm_env() — getenv() + $_ENV + $_SERVER + REDIRECT_*.
 *
 * DESENVOLVIMENTO LOCAL: copiar config.local.php.example → config.local.php (gitignored)
 * com putenv('...') para cada variável, OU exportar as variáveis no shell.
 * Para testes HTTP locais sem env: putenv('ATM_SKIP_CONFIG_VALIDATION=1'); no config.local.php
 * (nunca em produção).
 */

declare(strict_types=1);

/**
 * Variáveis do painel nem sempre chegam a getenv(); em PHP-FPM costumam estar em $_SERVER / $_ENV.
 * Após rewrites, alguns hosts expõem REDIRECT_NOME.
 */
function atm_env(string $key): string {
    $from = static function (string $k): string {
        $g = getenv($k);
        if (is_string($g) && $g !== '') {
            return $g;
        }
        if (isset($_ENV[$k]) && is_string($_ENV[$k]) && $_ENV[$k] !== '') {
            return $_ENV[$k];
        }
        if (isset($_SERVER[$k]) && is_string($_SERVER[$k]) && $_SERVER[$k] !== '') {
            return $_SERVER[$k];
        }
        return '';
    };
    $v = $from($key);
    if ($v !== '') {
        return $v;
    }
    return $from('REDIRECT_' . $key);
}

if (is_file(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

/**
 * Fallback quando SetEnv (.htaccess) e variáveis do painel não estão disponíveis.
 * Deve conter sobretudo putenv('ATM_*=...') — último recurso; preferir .htaccess.
 * NUNCA versionar — ver .gitignore e docs/SEGURANCA-REVISAO-NAVEL-PT.md.
 */
if (is_file(__DIR__ . '/config.deploy-secrets.php')) {
    require_once __DIR__ . '/config.deploy-secrets.php';
}

// ── Base de dados MySQL (cPanel) ──────────────────────────────────────────────
define('DB_HOST', atm_env('ATM_DB_HOST') ?: 'localhost');
define('DB_NAME', atm_env('ATM_DB_NAME'));
define('DB_USER', atm_env('ATM_DB_USER'));
define('DB_PASS', atm_env('ATM_DB_PASS'));

// ── Segurança JWT ─────────────────────────────────────────────────────────────
define('JWT_SECRET', atm_env('ATM_JWT_SECRET'));

// Duração do token em segundos (28800 = 8 horas)
define('JWT_TTL', 28800);

// ── Token secreto para webhook ISTOBAL (Power Automate) ──────────────────────
// Omissão: webhook recusa todos os pedidos (401) até ser definido.
define('ATM_WEBHOOK_TOKEN', atm_env('ATM_WEBHOOK_TOKEN'));

// ── Token partilhado com a Área Reservada NAVEL (taxonomy-nodes.php) ─────────
define('ATM_TAXONOMY_TOKEN', atm_env('ATM_TAXONOMY_TOKEN'));

// ── Biblioteca NAVEL (documentos-api.php) — Fase C ────────────────────────────
define('ATM_NAVEL_DOCUMENTOS_API_URL', atm_env('ATM_NAVEL_DOCUMENTOS_API_URL') ?: 'https://navel.pt/documentos-api.php');
define('ATM_NAVEL_DOC_INTEGRATION_TOKEN', atm_env('ATM_NAVEL_DOC_INTEGRATION_TOKEN'));
/** Resposta máxima do documentos-api aceite pelo proxy (evita OOM no json_decode). 0 = sem limite. */
define('ATM_NAVEL_DOC_PROXY_MAX_RESPONSE_BYTES', (static function (): int {
    $raw = atm_env('ATM_NAVEL_DOC_PROXY_MAX_RESPONSE_BYTES');
    if ($raw === '') {
        return 12 * 1024 * 1024;
    }
    return max(0, (int) $raw);
})());

// ── Origens CORS permitidas ───────────────────────────────────────────────────
define('CORS_ORIGINS', [
    'https://www.navel.pt',
    'https://navel.pt',
    'http://localhost:5173',
    'http://localhost:4173',
]);

define('ATM_TECNICO_HORARIO_JSON', atm_env('ATM_TECNICO_HORARIO_JSON') ?: (__DIR__ . '/tecnico_horario_restrito.json'));

/**
 * Em pedidos HTTP, exige segredos definidos (env ou config.local.php).
 * CLI (cron, scripts de manutenção) não valida aqui — usar env no próprio job.
 */
function atm_config_assert_production_ready(): void {
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    if (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg') {
        return;
    }
    if (atm_env('ATM_SKIP_CONFIG_VALIDATION') === '1') {
        return;
    }

    $missing = [];
    if (JWT_SECRET === '') {
        $missing[] = 'ATM_JWT_SECRET';
    } elseif (strlen(JWT_SECRET) < 24) {
        $missing[] = 'ATM_JWT_SECRET (demasiado curto; use >= 32 caracteres aleatórios)';
    }
    if (DB_NAME === '') {
        $missing[] = 'ATM_DB_NAME';
    }
    if (DB_USER === '') {
        $missing[] = 'ATM_DB_USER';
    }
    if (DB_PASS === '') {
        $missing[] = 'ATM_DB_PASS';
    }
    if (ATM_TAXONOMY_TOKEN === '') {
        $missing[] = 'ATM_TAXONOMY_TOKEN';
    }

    if ($missing === []) {
        return;
    }

    error_log('[ATM-CONFIG] Variáveis em falta ou inválidas: ' . implode(', ', $missing));

    if (!headers_sent()) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'ok'    => false,
        'error' => 'misconfigured',
        'hint'  => 'Defina as variáveis no cPanel (Environment Variables). Ver comentário no topo de config.php.',
    ], JSON_UNESCAPED_UNICODE);
    exit(1);
}

atm_config_assert_production_ready();
