import { useEffect, useState } from 'react'
import type { Station, WeatherState } from '../../types'
import { dewPointFromTRh } from '../../lib/dewPoint'
import { ViewBanner } from '../ViewBanner'

interface ThermalResultBase {
  inputs: { temp_c: number; rh: number }
  units: Record<string, string>
  method: string
  citation_keys: string[]
  limitations: string[]
}

interface ThermalApiValue extends ThermalResultBase {
  value_c: number
}

interface ThermalApiResponse {
  heat_index: ThermalApiValue & {
    value_f: number
    band: string
    method_used: string
    adjustment_applied: string | null
  }
  wet_bulb: ThermalApiValue & { out_of_range: boolean }
  wbgt: ThermalApiValue & { label: string }
}

type ThermalResponse = ThermalApiResponse

interface ThermalStressViewProps {
  weatherState: WeatherState
  selectedStation: Station
}

interface ValidationFailure {
  path: string
  received: unknown
}

type ThermalErrorKind = 'network' | 'input' | 'service' | 'response'

interface ThermalCalculationError {
  kind: ThermalErrorKind
  message: string
}

class ThermalRequestError extends Error {
  readonly kind: ThermalErrorKind

  constructor(
    kind: ThermalErrorKind,
    message: string,
  ) {
    super(message)
    this.kind = kind
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function validateThermalResultBase(value: unknown): value is ThermalResultBase {
  return isRecord(value)
    && isRecord(value.inputs)
    && isFiniteNumber(value.inputs.temp_c)
    && isFiniteNumber(value.inputs.rh)
    && isStringRecord(value.units)
    && typeof value.method === 'string'
    && Array.isArray(value.citation_keys)
    && value.citation_keys.every((key) => typeof key === 'string')
    && Array.isArray(value.limitations)
    && value.limitations.every((item) => typeof item === 'string')
}

function validateThermalResponse(
  value: unknown,
): { response: ThermalResponse } | { failure: ValidationFailure } {
  if (!isRecord(value)) return { failure: { path: '$', received: value } }

  const heatIndex = value.heat_index
  if (!isRecord(heatIndex)) {
    return { failure: { path: 'heat_index', received: heatIndex } }
  }
  if (!validateThermalResultBase(heatIndex)) {
    return { failure: { path: 'heat_index.inputs/method/units/limitations', received: heatIndex } }
  }
  if (!isFiniteNumber(heatIndex.value_c)) {
    return { failure: { path: 'heat_index.value_c', received: heatIndex.value_c } }
  }
  if (!isFiniteNumber(heatIndex.value_f)) {
    return { failure: { path: 'heat_index.value_f', received: heatIndex.value_f } }
  }
  if (typeof heatIndex.band !== 'string') {
    return { failure: { path: 'heat_index.band', received: heatIndex.band } }
  }
  if (typeof heatIndex.method !== 'string') {
    return { failure: { path: 'heat_index.method', received: heatIndex.method } }
  }
  if (typeof heatIndex.method_used !== 'string') {
    return { failure: { path: 'heat_index.method_used', received: heatIndex.method_used } }
  }
  if (
    heatIndex.adjustment_applied !== null
    && typeof heatIndex.adjustment_applied !== 'string'
  ) {
    return {
      failure: {
        path: 'heat_index.adjustment_applied',
        received: heatIndex.adjustment_applied,
      },
    }
  }

  const wetBulb = value.wet_bulb
  if (!isRecord(wetBulb)) {
    return { failure: { path: 'wet_bulb', received: wetBulb } }
  }
  if (!validateThermalResultBase(wetBulb)) {
    return { failure: { path: 'wet_bulb.inputs/method/units/limitations', received: wetBulb } }
  }
  if (!isFiniteNumber(wetBulb.value_c)) {
    return { failure: { path: 'wet_bulb.value_c', received: wetBulb.value_c } }
  }
  if (typeof wetBulb.method !== 'string') {
    return { failure: { path: 'wet_bulb.method', received: wetBulb.method } }
  }
  if (typeof wetBulb.out_of_range !== 'boolean') {
    return {
      failure: { path: 'wet_bulb.out_of_range', received: wetBulb.out_of_range },
    }
  }

  const wbgt = value.wbgt
  if (!isRecord(wbgt)) return { failure: { path: 'wbgt', received: wbgt } }
  if (!validateThermalResultBase(wbgt)) {
    return { failure: { path: 'wbgt.inputs/method/units/limitations', received: wbgt } }
  }
  if (!isFiniteNumber(wbgt.value_c)) {
    return { failure: { path: 'wbgt.value_c', received: wbgt.value_c } }
  }
  if (typeof wbgt.method !== 'string') {
    return { failure: { path: 'wbgt.method', received: wbgt.method } }
  }
  if (typeof wbgt.label !== 'string') {
    return { failure: { path: 'wbgt.label', received: wbgt.label } }
  }

  return {
    response: {
      heat_index: {
        inputs: heatIndex.inputs,
        units: heatIndex.units,
        method: heatIndex.method,
        citation_keys: heatIndex.citation_keys,
        limitations: heatIndex.limitations,
        value_c: heatIndex.value_c,
        value_f: heatIndex.value_f,
        band: heatIndex.band,
        method_used: heatIndex.method_used,
        adjustment_applied: heatIndex.adjustment_applied,
      },
      wet_bulb: {
        inputs: wetBulb.inputs,
        units: wetBulb.units,
        method: wetBulb.method,
        citation_keys: wetBulb.citation_keys,
        limitations: wetBulb.limitations,
        value_c: wetBulb.value_c,
        out_of_range: wetBulb.out_of_range,
      },
      wbgt: {
        inputs: wbgt.inputs,
        units: wbgt.units,
        method: wbgt.method,
        citation_keys: wbgt.citation_keys,
        limitations: wbgt.limitations,
        value_c: wbgt.value_c,
        label: wbgt.label,
      },
    },
  }
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
  const inputsAvailable = (
    typeof temperature === 'number'
    && Number.isFinite(temperature)
    && typeof humidity === 'number'
    && Number.isFinite(humidity)
  )
  const dewPoint = dewPointFromTRh(temperature, humidity)
  const [result, setResult] = useState<ThermalResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState<ThermalCalculationError | null>(null)

  useEffect(() => {
    if (!inputsAvailable || temperature == null || humidity == null) {
      setResult(null)
      setCalculationError(null)
      setIsCalculating(false)
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      temp_c: String(temperature),
      rh: String(humidity),
    })
    setResult(null)
    setCalculationError(null)
    setIsCalculating(true)

    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
    void fetch(`${apiBaseUrl}/api/thermal?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        let payload: unknown
        try {
          payload = await response.json()
        } catch {
          throw new ThermalRequestError(
            'response',
            'The calculation service returned an unreadable response.',
          )
        }
        if (!response.ok) {
          const detail = (
            typeof payload === 'object'
            && payload !== null
            && 'detail' in payload
            && typeof payload.detail === 'string'
          ) ? payload.detail : `The calculation service returned HTTP ${response.status}.`
          throw new ThermalRequestError(
            response.status === 422 ? 'input' : 'service',
            response.status === 422
              ? `Calculation inputs were rejected: ${detail}`
              : `Thermal calculation service failed: ${detail}`,
          )
        }
        const validation = validateThermalResponse(payload)
        if ('failure' in validation) {
          console.error(
            `Invalid thermal response field ${validation.failure.path}; received:`,
            validation.failure.received,
          )
          throw new ThermalRequestError(
            'response',
            'The calculation service returned an incomplete or invalid result.',
          )
        }
        if (controller.signal.aborted) return
        setResult(validation.response)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ThermalRequestError) {
          setCalculationError({ kind: error.kind, message: error.message })
        } else if (error instanceof TypeError) {
          setCalculationError({
            kind: 'network',
            message: 'Could not connect to the thermal calculation service. Check the connection and try again.',
          })
        } else {
          setCalculationError({
            kind: 'service',
            message: error instanceof Error
              ? error.message
              : 'Thermal calculations could not be completed.',
          })
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsCalculating(false)
      })

    return () => controller.abort()
  }, [humidity, inputsAvailable, temperature])

  return (
    <div className="space-y-6">
      <ViewBanner
        title="Thermal stress"
        description="Thermal estimates calculated by the backend from the latest forecast temperature and humidity."
        station={selectedStation}
        currentTime={current?.time}
        weatherState={weatherState}
      />

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
        <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Thermal calculations</h3>
        {weatherState.isLoading && !weatherState.data ? (
          <p className="mt-3 text-sm text-muted" role="status">Loading weather data…</p>
        ) : weatherState.error && !weatherState.data ? (
          <p className="mt-3 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">
            Weather data could not be loaded. Retry from the header.
          </p>
        ) : !inputsAvailable ? (
          <p className="mt-3 rounded-lg border border-border bg-surface-alt p-4 text-sm leading-6 text-ink-soft" role="status">
            Inputs unavailable: this forecast does not include finite air temperature and relative humidity values, so thermal estimates cannot be calculated.
          </p>
        ) : isCalculating ? (
          <p className="mt-3 text-sm text-muted" role="status">Calculating thermal indices…</p>
        ) : calculationError ? (
          <p className="mt-3 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">
            <span className="font-semibold">
              {calculationError.kind === 'network'
                ? 'Network error: '
                : calculationError.kind === 'input'
                  ? 'Input error: '
                  : calculationError.kind === 'response'
                    ? 'Invalid response: '
                    : 'Calculation error: '}
            </span>
            {calculationError.message}
          </p>
        ) : result ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl border border-border bg-surface-alt p-4">
              <h4 className="font-semibold text-ink">Heat Index estimate</h4>
              <p className="display-title mt-2 text-2xl font-semibold text-ink">
                {formatValue(result.heat_index.value_c, '°C')}
              </p>
              <p className="text-sm text-ink-soft">
                {formatValue(result.heat_index.value_f, '°F')} · Heat-index band: {result.heat_index.band}
              </p>
              <p className="mt-2 text-xs text-muted">
                {result.heat_index.method_used} · {result.heat_index.method}
              </p>
              {result.heat_index.adjustment_applied && (
                <p className="mt-1 text-xs text-muted">{result.heat_index.adjustment_applied}</p>
              )}
            </article>
            <article className="rounded-xl border border-border bg-surface-alt p-4">
              <h4 className="font-semibold text-ink">Wet-Bulb Temperature estimate</h4>
              <p className="display-title mt-2 text-2xl font-semibold text-ink">
                {formatValue(result.wet_bulb.value_c, '°C')}
              </p>
              <p className="mt-2 text-xs text-muted">{result.wet_bulb.method}</p>
              {result.wet_bulb.out_of_range && (
                <p className="mt-2 text-sm text-warning-ink">Input is outside the recommended formula range.</p>
              )}
            </article>
            <article className="rounded-xl border border-border bg-surface-alt p-4">
              <h4 className="font-semibold text-ink">WBGT estimate</h4>
              <p className="display-title mt-2 text-2xl font-semibold text-ink">
                {formatValue(result.wbgt.value_c, '°C')}
              </p>
              <p className="mt-2 text-sm text-warning-ink">{result.wbgt.label}</p>
              <p className="mt-1 text-xs text-muted">{result.wbgt.method}</p>
            </article>
          </div>
        ) : null}
        {result && (
          <>
            <p className="mt-4 rounded-lg border border-warning-soft bg-warning-soft p-3 text-sm leading-6 text-warning-ink">
              WBGT is estimated under simplified shade/no-radiation assumptions; it is not a direct measurement.
            </p>
            <details className="mt-4 rounded-lg border border-border bg-surface-alt p-4">
              <summary className="cursor-pointer font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2">
                How is this calculated?
              </summary>
              <div className="mt-3 space-y-4 text-sm leading-6 text-ink-soft">
                {([
                  ['Heat Index estimate', result.heat_index],
                  ['Wet-Bulb Temperature estimate', result.wet_bulb],
                  ['WBGT estimate', result.wbgt],
                ] as const).map(([title, metric]) => (
                  <div key={title}>
                    <h4 className="font-semibold text-ink">{title}: {metric.method}</h4>
                    <p>Citation key: {metric.citation_keys.join(', ') || 'Not provided'}</p>
                    {metric.limitations.length > 0 && (
                      <ul className="mt-1 list-disc pl-5">
                        {metric.limitations.map((limitation) => (
                          <li key={limitation}>{limitation}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
        {weatherState.error && weatherState.data && (
          <p className="mt-4 rounded-lg border border-warning-soft bg-warning-soft p-3 text-sm text-warning-ink" role="status">
            The latest weather refresh failed; calculations use the earlier forecast data.
          </p>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h3 className="display-title text-xl font-semibold text-ink sm:text-2xl">Inputs used for estimates</h3>
        <p className="mt-1 text-sm text-muted">Values are from the forecast shown above; they are not station observations.</p>
        <dl className="mt-3 divide-y divide-border">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-sm text-ink-soft">Air temperature</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">
              {formatValue(result?.heat_index.inputs.temp_c ?? temperature, '°C')}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-sm text-ink-soft">Relative humidity</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">
              {formatValue(result?.heat_index.inputs.rh ?? humidity, '%')}
            </dd>
          </div>
          {dewPoint != null && (
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-sm text-ink-soft">Dew point (derived)</dt>
              <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatValue(dewPoint, '°C')}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-sm text-ink-soft">Wind at 10 m</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatValue(current?.wind_speed_10m, 'm/s')}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
