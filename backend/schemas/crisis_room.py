from __future__ import annotations
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel

from .amd import AMDPerformanceMetric
from .dispatch import DispatchMessage
from .incident import Incident
from .resource import ResourceRecommendation


class CrisisRoomSummary(BaseModel):
    session_id: str
    scenario_name: str
    total_reports: int
    total_signals: int
    total_incidents: int
    incidents_by_priority: Dict[str, int]
    critical_incidents: List[Incident]
    resource_recommendations: List[ResourceRecommendation]
    dispatch_messages: List[DispatchMessage]
    amd_metrics: Optional[AMDPerformanceMetric] = None
    processing_time_seconds: float
    created_at: datetime
    status: str  # processing, ready, error
