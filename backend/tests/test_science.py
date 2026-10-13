from datetime import date

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.science.heatwave import (
    IMDDayInput,
    classify_imd_day,
    evaluate_consecutive,
)
from backend.science.thermal import (
    heat_index_noaa,
    wbgt_estimate_bom,
    wet_bulb_stull,
)

client = TestClient(app)


def test_heat_index_chart_spot_checks() -> None:
    # NOAA/NWS chart/calculator: https://www.weather.gov/safety/heat-index
    ninety_f = heat_index_noaa((90 - 32) * 5 / 9, 70)
    eighty_f = heat_index_noaa((80 - 32) * 5 / 9, 40)
    nws_example = heat_index_noaa((96 - 32) * 5 / 9, 65)

    assert ninety_f.value_f == pytest.approx(105, abs=1.5)
    assert eighty_f.value_f == pytest.approx(80, abs=1.5)
    assert nws_example.value_f == pytest.approx(121, abs=1.5)
    assert ninety_f.method_used == "Rothfusz regression"


def test_heat_index_threshold_and_adjustment_boundaries() -> None:
    at_80 = heat_index_noaa((80 - 32) * 5 / 9, 40)
    assert at_80.method_used == "Steadman simple formula"
    assert at_80.adjustment_applied is None

    at_13 = heat_index_noaa(40, 13)
    at_85 = heat_index_noaa(30, 85)
    assert at_13.adjustment_applied is None
    assert at_85.adjustment_applied is None

    below_13 = heat_index_noaa(40, 12.9)
    above_85 = heat_index_noaa(30, 85.1)
    assert below_13.adjustment_applied is not None
    assert above_85.adjustment_applied is not None


def test_heat_index_bands() -> None:
    caution = heat_index_noaa((85 - 32) * 5 / 9, 40)
    danger = heat_index_noaa((105 - 32) * 5 / 9, 50)
    assert caution.band == "Caution"
    assert danger.band in ("Danger", "Extreme Danger")


def test_wet_bulb_range_flag_and_wbgt_label() -> None:
    normal_wet_bulb = wet_bulb_stull(30, 60)
    flagged_wet_bulb = wet_bulb_stull(51, 60)
    estimated_wbgt = wbgt_estimate_bom(30, 60)

    assert not normal_wet_bulb.out_of_range
    assert flagged_wet_bulb.out_of_range
    assert estimated_wbgt.label == "estimate, shade/no-radiation"
    assert estimated_wbgt.value_c > 0


@pytest.mark.parametrize(
    ("temp_c", "rh"),
    [
        (None, 50),
        (30, None),
        (float("nan"), 50),
        (30, float("nan")),
        (30, -0.1),
        (30, 100.1),
    ],
)
def test_thermal_functions_reject_invalid_inputs(
    temp_c: float | None, rh: float | None
) -> None:
    with pytest.raises(ValueError):
        heat_index_noaa(temp_c, rh)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        wet_bulb_stull(temp_c, rh)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        wbgt_estimate_bom(temp_c, rh)  # type: ignore[arg-type]


def test_imd_plains_boundaries() -> None:
    at_minimum = classify_imd_day(40, 35.5, "plains")
    assert at_minimum.category == "heatwave"
    assert at_minimum.departure_c == pytest.approx(4.5)

    just_below_minimum = classify_imd_day(39.9, 35.4, "plains")
    assert just_below_minimum.category == "no_heatwave"

    severe_departure = classify_imd_day(40, 33.5, "plains")
    assert severe_departure.category == "severe_heatwave"

    absolute_heatwave = classify_imd_day(45, 44, "plains")
    absolute_severe = classify_imd_day(47, 46, "plains")
    assert "plains_tmax_at_least_45_c" in absolute_heatwave.criteria_triggered
    assert absolute_heatwave.category == "heatwave"
    assert absolute_severe.category == "severe_heatwave"


def test_imd_hilly_and_coastal_thresholds() -> None:
    hilly = classify_imd_day(30, 25.5, "hilly")
    coastal = classify_imd_day(37, 32.5, "coastal")

    assert hilly.category == "heatwave"
    assert coastal.category == "heatwave"


def test_consecutive_requires_adjacent_qualifying_days() -> None:
    days = [
        IMDDayInput(day=date(2026, 5, 1), tmax_c=40, normal_tmax_c=35.5, region="plains"),
        IMDDayInput(day=date(2026, 5, 2), tmax_c=40, normal_tmax_c=35.5, region="plains"),
    ]
    evaluation = evaluate_consecutive(days)

    assert evaluation.flagged
    assert evaluation.qualifying_periods[0].days == 2
    assert evaluation.diagnostic_note == (
        "diagnostic, gridded single-point; not an official IMD declaration"
    )

    gap = evaluate_consecutive(
        [
            days[0],
            IMDDayInput(
                day=date(2026, 5, 3),
                tmax_c=40,
                normal_tmax_c=35.5,
                region="plains",
            ),
        ]
    )
    assert not gap.flagged


def test_thermal_endpoint_and_health_route_unchanged() -> None:
    response = client.get("/api/thermal", params={"temp_c": 32.2, "rh": 70})
    assert response.status_code == 200
    assert set(response.json()) == {"heat_index", "wet_bulb", "wbgt"}

    assert client.get("/api/thermal", params={"temp_c": 32.2}).status_code == 422
    assert (
        client.get("/api/thermal", params={"temp_c": 32.2, "rh": 101}).status_code
        == 422
    )
    assert client.get("/api/health").json() == {
        "status": "ok",
        "app": "HeatTrick",
    }
