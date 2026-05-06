from __future__ import annotations
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from schemas.report import ReportInput, ReportType, UploadBatch
from services.pipeline import Pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/demo", tags=["demo"])

_SCENARIO_PATH = Path(__file__).resolve().parents[3] / "demo_data" / "scenario_flood_santa_ana.json"


def _load_scenario() -> Dict[str, Any]:
    if _SCENARIO_PATH.exists():
        return json.loads(_SCENARIO_PATH.read_text(encoding="utf-8"))
    return {
        "scenario_name": "Inundación Barrio Santa Ana",
        "description": "Demo scenario — file not found",
        "reports": [],
    }


@router.get("/scenario")
async def get_demo_scenario() -> Dict[str, Any]:
    return _load_scenario()


@router.post("/run")
async def run_demo() -> Dict[str, Any]:
    scenario = _load_scenario()
    session_id = str(uuid.uuid4())
    reports: List[ReportInput] = []

    for raw in scenario.get("reports", []):
        rtype_str = raw.get("report_type", "text")
        try:
            rtype = ReportType(rtype_str)
        except ValueError:
            rtype = ReportType.TEXT

        reports.append(ReportInput(
            id=raw.get("id", str(uuid.uuid4())),
            session_id=session_id,
            report_type=rtype,
            content=raw.get("content"),
            metadata=raw.get("metadata", {}),
            created_at=datetime.utcnow(),
        ))

    batch = UploadBatch(
        session_id=session_id,
        reports=reports,
        scenario_name=scenario.get("scenario_name", "Demo"),
    )

    pipeline = Pipeline()
    try:
        summary = await pipeline.process_batch(batch)
    except Exception as exc:
        logger.exception("Demo pipeline error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return summary.model_dump(mode="json")
