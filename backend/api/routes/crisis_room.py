from __future__ import annotations
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from schemas.crisis_room import CrisisRoomSummary
from schemas.report import UploadBatch
from services.pipeline import Pipeline
from services.storage import get_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/crisis-room", tags=["crisis-room"])


class CrisisRoomRequest(BaseModel):
    batch: UploadBatch
    session_id: Optional[str] = None


@router.post("", response_model=CrisisRoomSummary)
async def create_crisis_room(request: CrisisRoomRequest) -> CrisisRoomSummary:
    if request.session_id:
        request.batch.session_id = request.session_id
    pipeline = Pipeline()
    try:
        summary = await pipeline.process_batch(request.batch)
    except Exception as exc:
        logger.exception("Pipeline error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")
    return summary


@router.get("/{session_id}", response_model=dict)
async def get_crisis_room(session_id: str) -> dict:
    storage = get_storage()
    session = await storage.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return session
