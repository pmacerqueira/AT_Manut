<?php
/**
 * log-receiver.php — Receptor de logs da aplicação AT_Manut
 * ===========================================================
 * Recebe entradas de log enviadas pelo browser (em batch) e
 * guarda num ficheiro rotativo em public_html/api/logs/.
 *
 * INSTALAR EM: public_html/api/log-receiver.php
 *
 * Ficheiro de log: public_html/api/logs/atm_YYYY-MM.log
 *  - Um ficheiro por mês
 *  - Rotação automática quando ultrapassa 20 MB
 *  - Formato: TSV (Timestamp | Nível | Sessão | User | Rota | Versão | Componente | Acção | Mensagem | Detalhes)
 *
 * Segurança:
 *  - Autenticado por token (mesmo AUTH_TOKEN do send-email.php)
 *  - Apenas aceita POST
 *  - Limita o tamanho do payload (máx. 100 KB por pedido)
 *  - Pasta logs/ protegida por .htaccess (sem listagem, sem execução PHP)
 */

ini_set('display_errors', '0');

// Fallback json_encode (extensão pode não estar activa)
if (!function_exists('json_encode')) {
    function json_encode($d, $o = 0) {
        if (is_bool($d)) return $d ? 'true' : 'false';
        if (is_null($d)) return 'null';
        if (is_int($d) || is_float($d)) return (string)$d;
        if (is_string($d)) return '"' . str_replace(['"','\\',"\n","\r","\t"], ['\"','\\\\','\n','\r','\t'], $d) . '"';
        if (is_array($d)) { $p=[]; foreach($d as $k=>$v) $p[]='"'.$k.'":'.json_encode($v); return '{'.implode(',',$p).'}'; }
        return 'null';
    }
}

// CORS headers imediatos
$_o = $_SERVER['HTTP_ORIGIN'] ?? '';
$_a = ['https://www.navel.pt', 'https://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
header('Access-Control-Allow-Origin: ' . (in_array($_o, $_a, true) ? $_o : 'https://www.navel.pt'));
header('Vary: Origin');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Metodo nao permitido.']);
    exit;
}

// ── Autenticação ─────────────────────────────────────────────────────────────
define('AUTH_TOKEN', getenv('ATM_REPORT_AUTH_TOKEN') ?: 'Navel2026$Api!Key#xZ99');

// Token em base64 (sem $ # ! → WAF não filtra); fallback para texto plano
function b64safe_log($str) {
    if (empty($str)) return '';
    $d = base64_decode($str, true);
    return ($d !== false) ? trim($d) : trim($str);
}
$token = b64safe_log($_POST['auth_token_b64'] ?? '')
       ?: trim($_POST['auth_token'] ?? '');
if ($token !== AUTH_TOKEN) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Token invalido.']);
    exit;
}

// ── Receber e validar payload ─────────────────────────────────────────────────
$entries_json = $_POST['entries'] ?? '';
if (strlen($entries_json) > 102400) {  // 100 KB máx. por pedido
    http_response_code(413);
    echo json_encode(['ok' => false, 'message' => 'Payload demasiado grande.']);
    exit;
}

$entries = json_decode($entries_json, true);
if (!is_array($entries) || empty($entries)) {
    $atmLog = __DIR__ . '/atm_log.php';
    if (!file_exists($atmLog)) $atmLog = __DIR__ . '/api/atm_log.php';
    if (file_exists($atmLog)) {
        require_once $atmLog;
        $GLOBALS['_atm_log_user'] = 'log-receiver';
        $GLOBALS['_atm_log_route'] = 'log-receiver';
        if (function_exists('atm_log_api')) {
            atm_log_api('warn', 'log-receiver', 'payload', 'Payload de logs inválido ou vazio recebido', ['len' => strlen($entries_json ?? '')]);
        }
    }
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Entradas invalidas.']);
    exit;
}

// ── Pasta e ficheiro de log ───────────────────────────────────────────────────
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);

    // Proteger a pasta: sem listagem, sem execução de PHP
    file_put_contents($logDir . '/.htaccess',
        "Options -Indexes\n" .
        "<Files *.php>\n  Deny from all\n</Files>\n" .
        "<Files *.log>\n  Deny from all\n</Files>\n"
    );
}

$month   = date('Y-m');
$logFile = $logDir . "/atm_{$month}.log";

// Rotação: se o ficheiro do mês ultrapassar 20 MB, cria arquivo e começa novo
$maxBytes = 20 * 1024 * 1024;  // 20 MB
if (file_exists($logFile) && filesize($logFile) >= $maxBytes) {
    $archive = $logDir . "/atm_{$month}_" . date('d-His') . '.log';
    rename($logFile, $archive);
}

// ── Escrever entradas ─────────────────────────────────────────────────────────
$lines = [];
foreach ($entries as $e) {
    if (!is_array($e)) continue;

    $ts        = isset($e['ts']) ? date('d/m/Y H:i:s', (int)($e['ts'] / 1000)) : date('d/m/Y H:i:s');
    $level     = strtoupper(substr($e['level']     ?? 'info',   0, 6));
    $session   = substr($e['sessionId'] ?? '-', 0, 20);
    $user      = substr($e['userId']    ?? '-', 0, 30);
    $route     = substr($e['route']     ?? '-', 0, 60);
    $version   = substr($e['version']   ?? '-', 0, 10);
    $component = substr($e['component'] ?? '-', 0, 40);
    $action    = substr($e['action']    ?? '-', 0, 40);
    $message   = substr($e['message']   ?? '-', 0, 300);
    $details   = isset($e['details']) ? substr(json_encode($e['details']), 0, 500) : '';

    // Sanitizar tabulações (TSV)
    $clean = function($s) { return str_replace(["\t", "\r", "\n"], [' ', '', ' '], $s); };

    $lines[] = implode("\t", array_map($clean, [
        $ts, $level, $session, $user, $route, $version, $component, $action, $message, $details
    ]));
}

if (!empty($lines)) {
    file_put_contents($logFile, implode("\n", $lines) . "\n", FILE_APPEND | LOCK_EX);
}

// ── Limpeza de ficheiros com mais de 90 dias ──────────────────────────────────
// Corre com 5% de probabilidade para não atrasar cada pedido
if (mt_rand(1, 20) === 1) {
    $cutoff = time() - 90 * 24 * 3600;
    foreach (glob($logDir . '/atm_*.log') as $f) {
        if (filemtime($f) < $cutoff) @unlink($f);
    }
}

echo json_encode(['ok' => true, 'saved' => count($lines)]);
