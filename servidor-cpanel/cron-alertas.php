<?php
/**
 * cron-alertas.php — Envio automático de lembretes de conformidade (AT_Manut)
 * ============================================================================
 * Executa diariamente via cron job no cPanel:
 *   php /home/USER/public_html/api/cron-alertas.php >> /home/USER/logs/cron-alertas.log 2>&1
 *
 * Ou via HTTP com token de segurança:
 *   https://www.navel.pt/api/cron-alertas.php?token=CRON_TOKEN_AQUI
 *
 * INSTALAR EM: public_html/api/cron-alertas.php
 *
 * O que faz:
 *   1. Consulta a BD por manutenções pendentes/agendadas com data nos próximos N dias
 *   2. Filtra clientes com email registado
 *   3. Evita envios duplicados (tabela alertas_log — criada automaticamente)
 *   4. Envia email a cada cliente afectado
 *   5. Envia resumo ao Admin (EMAIL_ADMIN)
 *   6. Regista tudo no log do sistema (atm_log.php)
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ══ CONFIGURAÇÃO ══════════════════════════════════════════════════════════════

// Dias de antecedência para enviar o alerta (pode ser alterado aqui)
define('DIAS_AVISO', getenv('ATM_DIAS_AVISO') ?: 7);

// Intervalo mínimo entre dois lembretes para a mesma manutenção (em dias)
// Evita que o cron envie email todos os dias enquanto a manutenção está pendente
define('DIAS_ENTRE_LEMBRETES', 6);

// Token de segurança para chamadas HTTP (deve ser o mesmo que ATM_REPORT_AUTH_TOKEN)
define('CRON_TOKEN', getenv('ATM_REPORT_AUTH_TOKEN') ?: 'Navel2026$Api!Key#xZ99');

// Emails da Navel
define('FROM_EMAIL',   'no-reply@navel.pt');
define('REPLY_TO',     'geral@navel.pt');
define('EMAIL_ADMIN',  'comercial@navel.pt');

// Versão da app (para o rodapé dos emails)
define('APP_VERSION_CRON', '1.6.2');

// ══ SEGURANÇA — verificar token se chamado via HTTP ═══════════════════════════

$isCli = (php_sapi_name() === 'cli');

if (!$isCli) {
    // Quando chamado via HTTP, exigir token na query string
    $token_recebido = $_GET['token'] ?? '';
    if (!hash_equals(CRON_TOKEN, $token_recebido)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'message' => 'Acesso negado.']);
        exit;
    }
    header('Content-Type: text/plain; charset=utf-8');
}

// ══ INICIALIZAÇÃO ═════════════════════════════════════════════════════════════

$inicio = date('Y-m-d H:i:s');
$log    = [];  // log interno desta execução

function cron_log(string $nivel, string $msg, array $dados = []): void {
    global $log;
    $linha = "[{$nivel}] " . date('H:i:s') . " — {$msg}";
    if (!empty($dados)) {
        $linha .= ' | ' . json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $log[] = $linha;
    echo $linha . PHP_EOL;
}

cron_log('INFO', 'cron-alertas iniciado', ['dias_aviso' => DIAS_AVISO, 'data' => $inicio]);

// ══ BASE DE DADOS ════════════════════════════════════════════════════════════

// Carregar config da API (mesma que data.php e send-email.php usam)
$config_path = __DIR__ . '/config.php';
if (!file_exists($config_path)) {
    cron_log('FATAL', 'config.php não encontrado em ' . $config_path);
    exit(1);
}
require_once $config_path;

// Criar ligação PDO
try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    cron_log('INFO', 'Ligação BD estabelecida');
} catch (PDOException $e) {
    cron_log('FATAL', 'Erro ao ligar à BD: ' . $e->getMessage());
    exit(1);
}

// ══ CRIAR TABELA alertas_log (se não existir) ════════════════════════════════

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `alertas_log` (
          `id`            INT           NOT NULL AUTO_INCREMENT,
          `manutencao_id` VARCHAR(32)   NOT NULL,
          `cliente_id`    VARCHAR(32)   NOT NULL,
          `destinatario`  VARCHAR(255)  NOT NULL,
          `dias_restantes` INT          NOT NULL DEFAULT 0,
          `data_manut`    DATE          NOT NULL,
          `enviado_em`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `sucesso`       TINYINT(1)    NOT NULL DEFAULT 1,
          `erro`          TEXT          DEFAULT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_manutenco` (`manutencao_id`),
          KEY `idx_enviado_em` (`enviado_em`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    cron_log('INFO', 'Tabela alertas_log verificada/criada');
} catch (PDOException $e) {
    cron_log('FATAL', 'Erro ao criar tabela alertas_log: ' . $e->getMessage());
    exit(1);
}

// ══ CONSULTAR MANUTENÇÕES PRÓXIMAS ═══════════════════════════════════════════

try {
    $stmt = $pdo->prepare("
        SELECT
            m.id            AS manutencao_id,
            m.data          AS data_manut,
            m.tipo          AS tipo_manut,
            m.status        AS status_manut,
            maq.id          AS maquina_id,
            maq.marca       AS maquina_marca,
            maq.modelo      AS maquina_modelo,
            maq.numero_serie AS maquina_serie,
            maq.localizacao AS maquina_local,
            c.id            AS cliente_id,
            c.nome          AS cliente_nome,
            c.email         AS cliente_email,
            DATEDIFF(m.data, CURDATE()) AS dias_restantes
        FROM manutencoes m
        INNER JOIN maquinas maq ON maq.id = m.maquina_id
        INNER JOIN clientes c   ON c.id   = maq.cliente_id
        WHERE m.status IN ('pendente', 'agendada')
          AND m.data BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL :dias_aviso DAY)
          AND c.email IS NOT NULL
          AND c.email != ''
          AND c.email REGEXP '^[^@]+@[^@]+\.[^@]+$'
        ORDER BY m.data ASC, c.nome ASC
    ");
    $stmt->execute([':dias_aviso' => (int)DIAS_AVISO]);
    $manutencoes = $stmt->fetchAll();
    cron_log('INFO', 'Manutenções encontradas no período', ['total' => count($manutencoes)]);
} catch (PDOException $e) {
    cron_log('FATAL', 'Erro na consulta de manutenções: ' . $e->getMessage());
    exit(1);
}

if (empty($manutencoes)) {
    cron_log('INFO', 'Nenhuma manutenção próxima com cliente com email. Sem emails a enviar.');
    cron_log('INFO', 'cron-alertas terminado', ['duracao' => time() - strtotime($inicio) . 's']);
    exit(0);
}

// ══ VERIFICAR LEMBRETES JÁ ENVIADOS (evitar duplicados) ══════════════════════

$enviados   = 0;
$ignorados  = 0;
$erros      = 0;
$resumo_admin = [];

foreach ($manutencoes as $row) {
    $manut_id      = $row['manutencao_id'];
    $dias          = (int)$row['dias_restantes'];
    $cliente_nome  = $row['cliente_nome'];
    $cliente_email = $row['cliente_email'];
    $data_manut    = $row['data_manut'];
    $maquina_info  = trim($row['maquina_marca'] . ' ' . $row['maquina_modelo']);
    if ($row['maquina_serie']) $maquina_info .= ' (S/N: ' . $row['maquina_serie'] . ')';
    if ($row['maquina_local']) $maquina_info .= ' — ' . $row['maquina_local'];

    // Verificar se já enviámos lembrete para esta manutenção recentemente
    try {
        $check = $pdo->prepare("
            SELECT COUNT(*) AS total
            FROM alertas_log
            WHERE manutencao_id = :id
              AND sucesso = 1
              AND enviado_em >= DATE_SUB(NOW(), INTERVAL :dias DAY)
        ");
        $check->execute([':id' => $manut_id, ':dias' => DIAS_ENTRE_LEMBRETES]);
        $ja_enviado = (int)$check->fetchColumn();
    } catch (PDOException $e) {
        cron_log('ERRO', 'Erro ao verificar alertas_log', ['manut' => $manut_id, 'err' => $e->getMessage()]);
        $ja_enviado = 0;
    }

    if ($ja_enviado > 0) {
        cron_log('SKIP', "Lembrete já enviado recentemente — ignorar", [
            'manut_id' => $manut_id,
            'cliente'  => $cliente_nome,
            'data'     => $data_manut,
        ]);
        $ignorados++;
        continue;
    }

    // ── Enviar email ─────────────────────────────────────────────────────────

    $data_formatada = date('d/m/Y', strtotime($data_manut));
    $tipo_label     = $row['tipo_manut'] === 'montagem' ? 'Montagem' : 'Manutenção Periódica';
    $assunto        = "Lembrete: {$tipo_label} prevista a {$data_formatada} — {$maquina_info}";

    $corpo_html = construir_email_lembrete(
        $cliente_nome,
        $maquina_info,
        $tipo_label,
        $data_formatada,
        $dias
    );

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: Navel-Açores <" . FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . REPLY_TO . "\r\n";
    $headers .= "X-Mailer: AT_Manut-Cron/1.0\r\n";

    $sucesso_envio = @mail($cliente_email, '=?UTF-8?B?' . base64_encode($assunto) . '?=', $corpo_html, $headers);

    // ── Registar na alertas_log ───────────────────────────────────────────────

    try {
        $ins = $pdo->prepare("
            INSERT INTO alertas_log (manutencao_id, cliente_id, destinatario, dias_restantes, data_manut, sucesso, erro)
            VALUES (:mid, :cid, :dest, :dias, :data, :suc, :err)
        ");
        $ins->execute([
            ':mid'  => $manut_id,
            ':cid'  => $row['cliente_id'],
            ':dest' => $cliente_email,
            ':dias' => $dias,
            ':data' => $data_manut,
            ':suc'  => $sucesso_envio ? 1 : 0,
            ':err'  => $sucesso_envio ? null : 'mail() retornou false',
        ]);
    } catch (PDOException $e) {
        cron_log('AVISO', 'Erro ao registar em alertas_log (email pode ter sido enviado)', ['err' => $e->getMessage()]);
    }

    if ($sucesso_envio) {
        cron_log('OK', "Email enviado", [
            'cliente' => $cliente_nome,
            'email'   => $cliente_email,
            'maquina' => $maquina_info,
            'data'    => $data_formatada,
            'dias'    => $dias,
        ]);
        $enviados++;
        $resumo_admin[] = "• {$cliente_nome} | {$maquina_info} | {$tipo_label} em {$data_formatada} ({$dias} dias)";
    } else {
        cron_log('ERRO', "Falha no envio de email", [
            'cliente' => $cliente_nome,
            'email'   => $cliente_email,
        ]);
        $erros++;
    }
}

// ══ EMAIL DE RESUMO AO ADMIN ══════════════════════════════════════════════════

if ($enviados > 0 || $erros > 0) {
    $resumo_linhas = implode("\n", $resumo_admin);
    $assunto_admin = "[AT_Manut] Cron alertas — {$enviados} enviados, {$erros} erros — " . date('d/m/Y');

    $corpo_admin  = "<h3 style='color:#0d2340;font-family:Arial,sans-serif'>Resumo do cron de alertas — " . date('d/m/Y H:i') . "</h3>";
    $corpo_admin .= "<p style='font-family:Arial,sans-serif'><strong>Período de aviso:</strong> " . DIAS_AVISO . " dias<br>";
    $corpo_admin .= "<strong>Lembretes enviados:</strong> {$enviados}<br>";
    $corpo_admin .= "<strong>Ignorados (já enviados):</strong> {$ignorados}<br>";
    $corpo_admin .= "<strong>Erros:</strong> {$erros}</p>";

    if (!empty($resumo_admin)) {
        $corpo_admin .= "<h4 style='font-family:Arial,sans-serif'>Lembretes enviados:</h4>";
        $corpo_admin .= "<pre style='background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px'>" . htmlspecialchars($resumo_linhas) . "</pre>";
    }
    $corpo_admin .= "<p style='color:#888;font-size:11px;font-family:Arial,sans-serif;margin-top:24px'>Navel-Açores, Lda — Todos os direitos reservados · v" . APP_VERSION_CRON . "</p>";

    $headers_admin  = "MIME-Version: 1.0\r\n";
    $headers_admin .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers_admin .= "From: AT_Manut Cron <" . FROM_EMAIL . ">\r\n";

    @mail(EMAIL_ADMIN, '=?UTF-8?B?' . base64_encode($assunto_admin) . '?=', $corpo_admin, $headers_admin);
    cron_log('INFO', 'Email de resumo enviado ao admin', ['dest' => EMAIL_ADMIN]);
}

// ══ SUMÁRIO FINAL ════════════════════════════════════════════════════════════

$duracao = time() - strtotime($inicio);
cron_log('INFO', 'cron-alertas terminado', [
    'enviados'  => $enviados,
    'ignorados' => $ignorados,
    'erros'     => $erros,
    'duracao'   => $duracao . 's',
]);

exit($erros > 0 ? 1 : 0);

// ══ FUNÇÃO: construir email HTML de lembrete ══════════════════════════════════

function construir_email_lembrete(
    string $cliente_nome,
    string $maquina_info,
    string $tipo_label,
    string $data_formatada,
    int    $dias_restantes
): string {
    $app_v = APP_VERSION_CRON;

    $urgencia_cor   = $dias_restantes <= 2 ? '#b90211' : ($dias_restantes <= 5 ? '#f59e0b' : '#0d2340');
    $urgencia_texto = $dias_restantes <= 2 ? '⚠ URGENTE' : ($dias_restantes <= 5 ? 'Em breve' : 'Próximo');
    $dias_label     = $dias_restantes === 0 ? 'HOJE' : ($dias_restantes === 1 ? 'amanhã' : "em {$dias_restantes} dias");

    return <<<HTML
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">

      <!-- Cabeçalho -->
      <tr>
        <td style="background:#0d2340;padding:24px 32px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:1px">NAVEL-AÇORES</h1>
          <p style="color:#a0b4cc;margin:4px 0 0;font-size:13px">Assistência Técnica — Manutenções</p>
        </td>
      </tr>

      <!-- Corpo -->
      <tr>
        <td style="padding:32px">
          <p style="color:#333;font-size:15px;margin:0 0 16px">Caro/a <strong>{$cliente_nome}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
            Informamos que tem uma <strong>{$tipo_label}</strong> programada para o seguinte equipamento:
          </p>

          <!-- Cartão do equipamento -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px">
            <tr>
              <td style="padding:20px">
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#333">
                  <tr>
                    <td style="color:#888;width:40%">Equipamento:</td>
                    <td><strong>{$maquina_info}</strong></td>
                  </tr>
                  <tr>
                    <td style="color:#888">Tipo de serviço:</td>
                    <td>{$tipo_label}</td>
                  </tr>
                  <tr>
                    <td style="color:#888">Data prevista:</td>
                    <td><strong style="color:{$urgencia_cor}">{$data_formatada} ({$dias_label})</strong></td>
                  </tr>
                  <tr>
                    <td style="color:#888">Estado:</td>
                    <td><span style="background:{$urgencia_cor};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px">{$urgencia_texto}</span></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">
            Contacte-nos para confirmar ou reagendar a data de serviço.
          </p>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0">
            Obrigado pela confiança,<br>
            <strong>Equipa de Assistência Técnica Navel-Açores</strong>
          </p>
        </td>
      </tr>

      <!-- Rodapé -->
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
          <p style="color:#aaa;font-size:11px;margin:0">
            Navel-Açores, Lda — Todos os direitos reservados · v{$app_v}
          </p>
          <p style="color:#ccc;font-size:10px;margin:4px 0 0">
            Este email foi gerado automaticamente. Responda para <a href="mailto:geral@navel.pt" style="color:#0d2340">geral@navel.pt</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
}
