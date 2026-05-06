from __future__ import annotations
from enum import Enum
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class ResourceType(str, Enum):
    RESCUE_TEAM = "rescue_team"
    MEDICAL = "medical"
    WATER = "water"
    FOOD = "food"
    SHELTER = "shelter"
    TRANSPORT = "transport"
    COMMUNICATION = "communication"
    STRUCTURAL = "structural"


class ResourceRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incident_id: str
    resource_type: ResourceType
    description: str
    quantity: Optional[int] = None
    urgency: str  # immediate, within_hour, within_day
    rationale: str
