<?php
/**
 * send-email.php — Relatórios NAVEL com PDF (FPDF)
 * =================================================
 * Ordem de inicialização crítica:
 *   1. Fallbacks json_encode/json_decode (usados por TODOS os handlers seguintes)
 *   2. CORS headers (garantidos mesmo em caso de fatal error)
 *   3. Error handlers (já podem usar json_encode com segurança)
 *   4. Lógica da aplicação
 *
 * INSTALAR EM: public_html/api/send-email.php
 * URL:         https://www.navel.pt/api/send-email.php
 */

// ══ 1. FALLBACKS — DEVEM SER OS PRIMEIROS A EXECUTAR ════════════════════════
// Se a extensão json não estiver activa, json_encode/json_decode causam fatal
// error em TODOS os handlers abaixo. Estes fallbacks previnem esse crash.
ini_set('display_errors', '0');

if (!function_exists('json_encode')) {
    function json_encode($data, $opts = 0) {
        if (is_bool($data))  return $data ? 'true' : 'false';
        if (is_null($data))  return 'null';
        if (is_int($data) || is_float($data)) return (string)$data;
        if (is_string($data)) return '"' . str_replace(['"','\\',"\n","\r","\t"], ['\"','\\\\','\n','\r','\t'], $data) . '"';
        if (is_array($data)) {
            $isSeq = array_keys($data) === range(0, count($data) - 1);
            $parts = [];
            foreach ($data as $k => $v) {
                $parts[] = $isSeq ? json_encode($v) : ('"' . $k . '":' . json_encode($v));
            }
            return $isSeq ? '[' . implode(',', $parts) . ']' : '{' . implode(',', $parts) . '}';
        }
        return 'null';
    }
}
if (!function_exists('json_decode')) {
    function json_decode($json, $assoc = false, $depth = 512, $opts = 0) {
        $json = trim($json);
        if ($json === 'null')  return null;
        if ($json === 'true')  return true;
        if ($json === 'false') return false;
        if (is_numeric($json)) return $json + 0;
        if (isset($json[0]) && $json[0] === '"') return stripslashes(substr($json, 1, -1));
        if (isset($json[0]) && $json[0] === '[') {
            $inner = trim(substr($json, 1, -1));
            if ($inner === '') return [];
            $items = []; $depth2 = 0; $cur = '';
            for ($i = 0; $i < strlen($inner); $i++) {
                $c = $inner[$i];
                if ($c === '{' || $c === '[') $depth2++;
                elseif ($c === '}' || $c === ']') $depth2--;
                if ($c === ',' && $depth2 === 0) { $items[] = json_decode(trim($cur), $assoc); $cur = ''; }
                else $cur .= $c;
            }
            if (trim($cur) !== '') $items[] = json_decode(trim($cur), $assoc);
            return $items;
        }
        if (isset($json[0]) && $json[0] === '{') {
            $inner = trim(substr($json, 1, -1));
            $result = $assoc ? [] : new stdClass();
            if ($inner === '') return $result;
            $d2 = 0; $cur = ''; $inStr = false; $esc = false; $pairs = [];
            for ($i = 0; $i < strlen($inner); $i++) {
                $c = $inner[$i];
                if ($esc) { $esc = false; $cur .= $c; continue; }
                if ($c === '\\' && $inStr) { $esc = true; $cur .= $c; continue; }
                if ($c === '"') $inStr = !$inStr;
                if (!$inStr) {
                    if ($c === '{' || $c === '[') $d2++;
                    elseif ($c === '}' || $c === ']') $d2--;
                    if ($c === ',' && $d2 === 0) { $pairs[] = trim($cur); $cur = ''; continue; }
                }
                $cur .= $c;
            }
            if (trim($cur) !== '') $pairs[] = trim($cur);
            foreach ($pairs as $pair) {
                $colon = strpos($pair, ':');
                if ($colon === false) continue;
                $k = trim(stripslashes(trim(substr($pair, 0, $colon), " \t\n\r\0\x0B\"")));
                $v = json_decode(trim(substr($pair, $colon + 1)), $assoc);
                if ($assoc) $result[$k] = $v; else $result->$k = $v;
            }
            return $result;
        }
        return null;
    }
}
if (!function_exists('mb_substr')) {
    function mb_substr($str, $start, $length = null, $encoding = null) {
        return $length === null ? substr($str, $start) : substr($str, $start, $length);
    }
}

// ══ 2. CORS HEADERS — ANTES DE QUALQUER LÓGICA ══════════════════════════════
// Garantidos mesmo em caso de fatal error (o browser nunca vê NetworkError).
$_cors_origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$_cors_allowed = ['https://www.navel.pt', 'https://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
header('Access-Control-Allow-Origin: ' . (in_array($_cors_origin, $_cors_allowed, true) ? $_cors_origin : 'https://www.navel.pt'));
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo '{"ok":false,"message":"Metodo nao permitido."}'; exit; }

// ══ 3. ERROR HANDLERS — json_encode já disponível (fallback acima) ═══════════
// Escreve em atm_debug.log e em atm_*.log (visível no painel Admin)
$atm_log_loaded = false;
$_atm_log_path = file_exists(__DIR__ . '/atm_log.php') ? __DIR__ . '/atm_log.php' : __DIR__ . '/api/atm_log.php';
if (file_exists($_atm_log_path)) {
    require_once $_atm_log_path;
    $atm_log_loaded = function_exists('atm_log_api');
    if ($atm_log_loaded) $GLOBALS['_atm_log_user'] = 'send-email';
    if ($atm_log_loaded) $GLOBALS['_atm_log_route'] = 'send-email';
}
set_error_handler(function ($no, $str, $file, $line) use ($atm_log_loaded) {
    @error_log(date('Y-m-d H:i:s') . " ERR($no): $str\n", 3, __DIR__ . '/atm_debug.log');
    if ($atm_log_loaded) atm_log_api('error', 'send-email', 'php_error', $str, ['file' => basename($file), 'line' => $line]);
    http_response_code(500);
    $msg = str_replace(['"', "\n", "\r"], ["'", ' ', ''], $str);
    echo '{"ok":false,"message":"Erro PHP (' . $no . '): ' . $msg . '"}';
    exit;
});
register_shutdown_function(function () use ($atm_log_loaded) {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        @error_log(date('Y-m-d H:i:s') . ' FATAL: ' . $e['message'] . "\n", 3, __DIR__ . '/atm_debug.log');
        if ($atm_log_loaded) atm_log_api('fatal', 'send-email', 'shutdown', $e['message'] ?? 'Erro fatal', ['file' => basename($e['file'] ?? '?'), 'line' => $e['line'] ?? 0]);
        if (!headers_sent()) http_response_code(500);
        $msg = str_replace(['"', "\n", "\r"], ["'", ' ', ''], $e['message']);
        echo '{"ok":false,"message":"Fatal PHP: ' . $msg . '"}';
    }
});

// ══ 4. CONFIG ════════════════════════════════════════════════════════════════
define('AUTH_TOKEN', getenv('ATM_REPORT_AUTH_TOKEN') ?: 'Navel2026$Api!Key#xZ99');
define('FROM_EMAIL', 'no-reply@navel.pt');
define('REPLY_TO',   'geral@navel.pt');

// ── Ler dados ─────────────────────────────────────────────────────────────────
// NÃO dependemos de $_SERVER['CONTENT_TYPE'] — em LiteSpeed/LSAPI esse header
// pode não estar preenchido mesmo quando o body é JSON.
// Estratégia: se php://input começa com '{', é JSON; senão usa $_POST.
$_raw  = file_get_contents('php://input');
$_data = [];
if ($_raw && isset($_raw[0]) && $_raw[0] === '{') {
    $parsed = json_decode($_raw, true);
    if (is_array($parsed) && !empty($parsed)) {
        $_data = $parsed;
    }
}
if (empty($_data)) {
    $_data = $_POST;   // fallback para URL-encoded (compatibilidade)
}
$g = function($key, $default = '') use ($_data) {
    return isset($_data[$key]) ? trim((string)$_data[$key]) : $default;
};

// ── Campos ────────────────────────────────────────────────────────────────────
$token           = $g('auth_token');
$to_email        = $g('to_email');
$to_name         = $g('to_name');
$num_rel         = $g('numero_relatorio');
$tipo            = $g('tipo_servico', 'Manutencao Periodica');
$equipamento     = $g('equipamento');
$data_real       = $g('data_realizacao');
$tecnico         = $g('tecnico');
$assinado_por    = $g('assinado_por');
$notas           = $g('notas');
$checklist_json  = $g('checklist_json');
$photos_json     = $g('photos_json');
$n_fotos         = (int)($_data['n_fotos'] ?? 0);
$data_assinatura = $g('data_assinatura');
$assinatura_b64  = $g('assinatura_digital');
$proxima_manut   = $g('proxima_manut');
$app_version     = $g('app_version') ?: '1.8.0';

// Auth
if ($token !== AUTH_TOKEN) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Acesso negado.']);
    exit;
}

// Validate email
$to_email = filter_var($to_email, FILTER_VALIDATE_EMAIL);
if (!$to_email) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Email de destino invalido.']);
    exit;
}

// Sanitise user-supplied fields
foreach (['to_name', 'equipamento', 'tecnico', 'assinado_por', 'notas'] as $v) {
    $$v = mb_substr(strip_tags(str_replace(["\r", "\n", "\0"], '', $$v)), 0, 500, 'UTF-8');
}
$to_email = str_replace(["\r", "\n", "\0"], '', $to_email);

// Checklist
$checklist = [];
if ($checklist_json) {
    $decoded = json_decode($checklist_json, true);
    if (is_array($decoded)) $checklist = $decoded;
}
$nSim = count(array_filter($checklist, function($i) { return ($i['resp'] ?? '') === 'sim'; }));
$nNao = count(array_filter($checklist, function($i) { return ($i['resp'] ?? '') === 'nao'; }));

// Fotos: o JS envia raw base64 (sem "data:image/jpeg;base64," prefix) para
// contornar regras ModSecurity que bloqueiam data: URIs. Reconstruir aqui.
$photos = [];
if ($photos_json && $photos_json !== '[]') {
    $ph = json_decode($photos_json, true);
    if (is_array($ph)) {
        foreach ($ph as $p) {
            if (!is_string($p) || $p === '') continue;
            if (strpos($p, 'data:image/') === 0) {
                $photos[] = $p;
            } else {
                $photos[] = 'data:image/jpeg;base64,' . $p;
            }
        }
    }
}

// Assinatura digital: raw base64 (PNG do canvas). Decodificar para binário.
$assinatura_bin = null;
if ($assinatura_b64) {
    $dec = base64_decode($assinatura_b64, true);
    if ($dec !== false && strlen($dec) > 0) $assinatura_bin = $dec;
}

// -- Helper: converte UTF-8 (dados do formulario) para Latin-1 (FPDF) --------
function f($s) {
    $s = (string)($s ?? '');
    if (function_exists('iconv')) return iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $s);
    if (function_exists('mb_convert_encoding')) return mb_convert_encoding($s, 'ISO-8859-1', 'UTF-8');
    return utf8_decode($s);
}

// -- Helper: detecta formato de imagem pelos magic bytes -----------------------
function detect_image_format($bin) {
    if (!is_string($bin) || strlen($bin) < 12) return null;
    $h = bin2hex(substr($bin, 0, 8));
    if ($h === '89504e470d0a1a0a') return ['ext' => '.png', 'type' => 'PNG'];
    if (substr($h, 0, 6) === 'ffd8ff') return ['ext' => '.jpg', 'type' => 'JPEG'];
    return null;
}

// -- Gerar PDF com FPDF ------------------------------------------------------
$pdf_data = null;

if (file_exists(__DIR__ . '/fpdf.php')) {
    require_once __DIR__ . '/fpdf.php';

    // Subclasse com cabecalho e rodape automaticos em todas as paginas
    class NavelPDF extends FPDF {
        public $numRel     = '';
        public $tipo       = '';
        public $totalPg    = 0; // preenchido apos Output()
        public $appVersion = '';

        function Header() {
            $W = 210; $M = 14;
            // Fundo azul
            $this->SetFillColor(30, 58, 95);
            $this->Rect(0, 0, $W, 26, 'F');
            $this->SetTextColor(255, 255, 255);
            // Nome empresa (esquerda)
            $this->SetFont('Arial', 'B', 13);
            $this->SetXY($M, 5);
            $this->Cell(90, 6, 'NAVEL-ACORES', 0, 0);
            // Telefone (direita)
            $this->SetFont('Arial', '', 7);
            $this->SetXY(110, 5);
            $this->Cell($W - 110 - $M, 5, '296 205 290 / 296 630 120', 0, 0, 'R');
            // Email + site (direita)
            $this->SetXY(110, 11);
            $this->Cell($W - 110 - $M, 5, 'geral@navel.pt  |  www.navel.pt', 0, 0, 'R');
            // Nome completo (esquerda)
            $this->SetFont('Arial', '', 7);
            $this->SetXY($M, 17);
            $this->Cell(0, 5, 'JOSE GONCALVES CERQUEIRA (NAVEL-ACORES), Lda.', 0, 0);
            // Numero do relatorio (direita, pequeno)
            $this->SetFont('Arial', 'I', 6.5);
            $this->SetXY(110, 17);
            $this->Cell($W - 110 - $M, 5, 'Ref: ' . $this->numRel, 0, 0, 'R');
            // Linha de separacao abaixo do cabecalho
            $this->SetDrawColor(13, 110, 253);
            $this->SetLineWidth(0.4);
            $this->Line(0, 26, $W, 26);
            // Repor cursor abaixo do cabecalho
            $this->SetY(30);
        }

        function Footer() {
            $W = 210; $M = 14;
            $this->SetY(-14);
            $yF = $this->GetY();
            $this->SetFillColor(30, 58, 95);
            $this->Rect(0, $yF, $W, 14, 'F');
            $this->SetTextColor(160, 180, 210);
            $footerText = 'Navel-Acores, Lda — Todos os direitos reservados';
            if ($this->appVersion) {
                $footerText .= ' · v' . $this->appVersion;
            }
            $this->SetFont('Arial', '', 6);
            $this->SetXY($M, $yF + 3);
            $this->Cell($W - $M * 2 - 28, 4, $footerText, 0, 0, 'L');
            $this->SetXY($M, $yF + 7);
            $this->Cell($W - $M * 2 - 28, 4, 'Pico da Pedra & Ponta Delgada  |  296 205 290 / 296 630 120  |  www.navel.pt', 0, 0, 'L');
            $this->SetFont('Arial', 'B', 6.5);
            $this->SetXY($W - $M - 28, $yF + 4);
            $this->Cell(28, 4, 'Pagina ' . $this->PageNo() . ' de {nb}', 0, 0, 'R');
        }
    }

    $pdf = new NavelPDF('P', 'mm', 'A4');
    $pdf->numRel     = $num_rel;
    $pdf->tipo       = f($tipo);
    $pdf->appVersion = $app_version;
    $pdf->SetCreator('Navel Manutencoes');
    $pdf->SetAuthor('NAVEL-ACORES');
    $pdf->SetTitle('Relatorio ' . $num_rel);
    $pdf->AliasNbPages('{nb}');
    $pdf->SetAutoPageBreak(true, 18);
    $pdf->AddPage();
    $W = 210; $M = 14; $cW = $W - 2 * $M;

    // Tipo + Numero (primeira pagina, abaixo do Header automatico)
    $pdf->SetY(32);
    $pdf->SetTextColor(30, 58, 95);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->SetX($M);
    $pdf->Cell(0, 7, 'Relatorio de ' . f($tipo), 0, 1);
    $pdf->SetTextColor(13, 110, 253);
    $pdf->SetFont('Arial', 'B', 18);
    $pdf->SetX($M);
    $pdf->Cell(0, 9, $num_rel, 0, 1);
    $pdf->SetDrawColor(13, 110, 253);
    $pdf->SetLineWidth(0.5);
    $pdf->Line($M, $pdf->GetY(), $W - $M, $pdf->GetY());
    $pdf->Ln(5);

    // Dados do servico (etiquetas em ASCII, valores via f() do POST)
    $rows = [
        ['CLIENTE',        f($to_name)],
        ['EQUIPAMENTO',    f($equipamento)],
        ['DATA EXECUCAO',  f($data_real)],
        ['TECNICO',        f($tecnico)],
        ['ASSINADO POR',   f($assinado_por)],
    ];
    $pdf->SetFont('Arial', '', 9);
    foreach ($rows as $i => [$label, $val]) {
        if ($i % 2 === 1) {
            $pdf->SetFillColor(248, 249, 250);
            $pdf->Rect($M, $pdf->GetY(), $cW, 8, 'F');
        }
        $pdf->SetX($M + 1);
        $pdf->SetTextColor(107, 114, 128);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(52, 8, $label, 0, 0);
        $pdf->SetTextColor(17, 24, 39);
        $pdf->SetFont('Arial', '', 9);
        $pdf->MultiCell($cW - 53, 8, $val, 0, 'L');
    }
    $pdf->SetDrawColor(220, 220, 220);
    $pdf->SetLineWidth(0.3);
    $pdf->Line($M, $pdf->GetY(), $W - $M, $pdf->GetY());
    $pdf->Ln(5);

    // Checklist
    if (count($checklist) > 0) {
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetTextColor(30, 58, 95);
        $pdf->SetX($M);
        $pdf->Cell(0, 7, 'CHECKLIST DE VERIFICACAO', 0, 1);
        $pdf->SetFont('Arial', '', 8);
        $pdf->SetTextColor(107, 114, 128);
        $pdf->SetX($M);
        $pdf->Cell(0, 5, $nSim . ' conforme  /  ' . $nNao . ' nao conforme  (' . count($checklist) . ' itens)', 0, 1);
        $pdf->Ln(1);
        $pdf->SetFont('Arial', '', 8.5);
        foreach ($checklist as $i => $item) {
            $resp  = $item['resp'] ?? '';
            $badge = $resp === 'sim' ? 'SIM' : ($resp === 'nao' ? 'NAO' : '-');
            if ($i % 2 === 0) {
                $pdf->SetFillColor(249, 250, 251);
                $pdf->Rect($M, $pdf->GetY(), $cW, 7, 'F');
            }
            $pdf->SetX($M + 1);
            $pdf->SetTextColor(107, 114, 128);
            $pdf->Cell(6, 7, ($i + 1) . '.', 0, 0);
            $pdf->SetTextColor(55, 65, 81);
            $pdf->Cell($cW - 20, 7, f(mb_substr($item['texto'] ?? '', 0, 80, 'UTF-8')), 0, 0);
            if ($resp === 'sim') $pdf->SetTextColor(22, 163, 74);
            elseif ($resp === 'nao') $pdf->SetTextColor(220, 38, 38);
            else $pdf->SetTextColor(107, 114, 128);
            $pdf->SetFont('Arial', 'B', 8.5);
            $pdf->Cell(14, 7, $badge, 0, 1, 'R');
            $pdf->SetFont('Arial', '', 8.5);
        }
        $pdf->Ln(3);
    }

    // Notas
    if ($notas) {
        if ($pdf->GetY() > 250) $pdf->AddPage();
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetTextColor(30, 58, 95);
        $pdf->SetX($M);
        $pdf->Cell(0, 7, 'NOTAS ADICIONAIS', 0, 1);
        $pdf->SetFont('Arial', '', 9);
        $pdf->SetTextColor(55, 65, 81);
        $pdf->SetX($M);
        $pdf->MultiCell($cW, 5.5, f($notas), 0, 'L');
        $pdf->Ln(3);
    }

    // Fotos — incluir 1-2 imagens no PDF (melhor qualidade, 70x70 mm)
    $photos_for_pdf = array_slice($photos, 0, 2);
    if (count($photos_for_pdf) > 0) {
        foreach ($photos_for_pdf as $idx => $p) {
            if ($pdf->GetY() > 200) $pdf->AddPage();
            $bin = null;
            $ext = '.jpg';
            if (strpos($p, 'data:image/') === 0) {
                $ext = (strpos($p, 'image/png') !== false) ? '.png' : '.jpg';
                $comma = strpos($p, ',');
                if ($comma !== false) $bin = base64_decode(substr($p, $comma + 1), true);
            }
            if ($bin !== false && strlen($bin) > 0) {
                $tmp = tempnam(sys_get_temp_dir(), 'nav') . $ext;
                if (file_put_contents($tmp, $bin)) {
                    $imgW = 70;
                    $imgH = 70;
                    $pdf->Image($tmp, $M, $pdf->GetY(), $imgW, $imgH);
                    $pdf->SetY($pdf->GetY() + $imgH + 2);
                }
                @unlink($tmp);
            }
        }
        if ($n_fotos > 2) {
            $pdf->SetFont('Arial', '', 7.5);
            $pdf->SetTextColor(107, 114, 128);
            $pdf->SetX($M);
            $pdf->Cell(0, 5, '+ ' . ($n_fotos - 2) . ' fotografia(s) adicionais no email', 0, 1);
        }
        $pdf->Ln(3);
    } elseif ($n_fotos > 0) {
        if ($pdf->GetY() > 250) $pdf->AddPage();
        $pdf->SetFont('Arial', '', 8);
        $pdf->SetTextColor(107, 114, 128);
        $pdf->SetX($M);
        $pdf->Cell(0, 5, $n_fotos . ' fotografia(s) documentadas no sistema.', 0, 1);
        $pdf->Ln(2);
    }

    // Assinatura — incluir imagem da assinatura manuscrita (prova de presença, cumprimento legal)
    if ($pdf->GetY() > 230) $pdf->AddPage();
    $pdf->SetFillColor(240, 253, 244);
    $pdf->SetDrawColor(187, 247, 208);
    $y0 = $pdf->GetY();
    $boxH = $assinatura_bin ? 42 : 28;
    $pdf->Rect($M, $y0, $cW, $boxH, 'FD');
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetTextColor(22, 163, 74);
    $pdf->SetXY($M + 3, $y0 + 2);
    $pdf->Cell(0, 0, 'Relatorio assinado digitalmente', 0, 1);
    $pdf->SetFont('Arial', '', 8);
    $pdf->SetTextColor(55, 65, 81);
    $sig_name = $assinado_por ? f($assinado_por) : '';
    $sig_txt  = $sig_name
        ? 'Assinado por ' . $sig_name . ' em ' . f($data_real) . '.'
        : 'Assinado em ' . f($data_real) . '.';
    $pdf->SetXY($M + 3, $y0 + 7);
    $pdf->Cell(0, 0, $sig_txt, 0, 1);

    if ($assinatura_bin) {
        $fmt = detect_image_format($assinatura_bin);
        if ($fmt) {
            $tmp = tempnam(sys_get_temp_dir(), 'nav') . $fmt['ext'];
            if (file_put_contents($tmp, $assinatura_bin)) {
                $sigW = 65;
                $sigH = 28;
                $pdf->Image($tmp, $M + 3, $y0 + 12, $sigW, $sigH, $fmt['type']);
                @unlink($tmp);
            }
        }
    }
    $pdf->SetY($y0 + $boxH + 3);

    $pdf_data = $pdf->Output('S');
}

// -- HTML do email -----------------------------------------------------------
$esc   = 'htmlspecialchars';
$tipo_h = $esc($tipo);
$html  = '<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#f3f4f6;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
  <tr><td style="background:linear-gradient(135deg,#1e3a5f,#0d6efd);padding:18px 24px;">
    <span style="color:#fff;font-size:20px;font-weight:800;">NAVEL-A&Ccedil;ORES</span>
    <span style="float:right;color:rgba(255,255,255,.7);font-size:11px;line-height:1.8;">296 205 290<br>geral@navel.pt</span>
  </td></tr>
  <tr><td style="padding:20px 24px 8px;border-bottom:3px solid #0d6efd;">
    <div style="font-size:17px;font-weight:700;color:#1e3a5f;">Relat&oacute;rio de ' . $tipo_h . '</div>
    <div style="font-size:22px;font-weight:800;color:#0d6efd;font-family:monospace;margin-top:4px;">' . $esc($num_rel) . '</div>
  </td></tr>
  <tr><td style="padding:16px 24px;">';

$drows = [
    ['Cliente',       $to_name],
    ['Equipamento',   $equipamento],
    ['Data execu&ccedil;&atilde;o', $data_real],
    ['T&eacute;cnico', $tecnico],
    ['Assinado por',  $assinado_por],
];
if (count($checklist) > 0) {
    $drows[] = ['Checklist', $nSim . ' conforme / ' . $nNao . ' nao conforme (' . count($checklist) . ' itens)'];
}

$html .= '<table width="100%" cellpadding="0" cellspacing="0">';
foreach ($drows as $i => [$l, $v]) {
    $bg = ($i % 2 === 1) ? 'background:#f9fafb;' : '';
    $html .= '<tr style="' . $bg . '"><td style="padding:6px 8px;width:38%;color:#6b7280;font-size:11px;text-transform:uppercase;">'
           . $l . '</td><td style="padding:6px 8px;color:#111827;font-size:13px;">'
           . $esc((string)$v) . '</td></tr>';
}
$html .= '</table></td></tr>';

if ($notas) {
    $html .= '<tr><td style="padding:0 24px 12px;"><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px;font-size:13px;color:#374151;">'
           . nl2br($esc($notas)) . '</div></td></tr>';
}
if ($pdf_data) {
    $html .= '<tr><td style="padding:0 24px 12px;">'
           . '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px;color:#1d4ed8;font-weight:700;font-size:12px;">'
           . 'Relat&oacute;rio PDF em anexo'
           . '</div></td></tr>';
}

// Galeria de fotos
if (count($photos) > 0) {
    $html .= '<tr><td style="padding:0 24px 14px;">';
    $html .= '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#92400e;margin-bottom:8px;">Fotografias do servi&ccedil;o (' . count($photos) . ')</div>';
    $html .= '<table cellpadding="0" cellspacing="4" style="border-collapse:separate;"><tr>';
    foreach ($photos as $idx => $thumb) {
        if ($idx > 0 && $idx % 3 === 0) $html .= '</tr><tr>';
        $html .= '<td style="padding:3px;"><img src="' . $thumb . '" alt="Foto ' . ($idx + 1) . '" width="160" style="display:block;border-radius:6px;border:1px solid #e5e7eb;max-width:160px;"></td>';
    }
    $html .= '</tr></table></td></tr>';
}

// Bloco de assinatura com nome e data completa
$sig_txt_email = '';
if ($assinado_por) {
    $sig_txt_email .= 'Assinado por <strong>' . $esc($assinado_por) . '</strong>';
    if ($data_real) $sig_txt_email .= ', em ' . $esc($data_real);
    $sig_txt_email .= '. Assinatura arquivada no sistema.';
} else {
    $sig_txt_email = 'Relat&oacute;rio assinado digitalmente. Assinatura arquivada no sistema.';
}
$html .= '<tr><td style="padding:0 24px 12px;">'
       . '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;">'
       . '<div style="color:#16a34a;font-weight:700;font-size:12px;margin-bottom:4px;">Relat&oacute;rio assinado digitalmente</div>'
       . '<div style="color:#374151;font-size:12px;">' . $sig_txt_email . '</div>'
       . '</div></td></tr>';

// Próxima manutenção agendada
if ($proxima_manut) {
    $html .= '<tr><td style="padding:0 24px 16px;">'
           . '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:12px;">'
           . '<div style="color:#92400e;font-weight:700;font-size:12px;margin-bottom:4px;">Pr&oacute;xima interven&ccedil;&atilde;o agendada</div>'
           . '<div style="color:#374151;font-size:12px;">'
           . 'A pr&oacute;xima interven&ccedil;&atilde;o para este equipamento encontra-se agendada para '
           . '<strong>' . $esc($proxima_manut) . '</strong>. '
           . 'Caso pretenda agendar essa manut&eacute;n&ccedil;&atilde;o para nova data, queira por favor contactar os nossos servi&ccedil;os.'
           . '</div></div></td></tr>';
}

$html .= '<tr><td style="background:#1e3a5f;padding:14px 24px;color:rgba(255,255,255,.65);font-size:10px;text-align:center;line-height:1.9;">'
       . 'JOS&Eacute; GON&Ccedil;ALVES CERQUEIRA (NAVEL-A&Ccedil;ORES), Lda.<br>'
       . 'Div. Comercial: Pico d\'Agua Park, Rua 5 &mdash; 9600-049 Pico da Pedra<br>'
       . 'Sede/Oficinas: Rua Eng.&ordm; Abel Ferin Coutinho &mdash; 9501-802 Ponta Delgada<br>'
       . 'Tel: 296 205 290 / 296 630 120 &mdash; www.navel.pt'
       . '</td></tr>'
       . '</table></td></tr></table></body></html>';

$text = "Exmo(a) Sr(a) " . $to_name . ",\r\n\r\n"
      . "Enviamos o relatorio de " . $tipo . " N. " . $num_rel . ".\r\n\r\n"
      . "Equipamento: " . $equipamento . "\r\n"
      . "Data: " . $data_real . "\r\n"
      . "Tecnico: " . $tecnico . "\r\n"
      . ($pdf_data ? "O relatorio em PDF encontra-se em anexo.\r\n" : "")
      . "\r\nNAVEL-ACORES - 296 205 290 - www.navel.pt";

// -- MIME --------------------------------------------------------------------
$outer = '----=_NavelOuter_' . md5(uniqid());
$inner = '----=_NavelInner_' . md5(uniqid());
$subj  = '=?UTF-8?B?' . base64_encode('Relatorio N. ' . $num_rel . ' - NAVEL-ACORES') . '?=';
$fname = preg_replace('/[^a-zA-Z0-9._\-]/', '_', 'relatorio_' . $num_rel . '.pdf');

if ($pdf_data) {
    $pdf_b64 = chunk_split(base64_encode($pdf_data), 76, "\r\n");
    $body    = "--$outer\r\nContent-Type: multipart/alternative; boundary=\"$inner\"\r\n\r\n";
    $body   .= "--$inner\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n$text\r\n";
    $body   .= "--$inner\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n$html\r\n--$inner--\r\n\r\n";
    $body   .= "--$outer\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"$fname\"\r\n\r\n$pdf_b64\r\n--$outer--\r\n";
    $hdr     = "MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$outer\"\r\n";
} else {
    $body  = "--$inner\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n$text\r\n";
    $body .= "--$inner\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n$html\r\n--$inner--\r\n";
    $hdr   = "MIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"$inner\"\r\n";
}
$hdr .= 'From: ' . FROM_EMAIL . "\r\n"
      . 'Reply-To: ' . REPLY_TO . "\r\n"
      . 'X-Mailer: PHP/' . phpversion() . "\r\n";

$sent = false;
try { $sent = @mail($to_email, $subj, $body, $hdr); } catch (Throwable $e) {
    if (function_exists('atm_log_api')) {
        $GLOBALS['_atm_log_user'] = $to_email;
        $GLOBALS['_atm_log_route'] = 'send-email/mail';
        atm_log_api('error', 'send-email', 'mail', 'Falha no mail(): ' . $e->getMessage(), ['to' => $to_email]);
    }
    @error_log('[send-email] mail() exception: ' . $e->getMessage());
}

$pdf_kb = $pdf_data ? round(strlen($pdf_data) / 1024) . ' KB' : 'nao gerado (fpdf.php ausente?)';
$msg    = $sent
    ? 'Email enviado para ' . $to_email . '. PDF: ' . $pdf_kb . ' em anexo.'
    : 'Falha no mail(). PDF: ' . $pdf_kb . '. Verificar Track Delivery.';

http_response_code($sent ? 200 : 500);
echo json_encode(['ok' => $sent, 'message' => $msg]);
