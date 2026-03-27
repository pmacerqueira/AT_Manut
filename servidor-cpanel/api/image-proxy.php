<?php
$_o = $_SERVER['HTTP_ORIGIN'] ?? '';
$_a = ['https://www.navel.pt', 'https://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
header('Access-Control-Allow-Origin: ' . (in_array($_o, $_a, true) ? $_o : 'https://navel.pt'));
header('Access-Control-Allow-Methods: GET');
header('Vary: Origin');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$url = $_GET['url'] ?? '';
if (!$url || !preg_match('#^https?://#i', $url)) {
    http_response_code(400);
    echo 'URL invalido';
    exit;
}

// Extensão no path (quando existe); URLs sem extensão (ex.: CDNs) validam-se pelo MIME após download
$allowed_ext = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
$ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
if ($ext !== '' && !in_array($ext, $allowed_ext)) {
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

$finfo = new finfo(FILEINFO_MIME_TYPE);
$detected = $finfo->buffer($data);
if (!$detected || strpos($detected, 'image/') !== 0) {
    http_response_code(415);
    echo 'Resposta nao e imagem';
    exit;
}
$mime = $detected;

header('Content-Type: ' . $mime);
header('Cache-Control: public, max-age=86400');
header('Content-Length: ' . strlen($data));
echo $data;
