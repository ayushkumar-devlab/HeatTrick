import type { Station, WeatherState } from '../types'

interface StatusBannerProps {
  weatherState: WeatherState
  selectedStation: Station
}

const STARTING_THRESHOLDS: Record<Station['imdCriteriaType'], number> = {
  Plains: 40,
  Coastal: 37,
  Hilly: 30,
}

export function StatusBanner({ weatherState, selectedStation }: StatusBannerProps) {
  const dailyHighs = weatherState.data?.daily.temperature_2m_max ?? []
  const availableHighs = dailyHighs.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  )
  const forecastHigh = availableHighs.length > 0 ? Math.max(...availableHighs) : null
  const threshold = STARTING_THRESHOLDS[selectedStation.imdCriteriaType]

  let status: string
  if (!weatherState.data && weatherState.isLoading) {
    status = 'The weather service may take a little time to wake up; diagnostic status will appear with the forecast.'
  } else if (!weatherState.data && weatherState.error) {
    status = 'Forecast data could not be loaded; diagnostic status is unavailable.'
  } else if (forecastHigh == null) {
    status = 'Forecast daily highs are unavailable; no diagnostic comparison was made.'
  } else if (forecastHigh >= threshold) {
    status = `Forecast high ${forecastHigh.toFixed(1)} °C reaches the ${selectedStation.imdCriteriaType.toLowerCase()} starting threshold of ${threshold} °C; departure from normal is unavailable.`
  } else {
    status = `Forecast high ${forecastHigh.toFixed(1)} °C is below the ${selectedStation.imdCriteriaType.toLowerCase()} starting threshold of ${threshold} °C.`
  }

  return (
    <aside
      className="rounded-card border border-accent/40 bg-warning-soft p-4 text-warning-ink shadow-sm sm:px-5"
      aria-label="Research diagnostic status"
      role="status"
    >
      <p className="font-semibold">Diagnostic status</p>
      <p className="mt-1 text-sm leading-6">{status}</p>
      <p className="mt-2 text-xs font-semibold tracking-wide">
        Research diagnostic, not an official warning
      </p>
    </aside>
  )
}
