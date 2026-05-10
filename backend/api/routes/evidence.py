from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from services.evidence_analyzer import build_incident_record, public_incident_response
from services.storage import get_storage

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("/intake")
async def evidence_intake(
    image: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    report_text: str = Form(...),
    location_text: str | None = Form(default=None),
    client_lat: float | None = Form(default=None),
    client_lng: float | None = Form(default=None),
    location_source: str | None = Form(default=None),
) -> dict:
    image_bytes = await image.read() if image else None
    audio_bytes = await audio.read() if audio else None

    incident = await build_incident_record(
        report_text=report_text,
        location_text=location_text,
        image_filename=image.filename if image else None,
        image_content_type=image.content_type if image else None,
        image_bytes=image_bytes,
        audio_filename=audio.filename if audio else None,
        audio_content_type=audio.content_type if audio else None,
        audio_bytes=audio_bytes,
        client_lat=client_lat,
        client_lng=client_lng,
        location_source=location_source,
    )
    storage = get_storage()
    await storage.save_incident(incident["incident_id"], incident)
    return public_incident_response(incident)


@router.get("/status/{tracking_code}")
async def get_evidence_status(tracking_code: str) -> dict:
    storage = get_storage()
    incident = await storage.find_incident_by_tracking_code(tracking_code)
    if incident is None:
        return {
            "tracking_code": tracking_code,
            "status": "not_found",
        }
    return public_incident_response(incident)
