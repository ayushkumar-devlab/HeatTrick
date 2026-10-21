import { useEffect, useState } from 'react'
import type { WeatherState } from '../types'
import {
  getWeatherDataFreshness,
  WEATHER_CACHE_TTL_MS,
} from '../services/weather'

export function WeatherProvenance({
  weatherState,
}: {
  weatherState: WeatherState
}) {
  const { data, error, lastFetched, isLoading } = weatherState
  const fetchedAtTimestamp = lastFetched ?? data?.metadata.retrieved_at ?? null
  const [, setFreshnessCheck] = useState(0)

  useEffect(() => {
    if (!fetchedAtTimestamp) return
    const fetchedAt = new Date(fetchedAtTimestamp).getTime()
    const timeout = window.setTimeout(
      () => setFreshnessCheck((check) => check + 1),
      Math.max(0, fetchedAt + WEATHER_CACHE_TTL_MS - Date.now()),
    )
    return () => window.clearTimeout(timeout)
  }, [fetchedAtTimestamp])

  if (!data) return null

  const showingEarlierData = Boolean(
    (fetchedAtTimestamp && getWeatherDataFreshness(fetchedAtTimestamp))
    || (isLoading && data)
    || (error && !isLoading),
  )
  return showingEarlierData ? (
    <p className="text-xs font-medium text-warning-ink" role="status">
      Showing earlier data
    </p>
  ) : null
}
