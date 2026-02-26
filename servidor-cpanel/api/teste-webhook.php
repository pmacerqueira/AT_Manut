<?php
header('Content-Type: application/json');
echo json_encode([
    'ok'      => true,
    'php'     => phpversion(),
    'method'  => $_SERVER['REQUEST_METHOD'],
    'config'  => file_exists(__DIR__ . '/config.php') ? 'OK' : 'FALTA',
    'db'      => file_exists(__DIR__ . '/db.php')     ? 'OK' : 'FALTA',
]);
