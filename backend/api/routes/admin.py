from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.config import Settings, get_settings
from services.admin_auth import create_access_token, require_admin
from services.storage import get_storage
from skills.fetch_amd_metrics import fetch_amd_metrics

router = APIRouter(prefix="/admin", tags=["admin"])


class LoginRequest(BaseModel):
    username: str
    password: str


class IncidentAdminUpdate(BaseModel):
    status: str | None = None
    reviewed: bool | None = None
    admin_notes: str | None = None
    assigned_team: str | None = None


_ALLOWED_STATUSES = {"new", "triaged", "in_review", "dispatched", "resolved", "rejected", "received"}


@router.post("/login")
async def admin_login(payload: LoginRequest, settings: Settings = Depends(get_settings)) -> Dict[str, Any]:
    if payload.username != settings.admin_username or payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(payload.username, settings)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.admin_token_expire_minutes * 60,
    }


@router.get("/me")
async def admin_me(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    return {
        "username": admin["sub"],
        "role": "admin",
    }


@router.get("/incidents")
async def admin_list_incidents(admin: Dict[str, Any] = Depends(require_admin)) -> list[dict]:
    del admin
    storage = get_storage()
    incidents = await storage.list_incidents()
    return sorted(incidents, key=lambda item: item.get("updated_at", ""), reverse=True)


@router.get("/incidents/{incident_id}")
async def admin_get_incident(incident_id: str, admin: Dict[str, Any] = Depends(require_admin)) -> dict:
    del admin
    storage = get_storage()
    incident = await storage.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/incidents/{incident_id}")
async def admin_patch_incident(
    incident_id: str,
    payload: IncidentAdminUpdate,
    admin: Dict[str, Any] = Depends(require_admin),
) -> dict:
    storage = get_storage()
    incident = await storage.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "status" in updates and updates["status"] not in _ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    updates["updated_at"] = datetime.utcnow().isoformat()
    updates["last_reviewed_by"] = admin["sub"]

    updated = await storage.update_incident(incident_id, updates)
    if updated is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return updated


@router.get("/telemetry")
async def admin_telemetry(
    admin: Dict[str, Any] = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> dict:
    del admin
    amd_metrics = await fetch_amd_metrics(settings.vllm_base_url, demo_mode=settings.demo_mode)
    return {
        "health": "healthy",
        "demo_mode": settings.demo_mode,
        "app_env": settings.app_env,
        "amd_metrics": amd_metrics.model_dump(mode="json"),
        "rocm_status": "available" if amd_metrics.model_name != "unavailable" else "unavailable",
    }
