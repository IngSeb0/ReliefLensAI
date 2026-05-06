from __future__ import annotations
from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class DispatchMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incident_id: str
    channel: str  # radio, whatsapp, sms, email
    message: str
    brigade_target: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved: bool = False
