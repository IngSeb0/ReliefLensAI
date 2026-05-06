from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import amd, crisis_room, demo, incidents, reports
from core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    storage_path = Path(settings.storage_path)
    for sub in ("sessions", "incidents", "signals", "resources", "dispatch"):
        (storage_path / sub).mkdir(parents=True, exist_ok=True)
    logger.info("ReliefLensAI backend started (demo_mode=%s)", settings.demo_mode)
    yield
    logger.info("ReliefLensAI backend shutting down")


app = FastAPI(
    title="ReliefLensAI",
    description="Real-time multimodal disaster triage system powered by AMD MI300X + vLLM",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crisis_room.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(amd.router, prefix="/api")
app.include_router(demo.router, prefix="/api")


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    settings = get_settings()
    return {
        "status": "healthy",
        "demo_mode": settings.demo_mode,
        "app_env": settings.app_env,
    }


@app.get("/", tags=["root"])
async def root() -> dict:
    return {"name": "ReliefLensAI", "version": "1.0.0", "status": "ready"}
