from __future__ import annotations
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from schemas.dispatch import DispatchMessage
from schemas.incident import Incident, IncidentStatus, Priority
from services.storage import get_storage
from skills.generate_dispatch_message import generate_dispatch_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/incidents", tags=["incidents"])


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    human_approved: Optional[bool] = None
    notes: Optional[str] = None
    priority: Optional[Priority] = None


@router.get("", response_model=List[dict])
async def list_incidents(
    session_id: Optional[str] = Query(default=None),
    priority: Optional[Priority] = Query(default=None),
    status: Optional[IncidentStatus] = Query(default=None),
) -> List[dict]:
    storage = get_storage()
    incidents = await storage.list_incidents()

    if session_id:
        incidents = [i for i in incidents if i.get("session_id") == session_id]
    if priority:
        incidents = [i for i in incidents if i.get("priority") == priority.value]
    if status:
        incidents = [i for i in incidents if i.get("status") == status.value]

    return incidents


@router.get("/{incident_id}", response_model=dict)
async def get_incident(incident_id: str) -> dict:
    storage = get_storage()
    incident = await storage.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return incident


@router.patch("/{incident_id}", response_model=dict)
async def update_incident(incident_id: str, update: IncidentUpdate) -> dict:
    storage = get_storage()
    updates = {k: v for k, v in update.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.utcnow().isoformat()
    if "priority" in updates and isinstance(updates["priority"], Priority):
        updates["priority"] = updates["priority"].value
    if "status" in updates and isinstance(updates["status"], IncidentStatus):
        updates["status"] = updates["status"].value

    updated = await storage.update_incident(incident_id, updates)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return updated


@router.post("/{incident_id}/dispatch-message", response_model=dict)
async def create_dispatch_message(incident_id: str, channel: str = "radio") -> dict:
    storage = get_storage()
    incident_data = await storage.get_incident(incident_id)
    if incident_data is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    incident = Incident(**incident_data)
    all_resources_raw = await storage.list_resources()
    resources = [r for r in all_resources_raw if r.get("incident_id") == incident_id]

    from schemas.resource import ResourceRecommendation
    resource_objs = []
    for r in resources:
        try:
            resource_objs.append(ResourceRecommendation(**r))
        except Exception:
            pass

    msg = await generate_dispatch_message(incident, resource_objs, channel=channel)
    await storage.save_dispatch(msg.id, msg.model_dump(mode="json"))
    return msg.model_dump(mode="json")
