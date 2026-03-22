<?php
/**
 * Horário de uso restrito para utilizadores com role `tecnico` (ex.: ATecnica).
 * Ver tecnico_horario_restrito.json.example na mesma pasta.
 */

function atm_parse_hhmm(string $s): ?int
{
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', trim($s), $m)) {
        return null;
    }
    $h = (int) $m[1];
    $min = (int) $m[2];
    if ($h > 23 || $min > 59) {
        return null;
    }
    return $h * 60 + $min;
}

function atm_tecnico_horario_config(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $default = [
        'enabled' => false,
        'timezone' => 'Atlantic/Azores',
        'blocks' => [],
    ];
    $path = defined('ATM_TECNICO_HORARIO_JSON') ? ATM_TECNICO_HORARIO_JSON : '';
    if ($path === '' || !is_readable($path)) {
        $cache = $default;
        return $cache;
    }
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        $cache = $default;
        return $cache;
    }
    $j = json_decode($raw, true);
    if (!is_array($j)) {
        $cache = $default;
        return $cache;
    }
    $cache = array_merge($default, $j);
    return $cache;
}

function atm_tecnico_em_horario_restrito(): bool
{
    if (getenv('ATM_TECNICO_HORARIO_DISABLED') === '1') {
        return false;
    }
    $cfg = atm_tecnico_horario_config();
    if (empty($cfg['enabled'])) {
        return false;
    }
    $tzName = $cfg['timezone'] ?? 'Atlantic/Azores';
    try {
        $tz = new DateTimeZone($tzName);
    } catch (Exception $e) {
        return false;
    }
    $now = new DateTime('now', $tz);
    $dow = (int) $now->format('w');
    $minutes = (int) $now->format('G') * 60 + (int) $now->format('i');

    $blocks = $cfg['blocks'] ?? [];
    if (!is_array($blocks)) {
        return false;
    }
    foreach ($blocks as $b) {
        if (!is_array($b)) {
            continue;
        }
        $days = $b['days'] ?? [];
        if (!is_array($days) || $days === []) {
            continue;
        }
        $dayInts = array_map('intval', $days);
        if (!in_array($dow, $dayInts, true)) {
            continue;
        }
        $from = atm_parse_hhmm((string) ($b['from'] ?? ''));
        $to = atm_parse_hhmm((string) ($b['to'] ?? ''));
        if ($from === null || $to === null) {
            continue;
        }
        if ($from <= $to) {
            if ($minutes >= $from && $minutes <= $to) {
                return true;
            }
        } else {
            if ($minutes >= $from || $minutes <= $to) {
                return true;
            }
        }
    }
    return false;
}
