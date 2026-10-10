"""
HeatTrick Backend - Localized Weather Ingestion & Thermal Stress API
College Research Project: India Localized Heatwave Early Warning & Thermal Stress Assessment
"""

import asyncio
import time
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(
    title="HeatTrick API",
    description=(
        "Backend API for Heatwave Early Warning and "
        "Thermal Stress Assessment in India"
    ),
    version="0.2.1",
)

# Allow the local frontend and deployed Vercel frontend.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://heat-trick.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache: reuse successful results for five minutes.
WEATHER_CACHE_TTL = 300
weather_cache = {}


class HealthResponse(BaseModel):
    status: str
    app: str


class CurrentWeather(BaseModel):
    time: str
    temperature_2m: float | None = None
    relative_humidity_2m: float | None = None
    apparent_temperature: float | None = None
    dew_point_2m: float | None = None
    wind_speed_10m: float | None = None
    direct_normal_irradiance: float | None = None
    is_day: int | None = None
    precipitation: float | None = None


class DailyForecast(BaseModel):
    time: list[str] = []
    temperature_2m_max: list[float | None] = []
    temperature_2m_min: list[float | None] = []
    apparent_temperature_max: list[float | None] = []
    apparent_temperature_min: list[float | None] = []
    wind_speed_10m_max: list[float | None] = []
    precipitation_sum: list[float | None] = []


class SourceMetadata(BaseModel):
    source: str = "Open-Meteo Weather API"
    model: str = "ECMWF / GFS Global NWP Blend"
    latitude: float
    longitude: float
    elevation: float | None = None
    timezone: str | None = None
    retrieved_at: str


class WeatherResponse(BaseModel):
    current: CurrentWeather
    daily: DailyForecast
    units: dict[str, str] = {}
    metadata: SourceMetadata


@app.get("/")
def read_root():
    return {
        "message": "Welcome to HeatTrick API",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "weather_endpoint": "/api/weather",
    }


@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Verify that the HeatTrick backend is running."""
    return HealthResponse(status="ok", app="HeatTrick")


@app.get("/api/weather", response_model=WeatherResponse)
async def get_weather(
    latitude: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (-90 to 90)",
    ),
    longitude: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (-180 to 180)",
    ),
) -> WeatherResponse:
    """
    Retrieve current weather and a seven-day forecast from Open-Meteo.
    Successful responses are cached briefly to reduce repeated API calls.
    """

    # Round coordinates slightly so nearby duplicate requests can share cache.
    cache_key = (round(latitude, 3), round(longitude, 3))
    now = time.monotonic()
    cached = weather_cache.get(cache_key)

    if cached and now - cached[0] < WEATHER_CACHE_TTL:
        return cached[1]

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,relative_humidity_2m,apparent_temperature,"
            "dew_point_2m,is_day,precipitation,wind_speed_10m,"
            "direct_normal_irradiance"
        ),
        "daily": (
            "temperature_2m_max,temperature_2m_min,"
            "apparent_temperature_max,apparent_temperature_min,"
            "precipitation_sum,wind_speed_10m_max"
        ),
        "timezone": "auto",
        "wind_speed_unit": "ms",
    }

    data = None

    # Retry temporary timeouts, rate limits and provider server errors.
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(20.0, connect=10.0)
            ) as client:
                response = await client.get(url, params=params)

            if (
                response.status_code == 429
                or response.status_code >= 500
            ):
                if attempt < 2:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue

                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Open-Meteo is temporarily rate-limited or "
                        "unavailable. Please try again later."
                    ),
                )

            response.raise_for_status()
            data = response.json()
            break

        except HTTPException:
            raise

        except httpx.TimeoutException:
            if attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue

            raise HTTPException(
                status_code=504,
                detail=(
                    "Open-Meteo did not respond after multiple attempts. "
                    "Please try again shortly."
                ),
            )

        except httpx.HTTPStatusError as err:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Open-Meteo returned HTTP "
                    f"{err.response.status_code}."
                ),
            )

        except httpx.RequestError:
            if attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue

            raise HTTPException(
                status_code=503,
                detail="Unable to connect to the Open-Meteo service.",
            )

        except ValueError:
            raise HTTPException(
                status_code=502,
                detail="Open-Meteo returned invalid JSON.",
            )

    if data is None:
        raise HTTPException(
            status_code=503,
            detail="Weather data is temporarily unavailable.",
        )

    # Validate the response structure before constructing our models.
    raw_current = data.get("current")
    raw_daily = data.get("daily")

    if not isinstance(raw_current, dict) or not isinstance(raw_daily, dict):
        raise HTTPException(
            status_code=502,
            detail="Invalid weather response received from Open-Meteo.",
        )

    units: dict[str, str] = {}

    current_units = data.get("current_units")
    daily_units = data.get("daily_units")

    if isinstance(current_units, dict):
        units.update(current_units)

    if isinstance(daily_units, dict):
        units.update(daily_units)

    current_model = CurrentWeather(
        time=str(raw_current.get("time", "")),
        temperature_2m=raw_current.get("temperature_2m"),
        relative_humidity_2m=raw_current.get("relative_humidity_2m"),
        apparent_temperature=raw_current.get("apparent_temperature"),
        dew_point_2m=raw_current.get("dew_point_2m"),
        wind_speed_10m=raw_current.get("wind_speed_10m"),
        direct_normal_irradiance=raw_current.get(
            "direct_normal_irradiance"
        ),
        is_day=raw_current.get("is_day"),
        precipitation=raw_current.get("precipitation"),
    )

    daily_model = DailyForecast(
        time=raw_daily.get("time", []),
        temperature_2m_max=raw_daily.get("temperature_2m_max", []),
        temperature_2m_min=raw_daily.get("temperature_2m_min", []),
        apparent_temperature_max=raw_daily.get(
            "apparent_temperature_max", []
        ),
        apparent_temperature_min=raw_daily.get(
            "apparent_temperature_min", []
        ),
        wind_speed_10m_max=raw_daily.get("wind_speed_10m_max", []),
        precipitation_sum=raw_daily.get("precipitation_sum", []),
    )

    metadata_model = SourceMetadata(
        source="Open-Meteo Weather API",
        model="ECMWF / GFS Global NWP Blend",
        latitude=float(data.get("latitude", latitude)),
        longitude=float(data.get("longitude", longitude)),
        elevation=data.get("elevation"),
        timezone=data.get("timezone"),
        retrieved_at=datetime.now(timezone.utc).isoformat(),
    )

    result = WeatherResponse(
        current=current_model,
        daily=daily_model,
        units=units,
        metadata=metadata_model,
    )

    # Cache only successful responses.
    weather_cache[cache_key] = (time.monotonic(), result)

    # Remove expired entries to prevent unbounded cache growth.
    expired_keys = [
        key
        for key, value in weather_cache.items()
        if time.monotonic() - value[0] >= WEATHER_CACHE_TTL
    ]
    for key in expired_keys:
        weather_cache.pop(key, None)

    return result