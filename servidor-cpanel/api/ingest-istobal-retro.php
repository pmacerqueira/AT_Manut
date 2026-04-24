<?php
/**
 * ingest-istobal-retro.php
 *
 * Ingestao retroativa de emails ISTOBAL (.eml/.mht/.mhtml) para abrir/atualizar reparacoes.
 * Reaproveita a logica oficial do istobal-webhook.php via HTTP POST.
 *
 * Uso (PowerShell/CMD):
 *   php ingest-istobal-retro.php --dir="C:\emails\istobal" --url="https://www.navel.pt/api/istobal-webhook.php" --token="SEU_TOKEN"
 *
 * Opcoes:
 *   --dir       Pasta com ficheiros .eml/.mht/.mhtml (obrigatorio)
 *   --url       URL do webhook ISTOBAL (obrigatorio)
 *   --token     Token ATM_WEBHOOK_TOKEN (obrigatorio)
 *   --from-date Data minima (YYYY-MM-DD) para filtrar por data do email
 *   --dry-run   Nao envia nada, apenas mostra o que seria enviado
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Este script so pode correr em linha de comandos (CLI).');
}

ini_set('display_errors', '1');
error_reporting(E_ALL);

function arg($name, $default = null) {
    global $argv;
    foreach ($argv as $a) {
        if (strpos($a, "--{$name}=") === 0) {
            return substr($a, strlen($name) + 3);
        }
        if ($a === "--{$name}") return true;
    }
    return $default;
}

function usage($msg = '') {
    if ($msg) fwrite(STDERR, "ERRO: $msg\n\n");
    $txt = "Uso:\n"
        . "  php ingest-istobal-retro.php --dir=\"C:\\emails\\istobal\" --url=\"https://www.navel.pt/api/istobal-webhook.php\" --token=\"SEU_TOKEN\" [--from-date=2026-01-01] [--dry-run]\n";
    fwrite(STDERR, $txt);
    exit(1);
}

function decode_header_value($raw) {
    $raw = trim((string)$raw);
    if ($raw === '') return '';
    if (function_exists('iconv_mime_decode')) {
        $decoded = @iconv_mime_decode($raw, 0, 'UTF-8');
        if (is_string($decoded) && $decoded !== '') return $decoded;
    }
    return $raw;
}

function extract_header($rawEmail, $headerName) {
    $pattern = '/^' . preg_quote($headerName, '/') . ':\s*(.+(?:\r?\n[ \t].+)*)/im';
    if (!preg_match($pattern, $rawEmail, $m)) return '';
    $v = preg_replace('/\r?\n[ \t]+/', ' ', $m[1]); // unfold headers
    return trim((string)$v);
}

function extract_html_body($rawEmail) {
    $raw = str_replace("\r\n", "\n", $rawEmail);

    if (preg_match('/Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^"\n;]+)"?/i', $raw, $bm)) {
        $boundary = trim($bm[1]);
        $parts = explode("--" . $boundary, $raw);
        foreach ($parts as $part) {
            if (stripos($part, 'Content-Type: text/html') === false) continue;

            $splitPos = strpos($part, "\n\n");
            if ($splitPos === false) continue;
            $body = substr($part, $splitPos + 2);

            if (stripos($part, 'Content-Transfer-Encoding: quoted-printable') !== false) {
                $body = quoted_printable_decode($body);
            } elseif (stripos($part, 'Content-Transfer-Encoding: base64') !== false) {
                $body = base64_decode(preg_replace('/\s+/', '', $body));
            }
            return trim((string)$body);
        }
    }

    // Fallback: tentar corpo direto
    $splitPos = strpos($raw, "\n\n");
    if ($splitPos !== false) {
        $body = trim(substr($raw, $splitPos + 2));
        if (stripos($body, '<html') !== false || stripos($body, '<table') !== false) {
            return $body;
        }
    }

    return '';
}

function send_webhook($url, $token, array $payload) {
    $payload = normalize_utf8($payload);
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) return [0, 'json_encode falhou'];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-ATM-Token: ' . $token,
            ],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 30,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        if ($err) return [0, "curl error: $err"];
        return [$code, (string)$resp];
    }

    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nX-ATM-Token: {$token}\r\n",
            'content' => $json,
            'timeout' => 30,
            'ignore_errors' => true,
        ],
    ];
    $ctx = stream_context_create($opts);
    $resp = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (!empty($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $code = (int)$m[1];
    }
    if ($resp === false) {
        $last = error_get_last();
        $msg = is_array($last) ? ($last['message'] ?? 'stream error') : 'stream error';
        return [0, $msg];
    }
    return [$code, (string)$resp];
}

function normalize_utf8($value) {
    if (is_array($value)) {
        $out = [];
        foreach ($value as $k => $v) $out[$k] = normalize_utf8($v);
        return $out;
    }
    if (!is_string($value)) return $value;
    if (function_exists('mb_check_encoding') && mb_check_encoding($value, 'UTF-8')) {
        return $value;
    }
    if (function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($value, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
    }
    $v = @iconv('Windows-1252', 'UTF-8//IGNORE', $value);
    return is_string($v) ? $v : $value;
}

$dir = arg('dir');
$url = arg('url');
$token = arg('token');
$fromDate = arg('from-date', '');
$dryRun = (bool)arg('dry-run', false);

if (!$dir) usage('Parametro --dir em falta.');
if (!$url) usage('Parametro --url em falta.');
    if (!$dryRun && !$token) usage('Parametro --token em falta.');
if (!is_dir($dir)) usage("Pasta nao encontrada: $dir");

$fromTs = 0;
if ($fromDate) {
    $dt = DateTime::createFromFormat('Y-m-d', $fromDate);
    if (!$dt) usage('Formato invalido para --from-date (usar YYYY-MM-DD).');
    $fromTs = $dt->getTimestamp();
}

$baseDir = rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
$files = array_merge(
    glob($baseDir . '*.eml') ?: [],
    glob($baseDir . '*.mht') ?: [],
    glob($baseDir . '*.mhtml') ?: []
);
if (!$files) {
    fwrite(STDOUT, "Nenhum ficheiro .eml/.mht/.mhtml encontrado em: $dir\n");
    exit(0);
}

sort($files);
$sent = 0; $skipped = 0; $errors = 0;

fwrite(STDOUT, "Ingestao retroativa ISTOBAL\n");
fwrite(STDOUT, "Ficheiros: " . count($files) . " | Dry-run: " . ($dryRun ? 'sim' : 'nao') . "\n\n");

foreach ($files as $file) {
    $raw = @file_get_contents($file);
    if ($raw === false || trim($raw) === '') {
        fwrite(STDOUT, "[ERRO] " . basename($file) . " -> nao foi possivel ler\n");
        $errors++;
        continue;
    }

    $from = decode_header_value(extract_header($raw, 'From'));
    $subject = decode_header_value(extract_header($raw, 'Subject'));
    if ($subject === '') {
        $subject = pathinfo($file, PATHINFO_FILENAME);
    }
    $dateHdr = decode_header_value(extract_header($raw, 'Date'));
    $html = extract_html_body($raw);

    $hasIstobalFrom = stripos($from, 'isat@istobal.com') !== false;
    $hasEsAviso = preg_match('/\bES\d+\b/i', $subject) === 1;
    if (!$hasIstobalFrom && !$hasEsAviso) {
        fwrite(STDOUT, "[SKIP] " . basename($file) . " -> remetente nao ISTOBAL ($from)\n");
        $skipped++;
        continue;
    }

    $receivedIso = '';
    if ($dateHdr) {
        $ts = strtotime($dateHdr);
        if ($ts !== false) {
            if ($fromTs > 0 && $ts < $fromTs) {
                fwrite(STDOUT, "[SKIP] " . basename($file) . " -> anterior a --from-date ($fromDate)\n");
                $skipped++;
                continue;
            }
            $receivedIso = date('c', $ts);
        }
    }

    if ($html === '') {
        fwrite(STDOUT, "[ERRO] " . basename($file) . " -> corpo HTML nao encontrado\n");
        $errors++;
        continue;
    }

    $payload = [
        'from' => $from,
        'subject' => $subject,
        'body_html' => $html,
        'received' => $receivedIso ?: date('c'),
    ];

    if ($dryRun) {
        fwrite(STDOUT, "[DRY ] " . basename($file) . " -> assunto: " . ($subject ?: '(sem assunto)') . "\n");
        $sent++;
        continue;
    }

    [$code, $resp] = send_webhook($url, $token, $payload);
    $ok = ($code >= 200 && $code < 300);
    if ($ok) {
        fwrite(STDOUT, "[ OK ] " . basename($file) . " -> HTTP $code\n");
        $sent++;
    } else {
        fwrite(STDOUT, "[ERRO] " . basename($file) . " -> HTTP $code | " . trim($resp) . "\n");
        $errors++;
    }
}

fwrite(STDOUT, "\nResumo: enviados=$sent | ignorados=$skipped | erros=$errors\n");
exit($errors > 0 ? 2 : 0);

