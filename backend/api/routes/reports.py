from __future__ import annotations
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from schemas.report import ReportInput, ReportType, UploadBatch
from services.pipeline import Pipeline
from services.storage import get_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/upload")
async def upload_reports(
    session_id: Optional[str] = Form(default=None),
    scenario_name: Optional[str] = Form(default=None),
    files: List[UploadFile] = File(default=[]),
    text_messages: Optional[str] = Form(default=None),
) -> dict:
    sid = session_id or str(uuid.uuid4())
    reports: List[ReportInput] = []

    if text_messages:
        for i, msg in enumerate(text_messages.split("|||")):
            msg = msg.strip()
            if msg:
                reports.append(ReportInput(
                    id=str(uuid.uuid4()),
                    session_id=sid,
                    report_type=ReportType.TEXT,
                    content=msg,
                    metadata={"source": "upload", "index": i},
                    created_at=datetime.utcnow(),
                ))

    for file in files:
        filename = file.filename or "unknown"
        name_lower = filename.lower()
        if name_lower.endswith((".mp3", ".wav", ".ogg", ".m4a")):
            rtype = ReportType.AUDIO
        elif name_lower.endswith((".jpg", ".jpeg", ".png", ".webp")):
            rtype = ReportType.IMAGE
        elif name_lower.endswith(".csv"):
            rtype = ReportType.CSV
        else:
            rtype = ReportType.TEXT

        content = await file.read()
        reports.append(ReportInput(
            id=str(uuid.uuid4()),
            session_id=sid,
            report_type=rtype,
            content=content.decode("utf-8", errors="replace") if rtype in (ReportType.TEXT, ReportType.CSV) else None,
            file_path=filename,
            metadata={"original_filename": filename, "size_bytes": len(content)},
            created_at=datetime.utcnow(),
        ))

    storage = get_storage()
    await storage.save_session(sid, {
        "session_id": sid,
        "scenario_name": scenario_name,
        "total_reports": len(reports),
        "status": "uploaded",
        "created_at": datetime.utcnow().isoformat(),
    })

    return {"session_id": sid, "batch_id": sid, "report_count": len(reports), "status": "uploaded"}


@router.post("/process")
async def process_batch(batch: UploadBatch) -> dict:
    pipeline = Pipeline()
    try:
        summary = await pipeline.process_batch(batch)
    except Exception as exc:
        logger.exception("Batch processing error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    return summary.model_dump(mode="json")


@router.get("/{session_id}")
async def list_session_reports(session_id: str) -> dict:
    storage = get_storage()
    session = await storage.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return {"session_id": session_id, "session": session}
