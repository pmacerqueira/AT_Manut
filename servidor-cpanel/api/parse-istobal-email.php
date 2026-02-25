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

$LOG_FILE = __DIR__ . '/../../logs/istobal-email.log';

function ilog($msg) {
    global $LOG_FILE;
    $dir = dirname($LOG_FILE);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    @file_put_contents($LOG_FILE, '[' . date('Y-m-d H:i:s T') . '] ' . $msg . PHP_EOL, FILE_APPEND);
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

$numeroAviso     = findField($parsed, ['aviso', 'número', 'numero', 'n.º', 'nº']);
$descricaoAvaria = findField($parsed, ['descripción', 'descripcion', 'avería', 'averia', 'fallo', 'problema']);
$numeroSerie     = findField($parsed, ['serie', 'serial', 'n.s.', 's/n', 's / n']);
$modeloMaquina   = findField($parsed, ['modelo', 'model']);
$instalacao      = findField($parsed, ['instalación', 'instalacion', 'cliente', 'site', 'ubicación']);
$dataAviso       = findField($parsed, ['fecha', 'data', 'date', 'dt.']);
$tipoAvaria      = findField($parsed, ['tipo', 'type', 'classe', 'categoria']);

// Limpar e normalizar a data (formato DD/MM/YYYY ou YYYY-MM-DD)
$dataFormatada = date('Y-m-d'); // default: hoje
if ($dataAviso) {
    // Tentar DD/MM/YYYY
    if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})/', $dataAviso, $dm)) {
        $dataFormatada = $dm[3] . '-' . $dm[2] . '-' . $dm[1];
    } elseif (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $dataAviso, $dm)) {
        $dataFormatada = $dm[0];
    }
}

ilog("Mapeado → numeroAviso=$numeroAviso | serie=$numeroSerie | modelo=$modeloMaquina | data=$dataFormatada");

// ── 7. Encontrar máquina pelo nº de série ─────────────────────────────────────
$pdo = null;
try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    ilog('ERROR DB: ' . $e->getMessage());
    exit(1);
}

$maquinaId = null;
if ($numeroSerie) {
    $stmt = $pdo->prepare('SELECT id FROM maquinas WHERE numero_serie = ? LIMIT 1');
    $stmt->execute([$numeroSerie]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $maquinaId = $row['id'];
        ilog("Máquina encontrada: id=$maquinaId (serie=$numeroSerie)");
    } else {
        ilog("AVISO: Máquina com serie=$numeroSerie não encontrada na BD.");
    }
}

// ── 8. Verificar duplicado (mesmo aviso já registado) ─────────────────────────
if ($numeroAviso) {
    $dup = $pdo->prepare('SELECT id FROM reparacoes WHERE numero_aviso = ? LIMIT 1');
    $dup->execute([$numeroAviso]);
    if ($dup->fetch()) {
        ilog("IGNORADO: Reparação com aviso=$numeroAviso já existe.");
        exit(0);
    }
}

// ── 9. Construir descrição completa da avaria ─────────────────────────────────
$descFull = $descricaoAvaria;
if ($tipoAvaria && stripos($descFull, $tipoAvaria) === false) {
    $descFull = "[{$tipoAvaria}] " . $descFull;
}
if ($instalacao) {
    $descFull .= "\n\nInstalação: $instalacao";
}
// Incluir todos os campos do email para referência
$descFull .= "\n\n--- Dados originais do email ISTOBAL ---\n";
foreach ($parsed as $k => $v) {
    $descFull .= "$k: $v\n";
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
        $maquinaId,           // pode ser NULL se máquina não encontrada
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
