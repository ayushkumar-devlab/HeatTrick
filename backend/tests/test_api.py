import sys
from pathlib import Path

import httpx
import pytest
from starlette.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import main

app = main.app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "HeatTrick"


def test_weather_invalid_latitude():
    # Latitude > 90 must fail Pydantic validation with 422
    response = client.get("/api/weather?latitude=95.0&longitude=77.2")
    assert response.status_code == 422


def test_weather_invalid_longitude():
    # Longitude > 180 must fail validation with 422
    response = client.get("/api/weather?latitude=28.5&longitude=190.0")
    assert response.status_code == 422


def test_weather_missing_params():
    # Missing coordinates must return 422
    response = client.get("/api/weather")
    assert response.status_code == 422


def test_weather_valid_coordinates():
    # Safdarjung, New Delhi coordinates
    response = client.get("/api/weather?latitude=28.5833&longitude=77.2083")
    assert response.status_code == 200
    data = response.json()

    # Validate top-level keys
    assert "current" in data
    assert "daily" in data
    assert "units" in data
    assert "metadata" in data

    # Validate current structure
    current = data["current"]
    assert "temperature_2m" in current
    assert "relative_humidity_2m" in current
    assert "wind_speed_10m" in current
    assert "time" in current

    # Validate forecast daily structure
    daily = data["daily"]
    assert len(daily["time"]) > 0
    assert len(daily["temperature_2m_max"]) > 0

    # Validate metadata
    metadata = data["metadata"]
    assert metadata["source"] == "Open-Meteo Weather API"
    assert "retrieved_at" in metadata


def test_weather_logs_upstream_error_after_retries(monkeypatch, caplog):
    attempts = []

    class UnavailableOpenMeteoClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params):
            attempts.append((url, params))
            return httpx.Response(503, text="temporary upstream failure")

    async def skip_retry_delay(_seconds):
        return None

    monkeypatch.setattr(main, "weather_cache", {})
    monkeypatch.setattr(main.httpx, "AsyncClient", UnavailableOpenMeteoClient)
    monkeypatch.setattr(main.asyncio, "sleep", skip_retry_delay)

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": (
            "Open-Meteo is temporarily rate-limited or "
            "unavailable. Please try again later."
        )
    }
    assert len(attempts) == 3
    assert "Open-Meteo returned HTTP 503 after 3 attempts" in caplog.text
    assert "temporary upstream failure" in caplog.text


def test_weather_logs_connection_error_after_retries(monkeypatch, caplog):
    attempts = []

    class UnreachableOpenMeteoClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params):
            attempts.append((url, params))
            raise httpx.ConnectError("connection refused")

    async def skip_retry_delay(_seconds):
        return None

    monkeypatch.setattr(main, "weather_cache", {})
    monkeypatch.setattr(main.httpx, "AsyncClient", UnreachableOpenMeteoClient)
    monkeypatch.setattr(main.asyncio, "sleep", skip_retry_delay)

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Unable to connect to the Open-Meteo service."
    }
    assert len(attempts) == 3
    assert "Open-Meteo request failed after 3 attempts (ConnectError)" in (
        caplog.text
    )
    assert "connection refused" in caplog.text
