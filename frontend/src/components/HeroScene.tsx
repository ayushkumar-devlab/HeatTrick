import { useId } from 'react'
import type { Station } from '../types'

interface HeroSceneProps {
  zone: Station['zone']
  currentTime?: string
  variant?: 'overview' | 'banner'
}

const heroPhotos = import.meta.glob<string>(
  '../assets/hero/*.{webp,jpg,jpeg,png}',
  { eager: true, query: '?url', import: 'default' },
)
function photoKey(zone: Station['zone']) {
  if (zone === 'Northern Plains') return 'plains'
  if (zone === 'Central Plateau' || zone === 'Deccan Plateau') return 'plateau'
  if (zone === 'Eastern Delta & Coastal' || zone === 'Southern Coastal') return 'coastal'
  if (zone === 'Western Arid') return 'arid'
  return 'hills'
}

function selectedPhoto(zone: Station['zone']) {
  const desired = photoKey(zone)
  const entries = Object.entries(heroPhotos)
  const entryFor = (name: string) => entries.find(([path]) =>
    new RegExp(`/${name}\\.(webp|jpg|jpeg|png)$`, 'i').test(path),
  )?.[1]
  return entryFor(desired) ?? entryFor('default') ?? null
}

function localHour(timestamp?: string) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return null
  return Number(new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date))
}

export function HeroScene({ zone, currentTime, variant = 'overview' }: HeroSceneProps) {
  const id = useId().replaceAll(':', '')
  const photo = selectedPhoto(zone)
  const hour = localHour(currentTime)
  const isNight = hour != null && (hour >= 18 || hour < 6)

  return (
    <div className={`hero-scene hero-scene--${variant}`} aria-hidden="true">
      {photo ? (
        <>
          <img
            src={photo}
            alt=""
            width="1600"
            height="900"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span className="hero-scene__warm-overlay" />
        </>
      ) : (
        <svg viewBox="0 0 520 330" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--color-scene-sand))" stopOpacity=".64" />
              <stop offset="1" stopColor="rgb(var(--color-surface))" stopOpacity=".12" />
            </linearGradient>
            <linearGradient id={`${id}-hill`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgb(var(--color-scene-hill))" stopOpacity=".58" />
              <stop offset="1" stopColor="rgb(var(--color-scene-clay))" stopOpacity=".44" />
            </linearGradient>
          </defs>
          <rect width="520" height="330" fill={`url(#${id}-sky)`} />
          {isNight ? (
            <path d="M369 51a26 26 0 1 0 27 39 30 30 0 1 1-27-39Z" fill="rgb(var(--color-scene-sun))" opacity=".76" />
          ) : (
            <circle cx="385" cy="78" r="31" fill="rgb(var(--color-scene-sun))" opacity=".62" />
          )}
          <path d="M0 204c87-68 154-49 225 0s160 45 295-8v134H0Z" fill="rgb(var(--color-scene-sand))" opacity=".5" />
          <path d="M0 242c81-51 147-67 230-17s155 55 290 7v98H0Z" fill={`url(#${id}-hill)`} />
          <path d="M0 277c92-34 165-33 246-4s171 31 274-7v64H0Z" fill="rgb(var(--color-scene-green))" opacity=".5" />
          <g fill="rgb(var(--color-scene-forest))" opacity=".66">
            <path d="m93 264 16-40 16 40h-10v21h-12v-21Z" />
            <path d="m132 275 12-31 13 31h-8v17h-9v-17Z" />
            <path d="m430 253 18-45 18 45h-11v25h-14v-25Z" />
            <path d="m466 263 13-33 13 33h-8v19h-10v-19Z" />
          </g>
          <g fill="none" stroke="rgb(var(--color-scene-forest))" strokeLinecap="round" strokeWidth="2" opacity=".56">
            <path d="M294 101q9-9 18 0 9-9 18 0" />
            <path d="M337 121q6-6 12 0 6-6 12 0" />
          </g>
        </svg>
      )}
    </div>
  )
}
