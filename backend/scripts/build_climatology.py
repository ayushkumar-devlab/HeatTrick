"""Build daily ERA5 Tmax normals using the Open-Meteo historical archive."""

import json
import math
import argparse
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import fmean
from typing import Sequence

import httpx

BACKEND_DIR = Path(__file__).resolve().parents[1]
STATIONS_PATH = BACKEND_DIR / "data" / "stations.json"
CLIMATOLOGY_DIR = BACKEND_DIR / "data" / "climatology"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
START_DATE = date(1991, 1, 1)
END_DATE = date(2020, 12, 31)
CHUNKS = (
    (date(1991, 1, 1), date(2000, 12, 31)),
    (date(2001, 1, 1), date(2010, 12, 31)),
    (date(2011, 1, 1), date(2020, 12, 31)),
)
RETRY_BACKOFF_SECONDS = (2, 5, 15, 30)
RETRYABLE_STATUS_CODES = {429, 502, 503, 504}
MODEL = "era5"
SOURCE = "Open-Meteo Historical Weather API (ERA5 reanalysis)"
METHOD = (
    "For each non-leap calendar day, arithmetic mean of daily ERA5 Tmax "
    "observations within a circular +/-7-calendar-day window across 1991-2020. "
    "Feb 29 observations contribute to both Feb 28 and Mar 1 windows; "
    "Feb 29 has no separate normal."
)


def _normal_day_index(day: date) -> int:
    return date(2001, day.month, day.day).timetuple().tm_yday - 1


def compute_normals(
    dates: Sequence[date],
    values: Sequence[float | None],
) -> tuple[dict[str, float], int, int]:
    """Return MM-DD normals, expected sample count, and valid sample count."""
    if len(dates) != len(values):
        raise ValueError("dates and values must have the same length.")
    if len(set(dates)) != len(dates):
        raise ValueError("dates must not contain duplicates.")

    samples_by_index: dict[int, list[float]] = {}
    n_valid = 0
    for day, value in zip(dates, values):
        if not isinstance(day, date):
            raise ValueError("dates must contain date values.")
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("non-null Tmax values must be numeric.")
        if not math.isfinite(value):
            raise ValueError("non-null Tmax values must be finite.")

        n_valid += 1
        indices = (
            (_normal_day_index(date(day.year, 2, 28)),
             _normal_day_index(date(day.year, 3, 1)))
            if day.month == 2 and day.day == 29
            else (_normal_day_index(day),)
        )
        for index in indices:
            samples_by_index.setdefault(index, []).append(float(value))

    normals: dict[str, float] = {}
    for month in range(1, 13):
        for day_number in range(1, 32):
            try:
                target = date(2001, month, day_number)
            except ValueError:
                continue
            target_index = _normal_day_index(target)
            window_values: list[float] = []
            for sample_index, samples in samples_by_index.items():
                distance = abs(target_index - sample_index)
                distance = min(distance, 365 - distance)
                if distance <= 7:
                    window_values.extend(samples)
            if window_values:
                normals[target.strftime("%m-%d")] = round(fmean(window_values), 1)

    return normals, len(dates), n_valid


class ArchiveChunkError(RuntimeError):
    def __init__(self, chunk: str, status: str, elapsed: float) -> None:
        self.chunk = chunk
        self.status = status
        self.elapsed = elapsed
        super().__init__(f"Archive request failed for {chunk}: {status}")


def _api_reason(response: httpx.Response) -> str | None:
    try:
        payload = response.json()
    except ValueError:
        return None
    if isinstance(payload, dict) and isinstance(payload.get("reason"), str):
        return payload["reason"]
    return None


def _valid_value_count(values: Sequence[float | None]) -> int:
    return sum(
        1
        for value in values
        if isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _fetch_chunk(
    client: httpx.Client,
    station: dict[str, object],
    chunk_start: date,
    chunk_end: date,
) -> tuple[list[date], list[float | None], str, float]:
    chunk_label = f"{chunk_start.year}-{chunk_end.year}"
    params = {
        "latitude": station["latitude"],
        "longitude": station["longitude"],
        "daily": "temperature_2m_max",
        "start_date": chunk_start.isoformat(),
        "end_date": chunk_end.isoformat(),
        "timezone": "Asia/Kolkata",
        "models": MODEL,
    }
    started = time.monotonic()
    last_status = "request-error"
    for attempt in range(len(RETRY_BACKOFF_SECONDS) + 1):
        try:
            response = client.get(ARCHIVE_URL, params=params, timeout=60.0)
            if response.status_code >= 400:
                reason = _api_reason(response)
                if reason:
                    print(f"{station['id']} {chunk_label}: API reason: {reason}")
                last_status = str(response.status_code)
                if response.status_code not in RETRYABLE_STATUS_CODES:
                    break
                if attempt == len(RETRY_BACKOFF_SECONDS):
                    break
                time.sleep(RETRY_BACKOFF_SECONDS[attempt])
                continue
            try:
                payload = response.json()
            except ValueError:
                last_status = f"invalid-json (HTTP {response.status_code})"
                break
            if isinstance(payload, dict) and isinstance(payload.get("reason"), str):
                print(
                    f"{station['id']} {chunk_label}: "
                    f"API reason: {payload['reason']}"
                )
                last_status = str(response.status_code)
                break
            response.raise_for_status()
            try:
                daily = payload["daily"]
                dates = [date.fromisoformat(value) for value in daily["time"]]
                values = daily["temperature_2m_max"]
                if not isinstance(values, list) or len(dates) != len(values):
                    raise ValueError(
                        "Archive response has mismatched daily arrays."
                    )
            except (KeyError, TypeError, ValueError):
                last_status = f"invalid-response (HTTP {response.status_code})"
                break
            return dates, values, str(response.status_code), time.monotonic() - started
        except httpx.TimeoutException:
            last_status = "timeout"
            if attempt == len(RETRY_BACKOFF_SECONDS):
                break
            time.sleep(RETRY_BACKOFF_SECONDS[attempt])
        except httpx.RequestError:
            last_status = "request-error"
            break
        except httpx.HTTPStatusError as error:
            last_status = str(error.response.status_code)
            break

    raise ArchiveChunkError(
        chunk_label,
        last_status,
        time.monotonic() - started,
    )


def _align_requested_dates(
    returned_dates: Sequence[date],
    returned_values: Sequence[float | None],
) -> tuple[list[date], list[float | None]]:
    daily_values = dict(zip(returned_dates, returned_values))
    expected_dates: list[date] = []
    values: list[float | None] = []
    day = START_DATE
    while day <= END_DATE:
        expected_dates.append(day)
        values.append(daily_values.get(day))
        day += timedelta(days=1)
    return expected_dates, values


def _is_sufficient_output(station_id: str) -> tuple[bool, int]:
    output_path = CLIMATOLOGY_DIR / f"{station_id}.json"
    if not output_path.exists():
        return False, 0
    try:
        document = json.loads(output_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False, 0
    if document.get("quality") == "sufficient":
        return True, int(document.get("n_valid", 0))
    return False, 0


def build(station_id: str | None = None, force: bool = False) -> int:
    stations = json.loads(STATIONS_PATH.read_text(encoding="utf-8"))
    if station_id is not None:
        stations = [station for station in stations if station["id"] == station_id]
        if not stations:
            print(f"Unknown station id: {station_id}")
            return 2
    CLIMATOLOGY_DIR.mkdir(parents=True, exist_ok=True)

    failed_stations: list[str] = []
    with httpx.Client() as client:
        for station_index, station in enumerate(stations):
            station_id_value = str(station["id"])
            if not force:
                already_built, valid_count = _is_sufficient_output(station_id_value)
                if already_built:
                    print(
                        f"{station_id_value} years=1991-2020 elapsed=0.00s "
                        f"HTTP status=SKIPPED valid values={valid_count} "
                        "(sufficient output exists)"
                    )
                    if station_index < len(stations) - 1:
                        time.sleep(2)
                    continue

            station_started = time.monotonic()
            combined_dates: list[date] = []
            combined_values: list[float | None] = []
            chunk_statuses: list[str] = []
            station_failed = False

            for chunk_start, chunk_end in CHUNKS:
                label = f"{chunk_start.year}-{chunk_end.year}"
                try:
                    dates, values, status, elapsed = _fetch_chunk(
                        client,
                        station,
                        chunk_start,
                        chunk_end,
                    )
                    chunk_statuses.append(status)
                    combined_dates.extend(dates)
                    combined_values.extend(values)
                    valid_count = _valid_value_count(values)
                except ArchiveChunkError as error:
                    elapsed = error.elapsed
                    status = error.status
                    valid_count = 0
                    print(
                        f"{station_id_value} chunk={error.chunk} "
                        f"elapsed={elapsed:.2f}s HTTP status={status} "
                        f"valid values={valid_count}"
                    )
                    print(
                        f"Failed station {station_id_value}, chunk "
                        f"{error.chunk}, status {status}."
                    )
                    failed_stations.append(station_id_value)
                    station_failed = True
                    break

                print(
                    f"{station_id_value} chunk={label} elapsed={elapsed:.2f}s "
                    f"HTTP status={status} valid values={valid_count}"
                )

            station_elapsed = time.monotonic() - station_started
            if station_failed:
                print(
                    f"{station_id_value} years=1991-2020 "
                    f"elapsed={station_elapsed:.2f}s "
                    f"HTTP status=FAILED valid values="
                    f"{_valid_value_count(combined_values)}"
                )
                if station_index < len(stations) - 1:
                    time.sleep(2)
                continue

            dates, values = _align_requested_dates(combined_dates, combined_values)
            normals, n_expected, n_valid = compute_normals(dates, values)
            sufficient = n_expected > 0 and n_valid / n_expected >= 0.9
            document = {
                "station": station,
                "latitude": station["latitude"],
                "longitude": station["longitude"],
                "source": SOURCE,
                "model": MODEL,
                "baseline": "1991-2020",
                "units": "degC",
                "resolution_note": (
                    "ERA5 ~0.25 deg, ~25 km; grid-cell value, not a station value"
                ),
                "method": METHOD,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "n_expected": n_expected,
                "n_valid": n_valid,
                "quality": "sufficient" if sufficient else "insufficient",
                "normals": normals if sufficient else {},
            }
            output_path = CLIMATOLOGY_DIR / f"{station_id_value}.json"
            output_path.write_text(
                json.dumps(document, indent=2) + "\n",
                encoding="utf-8",
            )
            print(
                f"{station_id_value} years=1991-2020 "
                f"elapsed={station_elapsed:.2f}s "
                f"HTTP status={','.join(chunk_statuses)} "
                f"valid values={n_valid}; {document['quality']} "
                f"({n_valid}/{n_expected}); wrote {output_path}"
            )
            if station_index < len(stations) - 1:
                time.sleep(2)

    if failed_stations:
        print(f"Failed stations: {', '.join(failed_stations)}")
        return 1
    print("Failed stations: none")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--station")
    arguments = parser.parse_args()
    raise SystemExit(build(station_id=arguments.station, force=arguments.force))
