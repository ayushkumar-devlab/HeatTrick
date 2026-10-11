import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateHeatIndexCelsius } from './heatIndex.ts'

test('computes NOAA/NWS heat index for valid hot, humid conditions', () => {
  const result = calculateHeatIndexCelsius(32.2, 70)

  assert.ok(result !== null)
  assert.ok(result > 40)
  assert.ok(result < 42)
})

test('uses the NWS simplified formula below 80°F', () => {
  const result = calculateHeatIndexCelsius(26, 80)

  assert.ok(result !== null)
  assert.ok(result > 26)
  assert.ok(result < 27)
})

test('returns null for missing, non-finite, or invalid humidity inputs', () => {
  assert.equal(calculateHeatIndexCelsius(null, 70), null)
  assert.equal(calculateHeatIndexCelsius(32, null), null)
  assert.equal(calculateHeatIndexCelsius(32, Number.NaN), null)
  assert.equal(calculateHeatIndexCelsius(32, 101), null)
})
