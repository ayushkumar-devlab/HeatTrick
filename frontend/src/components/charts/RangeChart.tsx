import { useChartWidth } from './useChartWidth'
import type { ChartDay } from './types'
import { heatBandColor, heatBandInk, heatBandSoft } from '../../lib/temperatureBands'

interface RangeChartProps {
  days: ChartDay[]
  threshold: number
}

const dateLabel = (date: string) => {
  const [, month, day] = date.split('-')
  return month && day ? `${day}/${month}` : date
}

const validNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export function RangeChart({ days, threshold }: RangeChartProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const height = 310
  const margin = { top: 40, right: 24, bottom: 40, left: 38 }
  const dataValues = days.flatMap(({ high, low }) => [high, low].filter(validNumber))
  const minData = Math.min(...dataValues, threshold)
  const maxData = Math.max(...dataValues, threshold)
  const minY = minData - 2
  const maxY = maxData + 2
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const xFor = (index: number) => margin.left + (days.length <= 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth)
  const yFor = (value: number) => margin.top + ((maxY - value) / (maxY - minY)) * plotHeight
  const ranges = days.map((day, index) => validNumber(day.high) && validNumber(day.low)
    ? { index, high: day.high, low: day.low }
    : null)
  const thresholdY = yFor(threshold)

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg role="img" aria-label={`Daily forecast high and low ranges with the ${threshold} °C heatwave line`} viewBox={`0 0 ${width} ${height}`} width="100%" className="block h-auto">
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
          <text x={width - margin.right - 3} y={Math.max(18, thresholdY - 7)} textAnchor="end" fontSize="13" fontWeight="600" fill="rgb(var(--color-danger))">Heatwave · {threshold}°C</text>
          {ranges.slice(0, -1).map((range, index) => {
            const next = ranges[index + 1]
            if (!range || !next) return null
            return (
              <g key={`${days[index]?.date}-${days[index + 1]?.date}-range`} aria-hidden="true">
                <path
                  d={`M ${xFor(index)} ${yFor(range.high)} L ${xFor(index + 1)} ${yFor(next.high)} L ${xFor(index + 1)} ${yFor(next.low)} L ${xFor(index)} ${yFor(range.low)} Z`}
                  fill={heatBandSoft((range.high + next.high) / 2)}
                  opacity="0.8"
                />
                <line
                  x1={xFor(index)} y1={yFor(range.high)}
                  x2={xFor(index + 1)} y2={yFor(next.high)}
                  stroke={heatBandColor((range.high + next.high) / 2)}
                  strokeWidth="3" strokeLinecap="round"
                />
                <line
                  x1={xFor(index)} y1={yFor(range.low)}
                  x2={xFor(index + 1)} y2={yFor(next.low)}
                  stroke={heatBandColor((range.low + next.low) / 2)}
                  strokeWidth="2.5" strokeLinecap="round"
                />
              </g>
            )
          })}
          {ranges.map((range, index) => {
            if (!range) return null
            return (
              <g key={`${days[index]?.date}-${index}`}>
                <circle cx={xFor(index)} cy={yFor(range.high)} r="5" fill="rgb(var(--color-surface))" stroke={heatBandColor(range.high)} strokeWidth="3" tabIndex={0} aria-label={`${days[index]?.date}: high ${range.high.toFixed(1)} °C`}>
                  <title>{`${days[index]?.date}: high ${range.high.toFixed(1)} °C`}</title>
                </circle>
                <circle cx={xFor(index)} cy={yFor(range.low)} r="5" fill="rgb(var(--color-surface))" stroke={heatBandColor(range.low)} strokeWidth="3" tabIndex={0} aria-label={`${days[index]?.date}: low ${range.low.toFixed(1)} °C`}>
                  <title>{`${days[index]?.date}: low ${range.low.toFixed(1)} °C`}</title>
                </circle>
                <text x={xFor(index)} y={yFor(range.high) - 10} textAnchor="middle" fontSize="13" fontWeight="700" fill={heatBandInk(range.high)}>{range.high.toFixed(1)}°</text>
                <text x={xFor(index)} y={yFor(range.low) + 20} textAnchor="middle" fontSize="13" fontWeight="600" fill={heatBandInk(range.low)}>{range.low.toFixed(1)}°</text>
              </g>
            )
          })}
          {days.map((day, index) => <text key={`${day.date}-label`} x={xFor(index)} y={height - 10} textAnchor="middle" fontSize="13" fill="rgb(var(--color-muted))">{dateLabel(day.date)}</text>)}
        </svg>
      </div>
      <ul className="sr-only">
        {days.map((day, index) => <li key={`${day.date}-${index}`}>{day.date}: high {validNumber(day.high) ? `${day.high.toFixed(1)} °C` : '—'}, low {validNumber(day.low) ? `${day.low.toFixed(1)} °C` : '—'}.</li>)}
        <li>Heatwave threshold: {threshold} °C.</li>
      </ul>
    </div>
  )
}
