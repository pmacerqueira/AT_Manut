import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isTecnicoHorarioRestritoNow } from '../../src/utils/tecnicoHorarioRestrito.js'

describe('isTecnicoHorarioRestritoNow', () => {
  const tz = 'Atlantic/Azores'

  it('returns false when disabled', () => {
    const cfg = { enabled: false, timezone: tz, blocks: [{ days: [0], from: '00:00', to: '23:59' }] }
    assert.equal(isTecnicoHorarioRestritoNow(new Date('2026-03-01T14:00:00Z'), cfg), false)
  })

  it('blocks full Sunday when configured (2026-03-01 is Sunday)', () => {
    const cfg = { enabled: true, timezone: tz, blocks: [{ days: [0], from: '00:00', to: '23:59' }] }
    assert.equal(isTecnicoHorarioRestritoNow(new Date('2026-03-01T14:00:00Z'), cfg), true)
  })

  it('allows Monday midday outside block', () => {
    const cfg = {
      enabled: true,
      timezone: tz,
      blocks: [{ days: [1, 2, 3, 4, 5], from: '19:00', to: '07:30' }],
    }
    // Segunda 2026-03-02 ~12:00 em Azores
    assert.equal(isTecnicoHorarioRestritoNow(new Date('2026-03-02T13:00:00Z'), cfg), false)
  })

  it('blocks Monday early morning inside overnight window', () => {
    const cfg = {
      enabled: true,
      timezone: tz,
      blocks: [{ days: [1, 2, 3, 4, 5], from: '19:00', to: '07:30' }],
    }
    assert.equal(isTecnicoHorarioRestritoNow(new Date('2026-03-02T03:00:00Z'), cfg), true)
  })
})
