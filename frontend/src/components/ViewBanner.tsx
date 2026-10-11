import type { Station } from '../types'
import { HeroScene } from './HeroScene'

interface ViewBannerProps {
  title: string
  description: string
  station: Station
  currentTime?: string
}

export function ViewBanner({ title, description, station, currentTime }: ViewBannerProps) {
  return (
    <section className="view-banner relative isolate overflow-hidden rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <HeroScene zone={station.zone} currentTime={currentTime} variant="banner" />
      <div className="view-banner__copy relative z-10">
        <h2 className="display-title text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">{description}</p>
      </div>
    </section>
  )
}
