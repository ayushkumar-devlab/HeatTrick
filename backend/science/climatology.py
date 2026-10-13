import json
from functools import lru_cache
from pathlib import Path
from typing import Any
from datetime import date

CLIMATOLOGY_DIR = Path(__file__).resolve().parents[1] / "data" / "climatology"


@lru_cache(maxsize=64)
def _load_climatology(station_id: str) -> dict[str, Any]:
    path = CLIMATOLOGY_DIR / f"{station_id}.json"
    try:
        with path.open(encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError as err:
        raise FileNotFoundError(
            f"No climatology file exists for station {station_id}."
        ) from err
    if data.get("quality") != "sufficient":
        raise ValueError(
            f"Climatology for station {station_id} is insufficient."
        )
    return data


@lru_cache(maxsize=1024)
def get_normal(station_id: str, month_day: str) -> float:
    try:
        month, day = (int(part) for part in month_day.split("-", maxsplit=1))
        key = date_from_month_day(month, day)
    except (ValueError, TypeError) as err:
        raise ValueError("month_day must be a valid MM-DD calendar date.") from err

    data = _load_climatology(station_id)
    normals = data.get("normals")
    if not isinstance(normals, dict):
        raise ValueError(f"Climatology normals for {station_id} are missing.")

    if key == "leap_day":
        values = (normals.get("02-28"), normals.get("03-01"))
        if not all(isinstance(value, (int, float)) for value in values):
            raise ValueError(f"Feb 29 normal is unavailable for {station_id}.")
        return (float(values[0]) + float(values[1])) / 2

    value = normals.get(key)
    if not isinstance(value, (int, float)):
        raise ValueError(f"Normal {key} is unavailable for {station_id}.")
    return float(value)


def date_from_month_day(month: int, day: int) -> str:
    if month == 2 and day == 29:
        return "leap_day"
    date(2001, month, day)
    return f"{month:02d}-{day:02d}"


def get_climatology(station_id: str) -> dict[str, Any]:
    return _load_climatology(station_id)


def clear_climatology_cache() -> None:
    get_normal.cache_clear()
    _load_climatology.cache_clear()
