from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, File, HTTPException, Form, UploadFile

from schemas.report import ReportInput, ReportType, UploadBatch
from services.evidence_analyzer import analyze_evidence
from services.pipeline import Pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/demo", tags=["demo"])

_SCENARIO_PATH = Path(__file__).resolve().parents[3] / "demo_data" / "scenario_flood_santa_ana.json"
_SAFETY_NOTE = "Decision support only. Not connected to emergency services."

_DEMO_INCIDENTS: List[Dict[str, Any]] = [
    {
        "incident_id": "demo-wildfire-hillside",
        "incident_type": "wildfire",
        "title": "Wildfire smoke plume near hillside homes",
        "summary": "Residents report active smoke movement across a residential slope with narrowing access roads.",
        "severity": "high",
        "priority": "P1",
        "location": {
            "lat": 33.7455,
            "lng": -117.8677,
            "label": "Hillside neighborhood, Santa Ana demo zone",
            "source": "text_location",
            "confidence": 0.6,
        },
        "evidence": {
            "image": {"filename": "wildfire-plume.jpg", "content_type": "image/jpeg", "size_bytes": 248000, "exif_gps_found": False},
            "audio": {"filename": None, "content_type": None, "size_bytes": None, "transcript": None, "status": None},
            "text": {"report_text": "Smoke moving across homes near the hillside.", "location_text": "Santa Ana hillside neighborhood"},
        },
        "evidence_findings": [
            "Rule-based fallback analysis matched smoke or fire indicators.",
            "Human review is required before dispatching external resources.",
        ],
        "recommended_resources": ["Wildfire suppression unit", "Evacuation coordination support", "Air quality monitoring"],
        "confidence": 0.84,
        "human_review_required": True,
        "safety_note": _SAFETY_NOTE,
        "updated_at": "2026-05-09T10:15:00Z",
        "evidence_count": 3,
    },
    {
        "incident_id": "demo-flood-roadway",
        "incident_type": "flood",
        "title": "Flooded roadway blocking neighborhood access",
        "summary": "Road surface is submerged and vehicle access is restricted along the main connector route.",
        "severity": "high",
        "priority": "P1",
        "location": {
            "lat": 33.7542,
            "lng": -117.8549,
            "label": "Main connector road, Santa Ana demo zone",
            "source": "text_location",
            "confidence": 0.6,
        },
        "evidence": {
            "image": {"filename": "flooded-road.jpg", "content_type": "image/jpeg", "size_bytes": 214000, "exif_gps_found": False},
            "audio": {"filename": None, "content_type": None, "size_bytes": None, "transcript": None, "status": None},
            "text": {"report_text": "Flooded access road with stranded vehicles.", "location_text": "Santa Ana access road"},
        },
        "evidence_findings": [
            "Rule-based fallback analysis matched flood or water-impact indicators.",
            "Access and safety conditions should be validated by a human operator.",
        ],
        "recommended_resources": ["Flood response crew", "Water rescue vehicle", "Road access control"],
        "confidence": 0.82,
        "human_review_required": True,
        "safety_note": _SAFETY_NOTE,
        "updated_at": "2026-05-09T10:18:00Z",
        "evidence_count": 2,
    },
    {
        "incident_id": "demo-medical-assist",
        "incident_type": "rescue_medical",
        "title": "Medical assistance request at community shelter",
        "summary": "Shelter staff report an injured evacuee requiring stabilization and transfer coordination.",
        "severity": "critical",
        "priority": "P0",
        "location": {
            "lat": 33.7511,
            "lng": -117.8714,
            "label": "Community shelter, Santa Ana demo zone",
            "source": "text_location",
            "confidence": 0.6,
        },
        "evidence": {
            "image": {"filename": None, "content_type": None, "size_bytes": None, "exif_gps_found": False},
            "audio": {"filename": "shelter-radio.wav", "content_type": "audio/wav", "size_bytes": 88000, "transcript": None, "status": "received_not_transcribed"},
            "text": {"report_text": "Injured evacuee needs medical help.", "location_text": "Santa Ana community shelter"},
        },
        "evidence_findings": [
            "Rule-based fallback analysis matched rescue or medical distress language.",
            "Potential life-safety impact requires immediate operator review.",
        ],
        "recommended_resources": ["Ambulance or medical team", "Rescue extraction support", "Incident commander review"],
        "confidence": 0.9,
        "human_review_required": True,
        "safety_note": _SAFETY_NOTE,
        "updated_at": "2026-05-09T10:20:00Z",
        "evidence_count": 1,
    },
]


def _load_scenario() -> Dict[str, Any]:
    if _SCENARIO_PATH.exists():
        return json.loads(_SCENARIO_PATH.read_text(encoding="utf-8"))
    return {
        "scenario_name": "Inundacion Barrio Santa Ana",
        "description": "Demo scenario - file not found",
        "reports": [],
    }


@router.get("/scenario")
async def get_demo_scenario() -> Dict[str, Any]:
    return _load_scenario()


@router.get("/incidents")
async def get_demo_incidents() -> List[Dict[str, Any]]:
    return _DEMO_INCIDENTS


@router.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    report_text: str = Form(...),
    lat: float | None = Form(default=None),
    lng: float | None = Form(default=None),
    location_text: str | None = Form(default=None),
) -> Dict[str, Any]:
    image_bytes = await image.read()
    location_source = "map_click" if lat is not None and lng is not None else None

    return analyze_evidence(
        report_text=report_text,
        location_text=location_text,
        image_filename=image.filename,
        image_content_type=image.content_type,
        image_bytes=image_bytes,
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=lat,
        client_lng=lng,
        location_source=location_source,
    )


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

        reports.append(
            ReportInput(
                id=raw.get("id", str(uuid.uuid4())),
                session_id=session_id,
                report_type=rtype,
                content=raw.get("content"),
                metadata=raw.get("metadata", {}),
                created_at=datetime.utcnow(),
            )
        )

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
