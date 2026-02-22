<?php
/**
 * data.php — API REST AT_Manut (autenticação + CRUD completo)
 *
 * INSTALAR EM: public_html/api/data.php
 * URL:         https://www.navel.pt/api/data.php
 *
 * Todas as chamadas são POST com corpo JSON:
 *   { "_t": "<token>", "r": "<recurso>", "action": "<acção>", ... }
 *
 * Recursos disponíveis:
 *   auth           — login (não requer token)
 *   clientes       — CRUD
 *   categorias     — CRUD
 *   subcategorias  — CRUD
 *   checklistItems — CRUD  (tabela: checklist_items)
 *   maquinas       — CRUD
 *   manutencoes    — CRUD
 *   relatorios     — CRUD + geração de número
 *
 * Acções: list | get | create | update | delete | bulk_create | bulk_restore
 */

// ══ 1. CONFIG INICIAL ════════════════════════════════════════════════════════
ini_set('display_errors', '0');
require_once __DIR__ . '/atm_log.php';  // Carregar cedo para error_handler poder usar

// ══ 2. CORS — SEMPRE ANTES DE QUALQUER LÓGICA ════════════════════════════════
$_cors_origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$_cors_allowed = ['https://www.navel.pt', 'https://navel.pt', 'http://www.navel.pt', 'http://navel.pt', 'http://localhost:5173', 'http://localhost:4173'];
header('Access-Control-Allow-Origin: ' . (in_array($_cors_origin, $_cors_allowed, true) ? $_cors_origin : 'https://www.navel.pt'));
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo '{"ok":false,"message":"Metodo nao permitido"}'; exit; }

// ══ 3. ERROR HANDLERS — PHP, BD, SQL: todos os erros vão para atm_*.log ───────
set_error_handler(function($no, $str, $file, $line) {
    error_log("[ATM-API] PHP Error $no: $str in $file:$line");
    if (in_array($no, [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (function_exists('atm_log_api')) {
            $GLOBALS['_atm_log_user'] = $GLOBALS['_atm_log_user'] ?? '-';
            $GLOBALS['_atm_log_route'] = $GLOBALS['_atm_log_route'] ?? '?';
            atm_log_api('fatal', 'PHP', 'error', $str, ['file' => basename($file), 'line' => $line]);
        }
        http_response_code(500);
        echo '{"ok":false,"message":"Erro interno do servidor."}';
        exit;
    }
    // E_WARNING, E_USER_WARNING — loga como warn (ex.: SQL warnings, deprecations)
    if (in_array($no, [E_WARNING, E_USER_WARNING]) && function_exists('atm_log_api')) {
        $GLOBALS['_atm_log_user'] = $GLOBALS['_atm_log_user'] ?? '-';
        $GLOBALS['_atm_log_route'] = $GLOBALS['_atm_log_route'] ?? '?';
        atm_log_api('warn', 'PHP', 'warning', $str, ['file' => basename($file), 'line' => $line]);
    }
});
register_shutdown_function(function() {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (function_exists('atm_log_api')) {
            $GLOBALS['_atm_log_user'] = $GLOBALS['_atm_log_user'] ?? '-';
            $GLOBALS['_atm_log_route'] = $GLOBALS['_atm_log_route'] ?? '?';
            atm_log_api('fatal', 'PHP', 'shutdown', $e['message'] ?? 'Erro fatal', ['file' => basename($e['file'] ?? '?'), 'line' => $e['line'] ?? 0]);
        }
        http_response_code(500);
        echo '{"ok":false,"message":"Erro fatal no servidor."}';
    }
});

// ══ 4. CONFIG + DB ════════════════════════════════════════════════════════════
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// ══ 5. LER BODY JSON ═════════════════════════════════════════════════════════
$raw  = file_get_contents('php://input');
$body = [];
if ($raw && isset($raw[0]) && $raw[0] === '{') {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) $body = $decoded;
}
if (empty($body)) $body = $_POST;

$resource = trim($body['r'] ?? '');
$action   = trim($body['action'] ?? 'list');
$id       = trim($body['id'] ?? '');
$token    = trim($body['_t'] ?? '');

// ══ 6. AUTENTICAÇÃO ══════════════════════════════════════════════════════════

// Login — não requer token
if ($resource === 'auth' && $action === 'login') {
    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');
    if (!$username || !$password) json_error('Credenciais em falta.', 401);

    try {
        $pdo  = get_pdo();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? AND ativo = 1 LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
    } catch (PDOException $e) {
        $GLOBALS['_atm_log_user'] = $username ?: '-';
        $GLOBALS['_atm_log_route'] = 'auth/login';
        atm_log_api('error', 'API', 'login', 'Erro de base de dados no login', ['msg' => $e->getMessage()]);
        error_log('[ATM-API] DB error login: ' . $e->getMessage());
        json_error('Erro de base de dados.', 500);
    }

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_error('Utilizador ou password incorretos.', 401);
    }

    $payload = [
        'sub'      => $user['id'],
        'username' => $user['username'],
        'nome'     => $user['nome'],
        'role'     => $user['role'],
        'iat'      => time(),
        'exp'      => time() + JWT_TTL,
    ];
    $jwtToken = jwt_encode($payload);
    json_ok([
        'token'    => $jwtToken,
        'expiresAt'=> $payload['exp'],
        'user'     => [
            'id'       => $user['id'],
            'username' => $user['username'],
            'nome'     => $user['nome'],
            'role'     => $user['role'],
        ],
    ]);
}

// Todas as outras rotas requerem token válido
$authPayload = jwt_decode($token);
if (!$authPayload) json_error('Sessão expirada. Por favor faça login novamente.', 401);

// Contexto para logs da API (Admin vê no painel)
$GLOBALS['_atm_log_user'] = $authPayload['username'] ?? $authPayload['sub'] ?? '-';
$GLOBALS['_atm_log_route'] = $resource . '/' . $action;

// ══ 6b. LOGS (apenas Admin) — lê ficheiros de log do servidor ─────────────────
if ($resource === 'logs' && $action === 'list') {
    if (($authPayload['role'] ?? '') !== 'admin') json_error('Acesso negado. Apenas administradores podem ver os logs.', 403);

    $logDir = __DIR__ . '/logs';
    $days   = min(90, max(1, (int)($body['days'] ?? 30)));
    $cutoff = time() - $days * 24 * 3600;
    $entries = [];

    if (is_dir($logDir)) {
        foreach (glob($logDir . '/atm_*.log') as $f) {
            if (filemtime($f) < $cutoff) continue;
            $lines = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $cols = explode("\t", $line, 10);
                if (count($cols) >= 9) {
                    $tsStr = preg_replace('#^(\d{2})/(\d{2})/(\d{4})\s+(.*)#', '$3-$2-$1 $4', $cols[0]);
                    $ts = strtotime($tsStr) ?: time();
                    $entries[] = [
                        'ts'        => $ts * 1000,
                        'level'     => strtolower(trim($cols[1])),
                        'sessionId' => $cols[2] ?? '-',
                        'userId'    => $cols[3] ?? '-',
                        'route'     => $cols[4] ?? '-',
                        'version'   => $cols[5] ?? '-',
                        'component' => $cols[6] ?? '-',
                        'action'    => $cols[7] ?? '-',
                        'message'   => $cols[8] ?? '-',
                        'details'   => $cols[9] ?? '',
                    ];
                }
            }
        }
    }
    usort($entries, fn($a, $b) => $b['ts'] - $a['ts']);
    json_ok(array_slice($entries, 0, 2000));
}

// ══ 7. CONFIGURAÇÃO DOS RECURSOS ══════════════════════════════════════════════

/*
 * Colunas permitidas em INSERT/UPDATE para cada tabela.
 * Actua como lista branca (whitelist) — impede injecção de campos não previstos.
 */
$RESOURCE_MAP = [
    'clientes' => [
        'table'      => 'clientes',
        'json_cols'  => [],
        'allowed'    => ['id','nif','nome','morada','codigo_postal','localidade','telefone','email','notas','criado_em'],
        'order'      => 'nome ASC',
    ],
    'categorias' => [
        'table'      => 'categorias',
        'json_cols'  => [],
        'allowed'    => ['id','nome','intervalo_tipo'],
        'order'      => 'nome ASC',
    ],
    'subcategorias' => [
        'table'      => 'subcategorias',
        'json_cols'  => [],
        'allowed'    => ['id','categoria_id','nome'],
        'order'      => 'nome ASC',
    ],
    'checklistItems' => [
        'table'      => 'checklist_items',
        'json_cols'  => [],
        'allowed'    => ['id','subcategoria_id','tipo','grupo','ordem','texto'],
        'order'      => 'subcategoria_id ASC, tipo ASC, ordem ASC',
    ],
    'maquinas' => [
        'table'      => 'maquinas',
        'json_cols'  => ['documentos'],
        'allowed'    => ['id','cliente_id','cliente_nif','subcategoria_id','marca','modelo','numero_serie','ano_fabrico','periodicidade','proxima_manut','numero_documento_venda','notas','documentos','ultima_manutencao_data','horas_totais_acumuladas','horas_servico_acumuladas','criado_em'],
        'order'      => 'criado_em DESC',
    ],
    'manutencoes' => [
        'table'      => 'manutencoes',
        'json_cols'  => [],
        'allowed'    => ['id','maquina_id','tipo','data','tecnico','status','observacoes','horas_totais','horas_servico','criado_em'],
        'order'      => 'data DESC',
    ],
    'relatorios' => [
        'table'      => 'relatorios',
        'json_cols'  => ['checklist_respostas','fotos'],
        'allowed'    => ['id','manutencao_id','numero_relatorio','data_criacao','data_assinatura','tecnico','nome_assinante','assinado_pelo_cliente','assinatura_digital','checklist_respostas','notas','fotos','ultimo_envio','criado_em'],
        'order'      => 'data_criacao DESC',
    ],
];

if (!isset($RESOURCE_MAP[$resource])) {
    json_error("Recurso desconhecido: $resource", 404);
}

$cfg       = $RESOURCE_MAP[$resource];
$table     = $cfg['table'];
$json_cols = $cfg['json_cols'];
$allowed   = $cfg['allowed'];
$order     = $cfg['order'];

try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    $GLOBALS['_atm_log_user'] = $GLOBALS['_atm_log_user'] ?? '-';
    $GLOBALS['_atm_log_route'] = $GLOBALS['_atm_log_route'] ?? ($resource . '/' . $action);
    atm_log_api('error', 'API', 'db_connect', 'Falha de conexão à base de dados', ['msg' => $e->getMessage()]);
    error_log('[ATM-API] DB connection: ' . $e->getMessage());
    json_error('Não foi possível ligar à base de dados.', 503);
}

// ── Preprocessar dados de máquinas (mapear clienteNif → cliente_id, periodicidadeManut → periodicidade) ─
function preprocess_maquina(array $data): array {
    if (isset($data['periodicidadeManut'])) {
        $data['periodicidade'] = $data['periodicidadeManut'];
    }
    if (!empty($data['clienteNif'])) {
        $data['cliente_nif'] = $data['clienteNif'];
        try {
            $pdo = get_pdo();
            $s = $pdo->prepare('SELECT id FROM clientes WHERE nif = ? LIMIT 1');
            $s->execute([$data['clienteNif']]);
            $row = $s->fetch();
            if ($row) $data['cliente_id'] = $row['id'];
        } catch (PDOException $e) {
            atm_log_api('warn', 'API', 'preprocess_maquina', 'Lookup cliente por NIF falhou', ['nif' => $data['clienteNif'] ?? '-', 'msg' => $e->getMessage()]);
        }
    }
    return $data;
}

// ══ 8. ROUTER ════════════════════════════════════════════════════════════════
// Qualquer PDOException (create/update/delete/list/get) é logada e devolvida ao cliente

try {

switch ($action) {

    // ── LIST ─────────────────────────────────────────────────────────────────
    case 'list': {
        $stmt = $pdo->query("SELECT * FROM `$table` ORDER BY $order");
        $rows = $stmt->fetchAll();
        $out  = array_map(function($r) use ($json_cols, $resource) {
            $j = row_to_js($r, $json_cols);
            if ($resource === 'maquinas') {
                $j['periodicidadeManut'] = $j['periodicidade'] ?? $r['periodicidade'] ?? null;
                $j['clienteNif'] = $j['clienteNif'] ?? $r['cliente_nif'] ?? null;
            }
            return $j;
        }, $rows);
        json_ok($out);
    }

    // ── GET ──────────────────────────────────────────────────────────────────
    case 'get': {
        if (!$id) json_error('ID em falta.');
        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_error('Registo não encontrado.', 404);
        $j = row_to_js($row, $json_cols);
        if ($resource === 'maquinas') {
            $j['periodicidadeManut'] = $j['periodicidade'] ?? $row['periodicidade'] ?? null;
            $j['clienteNif'] = $j['clienteNif'] ?? $row['cliente_nif'] ?? null;
        }
        json_ok($j);
    }

    // ── CREATE ───────────────────────────────────────────────────────────────
    case 'create': {
        $data = $body['data'] ?? [];
        if (empty($data)) json_error('Dados em falta.');

        if ($resource === 'maquinas') $data = preprocess_maquina($data);

        // Geração especial de número de relatório no servidor
        if ($resource === 'relatorios' && empty($data['numeroRelatorio'])) {
            // Determinar o tipo (MT ou MP) a partir da manutenção associada
            $tipo = 'MP';
            if (!empty($data['manutencaoId'])) {
                $sm = $pdo->prepare("SELECT tipo FROM manutencoes WHERE id = ?");
                $sm->execute([$data['manutencaoId']]);
                $m = $sm->fetch();
                if ($m && $m['tipo'] === 'montagem') $tipo = 'MT';
            }
            $ano  = date('Y');
            $sc   = $pdo->prepare("SELECT COUNT(*) FROM relatorios WHERE numero_relatorio LIKE ?");
            $sc->execute(["$ano.$tipo.%"]);
            $cnt  = (int)$sc->fetchColumn() + 1;
            $data['numeroRelatorio'] = sprintf('%s.%s.%05d', $ano, $tipo, $cnt);
        }

        [$cols, $params] = js_to_row($data, $allowed);
        if (empty($cols)) json_error('Nenhum campo válido para inserir.');

        $placeholders = implode(', ', array_fill(0, count($cols), '?'));
        $colList      = implode(', ', array_map(fn($c) => "`$c`", $cols));
        $pdo->prepare("INSERT INTO `$table` ($colList) VALUES ($placeholders)")->execute($params);

        // Devolver o registo criado
        $recId = $data['id'] ?? null;
        if ($recId) {
            $s2 = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
            $s2->execute([$recId]);
            $row = $s2->fetch();
            json_ok($row ? row_to_js($row, $json_cols) : row_to_js(array_combine($cols, $params), $json_cols));
        }
        json_ok(row_to_js(array_combine($cols, $params), $json_cols), 201);
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    case 'update': {
        $recId = $id ?: ($body['data']['id'] ?? '');
        if (!$recId) json_error('ID em falta.');
        $data = $body['data'] ?? [];
        if (empty($data)) json_error('Dados em falta.');

        if ($resource === 'maquinas') $data = preprocess_maquina($data);

        [$cols, $params] = js_to_row($data, $allowed);
        if (empty($cols)) json_error('Nenhum campo válido para actualizar.');

        $sets = implode(', ', array_map(fn($c) => "`$c` = ?", $cols));
        $params[] = $recId;
        $pdo->prepare("UPDATE `$table` SET $sets WHERE id = ?")->execute($params);

        $s2 = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
        $s2->execute([$recId]);
        $row = $s2->fetch();
        json_ok($row ? row_to_js($row, $json_cols) : null);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    case 'delete': {
        if (!$id) json_error('ID em falta.');
        $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        json_ok();
    }

    // ── BULK CREATE (seed / importação em lote) ───────────────────────────────
    case 'bulk_create': {
        $records = $body['data'] ?? [];
        if (!is_array($records) || empty($records)) json_error('Array de dados em falta.');

        $pdo->beginTransaction();
        try {
            $inserted = 0;
            foreach ($records as $data) {
                if ($resource === 'maquinas') $data = preprocess_maquina($data);
                // Geração de número de relatório se necessário
                if ($resource === 'relatorios' && empty($data['numeroRelatorio'])) {
                    $tipo = 'MP';
                    $ano  = date('Y');
                    $sc   = $pdo->prepare("SELECT COUNT(*) FROM relatorios WHERE numero_relatorio LIKE ?");
                    $sc->execute(["$ano.$tipo.%"]);
                    $cnt  = (int)$sc->fetchColumn() + 1;
                    $data['numeroRelatorio'] = sprintf('%s.%s.%05d', $ano, $tipo, $cnt);
                }
                [$cols, $params] = js_to_row($data, $allowed);
                if (empty($cols)) continue;
                $ph  = implode(', ', array_fill(0, count($cols), '?'));
                $cl  = implode(', ', array_map(fn($c) => "`$c`", $cols));
                $pdo->prepare("INSERT IGNORE INTO `$table` ($cl) VALUES ($ph)")->execute($params);
                $inserted++;
            }
            $pdo->commit();
            json_ok(['inserted' => $inserted]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            atm_log_api('error', 'API', 'bulk_create', 'Erro SQL durante importação em lote', ['resource' => $resource, 'msg' => $e->getMessage()]);
            error_log('[ATM-API] bulk_create error: ' . $e->getMessage());
            json_error('Erro durante importação em lote.', 500);
        }
    }

    // ── BULK RESTORE (substitui TODOS os dados da tabela) ────────────────────
    case 'bulk_restore': {
        // Apenas Admin pode fazer restore completo
        if (($authPayload['role'] ?? '') !== 'admin') json_error('Acesso negado.', 403);

        $records = $body['data'] ?? [];
        if (!is_array($records)) json_error('Array de dados em falta.');

        $pdo->beginTransaction();
        try {
            $pdo->exec("DELETE FROM `$table`");
            $inserted = 0;
            foreach ($records as $data) {
                if ($resource === 'maquinas') $data = preprocess_maquina($data);
                [$cols, $params] = js_to_row($data, $allowed);
                if (empty($cols)) continue;
                $ph  = implode(', ', array_fill(0, count($cols), '?'));
                $cl  = implode(', ', array_map(fn($c) => "`$c`", $cols));
                $pdo->prepare("INSERT INTO `$table` ($cl) VALUES ($ph)")->execute($params);
                $inserted++;
            }
            $pdo->commit();
            json_ok(['restored' => $inserted]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            atm_log_api('error', 'API', 'bulk_restore', 'Erro SQL durante restauro', ['resource' => $resource, 'msg' => $e->getMessage()]);
            error_log('[ATM-API] bulk_restore error: ' . $e->getMessage());
            json_error('Erro durante restauro.', 500);
        }
    }

    default:
        json_error("Acção desconhecida: $action", 404);
}

} catch (PDOException $e) {
    atm_log_api('error', 'API', $action, 'Erro SQL na operação', ['resource' => $resource, 'msg' => $e->getMessage()]);
    error_log('[ATM-API] PDOException ' . $resource . '/' . $action . ': ' . $e->getMessage());
    json_error('Erro de base de dados. Consulte os logs.', 500);
} catch (Throwable $e) {
    // Qualquer outra exceção (Exception, Error, TypeError, etc.)
    $msg = $e->getMessage();
    $file = $e->getFile();
    $line = $e->getLine();
    atm_log_api('fatal', 'API', $action, $msg, ['resource' => $resource, 'file' => basename($file), 'line' => $line, 'class' => get_class($e)]);
    error_log('[ATM-API] Throwable ' . get_class($e) . ': ' . $msg . ' in ' . $file . ':' . $line);
    json_error('Erro inesperado. Consulte os logs.', 500);
}
