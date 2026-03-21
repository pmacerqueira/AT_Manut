<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo "=== NAVEL Email Diagnostic ===\n\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n\n";

echo "--- File checks ---\n";
$dir = __DIR__;
echo "Script dir: $dir\n";

$seFile = "$dir/send-email.php";
if (!file_exists($seFile)) $seFile = dirname($dir) . "/send-email.php";
if (file_exists($seFile)) {
    echo "  send-email.php: EXISTS (" . filesize($seFile) . " bytes, " . date('Y-m-d H:i:s', filemtime($seFile)) . ")\n";
    $first200 = file_get_contents($seFile, false, null, 0, 200);
    echo "  First 200 chars: " . preg_replace('/\s+/', ' ', $first200) . "\n";
} else {
    echo "  send-email.php: NOT FOUND\n";
}

$files = ['fpdf.php', 'atm_log.php', 'config.php'];
foreach ($files as $f) {
    $path = "$dir/$f";
    $parentPath = dirname($dir) . "/$f";
    if (file_exists($path)) {
        echo "  $f: EXISTS (" . filesize($path) . " bytes)\n";
    } elseif (file_exists($parentPath)) {
        echo "  ../$f: EXISTS (" . filesize($parentPath) . " bytes) [parent dir]\n";
    } else {
        echo "  $f: NOT FOUND\n";
    }
}

$htaccess = "$dir/.htaccess";
if (file_exists($htaccess)) {
    echo "  .htaccess: EXISTS (" . filesize($htaccess) . " bytes)\n";
    echo "  .htaccess content:\n" . file_get_contents($htaccess) . "\n";
} else {
    echo "  .htaccess: NOT FOUND (IMPORTANTE: faz upload!)\n";
}
echo "\n";

echo "--- Extensions ---\n";
echo "  json: " . (extension_loaded('json') ? 'YES' : 'NO') . "\n";
echo "  gd: " . (extension_loaded('gd') ? 'YES' : 'NO') . "\n";
echo "  mbstring: " . (extension_loaded('mbstring') ? 'YES' : 'NO') . "\n";
echo "  mail: " . (function_exists('mail') ? 'YES' : 'NO') . "\n\n";

echo "--- POST test to send-email.php ---\n";
$testUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
         . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/send-email.php';
echo "  URL: $testUrl\n";

$testPayload = json_encode(['token' => 'test', '_diag' => true]);
$ch = null;
if (function_exists('curl_init')) {
    $ch = curl_init($testUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $testPayload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    echo "  HTTP code: $httpCode\n";
    if ($err) echo "  cURL error: $err\n";
    echo "  Response (first 500 chars): " . substr($resp, 0, 500) . "\n";
} else {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $testPayload,
        'timeout' => 10,
    ]]);
    $resp = @file_get_contents($testUrl, false, $ctx);
    echo "  Response: " . ($resp !== false ? substr($resp, 0, 500) : "FAILED (blocked?)") . "\n";
    if (isset($http_response_header)) {
        echo "  Headers: " . implode(' | ', array_slice($http_response_header, 0, 3)) . "\n";
    }
}
echo "\n";

echo "--- Apache error log (last 20 lines if accessible) ---\n";
$errLog = ini_get('error_log');
echo "  error_log setting: " . ($errLog ?: '(not set)') . "\n";
if ($errLog && file_exists($errLog) && is_readable($errLog)) {
    $lines = file($errLog);
    $last = array_slice($lines, -20);
    foreach ($last as $l) echo "  " . trim($l) . "\n";
} else {
    echo "  (not accessible from PHP)\n";
}
echo "\n";

echo "--- Last 50 lines of atm_debug.log ---\n";
$logFile = "$dir/atm_debug.log";
if (!file_exists($logFile)) $logFile = dirname($dir) . "/atm_debug.log";
if (file_exists($logFile)) {
    echo "  File: $logFile (" . filesize($logFile) . " bytes)\n";
    $lines = file($logFile);
    $last = array_slice($lines, -50);
    foreach ($last as $l) echo "  " . trim($l) . "\n";
} else {
    echo "  No atm_debug.log found\n";
}

echo "\n=== Done ===\n";
