import { useEffect, useState } from 'react'
import { Leaf, MapPin, RefreshCw } from 'lucide-react'
import type { ActiveTab, Station, WeatherState } from '../types'
import {
  getWeatherDataFreshness,
  WEATHER_CACHE_TTL_MS,
} from '../services/weather'
import { NavigationTabs } from './NavigationTabs'

interface NavbarProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  selectedStation: Station
  weatherState: WeatherState
  onRetry: () => void
}

function formatLastSuccess(lastFetched: string | null) {
  if (!lastFetched) return 'time unavailable'
  const time = new Date(lastFetched)
  if (Number.isNaN(time.getTime())) return 'time unavailable'
  return time.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function Navbar({
  activeTab,
  onTabChange,
  selectedStation,
  weatherState,
  onRetry,
}: NavbarProps) {
  const { data, error, isLoading, lastFetched } = weatherState
  const [, setFreshnessCheck] = useState(0)
  const isStale = getWeatherDataFreshness(lastFetched)

  useEffect(() => {
    if (!lastFetched) return
    const fetchedAt = new Date(lastFetched).getTime()
    const timeout = window.setTimeout(
      () => setFreshnessCheck((check) => check + 1),
      Math.max(0, fetchedAt + WEATHER_CACHE_TTL_MS - Date.now()),
    )
    return () => window.clearTimeout(timeout)
  }, [lastFetched])

  const status = isLoading
    ? data
      ? `Updating · earlier data · ${formatLastSuccess(lastFetched)}`
      : 'Updating'
    : error && data
      ? `Earlier data · ${formatLastSuccess(lastFetched)}`
      : error
        ? 'Unavailable'
        : data
        ? isStale
          ? `Earlier data · ${formatLastSuccess(lastFetched)}`
          : `Forecast · updated ${formatLastSuccess(lastFetched)}`
          : 'Unavailable'
  const statusDot = error || (isStale && data)
    ? data ? 'bg-status-amber' : 'bg-status-red'
    : isLoading ? 'bg-status-amber' : 'bg-status-green'

  return (
    <header className="site-header">
      <a href="/" className="site-header__brand flex min-w-0 items-center gap-2.5 text-forest-text">
        <Leaf className="h-7 w-7 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0">
          <span className="site-header__brand-title block truncate">HeatTrick</span>
          <span className="site-header__tagline">Heatwave &amp; Thermal Risk Insights</span>
        </span>
      </a>
      <div className="site-header__station" role="group" aria-label="Selected station information">
        <MapPin className="site-header__station-icon" aria-hidden="true" />
        <span className="site-header__station-name">{selectedStation.name}</span>
        <span className="site-header__station-detail" aria-label="Elevation">
          {selectedStation.elevationM} m elevation
        </span>
        <span className="site-header__station-detail site-header__station-coordinate" aria-label="Coordinates">
          {selectedStation.latitude.toFixed(4)}, {selectedStation.longitude.toFixed(4)}
        </span>
        <span className="site-header__station-region" aria-label="Region">
          Region: {selectedStation.zone}
        </span>
      </div>
      <div className="site-header__status flex min-w-0 items-center gap-2">
        <div className="min-w-0 text-xs text-forest-text" role="status" aria-live="polite">
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
          <span>{status}</span>
        </div>
        {error && !isLoading && (
          <button
            onClick={onRetry}
            type="button"
            className="shrink-0 text-sm font-medium text-forest-text underline underline-offset-2 hover:text-accent-light"
          >
            Retry
          </button>
        )}
        {isLoading && (
          <RefreshCw
            className="h-4 w-4 shrink-0 animate-spin text-forest-text"
            aria-hidden="true"
          />
        )}
      </div>
      <NavigationTabs activeTab={activeTab} onTabChange={onTabChange} />
    </header>
  )
}
