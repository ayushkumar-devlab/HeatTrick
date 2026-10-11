const MAGNUS_A = 17.625
const MAGNUS_B = 243.04

export function dewPointFromTRh(
  temperatureCelsius: number | null | undefined,
  relativeHumidity: number | null | undefined,
): number | null {
  if (
    typeof temperatureCelsius !== 'number'
    || !Number.isFinite(temperatureCelsius)
    || typeof relativeHumidity !== 'number'
    || !Number.isFinite(relativeHumidity)
    || relativeHumidity <= 0
    || relativeHumidity > 100
  ) {
    return null
  }

  const gamma = Math.log(relativeHumidity / 100)
    + (MAGNUS_A * temperatureCelsius) / (MAGNUS_B + temperatureCelsius)

  const dewPoint = (MAGNUS_B * gamma) / (MAGNUS_A - gamma)
  return Number.isFinite(dewPoint) ? dewPoint : null
}
