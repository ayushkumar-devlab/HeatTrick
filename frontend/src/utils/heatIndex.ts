export function calculateHeatIndexCelsius(
  temperatureCelsius: number | null | undefined,
  relativeHumidity: number | null | undefined,
): number | null {
  if (
    typeof temperatureCelsius !== 'number'
    || !Number.isFinite(temperatureCelsius)
    || typeof relativeHumidity !== 'number'
    || !Number.isFinite(relativeHumidity)
    || relativeHumidity < 0
    || relativeHumidity > 100
  ) {
    return null
  }

  const temperatureFahrenheit = temperatureCelsius * 9 / 5 + 32
  const t = temperatureFahrenheit
  const rh = relativeHumidity
  const simpleHeatIndex = 0.5 * (
    t + 61 + (t - 68) * 1.2 + rh * 0.094
  )

  if (t < 80) {
    const heatIndex = (simpleHeatIndex + t) / 2 >= 80
      ? (simpleHeatIndex + t) / 2
      : simpleHeatIndex
    return (heatIndex - 32) * 5 / 9
  }

  let heatIndex = -42.379
    + 2.04901523 * t
    + 10.14333127 * rh
    - 0.22475541 * t * rh
    - 0.00683783 * t * t
    - 0.05481717 * rh * rh
    + 0.00122874 * t * t * rh
    + 0.00085282 * t * rh * rh
    - 0.00000199 * t * t * rh * rh

  if (rh < 13 && t >= 80 && t <= 112) {
    const adjustment = ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17)
    heatIndex -= adjustment
  } else if (rh > 85 && t >= 80 && t <= 87) {
    const adjustment = ((rh - 85) / 10) * ((87 - t) / 5)
    heatIndex += adjustment
  }

  if (heatIndex < 80) {
    heatIndex = (simpleHeatIndex + t) / 2 >= 80
      ? (simpleHeatIndex + t) / 2
      : simpleHeatIndex
  }

  return (heatIndex - 32) * 5 / 9
}
