/**
 * Espelha atm_taxonomy_ascii_name (PHP) — nomes de categoria só ASCII para pastas NAVEL.
 */
export function atmTaxonomyAsciiName(raw) {
  if (raw == null) return ''
  let s = String(raw).trim()
  if (!s) return ''
  s = s.normalize('NFC')
  s = s.normalize('NFD').replace(/\p{M}/gu, '')
  s = s.replace(/[\u2013\u2014\u2212]/g, '-')
  s = s.replace(/[^A-Za-z0-9\- ]+/g, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/-{2,}/g, '-')
  return s.trim()
}
