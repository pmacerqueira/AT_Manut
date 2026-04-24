<?php
/**
 * Stream de download da biblioteca NAVEL (documentos-api.php) com sessão AT validada.
 * POST JSON: { "_t": "<JWT AT>", "path": "Assistencia Tecnica/.../ficheiro.pdf", "inline": true }
 *
 * INSTALAR EM: public_html/api/navel-documentos-download.php
 */
declare(strict_types=1);

ini_set('display_errors', '0');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/navel-doc-lib.php';

$_cors_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$_cors_allowed = ['https://www.navel.pt', 'https://navel.pt', 'http://www.navel.pt', 'http://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
header('Access-Control-Allow-Origin: ' . (in_array($_cors_origin, $_cors_allowed, true) ? $_cors_origin : 'https://www.navel.pt'));
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 3600');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"message":"Use POST com JSON"}';
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"message":"JSON inválido"}';
    exit;
}

$token = trim((string) ($body['_t'] ?? ''));
$path = trim((string) ($body['path'] ?? ''));
$inline = !empty($body['inline']);

$auth = jwt_decode($token);
if (!$auth) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"message":"Sessão expirada."}';
    exit;
}

$norm = atm_navel_doc_sanitize_assistencia_rel_path(str_replace('\\', '/', $path));
if ($norm === null) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"message":"Caminho não permitido."}';
    exit;
}

$bearer = atm_navel_integration_token();
if ($bearer === '') {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"message":"Integração NAVEL não configurada."}';
    exit;
}

$query = [
    'action' => 'download',
    'path' => $norm,
];
if ($inline) {
    $query['inline'] = '1';
}

$url = atm_navel_doc_api_url() . '?' . http_build_query($query);
$ch = curl_init($url);
if ($ch === false) {
    http_response_code(502);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $bearer,
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 20,
    CURLOPT_HEADER => true,
]);

$response = curl_exec($ch);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

if (!is_string($response)) {
    http_response_code(502);
    exit;
}

$headerBlock = substr($response, 0, $headerSize);
$fileBody = substr($response, $headerSize);

if ($http < 200 || $http >= 300) {
    http_response_code($http >= 400 ? $http : 502);
    header('Content-Type: application/json; charset=utf-8');
    echo $fileBody !== '' ? $fileBody : '{"ok":false,"message":"Download falhou"}';
    exit;
}

$contentType = 'application/octet-stream';
$contentDisposition = null;
$contentLength = null;
foreach (explode("\r\n", $headerBlock) as $line) {
    if (stripos($line, 'Content-Type:') === 0) {
        $contentType = trim(substr($line, strlen('Content-Type:')));
    }
    if (stripos($line, 'Content-Disposition:') === 0) {
        $contentDisposition = trim(substr($line, strlen('Content-Disposition:')));
    }
    if (stripos($line, 'Content-Length:') === 0) {
        $contentLength = trim(substr($line, strlen('Content-Length:')));
    }
}

header('Content-Type: ' . $contentType);
if ($contentDisposition) {
    header('Content-Disposition: ' . $contentDisposition);
}
if ($contentLength !== null && is_numeric($contentLength)) {
    header('Content-Length: ' . $contentLength);
} else {
    header('Content-Length: ' . (string) strlen($fileBody));
}

echo $fileBody;
