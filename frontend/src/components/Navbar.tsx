import { Leaf, RefreshCw } from 'lucide-react'
import type { ActiveTab, WeatherState } from '../types'
import { NavigationTabs } from './NavigationTabs'

interface NavbarProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
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

export function Navbar({ activeTab, onTabChange, weatherState, onRetry }: NavbarProps) {
  const { data, error, isLoading, lastFetched } = weatherState
  const status = isLoading
    ? 'Updating'
    : error && data
      ? `Earlier data · ${formatLastSuccess(lastFetched)}`
      : error
        ? 'Unavailable'
        : data
        ? `Live · updated ${formatLastSuccess(lastFetched)}`
          : 'Unavailable'
  const statusDot = error
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
      <div className="site-header__status flex items-center gap-2 min-w-0">
          <div className="min-w-0 text-xs text-forest-text" role="status" aria-live="polite">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
            <span>{status}</span>
          </div>
          {error && !isLoading && (
            <button
              onClick={onRetry}
              type="button"
              className="text-sm font-medium text-forest-text hover:text-accent-light underline underline-offset-2 shrink-0"
            >
              Retry
            </button>
          )}
          {isLoading && (
            <RefreshCw
              className="w-4 h-4 text-forest-text animate-spin shrink-0"
              aria-hidden="true"
            />
          )}
      </div>
      <NavigationTabs activeTab={activeTab} onTabChange={onTabChange} />
    </header>
  )
}
