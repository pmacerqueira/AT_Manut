<?php
/**
 * db.php — Ligação PDO, JWT e utilitários da API AT_Manut
 *
 * INSTALAR EM: public_html/api/db.php
 */

// ── PDO Singleton ──────────────────────────────────────────────────────────────

/**
 * Devolve a ligação PDO à BD.
 * @return PDO
 */
function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

// ── JWT ───────────────────────────────────────────────────────────────────────

function b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload): string {
    $header  = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = b64url_encode(json_encode($payload));
    $sig     = b64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function jwt_decode(?string $token): ?array {
    if (!$token) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(b64url_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

// ── Respostas JSON ────────────────────────────────────────────────────────────

function json_ok($data = null, int $code = 200): void {
    http_response_code($code);
    $out = ['ok' => true];
    if ($data !== null) $out['data'] = $data;
    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── CORS ──────────────────────────────────────────────────────────────────────

function send_cors(): void {
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = defined('CORS_ORIGINS') ? CORS_ORIGINS : [];
    $o = in_array($origin, $allowed, true) ? $origin : ($allowed[0] ?? '*');
    header('Access-Control-Allow-Origin: ' . $o);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Max-Age: 3600');
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
}

// ── Conversão camelCase ↔ snake_case ──────────────────────────────────────────

function camel_to_snake(string $s): string {
    return strtolower(preg_replace('/([A-Z])/', '_$1', lcfirst($s)));
}

function snake_to_camel(string $s): string {
    return lcfirst(str_replace('_', '', ucwords($s, '_')));
}

/**
 * Converte uma linha BD (snake_case) para objecto JS (camelCase).
 * Descodifica automaticamente os campos JSON listados em $json_cols.
 */
function row_to_js(array $row, array $json_cols = []): array {
    $out = [];
    foreach ($row as $k => $v) {
        $ck = snake_to_camel($k);
        if (in_array($k, $json_cols, true) && is_string($v) && $v !== '') {
            $decoded = json_decode($v, true);
            $v = ($decoded !== null) ? $decoded : $v;
        }
        // Converter 0/1 para booleano em campos específicos
        if ($k === 'assinado_pelo_cliente') $v = (bool)$v;
        $out[$ck] = $v;
    }
    return $out;
}

/**
 * Prepara os dados JS (camelCase) para INSERT/UPDATE no MySQL (snake_case).
 * Codifica arrays/objectos em JSON. Devolve [colunas, valores, params].
 *
 * $allowed: lista branca de colunas permitidas (evita injecção de campos).
 */
function js_to_row(array $data, array $allowed): array {
    $cols   = [];
    $params = [];
    foreach ($data as $ck => $v) {
        $col = camel_to_snake($ck);
        if (!in_array($col, $allowed, true)) continue;
        $cols[] = $col;
        if (is_array($v) || is_object($v)) {
            $params[] = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif ($v === '' || $v === null) {
            $params[] = null;
        } else {
            $params[] = $v;
        }
    }
    return [$cols, $params];
}
