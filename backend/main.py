"""
HeatTrick Backend - Localized Weather Ingestion & Thermal Stress API
College Research Project: India Localized Heatwave Early Warning & Thermal Stress Assessment
"""

import logging
import math
import time
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_DOWN
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

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

logger = logging.getLogger(__name__)

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

# In-memory cache: honor provider expiration headers, with a fallback TTL.
WEATHER_CACHE_FALLBACK_TTL = 600
WEATHER_CACHE_STALE_TTL = 600
WEATHER_CACHE_MAX_ENTRIES = 256
LOCATIONFORECAST_URL = (
    "https://api.met.no/weatherapi/locationforecast/2.0/compact"
)
METNO_USER_AGENT = (
    "HeatTrick/0.2.1 (+https://github.com/ayushkumar-devlab/HeatTrick)"
)
FORECAST_TIME_ZONE = ZoneInfo("Asia/Kolkata")


def _upstream_error_excerpt(response: httpx.Response) -> str:
    return response.text.replace("\r", " ").replace("\n", " ")[:300]


def _truncate_coordinate(value: float) -> float:
    return float(
        Decimal(str(value)).quantize(Decimal("0.0001"), rounding=ROUND_DOWN)
    )


def _response_cache_ttl(response: httpx.Response) -> float:
    expires = response.headers.get("Expires")
    if expires:
        try:
            expires_at = parsedate_to_datetime(expires)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            return max(
                0.0,
                (expires_at - datetime.now(timezone.utc)).total_seconds(),
            )
        except (TypeError, ValueError, OverflowError):
            logger.warning("MET Norway returned an invalid Expires header.")

    return WEATHER_CACHE_FALLBACK_TTL


def _number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value):
        return None
    return float(value)


def _parse_forecast_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Forecast timestamps must include a timezone.")
    return parsed.astimezone(timezone.utc)


class CachedWeather:
    def __init__(
        self,
        weather: "WeatherResponse",
        expires_at: float,
        last_modified: str | None,
        retain_until: float,
    ) -> None:
        self.weather = weather
        self.expires_at = expires_at
        self.last_modified = last_modified
        self.retain_until = retain_until


weather_cache: dict[tuple[float, float], CachedWeather] = {}


def _cache_weather(
    cache_key: tuple[float, float],
    weather: "WeatherResponse",
    ttl: float,
    last_modified: str | None,
) -> None:
    now = time.monotonic()
    weather_cache[cache_key] = CachedWeather(
        weather=weather,
        expires_at=now + ttl,
        last_modified=last_modified,
        retain_until=now + ttl + WEATHER_CACHE_STALE_TTL,
    )

    expired_keys = [
        key
        for key, value in weather_cache.items()
        if now >= value.retain_until
    ]
    for key in expired_keys:
        weather_cache.pop(key, None)

    if len(weather_cache) > WEATHER_CACHE_MAX_ENTRIES:
        oldest_keys = sorted(
            weather_cache,
            key=lambda key: weather_cache[key].retain_until,
        )
        for key in oldest_keys[: len(weather_cache) - WEATHER_CACHE_MAX_ENTRIES]:
            weather_cache.pop(key, None)


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
    source: str = (
        "MET Norway Locationforecast API "
        "(https://api.met.no/weatherapi/locationforecast/2.0/documentation; "
        "adapted by HeatTrick; CC BY 4.0: "
        "https://creativecommons.org/licenses/by/4.0/)"
    )
    model: str = "Locationforecast 2.0"
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
    Retrieve current weather and forecast samples from MET Norway.
    Successful responses are cached according to the provider's HTTP headers.
    """
    latitude = _truncate_coordinate(latitude)
    longitude = _truncate_coordinate(longitude)
    cache_key = (latitude, longitude)
    cached = weather_cache.get(cache_key)
    now = time.monotonic()

    if cached and now < cached.expires_at:
        return cached.weather

    headers = {"User-Agent": METNO_USER_AGENT}
    if cached and cached.last_modified:
        headers["If-Modified-Since"] = cached.last_modified

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=10.0)
        ) as client:
            response = await client.get(
                LOCATIONFORECAST_URL,
                params={"lat": latitude, "lon": longitude},
                headers=headers,
            )
    except httpx.TimeoutException as err:
        logger.warning("MET Norway request timed out: %s", err)
        raise HTTPException(
            status_code=504,
            detail="MET Norway did not respond before the request timed out.",
        )
    except httpx.RequestError as err:
        logger.warning(
            "MET Norway request failed (%s): %s",
            type(err).__name__,
            err,
        )
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to the MET Norway weather service.",
        )

    if response.status_code == 304:
        if cached is None:
            logger.warning("MET Norway returned 304 without a cached forecast.")
            raise HTTPException(
                status_code=502,
                detail="MET Norway returned an unusable not-modified response.",
            )
        weather = cached.weather
        _cache_weather(
            cache_key,
            weather,
            _response_cache_ttl(response),
            response.headers.get("Last-Modified") or cached.last_modified,
        )
        return weather

    if response.status_code == 203:
        logger.warning("MET Norway reports that Locationforecast is deprecated.")

    if response.status_code == 429 or response.status_code >= 500:
        logger.warning(
            "MET Norway returned HTTP %s: %s",
            response.status_code,
            _upstream_error_excerpt(response),
        )
        raise HTTPException(
            status_code=503,
            detail="MET Norway is temporarily rate-limited or unavailable.",
        )

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as err:
        logger.warning(
            "MET Norway returned HTTP %s: %s",
            err.response.status_code,
            _upstream_error_excerpt(err.response),
        )
        raise HTTPException(
            status_code=502,
            detail=f"MET Norway returned HTTP {err.response.status_code}.",
        )

    try:
        payload = response.json()
    except ValueError:
        logger.warning("MET Norway returned invalid JSON.")
        raise HTTPException(
            status_code=502,
            detail="MET Norway returned invalid JSON.",
        )

    try:
        if not isinstance(payload, dict):
            raise ValueError("Forecast payload is not an object.")
        properties = payload.get("properties")
        if not isinstance(properties, dict):
            raise ValueError("Forecast properties are missing.")
        metadata = properties.get("meta")
        if not isinstance(metadata, dict):
            raise ValueError("Forecast metadata is missing.")
        provider_units = metadata.get("units", {})
        timeseries = properties.get("timeseries")
        if not isinstance(provider_units, dict):
            raise ValueError("Forecast units are invalid.")
        if not isinstance(timeseries, list) or not timeseries:
            raise ValueError("Forecast timeseries is missing or empty.")

        parsed_steps: list[tuple[str, datetime, dict]] = []
        for step in timeseries:
            step_time = step["time"]
            details = step["data"]["instant"]["details"]
            if not isinstance(step_time, str) or not isinstance(details, dict):
                raise ValueError("Invalid time-series entry.")
            parsed_steps.append(
                (step_time, _parse_forecast_time(step_time), details)
            )
    except (KeyError, TypeError, ValueError) as err:
        logger.warning("MET Norway returned an invalid forecast structure: %s", err)
        raise HTTPException(
            status_code=502,
            detail="Invalid forecast response received from MET Norway.",
        )

    current_time, _, current_details = parsed_steps[0]
    daily_values: dict[date, dict[str, list[float]]] = {}
    for _, forecast_time, details in parsed_steps:
        day = forecast_time.astimezone(FORECAST_TIME_ZONE).date()
        values = daily_values.setdefault(
            day, {"temperature": [], "wind_speed": []}
        )
        temperature = _number(details.get("air_temperature"))
        wind_speed = _number(details.get("wind_speed"))
        if temperature is not None:
            values["temperature"].append(temperature)
        if wind_speed is not None:
            values["wind_speed"].append(wind_speed)

    forecast_days = sorted(daily_values)[:7]
    daily_model = DailyForecast(
        time=[day.isoformat() for day in forecast_days],
        temperature_2m_max=[
            max(daily_values[day]["temperature"])
            if daily_values[day]["temperature"]
            else None
            for day in forecast_days
        ],
        temperature_2m_min=[
            min(daily_values[day]["temperature"])
            if daily_values[day]["temperature"]
            else None
            for day in forecast_days
        ],
        apparent_temperature_max=[None] * len(forecast_days),
        apparent_temperature_min=[None] * len(forecast_days),
        wind_speed_10m_max=[
            max(daily_values[day]["wind_speed"])
            if daily_values[day]["wind_speed"]
            else None
            for day in forecast_days
        ],
        precipitation_sum=[None] * len(forecast_days),
    )

    units = {
        api_name: provider_units[provider_name]
        for api_name, provider_name in {
            "temperature_2m": "air_temperature",
            "temperature_2m_max": "air_temperature_max",
            "temperature_2m_min": "air_temperature_min",
            "relative_humidity_2m": "relative_humidity",
            "dew_point_2m": "dew_point_temperature",
            "wind_speed_10m": "wind_speed",
            "wind_speed_10m_max": "wind_speed",
        }.items()
        if isinstance(provider_units.get(provider_name), str)
    }

    geometry = payload.get("geometry")
    coordinates = (
        geometry.get("coordinates", [])
        if isinstance(geometry, dict)
        else []
    )
    if (
        isinstance(coordinates, list)
        and len(coordinates) >= 2
        and _number(coordinates[0]) is not None
        and _number(coordinates[1]) is not None
    ):
        result_longitude = float(coordinates[0])
        result_latitude = float(coordinates[1])
        elevation = _number(coordinates[2]) if len(coordinates) > 2 else None
    else:
        result_latitude = latitude
        result_longitude = longitude
        elevation = None

    result = WeatherResponse(
        current=CurrentWeather(
            time=current_time,
            temperature_2m=_number(current_details.get("air_temperature")),
            relative_humidity_2m=_number(
                current_details.get("relative_humidity")
            ),
            apparent_temperature=None,
            dew_point_2m=_number(current_details.get("dew_point_temperature")),
            wind_speed_10m=_number(current_details.get("wind_speed")),
            direct_normal_irradiance=None,
            is_day=None,
            precipitation=None,
        ),
        daily=daily_model,
        units=units,
        metadata=SourceMetadata(
            latitude=result_latitude,
            longitude=result_longitude,
            elevation=elevation,
            timezone="Asia/Kolkata",
            retrieved_at=datetime.now(timezone.utc).isoformat(),
        ),
    )

    _cache_weather(
        cache_key,
        result,
        _response_cache_ttl(response),
        response.headers.get("Last-Modified"),
    )

    return result