import type { WeatherResponse } from '../types'

/**
 * Service to fetch real meteorological observations and forecast from the backend API.
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  })

  const response = await fetch(`/api/weather?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    let errorDetail = `Server returned HTTP ${response.status} (${response.statusText})`
    try {
      const errJson = await response.json()
      if (errJson && typeof errJson.detail === 'string') {
        errorDetail = errJson.detail
      }
    } catch {
      // Fallback to HTTP status text
    }
    throw new Error(errorDetail)
  }

  return (await response.json()) as WeatherResponse
}

