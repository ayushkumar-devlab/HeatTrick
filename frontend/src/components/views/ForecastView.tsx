import { RefreshCw } from 'lucide-react'
import type { Station, WeatherState } from '../../types'
import { RangeChart } from '../charts/RangeChart'
import type { ChartDay } from '../charts/types'
import { EmptyState } from '../EmptyState'
import { ViewBanner } from '../ViewBanner'

interface ForecastViewProps {
  selectedStation: Station
  weatherState: WeatherState
  onRefreshWeather: () => void
}

function formatValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(1)} °C`
    : '—'
}

function temperatureTone(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'text-muted'
  if (value < 25) return 'text-heat-cool-ink'
  if (value < 30) return 'text-heat-green-ink'
  if (value < 35) return 'text-heat-amber-ink'
  if (value < 40) return 'text-heat-orange-ink'
  return 'text-heat-red-ink'
}

function temperatureCardTone(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'border-t-border-strong bg-surface-alt'
  }
  if (value < 25) return 'border-t-heat-cool bg-heat-cool-soft'
  if (value < 30) return 'border-t-heat-green bg-heat-green-soft'
  if (value < 35) return 'border-t-heat-amber bg-heat-amber-soft'
  if (value < 40) return 'border-t-heat-orange bg-heat-orange-soft'
  return 'border-t-heat-red bg-heat-red-soft'
}

function formatLocalDate(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, date, 12))
  return {
    weekday: utcDate.toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'long' }),
    fullDate: utcDate.toLocaleDateString('en-IN', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }
}

export function ForecastView({
  selectedStation,
  weatherState,
  onRefreshWeather,
}: ForecastViewProps) {
  const daily = weatherState.data?.daily
  const days: ChartDay[] = (daily?.time ?? []).slice(0, 7).map((date, index) => ({
    date,
    high: daily?.temperature_2m_max[index],
    low: daily?.temperature_2m_min[index],
  }))
  const availableHighs = days.flatMap(({ date, high }) =>
    typeof high === 'number' && Number.isFinite(high) ? [{ date, high }] : [],
  )
  const coolest = availableHighs.reduce<typeof availableHighs[number] | null>(
    (minimum, day) => minimum == null || day.high < minimum.high ? day : minimum,
    null,
  )
  const warmest = availableHighs.reduce<typeof availableHighs[number] | null>(
    (maximum, day) => maximum == null || day.high > maximum.high ? day : maximum,
    null,
  )
  const summary = coolest && warmest
    ? `Highs range from ${coolest.high.toFixed(1)} °C on ${formatLocalDate(coolest.date).weekday} to ${warmest.high.toFixed(1)} °C on ${formatLocalDate(warmest.date).weekday} in this forecast.`
    : 'Forecast highs are unavailable.'

  return (
    <div className="space-y-6">
      <ViewBanner
        title="Forecast"
        description="Daily highs and lows grouped by India local date."
        station={selectedStation}
        currentTime={weatherState.data?.current.time}
        weatherState={weatherState}
      />
      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="display-title text-xl font-semibold leading-snug text-ink-soft sm:text-2xl">
              {summary}
            </h3>
          </div>
          <button
            type="button"
            onClick={onRefreshWeather}
            disabled={weatherState.isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-brand bg-brand px-3 py-2 text-sm font-medium text-forest-text hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${weatherState.isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {weatherState.isLoading ? 'Updating' : 'Refresh'}
          </button>
        </div>
      </section>

      {weatherState.error && (
        <p className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger" role="status">
          {weatherState.data
            ? 'The latest refresh failed. The previously loaded forecast is still shown.'
            : 'Weather data could not be loaded. Retry to try again.'}
        </p>
      )}

      {daily && daily.time.length > 0 ? (
        <>
          <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Daily high and low</h3>
            <div className="mt-3">
              <RangeChart
                days={days}
                terrain={selectedStation.imdCriteriaType}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Daily extremes come from discrete forecast steps (6-hourly later in the week), so they can understate the true peak; the first and last days can be partial.
            </p>
          </section>

          <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-label="Daily temperature forecast values">
            <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Daily values</h3>
            <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {days.map((day, index) => {
                const date = formatLocalDate(day.date)
                return (
                  <li key={day.date} className={`day-card rounded-panel border border-border border-t-4 p-4 shadow-sm ${temperatureCardTone(day.high)} ${index === 0 ? 'ring-1 ring-accent/40' : ''}`}>
                    <p className="font-medium text-ink">{date.weekday}</p>
                    <p className="mt-1 text-sm text-muted">{date.fullDate} (India local date)</p>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-soft">High</dt>
                        <dd className={`font-semibold ${temperatureTone(day.high)}`}>{formatValue(day.high)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-soft">Low</dt>
                        <dd className={`font-semibold ${temperatureTone(day.low)}`}>{formatValue(day.low)}</dd>
                      </div>
                    </dl>
                  </li>
                )
              })}
            </ol>
          </section>
        </>
      ) : weatherState.isLoading ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted shadow-sm" role="status">
          Loading forecast…
        </p>
      ) : !weatherState.error ? (
        <EmptyState
          icon={RefreshCw}
          title="No forecast available"
          description="There is no daily temperature forecast available."
        />
      ) : null}
    </div>
  )
}
