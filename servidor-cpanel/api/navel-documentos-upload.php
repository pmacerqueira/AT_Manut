<?php
/**
 * Upload multipart para documentos-api.php (biblioteca NAVEL) com sessão AT validada.
 * Campos: _t (JWT), maquinaId (obrigatório), path (pasta relativa = pasta AT do equipamento), file, documentType, taxonomyNodeId, versionLabel, notes, linkMachineIds (JSON opcional)
 *
 * INSTALAR EM: public_html/api/navel-documentos-upload.php
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
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Use POST multipart']);
    exit;
}

$token = trim((string) ($_POST['_t'] ?? ''));
$auth = jwt_decode($token);
if (!$auth) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Sessão expirada.']);
    exit;
}

$relDirRaw = str_replace('\\', '/', (string) ($_POST['path'] ?? ''));
$relDir = atm_navel_doc_sanitize_assistencia_rel_path($relDirRaw);
if ($relDir === null) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Caminho da pasta não permitido.']);
    exit;
}

$maquinaId = trim((string) ($_POST['maquinaId'] ?? ''));
if ($maquinaId === '' || strlen($maquinaId) > ATM_NAVEL_MACHINE_ID_MAX_LEN || !preg_match('/^[a-zA-Z0-9_-]+$/', $maquinaId)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'maquinaId obrigatório ou inválido. Actualize a aplicação AT_Manut.']);
    exit;
}

try {
    $pdoUpload = get_pdo();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Erro de base de dados.']);
    exit;
}

$expectedFolder = atm_navel_expected_path_for_maquina($pdoUpload, $maquinaId);
if ($expectedFolder === null) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'message' => 'Equipamento não encontrado.']);
    exit;
}
if ($relDir !== $expectedFolder) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'A pasta de destino não corresponde ao equipamento indicado.']);
    exit;
}

$linkRaw = trim((string) ($_POST['linkMachineIds'] ?? ''));
if ($linkRaw !== '') {
    $decodedLinks = json_decode($linkRaw, true);
    if (!is_array($decodedLinks)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'linkMachineIds deve ser um array JSON.']);
        exit;
    }
    $linkIds = atm_navel_doc_normalize_machine_ids($decodedLinks);
    if (count($linkIds) > ATM_NAVEL_MAX_MACHINE_LINKS) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Demasiados equipamentos em linkMachineIds.']);
        exit;
    }
    if ($linkIds !== [] && !atm_navel_doc_verify_maquinas_exist($pdoUpload, $linkIds)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'Um ou mais equipamentos em linkMachineIds não existem.']);
        exit;
    }
    foreach ($linkIds as $lid) {
        $folderForLinked = atm_navel_expected_path_for_maquina($pdoUpload, $lid);
        if ($folderForLinked !== $expectedFolder) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'message' => 'Todos os equipamentos associados devem pertencer à mesma pasta de Assistência Técnica.']);
            exit;
        }
    }
}

if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Ficheiro em falta.']);
    exit;
}

$err = (int) ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE);
if ($err !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Erro no upload.', 'code' => $err]);
    exit;
}

$bearer = atm_navel_integration_token();
if ($bearer === '') {
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'Integração NAVEL não configurada.']);
    exit;
}

$tmp = (string) ($_FILES['file']['tmp_name'] ?? '');
$name = basename(str_replace('\\', '/', (string) ($_FILES['file']['name'] ?? '')));
if ($tmp === '' || $name === '' || str_contains($name, '..')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Nome de ficheiro inválido.']);
    exit;
}

$mime = 'application/octet-stream';
if (function_exists('mime_content_type')) {
    $det = @mime_content_type($tmp);
    if (is_string($det) && $det !== '') {
        $mime = $det;
    }
}

$cfile = curl_file_create($tmp, $mime, $name);
$post = [
    'action' => 'upload',
    'path' => $relDir,
    'file' => $cfile,
];

$optional = ['documentType', 'taxonomyNodeId', 'versionLabel', 'notes', 'linkMachineIds', 'machineLinkSource', 'machineLinkConfidence'];
foreach ($optional as $k) {
    if (!isset($_POST[$k])) {
        continue;
    }
    $v = (string) $_POST[$k];
    if ($v !== '') {
        $post[$k] = $v;
    }
}

$url = atm_navel_doc_api_url();
$ch = curl_init($url);
if ($ch === false) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'message' => 'curl_init falhou']);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $post,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $bearer,
        'Accept: application/json',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_CONNECTTIMEOUT => 30,
]);

$raw = curl_exec($ch);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($http >= 200 && $http < 600 ? $http : 502);
if (!is_string($raw)) {
    echo json_encode(['ok' => false, 'message' => 'Falha de rede para a biblioteca NAVEL.']);
    exit;
}

echo $raw;
