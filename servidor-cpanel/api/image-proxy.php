<?php
header('Access-Control-Allow-Origin: https://www.navel.pt');
header('Access-Control-Allow-Methods: GET');
header('Vary: Origin');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$url = $_GET['url'] ?? '';
if (!$url || !preg_match('#^https?://#i', $url)) {
    http_response_code(400);
    echo 'URL invalido';
    exit;
}

$allowed_ext = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
$ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
if (!in_array($ext, $allowed_ext)) {
    http_response_code(400);
    echo 'Tipo de ficheiro nao permitido';
    exit;
}

$ctx = stream_context_create([
    'http' => ['timeout' => 5, 'user_agent' => 'NavelApp/1.0'],
    'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
]);
$data = @file_get_contents($url, false, $ctx);
if ($data === false || strlen($data) < 100) {
    http_response_code(502);
    echo 'Nao foi possivel obter a imagem';
    exit;
}

$mime = 'image/png';
$finfo = new finfo(FILEINFO_MIME_TYPE);
$detected = $finfo->buffer($data);
if ($detected && strpos($detected, 'image/') === 0) $mime = $detected;

header('Content-Type: ' . $mime);
header('Cache-Control: public, max-age=86400');
header('Content-Length: ' . strlen($data));
echo $data;
