const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateParts(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

export function formatChartDate(date: string): string {
  const parts = dateParts(date)
  if (!parts) return date
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`
}

export function formatChartAxisDate(date: string, narrow: boolean): string {
  const parts = dateParts(date)
  if (!parts) return date
  if (!narrow) return `${parts.day} ${MONTHS[parts.month - 1]}`
  const weekday = WEEKDAYS[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()]
  return `${weekday} ${parts.day}`
}

export function selectValueLabelIndexes(
  values: (number | null | undefined)[],
  width: number,
  compactWidth = 520,
): number[] {
  const available = values.flatMap((value, index) =>
    typeof value === 'number' && Number.isFinite(value) ? [index] : [],
  )
  if (width >= compactWidth) return available
  if (!available.length) return []

  const selected = new Set<number>([
    available[0]!,
    available.at(-1)!,
    available.reduce((peak, index) => values[index]! > values[peak]! ? index : peak),
    available.reduce((lowest, index) => values[index]! < values[lowest]! ? index : lowest),
  ])
  return [...selected].sort((left, right) => left - right)
}
