import type { WeatherState } from '../../types'
import { BandBar } from '../charts/BandBar'
import type { TemperatureBand } from '../charts/types'
import { dewPointFromTRh } from '../../lib/dewPoint'
import { calculateHeatIndexCelsius } from '../../utils/heatIndex'
import type { Station } from '../../types'
import { ViewBanner } from '../ViewBanner'

interface ThermalStressViewProps {
  weatherState: WeatherState
  selectedStation: Station
}

const NOAA_BANDS: TemperatureBand[] = [
  { from: 0, to: 26.7, label: 'Below caution', color: 'rgb(var(--color-heat-cool))' },
  { from: 26.7, to: 32.2, label: 'Caution', color: 'rgb(var(--color-heat-green))' },
  { from: 32.2, to: 39.4, label: 'Extreme caution', color: 'rgb(var(--color-heat-amber))' },
  { from: 39.4, to: 51.7, label: 'Danger', color: 'rgb(var(--color-heat-orange))' },
  { from: 51.7, to: 60, label: 'Extreme danger', color: 'rgb(var(--color-heat-red))' },
]

function heatIndexBand(value: number) {
  if (value < 26.7) return 'below the NOAA caution band'
  if (value < 32.2) return 'NOAA caution'
  if (value < 39.4) return 'NOAA extreme caution'
  if (value < 51.7) return 'NOAA danger'
  return 'NOAA extreme danger'
}

function formatValue(value: number | null | undefined, unit: string) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(1)} ${unit}`
    : '—'
}

export function ThermalStressView({ weatherState, selectedStation }: ThermalStressViewProps) {
  const current = weatherState.data?.current
  const temperature = current?.temperature_2m
  const humidity = current?.relative_humidity_2m
  const heatIndex = calculateHeatIndexCelsius(temperature, humidity)
  const dewPoint = dewPointFromTRh(temperature, humidity)

  return (
    <div className="space-y-6">
      <ViewBanner
        title="Thermal stress"
        description="Heat Index estimated from forecast air temperature and humidity."
        station={selectedStation}
        currentTime={current?.time}
      />
      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
        <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Heat index</h3>
        {weatherState.isLoading && !weatherState.data ? (
          <p className="mt-3 text-sm text-muted" role="status">Loading weather data…</p>
        ) : weatherState.error && !weatherState.data ? (
          <p className="mt-3 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="status">
            Weather data could not be loaded. Retry from the header.
          </p>
        ) : heatIndex == null ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-alt p-4 text-sm leading-6 text-ink-soft">
            Heat Index is not available because valid air temperature and relative humidity inputs are required.
          </p>
        ) : (
          <>
            <p className="display-title mt-4 text-2xl font-semibold text-ink sm:text-3xl">
              Heat Index is {heatIndex.toFixed(1)} °C: {heatIndexBand(heatIndex)}
            </p>
            <div className="mt-3">
              <BandBar
                bands={NOAA_BANDS}
                value={heatIndex}
                unit="°C"
                ariaLabel="Calculated heat index on NOAA heat index bands"
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              This is an estimate from forecast air temperature and humidity, not an observed value.
            </p>
          </>
        )}
        {weatherState.error && weatherState.data && (
          <p className="mt-4 rounded-lg border border-warning-soft bg-warning-soft p-3 text-sm text-warning-ink" role="status">
            The latest refresh failed; earlier forecast data is still displayed.
          </p>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Current inputs</h3>
        <dl className="mt-3 divide-y divide-border">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-sm text-ink-soft">Air temperature</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatValue(temperature, '°C')}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-sm text-ink-soft">Relative humidity</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatValue(humidity, '%')}</dd>
          </div>
          {dewPoint != null && (
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-sm text-ink-soft">Dew point (derived from temperature and humidity)</dt>
              <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatValue(dewPoint, '°C')}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-sm text-ink-soft">Wind at 10 m</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatValue(current?.wind_speed_10m, 'm/s')}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm leading-6 text-warning-ink">
          The National Weather Service uses a simplified formula below 80°F and the Rothfusz regression with adjustments at higher temperatures. It does not account for sun exposure, clothing, activity, or individual health.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Planned: WBGT needs solar radiation, which this weather source does not provide.
        </p>
      </section>
    </div>
  )
}
