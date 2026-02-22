<?php
/**
 * atm_log.php — Escrita de erros da API nos ficheiros atm_*.log
 * =============================================================
 * Permite que erros de BD e PHP no servidor apareçam no painel
 * de Logs do Admin (mesmo formato que os logs do frontend).
 *
 * Formato TSV: timestamp | level | sessionId | userId | route | version | component | action | message | details
 * Para erros API: sessionId = "API", userId = do JWT ou "-", route = r+action
 */

function atm_log_api(string $level, string $component, string $action, string $message, $details = null): void {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
        if (is_dir($logDir) && !file_exists($logDir . '/.htaccess')) {
            @file_put_contents($logDir . '/.htaccess',
                "Options -Indexes\n<Files *.php>\n  Deny from all\n</Files>\n<Files *.log>\n  Deny from all\n</Files>\n"
            );
        }
    }
    if (!is_dir($logDir)) return;

    $month   = date('Y-m');
    $logFile = $logDir . "/atm_{$month}.log";
    $ts      = date('d/m/Y H:i:s');
    $level   = strtoupper(substr($level, 0, 6));
    $session = 'API';
    $user    = substr($GLOBALS['_atm_log_user'] ?? '-', 0, 30);
    $route   = substr($GLOBALS['_atm_log_route'] ?? '-', 0, 60);
    $version = '-';
    $comp    = substr($component, 0, 40);
    $act     = substr($action, 0, 40);
    $msg     = substr($message, 0, 300);
    $det     = $details !== null ? substr(json_encode($details), 0, 500) : '';

    $clean = function($s) { return str_replace(["\t", "\r", "\n"], [' ', '', ' '], (string)$s); };
    $line  = implode("\t", array_map($clean, [$ts, $level, $session, $user, $route, $version, $comp, $act, $msg, $det]));

    @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
}
