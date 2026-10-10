import sys
from pathlib import Path
import pytest
from starlette.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from main import app

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
