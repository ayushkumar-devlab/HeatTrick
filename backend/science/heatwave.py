from datetime import date, timedelta
from typing import Literal

from pydantic import BaseModel

Region = Literal["plains", "hilly", "coastal"]
HeatwaveCategory = Literal["no_heatwave", "heatwave", "severe_heatwave"]


class IMDDayInput(BaseModel):
    day: date
    tmax_c: float
    normal_tmax_c: float
    region: Region


class IMDDayClassification(BaseModel):
    day: date | None = None
    tmax_c: float
    normal_tmax_c: float
    departure_c: float
    region: Region
    category: HeatwaveCategory
    criteria_triggered: list[str]


class ConsecutivePeriod(BaseModel):
    start: date
    end: date
    category: HeatwaveCategory
    days: int


class HeatwaveEvaluation(BaseModel):
    flagged: bool
    days: list[IMDDayClassification]
    qualifying_periods: list[ConsecutivePeriod]
    diagnostic_note: str = (
        "diagnostic, gridded single-point; not an official IMD declaration"
    )
    citation_keys: list[str] = ["imd_heatwave_criteria"]


def classify_imd_day(
    tmax_c: float,
    normal_tmax_c: float,
    region: Region,
) -> IMDDayClassification:
    if region not in ("plains", "hilly", "coastal"):
        raise ValueError("region must be plains, hilly, or coastal.")

    departure_c = tmax_c - normal_tmax_c
    criteria: list[str] = []
    min_tmax = {"plains": 40.0, "hilly": 30.0, "coastal": 37.0}[region]
    if tmax_c < min_tmax:
        return IMDDayClassification(
            tmax_c=tmax_c,
            normal_tmax_c=normal_tmax_c,
            departure_c=departure_c,
            region=region,
            category="no_heatwave",
            criteria_triggered=[],
        )

    category: HeatwaveCategory = "no_heatwave"
    if departure_c > 6.4:
        # IMD's published severe cutoff is >=6.5°C; >6.4°C differs for
        # unrounded values in (6.4, 6.5), but follows the requested threshold.
        category = "severe_heatwave"
        criteria.append("departure_above_6.4_c")
    elif departure_c >= 4.5:
        category = "heatwave"
        criteria.append("departure_4.5_to_6.4_c")

    if region == "plains":
        if tmax_c >= 47:
            category = "severe_heatwave"
            criteria.append("plains_tmax_at_least_47_c")
        elif tmax_c >= 45:
            if category != "severe_heatwave":
                category = "heatwave"
            criteria.append("plains_tmax_at_least_45_c")

    return IMDDayClassification(
        tmax_c=tmax_c,
        normal_tmax_c=normal_tmax_c,
        departure_c=departure_c,
        region=region,
        category=category,
        criteria_triggered=criteria,
    )


def evaluate_consecutive(days: list[IMDDayInput]) -> HeatwaveEvaluation:
    if any(days[index - 1].day >= days[index].day for index in range(1, len(days))):
        raise ValueError("days must be in strictly increasing date order.")

    classifications: list[IMDDayClassification] = []
    for entry in days:
        result = classify_imd_day(
            entry.tmax_c, entry.normal_tmax_c, entry.region
        )
        classifications.append(result.model_copy(update={"day": entry.day}))

    qualifying_periods: list[ConsecutivePeriod] = []
    run: list[IMDDayClassification] = []

    def finish_run() -> None:
        if len(run) < 2:
            return
        start = run[0].day
        end = run[-1].day
        if start is None or end is None:
            raise ValueError("Classified evaluation days must include dates.")
        category: HeatwaveCategory = (
            "severe_heatwave"
            if any(day.category == "severe_heatwave" for day in run)
            else "heatwave"
        )
        qualifying_periods.append(
            ConsecutivePeriod(
                start=start,
                end=end,
                category=category,
                days=len(run),
            )
        )

    for classified in classifications:
        if classified.category == "no_heatwave":
            finish_run()
            run = []
            continue
        if run and (
            classified.day is None
            or run[-1].day is None
            or classified.day != run[-1].day + timedelta(days=1)
        ):
            finish_run()
            run = []
        run.append(classified)

    finish_run()
    return HeatwaveEvaluation(
        flagged=bool(qualifying_periods),
        days=classifications,
        qualifying_periods=qualifying_periods,
    )
