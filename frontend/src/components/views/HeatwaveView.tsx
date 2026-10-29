import { useEffect, useState } from 'react'
import type { Station, WeatherState } from '../../types'
import { BandBar } from '../charts/BandBar'
import { TerrainThresholds } from '../charts/TerrainThresholds'
import type { TemperatureBand } from '../charts/types'
import { forecastPeak } from '../../lib/forecast'
import { terrainThreshold } from '../../lib/heatwave'
import { ViewBanner } from '../ViewBanner'

interface HeatwaveViewProps {
  selectedStation: Station
  weatherState: WeatherState
}

const ABSOLUTE_THRESHOLDS: Partial<Record<Station['imdCriteriaType'], number>> = {
  Plains: 45,
  Coastal: 40,
}

type HeatwaveCategory = 'no_heatwave' | 'heatwave' | 'severe_heatwave'

interface DiagnoseDay {
  date: string
  tmax: number
  normal: number
  departure: number
  category: HeatwaveCategory
  criterion: string[]
}

interface QualifyingPeriod {
  start: string
  end: string
  category: string
  days: number
}

interface HeatwaveDiagnosis {
  days: DiagnoseDay[]
  result: {
    flagged: boolean
    qualifying_periods: QualifyingPeriod[]
  }
}

const CRITERION_LABELS: Record<string, string> = {
  'departure_above_6.4_c': 'Maximum temperature is more than 6.4 °C above normal',
  'departure_4.5_to_6.4_c': 'Maximum temperature is 4.5–6.4 °C above normal',
  plains_tmax_at_least_45_c: 'Plains maximum temperature is at least 45 °C',
  plains_tmax_at_least_47_c: 'Plains maximum temperature is at least 47 °C',
}

const CATEGORY_LABELS: Record<HeatwaveCategory, string> = {
  no_heatwave: 'No heatwave criteria',
  heatwave: 'Heatwave',
  severe_heatwave: 'Severe heatwave',
}

function isForecastDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCategory(value: unknown): value is HeatwaveCategory {
  return value === 'no_heatwave' || value === 'heatwave' || value === 'severe_heatwave'
}

function validateDiagnosis(value: unknown): HeatwaveDiagnosis | null {
  if (!isRecord(value) || !Array.isArray(value.days) || !isRecord(value.result)) return null
  const days: DiagnoseDay[] = []
  for (const item of value.days) {
    if (
      !isRecord(item)
      || typeof item.date !== 'string'
      || !isForecastDate(item.date)
      || typeof item.tmax !== 'number'
      || !Number.isFinite(item.tmax)
      || typeof item.normal !== 'number'
      || !Number.isFinite(item.normal)
      || typeof item.departure !== 'number'
      || !Number.isFinite(item.departure)
      || !isCategory(item.category)
      || !Array.isArray(item.criterion)
      || !item.criterion.every((criterion) => typeof criterion === 'string')
    ) return null
    days.push({
      date: item.date,
      tmax: item.tmax,
      normal: item.normal,
      departure: item.departure,
      category: item.category,
      criterion: item.criterion,
    })
  }
  const flagged = value.result.flagged
  const qualifyingPeriods = value.result.qualifying_periods
  if (typeof flagged !== 'boolean' || !Array.isArray(qualifyingPeriods)) return null

  const periods: QualifyingPeriod[] = []
  for (const item of qualifyingPeriods) {
    if (
      !isRecord(item)
      || typeof item.start !== 'string'
      || typeof item.end !== 'string'
      || typeof item.category !== 'string'
      || typeof item.days !== 'number'
      || !Number.isFinite(item.days)
    ) return null
    periods.push({
      start: item.start,
      end: item.end,
      category: item.category,
      days: item.days,
    })
  }
  return { days, result: { flagged, qualifying_periods: periods } }
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
  const forecastDays = (daily?.time ?? []).map((date, index) => {
    const tmax = daily?.temperature_2m_max[index]
    return {
      date,
      tmax: typeof tmax === 'number' && Number.isFinite(tmax) ? tmax : null,
    }
  })
  const diagnosisDays = forecastDays.flatMap(({ date, tmax }) =>
    isForecastDate(date) && tmax != null ? [{ date, tmax_c: tmax }] : [],
  )
  const requestBody = JSON.stringify({
    station_id: selectedStation.id,
    days: diagnosisDays,
  })
  const [diagnosis, setDiagnosis] = useState<HeatwaveDiagnosis | null>(null)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null)
  const diagnosisByDate = new Map(
    (diagnosis?.days ?? []).map((day) => [day.date, day]),
  )
  const thresholdDays = (diagnosis?.days ?? []).filter(
    (day) => day.category !== 'no_heatwave',
  )
  const hasCompleteDiagnosis = forecastDays.length > 0
    && forecastDays.every(({ date, tmax }) =>
      isForecastDate(date) && tmax != null && diagnosisByDate.has(date),
    )

  useEffect(() => {
    if (!weatherState.data || diagnosisDays.length === 0) {
      setDiagnosis(null)
      setDiagnosisError(null)
      setDiagnosisLoading(false)
      return
    }

    const controller = new AbortController()
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
    setDiagnosis(null)
    setDiagnosisError(null)
    setDiagnosisLoading(true)

    void fetch(`${apiBaseUrl}/api/heatwave/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json()
        if (!response.ok) {
          const detail = isRecord(payload) && typeof payload.detail === 'string'
            ? payload.detail
            : `Heatwave diagnosis failed (HTTP ${response.status}).`
          throw new Error(detail)
        }
        const validated = validateDiagnosis(payload)
        if (!validated) throw new Error('The heatwave diagnosis response was invalid.')
        setDiagnosis(validated)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDiagnosisError(
          error instanceof Error ? error.message : 'Heatwave diagnosis is unavailable.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setDiagnosisLoading(false)
      })

    return () => controller.abort()
  }, [diagnosisDays.length, requestBody, weatherState.data])

  return (
    <div className="space-y-6">
      <ViewBanner
        title="Heatwave analysis"
        description="Model-diagnostic comparisons against IMD temperature thresholds; not an official warning."
        station={selectedStation}
        currentTime={weatherState.data?.current.time}
        weatherState={weatherState}
      />
      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
        <h3 className="display-title text-[1.375rem] font-semibold text-ink sm:text-[1.625rem]">Forecast threshold comparison</h3>
        {weatherState.isLoading && !weatherState.data ? (
          <p className="mt-3 text-sm text-muted" role="status">Loading weather data…</p>
        ) : weatherState.error && !weatherState.data ? (
          <p className="mt-3 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="status">
            Weather data could not be loaded. Retry from the header.
          </p>
        ) : diagnosisLoading ? (
          <p className="mt-3 text-sm text-muted" role="status">Checking forecast days against climatological normals…</p>
        ) : (
          <div className="mt-4 space-y-4">
            {diagnosisError ? (
              <p className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">
                Forecast classifications could not be calculated: {diagnosisError}
              </p>
            ) : diagnosis?.result.flagged ? (
              <div className="rounded-lg border border-accent/40 bg-warning-soft p-3 text-base leading-7 text-warning-ink">
                IMD temperature thresholds met across a qualifying consecutive period in this diagnostic forecast window.
                {diagnosis.result.qualifying_periods.map((period) => (
                  <p key={`${period.start}-${period.end}`} className="mt-1">
                    {period.category.replaceAll('_', ' ')}: {period.start} to {period.end} ({period.days} days)
                  </p>
                ))}
                {!hasCompleteDiagnosis && (
                  <p className="mt-1">
                    Some forecast dates could not be assessed; other dates may have additional threshold results.
                  </p>
                )}
              </div>
            ) : diagnosis && thresholdDays.length > 0 ? (
              <div className="rounded-lg border border-accent/40 bg-warning-soft p-3 text-base leading-7 text-warning-ink">
                IMD temperature thresholds met on one or more forecast days, but no qualifying consecutive period was identified.
                {thresholdDays.map((day) => (
                  <p key={day.date} className="mt-1">
                    {day.date}: {CATEGORY_LABELS[day.category]}
                  </p>
                ))}
                {!hasCompleteDiagnosis && (
                  <p className="mt-1">
                    Some forecast dates could not be assessed; other dates may have additional threshold results.
                  </p>
                )}
              </div>
            ) : diagnosis && hasCompleteDiagnosis ? (
              <p className="rounded-lg border border-border bg-surface-alt p-3 text-base leading-7 text-ink-soft" role="status">
                No IMD temperature thresholds met in the forecast window.
              </p>
            ) : (
              <p className="rounded-lg border border-border bg-surface-alt p-3 text-base leading-7 text-ink-soft" role="status">
                Insufficient data to assess every forecast day; no conclusion can be drawn for the full window.
              </p>
            )}
            <p className="text-base leading-7 text-ink-soft">
              Based on the available forecast maximum temperatures and climatological normals. This is a model diagnostic, not an official IMD warning.
            </p>
            <p className="text-base leading-7 text-warning-ink">
              Heat-related health risks may still occur when official heatwave thresholds are not met.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left text-base">
                <caption className="sr-only">Forecast daily maximum temperature comparison with terrain thresholds and climatological normals</caption>
                <thead className="bg-surface-alt">
                  <tr className="border-b border-border text-muted">
                    <th scope="col" className="p-3 font-medium">Date</th>
                    <th scope="col" className="p-3 font-medium">Forecast maximum</th>
                    <th scope="col" className="p-3 font-medium">Tmax threshold</th>
                    <th scope="col" className="p-3 font-medium">Normal</th>
                    <th scope="col" className="p-3 font-medium">Departure</th>
                    <th scope="col" className="p-3 font-medium">Classification / status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink-soft">
                  {forecastDays.map(({ date, tmax }) => {
                    const day = diagnosisByDate.get(date)
                    const status = day && tmax != null
                      ? day.category === 'no_heatwave' ? 'Threshold not met' : 'Threshold met'
                      : 'Insufficient data'
                    return (
                    <tr key={date} className="odd:bg-surface even:bg-surface-alt/50">
                      <th scope="row" className="whitespace-nowrap p-3 font-medium tabular-nums text-ink">{date}</th>
                      <td className="whitespace-nowrap p-3 tabular-nums">{tmax == null ? '—' : `${tmax.toFixed(1)} °C`}</td>
                      <td className="whitespace-nowrap p-3 tabular-nums">
                        ≥ {threshold} °C
                        <span className="block text-xs text-muted">
                          Departure: ≥ +4.5 °C; severe: &gt; +6.4 °C
                        </span>
                        {ABSOLUTE_THRESHOLDS[selectedStation.imdCriteriaType] != null && (
                          <span className="block text-xs text-muted">
                            Absolute: ≥ {ABSOLUTE_THRESHOLDS[selectedStation.imdCriteriaType]} °C
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3 tabular-nums">{day ? `${day.normal.toFixed(1)} °C` : '—'}</td>
                      <td className="whitespace-nowrap p-3 tabular-nums">{day ? `${day.departure.toFixed(1)} °C` : '—'}</td>
                      <td className="p-3">
                        <span className="font-medium text-ink">{day ? CATEGORY_LABELS[day.category] : 'Not assessed'}</span>
                        <span className="mt-1 block text-sm">{status}</span>
                        {day && day.criterion.length > 0 && (
                          <ul className="mt-1 list-disc pl-5 text-xs leading-5">
                            {day.criterion.map((criterion) => (
                              <li key={criterion}>{CRITERION_LABELS[criterion] ?? criterion}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                  {forecastDays.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-ink-soft">
                        Insufficient data: no forecast dates and maximum temperatures are available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h3 className="display-title text-[1.375rem] font-semibold text-ink sm:text-[1.625rem]">Where the forecast high sits</h3>
        <p className="mt-1 text-base leading-7 text-muted">
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
        <p className="mt-2 text-base leading-7 text-ink-soft">
          Severe criteria depend on temperature departure from normal; for plains, the IMD table also lists an absolute 47 °C severe level.
        </p>
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h3 className="display-title text-[1.375rem] font-semibold text-ink sm:text-[1.625rem]">Starting lines by terrain</h3>
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
          <table className="w-full min-w-[42rem] border-collapse text-left text-base">
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
