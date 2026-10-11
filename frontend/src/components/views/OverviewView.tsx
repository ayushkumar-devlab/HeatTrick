import type { ActiveTab, Station, WeatherState } from '../../types'
import { DailyHighChart } from '../charts/DailyHighChart'
import { KeyValueList } from '../charts/KeyValueList'
import type { ChartDay } from '../charts/types'
import { dewPointFromTRh } from '../../lib/dewPoint'
import { forecastPeak } from '../../lib/forecast'
import { heatwaveVerdict, terrainThreshold } from '../../lib/heatwave'

interface OverviewViewProps {
  selectedStation: Station
  weatherState: WeatherState
  onRefreshWeather: () => void
  onNavigateToTab: (tab: ActiveTab) => void
}

const LOCATION_TIME_ZONE = 'Asia/Kolkata'

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
  const dewPoint = dewPointFromTRh(
    current?.temperature_2m,
    current?.relative_humidity_2m,
  )
  const rows = [
    { label: 'Air temperature', value: current?.temperature_2m, unit: '°C' },
    { label: 'Humidity', value: current?.relative_humidity_2m, unit: '%' },
    {
      label: 'Dew point (derived from temperature and humidity)',
      value: dewPoint,
      unit: '°C',
    },
    { label: 'Wind at 10 m', value: current?.wind_speed_10m, unit: 'm/s' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(17rem,0.8fr)]">
        <section className="rounded-card border border-border border-l-[6px] border-l-accent bg-surface p-5 shadow-card sm:p-7">
          <p className="text-sm font-medium text-muted">
            {selectedStation.name} · {selectedStation.zone} · {selectedStation.elevationM} m
          </p>
          <h2 className="display-title mt-3 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {verdict.headline}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">{verdict.subline}</p>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="display-title text-xl font-semibold text-ink">Daily forecast highs</h3>
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
                threshold={terrainThreshold(selectedStation.imdCriteriaType)}
                today={localDate(current?.time)}
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
          <p className="mt-2 text-sm text-muted">
            Daily extremes use discrete forecast steps (6-hourly later in the week), can understate the true peak, and the first and last local dates can be partial.
          </p>
        </section>

        <KeyValueList rows={rows} asOf={formatAsOf(current?.time)} />
      </div>

      {weatherState.error && weatherState.data && (
        <p className="rounded-lg border border-warning-soft bg-warning-soft p-3 text-sm text-warning-ink" role="status">
          The latest refresh failed; earlier forecast data is still displayed.
        </p>
      )}
    </div>
  )
}
