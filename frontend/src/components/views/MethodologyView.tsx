import { Database } from 'lucide-react'

export function MethodologyView() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-sm">
        <h2 className="display-title text-2xl font-semibold text-ink">Methods and sources</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-soft">
          HeatTrick provides forecast insights for selected coordinates; it is not an official{' '}
          <a href="https://mausam.imd.gov.in/" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">IMD</a>
          {' '}or{' '}
          <a href="https://ndma.gov.in/" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">NDMA</a>
          {' '}service.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
        <h3 className="display-title flex items-center gap-2 font-semibold text-ink"><Database className="h-5 w-5 text-brand" aria-hidden="true" />Weather data</h3>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          The application retrieves forecast data from MET Norway’s Locationforecast API for the
          selected latitude and longitude. The interface uses the returned 2-metre air temperature,
          relative humidity, 10-metre wind speed, and daily maximum/minimum temperatures where
          available. A model forecast at a grid point is not a direct observation at the named
          reference station.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Daily maximum and minimum values are grouped by the India local date. Missing values are shown as —;
          the interface does not substitute zero or estimate variables the response does not supply.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Forecast charts show daily high and low steps, compare the highest available daily high with the selected terrain’s IMD starting line, and place the estimated Heat Index against NOAA bands. Daily extremes come from discrete forecast steps, including 6-hourly steps later in the week, so they can understate the true peak; the first and last days can be partial.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          The backend caches successful responses using MET Norway’s expiration header when
          available, with a 10-minute fallback, and can revalidate cached data with the provider’s
          Last-Modified header.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Data source:{' '}
          <a
            href="https://api.met.no/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            MET Norway
          </a>
          . MET Norway data is made available under the{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            Creative Commons Attribution 4.0 International licence
          </a>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-accent/40 bg-warning-soft p-5 sm:p-6 shadow-sm">
        <h3 className="display-title font-semibold text-warning-ink">Calculations and limits</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-warning-ink">
          <li>The heat-index value is a client-side calculation from valid current forecast temperature and relative humidity using the U.S. National Weather Service simplified formula below 80°F and regression with adjustments at higher temperatures.</li>
          <li>Heatwave verdicts are basic forecast threshold comparisons, not an official IMD classification. IMD departure-from-normal criteria are not available to HeatTrick.</li>
          <li>Dew point is derived from forecast temperature and relative humidity using the Magnus–Tetens approximation; it is not supplied directly by the weather source.</li>
          <li>WBGT, solar-radiation-based thermal stress, population exposure, vulnerability, health impacts, and operational alerts are not calculated by this application.</li>
          <li>A combined Hazard × Exposure × Vulnerability assessment is a conceptual framework, not an implemented risk score.</li>
        </ul>
      </section>

    </div>
  )
}
