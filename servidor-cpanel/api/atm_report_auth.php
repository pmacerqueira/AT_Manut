<?php
/**
 * Token partilhado por send-email.php, send-report.php, log-receiver.php e cron-alertas.php (HTTP).
 *
 * Ordem de leitura do segredo ATM_REPORT_AUTH_TOKEN:
 *   1) Variáveis do servidor (cPanel → Environment Variables), via getenv / $_ENV / $_SERVER
 *   2) putenv() em config.local.php ou config.deploy-secrets.php (carregados aqui)
 *   3) Ficheiro opcional atm_report_auth.secret.php (só no servidor; gitignored; bloqueado em .htaccess)
 *
 * Ver docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md (guia para quem não é programador).
 */
declare(strict_types=1);

if (!function_exists('atm_report_auth_bootstrap_env')) {
    function atm_report_auth_bootstrap_env(): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;
        $dir = __DIR__;
        foreach (['config.local.php', 'config.deploy-secrets.php'] as $f) {
            $p = $dir . '/' . $f;
            if (is_file($p)) {
                require_once $p;
            }
        }
        if (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg') {
            $cli = $dir . '/config.cli-env.php';
            if (is_file($cli)) {
                require_once $cli;
            }
        }
        $secretBootstrap = $dir . '/atm_report_auth.secret.php';
        if (is_file($secretBootstrap)) {
            require_once $secretBootstrap;
        }
    }
}

if (!function_exists('atm_report_auth_token')) {
    function atm_report_auth_token(): string
    {
        atm_report_auth_bootstrap_env();
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
        $v = $from('ATM_REPORT_AUTH_TOKEN');
        if ($v !== '') {
            return $v;
        }
        return $from('REDIRECT_ATM_REPORT_AUTH_TOKEN');
    }
}
