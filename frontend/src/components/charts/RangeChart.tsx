import { useChartWidth } from './useChartWidth'
import type { ChartDay } from './types'
import type { ImdCriteriaType } from '../../lib/heatwave'
import { terrainThreshold } from '../../lib/heatwave'
import { formatChartAxisDate, formatChartDate, selectValueLabelIndexes } from '../../lib/chartLabels'
import { heatBandColor, heatBandInk, heatBandSoft } from '../../lib/temperatureBands'

interface RangeChartProps {
  days: ChartDay[]
  terrain: ImdCriteriaType
}

const validNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function terrainName(terrain: ImdCriteriaType) {
  return terrain === 'Hilly' ? 'Hills' : terrain
}

export function RangeChart({ days, terrain }: RangeChartProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const threshold = terrainThreshold(terrain)
  const name = terrainName(terrain)
  const height = 310
  const compact = width < 520
  const margin = { top: 42, right: 24, bottom: 40, left: 56 }
  const dataValues = days.flatMap(({ high, low }) => [high, low].filter(validNumber))
  const minY = Math.min(...dataValues, threshold) - 2
  const maxY = Math.max(...dataValues, threshold) + 2
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const xFor = (index: number) => margin.left + (days.length <= 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth)
  const yFor = (value: number) => margin.top + ((maxY - value) / (maxY - minY)) * plotHeight
  const ranges = days.map((day) => validNumber(day.high) && validNumber(day.low)
    ? { high: day.high, low: day.low }
    : null)
  const visibleHighLabels = new Set(selectValueLabelIndexes(days.map(({ high }) => high), width))
  const visibleLowLabels = new Set(selectValueLabelIndexes(days.map(({ low }) => low), width))
  const dateCaption = `Dashed line: the base temperature IMD uses to start counting heatwave days at ${name} stations. A heatwave also depends on departure from the local normal, which HeatTrick doesn't have yet, so this is not a heatwave classification.`
  const highAxisDateIndexes = new Set(days.flatMap((_, index) =>
    !compact || index % 2 === 0 || index === days.length - 1 ? [index] : [],
  ))

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg
          role="img"
          aria-label={`Daily forecast high and low ranges with the ${name} threshold at ${threshold} °C`}
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
          <line x1={margin.left} y1={yFor(threshold)} x2={width - margin.right} y2={yFor(threshold)} stroke="rgb(var(--color-danger))" strokeWidth="2.5" strokeDasharray="7 5" />
          <text x={width - margin.right - 3} y={Math.max(18, yFor(threshold) - 7)} textAnchor="end" fontSize="13" fontWeight="600" fill="rgb(var(--color-danger))">{name} threshold · {threshold} °C</text>
          {ranges.map((range, index) => {
            if (!range) return null
            const x = xFor(index)
            const showHighLabel = visibleHighLabels.has(index)
            const showLowLabel = visibleLowLabels.has(index)
            const highY = Math.min(
              height - margin.bottom - 4,
              Math.max(margin.top + 13, yFor(range.high) + (index % 2 === 0 ? -13 : 19)),
            )
            const lowY = Math.min(
              height - margin.bottom - 4,
              Math.max(margin.top + 13, yFor(range.low) + (index % 2 === 0 ? 19 : -13)),
            )
            const edgeOffset = compact ? 3 : 0
            const labelX = index === 0 ? x + edgeOffset : index === days.length - 1 ? x - edgeOffset : x
            const anchor = index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'
            const date = formatChartDate(days[index]!.date)
            return (
              <g key={`${days[index]?.date}-${index}`}>
                {showHighLabel && (
                  <text x={labelX} y={highY} textAnchor={anchor} fontSize="13" fontWeight="700" fill={heatBandInk(range.high)}>
                    {range.high.toFixed(1)}°
                  </text>
                )}
                {showLowLabel && (
                  <text x={labelX} y={lowY} textAnchor={anchor} fontSize="13" fontWeight="600" fill={heatBandInk(range.low)}>
                    {range.low.toFixed(1)}°
                  </text>
                )}
                <circle cx={x} cy={yFor(range.high)} r="5" fill="rgb(var(--color-surface))" stroke={heatBandColor(range.high)} strokeWidth="3" tabIndex={0} aria-label={`${date}: high ${range.high.toFixed(1)} °C`}>
                  <title>{`${date}: high ${range.high.toFixed(1)} °C`}</title>
                </circle>
                <circle cx={x} cy={yFor(range.low)} r="5" fill="rgb(var(--color-surface))" stroke={heatBandColor(range.low)} strokeWidth="3" tabIndex={0} aria-label={`${date}: low ${range.low.toFixed(1)} °C`}>
                  <title>{`${date}: low ${range.low.toFixed(1)} °C`}</title>
                </circle>
              </g>
            )
          })}
          {days.map((day, index) => highAxisDateIndexes.has(index) ? (
            <text key={`${day.date}-label`} x={xFor(index)} y={height - 10} textAnchor="middle" fontSize="12" fill="rgb(var(--color-muted))">
              {formatChartAxisDate(day.date, compact)}
            </text>
          ) : null)}
        </svg>
      </div>
      <ul className="sr-only">
        {days.map((day, index) => (
          <li key={`${day.date}-${index}`}>
            {formatChartDate(day.date)}: high {validNumber(day.high) ? `${day.high.toFixed(1)} °C` : '—'}, low {validNumber(day.low) ? `${day.low.toFixed(1)} °C` : '—'}.
          </li>
        ))}
        <li>{name} threshold: {threshold} °C.</li>
      </ul>
      <p className="mt-2 text-sm leading-6 text-muted">{dateCaption}</p>
    </div>
  )
}
