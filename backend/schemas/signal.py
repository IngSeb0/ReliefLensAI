from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
import uuid

from pydantic import BaseModel, Field


class SignalType(str, Enum):
    STRUCTURAL_DAMAGE = "structural_damage"
    PERSON_TRAPPED = "person_trapped"
    MEDICAL_EMERGENCY = "medical_emergency"
    FLOOD = "flood"
    FIRE = "fire"
    MISSING_PERSON = "missing_person"
    RESOURCE_REQUEST = "resource_request"
    SAFE_STATUS = "safe_status"
    UNKNOWN = "unknown"


class NormalizedSignal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_report_id: str
    signal_type: SignalType
    description: str
    location: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    affected_people: Optional[int] = None
    raw_text: str
    confidence: float = Field(ge=0.0, le=1.0)
    modality: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
