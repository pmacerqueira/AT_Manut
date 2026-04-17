<?php
/**
 * taxonomy-nodes.php — Endpoint read-only da taxonomia (categorias + subcategorias)
 *
 * INSTALAR EM: public_html/api/taxonomy-nodes.php
 * URL:         https://www.navel.pt/api/taxonomy-nodes.php
 *
 * Consumido pela Área Reservada NAVEL (navel-site/public/documentos-api.php)
 * para pré-criar as pastas "Assistência Técnica/<Categoria>/<Subcategoria>"
 * replicando a árvore do AT_Manut.
 *
 * Autenticação: Header "Authorization: Bearer <ATM_TAXONOMY_TOKEN>".
 * O token é definido em config.php (constante ATM_TAXONOMY_TOKEN) ou via
 * variável de ambiente cPanel (Advanced → Environment Variables).
 *
 * Resposta: { "ok": true, "items": [ { id, code, name, slug, path, parentId, parentPath, updatedAt }, ... ] }
 */
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=60');

// CORS permissivo (GET/POST read-only; chamado servidor-a-servidor pelo documentos-api.php).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = defined('CORS_ORIGINS') ? CORS_ORIGINS : [];
if ($origin !== '' && in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 3600');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST', 'HEAD'], true)) {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// ── Autenticação por Bearer token ────────────────────────────────────────────
$requiredToken = defined('ATM_TAXONOMY_TOKEN') ? (string) ATM_TAXONOMY_TOKEN : '';
if ($requiredToken !== '') {
    $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    $provided = '';
    if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
        $provided = $m[1];
    }
    if ($provided === '' || !hash_equals($requiredToken, $provided)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'unauthorized']);
        exit;
    }
}

// ── Helpers locais ────────────────────────────────────────────────────────────
$slugify = static function (string $value): string {
    $value = trim($value);
    if ($value === '') return '';
    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (is_string($converted) && $converted !== '') {
        $value = $converted;
    }
    $value = preg_replace('/[^A-Za-z0-9\- ]+/', '', $value) ?? '';
    $value = preg_replace('/\s+/', ' ', $value) ?? '';
    return trim($value);
};

// ── Consulta à BD ────────────────────────────────────────────────────────────
try {
    $pdo = get_pdo();
} catch (Throwable $e) {
    error_log('[ATM-TAXONOMY] db_connect_failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'db_connect_failed']);
    exit;
}

$nodes = [];
$categoryById = [];

try {
    $stmt = $pdo->query('SELECT `id`, `nome` FROM `categorias` ORDER BY `nome`');
    $catRows = $stmt ? $stmt->fetchAll() : [];
    foreach ($catRows as $row) {
        $id = (string) ($row['id'] ?? '');
        $name = trim((string) ($row['nome'] ?? ''));
        if ($id === '' || $name === '') continue;
        $slug = $slugify($name);
        if ($slug === '') continue;
        $categoryById[$id] = ['id' => $id, 'name' => $name, 'slug' => $slug];
        $nodes[] = [
            'id'         => $id,
            'code'       => $id,
            'name'       => $name,
            'slug'       => $slug,
            'path'       => $slug,
            'parentId'   => '',
            'parentPath' => '',
            'updatedAt'  => '',
        ];
    }

    $stmt = $pdo->query('SELECT `id`, `categoria_id`, `nome` FROM `subcategorias` ORDER BY `categoria_id`, `nome`');
    $subRows = $stmt ? $stmt->fetchAll() : [];
    foreach ($subRows as $row) {
        $id = (string) ($row['id'] ?? '');
        $parentId = (string) ($row['categoria_id'] ?? '');
        $name = trim((string) ($row['nome'] ?? ''));
        if ($id === '' || $name === '' || $parentId === '') continue;
        $parent = $categoryById[$parentId] ?? null;
        if ($parent === null) continue;
        $slug = $slugify($name);
        if ($slug === '') continue;
        $nodes[] = [
            'id'         => $id,
            'code'       => $id,
            'name'       => $name,
            'slug'       => $slug,
            'path'       => $parent['slug'] . '/' . $slug,
            'parentId'   => $parentId,
            'parentPath' => $parent['slug'],
            'updatedAt'  => '',
        ];
    }
} catch (Throwable $e) {
    error_log('[ATM-TAXONOMY] query_failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'query_failed']);
    exit;
}

echo json_encode(['ok' => true, 'items' => $nodes], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
