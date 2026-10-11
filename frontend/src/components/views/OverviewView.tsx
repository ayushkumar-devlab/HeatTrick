import { CalendarDays, Clock3 } from 'lucide-react'
import type { ActiveTab, Station, WeatherState } from '../../types'
import { DailyHighChart } from '../charts/DailyHighChart'
import { KeyValueList } from '../charts/KeyValueList'
import type { ChartDay } from '../charts/types'
import { HeroScene } from '../HeroScene'
import { dewPointFromTRh } from '../../lib/dewPoint'
import { forecastPeak } from '../../lib/forecast'
import { heatwaveVerdict } from '../../lib/heatwave'
import { formatChartDate } from '../../lib/chartLabels'
import { heatBandInk } from '../../lib/temperatureBands'
import { calculateHeatIndexCelsius } from '../../utils/heatIndex'

interface OverviewViewProps {
  selectedStation: Station
  weatherState: WeatherState
  onRefreshWeather: () => void
  onNavigateToTab: (tab: ActiveTab) => void
}

const LOCATION_TIME_ZONE = 'Asia/Kolkata'

function localDate(timestamp: string | undefined) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: LOCATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')
  return year && month && day ? `${year}-${month}-${day}` : null
}

function formatAsOf(timestamp: string | undefined) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('en-IN', {
    timeZone: LOCATION_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

function formatValue(value: number | null | undefined, unit: string) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(1)} ${unit}`
    : '—'
}

export function OverviewView({
  selectedStation,
  weatherState,
  onRefreshWeather,
  onNavigateToTab,
}: OverviewViewProps) {
  const current = weatherState.data?.current
  const daily = weatherState.data?.daily
  const days: ChartDay[] = (daily?.time ?? []).slice(0, 7).map((date, index) => ({
    date,
    high: daily?.temperature_2m_max[index],
  }))
  const peak = forecastPeak(days.map(({ high }) => high))
  const verdict = heatwaveVerdict({
    forecastHigh: peak,
    terrain: selectedStation.imdCriteriaType,
  })
  const today = localDate(current?.time)
  const todayIndex = today ? daily?.time.indexOf(today) ?? -1 : -1
  const todayHigh = todayIndex >= 0 ? daily?.temperature_2m_max[todayIndex] : null
  const todayLow = todayIndex >= 0 ? daily?.temperature_2m_min[todayIndex] : null
  const temperature = current?.temperature_2m
  const dewPoint = dewPointFromTRh(temperature, current?.relative_humidity_2m)
  const heatIndex = calculateHeatIndexCelsius(temperature, current?.relative_humidity_2m)
  const rows = [
    { label: 'Humidity', value: current?.relative_humidity_2m, unit: '%' },
    {
      label: 'Dew point (derived from temperature and humidity)',
      value: dewPoint,
      unit: '°C',
    },
    { label: 'Wind at 10 m', value: current?.wind_speed_10m, unit: 'm/s' },
    { label: 'Heat Index (estimated)', value: heatIndex, unit: '°C' },
  ]

  return (
    <div className="space-y-6">
      <section className="overview-hero rounded-card border border-border p-5 shadow-card sm:p-7">
        <HeroScene
          zone={selectedStation.zone}
          currentTime={current?.time}
          variant="overview"
        />
        <div className="overview-hero__copy">
          <h2 className="display-title text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {verdict.headline}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            This is a basic threshold comparison, not an official IMD classification.
          </p>
          {verdict.subline !== 'This is a basic threshold comparison, not an official IMD classification.' && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">{verdict.subline}</p>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] sm:items-end">
            <div>
              <p className="text-sm font-medium text-ink-soft">Air temperature</p>
              <p
                className="display-title mt-1 text-6xl font-semibold leading-none tracking-tight tabular-nums sm:text-7xl"
                style={{
                  color: typeof temperature === 'number' && Number.isFinite(temperature)
                    ? heatBandInk(temperature)
                    : 'rgb(var(--color-muted))',
                }}
              >
                {formatValue(temperature, '°C')}
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                As of {formatAsOf(current?.time) ?? '—'}
              </p>
            </div>
            <div className="border-t border-border/80 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Today&apos;s high / low
              </p>
              <p className="mt-2 text-sm text-muted">{today ? formatChartDate(today) : '—'}</p>
              <p className="mt-1 font-semibold tabular-nums text-ink">
                <span className="text-heat-orange-ink">High {formatValue(todayHigh, '°C')}</span>
                <span className="mx-2 text-border-strong" aria-hidden="true">·</span>
                <span className="text-heat-cool-ink">Low {formatValue(todayLow, '°C')}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Daily forecast highs</h3>
            <button
              type="button"
              onClick={() => onNavigateToTab('forecast')}
              className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
            >
              Full forecast
            </button>
          </div>
          {days.length ? (
            <div className="mt-3">
              <DailyHighChart
                days={days}
                terrain={selectedStation.imdCriteriaType}
                today={today}
              />
            </div>
          ) : weatherState.isLoading ? (
            <p className="mt-4 text-sm text-muted" role="status">Loading forecast…</p>
          ) : weatherState.error ? (
            <p className="mt-4 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="status">
              Weather data is unavailable. Use Retry in the header to try again.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>Daily forecast highs are unavailable.</span>
              <button
                type="button"
                onClick={onRefreshWeather}
                className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
              >
                Load data
              </button>
            </div>
          )}
        </section>

        <KeyValueList rows={rows} title="Right now" />
      </div>

      {weatherState.error && weatherState.data && (
        <p className="rounded-lg border border-warning-soft bg-warning-soft p-3 text-sm text-warning-ink" role="status">
          The latest refresh failed; earlier forecast data is still displayed.
        </p>
      )}
    </div>
  )
}
