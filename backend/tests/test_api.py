import sys
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
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


@pytest.fixture(autouse=True)
def clear_weather_cache(monkeypatch):
    monkeypatch.setattr(main, "weather_cache", {})


def _cache_headers(expires_in_seconds=1800):
    expires = datetime.now(timezone.utc) + timedelta(
        seconds=expires_in_seconds
    )
    return {
        "Expires": format_datetime(expires, usegmt=True),
        "Last-Modified": "Sun, 11 Oct 2026 18:00:00 GMT",
    }


def _met_norway_payload():
    samples = [
        ("2026-10-11T00:00:00Z", 21.0, 2.0),
        ("2026-10-11T06:00:00Z", 28.5, 4.5),
        ("2026-10-11T18:00:00Z", 22.0, 3.0),
        ("2026-10-11T20:00:00Z", 30.5, 5.5),
        ("2026-10-12T00:00:00Z", 19.5, 1.5),
    ]
    timeseries = []
    for forecast_time, temperature, wind_speed in samples:
        timeseries.append(
            {
                "time": forecast_time,
                "data": {
                    "instant": {
                        "details": {
                            "air_temperature": temperature,
                            "relative_humidity": 62.0,
                            "dew_point_temperature": 13.0,
                            "wind_speed": wind_speed,
                        }
                    },
                    "next_1_hours": {
                        "details": {"precipitation_amount": 0.8}
                    },
                },
            }
        )

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [77.2083, 28.5833, 216.0],
        },
        "properties": {
            "meta": {
                "units": {
                    "air_temperature": "°C",
                    "air_temperature_max": "°C",
                    "air_temperature_min": "°C",
                    "relative_humidity": "%",
                    "dew_point_temperature": "°C",
                    "wind_speed": "m/s",
                    "precipitation_amount": "mm",
                }
            },
            "timeseries": timeseries,
        },
    }


def _cache_expired_weather():
    main._cache_weather(
        (28.5833, 77.2083),
        main.WeatherResponse(
            current=main.CurrentWeather(
                time="2026-10-11T00:00:00Z",
                temperature_2m=21.0,
                relative_humidity_2m=62.0,
            ),
            daily=main.DailyForecast(time=["2026-10-11"]),
            metadata=main.SourceMetadata(
                latitude=28.5833,
                longitude=77.2083,
                retrieved_at="2026-10-11T00:00:00+00:00",
            ),
        ),
        ttl=-1,
        last_modified=None,
    )


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "HeatTrick"


def test_thermal_endpoint_returns_full_frontend_schema():
    response = client.get(
        "/api/thermal",
        params={"temp_c": 32.2, "rh": 70},
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"heat_index", "wet_bulb", "wbgt"}
    assert set(data["heat_index"]) == {
        "inputs",
        "units",
        "method",
        "citation_keys",
        "limitations",
        "value_c",
        "value_f",
        "band",
        "method_used",
        "adjustment_applied",
    }
    assert set(data["wet_bulb"]) == {
        "inputs",
        "units",
        "method",
        "citation_keys",
        "limitations",
        "value_c",
        "out_of_range",
    }
    assert set(data["wbgt"]) == {
        "inputs",
        "units",
        "method",
        "citation_keys",
        "limitations",
        "value_c",
        "label",
    }
    assert data["heat_index"]["inputs"] == {"temp_c": 32.2, "rh": 70.0}
    assert isinstance(data["heat_index"]["value_c"], float)
    assert isinstance(data["heat_index"]["value_f"], float)
    assert isinstance(data["heat_index"]["band"], str)
    assert isinstance(data["heat_index"]["method_used"], str)
    assert (
        data["heat_index"]["adjustment_applied"] is None
        or isinstance(data["heat_index"]["adjustment_applied"], str)
    )
    assert isinstance(data["wet_bulb"]["value_c"], float)
    assert isinstance(data["wet_bulb"]["out_of_range"], bool)
    assert isinstance(data["wbgt"]["value_c"], float)
    assert data["wbgt"]["label"] == "estimate, shade/no-radiation"
    for result in data.values():
        assert isinstance(result["method"], str)
        assert isinstance(result["units"], dict)
        assert isinstance(result["citation_keys"], list)
        assert isinstance(result["limitations"], list)


@pytest.mark.parametrize(
    ("temp_c", "rh", "out_of_range"),
    [
        (-20, 5, False),
        (50, 99, False),
        (30, 0, True),
        (30, 100, True),
    ],
)
def test_thermal_endpoint_accepts_formula_boundaries(
    temp_c, rh, out_of_range
):
    response = client.get(
        "/api/thermal",
        params={"temp_c": temp_c, "rh": rh},
    )

    assert response.status_code == 200
    assert response.json()["wet_bulb"]["out_of_range"] is out_of_range


@pytest.mark.parametrize(
    ("params", "detail"),
    [
        ({"rh": 50}, None),
        ({"temp_c": 30}, None),
        ({"temp_c": "nan", "rh": 50}, None),
        ({"temp_c": "inf", "rh": 50}, None),
        ({"temp_c": 30, "rh": -0.1}, "rh must be between 0 and 100 percent."),
        ({"temp_c": 30, "rh": 100.1}, "rh must be between 0 and 100 percent."),
        (
            {"temp_c": -237.7, "rh": 50},
            "temp_c makes the vapor-pressure formula undefined.",
        ),
    ],
)
def test_thermal_endpoint_rejects_invalid_inputs(params, detail):
    response = client.get("/api/thermal", params=params)

    assert response.status_code == 422
    if detail is not None:
        assert response.json()["detail"] == detail


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


def test_weather_maps_met_norway_forecast(monkeypatch):
    calls = []

    class MockMetNorwayClient:
        def __init__(self, **kwargs):
            assert kwargs["timeout"].read == 20.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            calls.append((url, params, headers))
            return httpx.Response(
                200,
                json=_met_norway_payload(),
                headers=_cache_headers(),
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", MockMetNorwayClient)

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"current", "daily", "units", "metadata"}
    assert data["current"] == {
        "time": "2026-10-11T00:00:00Z",
        "temperature_2m": 21.0,
        "relative_humidity_2m": 62.0,
        "apparent_temperature": None,
        "dew_point_2m": 13.0,
        "wind_speed_10m": 2.0,
        "direct_normal_irradiance": None,
        "is_day": None,
        "precipitation": None,
    }
    assert data["daily"]["time"] == ["2026-10-11", "2026-10-12"]
    assert data["daily"]["temperature_2m_max"] == [28.5, 30.5]
    assert data["daily"]["temperature_2m_min"] == [21.0, 19.5]
    assert data["daily"]["apparent_temperature_max"] == [None, None]
    assert data["daily"]["apparent_temperature_min"] == [None, None]
    assert data["daily"]["wind_speed_10m_max"] == [4.5, 5.5]
    assert data["daily"]["precipitation_sum"] == [None, None]
    assert data["units"]["dew_point_2m"] == "°C"
    assert data["units"]["wind_speed_10m"] == "m/s"
    assert data["metadata"]["source"].startswith(
        "MET Norway Locationforecast API"
    )
    assert data["metadata"]["model"] == "Locationforecast 2.0"
    assert data["metadata"]["latitude"] == 28.5833
    assert data["metadata"]["longitude"] == 77.2083
    assert data["metadata"]["elevation"] == 216.0
    assert data["metadata"]["timezone"] == "Asia/Kolkata"
    assert data["metadata"]["is_stale"] is False

    assert len(calls) == 1
    url, params, headers = calls[0]
    assert url == main.LOCATIONFORECAST_URL
    assert params == {"lat": 28.5833, "lon": 77.2083}
    assert headers["User-Agent"] == main.METNO_USER_AGENT


def test_weather_returns_fresh_cached_forecast_without_upstream_call(monkeypatch):
    calls = []

    class MockMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            calls.append(url)
            return httpx.Response(
                200,
                json=_met_norway_payload(),
                headers=_cache_headers(),
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", MockMetNorwayClient)
    first = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )
    second = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert first.status_code == second.status_code == 200
    assert second.json()["metadata"]["is_stale"] is False
    assert len(calls) == 1


def test_weather_returns_eligible_stale_cache_when_upstream_fails(monkeypatch):
    class FailingMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(503, text="temporary upstream failure")

    monkeypatch.setattr(main.httpx, "AsyncClient", FailingMetNorwayClient)
    cache_key = (28.5833, 77.2083)
    _cache_expired_weather()

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 200
    assert response.json()["metadata"]["is_stale"] is True
    assert (
        response.json()["metadata"]["retrieved_at"]
        == "2026-10-11T00:00:00+00:00"
    )
    assert main.weather_cache[cache_key].weather.metadata.is_stale is False


def test_weather_uses_stale_cache_for_http_status_error(monkeypatch):
    class NotFoundMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(
                404,
                text="upstream not found",
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", NotFoundMetNorwayClient)
    _cache_expired_weather()

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 200
    assert response.json()["metadata"]["is_stale"] is True


def test_weather_truncates_coordinates_to_four_decimals(monkeypatch):
    request_params = []

    class MockMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            request_params.append(params)
            return httpx.Response(
                200,
                json=_met_norway_payload(),
                headers=_cache_headers(),
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", MockMetNorwayClient)

    response = client.get(
        "/api/weather?latitude=28.58339&longitude=77.20839"
    )

    assert response.status_code == 200
    assert request_params == [{"lat": 28.5833, "lon": 77.2083}]


def test_weather_revalidates_cached_forecast_with_last_modified(monkeypatch):
    calls = []

    class MockMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            calls.append(headers)
            if len(calls) == 1:
                return httpx.Response(
                    200,
                    json=_met_norway_payload(),
                    headers=_cache_headers(-1),
                    request=httpx.Request("GET", url),
                )
            if len(calls) == 2:
                return httpx.Response(
                    304,
                    headers=_cache_headers(),
                )
            raise AssertionError("A fresh cached response should not call MET.")

    monkeypatch.setattr(main.httpx, "AsyncClient", MockMetNorwayClient)
    first = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )
    second = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )
    third = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert first.status_code == second.status_code == third.status_code == 200
    assert first.json() == second.json() == third.json()
    assert len(calls) == 2
    assert "If-Modified-Since" not in calls[0]
    assert calls[1]["If-Modified-Since"] == (
        "Sun, 11 Oct 2026 18:00:00 GMT"
    )


def test_weather_logs_upstream_error(monkeypatch, caplog):
    class UnavailableMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(
                503,
                text="temporary upstream failure",
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", UnavailableMetNorwayClient)

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "MET Norway is temporarily rate-limited or unavailable."
    }
    assert "MET Norway returned HTTP 503" in caplog.text
    assert "temporary upstream failure" in caplog.text


def test_weather_maps_upstream_timeout_to_504(monkeypatch, caplog):
    class TimeoutMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            raise httpx.ReadTimeout("provider timed out")

    monkeypatch.setattr(main.httpx, "AsyncClient", TimeoutMetNorwayClient)

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 504
    assert response.json() == {
        "detail": "MET Norway did not respond before the request timed out."
    }
    assert "MET Norway request timed out" in caplog.text
    assert "provider timed out" in caplog.text


def test_weather_returns_eligible_stale_cache_after_timeout(monkeypatch):
    class TimeoutMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            raise httpx.ReadTimeout("provider timed out")

    monkeypatch.setattr(main.httpx, "AsyncClient", TimeoutMetNorwayClient)
    _cache_expired_weather()

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 200
    assert response.json()["metadata"]["is_stale"] is True


def test_weather_rejects_malformed_provider_response(monkeypatch, caplog):
    class MalformedMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(
                200,
                json={"properties": {"timeseries": []}},
                request=httpx.Request("GET", url),
            )
    monkeypatch.setattr(main.httpx, "AsyncClient", MalformedMetNorwayClient)
    _cache_expired_weather()

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 200
    assert response.json()["metadata"]["is_stale"] is True
    assert "MET Norway returned an invalid forecast structure" in caplog.text


def test_weather_preserves_malformed_structure_error_without_stale_cache(
    monkeypatch,
):
    class MalformedMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(
                200,
                json={"properties": {"timeseries": []}},
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", MalformedMetNorwayClient)

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Invalid forecast response received from MET Norway."
    }


def test_weather_uses_stale_cache_for_malformed_provider_json(monkeypatch):
    class MalformedJsonMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(
                200,
                text="not valid JSON",
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(
        main.httpx, "AsyncClient", MalformedJsonMetNorwayClient
    )
    _cache_expired_weather()

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 200
    assert response.json()["metadata"]["is_stale"] is True


def test_weather_preserves_malformed_json_error_without_stale_cache(monkeypatch):
    class MalformedJsonMetNorwayClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

        async def get(self, url, params, headers):
            return httpx.Response(
                200,
                text="not valid JSON",
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(
        main.httpx, "AsyncClient", MalformedJsonMetNorwayClient
    )

    response = client.get(
        "/api/weather?latitude=28.5833&longitude=77.2083"
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "MET Norway returned invalid JSON."}
