import json
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from backend.routers import science
from backend.main import app
from backend.science import climatology
from backend.scripts.build_climatology import compute_normals

client = TestClient(app)


def _daily_dates(start: date, end: date) -> list[date]:
    result: list[date] = []
    current = start
    while current <= end:
        result.append(current)
        current += timedelta(days=1)
    return result


def _normal_index(day: date) -> int:
    return date(2001, day.month, day.day).timetuple().tm_yday - 1


def test_compute_normals_constant_series() -> None:
    dates = _daily_dates(date(1991, 1, 1), date(1992, 12, 31))
    normals, expected, valid = compute_normals(dates, [25.0] * len(dates))

    assert expected == len(dates)
    assert valid == expected
    assert len(normals) == 365
    assert set(normals.values()) == {25.0}


def test_compute_normals_seasonal_window_average() -> None:
    dates = _daily_dates(date(2001, 1, 1), date(2002, 12, 31))
    values = [float(_normal_index(day) + 1) for day in dates]
    normals, _, _ = compute_normals(dates, values)

    assert normals["01-10"] == 10.0


def test_compute_normals_ignores_missing_values() -> None:
    dates = _daily_dates(date(2001, 1, 1), date(2001, 12, 31))
    values: list[float | None] = [18.0] * len(dates)
    values[100] = None
    normals, expected, valid = compute_normals(dates, values)

    assert expected == 365
    assert valid == 364
    assert normals["01-01"] == 18.0


def test_compute_normals_wraps_window_at_year_boundary() -> None:
    dates = [date(2001, 12, 31), date(2002, 1, 1)]
    normals, _, _ = compute_normals(dates, [20.0, 10.0])

    assert normals["01-01"] == 15.0


def test_compute_normals_folds_february_29_into_neighbors() -> None:
    normals, _, _ = compute_normals([date(2012, 2, 29)], [23.0])

    assert "02-29" not in normals
    assert normals["02-21"] == 23.0
    assert "03-09" not in normals


@pytest.fixture
def climatology_files(tmp_path, monkeypatch):
    station_file = tmp_path / "stations.json"
    station_file.write_text(
        json.dumps(
            [
                {
                    "id": "DEL-01",
                    "name": "New Delhi (Safdarjung)",
                    "latitude": 28.5833,
                    "longitude": 77.2083,
                    "imdCriteriaType": "Plains",
                }
            ]
        ),
        encoding="utf-8",
    )
    normals_directory = tmp_path / "climatology"
    normals_directory.mkdir()
    (normals_directory / "DEL-01.json").write_text(
        json.dumps(
            {
                "station": {"id": "DEL-01"},
                "baseline": "1991-2020",
                "model": "era5",
                "resolution_note": "ERA5 grid-cell value",
                "retrieved_at": "2026-01-01T00:00:00+00:00",
                "quality": "sufficient",
                "normals": {
                    "05-01": 35.5,
                    "05-02": 35.5,
                    "05-03": 35.5,
                },
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(science, "STATIONS_PATH", station_file)
    monkeypatch.setattr(climatology, "CLIMATOLOGY_DIR", normals_directory)
    climatology.clear_climatology_cache()
    yield
    climatology.clear_climatology_cache()


def test_diagnose_heatwave_normal_and_boundary(climatology_files) -> None:
    response = client.post(
        "/api/heatwave/diagnose",
        json={
            "station_id": "DEL-01",
            "days": [
                {"date": "2026-05-01", "tmax_c": 40.0},
                {"date": "2026-05-02", "tmax_c": 40.0},
            ],
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["days"][0]["departure"] == 4.5
    assert result["days"][0]["category"] == "heatwave"
    assert result["result"]["flagged"] is True
    assert result["basis"]["baseline"] == "1991-2020"
    assert result["limitations"] == [
        "diagnostic, gridded single-point comparison; not an official IMD declaration; ERA5 normals differ from IMD station normals"
    ]


def test_diagnose_heatwave_unknown_station(climatology_files) -> None:
    response = client.post(
        "/api/heatwave/diagnose",
        json={"station_id": "UNKNOWN", "days": []},
    )

    assert response.status_code == 404


def test_diagnose_heatwave_for_muzaffarpur() -> None:
    stations = json.loads(science.STATIONS_PATH.read_text(encoding="utf-8"))
    station = next(entry for entry in stations if entry["id"] == "MUZ-10")

    assert station["name"] == "Muzaffarpur"
    assert station["latitude"] == 26.12
    assert station["longitude"] == 85.39
    normals_path = climatology.CLIMATOLOGY_DIR / "MUZ-10.json"
    normals_data = json.loads(normals_path.read_text(encoding="utf-8"))
    assert normals_data["quality"] == "sufficient"
    assert normals_data["model"] == "era5"

    response = client.post(
        "/api/heatwave/diagnose",
        json={
            "station_id": "MUZ-10",
            "days": [{"date": "2026-05-01", "tmax_c": 30.0}],
        },
    )

    assert response.status_code == 200
    assert response.json()["days"][0]["normal"] == normals_data["normals"]["05-01"]
    assert response.json()["basis"]["baseline"] == "1991-2020"


@pytest.mark.parametrize(
    "body",
    [
        {"station_id": "DEL-01", "days": [{"date": "not-a-date", "tmax_c": 40}]},
        {"station_id": "DEL-01", "days": [{"date": "2026-05-01", "tmax_c": "nan"}]},
    ],
)
def test_diagnose_heatwave_rejects_invalid_input(climatology_files, body) -> None:
    response = client.post("/api/heatwave/diagnose", json=body)

    assert response.status_code == 422


def test_get_normal_rejects_missing_and_insufficient_files(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(climatology, "CLIMATOLOGY_DIR", tmp_path)
    climatology.clear_climatology_cache()

    with pytest.raises(FileNotFoundError, match="No climatology file"):
        climatology.get_normal("MISSING", "01-01")

    (tmp_path / "LOW.json").write_text(
        json.dumps({"quality": "insufficient", "normals": {}}),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="insufficient"):
        climatology.get_normal("LOW", "01-01")
    climatology.clear_climatology_cache()
