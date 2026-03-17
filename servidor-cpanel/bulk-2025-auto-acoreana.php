<?php
/**
 * bulk-2025-auto-acoreana.php — Script one-shot para processar em massa
 * as manutenções de 2025 do cliente Auto Açoreana (NIF 512037353).
 *
 * USO:
 *   1. Upload para public_html/api/ no cPanel
 *   2. Abrir no browser:
 *      ?mode=dry&token=bulk2025navel   → diagnóstico (não altera nada)
 *      ?mode=execute&token=bulk2025navel → execução real
 *   3. Verificar resultado
 *   4. ELIMINAR o ficheiro do servidor após uso
 *
 * INSTALAR EM: public_html/api/bulk-2025-auto-acoreana.php
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
set_time_limit(300);

// ── Segurança ──
$token = $_GET['token'] ?? '';
if ($token !== 'bulk2025navel') {
    http_response_code(403);
    die('Acesso negado. Token inválido.');
}

$mode = $_GET['mode'] ?? 'dry';
if (!in_array($mode, ['dry', 'execute'], true)) {
    die('Modo inválido. Use ?mode=dry ou ?mode=execute');
}

// ── Ligação BD ──
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
$pdo = get_pdo();

// ── Constantes ──
define('CLIENT_NIF', '512037353');
define('NOME_ASSINANTE', 'Graça Camara');
define('INTERVALO_DIAS', 90); // trimestral
define('ANO_ALVO', 2025);
define('ANOS_FUTURO', 3);

header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bulk 2025 Auto Açoreana</title>';
echo '<style>body{font-family:monospace;padding:1rem;background:#1a1a2e;color:#e0e0e0;line-height:1.6}';
echo 'h1,h2{color:#7dd3fc}table{border-collapse:collapse;width:100%;margin:1rem 0}';
echo 'th,td{border:1px solid #334;padding:4px 8px;text-align:left;font-size:0.85rem}';
echo 'th{background:#1e3a5f;color:#fff}.ok{color:#22c55e}.err{color:#ef4444}.warn{color:#f59e0b}';
echo '.dry{background:#312e81;padding:1rem;border-radius:8px;margin:1rem 0}';
echo '</style></head><body>';
echo '<h1>Bulk 2025 — Auto Açoreana</h1>';
echo '<p>Modo: <strong>' . strtoupper($mode) . '</strong></p>';

// ── 1. Obter máquinas do cliente ──
$stmMaq = $pdo->prepare("SELECT id, subcategoria_id, marca, modelo, numero_serie, periodicidade FROM maquinas WHERE cliente_nif = ?");
$stmMaq->execute([CLIENT_NIF]);
$maquinas = $stmMaq->fetchAll();

echo '<h2>Máquinas do cliente (' . count($maquinas) . ')</h2>';
echo '<table><tr><th>ID</th><th>Subcategoria</th><th>Marca</th><th>Modelo</th><th>Nº Série</th><th>Periodicidade</th></tr>';
foreach ($maquinas as $mq) {
    echo '<tr><td>' . $mq['id'] . '</td><td>' . $mq['subcategoria_id'] . '</td><td>' . $mq['marca'] . '</td><td>' . $mq['modelo'] . '</td><td>' . $mq['numero_serie'] . '</td><td>' . ($mq['periodicidade'] ?? 'anual') . '</td></tr>';
}
echo '</table>';

$maqIds = array_column($maquinas, 'id');
$maqMap = [];
foreach ($maquinas as $mq) { $maqMap[$mq['id']] = $mq; }

if (empty($maqIds)) {
    echo '<p class="err">Nenhuma máquina encontrada para o cliente.</p></body></html>';
    exit;
}

// ── 2. Obter manutenções pendentes/agendadas de 2025 ──
$placeholders = implode(',', array_fill(0, count($maqIds), '?'));
$stmManut = $pdo->prepare("
    SELECT m.id, m.maquina_id, m.data, m.tipo, m.status, m.tecnico
    FROM manutencoes m
    WHERE m.maquina_id IN ($placeholders)
      AND m.data >= '2025-01-01' AND m.data <= '2025-12-31'
      AND m.status IN ('pendente', 'agendada')
    ORDER BY m.data ASC
");
$stmManut->execute($maqIds);
$manutencoes = $stmManut->fetchAll();

echo '<h2>Manutenções 2025 pendentes/agendadas (' . count($manutencoes) . ')</h2>';

if (empty($manutencoes)) {
    echo '<p class="warn">Nenhuma manutenção pendente/agendada de 2025 encontrada.</p></body></html>';
    exit;
}

echo '<table><tr><th>#</th><th>ID</th><th>Máquina</th><th>Data Agendada</th><th>Data Ajustada</th><th>Tipo</th><th>Status</th></tr>';
foreach ($manutencoes as $i => $m) {
    $mq = $maqMap[$m['maquina_id']] ?? null;
    $dataAjustada = ajustarDiaUtil($m['data']);
    echo '<tr>';
    echo '<td>' . ($i + 1) . '</td>';
    echo '<td>' . $m['id'] . '</td>';
    echo '<td>' . ($mq ? $mq['marca'] . ' ' . $mq['modelo'] . ' (' . $mq['numero_serie'] . ')' : 'N/A') . '</td>';
    echo '<td>' . $m['data'] . '</td>';
    echo '<td>' . $dataAjustada . ($dataAjustada !== $m['data'] ? ' <span class="warn">(ajustada)</span>' : '') . '</td>';
    echo '<td>' . $m['tipo'] . '</td>';
    echo '<td>' . $m['status'] . '</td>';
    echo '</tr>';
}
echo '</table>';

// ── 3. Obter técnico e assinatura dos relatórios existentes ──
$stmRef = $pdo->prepare("
    SELECT r.tecnico, r.nome_assinante, r.assinatura_digital
    FROM relatorios r
    JOIN manutencoes m ON m.id = r.manutencao_id
    JOIN maquinas mq ON mq.id = m.maquina_id
    WHERE mq.cliente_nif = ? AND r.assinatura_digital IS NOT NULL AND r.assinatura_digital != ''
    ORDER BY r.data_criacao DESC
    LIMIT 1
");
$stmRef->execute([CLIENT_NIF]);
$refRel = $stmRef->fetch();

$tecnico = $refRel['tecnico'] ?? 'N/A';
$assinaturaDigital = $refRel['assinatura_digital'] ?? '';

echo '<h2>Dados de referência</h2>';
echo '<p>Técnico: <strong>' . htmlspecialchars($tecnico) . '</strong></p>';
echo '<p>Nome assinante: <strong>' . NOME_ASSINANTE . '</strong></p>';
echo '<p>Assinatura digital: ' . ($assinaturaDigital ? '<span class="ok">Encontrada (' . strlen($assinaturaDigital) . ' bytes)</span>' : '<span class="err">NÃO ENCONTRADA</span>') . '</p>';

// ── 4. Obter checklist items por subcategoria ──
$checklistBySubcat = [];
$stmCk = $pdo->query("SELECT id, subcategoria_id, tipo, ordem, texto FROM checklist_items ORDER BY subcategoria_id, tipo, ordem");
foreach ($stmCk->fetchAll() as $ck) {
    $key = $ck['subcategoria_id'] . '|' . ($ck['tipo'] ?: 'periodica');
    $ck['grupo'] = $ck['grupo'] ?? '';
    $checklistBySubcat[$key][] = $ck;
}

// ── 5. Contar relatórios 2025.MP existentes ──
$stmCount = $pdo->prepare("SELECT COUNT(*) FROM relatorios WHERE numero_relatorio LIKE ?");
$stmCount->execute(['2025.MP.%']);
$numExistentes2025 = (int)$stmCount->fetchColumn();

echo '<p>Relatórios 2025.MP existentes: <strong>' . $numExistentes2025 . '</strong></p>';
echo '<p>Próximo número: <strong>2025.MP.' . str_pad($numExistentes2025 + 1, 5, '0', STR_PAD_LEFT) . '</strong></p>';

// ═══════════════════════════════════════════════════════════════════════════════
// DRY RUN — parar aqui
// ═══════════════════════════════════════════════════════════════════════════════
if ($mode === 'dry') {
    echo '<div class="dry">';
    echo '<h2>MODO DRY-RUN — Nada foi alterado</h2>';
    echo '<p>Se os dados acima estão correctos, execute com:</p>';
    echo '<p><code>?mode=execute&token=bulk2025navel</code></p>';
    echo '<p><strong>' . count($manutencoes) . '</strong> manutenções serão processadas.</p>';
    echo '<p><strong>' . count($maquinas) . '</strong> máquinas serão actualizadas.</p>';
    echo '</div></body></html>';
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE — processar tudo
// ═══════════════════════════════════════════════════════════════════════════════
echo '<h2>A executar...</h2>';

$pdo->beginTransaction();

try {
    $sucesso = 0;
    $erros = 0;
    $numRelatorio = $numExistentes2025;
    $ultimaPorMaquina = []; // maquinaId => data mais recente executada

    foreach ($manutencoes as $i => $m) {
        $mq = $maqMap[$m['maquina_id']] ?? null;
        if (!$mq) {
            echo '<p class="err">Máquina não encontrada para manutenção ' . $m['id'] . '</p>';
            $erros++;
            continue;
        }

        $dataExec = ajustarDiaUtil($m['data']);
        $dataISO = $dataExec . 'T12:00:00.000Z';
        $subcat = $mq['subcategoria_id'];
        $tipo = $m['tipo'] ?: 'periodica';

        // Checklist: obter items para esta subcategoria/tipo
        $ckKey = $subcat . '|' . $tipo;
        // Fallback: se não há items para o tipo exacto, tentar sem tipo (periodica)
        $ckItems = $checklistBySubcat[$ckKey] ?? $checklistBySubcat[$subcat . '|periodica'] ?? [];
        // Também incluir items sem tipo definido (NULL)
        $ckItemsNull = $checklistBySubcat[$subcat . '|'] ?? [];
        if (!empty($ckItemsNull)) {
            $existingIds = array_column($ckItems, 'id');
            foreach ($ckItemsNull as $ci) {
                if (!in_array($ci['id'], $existingIds)) {
                    $ckItems[] = $ci;
                }
            }
            usort($ckItems, fn($a, $b) => $a['ordem'] <=> $b['ordem']);
        }

        $checklistRespostas = new stdClass();
        $checklistSnapshot = [];
        foreach ($ckItems as $ci) {
            $checklistRespostas->{$ci['id']} = 'sim';
            $checklistSnapshot[] = [
                'id' => $ci['id'],
                'texto' => $ci['texto'],
                'ordem' => (int)$ci['ordem'],
                'grupo' => $ci['grupo'],
            ];
        }

        $numRelatorio++;
        $numRelStr = sprintf('2025.MP.%05d', $numRelatorio);
        $relId = 'rb' . substr(uniqid('', true), -12) . $i;

        // INSERT relatorio (sem checklist_snapshot — migração pode não existir)
        $stmInsRel = $pdo->prepare("
            INSERT INTO relatorios (id, manutencao_id, numero_relatorio, data_criacao, data_assinatura,
                tecnico, nome_assinante, assinado_pelo_cliente, assinatura_digital,
                checklist_respostas, notas, fotos, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, '', '[]', NOW())
        ");
        $stmInsRel->execute([
            $relId,
            $m['id'],
            $numRelStr,
            $dataISO,
            $dataISO,
            $tecnico,
            NOME_ASSINANTE,
            $assinaturaDigital,
            json_encode($checklistRespostas, JSON_UNESCAPED_UNICODE),
        ]);

        // UPDATE manutencao
        $stmUpdManut = $pdo->prepare("UPDATE manutencoes SET status = 'concluida', data = ?, tecnico = ? WHERE id = ?");
        $stmUpdManut->execute([$dataExec, $tecnico, $m['id']]);

        // Registar última data por máquina
        if (!isset($ultimaPorMaquina[$m['maquina_id']]) || $dataExec > $ultimaPorMaquina[$m['maquina_id']]) {
            $ultimaPorMaquina[$m['maquina_id']] = $dataExec;
        }

        echo '<p class="ok">[' . ($i + 1) . '/' . count($manutencoes) . '] ' . $numRelStr . ' — '
            . $mq['marca'] . ' ' . $mq['modelo'] . ' — ' . $dataExec
            . ' (' . count($ckItems) . ' checklist items)</p>';

        $sucesso++;
    }

    // ── Actualizar máquinas: ultima_manutencao_data e proxima_manut ──
    echo '<h2>A actualizar máquinas...</h2>';
    foreach ($ultimaPorMaquina as $maqId => $ultimaData) {
        $proximaDate = calcProximaManut($ultimaData, INTERVALO_DIAS);
        $stmUpdMaq = $pdo->prepare("UPDATE maquinas SET ultima_manutencao_data = ?, proxima_manut = ? WHERE id = ?");
        $stmUpdMaq->execute([$ultimaData, $proximaDate, $maqId]);
        $mq = $maqMap[$maqId];
        echo '<p class="ok">' . $mq['marca'] . ' ' . $mq['modelo'] . ': última=' . $ultimaData . ' próxima=' . $proximaDate . '</p>';
    }

    // ── Reagendar periódicas futuras ──
    echo '<h2>A reagendar periódicas 2026+...</h2>';
    $totalAgendadas = 0;
    foreach ($ultimaPorMaquina as $maqId => $ultimaData) {
        $mq = $maqMap[$maqId];

        // Eliminar futuras pendentes/agendadas para esta máquina (data > ultimaData)
        $stmDelFut = $pdo->prepare("
            DELETE FROM manutencoes
            WHERE maquina_id = ?
              AND status IN ('pendente', 'agendada')
              AND data > ?
        ");
        $stmDelFut->execute([$maqId, $ultimaData]);
        $removidas = $stmDelFut->rowCount();

        // Gerar novas periódicas a cada 90 dias por 3 anos
        $limiteMs = strtotime($ultimaData) + (ANOS_FUTURO * 365.25 * 86400);
        $d = strtotime($ultimaData);
        $novas = 0;
        $diasOcupados = [];

        while (true) {
            $d += INTERVALO_DIAS * 86400;
            if ($d > $limiteMs) break;

            $dataISO = ajustarDiaUtil(date('Y-m-d', $d));
            // Evitar duplicatas no mesmo dia
            while (in_array($dataISO, $diasOcupados)) {
                $d += 86400;
                $dataISO = ajustarDiaUtil(date('Y-m-d', $d));
            }
            $diasOcupados[] = $dataISO;

            $novoId = 'mb' . substr(uniqid('', true), -12) . $novas;
            $stmInsManut = $pdo->prepare("
                INSERT INTO manutencoes (id, maquina_id, tipo, data, tecnico, status, observacoes, criado_em)
                VALUES (?, ?, 'periodica', ?, '', 'agendada', 'Reagendamento automático (bulk 2025)', NOW())
            ");
            $stmInsManut->execute([$novoId, $maqId, $dataISO]);
            $novas++;
        }

        $totalAgendadas += $novas;
        echo '<p class="ok">' . $mq['marca'] . ' ' . $mq['modelo']
            . ': removidas=' . $removidas . ' criadas=' . $novas . '</p>';
    }

    $pdo->commit();

    echo '<h2 class="ok">CONCLUÍDO</h2>';
    echo '<p class="ok">Manutenções concluídas: <strong>' . $sucesso . '</strong></p>';
    echo '<p class="ok">Relatórios criados: 2025.MP.' . str_pad($numExistentes2025 + 1, 5, '0', STR_PAD_LEFT)
        . ' a 2025.MP.' . str_pad($numRelatorio, 5, '0', STR_PAD_LEFT) . '</p>';
    echo '<p class="ok">Periódicas reagendadas: <strong>' . $totalAgendadas . '</strong></p>';
    if ($erros > 0) {
        echo '<p class="err">Erros: <strong>' . $erros . '</strong></p>';
    }
    echo '<p class="warn">IMPORTANTE: Elimine este ficheiro do servidor!</p>';

} catch (Exception $e) {
    $pdo->rollBack();
    echo '<p class="err">ERRO FATAL — Rollback aplicado: ' . htmlspecialchars($e->getMessage()) . '</p>';
}

echo '</body></html>';

// ═══════════════════════════════════════════════════════════════════════════════
// Funções auxiliares
// ═══════════════════════════════════════════════════════════════════════════════

/** Ajusta a data para dia útil: Sábado→Sexta, Domingo→Segunda */
function ajustarDiaUtil(string $data): string {
    $ts = strtotime($data);
    $dow = (int)date('w', $ts); // 0=Dom, 6=Sáb
    if ($dow === 6) return date('Y-m-d', $ts - 86400);  // Sáb → Sex
    if ($dow === 0) return date('Y-m-d', $ts + 86400);  // Dom → Seg
    return $data;
}

/** Calcula a próxima data de manutenção (data + intervalo), ajustada para dia útil */
function calcProximaManut(string $dataBase, int $intervaloDias): string {
    $ts = strtotime($dataBase) + ($intervaloDias * 86400);
    return ajustarDiaUtil(date('Y-m-d', $ts));
}
