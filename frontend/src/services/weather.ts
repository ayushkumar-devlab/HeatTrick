import type { WeatherResponse } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

/**
 * Fetch weather data and forecasts from the backend API.
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/weather?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );

  if (!response.ok) {
    let errorDetail = `Server returned HTTP ${response.status} (${response.statusText})`;

    try {
      const errJson = await response.json();
      if (errJson && typeof errJson.detail === "string") {
        errorDetail = errJson.detail;
      }
    } catch {
      // Keep the original HTTP error message.
    }

    throw new Error(errorDetail);
  }

  return (await response.json()) as WeatherResponse;
}
