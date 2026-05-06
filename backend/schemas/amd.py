from __future__ import annotations
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AMDPerformanceMetric(BaseModel):
    timestamp: datetime
    gpu_utilization: float
    memory_used_gb: float
    memory_total_gb: float
    tokens_per_second: float
    requests_processed: int
    avg_latency_ms: float
    model_name: str
    rocm_version: Optional[str] = None
    power_watts: Optional[float] = None
