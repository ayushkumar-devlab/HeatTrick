import type { WeatherResponse } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);
export const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_KEY_PREFIX = "heat-trick:weather:";
const REQUEST_TIMEOUT_MS = 90 * 1000;

interface CachedWeatherData {
  data: WeatherResponse;
  fetchedAt: string;
}

const responseCache = new Map<string, CachedWeatherData>();
const pendingRequests = new Map<string, Promise<WeatherResponse>>();

function cacheKey(latitude: number, longitude: number) {
  return `${latitude},${longitude}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWeatherResponse(value: unknown): value is WeatherResponse {
  if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.daily)) {
    return false;
  }
  if (!isRecord(value.metadata) || !isRecord(value.units)) return false;

  const current = value.current;
  const daily = value.daily;
  return typeof current.time === "string"
    && Array.isArray(daily.time)
    && daily.time.every((day) => typeof day === "string")
    && typeof value.metadata.latitude === "number"
    && typeof value.metadata.longitude === "number"
    && Object.values(value.units).every((unit) => typeof unit === "string");
}

function readCachedWeather(
  latitude: number,
  longitude: number,
): CachedWeatherData | null {
  const key = cacheKey(latitude, longitude);
  const cached = responseCache.get(key);
  if (cached) return cached;

  const storageKey = `${CACHE_KEY_PREFIX}${key}`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (
      !isRecord(parsed)
      || !isWeatherResponse(parsed.data)
      || typeof parsed.fetchedAt !== "string"
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const fetchedAt = new Date(parsed.fetchedAt);
    if (Number.isNaN(fetchedAt.getTime())) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const entry = {
      data: parsed.data,
      fetchedAt: fetchedAt.toISOString(),
    };
    responseCache.set(key, entry);
    return entry;
  } catch (error: unknown) {
    console.warn("Unable to read cached weather data.", error);
    return null;
  }
}

export function getCachedWeatherData(
  latitude: number,
  longitude: number,
): CachedWeatherData | null {
  return readCachedWeather(latitude, longitude);
}

function cacheWeatherData(
  latitude: number,
  longitude: number,
  data: WeatherResponse,
) {
  const key = cacheKey(latitude, longitude);
  const fetchedAt = new Date().toISOString();
  const entry = { data, fetchedAt };
  responseCache.set(key, entry);

  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${key}`,
      JSON.stringify({ data, fetchedAt }),
    );
  } catch (error: unknown) {
    console.warn("Unable to persist cached weather data.", error);
  }
}

/**
 * Fetch weather data and forecasts from the backend API.
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
): Promise<WeatherResponse> {
  const key = cacheKey(latitude, longitude);
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  const request = (async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/weather?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
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

      const data: unknown = await response.json();
      if (!isWeatherResponse(data)) {
        throw new Error("The weather service returned an invalid response.");
      }
      cacheWeatherData(latitude, longitude, data);
      return data;
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        throw new Error("The weather request timed out. Please try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  pendingRequests.set(key, request);
  try {
    return await request;
  } finally {
    if (pendingRequests.get(key) === request) {
      pendingRequests.delete(key);
    }
  }
}

export function getWeatherDataFreshness(fetchedAt: string | null) {
  if (!fetchedAt) return true;
  const timestamp = new Date(fetchedAt).getTime();
  return Number.isNaN(timestamp)
    || Date.now() - timestamp >= WEATHER_CACHE_TTL_MS;
}
