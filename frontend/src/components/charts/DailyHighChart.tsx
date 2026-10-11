import { useChartWidth } from './useChartWidth'
import type { ChartDay } from './types'
import { heatBandColor, heatBandInk } from '../../lib/temperatureBands'

interface DailyHighChartProps {
  days: ChartDay[]
  threshold: number
  today?: string | null
  label?: string
}

const dateLabel = (date: string) => {
  const [, month, day] = date.split('-')
  return month && day ? `${day}/${month}` : date
}

function formatNumber(value: number) {
  return `${value.toFixed(1)} °C`
}

export function DailyHighChart({ days, threshold, today, label = 'Seven-day daily forecast highs' }: DailyHighChartProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const height = 288
  const margin = { top: 42, right: 26, bottom: 38, left: 38 }
  const values = days.flatMap(({ high }) => typeof high === 'number' && Number.isFinite(high) ? [high] : [])
  const lowValue = Math.min(...values, threshold)
  const highValue = Math.max(...values, threshold)
  const minY = lowValue - 2
  const maxY = highValue + 2
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const xFor = (index: number) => margin.left + (days.length <= 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth)
  const yFor = (value: number) => margin.top + ((maxY - value) / (maxY - minY)) * plotHeight
  const thresholdY = yFor(threshold)

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg role="img" aria-label={`${label} with a ${threshold} °C heatwave threshold line`} viewBox={`0 0 ${width} ${height}`} width="100%" className="block h-auto">
          {[0, 1, 2, 3].map((step) => {
            const y = margin.top + (step / 3) * plotHeight
            const tick = maxY - ((maxY - minY) * step) / 3
            return (
              <g key={step}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="rgb(var(--color-border))" strokeWidth="1" />
                <text x={margin.left - 7} y={y + 5} textAnchor="end" fontSize="13" fill="rgb(var(--color-muted))">{tick.toFixed(0)}°</text>
              </g>
            )
          })}
          <line x1={margin.left} y1={thresholdY} x2={width - margin.right} y2={thresholdY} stroke="rgb(var(--color-danger))" strokeWidth="2.5" strokeDasharray="7 5" />
          <text x={width - margin.right - 4} y={Math.max(18, thresholdY - 7)} textAnchor="end" fontSize="13" fontWeight="600" fill="rgb(var(--color-danger))">Heatwave line · {threshold}°C</text>
          {days.slice(0, -1).map((day, index) => {
            const next = days[index + 1]
            if (
              typeof day?.high !== 'number' || !Number.isFinite(day.high)
              || typeof next?.high !== 'number' || !Number.isFinite(next.high)
            ) return null
            return (
              <line
                key={`${day.date}-${next.date}-line`}
                x1={xFor(index)}
                y1={yFor(day.high)}
                x2={xFor(index + 1)}
                y2={yFor(next.high)}
                stroke={heatBandColor((day.high + next.high) / 2)}
                strokeWidth="3"
                strokeLinecap="round"
              />
            )
          })}
          {days.map((day, index) => {
            const valid = typeof day.high === 'number' && Number.isFinite(day.high)
            const high = valid ? day.high : null
            const x = xFor(index)
            const y = high == null ? null : yFor(high)
            return (
              <g key={`${day.date}-${index}`}>
                {y != null && high != null && (
                  <>
                    <text x={x} y={y - 12} textAnchor="middle" fontSize="13" fontWeight="700" fill={heatBandInk(high)}>{high.toFixed(1)}°</text>
                    <circle cx={x} cy={y} r={day.date === today ? 7 : 5} fill="rgb(var(--color-surface))" stroke={heatBandColor(high)} strokeWidth="3" tabIndex={0} aria-label={`${day.date}: ${high.toFixed(1)} °C`}>
                      <title>{`${day.date}: ${high.toFixed(1)} °C`}</title>
                    </circle>
                  </>
                )}
                <text x={x} y={height - 10} textAnchor="middle" fontSize="13" fill="rgb(var(--color-muted))">{dateLabel(day.date)}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {days.map((day, index) => <li key={`${day.date}-${index}`}>{day.date}: {typeof day.high === 'number' && Number.isFinite(day.high) ? formatNumber(day.high) : '—'}{day.date === today ? ' (today)' : ''}</li>)}
        <li>Heatwave threshold line: {threshold} °C.</li>
      </ul>
    </div>
  )
}
