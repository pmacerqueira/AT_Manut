<?php
/**
 * Endpoint para envio de relatórios de manutenção por email.
 * Usa o serviço de correio do cPanel (mail() PHP).
 * Sempre envia cópia para comercial@navel.pt.
 *
 * Colocar em: https://www.navel.pt/api/send-report.php
 * (junto com send-email.php, data.php, etc.)
 *
 * Segurança: exige auth_token no body; CORS restrito; sanitização de corpo e assunto.
 */

// Token de autenticação — deve ser idêntico ao em emailConfig.js e send-email.php
define('REPORT_AUTH_TOKEN', getenv('ATM_REPORT_AUTH_TOKEN') ?: 'Navel2026$Api!Key#xZ99');

// Origens CORS permitidas (coerente com config.php)
$corsOrigins = ['https://www.navel.pt', 'https://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowOrigin = in_array($origin, $corsOrigins) ? $origin : $corsOrigins[0];

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: {$allowOrigin}");
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Método não permitido']);
    exit;
}

$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Dados inválidos']);
    exit;
}

// Autenticação
$token = trim($data['auth_token'] ?? '');
if (!hash_equals(REPORT_AUTH_TOKEN, $token)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Acesso negado']);
    exit;
}

$destinatario = trim($data['destinatario'] ?? '');
$cc = trim($data['cc'] ?? '');
$assuntoRaw = trim(preg_replace('/[\r\n]+/', ' ', $data['assunto'] ?? ''));
$corpoHtmlRaw = $data['corpoHtml'] ?? '';

if (empty($destinatario) || !filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Endereço de destinatário inválido']);
    exit;
}

// Sanitizar assunto: limitar a 200 chars, remover HTML
$assunto = mb_substr(strip_tags($assuntoRaw), 0, 200, 'UTF-8');
if (empty($assunto)) {
    $assunto = 'Relatório de manutenção — Navel';
}

// Sanitizar corpo HTML: strip_tags com tags permitidas seguras para email
$allowedTags = '<html><head><body><style><p><br><strong><em><b><i><u><a><ul><ol><li><span><div><table><tr><td><th><thead><tbody><img><h1><h2><h3><h4><hr><meta><title>';
$corpoHtml = strip_tags($corpoHtmlRaw, $allowedTags);
// Remover atributos event handlers e javascript: em links
$corpoHtml = preg_replace('/\s+on\w+\s*=\s*["\'][^"\']*["\']/i', '', $corpoHtml);
$corpoHtml = preg_replace('/javascript:/i', '', $corpoHtml);
// Limitar tamanho (500 KB)
$corpoHtml = mb_substr($corpoHtml, 0, 512000, 'UTF-8');
$corpoHtml = $corpoHtml ?: '<p>Relatório de manutenção enviado pela aplicação Navel.</p>';

$from = 'noreply@navel.pt';
$adminCc = 'comercial@navel.pt';
$ccList = [$adminCc];
if (!empty($cc) && filter_var($cc, FILTER_VALIDATE_EMAIL) && strtolower($cc) !== strtolower($adminCc)) {
    $ccList[] = $cc;
}

$pdfBase64 = $data['pdf_base64'] ?? '';
$pdfFilename = $data['pdf_filename'] ?? 'relatorio.pdf';

if (!empty($pdfBase64)) {
    // Multipart MIME: HTML body + PDF attachment
    $boundary = md5(uniqid(time()));
    $headers = [
        'MIME-Version: 1.0',
        "Content-Type: multipart/mixed; boundary=\"{$boundary}\"",
        'X-Mailer: PHP/' . phpversion(),
        "From: =?UTF-8?B?" . base64_encode('NAVEL – AÇORES') . "?= <{$from}>",
        "Reply-To: comercial@navel.pt",
        "Cc: " . implode(', ', $ccList),
    ];

    $emailBody  = "--{$boundary}\r\n";
    $emailBody .= "Content-Type: text/html; charset=UTF-8\r\n";
    $emailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $emailBody .= $corpoHtml . "\r\n\r\n";
    $emailBody .= "--{$boundary}\r\n";
    $emailBody .= "Content-Type: application/pdf; name=\"{$pdfFilename}\"\r\n";
    $emailBody .= "Content-Transfer-Encoding: base64\r\n";
    $emailBody .= "Content-Disposition: attachment; filename=\"{$pdfFilename}\"\r\n\r\n";
    $emailBody .= chunk_split($pdfBase64) . "\r\n";
    $emailBody .= "--{$boundary}--";

    $headersStr = implode("\r\n", $headers);
    $enviado = @mail($destinatario, $assunto, $emailBody, $headersStr);
} else {
    // Simple HTML email (no attachment)
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'X-Mailer: PHP/' . phpversion(),
        "From: =?UTF-8?B?" . base64_encode('NAVEL – AÇORES') . "?= <{$from}>",
        "Reply-To: comercial@navel.pt",
        "Cc: " . implode(', ', $ccList),
    ];

    $headersStr = implode("\r\n", $headers);
    $enviado = @mail($destinatario, $assunto, $corpoHtml, $headersStr);
}

if (!$enviado) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Falha ao enviar o email (mail() retornou false).']);
    exit;
}

http_response_code(200);
echo json_encode(['ok' => true, 'message' => 'Email enviado com sucesso para ' . $destinatario]);
