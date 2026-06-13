/**
 * backupDomain — formato canónico de export/import JSON (Definições).
 */

/** Versão do esquema JSON do ficheiro (independente de APP_VERSION). */
export const BACKUP_FORMAT_VERSION = '1.4'

/** Chaves em `dados` que devem ser arrays quando presentes. */
export const BACKUP_DADOS_ARRAY_KEYS = [
  'clientes',
  'categorias',
  'subcategorias',
  'checklistItems',
  'marcas',
  'tecnicos',
  'maquinas',
  'manutencoes',
  'relatorios',
  'pecasPlano',
]

/** Slices incluídos no export actual. */
export const BACKUP_EXPORT_SLICES = [
  'clientes',
  'categorias',
  'subcategorias',
  'checklistItems',
  'marcas',
  'tecnicos',
  'maquinas',
  'manutencoes',
  'relatorios',
  'pecasPlano',
]

/**
 * @param {object} params
 * @param {string} params.appVersion — APP_VERSION da app que exportou
 * @param {string} params.exportadoEm — ISO timestamp
 * @param {object} params.dados — slices de estado
 */
export function buildBackupPayload({ appVersion, exportadoEm, dados }) {
  const payload = {
    versao: BACKUP_FORMAT_VERSION,
    appVersao: appVersion,
    exportadoEm,
    dados: {},
  }
  for (const key of BACKUP_EXPORT_SLICES) {
    if (dados[key] !== undefined) payload.dados[key] = dados[key]
  }
  return payload
}

/**
 * @param {object|null|undefined} dados
 * @returns {{ ok: true } | { ok: false, message: string, invalidKeys?: string[] }}
 */
export function validateBackupDados(dados) {
  if (!dados || typeof dados !== 'object') {
    return { ok: false, message: 'Ficheiro inválido: campo "dados" em falta.' }
  }
  const invalid = BACKUP_DADOS_ARRAY_KEYS.filter(
    k => dados[k] !== undefined && !Array.isArray(dados[k]),
  )
  if (invalid.length > 0) {
    return {
      ok: false,
      message: `Ficheiro inválido: ${invalid.join(', ')} devem ser arrays.`,
      invalidKeys: invalid,
    }
  }
  return { ok: true }
}

/**
 * Extrai apenas slices definidos (para restore no estado React).
 * @returns {Record<string, unknown[]>}
 */
export function extractRestoreSlices(dados) {
  const out = {}
  for (const key of BACKUP_DADOS_ARRAY_KEYS) {
    if (Array.isArray(dados[key])) out[key] = dados[key]
  }
  return out
}

/**
 * @param {string|null|undefined} exportadoEm — ISO do backup
 */
export function formatBackupRestoreSuccessMessage(exportadoEm, { timeZone = 'Atlantic/Azores' } = {}) {
  const dtBackup = exportadoEm
    ? new Date(exportadoEm).toLocaleString('pt-PT', { timeZone })
    : '—'
  return `Dados restaurados com sucesso (backup de ${dtBackup}).`
}

/** Nome de ficheiro sugerido: atmanut_backup_YYYY-MM-DD.json */
export function backupFilenameForDate(date = new Date()) {
  const ts = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
  return `atmanut_backup_${ts}.json`
}

/**
 * Persiste todas as slices do backup no servidor (bulk_restore).
 * Recursos opcionais (marcas, tecnicos) ignoram falha durante migração.
 */
export async function runBackupBulkRestore(d, apis) {
  const ops = []
  const push = (slice, fn, optional = false) => {
    if (!d[slice]) return
    const p = fn()
    ops.push(optional ? p.catch(() => null) : p)
  }
  push('clientes', () => apis.apiClientes.bulkRestore(d.clientes))
  push('categorias', () => apis.apiCategorias.bulkRestore(d.categorias))
  push('subcategorias', () => apis.apiSubcategorias.bulkRestore(d.subcategorias))
  push('checklistItems', () => apis.apiChecklistItems.bulkRestore(d.checklistItems))
  push('marcas', () => apis.apiMarcas.bulkRestore(d.marcas), true)
  push('tecnicos', () => apis.apiTecnicos.bulkRestore(d.tecnicos), true)
  push('maquinas', () => apis.apiMaquinas.bulkRestore(d.maquinas))
  push('manutencoes', () => apis.apiManutencoes.bulkRestore(d.manutencoes))
  push('relatorios', () => apis.apiRelatorios.bulkRestore(d.relatorios))
  push('pecasPlano', () => apis.apiPecasPlano.bulkRestore(d.pecasPlano))
  await Promise.all(ops)
}
