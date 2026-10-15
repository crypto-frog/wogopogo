import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceDate } from '../src/util.js'

test('source dates keep their calendar day across viewer time zones', () => {
  const previous = process.env.TZ
  try {
    for (const zone of ['America/Vancouver', 'Pacific/Honolulu', 'Pacific/Auckland']) {
      process.env.TZ = zone
      assert.equal(sourceDate('2026-06-08'), 'Jun 8, 2026')
      assert.equal(sourceDate('2026-11-01'), 'Nov 1, 2026')
    }
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})

test('source dates reject missing, invalid, or timestamp values', () => {
  for (const value of [undefined, '', 'invalid', '2026-02-30', '2026-10-15 00:00:00']) {
    assert.equal(sourceDate(value), '')
  }
})
