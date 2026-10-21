import type { Station, WeatherState } from '../../types'
import { methods } from '../../data/methods'
import { getHeroPhotoCredits } from '../../lib/heroPhotoCredits'
import { ViewBanner } from '../ViewBanner'

interface MethodologyViewProps {
  selectedStation: Station
  currentTime?: string
  weatherState: WeatherState
}

export function MethodologyView({
  selectedStation,
  currentTime,
  weatherState,
}: MethodologyViewProps) {
  const photoCredits = getHeroPhotoCredits()

  return (
    <div className="space-y-6">
      <ViewBanner
        title="Methods & sources"
        description="Data sources, implemented calculations, and limitations."
        station={selectedStation}
        currentTime={currentTime}
        weatherState={weatherState}
      />

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="display-title font-semibold text-ink">Data sources</h3>
        <div className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
          <p>
            Current forecast data shown by the application is provided through the existing
            weather service. Forecast grid values are not direct observations at the named
            reference station.
          </p>
          <p>
            <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
              MET Norway Locationforecast
            </a>
            {' '}provides the current forecast feed and is credited under its{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
              Creative Commons Attribution 4.0 International licence
            </a>
            .
          </p>
          <p>
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
              Open-Meteo
            </a>
            {' '}is listed as a weather-data reference and attribution resource; its data is not
            substituted for the forecast feed described above.
          </p>
          <p>
            <a href="https://www.ecmwf.int/en/forecasts/dataset/ecmwf-reanalysis-v5" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
              ERA5
            </a>
            {' '}is the reanalysis reference for the planned 1991–2020 climatology comparison;
            HeatTrick does not currently calculate those normals. ERA5 is attributed to ECMWF
            and the Copernicus Climate Change Service.
          </p>
          <p>
            Daily forecast maxima and minima are grouped by India local date from available
            forecast steps. Missing values are not replaced with zero or estimated.
          </p>
          {photoCredits.length > 0 && (
            <p>Photo credits: {photoCredits.join('; ')}</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="display-title font-semibold text-ink">Methods</h3>
        <div className="mt-4 space-y-4">
          {methods.map((method) => (
            <article key={method.id} className="rounded-xl border border-border bg-surface-alt p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-ink">{method.name}</h4>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  method.status === 'planned'
                    ? 'bg-warning-soft text-warning-ink'
                    : 'bg-brand-soft text-brand-ink'
                }`}>
                  {method.status === 'planned' ? 'Planned' : 'Implemented'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{method.formula}</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Source: {method.source} Citation key: {method.citationKey}.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-accent/40 bg-warning-soft p-5 shadow-sm sm:p-6">
        <h3 className="display-title font-semibold text-warning-ink">Limitations</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-warning-ink">
          {methods.flatMap((method) =>
            method.limitations.map((limitation) => (
              <li key={`${method.id}-${limitation}`}>{limitation}</li>
            )),
          )}
          <li>Forecast-step daily extremes can understate the true peak; the first and last dates may be partial.</li>
          <li>WBGT, solar-radiation-based thermal stress, exposure, vulnerability, and health impacts are not calculated by this application.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="display-title font-semibold text-ink">What this is not</h3>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          HeatTrick provides research diagnostics only. It is not an official IMD or NDMA
          warning, advisory, forecast, or declaration and must not be used in place of their
          official communications.
        </p>
      </section>
    </div>
  )
}
