from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, Field


class ReportType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"
    IMAGE = "image"
    CSV = "csv"
    LOCATION = "location"


class ReportInput(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    report_type: ReportType
    content: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UploadBatch(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reports: List[ReportInput]
    scenario_name: Optional[str] = None
