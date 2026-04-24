<?php
/**
 * navel-doc-lib.php — Integração servidor com documentos-api.php (navel-site)
 *
 * Colocar junto a config.php / data.php. Não expor ao browser sem validação JWT.
 */
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/atm-taxonomy-normalize.php';

/** @var list<string> */
const ATM_NAVEL_DOC_TYPES = ['MANUAL_UTILIZADOR', 'MANUAL_TECNICO', 'PLANO_MANUTENCAO', 'OUTROS'];

/** Limite de vínculos máquina↔documento por pedido (evita payloads abusivos). */
const ATM_NAVEL_MAX_MACHINE_LINKS = 200;

/** Tamanho máximo aceite para IDs de equipamento AT (VARCHAR(32) na BD; margem para evolução). */
const ATM_NAVEL_MACHINE_ID_MAX_LEN = 64;

/**
 * Impede configuração errada de enviar o token de integração para outro host.
 */
function atm_navel_doc_api_host_allowed(string $url): bool
{
    $p = parse_url($url);
    if (!is_array($p) || empty($p['host'])) {
        return false;
    }
    $scheme = strtolower((string) ($p['scheme'] ?? ''));
    if ($scheme !== 'https' && $scheme !== 'http') {
        return false;
    }
    $host = strtolower((string) $p['host']);
    return $host === 'navel.pt'
        || $host === 'www.navel.pt'
        || (strlen($host) > 9 && substr($host, -9) === '.navel.pt');
}

/**
 * Caminho relativo seguro sob Assistencia Tecnica/ (ficheiro ou pasta).
 * Rejeita .., bytes nulos e prefixos incorrectos.
 */
function atm_navel_doc_sanitize_assistencia_rel_path(string $path): ?string
{
    $norm = str_replace('\\', '/', $path);
    if (str_contains($norm, "\0")) {
        return null;
    }
    $norm = trim($norm);
    $norm = ltrim($norm, '/');
    if ($norm === '' || str_contains($norm, '..')) {
        return null;
    }
    if (!str_starts_with($norm, 'Assistencia Tecnica/')) {
        return null;
    }
    return $norm;
}

/**
 * @param list<mixed> $ids
 * @return list<string>
 */
function atm_navel_doc_normalize_machine_ids(array $ids): array
{
    $out = [];
    foreach ($ids as $id) {
        $s = trim((string) $id);
        if ($s === '' || strlen($s) > ATM_NAVEL_MACHINE_ID_MAX_LEN) {
            continue;
        }
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $s)) {
            continue;
        }
        $out[] = $s;
    }
    return array_values(array_unique($out, SORT_STRING));
}

/**
 * Verifica que todos os IDs existem em `maquinas` (protecção contra vínculos fantasma).
 *
 * @param list<string> $machineIds
 */
function atm_navel_doc_verify_maquinas_exist(PDO $pdo, array $machineIds): bool
{
    if ($machineIds === []) {
        return true;
    }
    $placeholders = implode(',', array_fill(0, count($machineIds), '?'));
    $sql = 'SELECT COUNT(*) FROM maquinas WHERE id IN (' . $placeholders . ')';
    $st = $pdo->prepare($sql);
    $st->execute($machineIds);
    return (int) $st->fetchColumn() === count($machineIds);
}

/**
 * Confirma que o caminho de pasta coincide com o equipamento (anti-tamper no multipart).
 *
 * @return ?string pasta esperada ou null se inválido
 */
function atm_navel_expected_path_for_maquina(PDO $pdo, string $maquinaId): ?string
{
    $mid = trim($maquinaId);
    if ($mid === '' || strlen($mid) > ATM_NAVEL_MACHINE_ID_MAX_LEN || !preg_match('/^[a-zA-Z0-9_-]+$/', $mid)) {
        return null;
    }
    $st = $pdo->prepare('SELECT id, subcategoria_id FROM maquinas WHERE id = ? LIMIT 1');
    $st->execute([$mid]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    return atm_assistencia_path_for_subcategoria_id($pdo, (string) ($row['subcategoria_id'] ?? ''));
}

/** @return non-empty-string */
function atm_navel_doc_api_url(): string
{
    if (defined('ATM_NAVEL_DOCUMENTOS_API_URL')) {
        $u = trim((string) ATM_NAVEL_DOCUMENTOS_API_URL);
        if ($u !== '') {
            return rtrim($u, '/');
        }
    }
    if (function_exists('atm_env')) {
        $u = trim(atm_env('ATM_NAVEL_DOCUMENTOS_API_URL'));
        if ($u !== '') {
            return rtrim($u, '/');
        }
    }
    $u = getenv('ATM_NAVEL_DOCUMENTOS_API_URL');
    if (is_string($u) && trim($u) !== '') {
        return rtrim(trim($u), '/');
    }
    return 'https://navel.pt/documentos-api.php';
}

function atm_navel_integration_token(): string
{
    if (defined('ATM_NAVEL_DOC_INTEGRATION_TOKEN')) {
        $t = trim((string) ATM_NAVEL_DOC_INTEGRATION_TOKEN);
        if ($t !== '') {
            return $t;
        }
    }
    if (function_exists('atm_env')) {
        $t = trim(atm_env('ATM_NAVEL_DOC_INTEGRATION_TOKEN'));
        if ($t !== '') {
            return $t;
        }
    }
    $t = getenv('ATM_NAVEL_DOC_INTEGRATION_TOKEN');
    if (is_string($t) && trim($t) !== '') {
        return trim($t);
    }
    return '';
}

/**
 * @return int bytes; 0 = sem limite (não recomendado em produção)
 */
function atm_navel_doc_proxy_max_response_bytes(): int
{
    if (defined('ATM_NAVEL_DOC_PROXY_MAX_RESPONSE_BYTES')) {
        return (int) ATM_NAVEL_DOC_PROXY_MAX_RESPONSE_BYTES;
    }
    return 12 * 1024 * 1024;
}

/**
 * Caminho relativo na biblioteca NAVEL para uma subcategoria (ramo Assistência Técnica).
 * Ex.: Assistencia Tecnica/ISTOBAL/ProLift
 */
function atm_assistencia_path_for_subcategoria_id(PDO $pdo, string $subId): ?string
{
    $subId = trim($subId);
    if ($subId === '') {
        return null;
    }
    $st = $pdo->prepare('SELECT id, categoria_id, nome FROM subcategorias WHERE id = ? LIMIT 1');
    $st->execute([$subId]);
    $sub = $st->fetch(PDO::FETCH_ASSOC);
    if (!$sub) {
        return null;
    }
    $catId = (string) ($sub['categoria_id'] ?? '');
    $st2 = $pdo->prepare('SELECT id, nome FROM categorias WHERE id = ? LIMIT 1');
    $st2->execute([$catId]);
    $cat = $st2->fetch(PDO::FETCH_ASSOC);
    if (!$cat) {
        return null;
    }
    $catSlug = atm_taxonomy_slugify((string) ($cat['nome'] ?? ''));
    $subSlug = atm_taxonomy_slugify((string) ($sub['nome'] ?? ''));
    if ($catSlug === '' || $subSlug === '') {
        return null;
    }
    return 'Assistencia Tecnica/' . $catSlug . '/' . $subSlug;
}

/**
 * @param array<string, scalar|null> $query
 * @return array{ok:bool, http:int, json: mixed, raw: string, curlError?: string}
 */
function atm_navel_doc_request_get(array $query): array
{
    $bearer = atm_navel_integration_token();
    if ($bearer === '') {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'missing_token'];
    }
    $base = atm_navel_doc_api_url();
    if (!atm_navel_doc_api_host_allowed($base)) {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'unsafe_api_host'];
    }
    $url = $base . '?' . http_build_query($query);
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'no_curl'];
    }
    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'curl_init_failed'];
    }
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer ' . $bearer,
        ],
    ];
    if (defined('CURLPROTO_HTTP') && defined('CURLPROTO_HTTPS')) {
        $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTP | CURLPROTO_HTTPS;
        $opts[CURLOPT_REDIR_PROTOCOLS] = CURLPROTO_HTTP | CURLPROTO_HTTPS;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = '';
    if ($raw === false) {
        $curlErr = (string) curl_error($ch);
    }
    curl_close($ch);
    if (!is_string($raw)) {
        return ['ok' => false, 'http' => $http, 'json' => null, 'raw' => '', 'curlError' => $curlErr !== '' ? $curlErr : 'curl_exec_failed'];
    }
    $maxBytes = atm_navel_doc_proxy_max_response_bytes();
    if ($maxBytes > 0 && strlen($raw) > $maxBytes) {
        if (function_exists('atm_log_api')) {
            atm_log_api('warn', 'API', 'navel_doc_proxy', 'response_too_large_get', ['bytes' => strlen($raw), 'max' => $maxBytes]);
        }
        return ['ok' => false, 'http' => $http, 'json' => null, 'raw' => '', 'curlError' => 'response_too_large'];
    }
    $json = json_decode($raw, true);
    return ['ok' => $http >= 200 && $http < 300, 'http' => $http, 'json' => is_array($json) ? $json : null, 'raw' => $raw];
}

/**
 * @param array<string, mixed> $body
 * @return array{ok:bool, http:int, json: mixed, raw: string, curlError?: string}
 */
function atm_navel_doc_request_post_json(array $body): array
{
    $bearer = atm_navel_integration_token();
    if ($bearer === '') {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'missing_token'];
    }
    $url = atm_navel_doc_api_url();
    if (!atm_navel_doc_api_host_allowed($url)) {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'unsafe_api_host'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'no_curl'];
    }
    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'http' => 0, 'json' => null, 'raw' => '', 'curlError' => 'curl_init_failed'];
    }
    $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => is_string($payload) ? $payload : '{}',
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'Authorization: Bearer ' . $bearer,
        ],
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ];
    if (defined('CURLPROTO_HTTP') && defined('CURLPROTO_HTTPS')) {
        $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTP | CURLPROTO_HTTPS;
        $opts[CURLOPT_REDIR_PROTOCOLS] = CURLPROTO_HTTP | CURLPROTO_HTTPS;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = '';
    if ($raw === false) {
        $curlErr = (string) curl_error($ch);
    }
    curl_close($ch);
    if (!is_string($raw)) {
        return ['ok' => false, 'http' => $http, 'json' => null, 'raw' => '', 'curlError' => $curlErr !== '' ? $curlErr : 'curl_exec_failed'];
    }
    $maxBytes = atm_navel_doc_proxy_max_response_bytes();
    if ($maxBytes > 0 && strlen($raw) > $maxBytes) {
        if (function_exists('atm_log_api')) {
            atm_log_api('warn', 'API', 'navel_doc_proxy', 'response_too_large_post', ['bytes' => strlen($raw), 'max' => $maxBytes]);
        }
        return ['ok' => false, 'http' => $http, 'json' => null, 'raw' => '', 'curlError' => 'response_too_large'];
    }
    $json = json_decode($raw, true);
    return ['ok' => $http >= 200 && $http < 300, 'http' => $http, 'json' => is_array($json) ? $json : null, 'raw' => $raw];
}
