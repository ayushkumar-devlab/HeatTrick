import { useChartWidth } from './useChartWidth'
import type { ChartDay } from './types'
import type { ImdCriteriaType } from '../../lib/heatwave'
import { terrainThreshold } from '../../lib/heatwave'
import { formatChartAxisDate, formatChartDate, selectValueLabelIndexes } from '../../lib/chartLabels'
import { heatBandColor, heatBandInk } from '../../lib/temperatureBands'

interface DailyHighChartProps {
  days: ChartDay[]
  terrain: ImdCriteriaType
  today?: string | null
  label?: string
}

const isValid = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function terrainName(terrain: ImdCriteriaType) {
  return terrain === 'Hilly' ? 'Hills' : terrain
}

export function DailyHighChart({
  days,
  terrain,
  today,
  label = 'Seven-day daily forecast highs',
}: DailyHighChartProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const threshold = terrainThreshold(terrain)
  const name = terrainName(terrain)
  const height = 288
  const margin = { top: 42, right: 26, bottom: 38, left: 56 }
  const values = days.map(({ high }) => high)
  const availableValues = values.filter(isValid)
  const minY = Math.min(...availableValues, threshold) - 2
  const maxY = Math.max(...availableValues, threshold) + 2
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const xFor = (index: number) => margin.left + (days.length <= 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth)
  const yFor = (value: number) => margin.top + ((maxY - value) / (maxY - minY)) * plotHeight
  const thresholdY = yFor(threshold)
  const compact = width < 520
  const visibleLabels = new Set(selectValueLabelIndexes(values, width))
  const dateCaption = `Dashed line: the base temperature IMD uses to start counting heatwave days at ${name} stations. A heatwave also depends on departure from the local normal, which HeatTrick doesn't have yet, so this is not a heatwave classification.`

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg
          role="img"
          aria-label={`${label} with the ${name} threshold at ${threshold} °C`}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          className="block h-auto"
        >
          {[0, 1, 2, 3].map((step) => {
            const y = margin.top + (step / 3) * plotHeight
            const tick = maxY - ((maxY - minY) * step) / 3
            return (
              <g key={step}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="rgb(var(--color-border))" strokeWidth="1" />
                <text x={margin.left - 9} y={y + 5} textAnchor="end" fontSize="13" fill="rgb(var(--color-muted))">{tick.toFixed(0)}°</text>
              </g>
            )
          })}
          {days.slice(0, -1).map((day, index) => {
            const next = days[index + 1]
            if (!isValid(day.high) || !next || !isValid(next.high)) return null
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
          <line x1={margin.left} y1={thresholdY} x2={width - margin.right} y2={thresholdY} stroke="rgb(var(--color-danger))" strokeWidth="2.5" strokeDasharray="7 5" />
          <text x={width - margin.right - 3} y={Math.max(18, thresholdY - 7)} textAnchor="end" fontSize="13" fontWeight="600" fill="rgb(var(--color-danger))">{name} threshold · {threshold} °C</text>
          {days.map((day, index) => {
            const high = isValid(day.high) ? day.high : null
            const x = xFor(index)
            const y = high == null ? null : yFor(high)
            const edgeOffset = compact ? 3 : 0
            const labelX = index === 0 ? x + edgeOffset : index === days.length - 1 ? x - edgeOffset : x
            const anchor = index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'
            const labelY = y == null
              ? null
              : Math.min(height - margin.bottom - 3, Math.max(margin.top + 13, y + (index % 2 === 0 ? -14 : 21)))
            const showLabel = high != null && (visibleLabels.has(index) || !compact)
            return (
              <g key={`${day.date}-${index}`}>
                {high != null && y != null && (
                  <>
                    {showLabel && labelY != null && (
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor={anchor}
                        fontSize="13"
                        fontWeight="700"
                        fill={heatBandInk(high)}
                      >
                        {high.toFixed(1)}°
                      </text>
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={day.date === today ? 7 : 5}
                      fill="rgb(var(--color-surface))"
                      stroke={heatBandColor(high)}
                      strokeWidth="3"
                      tabIndex={0}
                      aria-label={`${formatChartDate(day.date)}: ${high.toFixed(1)} °C`}
                    >
                      <title>{`${formatChartDate(day.date)}: ${high.toFixed(1)} °C`}</title>
                    </circle>
                  </>
                )}
                {(!compact || index % 2 === 0 || index === days.length - 1) && (
                  <text x={x} y={height - 10} textAnchor="middle" fontSize="12" fill="rgb(var(--color-muted))">
                    {formatChartAxisDate(day.date, compact)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {days.map((day, index) => (
          <li key={`${day.date}-${index}`}>
            {formatChartDate(day.date)}: {isValid(day.high) ? `${day.high.toFixed(1)} °C` : '—'}
            {day.date === today ? ' (today)' : ''}
          </li>
        ))}
        <li>{name} threshold: {threshold} °C.</li>
      </ul>
      <p className="mt-2 text-sm leading-6 text-muted">{dateCaption}</p>
    </div>
  )
}
