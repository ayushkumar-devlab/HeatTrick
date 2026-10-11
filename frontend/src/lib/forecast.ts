export function forecastPeak(values: (number | null | undefined)[] | undefined): number | null {
  const available = values?.filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value),
  ) ?? []
  return available.length ? Math.max(...available) : null
}
