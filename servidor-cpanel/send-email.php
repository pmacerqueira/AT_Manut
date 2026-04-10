<?php
@error_log(date('Y-m-d H:i:s') . " [DBG] === SEND-EMAIL.PHP HIT === method=" . ($_SERVER['REQUEST_METHOD'] ?? '?') . " size=" . ($_SERVER['CONTENT_LENGTH'] ?? '?') . "\n", 3, __DIR__ . '/atm_debug.log');
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
 * URL:         https://navel.pt/api/send-email.php (canónico; www redirecciona)
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
    @error_log(date('Y-m-d H:i:s') . " ERR($no): $str [" . basename($file) . ":$line]\n", 3, __DIR__ . '/atm_debug.log');
    if ($atm_log_loaded) atm_log_api('error', 'send-email', 'php_error', $str, ['file' => basename($file), 'line' => $line]);
    $fatal = in_array($no, [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR]);
    if ($fatal) {
        http_response_code(500);
        $msg = str_replace(['"', "\n", "\r"], ["'", ' ', ''], $str);
        echo '{"ok":false,"message":"Erro PHP (' . $no . '): ' . $msg . '"}';
        exit;
    }
    return true;
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
define('REPLY_TO',   'comercial@navel.pt');
/** Alinhar com `src/constants/empresa.js` (frontend) — única fonte de verdade para copy/paste PHP */
define('ATM_RAZAO_SOCIAL', 'José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.');
define('ATM_MARCA_CURTA', 'NAVEL-AÇORES');

function _dbg($msg) {
    @error_log(date('Y-m-d H:i:s') . " [DBG] $msg\n", 3, __DIR__ . '/atm_debug.log');
}

/**
 * True se o pedido vem de Vite/Playwright (Origin ou Referer localhost).
 * Nesses casos o To é forçado para a caixa interna — evita E2E/dev a enviarem para clientes reais.
 */
function atm_request_from_local_dev(): bool {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $ref    = $_SERVER['HTTP_REFERER'] ?? '';
    $rx     = '#^https?://(\[::1\]|localhost|127\.0\.0\.1)(?::\d+)?(?:/|$)#i';
    if ($origin !== '' && preg_match($rx, $origin)) {
        return true;
    }
    if ($ref !== '' && preg_match($rx, $ref)) {
        return true;
    }
    return false;
}

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
$tipo_email      = $g('tipo_email', 'relatorio');   // 'relatorio' | 'lembrete'
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
$tecnico_tel     = $g('tecnico_telefone');
$tecnico_sig_b64 = $g('tecnico_assinatura_b64');
$manutencao_tipo        = $g('manutencao_tipo', 'periodica');
if (!in_array($manutencao_tipo, ['montagem', 'periodica', 'reparacao'], true)) {
    $manutencao_tipo = 'periodica';
}
$declaracao_legislacao = $g('declaracao_legislacao', 'outros');
if (!in_array($declaracao_legislacao, ['elevadores', 'compressores', 'outros'], true)) {
    $declaracao_legislacao = 'outros';
}
// Texto completo da declaração já resolvido no browser (override por categoria + canónico) — evita duplicar regras no PHP
$declaracao_texto = isset($_data['declaracao_texto']) ? trim((string)$_data['declaracao_texto']) : '';
$periodicidade_maquina  = $g('periodicidade_maquina');
$proximas_manut_json    = $g('proximas_manutencoes_json');
$pecas_usadas_json      = $g('pecas_usadas_json');
$navel_logo_b64         = isset($_data['navel_logo_b64']) ? (string)$_data['navel_logo_b64'] : '';
$brand_logo_b64         = isset($_data['brand_logo_b64']) ? (string)$_data['brand_logo_b64'] : '';
$rep_num_aviso          = isset($_data['reparacao_numero_aviso']) ? trim((string)$_data['reparacao_numero_aviso']) : '';
$rep_desc_avaria        = isset($_data['reparacao_descricao_avaria']) ? trim((string)$_data['reparacao_descricao_avaria']) : '';
$rep_trabalho           = isset($_data['reparacao_trabalho_realizado']) ? trim((string)$_data['reparacao_trabalho_realizado']) : '';
$rep_horas_mo           = isset($_data['reparacao_horas_mao_obra']) ? trim((string)$_data['reparacao_horas_mao_obra']) : '';

// Auth
if ($token !== AUTH_TOKEN) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Acesso negado.']);
    exit;
}

if (atm_request_from_local_dev()) {
    $to_email = getenv('ATM_DEV_SANDBOX_EMAIL') ?: 'comercial@navel.pt';
}

_dbg("START to=$to_email rel=$num_rel tipo=$tipo_email");

// Validate email
$to_email = filter_var($to_email, FILTER_VALIDATE_EMAIL);
if (!$to_email) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Email de destino invalido.']);
    exit;
}

// Sanitise user-supplied fields
foreach (['to_name', 'equipamento', 'tecnico', 'assinado_por', 'notas', 'tecnico_tel'] as $v) {
    $$v = mb_substr(strip_tags(str_replace(["\r", "\n", "\0"], '', $$v)), 0, 500, 'UTF-8');
}
$to_email = str_replace(["\r", "\n", "\0"], '', $to_email);

// ══ Lembrete de manutenção próxima ══════════════════════════════════════════
if ($tipo_email === 'lembrete') {
    $alertas_json  = $g('alertas_json');
    $alertas       = [];
    if ($alertas_json) {
        $dec = json_decode($alertas_json, true);
        if (is_array($dec)) $alertas = $dec;
    }
    if (empty($alertas)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'message' => 'Sem manutenções para notificar.']);
        exit;
    }

    $to_name_safe = mb_substr(strip_tags($to_name), 0, 120, 'UTF-8');
    $app_ver      = $g('app_version', '1.6.0');

    // Construir linhas da tabela
    $linhas_html = '';
    foreach ($alertas as $a) {
        $maq     = mb_substr(strip_tags($a['maquina']  ?? '—'), 0, 120, 'UTF-8');
        $serie   = mb_substr(strip_tags($a['serie']    ?? '—'), 0, 60,  'UTF-8');
        $data    = mb_substr(strip_tags($a['data']     ?? '—'), 0, 20,  'UTF-8');
        $dias    = (int)($a['diasRestantes'] ?? 0);

        if ($dias === 0)    { $dias_txt = 'Hoje'; $cor = '#dc2626'; }
        elseif ($dias <= 2) { $dias_txt = "Amanhã / $dias dias"; $cor = '#c2410c'; }
        elseif ($dias <= 7) { $dias_txt = "Daqui a $dias dias"; $cor = '#a16207'; }
        else                { $dias_txt = "Daqui a $dias dias"; $cor = '#166534'; }

        $linhas_html .= "
        <tr>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;'>$maq</td>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:0.85em;'>$serie</td>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;'>$data</td>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:$cor;white-space:nowrap;'>$dias_txt</td>
        </tr>";
    }

    $subject  = "=?UTF-8?B?" . base64_encode("Lembrete: Manutenções programadas — $to_name_safe") . "?=";
    $atm_marca_h = htmlspecialchars(ATM_MARCA_CURTA, ENT_QUOTES, 'UTF-8');
    $atm_razao_h = htmlspecialchars(ATM_RAZAO_SOCIAL, ENT_QUOTES, 'UTF-8');
    $html_body = "<!DOCTYPE html><html lang='pt'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f9fafb;padding:24px 16px;'>
  <tr><td align='center'>
    <table width='560' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:100%;'>

      <!-- Cabeçalho -->
      <tr>
        <td style='background:#1a4880;padding:22px 28px;'>
          <p style='margin:0;font-size:1.15em;font-weight:700;color:#fff;'>$atm_marca_h</p>
          <p style='margin:4px 0 0;font-size:0.8em;color:#bfdbfe;'>AT_Manut v$app_ver · Gestão de Manutenções</p>
        </td>
      </tr>

      <!-- Saudação -->
      <tr>
        <td style='padding:24px 28px 16px;'>
          <p style='margin:0;font-size:1em;color:#111827;'>Exmo(a) Sr(a) <strong>$to_name_safe</strong>,</p>
          <p style='margin:10px 0 0;font-size:0.9em;color:#374151;line-height:1.5;'>
            Informamos que tem as seguintes manutenções programadas nos próximos dias para os equipamentos $atm_marca_h
            instalados na sua empresa. Por favor confirme a disponibilidade com a nossa equipa técnica.
          </p>
        </td>
      </tr>

      <!-- Tabela de manutenções -->
      <tr>
        <td style='padding:0 28px 20px;'>
          <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:0.85em;'>
            <thead>
              <tr style='background:#f3f4f6;'>
                <th style='padding:9px 12px;text-align:left;color:#374151;font-weight:700;'>Equipamento</th>
                <th style='padding:9px 12px;text-align:left;color:#374151;font-weight:700;'>N.º série</th>
                <th style='padding:9px 12px;text-align:left;color:#374151;font-weight:700;'>Data prevista</th>
                <th style='padding:9px 12px;text-align:left;color:#374151;font-weight:700;'>Prazo</th>
              </tr>
            </thead>
            <tbody>
              $linhas_html
            </tbody>
          </table>
        </td>
      </tr>

      <!-- Contacto -->
      <tr>
        <td style='padding:0 28px 24px;'>
          <p style='margin:0;font-size:0.85em;color:#6b7280;line-height:1.5;'>
            Para agendar ou esclarecer qualquer questão, contacte-nos:<br>
            <strong>296 205 290 / 296 630 120</strong> · <a href='mailto:comercial@navel.pt' style='color:#1a4880;'>comercial@navel.pt</a>
          </p>
        </td>
      </tr>

      <!-- Rodapé -->
      <tr>
        <td style='background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 28px;font-size:0.75em;color:#9ca3af;text-align:center;'>
          $atm_razao_h — Todos os direitos reservados · AT_Manut v$app_ver
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>";

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: =?UTF-8?B?" . base64_encode(ATM_RAZAO_SOCIAL) . "?= <" . FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . REPLY_TO . "\r\n";
    $headers .= "Cc: " . REPLY_TO . "\r\n";   // CC sempre ao admin
    $headers .= "X-Mailer: AT_Manut/$app_ver\r\n";

    $ok = @mail($to_email, $subject, $html_body, $headers);
    if ($ok) {
        echo json_encode(['ok' => true, 'message' => "Lembrete enviado para $to_email."]);
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Falha ao enviar email (mail() retornou false).']);
    }
    exit;
}

// Checklist
$checklist = [];
if ($checklist_json) {
    $decoded = json_decode($checklist_json, true);
    if (is_array($decoded)) $checklist = $decoded;
}
$nSim = count(array_filter($checklist, function ($i) {
    $r = $i['resp'] ?? '';
    return $r === 'sim' || $r === 'OK';
}));
$nNao = count(array_filter($checklist, function ($i) {
    $r = $i['resp'] ?? '';
    return $r === 'nao' || $r === 'NOK';
}));

// Próximas manutenções + peças (JSON — alinhado com gerarPdfCompacto)
$proximas_list = [];
if ($proximas_manut_json) {
    $dec = json_decode($proximas_manut_json, true);
    if (is_array($dec)) {
        $proximas_list = $dec;
        usort($proximas_list, function ($a, $b) {
            return strcmp($a['data'] ?? '', $b['data'] ?? '');
        });
    }
}
$pecas_list = [];
if ($pecas_usadas_json) {
    $dec = json_decode($pecas_usadas_json, true);
    if (is_array($dec)) $pecas_list = $dec;
}

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

// Limite alinhado à app React (PDF + corpo HTML estáveis em tablets / memória PHP)
if (!defined('ATM_MAX_FOTOS_RELATORIO')) {
    define('ATM_MAX_FOTOS_RELATORIO', 6);
}
$photos_total_for_note = count($photos);
if (count($photos) > ATM_MAX_FOTOS_RELATORIO) {
    $photos = array_slice($photos, 0, ATM_MAX_FOTOS_RELATORIO);
}

// Assinatura digital do cliente: raw base64 (PNG do canvas) → binário
$assinatura_bin = null;
if ($assinatura_b64) {
    $dec = base64_decode($assinatura_b64, true);
    if ($dec !== false && strlen($dec) > 0) $assinatura_bin = $dec;
}

// Assinatura digital do técnico: raw base64 → binário
$tecnico_sig_bin = null;
if ($tecnico_sig_b64) {
    $dec = base64_decode($tecnico_sig_b64, true);
    if ($dec !== false && strlen($dec) > 0) $tecnico_sig_bin = $dec;
}

// -- Declaração de aceitação (alinhado a src/constants/relatorio.js + declaracao_legislacao) -----
function texto_declaracao_cliente($tipo, $legislacao = 'outros') {
    $labels = [
        'montagem'  => 'montagem',
        'periodica' => 'manutenção',
        'reparacao' => 'reparação',
    ];
    $mid = $labels[$tipo] ?? 'manutenção';
    $antes = 'Declaro que li e concordo com o que foi relatado pelo técnico na';
    $depois_elev = 'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos de todas as manutenções realizadas, de acordo com o manual do fabricante, bem como a preservar toda a documentação exigível para o equipamento (Manual de Utilizador e Declaração de Conformidade CE), conservando os relatórios de manutenções preventivas realizadas pelo fornecedor NAVEL-AÇORES pelo período mínimo de dois anos, no estrito cumprimento da legislação em vigor, nomeadamente: Norma Europeia EN 1493:2022, Diretiva Máquinas 2006/42/CE (e Regulamento (UE) 2023/1230, quando aplicável) e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho.';
    $depois_comp = 'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos das manutenções e intervenções realizadas, de acordo com as recomendações e manual do fabricante, bem como a preservar a documentação técnica pertinente (manuais, instruções e Declaração de Conformidade CE quando aplicável), conservando os relatórios de manutenções e assistência técnica realizados pelo fornecedor NAVEL-AÇORES pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, no estrito cumprimento da legislação em vigor, nomeadamente: Diretiva Máquinas 2006/42/CE e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho, e no que respeita a equipamento sob pressão e instalações de ar comprimido, a Diretiva 2014/68/UE relativa aos equipamentos sob pressão e o respectivo enquadramento nacional (nomeadamente o Decreto-Lei n.º 32/2015, de 4 de março, e legislação complementar aplicável aos equipamentos sob pressão).';
    $depois_outros = 'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos das manutenções e intervenções realizadas, de acordo com as recomendações e manual do fabricante, bem como a preservar a documentação técnica pertinente ao equipamento (manuais, instruções e certificados quando aplicáveis), conservando os relatórios de manutenções e assistência técnica realizados pelo fornecedor NAVEL-AÇORES pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, em conformidade com a legislação e normas aplicáveis ao mesmo e com as regras de segurança e saúde no trabalho.';
    // Textos canónicos para reparação (intervenção corretiva) — alinhados a src/constants/relatorio.js
    $rep_elev = 'do equipamento relativamente à intervenção de reparação e assistência técnica realizada, que declarei compreender, e que obtive as informações necessárias ao manuseamento seguro do equipamento após a intervenção, comprometendo-me a conservar este relatório e a documentação técnica exigível (nomeadamente Manual de Utilizador e Declaração de Conformidade CE) pelo período mínimo de dois anos ou pelo prazo aplicável, no estrito cumprimento da legislação em vigor, nomeadamente: Norma Europeia EN 1493:2022, Diretiva Máquinas 2006/42/CE (e Regulamento (UE) 2023/1230, quando aplicável) e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho.';
    $rep_comp = 'do equipamento relativamente à intervenção de reparação e assistência técnica realizada, que declarei compreender, e que obtive as informações necessárias ao manuseamento seguro do equipamento após a intervenção, comprometendo-me a conservar este e demais relatórios de intervenção realizados pelo fornecedor NAVEL-AÇORES e a documentação técnica pertinente (manuais, instruções e Declaração de Conformidade CE quando aplicável) pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, no estrito cumprimento da legislação em vigor, nomeadamente: Diretiva Máquinas 2006/42/CE e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho, e no que respeita a equipamento sob pressão e instalações de ar comprimido, a Diretiva 2014/68/UE relativa aos equipamentos sob pressão e o respectivo enquadramento nacional (nomeadamente o Decreto-Lei n.º 32/2015, de 4 de março, e legislação complementar aplicável aos equipamentos sob pressão).';
    $rep_out = 'do equipamento relativamente à intervenção de reparação e assistência técnica realizada, que declarei compreender, e que obtive as informações necessárias ao manuseamento seguro do equipamento após a intervenção, comprometendo-me a conservar este e demais relatórios de intervenção realizados pelo fornecedor NAVEL-AÇORES e a documentação técnica pertinente ao equipamento (manuais, instruções e certificados quando aplicáveis) pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, em conformidade com a legislação e normas aplicáveis ao mesmo e com as regras de segurança e saúde no trabalho.';
    if ($tipo === 'reparacao') {
        if ($legislacao === 'elevadores') {
            $depois = $rep_elev;
        } elseif ($legislacao === 'compressores') {
            $depois = $rep_comp;
        } else {
            $depois = $rep_out;
        }
    } elseif ($legislacao === 'elevadores') {
        $depois = $depois_elev;
    } elseif ($legislacao === 'compressores') {
        $depois = $depois_comp;
    } else {
        $depois = $depois_outros;
    }
    return $antes . ' ' . $mid . ' ' . $depois;
}

function fmt_data_iso_br($iso) {
    if (!is_string($iso) || strlen($iso) < 10) return '-';
    $p = explode('-', substr($iso, 0, 10));
    if (count($p) !== 3) return '-';
    return $p[2] . '/' . $p[1] . '/' . $p[0];
}

// -- Helper: converte UTF-8 (dados do formulario) para Latin-1 (FPDF) --------
function f($s) {
    $s = (string)($s ?? '');
    if ($s === '') return '';
    if (function_exists('iconv')) {
        $r = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $s);
        if ($r !== false) return $r;
        $r = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $s);
        if ($r !== false) return $r;
    }
    if (function_exists('mb_convert_encoding')) {
        $r = @mb_convert_encoding($s, 'ISO-8859-1', 'UTF-8');
        if ($r !== false) return $r;
    }
    return preg_replace('/[^\x20-\x7E]/', '?', $s);
}

// -- Helper: detecta formato de imagem pelos magic bytes -----------------------
function detect_image_format($bin) {
    if (!is_string($bin) || strlen($bin) < 12) return null;
    $h = bin2hex(substr($bin, 0, 8));
    if ($h === '89504e470d0a1a0a') return ['ext' => '.png', 'type' => 'PNG'];
    if (substr($h, 0, 6) === 'ffd8ff') return ['ext' => '.jpg', 'type' => 'JPEG'];
    return null;
}

// -- Helper: converte imagem binária para JPEG fundo branco (seguro para FPDF) --
// FPDF não suporta PNG com canal alfa — esta função converte qualquer imagem para JPEG.
function to_safe_jpeg($bin) {
    if (!$bin || !is_string($bin) || strlen($bin) < 100) return null;
    if (!function_exists('imagecreatefromstring')) {
        @error_log(date('Y-m-d H:i:s') . " GD NOT AVAILABLE\n", 3, __DIR__ . '/atm_debug.log');
        return null;
    }
    $src = @imagecreatefromstring($bin);
    if (!$src) {
        @error_log(date('Y-m-d H:i:s') . " imagecreatefromstring FAILED\n", 3, __DIR__ . '/atm_debug.log');
        return null;
    }
    $w = imagesx($src);
    $h = imagesy($src);
    $dst = @imagecreatetruecolor($w, $h);
    if (!$dst) { imagedestroy($src); return null; }
    $white = imagecolorallocate($dst, 255, 255, 255);
    imagefill($dst, 0, 0, $white);
    imagecopy($dst, $src, 0, 0, 0, 0, $w, $h);
    imagedestroy($src);
    $tmp = tempnam(sys_get_temp_dir(), 'nav') . '.jpg';
    $ok = @imagejpeg($dst, $tmp, 90);
    imagedestroy($dst);
    if (!$ok || !file_exists($tmp) || filesize($tmp) < 100) {
        @unlink($tmp);
        return null;
    }
    return $tmp;
}

// -- Gerar PDF com FPDF ------------------------------------------------------
_dbg("PRE-PDF sig_cli=" . strlen($assinatura_b64) . " sig_tec=" . strlen($tecnico_sig_b64) . " photos=" . count($photos));
$pdf_data = null;
$pdf_error = '';

if (file_exists(__DIR__ . '/fpdf.php')) {
  try {
    _dbg("FPDF loading");
    require_once __DIR__ . '/fpdf.php';

    // Subclasse com cabecalho e rodape automaticos em todas as paginas
    class NavelPDF extends FPDF {
        public $numRel     = '';
        public $tipo       = '';
        public $totalPg    = 0;
        public $appVersion = '';
        /** @var string|null caminho JPEG temporário (logo Navel) */
        public $pathLogoNavel = null;
        /** @var string|null caminho JPEG temporário (logo marca equipamento) */
        public $pathLogoBrand = null;

        function Error($msg) {
            throw new Exception('FPDF error: ' . $msg);
        }

        /**
         * Retângulo com cantos arredondados (FPDF script 35 — www.fpdf.org).
         */
        function RoundedRect($x, $y, $w, $h, $r, $style = 'F') {
            $k  = $this->k;
            $hp = $this->h;
            if ($style === 'F') {
                $op = 'f';
            } elseif ($style === 'FD' || $style === 'DF') {
                $op = 'B';
            } else {
                $op = 'S';
            }
            $MyArc = 4 / 3 * (sqrt(2) - 1);
            $this->_out(sprintf('%.2F %.2F m', ($x + $r) * $k, ($hp - $y) * $k));
            $xc = $x + $w - $r;
            $yc = $y + $r;
            $this->_out(sprintf('%.2F %.2F l', $xc * $k, ($hp - $y) * $k));
            $this->_roundedCornerArc($xc + $r * $MyArc, $yc - $r, $xc + $r, $yc - $r * $MyArc, $xc + $r, $yc);
            $xc = $x + $w - $r;
            $yc = $y + $h - $r;
            $this->_out(sprintf('%.2F %.2F l', ($x + $w) * $k, ($hp - $yc) * $k));
            $this->_roundedCornerArc($xc + $r, $yc + $r * $MyArc, $xc + $r * $MyArc, $yc + $r, $xc, $yc + $r);
            $xc = $x + $r;
            $yc = $y + $h - $r;
            $this->_out(sprintf('%.2F %.2F l', $xc * $k, ($hp - ($y + $h)) * $k));
            $this->_roundedCornerArc($xc - $r * $MyArc, $yc + $r, $xc - $r, $yc + $r * $MyArc, $xc - $r, $yc);
            $xc = $x + $r;
            $yc = $y + $r;
            $this->_out(sprintf('%.2F %.2F l', ($x) * $k, ($hp - $yc) * $k));
            $this->_roundedCornerArc($xc - $r, $yc - $r * $MyArc, $xc - $r * $MyArc, $yc - $r, $xc, $yc - $r);
            $this->_out($op);
        }

        function _roundedCornerArc($x1, $y1, $x2, $y2, $x3, $y3) {
            $h = $this->h;
            $k = $this->k;
            $this->_out(sprintf('%.2F %.2F %.2F %.2F %.2F %.2F c ', $x1 * $k, ($h - $y1) * $k,
                $x2 * $k, ($h - $y2) * $k, $x3 * $k, ($h - $y3) * $k));
        }

        /**
         * Imagem centrada em zona maxW x maxH (mm), proporção preservada (object-fit: contain).
         */
        function imageFitContain($path, $innerX, $innerY, $maxW, $maxH) {
            if (!is_string($path) || !file_exists($path)) {
                return;
            }
            $info = @getimagesize($path);
            if ($info === false || $info[0] < 1 || $info[1] < 1) {
                return;
            }
            $pxW = $info[0];
            $pxH = $info[1];
            $ratio = $pxW / $pxH;
            $boxRatio = $maxW / $maxH;
            if ($ratio > $boxRatio) {
                $w = $maxW;
                $h = $maxW / $ratio;
            } else {
                $h = $maxH;
                $w = $maxH * $ratio;
            }
            $ix = $innerX + ($maxW - $w) / 2;
            $iy = $innerY + ($maxH - $h) / 2;
            try {
                $this->Image($path, $ix, $iy, $w, $h);
            } catch (Exception $e) { /* noop */ }
        }

        function Header() {
            $W = 210;
            $M = 14;
            $headerH = 30;
            // Igual ao gerarPdfCompacto: mesma área interna e padding para os 2 logos
            $innerW = 40;
            $innerH = 13;
            $pad    = 3;
            $rCorn  = 3;
            $gap    = 4;

            $this->SetFillColor(30, 58, 95);
            $this->Rect(0, 0, $W, $headerH, 'F');
            $this->SetTextColor(255, 255, 255);

            $boxOuterW = $innerW + 2 * $pad;
            $boxOuterH = $innerH + 2 * $pad;
            $by = ($headerH - $boxOuterH) / 2;

            $logoEndX = $M;
            if (!empty($this->pathLogoNavel) && is_string($this->pathLogoNavel) && file_exists($this->pathLogoNavel)) {
                $bx = $M;
                $this->SetFillColor(255, 255, 255);
                $this->RoundedRect($bx, $by, $boxOuterW, $boxOuterH, min($rCorn, $boxOuterW / 2 - 0.1, $boxOuterH / 2 - 0.1), 'F');
                $this->imageFitContain($this->pathLogoNavel, $bx + $pad, $by + $pad, $innerW, $innerH);
                $logoEndX = $bx + $boxOuterW + $gap;
            } else {
                $this->SetFont('Arial', 'B', 13);
                $this->SetXY($M, 8);
                $this->Cell(60, 6, f(ATM_MARCA_CURTA), 0, 0);
                $logoEndX = $M + 64;
            }

            if (!empty($this->pathLogoBrand) && is_string($this->pathLogoBrand) && file_exists($this->pathLogoBrand)) {
                $this->SetFillColor(255, 255, 255);
                $this->RoundedRect($logoEndX, $by, $boxOuterW, $boxOuterH, min($rCorn, $boxOuterW / 2 - 0.1, $boxOuterH / 2 - 0.1), 'F');
                $this->imageFitContain($this->pathLogoBrand, $logoEndX + $pad, $by + $pad, $innerW, $innerH);
            }

            $txW = $W - $M * 2;
            $this->SetFont('Arial', 'B', 8);
            $this->SetXY($M, 7);
            $this->Cell($txW, 4, f(ATM_RAZAO_SOCIAL), 0, 0, 'R');
            $this->SetFont('Arial', '', 7);
            $this->SetXY($M, 13);
            $this->Cell($txW, 4, f("Pico d'Agua Park • www.navel.pt"), 0, 0, 'R');
            $this->SetXY($M, 19);
            $this->Cell($txW, 4, f('São Miguel–Açores'), 0, 0, 'R');
            $this->SetFont('Arial', 'I', 6.5);
            $this->SetXY($M, 24);
            $this->Cell($txW, 4, 'Ref: ' . $this->numRel, 0, 0, 'R');

            $this->SetDrawColor(13, 110, 253);
            $this->SetLineWidth(0.4);
            $this->Line(0, $headerH, $W, $headerH);
            $this->SetY($headerH + 8);
        }

        function Footer() {
            $W = 210; $M = 14;
            $this->SetY(-14);
            $yF = $this->GetY();
            $this->SetFillColor(30, 58, 95);
            $this->Rect(0, $yF, $W, 14, 'F');
            $this->SetTextColor(160, 180, 210);
            $footerText = f(ATM_RAZAO_SOCIAL . ' — Todos os direitos reservados');
            if ($this->appVersion) {
                $footerText .= ' · v' . $this->appVersion;
            }
            $this->SetFont('Arial', '', 6);
            $this->SetXY($M, $yF + 3);
            $this->Cell($W - $M * 2 - 28, 4, $footerText, 0, 0, 'L');
            $this->SetXY($M, $yF + 7);
            $this->Cell($W - $M * 2 - 28, 4, "Pico d'Agua Park  |  www.navel.pt", 0, 0, 'L');
            $this->SetFont('Arial', 'B', 6.5);
            $this->SetXY($W - $M - 28, $yF + 4);
            $this->Cell(28, 4, 'Pagina ' . $this->PageNo() . ' de {nb}', 0, 0, 'R');
        }
    }

    _dbg("FPDF NavelPDF creating");
    $tmp_logo_navel = null;
    $tmp_logo_brand = null;
    if ($navel_logo_b64 !== '') {
        $decNv = base64_decode($navel_logo_b64, true);
        if ($decNv !== false && strlen($decNv) > 80) {
            $tmp_logo_navel = to_safe_jpeg($decNv);
        }
    }
    if ($brand_logo_b64 !== '') {
        $decBr = base64_decode($brand_logo_b64, true);
        if ($decBr !== false && strlen($decBr) > 80) {
            $tmp_logo_brand = to_safe_jpeg($decBr);
        }
    }

    $pdf = new NavelPDF('P', 'mm', 'A4');
    $pdf->numRel     = $num_rel;
    $pdf->tipo       = f($tipo);
    $pdf->appVersion = $app_version;
    $pdf->pathLogoNavel = $tmp_logo_navel;
    $pdf->pathLogoBrand = $tmp_logo_brand;
    $pdf->SetCreator('AT_Manut');
    $pdf->SetAuthor(ATM_RAZAO_SOCIAL);
    $pdf->SetTitle('Relatorio ' . $num_rel);
    $pdf->AliasNbPages('{nb}');
    $pdf->SetAutoPageBreak(true, 18);
    $pdf->AddPage();
    $W = 210; $M = 14; $cW = $W - 2 * $M;

    // Tipo + Numero (primeira pagina, abaixo do Header automatico — Y já definido no Header)
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
    $data_row_label = ($manutencao_tipo === 'reparacao') ? 'DATA DE REALIZACAO' : 'DATA EXECUCAO';
    $rows = [
        ['CLIENTE',        f($to_name)],
        ['EQUIPAMENTO',    f($equipamento)],
        [$data_row_label,  f($data_real)],
        ['TECNICO',        f($tecnico)],
        ['ASSINADO POR',   f($assinado_por)],
    ];
    if ($manutencao_tipo === 'reparacao') {
        if ($rep_num_aviso !== '') {
            $rows[] = ['N. AVISO / PEDIDO', f(mb_substr(strip_tags(str_replace(["\r", "\n", "\0"], ' ', $rep_num_aviso)), 0, 200, 'UTF-8'))];
        }
        // Avaria e trabalho: secções com título abaixo (igual ao PDF jsPDF — não na grelha)
        if ($rep_horas_mo !== '') {
            $rows[] = ['HORAS MAO-DE-OBRA', f($rep_horas_mo) . ' h'];
        }
    }
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

    if ($manutencao_tipo === 'reparacao') {
        if ($rep_desc_avaria !== '') {
            if ($pdf->GetY() > 240) {
                $pdf->AddPage();
            }
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetTextColor(30, 58, 95);
            $pdf->SetX($M);
            $pdf->Cell(0, 6, 'AVARIA / PROBLEMA REPORTADO', 0, 1);
            $pdf->SetFont('Arial', '', 9);
            $pdf->SetTextColor(55, 65, 81);
            $pdf->SetX($M);
            $pdf->MultiCell($cW, 5, f(mb_substr(strip_tags(str_replace(["\r", "\0"], '', $rep_desc_avaria)), 0, 5000, 'UTF-8')), 0, 'L');
            $pdf->Ln(3);
        }
        if ($rep_trabalho !== '') {
            if ($pdf->GetY() > 240) {
                $pdf->AddPage();
            }
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetTextColor(30, 58, 95);
            $pdf->SetX($M);
            $pdf->Cell(0, 6, 'TRABALHO REALIZADO', 0, 1);
            $pdf->SetFont('Arial', '', 9);
            $pdf->SetTextColor(55, 65, 81);
            $pdf->SetX($M);
            $pdf->MultiCell($cW, 5, f(mb_substr(strip_tags(str_replace(["\r", "\0"], '', $rep_trabalho)), 0, 5000, 'UTF-8')), 0, 'L');
            $pdf->Ln(3);
        }
    }

    $atm_section_order = ($manutencao_tipo === 'reparacao')
        ? ['pecas', 'fotos', 'notas', 'checklist']
        : ['checklist', 'notas', 'fotos', 'pecas'];

    foreach ($atm_section_order as $atm_sec) {
        if ($atm_sec === 'checklist') {
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
                    if ($resp === 'sim' || $resp === 'OK') {
                        $badge = 'SIM';
                    } elseif ($resp === 'nao' || $resp === 'NOK') {
                        $badge = 'NAO';
                    } elseif ($resp === 'N/A') {
                        $badge = 'N/A';
                    } else {
                        $badge = '-';
                    }
                    if ($i % 2 === 0) {
                        $pdf->SetFillColor(249, 250, 251);
                        $pdf->Rect($M, $pdf->GetY(), $cW, 7, 'F');
                    }
                    $pdf->SetX($M + 1);
                    $pdf->SetTextColor(107, 114, 128);
                    $pdf->Cell(6, 7, ($i + 1) . '.', 0, 0);
                    $pdf->SetTextColor(55, 65, 81);
                    $pdf->Cell($cW - 20, 7, f(mb_substr($item['texto'] ?? '', 0, 80, 'UTF-8')), 0, 0);
                    if ($resp === 'sim' || $resp === 'OK') {
                        $pdf->SetTextColor(22, 163, 74);
                    } elseif ($resp === 'nao' || $resp === 'NOK') {
                        $pdf->SetTextColor(220, 38, 38);
                    } else {
                        $pdf->SetTextColor(107, 114, 128);
                    }
                    $pdf->SetFont('Arial', 'B', 8.5);
                    $pdf->Cell(14, 7, $badge, 0, 1, 'R');
                    $pdf->SetFont('Arial', '', 8.5);
                }
                $pdf->Ln(3);
            }
        } elseif ($atm_sec === 'notas') {
            if ($notas) {
                if ($pdf->GetY() > 250) {
                    $pdf->AddPage();
                }
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
        } elseif ($atm_sec === 'fotos') {
            $n_pdf = count($photos);
            if ($n_pdf > 0) {
                $cols = 4;
                $gap = 2;
                $cellW = ($cW - ($cols - 1) * $gap) / $cols;
                $cellH = $cellW * 0.72 + 4;
                if ($pdf->GetY() > 245) {
                    $pdf->AddPage();
                }
                $pdf->SetFont('Arial', 'B', 9);
                $pdf->SetTextColor(30, 58, 95);
                $pdf->SetX($M);
                $pdf->Cell(0, 6, f('DOCUMENTACAO FOTOGRAFICA'), 0, 1);
                $pdf->SetFont('Arial', '', 7.5);
                $pdf->SetTextColor(107, 114, 128);
                $pdf->SetX($M);
                $sub = $n_fotos . ' fotografia(s) no relatorio';
                if ($photos_total_for_note > ATM_MAX_FOTOS_RELATORIO) {
                    $sub .= ' (mostradas as primeiras ' . ATM_MAX_FOTOS_RELATORIO . ')';
                }
                $pdf->Cell(0, 4, f($sub), 0, 1);
                $pdf->Ln(1);

                $tmp_list = [];
                $n_rows = (int)ceil($n_pdf / $cols);
                for ($row = 0; $row < $n_rows; $row++) {
                    if ($pdf->GetY() + $cellH > 268) {
                        $pdf->AddPage();
                    }
                    $y0 = $pdf->GetY();
                    for ($c = 0; $c < $cols; $c++) {
                        $idx = $row * $cols + $c;
                        if ($idx >= $n_pdf) {
                            break;
                        }
                        $p = $photos[$idx];
                        $bin = null;
                        if (strpos($p, 'data:image/') === 0) {
                            $comma = strpos($p, ',');
                            if ($comma !== false) {
                                $bin = base64_decode(substr($p, $comma + 1), true);
                            }
                        }
                        if ($bin !== false && $bin !== null && strlen($bin) > 100) {
                            $tmp = to_safe_jpeg($bin);
                            if ($tmp && file_exists($tmp)) {
                                $tmp_list[] = $tmp;
                                try {
                                    $pdf->imageFitContain($tmp, $M + $c * ($cellW + $gap), $y0, $cellW, $cellH - 1);
                                } catch (Exception $imgErr) {
                                    @error_log(date('Y-m-d H:i:s') . ' IMG-ERR foto: ' . $imgErr->getMessage() . "\n", 3, __DIR__ . '/atm_debug.log');
                                }
                            }
                        }
                    }
                    $pdf->SetY($y0 + $cellH);
                }
                foreach ($tmp_list as $tf) {
                    if (is_string($tf) && file_exists($tf)) {
                        @unlink($tf);
                    }
                }
                $pdf->Ln(2);
            } elseif ($n_fotos > 0) {
                if ($pdf->GetY() > 250) {
                    $pdf->AddPage();
                }
                $pdf->SetFont('Arial', '', 8);
                $pdf->SetTextColor(107, 114, 128);
                $pdf->SetX($M);
                $pdf->Cell(0, 5, $n_fotos . ' fotografia(s) documentadas no sistema.', 0, 1);
                $pdf->Ln(2);
            }
        } elseif ($atm_sec === 'pecas') {
            if (count($pecas_list) > 0) {
                if ($pdf->GetY() > 210) {
                    $pdf->AddPage();
                }
                $pdf->SetFont('Arial', 'B', 10);
                $pdf->SetTextColor(30, 58, 95);
                $pdf->SetX($M);
                $pdf->Cell(0, 7, 'CONSUMIVEIS E PECAS', 0, 1);
                $usadas = 0;
                $nao_us = 0;
                foreach ($pecas_list as $p) {
                    $u = isset($p['usado']) ? (bool)$p['usado'] : ((float)($p['quantidadeUsada'] ?? $p['quantidade'] ?? 0) > 0);
                    if ($u) {
                        $usadas++;
                    } else {
                        $nao_us++;
                    }
                }
                $pdf->SetFont('Arial', '', 8);
                $pdf->SetTextColor(107, 114, 128);
                $pdf->SetX($M);
                $pdf->Cell(0, 5, $usadas . ' utilizado(s) / ' . $nao_us . ' nao substituido(s) / ' . count($pecas_list) . ' no plano', 0, 1);
                $pdf->Ln(1);
                $pdf->SetFont('Arial', '', 8);
                foreach ($pecas_list as $i => $p) {
                    if ($pdf->GetY() > 270) {
                        $pdf->AddPage();
                    }
                    $u = isset($p['usado']) ? (bool)$p['usado'] : ((float)($p['quantidadeUsada'] ?? $p['quantidade'] ?? 0) > 0);
                    if ($i % 2 === 0) {
                        $pdf->SetFillColor(249, 250, 251);
                        $pdf->Rect($M, $pdf->GetY(), $cW, 7, 'F');
                    }
                    $icon = $u ? 'OK' : '--';
                    $pdf->SetX($M + 1);
                    $pdf->SetTextColor($u ? 22 : 107, $u ? 163 : 114, $u ? 74 : 128);
                    $pdf->SetFont('Arial', 'B', 8);
                    $pdf->Cell(8, 7, $icon, 0, 0);
                    $pdf->SetFont('Arial', '', 8);
                    $pdf->SetTextColor(55, 65, 81);
                    $cod = $p['codigo'] ?? $p['codigoArtigo'] ?? '';
                    $desc = $p['descricao'] ?? '';
                    $lin = ($cod !== '' ? $cod . ' - ' : '') . $desc;
                    $pdf->Cell($cW - 35, 7, f(mb_substr($lin, 0, 120, 'UTF-8')), 0, 0);
                    $qtd = trim(($p['quantidade'] ?? '') . ' ' . ($p['unidade'] ?? ''));
                    if ($qtd !== '') {
                        $pdf->SetTextColor(107, 114, 128);
                        $pdf->Cell(26, 7, f($qtd), 0, 1, 'R');
                    } else {
                        $pdf->Ln(7);
                    }
                }
                $pdf->Ln(3);
            }
        }
    }

    // Declaração de aceitação (antes das assinaturas — igual ao PDF do browser)
    {
        if ($pdf->GetY() > 210) $pdf->AddPage();
        $decl_txt = ($declaracao_texto !== '')
            ? $declaracao_texto
            : texto_declaracao_cliente($manutencao_tipo, $declaracao_legislacao);
        $pdf->SetFillColor(243, 244, 246);
        $pdf->SetDrawColor(30, 58, 95);
        $pdf->SetLineWidth(0.8);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(30, 58, 95);
        $pdf->SetX($M);
        $pdf->Cell(0, 6, 'DECLARACAO DE ACEITACAO E COMPROMISSO DO CLIENTE', 0, 1);
        $pdf->SetFont('Arial', '', 7);
        $pdf->SetTextColor(55, 65, 81);
        $pdf->SetX($M);
        $pdf->MultiCell($cW, 3.6, f($decl_txt), 0, 'L');
        $pdf->Ln(4);
    }

    // Próximas manutenções agendadas
    $peri_labels = ['trimestral' => 'Trimestral', 'semestral' => 'Semestral', 'anual' => 'Anual', 'mensal' => 'Mensal'];
    $proximas_filtradas = array_values(array_filter($proximas_list, function ($pm) {
        return !empty($pm['data']);
    }));
    $peri_maq = $periodicidade_maquina;
    if ($manutencao_tipo !== 'reparacao' && (count($proximas_filtradas) > 0 || $peri_maq !== '')) {
        if ($pdf->GetY() > 230) $pdf->AddPage();
        if (count($proximas_filtradas) > 0) {
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->SetTextColor(30, 58, 95);
            $pdf->SetX($M);
            $pdf->Cell(0, 6, 'PROXIMAS MANUTENCOES AGENDADAS', 0, 1);
            $pdf->SetFont('Arial', 'B', 7.5);
            $pdf->SetTextColor(30, 58, 95);
            $pdf->SetX($M);
            $pdf->Cell(10, 6, 'N.', 0, 0);
            $pdf->Cell(40, 6, 'Data prevista', 0, 0);
            $pdf->Cell(45, 6, 'Periodicidade', 0, 0);
            $pdf->Cell(0, 6, 'Tecnico', 0, 1);
            $pdf->SetDrawColor(209, 213, 219);
            $pdf->Line($M, $pdf->GetY(), $W - $M, $pdf->GetY());
            $pdf->Ln(1);
            $pdf->SetFont('Arial', '', 8);
            foreach ($proximas_filtradas as $i => $pm) {
                if ($pdf->GetY() > 270) $pdf->AddPage();
                if ($i % 2 === 0) {
                    $pdf->SetFillColor(249, 250, 251);
                    $pdf->Rect($M, $pdf->GetY() - 1, $cW, 7, 'F');
                }
                $pp = $pm['periodicidade'] ?? '';
                $lab = isset($peri_labels[$pp]) ? $peri_labels[$pp] : (isset($peri_labels[$peri_maq]) ? $peri_labels[$peri_maq] : (($pm['tipo'] ?? '') !== '' ? f($pm['tipo']) : '-'));
                $pdf->SetX($M + 2);
                $pdf->SetTextColor(107, 114, 128);
                $pdf->Cell(10, 7, (string)($i + 1), 0, 0);
                $pdf->SetTextColor(17, 24, 39);
                $pdf->Cell(40, 7, fmt_data_iso_br($pm['data']), 0, 0);
                $pdf->SetTextColor(55, 65, 81);
                $pdf->Cell(45, 7, f($lab), 0, 0);
                $pdf->SetTextColor(107, 114, 128);
                $tec_pm = $pm['tecnico'] ?? '';
                $pdf->Cell(0, 7, f($tec_pm !== '' ? $tec_pm : 'A designar'), 0, 1);
            }
            $pdf->Ln(4);
        } else {
            $peri_str = isset($peri_labels[$peri_maq]) ? $peri_labels[$peri_maq] : '';
            $pdf->SetFillColor(243, 244, 246);
            $pdf->SetDrawColor(30, 58, 95);
            $pdf->Rect($M, $pdf->GetY(), $cW, 14, 'FD');
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->SetTextColor(30, 58, 95);
            $pdf->SetXY($M + 4, $pdf->GetY() + 3);
            $pdf->Cell(0, 5, 'Proxima manutencao prevista:', 0, 1);
            $pdf->SetFont('Arial', '', 9);
            $pdf->SetTextColor(55, 65, 81);
            $pdf->SetX($M + 4);
            $pdf->Cell(0, 5, '-' . ($peri_str !== '' ? ' (periodicidade ' . f($peri_str) . ')' : ''), 0, 1);
            $pdf->Ln(6);
        }
    }

    // Bloco de assinaturas — técnico (esquerda) + cliente (direita)
    if ($pdf->GetY() > 220) $pdf->AddPage();
    $halfW = ($cW - 4) / 2;
    $hasTecSig = ($tecnico_sig_bin !== null);
    $hasCliSig = ($assinatura_bin !== null);
    $boxH = ($hasTecSig || $hasCliSig) ? 42 : 24;
    $y0 = $pdf->GetY();

    // Caixa do técnico (esquerda)
    $pdf->SetFillColor(243, 244, 246);
    $pdf->SetDrawColor(209, 213, 219);
    $pdf->Rect($M, $y0, $halfW, $boxH, 'FD');
    $pdf->SetFont('Arial', 'B', 7);
    $pdf->SetTextColor(30, 58, 95);
    $pdf->SetXY($M + 2, $y0 + 2);
    $pdf->Cell($halfW - 4, 4, 'TECNICO RESPONSAVEL', 0, 1);
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(17, 24, 39);
    $pdf->SetXY($M + 2, $y0 + 7);
    $pdf->Cell($halfW - 4, 4, f($tecnico), 0, 1);
    if ($tecnico_tel) {
        $pdf->SetFont('Arial', '', 7);
        $pdf->SetTextColor(107, 114, 128);
        $pdf->SetXY($M + 2, $y0 + 12);
        $pdf->Cell($halfW - 4, 4, 'Tel: ' . f($tecnico_tel), 0, 1);
    }
    if ($hasTecSig) {
        _dbg("TEC-SIG converting " . strlen($tecnico_sig_bin) . " bytes");
        $tmp = to_safe_jpeg($tecnico_sig_bin);
        _dbg("TEC-SIG tmp=" . ($tmp ?: 'NULL'));
        if ($tmp && file_exists($tmp)) {
            try {
                $pdf->Image($tmp, $M + 2, $y0 + 17, $halfW - 8, 22);
                _dbg("TEC-SIG image OK");
            } catch (Exception $e) {
                _dbg("TEC-SIG image FAIL: " . $e->getMessage());
            }
            @unlink($tmp);
        }
    }

    // Caixa do cliente (direita)
    $xR = $M + $halfW + 4;
    $pdf->SetFillColor(240, 253, 244);
    $pdf->SetDrawColor(187, 247, 208);
    $pdf->Rect($xR, $y0, $halfW, $boxH, 'FD');
    $pdf->SetFont('Arial', 'B', 7);
    $pdf->SetTextColor(22, 163, 74);
    $pdf->SetXY($xR + 2, $y0 + 2);
    $pdf->Cell($halfW - 4, 4, 'ASSINATURA DO CLIENTE', 0, 1);
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(17, 24, 39);
    $pdf->SetXY($xR + 2, $y0 + 7);
    $sig_name = $assinado_por ? f($assinado_por) : '-';
    $pdf->Cell($halfW - 4, 4, $sig_name, 0, 1);
    $pdf->SetFont('Arial', '', 7);
    $pdf->SetTextColor(107, 114, 128);
    $pdf->SetXY($xR + 2, $y0 + 12);
    $pdf->Cell($halfW - 4, 4, 'Assinado em ' . f($data_real), 0, 1);
    if ($hasCliSig) {
        _dbg("CLI-SIG converting " . strlen($assinatura_bin) . " bytes");
        $tmp = to_safe_jpeg($assinatura_bin);
        _dbg("CLI-SIG tmp=" . ($tmp ?: 'NULL'));
        if ($tmp && file_exists($tmp)) {
            try {
                $pdf->Image($tmp, $xR + 2, $y0 + 17, $halfW - 8, 22);
                _dbg("CLI-SIG image OK");
            } catch (Exception $e) {
                _dbg("CLI-SIG image FAIL: " . $e->getMessage());
            }
            @unlink($tmp);
        }
    }
    $pdf->SetY($y0 + $boxH + 3);

    _dbg("PDF Output()");
    $pdf_data = $pdf->Output('S');
    _dbg("PDF OK " . strlen($pdf_data) . " bytes");
    if (!empty($tmp_logo_navel) && is_string($tmp_logo_navel) && file_exists($tmp_logo_navel)) {
        @unlink($tmp_logo_navel);
    }
    if (!empty($tmp_logo_brand) && is_string($tmp_logo_brand) && file_exists($tmp_logo_brand)) {
        @unlink($tmp_logo_brand);
    }
  } catch (Throwable $e) {
    $pdf_error = $e->getMessage();
    $pdf_data = null;
    @error_log(date('Y-m-d H:i:s') . " PDF-ERR: $pdf_error\n", 3, __DIR__ . '/atm_debug.log');
    if (isset($tmp_logo_navel) && is_string($tmp_logo_navel) && file_exists($tmp_logo_navel)) {
        @unlink($tmp_logo_navel);
    }
    if (isset($tmp_logo_brand) && is_string($tmp_logo_brand) && file_exists($tmp_logo_brand)) {
        @unlink($tmp_logo_brand);
    }
  }
}

// -- HTML do email -----------------------------------------------------------
// Cabeçalho só em texto: imagens data: no corpo falham ou degradam no Outlook; o PDF anexo traz o logo Navel com qualidade.
$esc   = 'htmlspecialchars';
$tipo_h = $esc($tipo);
$html  = '<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#f3f4f6;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
  <tr><td bgcolor="#1e3a5f" style="background-color:#1e3a5f;background:linear-gradient(135deg,#1e3a5f,#0d6efd);padding:18px 24px;">
    <!-- Cabeçalho em tabela (sem imagem) — máxima compatibilidade em clientes de email -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr><td align="left" valign="top" style="padding:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.45;color:#ffffff;font-weight:bold;">Jos&eacute; Gon&ccedil;alves Cerqueira (NAVEL-A&Ccedil;ORES), Lda.</td></tr>
      <tr><td align="left" valign="top" style="padding:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.45;color:#ffffff;"><a href="https://www.navel.pt" target="_blank" rel="noopener noreferrer" style="color:#ffffff !important;text-decoration:underline;">Pico d&#39;Agua Park &#8226; www.navel.pt</a></td></tr>
      <tr><td align="left" valign="top" style="padding:0;font-family:Arial,sans-serif;font-size:11px;line-height:1.45;color:#ffffff;">S&atilde;o Miguel&ndash;A&ccedil;ores</td></tr>
    </table>
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
        if ($idx > 0 && $idx % 4 === 0) {
            $html .= '</tr><tr>';
        }
        $html .= '<td style="padding:3px;"><img src="' . $thumb . '" alt="Foto ' . ($idx + 1) . '" width="132" style="display:block;border-radius:6px;border:1px solid #e5e7eb;max-width:132px;height:auto;"></td>';
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
       . 'Jos&eacute; Gon&ccedil;alves Cerqueira (NAVEL-A&Ccedil;ORES), Lda.<br>'
       . "Pico d'Agua Park &mdash; www.navel.pt"
       . '</td></tr>'
       . '</table></td></tr></table></body></html>';

$text = "Exmo(a) Sr(a) " . $to_name . ",\r\n\r\n"
      . "Enviamos o relatorio de " . $tipo . " N. " . $num_rel . ".\r\n\r\n"
      . "Equipamento: " . $equipamento . "\r\n"
      . "Data: " . $data_real . "\r\n"
      . "Tecnico: " . $tecnico . "\r\n"
      . ($pdf_data ? "O relatorio em PDF encontra-se em anexo.\r\n" : "")
      . "\r\n" . ATM_MARCA_CURTA . " — www.navel.pt";

// -- MIME --------------------------------------------------------------------
$outer = '----=_NavelOuter_' . md5(uniqid());
$inner = '----=_NavelInner_' . md5(uniqid());
$subj  = '=?UTF-8?B?' . base64_encode('Relatorio N. ' . $num_rel . ' — ' . ATM_MARCA_CURTA) . '?=';
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
$hdr .= "From: =?UTF-8?B?" . base64_encode(ATM_RAZAO_SOCIAL) . "?= <" . FROM_EMAIL . ">\r\n"
      . 'Reply-To: ' . REPLY_TO . "\r\n"
      . 'Cc: ' . REPLY_TO . "\r\n"
      . 'X-Mailer: PHP/' . phpversion() . "\r\n";

_dbg("MAIL sending to=$to_email subj_len=" . strlen($subj) . " body_len=" . strlen($body) . " hdr_len=" . strlen($hdr) . " pdf=" . ($pdf_data ? strlen($pdf_data) : 'NULL'));
$sent = false;
try { $sent = @mail($to_email, $subj, $body, $hdr); _dbg("MAIL result=" . ($sent ? 'OK' : 'FAIL')); } catch (Throwable $e) {
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
