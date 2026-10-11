import { useChartWidth } from './useChartWidth'
import type { ImdCriteriaType } from '../../lib/heatwave'

interface TerrainThresholdsProps {
  peak: number | null | undefined
}

const thresholds: { terrain: ImdCriteriaType; label: string; value: number }[] = [
  { terrain: 'Plains', label: 'Plains', value: 40 },
  { terrain: 'Coastal', label: 'Coastal', value: 37 },
  { terrain: 'Hilly', label: 'Hills', value: 30 },
]

export function TerrainThresholds({ peak }: TerrainThresholdsProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const margin = { left: 88, right: 20 }
  const scaleMax = Math.max(50, ...thresholds.map(({ value }) => value), typeof peak === 'number' && Number.isFinite(peak) ? peak : 0)
  const plotWidth = width - margin.left - margin.right
  const xFor = (value: number) => margin.left + (value / scaleMax) * plotWidth
  const hasPeak = typeof peak === 'number' && Number.isFinite(peak)
  const reached = hasPeak ? thresholds.filter(({ value }) => peak >= value) : []
  const caption = !hasPeak
    ? 'Weekly peak forecast high unavailable.'
    : reached.length
      ? `The ${peak.toFixed(1)} °C weekly peak reaches: ${reached.map(({ label }) => `${label} ${thresholds.find((entry) => entry.label === label)?.value}°C`).join(', ')}.`
      : `The ${peak.toFixed(1)} °C weekly peak does not reach any of these starting thresholds.`

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg role="img" aria-label="Plains, coastal, and hills heatwave starting thresholds compared with the weekly forecast peak" viewBox={`0 0 ${width} 166`} width="100%" className="block h-auto">
          {Array.from({ length: 6 }, (_, tick) => {
            const value = tick * 10
            const x = xFor(value)
            return (
              <g key={tick}>
                <line x1={x} y1="16" x2={x} y2="135" stroke="rgb(var(--color-border))" strokeWidth="1" />
                <text x={x} y="157" textAnchor="middle" fontSize="13" fill="rgb(var(--color-muted))">{value}°</text>
              </g>
            )
          })}
          {hasPeak && (
            <>
              <line x1={xFor(peak)} y1="8" x2={xFor(peak)} y2="137" stroke="rgb(var(--color-ink))" strokeWidth="2.5" strokeDasharray="6 5" />
              <text x={Math.min(width - 6, xFor(peak) + 5)} y="13" textAnchor={xFor(peak) > width - 115 ? 'end' : 'start'} fontSize="13" fontWeight="600" fill="rgb(var(--color-ink))">Week peak {peak.toFixed(1)}°C</text>
            </>
          )}
          {thresholds.map(({ terrain, label, value }, index) => {
            const y = 39 + index * 37
            return (
              <g key={terrain}>
                <text x={margin.left - 9} y={y + 5} textAnchor="end" fontSize="14" fontWeight="600" fill="rgb(var(--color-ink-soft))">{label}</text>
                <rect x={margin.left} y={y - 8} width={plotWidth} height="16" rx="5" fill="rgb(var(--color-surface-alt))" />
                <rect x={margin.left} y={y - 8} width={xFor(value) - margin.left} height="16" rx="5" fill="rgb(var(--color-brand-soft))" />
                <line x1={xFor(value)} y1={y - 11} x2={xFor(value)} y2={y + 11} stroke="rgb(var(--color-brand))" strokeWidth="2.5" />
                <text x={xFor(value) + 5} y={y + 5} fontSize="13" fontWeight="700" fill="rgb(var(--color-brand-ink))">{value}°C</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{caption}</p>
      <ul className="sr-only">
        {thresholds.map(({ label, value }) => <li key={label}>{label} starting threshold: {value} °C.</li>)}
        <li>{caption}</li>
      </ul>
    </div>
  )
}
