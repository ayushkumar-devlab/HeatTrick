import assert from 'node:assert/strict'
import test from 'node:test'
import { dewPointFromTRh } from './dewPoint.ts'
import { forecastPeak } from './forecast.ts'
import { heatwaveVerdict, terrainThreshold } from './heatwave.ts'
import { formatChartAxisDate, formatChartDate, selectValueLabelIndexes } from './chartLabels.ts'

test('maps the existing IMD terrain categories to base thresholds', () => {
  assert.equal(terrainThreshold('Plains'), 40)
  assert.equal(terrainThreshold('Coastal'), 37)
  assert.equal(terrainThreshold('Hilly'), 30)
})

test('describes forecast below, at and above heatwave thresholds', () => {
  const below = heatwaveVerdict({ forecastHigh: 39, terrain: 'Plains' })
  assert.match(below.headline, /1\.0 °C below the 40 °C line/)

  const starting = heatwaveVerdict({ forecastHigh: 40, terrain: 'Plains' })
  assert.match(starting.headline, /reaches the 40 °C starting line/)
  assert.match(starting.subline, /departure from normal/)

  const absolute = heatwaveVerdict({ forecastHigh: 45, terrain: 'Plains' })
  assert.match(absolute.headline, /is at or above the 45 °C level/)
  assert.match(absolute.subline, /not an official warning/)

  const coastal = heatwaveVerdict({ forecastHigh: 40, terrain: 'Coastal' })
  assert.match(coastal.headline, /40 °C level/)

  const hilly = heatwaveVerdict({ forecastHigh: 30, terrain: 'Hilly' })
  assert.match(hilly.headline, /30 °C starting line/)
})

test('reports unavailable forecasts without inventing a value', () => {
  for (const forecastHigh of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      heatwaveVerdict({ forecastHigh, terrain: 'Plains' }).headline,
      'Forecast high unavailable.',
    )
  }
})

test('derives dew point for valid RH boundaries', () => {
  const saturated = dewPointFromTRh(20, 100)
  assert.ok(saturated !== null)
  assert.ok(Math.abs(saturated - 20) < 0.01)

  const lowHumidity = dewPointFromTRh(30, 1)
  assert.ok(lowHumidity !== null && Number.isFinite(lowHumidity))
  assert.ok(lowHumidity < 30)
})

test('returns no dew point for missing or out-of-range inputs', () => {
  assert.equal(dewPointFromTRh(null, 50), null)
  assert.equal(dewPointFromTRh(20, null), null)
  assert.equal(dewPointFromTRh(Number.NaN, 50), null)
  assert.equal(dewPointFromTRh(20, 0), null)
  assert.equal(dewPointFromTRh(20, -1), null)
  assert.equal(dewPointFromTRh(20, 101), null)
  assert.equal(dewPointFromTRh(-243.04, 100), null)
})

test('finds the real forecast peak and skips missing values', () => {
  assert.equal(forecastPeak([null, 28.5, 31.2, undefined]), 31.2)
  assert.equal(forecastPeak([null, undefined]), null)
})

test('formats local-date chart labels without timezone conversion', () => {
  assert.equal(formatChartDate('2026-10-12'), '12 Oct 2026')
  assert.equal(formatChartAxisDate('2026-10-12', false), '12 Oct')
  assert.equal(formatChartAxisDate('2026-10-12', true), 'Mon 12')
})

test('selects endpoints, peak, and low value labels on narrow charts', () => {
  assert.deepEqual(selectValueLabelIndexes([10, 12, 8, 11, 9, 13, 7], 360), [0, 5, 6])
  assert.deepEqual(selectValueLabelIndexes([null, 12, null, 11], 360), [1, 3])
  assert.deepEqual(selectValueLabelIndexes([null, null], 360), [])
  assert.deepEqual(selectValueLabelIndexes([1, null, 3], 640), [0, 2])
})
