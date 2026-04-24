<?php
/**
 * Proxy de imagens para o frontend — só URLs públicas (mitiga SSRF).
 */
declare(strict_types=1);

$_o = $_SERVER['HTTP_ORIGIN'] ?? '';
$_a = ['https://www.navel.pt', 'https://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
header('Access-Control-Allow-Origin: ' . (in_array($_o, $_a, true) ? $_o : 'https://navel.pt'));
header('Access-Control-Allow-Methods: GET');
header('Vary: Origin');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Verifica se o host resolve apenas para IPs públicos (não RFC1918, loopback, link-local, metadata).
 */
function atm_image_proxy_host_is_public(string $host): bool
{
    $host = strtolower(trim($host));
    if ($host === '' || $host === 'localhost') {
        return false;
    }

    $ips = [];

    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $ips[] = $host;
    } else {
        if (function_exists('dns_get_record')) {
            foreach ([DNS_A, DNS_AAAA] as $type) {
                $rec = @dns_get_record($host, $type);
                if (!is_array($rec)) {
                    continue;
                }
                foreach ($rec as $r) {
                    if (!empty($r['ip'])) {
                        $ips[] = $r['ip'];
                    }
                    if (!empty($r['ipv6'])) {
                        $ips[] = $r['ipv6'];
                    }
                }
            }
        }
        if ($ips === []) {
            $v4 = @gethostbyname($host);
            if ($v4 !== $host && filter_var($v4, FILTER_VALIDATE_IP)) {
                $ips[] = $v4;
            }
        }
    }

    if ($ips === []) {
        return false;
    }

    foreach (array_unique($ips) as $ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }
    }

    return true;
}

$url = $_GET['url'] ?? '';
if (!$url || !preg_match('#^https?://#i', $url)) {
    http_response_code(400);
    echo 'URL invalido';
    exit;
}

$parts = parse_url($url);
if (!is_array($parts) || empty($parts['host'])) {
    http_response_code(400);
    echo 'URL invalido';
    exit;
}

if (!empty($parts['user']) || !empty($parts['pass'])) {
    http_response_code(400);
    echo 'URL invalido';
    exit;
}

$scheme = strtolower((string) ($parts['scheme'] ?? ''));
if (!in_array($scheme, ['http', 'https'], true)) {
    http_response_code(400);
    echo 'URL invalido';
    exit;
}

$host = (string) $parts['host'];
if (!atm_image_proxy_host_is_public($host)) {
    http_response_code(403);
    echo 'Host nao permitido';
    exit;
}

$allowed_ext = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
$ext = strtolower(pathinfo((string) ($parts['path'] ?? ''), PATHINFO_EXTENSION));
if ($ext !== '' && !in_array($ext, $allowed_ext, true)) {
    http_response_code(400);
    echo 'Tipo de ficheiro nao permitido';
    exit;
}

$ctx = stream_context_create([
    'http' => [
        'timeout'   => 5,
        'user_agent'=> 'NavelApp/1.0',
        'follow_location' => 0,
    ],
    'ssl' => [
        'verify_peer'      => true,
        'verify_peer_name' => true,
    ],
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
