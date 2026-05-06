from __future__ import annotations
import asyncio
from datetime import datetime
from typing import Optional

from schemas.amd import AMDPerformanceMetric


_DEMO_METRICS = AMDPerformanceMetric(
    timestamp=datetime.utcnow(),
    gpu_utilization=87.4,
    memory_used_gb=182.3,
    memory_total_gb=192.0,
    tokens_per_second=2340.5,
    requests_processed=128,
    avg_latency_ms=312.7,
    model_name="Qwen/Qwen2.5-72B-Instruct",
    rocm_version="6.1.0",
    power_watts=680.2,
)


async def fetch_amd_metrics(
    vllm_base_url: str,
    demo_mode: bool = True,
) -> AMDPerformanceMetric:
    if demo_mode:
        await asyncio.sleep(0.01)
        return AMDPerformanceMetric(
            timestamp=datetime.utcnow(),
            gpu_utilization=_DEMO_METRICS.gpu_utilization,
            memory_used_gb=_DEMO_METRICS.memory_used_gb,
            memory_total_gb=_DEMO_METRICS.memory_total_gb,
            tokens_per_second=_DEMO_METRICS.tokens_per_second,
            requests_processed=_DEMO_METRICS.requests_processed,
            avg_latency_ms=_DEMO_METRICS.avg_latency_ms,
            model_name=_DEMO_METRICS.model_name,
            rocm_version=_DEMO_METRICS.rocm_version,
            power_watts=_DEMO_METRICS.power_watts,
        )

    try:
        import httpx

        async with httpx.AsyncClient(timeout=5) as client:
            base = vllm_base_url.rstrip("/v1").rstrip("/")
            resp = await client.get(f"{base}/metrics")
            resp.raise_for_status()
            text = resp.text

            def parse_metric(name: str, default: float = 0.0) -> float:
                for line in text.splitlines():
                    if line.startswith(name) and not line.startswith("#"):
                        parts = line.split()
                        if len(parts) >= 2:
                            try:
                                return float(parts[1])
                            except ValueError:
                                pass
                return default

            return AMDPerformanceMetric(
                timestamp=datetime.utcnow(),
                gpu_utilization=parse_metric("vllm:gpu_cache_usage_perc") * 100,
                memory_used_gb=parse_metric("vllm:gpu_memory_used_bytes") / (1024 ** 3),
                memory_total_gb=192.0,
                tokens_per_second=parse_metric("vllm:tokens_per_second"),
                requests_processed=int(parse_metric("vllm:num_requests_running")),
                avg_latency_ms=parse_metric("vllm:e2e_request_latency_seconds_sum") * 1000,
                model_name="Qwen/Qwen2.5-72B-Instruct",
                rocm_version=None,
                power_watts=None,
            )
    except Exception:
        return AMDPerformanceMetric(
            timestamp=datetime.utcnow(),
            gpu_utilization=0.0,
            memory_used_gb=0.0,
            memory_total_gb=192.0,
            tokens_per_second=0.0,
            requests_processed=0,
            avg_latency_ms=0.0,
            model_name="unavailable",
            rocm_version=None,
            power_watts=None,
        )
