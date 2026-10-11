export interface KeyValueRow {
  label: string
  value: number | null | undefined
  unit: string
  digits?: number
}

interface KeyValueListProps {
  rows: KeyValueRow[]
  asOf?: string | null
}

export function KeyValueList({ rows, asOf }: KeyValueListProps) {
  const visibleRows = rows.filter(({ value }) => typeof value === 'number' && Number.isFinite(value))

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card" aria-labelledby="right-now-title">
      <h3 id="right-now-title" className="display-title text-2xl font-semibold text-ink">Right now</h3>
      <dl className="mt-4">
        {visibleRows.map(({ label, value, unit, digits = 1 }, index) => (
          <div key={label} className={`flex items-baseline justify-between gap-3 py-3 ${index ? 'border-t border-border' : ''}`}>
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="flex shrink-0 items-baseline gap-1.5 font-semibold tabular-nums text-ink">
              <span>{value?.toFixed(digits)}</span>
              <span className="text-xs font-normal text-muted">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      {asOf && <p className="mt-3 border-t border-border pt-3 text-sm text-muted">As of {asOf}</p>}
      {!visibleRows.length && <p className="mt-4 text-sm text-muted">Current values unavailable.</p>}
    </section>
  )
}
