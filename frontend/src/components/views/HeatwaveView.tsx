import type { Station, WeatherState } from '../../types'
import { BandBar } from '../charts/BandBar'
import { TerrainThresholds } from '../charts/TerrainThresholds'
import type { TemperatureBand } from '../charts/types'
import { forecastPeak } from '../../lib/forecast'
import { heatwaveVerdict, terrainThreshold } from '../../lib/heatwave'

interface HeatwaveViewProps {
  selectedStation: Station
  weatherState: WeatherState
}

const ABSOLUTE_THRESHOLDS: Partial<Record<Station['imdCriteriaType'], number>> = {
  Plains: 45,
  Coastal: 40,
}

function comparisonBands(terrain: Station['imdCriteriaType']): TemperatureBand[] {
  const start = terrainThreshold(terrain)
  const absolute = ABSOLUTE_THRESHOLDS[terrain]
  if (absolute == null) {
    return [
      { from: 0, to: start, label: `Below ${start}°C`, color: 'rgb(var(--color-heat-cool))' },
      { from: start, to: 60, label: 'Departure needed', color: 'rgb(var(--color-heat-amber))' },
    ]
  }
  if (terrain === 'Plains') {
    return [
      { from: 0, to: start, label: 'Below line', color: 'rgb(var(--color-heat-cool))' },
      { from: start, to: absolute, label: 'Needs departure', color: 'rgb(var(--color-heat-amber))' },
      { from: absolute, to: 47, label: 'Absolute level', color: 'rgb(var(--color-heat-orange))' },
      { from: 47, to: 60, label: 'Severe level', color: 'rgb(var(--color-heat-red))' },
    ]
  }
  return [
    { from: 0, to: start, label: `Below ${start}°C`, color: 'rgb(var(--color-heat-cool))' },
    { from: start, to: absolute, label: 'Needs departure', color: 'rgb(var(--color-heat-amber))' },
    { from: absolute, to: 60, label: 'Absolute level', color: 'rgb(var(--color-heat-red))' },
  ]
}

export function HeatwaveView({ selectedStation, weatherState }: HeatwaveViewProps) {
  const daily = weatherState.data?.daily
  const peak = forecastPeak(daily?.temperature_2m_max)
  const threshold = terrainThreshold(selectedStation.imdCriteriaType)
  const verdict = heatwaveVerdict({
    forecastHigh: peak,
    terrain: selectedStation.imdCriteriaType,
  })

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
        <h2 className="display-title text-2xl font-semibold text-ink">Forecast threshold comparison</h2>
        {weatherState.isLoading && !weatherState.data ? (
          <p className="mt-3 text-sm text-muted" role="status">Loading weather data…</p>
        ) : weatherState.error && !weatherState.data ? (
          <p className="mt-3 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="status">
            Weather data could not be loaded. Retry from the header.
          </p>
        ) : (
          <>
            <p className="display-title mt-4 text-xl font-semibold leading-snug text-ink sm:text-2xl">
              {verdict.headline}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">{verdict.subline}</p>
            <p className="mt-4 rounded-lg bg-warning-soft p-3 text-sm leading-6 text-warning-ink">
              Departure from normal is not available, so this cannot establish an official IMD classification.
            </p>
          </>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Where the forecast high sits</h3>
        <p className="mt-1 text-sm text-muted">
          IMD starting line for {selectedStation.imdCriteriaType.toLowerCase()}: {threshold} °C
        </p>
        <div className="mt-3">
          <BandBar
            bands={comparisonBands(selectedStation.imdCriteriaType)}
            value={peak}
            unit="°C"
            ariaLabel={`Weekly forecast peak compared with ${selectedStation.imdCriteriaType.toLowerCase()} heatwave reference thresholds`}
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Severe criteria depend on temperature departure from normal; for plains, the IMD table also lists an absolute 47 °C severe level.
        </p>
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Starting lines by terrain</h3>
        <p className="mt-1 text-sm text-muted">The dashed marker is the highest available daily forecast high.</p>
        <div className="mt-3">
          <TerrainThresholds peak={peak} />
        </div>
      </section>

      <details className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <summary className="cursor-pointer font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2">
          Criteria
        </summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="p-3 font-medium">Terrain</th>
                <th className="p-3 font-medium">Base Tmax</th>
                <th className="p-3 font-medium">Heatwave departure</th>
                <th className="p-3 font-medium">Severe departure</th>
                <th className="p-3 font-medium">Absolute threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-ink-soft">
              <tr className={selectedStation.imdCriteriaType === 'Plains' ? 'bg-brand-soft text-brand-ink' : ''}>
                <th scope="row" className="p-3 font-medium">Plains</th>
                <td className="p-3">≥ 40°C</td>
                <td className="p-3">+4.5°C to +6.4°C</td>
                <td className="p-3">&gt; +6.4°C</td>
                <td className="p-3">≥ 45°C / ≥ 47°C</td>
              </tr>
              <tr className={selectedStation.imdCriteriaType === 'Coastal' ? 'bg-brand-soft text-brand-ink' : ''}>
                <th scope="row" className="p-3 font-medium">Coastal</th>
                <td className="p-3">≥ 37°C</td>
                <td className="p-3">≥ +4.5°C</td>
                <td className="p-3">&gt; +6.4°C</td>
                <td className="p-3">≥ 40°C</td>
              </tr>
              <tr className={selectedStation.imdCriteriaType === 'Hilly' ? 'bg-brand-soft text-brand-ink' : ''}>
                <th scope="row" className="p-3 font-medium">Hilly regions</th>
                <td className="p-3">≥ 30°C</td>
                <td className="p-3">+4.5°C to +6.4°C</td>
                <td className="p-3">&gt; +6.4°C</td>
                <td className="p-3">Departure required</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
