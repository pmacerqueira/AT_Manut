<?php
/**
 * Nomes de categorias/subcategorias para pastas NAVEL / OneDrive: só ASCII, sem acentos.
 * Usar em: data.php (escrita), taxonomy-nodes.php, navel-doc-lib.php.
 *
 * CRÍTICO: todas as preg_* sobre texto UTF-8 usam modificador /u — sem isso,
 * bytes de caracteres acentuados são partidos e aparecem nomes tipo "Prticos".
 */
declare(strict_types=1);

function atm_taxonomy_ascii_name(string $s): string
{
    $s = trim($s);
    if ($s === '') {
        return '';
    }
    if (class_exists(\Normalizer::class)) {
        $n = \Normalizer::normalize($s, \Normalizer::FORM_C);
        if (is_string($n) && $n !== '') {
            $s = $n;
        }
    }
    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    if (is_string($converted) && $converted !== '') {
        $s = $converted;
    }
    static $dashMap = [
        "\u{2013}" => '-',
        "\u{2014}" => '-',
        "\u{2212}" => '-',
    ];
    $s = strtr($s, $dashMap);
    $s = preg_replace('/[^A-Za-z0-9\- ]+/u', '', $s) ?? '';
    $s = preg_replace('/\s+/u', ' ', $s) ?? '';
    $s = preg_replace('/-{2,}/u', '-', $s) ?? '';

    return trim($s);
}

/** Alias semântico (segmentos de pasta = nome ASCII). */
function atm_taxonomy_slugify(string $value): string
{
    return atm_taxonomy_ascii_name($value);
}
