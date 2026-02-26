<?php
/**
 * teste-istobal-post.php — Teste do webhook ISTOBAL
 * APAGAR DO SERVIDOR APÓS OS TESTES!
 */

// ⚠️ Coloca aqui o token real que definiste no config.php
$TOKEN = '35338ce1-8050-4770-aa2f-8d8fb9912215';

$payload = json_encode([
    'from'      => 'isat@istobal.com',
    'subject'   => 'IFS - Confirmación de Aviso ES00549609',
    'body_html' => '<table>
        <tr><td>Número de aviso</td><td>ES00549609</td></tr>
        <tr><td>Nº de serie</td><td>180914-MNM00741336</td></tr>
        <tr><td>Fecha aviso</td><td>24/02/2026 18:56:33</td></tr>
        <tr><td>Descripción avería</td><td>Cepillo lateral no gira correctamente</td></tr>
        <tr><td>Emplazamiento</td><td>5638052076 - ES REPSOL Nº 2001 ROTUNDA AÇORES</td></tr>
        <tr><td>Tipo avería</td><td>Avería mecánica</td></tr>
    </table>',
    'received'  => '2026-02-24T18:56:33Z',
]);

$ch = curl_init('https://www.navel.pt/api/istobal-webhook.php');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'X-ATM-Token: ' . $TOKEN,
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

header('Content-Type: application/json');
echo json_encode([
    'http_code' => $httpCode,
    'response'  => json_decode($response, true) ?? $response,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
