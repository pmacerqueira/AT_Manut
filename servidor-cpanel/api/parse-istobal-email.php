<?php
/**
 * parse-istobal-email.php — Integração ISTOBAL: Email Piping → Reparação automática
 *
 * INSTALAR EM: public_html/api/parse-istobal-email.php
 *
 * CONFIGURAR NO CPANEL — Email Piping:
 *   1. Em "Email Accounts", ir à conta que recebe os emails ISTOBAL (ex. assist@navel.pt)
 *   2. Em "Email Forwarders" → "Add Forwarder":
 *      - Forwarder address: assist@navel.pt
 *      - Forward to: |/usr/bin/php /home/<user>/public_html/api/parse-istobal-email.php
 *
 * O script:
 *   1. Lê o email completo de STDIN (formato RFC 2822)
 *   2. Verifica que o remetente é isat@istobal.com
 *   3. Extrai a tabela HTML do corpo do email (formato ISTOBAL)
 *   4. Faz match da máquina pelo nº de série
 *   5. Cria um registo em `reparacoes` com origem = 'istobal_email'
 *   6. Responde com log (para depuração em cron/pipe)
 *
 * FORMATO DO EMAIL ISTOBAL (exemplo):
 *   De: isat@istobal.com
 *   Assunto: Aviso de avaria — Maquina: XXXX / Nº de série: YYYY
 *   Corpo: Tabela HTML com campos em espanhol (Número de aviso, Descripción, etc.)
 */

ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE);

// ── Config e DB ───────────────────────────────────────────────────────────────
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

function gen_id() {
    return bin2hex(random_bytes(16));
}

// ── 1. Ler email de STDIN ─────────────────────────────────────────────────────
$rawEmail = '';
$stdin = fopen('php://stdin', 'r');
while (!feof($stdin)) {
    $rawEmail .= fread($stdin, 8192);
}
fclose($stdin);

if (empty(trim($rawEmail))) {
    ilog('ERROR: Email vazio ou STDIN vazio.');
    notify_ops(
        'AT_Manut: Falha ao abrir reparação ISTOBAL',
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo: email vazio no piping.\nData: " . date('Y-m-d H:i:s')
    );
    exit(1);
}

ilog('Email recebido (' . strlen($rawEmail) . ' bytes)');

// ── 2. Verificar remetente ────────────────────────────────────────────────────
$fromLine = '';
foreach (explode("\n", $rawEmail) as $line) {
    $line = rtrim($line, "\r\n");
    if (stripos($line, 'From:') === 0) {
        $fromLine = $line;
        break;
    }
}
ilog('From: ' . $fromLine);

// Aceitar apenas de isat@istobal.com
if (stripos($fromLine, 'isat@istobal.com') === false) {
    ilog('IGNORADO: Remetente não é isat@istobal.com.');
    exit(0);
}

// ── 3. Extrair assunto ────────────────────────────────────────────────────────
$subjectLine = '';
foreach (explode("\n", $rawEmail) as $line) {
    $line = rtrim($line, "\r\n");
    if (stripos($line, 'Subject:') === 0) {
        $subjectLine = trim(substr($line, 8));
        break;
    }
}
// Descodificar assunto codificado (quoted-printable ou base64)
if (function_exists('iconv_mime_decode')) {
    $subjectLine = iconv_mime_decode($subjectLine, 0, 'UTF-8');
}
ilog('Assunto: ' . $subjectLine);

// Extrair número de aviso ES\d+ directamente do assunto (fonte mais fiável —
// está na barra vermelha do email mas pode não estar numa célula <td> do HTML)
$numeroAvisoSubject = '';
if (preg_match('/\b(ES\d+)\b/', $subjectLine, $esm)) {
    $numeroAvisoSubject = $esm[1];
    ilog('Nº aviso extraído do assunto: ' . $numeroAvisoSubject);
}

// ── 4. Extrair corpo HTML ─────────────────────────────────────────────────────
/**
 * Abordagem: procurar o bloco Content-Type: text/html e extrair o conteúdo.
 * Suporta emails multipart/alternative com partes text/plain e text/html.
 */
function extractHtmlBody($rawEmail) {
    // Encontrar boundary do multipart
    preg_match('/Content-Type:\s*multipart\/alternative;\s*boundary="?([^"\r\n;]+)/i', $rawEmail, $bm);
    if (!$bm) {
        preg_match('/Content-Type:\s*multipart\/mixed;\s*boundary="?([^"\r\n;]+)/i', $rawEmail, $bm);
    }

    if ($bm) {
        $boundary = trim($bm[1]);
        $parts    = explode('--' . $boundary, $rawEmail);
        foreach ($parts as $part) {
            if (stripos($part, 'Content-Type: text/html') !== false) {
                // Remover cabeçalhos da parte
                $bodyStart = strpos($part, "\r\n\r\n");
                if ($bodyStart === false) $bodyStart = strpos($part, "\n\n");
                if ($bodyStart !== false) {
                    $body = substr($part, $bodyStart + 4);
                    // Descodificar quoted-printable
                    if (stripos($part, 'Content-Transfer-Encoding: quoted-printable') !== false) {
                        $body = quoted_printable_decode($body);
                    } elseif (stripos($part, 'Content-Transfer-Encoding: base64') !== false) {
                        $body = base64_decode(preg_replace('/\s+/', '', $body));
                    }
                    return $body;
                }
            }
        }
    }

    // Fallback: email simples com HTML directo
    $bodyStart = strpos($rawEmail, "\r\n\r\n");
    if ($bodyStart === false) $bodyStart = strpos($rawEmail, "\n\n");
    if ($bodyStart !== false) {
        return substr($rawEmail, $bodyStart + 4);
    }
    return '';
}

$htmlBody = extractHtmlBody($rawEmail);
ilog('HTML body extraído: ' . strlen($htmlBody) . ' bytes');

if (empty(trim($htmlBody))) {
    ilog('ERROR: Não foi possível extrair corpo HTML.');
    notify_ops(
        'AT_Manut: Falha ao abrir reparação ISTOBAL',
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo: corpo HTML inválido/indisponível.\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
    );
    exit(1);
}

// ── 5. Parsear tabela HTML do email ISTOBAL ───────────────────────────────────
/**
 * O email ISTOBAL contém uma tabela HTML com pares chave-valor.
 * Campos típicos (em espanhol):
 *   Número de aviso      → numeroAviso
 *   Descripción avería   → descricaoAvaria
 *   Nº de serie          → numeroSerie (para match da máquina)
 *   Modelo               → modelo
 *   Instalación          → instalacao (nome do cliente/local)
 *   Fecha aviso          → data
 *   Tipo avería          → tipoAvaria
 */
function parseIstobalTable($html) {
    $data = [];

    // Remover tags de script/style
    $html = preg_replace('/<(script|style)[^>]*>.*?<\/\1>/si', '', $html);

    // Usar DOMDocument para parsear a tabela
    $dom = new DOMDocument('1.0', 'UTF-8');
    @$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);

    $rows = $dom->getElementsByTagName('tr');
    foreach ($rows as $row) {
        $cells = $row->getElementsByTagName('td');
        if ($cells->length >= 2) {
            $key   = trim($cells->item(0)->textContent ?? '');
            $value = trim($cells->item(1)->textContent ?? '');
            if ($key && $value) {
                $data[$key] = $value;
            }
        }
        // Também tentar th
        $ths = $row->getElementsByTagName('th');
        if ($ths->length > 0 && $cells->length > 0) {
            $key   = trim($ths->item(0)->textContent ?? '');
            $value = trim($cells->item(0)->textContent ?? '');
            if ($key && $value) {
                $data[$key] = $value;
            }
        }
    }

    return $data;
}

$parsed = parseIstobalTable($htmlBody);
ilog('Campos extraídos: ' . json_encode($parsed, JSON_UNESCAPED_UNICODE));

// ── 6. Mapear campos ISTOBAL → campos AT_Manut ──────────────────────────────
/**
 * Mapeamento fuzzy: procura chaves que contenham as palavras-chave.
 * Robustez face a pequenas variações no template ISTOBAL.
 */
function findField(array $data, array $keywords) {
    foreach ($data as $key => $value) {
        $keyLower = mb_strtolower($key);
        foreach ($keywords as $kw) {
            if (mb_strpos($keyLower, mb_strtolower($kw)) !== false) {
                return trim($value);
            }
        }
    }
    return '';
}

function findAvisoField(array $data) {
    foreach ($data as $key => $value) {
        $keyLower = mb_strtolower((string)$key);
        // Evitar confundir "Número de Serie" com nº de aviso.
        if (mb_strpos($keyLower, 'serie') !== false || mb_strpos($keyLower, 'serial') !== false) continue;
        if (mb_strpos($keyLower, 'aviso') !== false) return trim((string)$value);
        if (preg_match('/\bes\d{4,}\b/i', (string)$value)) return trim((string)$value);
    }
    return '';
}

$numeroAviso     = findAvisoField($parsed);
$descricaoAvaria = findField($parsed, ['descripción', 'descripcion', 'avería', 'averia', 'fallo', 'problema']);
$numeroSerie     = findField($parsed, ['serie', 'serial', 'n.s.', 's/n', 's / n']);
$modeloMaquina   = findField($parsed, ['modelo', 'model']);
$instalacao      = findField($parsed, ['emplazamiento', 'instalación', 'instalacion', 'cliente', 'site', 'ubicación']);
$dataAviso       = findField($parsed, ['fecha', 'data', 'date', 'dt.']);
$tipoAvaria      = findField($parsed, ['tipo', 'type', 'classe', 'categoria']);

// Usar nº aviso do assunto se a tabela HTML não tiver o campo (barra vermelha não é <td>)
if (!$numeroAviso && $numeroAvisoSubject) {
    $numeroAviso = $numeroAvisoSubject;
    ilog('Nº aviso usado do assunto (fallback): ' . $numeroAviso);
}

// Normalizar data — suporta DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, D/M/YYYY
$dataFormatada = date('Y-m-d'); // default: hoje
if ($dataAviso) {
    // Cortar a parte da hora se existir (ex: "24/02/2026 18:56:33" → "24/02/2026")
    $dataAviso = trim(preg_replace('/\s+\d{2}:\d{2}(:\d{2})?$/', '', trim($dataAviso)));
    $formats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'Y/m/d', 'd/m/y', 'j/n/Y'];
    $parsed_dt = false;
    foreach ($formats as $fmt) {
        $dt = DateTime::createFromFormat($fmt, $dataAviso);
        if ($dt && $dt->format($fmt) === $dataAviso || $dt) {
            // Verificar que a data é plausível (entre 2020 e 2100)
            $yr = (int)$dt->format('Y');
            if ($yr >= 2020 && $yr <= 2100) {
                $dataFormatada = $dt->format('Y-m-d');
                $parsed_dt = true;
                break;
            }
        }
    }
    if (!$parsed_dt) {
        ilog("AVISO: Formato de data não reconhecido: '$dataAviso' — usando data de hoje.");
    }
}

ilog("Mapeado → numeroAviso=$numeroAviso | serie=$numeroSerie | modelo=$modeloMaquina | data=$dataFormatada");

// ── 7. Encontrar máquina pelo nº de série ─────────────────────────────────────
$pdo = null;
try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    ilog('ERROR DB: ' . $e->getMessage());
    notify_ops(
        'AT_Manut: Falha ao abrir reparação ISTOBAL',
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo DB: {$e->getMessage()}\nAssunto: $subjectLine\nAviso: $numeroAviso\nData: " . date('Y-m-d H:i:s')
    );
    exit(1);
}

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
    ilog("ERROR: Máquina não encontrada (serie='$numeroSerie', modelo='$modeloMaquina').");
    notify_ops(
        "AT_Manut: Não foi possível abrir reparação ISTOBAL ($numeroAviso)",
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo: máquina não encontrada por Nº de série/modelo.\nAviso: $numeroAviso\nSérie no email: $numeroSerie\nModelo no email: $modeloMaquina\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
    );
    exit(1);
}

if ($normModeloEmail !== '' && norm_text($modeloBd) !== $normModeloEmail) {
    ilog("AVISO: divergência de modelo para maquinaId=$maquinaId (email='$modeloMaquina' vs BD='$modeloBd').");
}
ilog("Máquina encontrada: id=$maquinaId (serieEmail='$numeroSerie' | serieBD='$serieBd')");

// ── 8. Construir descrição completa da avaria ──────────────────────────────────
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

// ── 9. Verificar duplicado (mesmo aviso já registado) ─────────────────────────
if ($numeroAviso) {
    $dup = $pdo->prepare('SELECT id, status FROM reparacoes WHERE numero_aviso = ? ORDER BY criado_em DESC LIMIT 1');
    $dup->execute([$numeroAviso]);
    $exist = $dup->fetch(PDO::FETCH_ASSOC);
    if ($exist) {
        if (($exist['status'] ?? '') === 'concluida') {
            ilog("IGNORADO: aviso=$numeroAviso já concluído (id={$exist['id']}).");
            notify_ops(
                "AT_Manut: Aviso ISTOBAL repetido após fecho ($numeroAviso)",
                "Recebido novo email para aviso já concluído.\nNenhuma alteração aplicada.\n\nAviso: $numeroAviso\nReparação: {$exist['id']}\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
            );
            exit(0);
        }

        // Último email vence para avisos ainda em aberto (pendente/em_progresso).
        $upd = $pdo->prepare('UPDATE reparacoes
            SET maquina_id = ?, data = ?, numero_aviso = ?, descricao_avaria = ?, observacoes = ?, origem = ?
            WHERE id = ?');
        $upd->execute([
            $maquinaId,
            $dataFormatada,
            $numeroAviso ?: null,
            $descFull,
            "Atualizado pelo último email ISTOBAL. Assunto: $subjectLine",
            'istobal_email',
            $exist['id'],
        ]);
        ilog("ATUALIZADO: aviso=$numeroAviso (id={$exist['id']}) com dados mais recentes.");
        exit(0);
    }
}

// ── 10. Inserir reparação ─────────────────────────────────────────────────────
$id = gen_id();
try {
    $ins = $pdo->prepare(
        'INSERT INTO reparacoes
           (id, maquina_id, data, tecnico, status, numero_aviso, descricao_avaria, observacoes, origem, criado_em)
         VALUES
           (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $ins->execute([
        $id,
        $maquinaId,
        $dataFormatada,
        '',                   // técnico a designar
        'pendente',
        $numeroAviso ?: null,
        $descFull,
        "Importado automaticamente de email ISTOBAL. Assunto: $subjectLine",
        'istobal_email',
    ]);
    ilog("Reparação criada com sucesso: id=$id (maquinaId=" . ($maquinaId ?? 'NULL') . ")");
} catch (PDOException $e) {
    ilog('ERROR INSERT: ' . $e->getMessage());
    notify_ops(
        "AT_Manut: Falha ao abrir reparação ISTOBAL ($numeroAviso)",
        "Não foi conseguida a abertura de reparação em AT_Manut.\n\nMotivo INSERT: {$e->getMessage()}\nAviso: $numeroAviso\nSérie: $numeroSerie\nModelo: $modeloMaquina\nAssunto: $subjectLine\nData: " . date('Y-m-d H:i:s')
    );
    exit(1);
}

// ── 11. Notificação via email para a equipa (opcional) ────────────────────────
// Se pretender enviar um email interno a avisar, descomente e configure:
// $to      = ATM_EMAIL_ALERT ?? 'admin@navel.pt';
// $subject = "Nova reparação ISTOBAL: $numeroAviso — $modeloMaquina";
// $body    = "Nova reparação automática criada em AT_Manut.\n\n"
//           . "Aviso: $numeroAviso\nSérie: $numeroSerie\nModelo: $modeloMaquina\n"
//           . "Instalação: $instalacao\nData: $dataFormatada\n\nAvaria:\n$descricaoAvaria\n";
// mail($to, $subject, $body);

ilog('Script concluído com sucesso.');
exit(0);
