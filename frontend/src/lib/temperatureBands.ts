export function heatBandColor(value: number): string {
  if (value < 25) return 'rgb(var(--color-heat-cool))'
  if (value < 30) return 'rgb(var(--color-heat-green))'
  if (value < 35) return 'rgb(var(--color-heat-amber))'
  if (value < 40) return 'rgb(var(--color-heat-orange))'
  return 'rgb(var(--color-heat-red))'
}

export function heatBandInk(value: number): string {
  if (value < 25) return 'rgb(var(--color-heat-cool-ink))'
  if (value < 30) return 'rgb(var(--color-heat-green-ink))'
  if (value < 35) return 'rgb(var(--color-heat-amber-ink))'
  if (value < 40) return 'rgb(var(--color-heat-orange-ink))'
  return 'rgb(var(--color-heat-red-ink))'
}

export function heatBandSoft(value: number): string {
  if (value < 25) return 'rgb(var(--color-heat-cool-soft))'
  if (value < 30) return 'rgb(var(--color-heat-green-soft))'
  if (value < 35) return 'rgb(var(--color-heat-amber-soft))'
  if (value < 40) return 'rgb(var(--color-heat-orange-soft))'
  return 'rgb(var(--color-heat-red-soft))'
}
