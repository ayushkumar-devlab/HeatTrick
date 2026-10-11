import { useChartWidth } from './useChartWidth'
import type { TemperatureBand } from './types'

interface BandBarProps {
  bands: TemperatureBand[]
  value: number | null | undefined
  unit: string
  ariaLabel?: string
}

export function BandBar({ bands, value, unit, ariaLabel = 'Value on temperature bands' }: BandBarProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const height = 82
  const left = 12
  const right = width - 12
  const scaleMin = bands[0]?.from ?? 0
  const scaleMax = bands.at(-1)?.to ?? 1
  const scaleWidth = right - left
  const xFor = (number: number) => left + ((number - scaleMin) / (scaleMax - scaleMin)) * scaleWidth
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : null
  const markerX = numericValue == null ? null : xFor(Math.min(scaleMax, Math.max(scaleMin, numericValue)))

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          className="block h-auto"
        >
          {bands.map((band) => {
            const x = xFor(band.from)
            const bandWidth = Math.max(0, xFor(band.to) - x)
            return (
              <g key={`${band.from}-${band.to}`}>
                <rect x={x} y="40" width={bandWidth} height="22" rx="5" fill={band.color} opacity="0.2" />
                <line x1={x} y1="39" x2={x} y2="64" stroke={band.color} strokeWidth="1.5" />
              </g>
            )
          })}
          <line x1={right} y1="39" x2={right} y2="64" stroke="rgb(var(--color-border-strong))" strokeWidth="1.5" />
          {markerX != null && (
            <g>
              <text x={Math.min(right - 4, Math.max(left + 4, markerX))} y="20" textAnchor={markerX > right - 48 ? 'end' : markerX < left + 48 ? 'start' : 'middle'} fontSize="15" fontWeight="700" fill="rgb(var(--color-ink))">
                {numericValue?.toFixed(1)} {unit}
              </text>
              <line x1={markerX} y1="26" x2={markerX} y2="68" stroke="rgb(var(--color-ink))" strokeWidth="2.5" />
              <circle cx={markerX} cy="51" r="6" fill="rgb(var(--color-surface))" stroke="rgb(var(--color-ink))" strokeWidth="2.5" tabIndex={0} aria-label={`${numericValue?.toFixed(1)} ${unit}`}>
                <title>{`${numericValue?.toFixed(1)} ${unit}`}</title>
              </circle>
            </g>
          )}
        </svg>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-ink-soft sm:grid-cols-2" aria-hidden="true">
        {bands.map((band) => (
          <li key={`legend-${band.label}`} className="flex min-w-0 items-baseline gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: band.color }} />
            <span>{band.label}: {band.from}–{band.to} {unit}</span>
          </li>
        ))}
      </ul>
      <ul className="sr-only">
        {bands.map((band) => <li key={band.label}>{band.label}: {band.from}–{band.to} {unit}</li>)}
        <li>{numericValue != null ? `Current value: ${numericValue.toFixed(1)} ${unit}` : 'Current value unavailable.'}</li>
      </ul>
    </div>
  )
}
