import type { Station, WeatherState } from '../types'
import { HeroScene } from './HeroScene'
import { WeatherProvenance } from './WeatherProvenance'

interface ViewBannerProps {
  title: string
  description: string
  station: Station
  currentTime?: string
  weatherState?: WeatherState
}

export function ViewBanner({
  title,
  description,
  station,
  currentTime,
  weatherState,
}: ViewBannerProps) {
  return (
    <>
      <section className="view-banner relative isolate overflow-hidden rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <HeroScene zone={station.zone} currentTime={currentTime} variant="banner" />
        <div className="view-banner__copy relative z-10">
          <h2 className="display-title text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">{title}</h2>
          <p className="mt-2 text-base leading-7 text-ink-soft">{description}</p>
        </div>
      </section>
      {weatherState && (
        <WeatherProvenance weatherState={weatherState} />
      )}
    </>
  )
}
