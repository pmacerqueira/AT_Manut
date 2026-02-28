<?php
/**
 * istobal-webhook.php — Integração ISTOBAL: Webhook HTTP (Power Automate → Reparação automática)
 *
 * INSTALAR EM: public_html/api/istobal-webhook.php
 *
 * Chamado pelo Power Automate (O365) quando chega um email de isat@istobal.com.
 * Aceita POST com JSON: { "subject", "from", "body_html", "received" }
 *
 * Segurança: token secreto no header X-ATM-Token (configurar em config.php ATM_WEBHOOK_TOKEN)
 */

ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$LOG_FILE = __DIR__ . '/logs/istobal-email.log';
$ALERT_EMAIL = 'pmcerqueira@navel.pt';

function ilog($msg) {
    global $LOG_FILE;
    $dir = dirname($LOG_FILE);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    @file_put_contents($LOG_FILE, '[' . date('Y-m-d H:i:s T') . '] ' . $msg . PHP_EOL, FILE_APPEND);
}

function wh_ok($msg, $data = []) {
    echo json_encode(array_merge(['ok' => true, 'msg' => $msg], $data));
    exit(0);
}

function wh_err($code, $msg) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'msg' => $msg]);
    ilog("ERROR ($code): $msg");
    exit(1);
}

function gen_id() {
    return bin2hex(random_bytes(16));
}

function norm_text($s) {
    $s = strtoupper(trim((string)$s));
    return preg_replace('/\s+/', ' ', $s);
}

function norm_alnum($s) {
    $s = strtoupper(trim((string)$s));
    return preg_replace('/[^A-Z0-9]/', '', $s);
}

function notify_ops($subject, $body) {
    global $ALERT_EMAIL;
    if (!$ALERT_EMAIL || !filter_var($ALERT_EMAIL, FILTER_VALIDATE_EMAIL)) return;
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/plain; charset=UTF-8',
        'From: AT_Manut Bot <noreply@navel.pt>',
        'Reply-To: comercial@navel.pt',
    ];
    @mail($ALERT_EMAIL, $subject, $body, implode("\r\n", $headers));
}

// ── 1. Apenas POST ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    wh_err(405, 'Method Not Allowed');
}

// ── 2. Verificar token de segurança ──────────────────────────────────────────
$expectedToken = defined('ATM_WEBHOOK_TOKEN') ? ATM_WEBHOOK_TOKEN : '';
$receivedToken = $_SERVER['HTTP_X_ATM_TOKEN'] ?? '';

if (empty($expectedToken) || !hash_equals($expectedToken, $receivedToken)) {
    ilog('BLOQUEADO: Token inválido. Received: ' . substr($receivedToken, 0, 8) . '...');
    wh_err(401, 'Unauthorized');
}

// ── 3. Ler e validar JSON do body ─────────────────────────────────────────────
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['body_html'])) {
    wh_err(400, 'JSON inválido ou campo body_html em falta');
}

$fromField   = $data['from']      ?? '';
$subjectLine = $data['subject']   ?? '';
$htmlBody    = $data['body_html'] ?? '';
$receivedAt  = $data['received']  ?? date('Y-m-d H:i:s');

ilog("Webhook recebido — from=$fromField | assunto=$subjectLine");

// ── 4. Verificar remetente ────────────────────────────────────────────────────
if (stripos($fromField, 'isat@istobal.com') === false) {
    ilog('IGNORADO: Remetente não é isat@istobal.com: ' . $fromField);
    wh_ok('Ignorado: remetente não autorizado');
}

// ── 4b. Ignorar emails de fecho técnico/serviço ───────────────────────────────
$subjectNorm = mb_strtolower((string)$subjectLine, 'UTF-8');
$closureKeywords = ['cierre', 'cerrado', 'finalizado', 'finalizacion', 'finalización', 'resuelto', 'resolvido', 'fecho', 'fechado'];
foreach ($closureKeywords as $kw) {
    if (mb_strpos($subjectNorm, $kw) !== false) {
        ilog("IGNORADO: email de fecho detectado no assunto (keyword='$kw').");
        wh_ok('Ignorado: email de fecho técnico');
    }
}

// ── 5. Extrair nº aviso do assunto (fallback) ─────────────────────────────────
// Ex: "IFS - Confirmación de Aviso ES00549609" → "ES00549609"
$numeroAvisoSubject = '';
if (preg_match('/\b(ES\d+)\b/i', $subjectLine, $esm)) {
    $numeroAvisoSubject = strtoupper($esm[1]);
    ilog('Nº aviso extraído do assunto: ' . $numeroAvisoSubject);
}

// ── 6. Parsear tabela HTML do email ISTOBAL ───────────────────────────────────
function parseIstobalTable($html) {
    $result = [];
    $html = preg_replace('/<(script|style)[^>]*>.*?<\/\1>/si', '', $html);
    $dom  = new DOMDocument('1.0', 'UTF-8');
    @$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
    $rows = $dom->getElementsByTagName('tr');
    foreach ($rows as $row) {
        $cells = $row->getElementsByTagName('td');
        if ($cells->length >= 2) {
            $key   = trim($cells->item(0)->textContent ?? '');
            $value = trim($cells->item(1)->textContent ?? '');
            if ($key && $value) $result[$key] = $value;
        }
        $ths = $row->getElementsByTagName('th');
        if ($ths->length > 0 && $cells->length > 0) {
            $key   = trim($ths->item(0)->textContent ?? '');
            $value = trim($cells->item(0)->textContent ?? '');
            if ($key && $value) $result[$key] = $value;
        }
    }
    return $result;
}

function findField(array $data, array $keywords) {
    foreach ($data as $key => $value) {
        $kl = mb_strtolower($key);
        foreach ($keywords as $kw) {
            if (mb_strpos($kl, mb_strtolower($kw)) !== false) return trim($value);
        }
    }
    return '';
}

function findAvisoField(array $data) {
    foreach ($data as $key => $value) {
        $kl = mb_strtolower((string)$key);
        $keyStr = (string)$key;
        $valStr = trim((string)$value);

        // Prioridade 1: ES... no próprio rótulo da linha.
        if (preg_match('/\b(ES\d{4,})\b/i', $keyStr, $mKey)) {
            return strtoupper($mKey[1]);
        }

        // Evitar falsos positivos tipo "Número de Serie".
        if (mb_strpos($kl, 'serie') !== false || mb_strpos($kl, 'serial') !== false) continue;

        // Prioridade 2: rótulo de aviso com valor ES...
        if (mb_strpos($kl, 'aviso') !== false && preg_match('/\b(ES\d{4,})\b/i', $valStr, $mAviso)) {
            return strtoupper($mAviso[1]);
        }

        // Prioridade 3: qualquer valor contendo ES...
        if (preg_match('/\b(ES\d{4,})\b/i', $valStr, $mVal)) {
            return strtoupper($mVal[1]);
        }
    }
    return '';
}

$parsed = parseIstobalTable($htmlBody);
ilog('Campos extraídos: ' . json_encode($parsed, JSON_UNESCAPED_UNICODE));

$numeroAviso     = findAvisoField($parsed);
$descricaoAvaria = findField($parsed, ['descripción', 'descripcion', 'avería', 'averia', 'fallo', 'problema']);
$numeroSerie     = findField($parsed, ['serie', 'serial', 'n.s.', 's/n', 's / n']);
$modeloMaquina   = findField($parsed, ['modelo', 'model']);
$instalacao      = findField($parsed, ['emplazamiento', 'instalación', 'instalacion', 'cliente', 'site', 'ubicación']);
$dataAviso       = findField($parsed, ['fecha', 'data', 'date', 'dt.']);
$tipoAvaria      = findField($parsed, ['tipo', 'type', 'classe', 'categoria']);

// Número de aviso: assunto tem prioridade, depois tabela HTML.
if ($numeroAvisoSubject) {
    if ($numeroAviso && $numeroAviso !== $numeroAvisoSubject) {
        ilog("AVISO: divergência no nº aviso (assunto='$numeroAvisoSubject' vs html='$numeroAviso'). Mantido assunto.");
    }
    $numeroAviso = $numeroAvisoSubject;
    ilog('Nº aviso usado do assunto (prioridade): ' . $numeroAviso);
}

// ── 7. Normalizar data ────────────────────────────────────────────────────────
$dataFormatada = date('Y-m-d'); // default: hoje
if ($dataAviso) {
    // Strip hora (ex: "24/02/2026 18:56:33" → "24/02/2026")
    $dataAviso = trim(preg_replace('/\s+\d{2}:\d{2}(:\d{2})?$/', '', trim($dataAviso)));
    foreach (['d/m/Y', 'Y-m-d', 'd-m-Y', 'Y/m/d', 'j/n/Y'] as $fmt) {
        $dt = DateTime::createFromFormat($fmt, $dataAviso);
        if ($dt) {
            $yr = (int)$dt->format('Y');
            if ($yr >= 2020 && $yr <= 2100) { $dataFormatada = $dt->format('Y-m-d'); break; }
        }
    }
} elseif ($receivedAt) {
    // Usar data de recepção do Power Automate como fallback
    $dt = date_create($receivedAt);
    if ($dt) $dataFormatada = $dt->format('Y-m-d');
}

ilog("Mapeado → numeroAviso=$numeroAviso | serie=$numeroSerie | modelo=$modeloMaquina | data=$dataFormatada");

// ── 8. Ligar à BD ─────────────────────────────────────────────────────────────
try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    notify_ops(
        'AT_Manut: Falha ao abrir reparação ISTOBAL',
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo DB: {$e->getMessage()}\nAssunto: $subjectLine\nAviso: $numeroAviso\nData: " . date('Y-m-d H:i:s')
    );
    wh_err(500, 'Erro DB: ' . $e->getMessage());
}

// ── 9. Encontrar máquina pelo nº de série/modelo (normalizado) ───────────────
$maquinaId = null;
$modeloBd = '';
$serieBd = '';
$normSerieEmail = norm_alnum($numeroSerie);
$normModeloEmail = norm_text($modeloMaquina);
if ($normSerieEmail !== '') {
    $stmt = $pdo->query('SELECT id, modelo, numero_serie FROM maquinas WHERE numero_serie IS NOT NULL');
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $m) {
        if (norm_alnum($m['numero_serie'] ?? '') === $normSerieEmail) {
            $maquinaId = $m['id'];
            $modeloBd = (string)($m['modelo'] ?? '');
            $serieBd = (string)($m['numero_serie'] ?? '');
            break;
        }
    }
}

if (!$maquinaId) {
    $msg = "Máquina não encontrada (serie='$numeroSerie', modelo='$modeloMaquina'). Será criada/atualizada reparação sem máquina associada.";
    ilog("WARN: $msg");
    notify_ops(
        "AT_Manut: Aviso ISTOBAL sem máquina associada ($numeroAviso)",
        "Aviso ISTOBAL recebido sem correspondência de máquina. A reparação será criada/atualizada como pendente sem máquina.\n\nAviso: $numeroAviso\nSérie no email: $numeroSerie\nModelo no email: $modeloMaquina\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
    );
}

if ($normModeloEmail !== '' && norm_text($modeloBd) !== $normModeloEmail) {
    ilog("AVISO: divergência de modelo para maquinaId=$maquinaId (email='$modeloMaquina' vs BD='$modeloBd').");
}
ilog("Máquina encontrada: id=$maquinaId (serieEmail='$numeroSerie' | serieBD='$serieBd')");

// ── 10. Construir descrição completa ──────────────────────────────────────────
$descFull = $descricaoAvaria;
if ($tipoAvaria && stripos($descFull, $tipoAvaria) === false) {
    $descFull = "[{$tipoAvaria}] " . $descFull;
}
if ($instalacao) {
    $descFull .= "\n\nInstalação: $instalacao";
}
$descFull .= "\n\n--- Dados originais do email ISTOBAL ---\n";
foreach ($parsed as $k => $v) {
    $descFull .= "$k: $v\n";
}

// ── 11. Verificar duplicado ───────────────────────────────────────────────────
if ($numeroAviso) {
    $dup = $pdo->prepare('SELECT id, status, maquina_id FROM reparacoes WHERE numero_aviso = ? ORDER BY criado_em DESC LIMIT 1');
    $dup->execute([$numeroAviso]);
    $exist = $dup->fetch(PDO::FETCH_ASSOC);
    if ($exist) {
        if (($exist['status'] ?? '') === 'concluida') {
            ilog("IGNORADO: aviso=$numeroAviso já concluído (id={$exist['id']}).");
            notify_ops(
                "AT_Manut: Aviso ISTOBAL repetido após fecho ($numeroAviso)",
                "Recebido novo email para aviso já concluído.\nNenhuma alteração aplicada.\n\nAviso: $numeroAviso\nReparação: {$exist['id']}\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
            );
            wh_ok('Duplicado ignorado (já concluído)', ['aviso' => $numeroAviso, 'id' => $exist['id']]);
        }

        // Último email vence para avisos ainda em aberto (pendente/em_progresso).
        // Se não houver máquina extraída neste email, manter a máquina já existente.
        $resolvedMaquinaId = $maquinaId ?: ($exist['maquina_id'] ?? null);
        $upd = $pdo->prepare('UPDATE reparacoes
            SET maquina_id = ?, data = ?, numero_aviso = ?, descricao_avaria = ?, observacoes = ?, origem = ?
            WHERE id = ?');
        $upd->execute([
            $resolvedMaquinaId,
            $dataFormatada,
            $numeroAviso ?: null,
            $descFull,
            "Atualizado pelo último email ISTOBAL. Assunto: $subjectLine",
            'istobal_email',
            $exist['id'],
        ]);
        ilog("ATUALIZADO: aviso=$numeroAviso (id={$exist['id']}) com dados mais recentes. maquinaId=" . ($resolvedMaquinaId ?: 'NULL'));
        wh_ok('Reparação atualizada com dados mais recentes', [
            'aviso' => $numeroAviso,
            'id' => $exist['id'],
            'maquinaId' => $resolvedMaquinaId,
            'machineLinked' => !empty($resolvedMaquinaId),
        ]);
    }
}

// ── 12. Inserir reparação ─────────────────────────────────────────────────────
$id = gen_id();
try {
    $ins = $pdo->prepare(
        'INSERT INTO reparacoes
           (id, maquina_id, data, tecnico, status, numero_aviso, descricao_avaria, observacoes, origem, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $ins->execute([
        $id,
        $maquinaId,
        $dataFormatada,
        '',
        'pendente',
        $numeroAviso ?: null,
        $descFull,
        "Importado via Power Automate / O365. Assunto: $subjectLine",
        'istobal_email',
    ]);
    ilog("Reparação criada: id=$id (maquinaId=" . ($maquinaId ?? 'NULL') . ", aviso=$numeroAviso)");
} catch (PDOException $e) {
    notify_ops(
        "AT_Manut: Falha ao abrir reparação ISTOBAL ($numeroAviso)",
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo INSERT: {$e->getMessage()}\nAviso: $numeroAviso\nSérie: $numeroSerie\nModelo: $modeloMaquina\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
    );
    wh_err(500, 'Erro INSERT: ' . $e->getMessage());
}

wh_ok('Reparação criada com sucesso', [
    'id'          => $id,
    'numeroAviso' => $numeroAviso,
    'maquinaId'   => $maquinaId,
    'data'        => $dataFormatada,
    'machineLinked' => !empty($maquinaId),
]);
