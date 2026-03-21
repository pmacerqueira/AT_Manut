<?php
header('Content-Type: text/plain; charset=utf-8');
echo "=== NAVEL Diagnostico Rapido ===\n\n";

$target = __DIR__ . '/send-email.php';
if (!file_exists($target)) $target = dirname(__DIR__) . '/send-email.php';
echo "send-email.php: $target\n";
echo "Exists: " . (file_exists($target) ? 'YES' : 'NO') . "\n";
if (file_exists($target)) {
    echo "Size: " . filesize($target) . " bytes\n";
    echo "Modified: " . date('Y-m-d H:i:s', filemtime($target)) . "\n";
}

echo "\npost_max_size: " . ini_get('post_max_size') . "\n";
echo "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";

$logFile = __DIR__ . '/atm_debug.log';
if (!file_exists($logFile)) $logFile = dirname(__DIR__) . '/atm_debug.log';
echo "\natm_debug.log: " . (file_exists($logFile) ? filesize($logFile) . " bytes" : "NOT FOUND") . "\n";

echo "\nTest write to log... ";
$wrote = @error_log(date('Y-m-d H:i:s') . " [TEST] clear-cache.php write test\n", 3, $logFile);
echo ($wrote ? "OK" : "FAILED (permissions?)") . "\n";

echo "\nDone.\n";
