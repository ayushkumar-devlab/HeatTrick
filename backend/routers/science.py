import json
from datetime import date
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.science.climatology import get_climatology, get_normal
from backend.science.heatwave import (
    HeatwaveEvaluation,
    IMDDayInput,
    Region,
    evaluate_consecutive,
)
from backend.science.thermal import (
    HeatIndexResult,
    WBGTResult,
    WetBulbResult,
    heat_index_noaa,
    wbgt_estimate_bom,
    wet_bulb_stull,
)

router = APIRouter(prefix="/api")
STATIONS_PATH = Path(__file__).resolve().parents[1] / "data" / "stations.json"


class ThermalResponse(BaseModel):
    heat_index: HeatIndexResult
    wet_bulb: WetBulbResult
    wbgt: WBGTResult


class HeatwaveDayRequest(BaseModel):
    date: date
    tmax_c: float = Field(allow_inf_nan=False)


class HeatwaveDiagnoseRequest(BaseModel):
    station_id: str
    days: list[HeatwaveDayRequest]


class DiagnosedDay(BaseModel):
    date: date
    tmax: float
    normal: float
    departure: float
    category: str
    criterion: list[str]


class ClimatologyBasis(BaseModel):
    baseline: str
    model: str
    resolution: str
    retrieved_at: str


class HeatwaveDiagnoseResponse(BaseModel):
    days: list[DiagnosedDay]
    result: HeatwaveEvaluation
    basis: ClimatologyBasis
    limitations: list[str]


@router.get("/thermal", response_model=ThermalResponse)
def get_thermal(
    temp_c: float = Query(..., description="Air temperature in degrees Celsius"),
    rh: float = Query(..., description="Relative humidity in percent"),
) -> ThermalResponse:
    try:
        return ThermalResponse(
            heat_index=heat_index_noaa(temp_c, rh),
            wet_bulb=wet_bulb_stull(temp_c, rh),
            wbgt=wbgt_estimate_bom(temp_c, rh),
        )
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err


@router.post("/heatwave/diagnose", response_model=HeatwaveDiagnoseResponse)
def diagnose_heatwave(
    request: HeatwaveDiagnoseRequest,
) -> HeatwaveDiagnoseResponse:
    try:
        stations = json.loads(STATIONS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        raise HTTPException(
            status_code=500,
            detail="Station metadata could not be loaded.",
        ) from err

    station = next(
        (entry for entry in stations if entry.get("id") == request.station_id),
        None,
    )
    if station is None:
        raise HTTPException(status_code=404, detail="Unknown station_id.")

    region_names: dict[str, Region] = {
        "Plains": "plains",
        "Hilly": "hilly",
        "Coastal": "coastal",
    }
    try:
        region: Region = region_names[station["imdCriteriaType"]]
        climate = get_climatology(request.station_id)
    except FileNotFoundError as err:
        raise HTTPException(
            status_code=503,
            detail=f"Climatology is not available: {err}",
        ) from err
    except ValueError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except (KeyError, TypeError) as err:
        raise HTTPException(
            status_code=500,
            detail="Station metadata has an invalid region.",
        ) from err

    day_inputs: list[IMDDayInput] = []
    try:
        for requested_day in request.days:
            normal = get_normal(
                request.station_id,
                requested_day.date.strftime("%m-%d"),
            )
            day_inputs.append(
                IMDDayInput(
                    day=requested_day.date,
                    tmax_c=requested_day.tmax_c,
                    normal_tmax_c=normal,
                    region=region,
                )
            )
    except FileNotFoundError as err:
        raise HTTPException(
            status_code=503,
            detail=f"Climatology is not available: {err}",
        ) from err
    except ValueError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err

    try:
        evaluation = evaluate_consecutive(day_inputs)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err

    diagnosed_days = [
        DiagnosedDay(
            date=classified.day,
            tmax=classified.tmax_c,
            normal=classified.normal_tmax_c,
            departure=classified.departure_c,
            category=classified.category,
            criterion=classified.criteria_triggered,
        )
        for classified in evaluation.days
        if classified.day is not None
    ]
    return HeatwaveDiagnoseResponse(
        days=diagnosed_days,
        result=evaluation,
        basis=ClimatologyBasis(
            baseline=climate["baseline"],
            model=climate["model"],
            resolution=climate["resolution_note"],
            retrieved_at=climate["retrieved_at"],
        ),
        limitations=[
            "diagnostic, gridded single-point comparison; not an official IMD declaration; ERA5 normals differ from IMD station normals"
        ],
    )
