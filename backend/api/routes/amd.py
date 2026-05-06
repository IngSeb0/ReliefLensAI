from __future__ import annotations

from fastapi import APIRouter

from core.config import get_settings
from schemas.amd import AMDPerformanceMetric
from skills.fetch_amd_metrics import fetch_amd_metrics

router = APIRouter(prefix="/amd", tags=["amd"])


@router.get("/performance", response_model=AMDPerformanceMetric)
async def get_amd_performance() -> AMDPerformanceMetric:
    settings = get_settings()
    return await fetch_amd_metrics(settings.vllm_base_url, demo_mode=settings.demo_mode)
