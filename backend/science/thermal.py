import math
from typing import Literal

from pydantic import BaseModel


class ThermalResult(BaseModel):
    inputs: dict[str, float]
    units: dict[str, str]
    method: str
    citation_keys: list[str]
    limitations: list[str]


class HeatIndexResult(ThermalResult):
    value_c: float
    value_f: float
    band: Literal[
        "Caution",
        "Extreme Caution",
        "Danger",
        "Extreme Danger",
        "below threshold",
    ]
    method_used: str
    adjustment_applied: str | None


class WetBulbResult(ThermalResult):
    value_c: float
    out_of_range: bool


class WBGTResult(ThermalResult):
    value_c: float
    label: Literal["estimate, shade/no-radiation"]


def _validated_inputs(temp_c: float, rh: float) -> tuple[float, float]:
    if (
        isinstance(temp_c, bool)
        or not isinstance(temp_c, (int, float))
        or not math.isfinite(temp_c)
    ):
        raise ValueError("temp_c must be a finite number.")
    if (
        isinstance(rh, bool)
        or not isinstance(rh, (int, float))
        or not math.isfinite(rh)
    ):
        raise ValueError("rh must be a finite number.")
    if not 0 <= rh <= 100:
        raise ValueError("rh must be between 0 and 100 percent.")
    return float(temp_c), float(rh)


def heat_index_noaa(temp_c: float, rh: float) -> HeatIndexResult:
    temp_c, rh = _validated_inputs(temp_c, rh)
    temp_f = temp_c * 9 / 5 + 32

    simple_index_f = 0.5 * (
        temp_f + 61 + (temp_f - 68) * 1.2 + rh * 0.094
    )
    simple_index_f = (simple_index_f + temp_f) / 2
    method_used = "Steadman simple formula"
    adjustment_applied = None
    value_f = simple_index_f

    if simple_index_f >= 80:
        method_used = "Rothfusz regression"
        value_f = (
            -42.379
            + 2.04901523 * temp_f
            + 10.14333127 * rh
            - 0.22475541 * temp_f * rh
            - 0.00683783 * temp_f**2
            - 0.05481717 * rh**2
            + 0.00122874 * temp_f**2 * rh
            + 0.00085282 * temp_f * rh**2
            - 0.00000199 * temp_f**2 * rh**2
        )

        if rh < 13 and 80 <= temp_f <= 112:
            adjustment = (
                (13 - rh)
                / 4
                * math.sqrt((17 - abs(temp_f - 95)) / 17)
            )
            value_f -= adjustment
            adjustment_applied = f"low-humidity adjustment (-{adjustment:.2f} °F)"
        elif rh > 85 and 80 <= temp_f <= 87:
            adjustment = (rh - 85) / 10 * (87 - temp_f) / 5
            value_f += adjustment
            adjustment_applied = (
                f"high-humidity adjustment (+{adjustment:.2f} °F)"
            )

    band = (
        "below threshold"
        if value_f < 80
        else "Caution"
        if value_f < 90
        else "Extreme Caution"
        if value_f < 103
        else "Danger"
        if value_f < 125
        else "Extreme Danger"
    )

    return HeatIndexResult(
        inputs={"temp_c": temp_c, "rh": rh},
        units={"temp_c": "°C", "rh": "%", "value_c": "°C", "value_f": "°F"},
        method="NOAA/NWS heat-index procedure",
        citation_keys=["rothfusz1990"],
        limitations=[
            "Designed for shady, light-wind conditions; direct sunshine can "
            "raise the apparent heat index.",
            "The regression is intended for elevated heat-index conditions "
            "and is used here only when the Steadman screening average is "
            "at least 80 °F.",
        ],
        value_c=(value_f - 32) * 5 / 9,
        value_f=value_f,
        band=band,
        method_used=method_used,
        adjustment_applied=adjustment_applied,
    )


def wet_bulb_stull(temp_c: float, rh: float) -> WetBulbResult:
    temp_c, rh = _validated_inputs(temp_c, rh)
    value_c = (
        temp_c * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(temp_c + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * rh**1.5 * math.atan(0.023101 * rh)
        - 4.686035
    )

    return WetBulbResult(
        inputs={"temp_c": temp_c, "rh": rh},
        units={"temp_c": "°C", "rh": "%", "value_c": "°C"},
        method="Stull (2011) wet-bulb approximation",
        citation_keys=["stull2011"],
        limitations=[
            "Approximation is outside its recommended range when RH is not "
            "5–99% or air temperature is not −20–50 °C.",
            "Does not account for pressure, wind, or radiation.",
        ],
        value_c=value_c,
        out_of_range=not (5 <= rh <= 99 and -20 <= temp_c <= 50),
    )


def wbgt_estimate_bom(temp_c: float, rh: float) -> WBGTResult:
    temp_c, rh = _validated_inputs(temp_c, rh)
    denominator = 237.7 + temp_c
    if denominator == 0:
        raise ValueError("temp_c makes the vapor-pressure formula undefined.")

    exponent = 17.27 * temp_c / denominator
    try:
        vapor_pressure = rh / 100 * 6.105 * math.exp(exponent)
    except OverflowError as err:
        raise ValueError("Inputs exceed the vapor-pressure formula range.") from err
    value_c = 0.567 * temp_c + 0.393 * vapor_pressure + 3.94
    if not math.isfinite(value_c):
        raise ValueError("Inputs exceed the WBGT estimate's numeric range.")

    return WBGTResult(
        inputs={"temp_c": temp_c, "rh": rh},
        units={"temp_c": "°C", "rh": "%", "value_c": "°C"},
        method="Bureau of Meteorology simplified WBGT estimate",
        citation_keys=["liljegren2008"],
        limitations=[
            "Estimate for shade/no-radiation conditions; not a measured WBGT.",
            "Does not account for wind speed, solar load, clothing, or "
            "individual physiology.",
        ],
        value_c=value_c,
        label="estimate, shade/no-radiation",
    )
