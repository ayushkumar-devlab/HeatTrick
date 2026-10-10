"""
HeatTrick Backend - Localized Weather Ingestion & Thermal Stress API
College Research Project: India Localized Heatwave Early Warning & Thermal Stress Assessment
"""

from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(
    title="HeatTrick API",
    description="Backend API for Heatwave Early Warning and Thermal Stress Assessment in India",
    version="0.2.0",
)

# Configure CORS to allow frontend communication during development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    """
    Health check endpoint to verify backend service status.
    Expected response: {"status": "ok", "app": "HeatTrick"}
    """
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
    Retrieve real-time meteorological observations and 7-day numerical forecast
    from Open-Meteo for the requested geographical coordinates.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,relative_humidity_2m,apparent_temperature,"
            "dew_point_2m,is_day,precipitation,wind_speed_10m,direct_normal_irradiance"
        ),
        "daily": (
            "temperature_2m_max,temperature_2m_min,apparent_temperature_max,"
            "apparent_temperature_min,precipitation_sum,wind_speed_10m_max"
        ),
        "timezone": "auto",
        "wind_speed_unit": "ms",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Upstream timeout: Open-Meteo weather service did not respond within 10 seconds.",
        )
    except httpx.HTTPStatusError as err:
        raise HTTPException(
            status_code=502,
            detail=f"Upstream error: Open-Meteo weather service returned HTTP {err.response.status_code}.",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Network error: Unable to connect to Open-Meteo weather service.",
        )
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error processing weather data: {str(err)}",
        )

    # Parse and validate response structure
    raw_current = data.get("current")
    raw_daily = data.get("daily")
    if not raw_current or not raw_daily:
        raise HTTPException(
            status_code=502,
            detail="Invalid payload structure received from Open-Meteo.",
        )

    # Compile units dictionary combining current and daily units
    units: dict[str, str] = {}
    if isinstance(data.get("current_units"), dict):
        units.update(data["current_units"])
    if isinstance(data.get("daily_units"), dict):
        units.update(data["daily_units"])

    current_model = CurrentWeather(
        time=str(raw_current.get("time", "")),
        temperature_2m=raw_current.get("temperature_2m"),
        relative_humidity_2m=raw_current.get("relative_humidity_2m"),
        apparent_temperature=raw_current.get("apparent_temperature"),
        dew_point_2m=raw_current.get("dew_point_2m"),
        wind_speed_10m=raw_current.get("wind_speed_10m"),
        direct_normal_irradiance=raw_current.get("direct_normal_irradiance"),
        is_day=raw_current.get("is_day"),
        precipitation=raw_current.get("precipitation"),
    )

    daily_model = DailyForecast(
        time=raw_daily.get("time", []),
        temperature_2m_max=raw_daily.get("temperature_2m_max", []),
        temperature_2m_min=raw_daily.get("temperature_2m_min", []),
        apparent_temperature_max=raw_daily.get("apparent_temperature_max", []),
        apparent_temperature_min=raw_daily.get("apparent_temperature_min", []),
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

    return WeatherResponse(
        current=current_model,
        daily=daily_model,
        units=units,
        metadata=metadata_model,
    )
