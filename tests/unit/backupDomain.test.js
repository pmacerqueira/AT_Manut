import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BACKUP_FORMAT_VERSION,
  buildBackupPayload,
  validateBackupDados,
  extractRestoreSlices,
  formatBackupRestoreSuccessMessage,
  backupFilenameForDate,
} from '../../src/domain/backupDomain.js'

describe('buildBackupPayload', () => {
  it('includes format version, app version and export slices', () => {
    const payload = buildBackupPayload({
      appVersion: '1.16.94',
      exportadoEm: '2026-06-12T10:00:00.000Z',
      dados: {
        clientes: [{ nif: '1' }],
        categorias: [],
        manutencoes: [{ id: 'm1' }],
      },
    })
    assert.equal(payload.versao, BACKUP_FORMAT_VERSION)
    assert.equal(payload.appVersao, '1.16.94')
    assert.equal(payload.exportadoEm, '2026-06-12T10:00:00.000Z')
    assert.deepEqual(payload.dados.clientes, [{ nif: '1' }])
    assert.deepEqual(payload.dados.manutencoes, [{ id: 'm1' }])
    assert.equal(payload.dados.reparacoes, undefined)
  })
})

describe('validateBackupDados', () => {
  it('rejects missing dados', () => {
    const r = validateBackupDados(null)
    assert.equal(r.ok, false)
    assert.match(r.message, /dados/)
  })

  it('rejects non-array slices', () => {
    const r = validateBackupDados({ clientes: {} })
    assert.equal(r.ok, false)
    assert.ok(r.invalidKeys?.includes('clientes'))
  })

  it('accepts valid partial backup', () => {
    assert.equal(validateBackupDados({ clientes: [], maquinas: [] }).ok, true)
  })
})

describe('extractRestoreSlices', () => {
  it('returns only defined array keys', () => {
    const slices = extractRestoreSlices({ clientes: [{ nif: '1' }], maquinas: 'x' })
    assert.deepEqual(slices, { clientes: [{ nif: '1' }] })
  })
})

describe('formatBackupRestoreSuccessMessage', () => {
  it('formats exportadoEm in pt-PT', () => {
    const msg = formatBackupRestoreSuccessMessage('2026-06-12T10:00:00.000Z')
    assert.match(msg, /restaurados com sucesso/i)
    assert.match(msg, /2026/)
  })
})

describe('backupFilenameForDate', () => {
  it('uses ISO date prefix', () => {
    assert.equal(
      backupFilenameForDate(new Date('2026-06-12T15:00:00.000Z')),
      'atmanut_backup_2026-06-12.json',
    )
  })
})
