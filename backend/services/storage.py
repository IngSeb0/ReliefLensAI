from __future__ import annotations
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from functools import lru_cache

from core.config import get_settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._cache: Dict[str, Any] = {}
        self._lock = asyncio.Lock()
        self.base_path = Path(self.settings.storage_path)

    def _ensure_dirs(self) -> None:
        for sub in ("sessions", "incidents", "signals", "resources", "dispatch"):
            (self.base_path / sub).mkdir(parents=True, exist_ok=True)

    def _path(self, collection: str, item_id: str) -> Path:
        return self.base_path / collection / f"{item_id}.json"

    async def _write(self, collection: str, item_id: str, data: Dict[str, Any]) -> None:
        self._ensure_dirs()
        cache_key = f"{collection}:{item_id}"
        async with self._lock:
            self._cache[cache_key] = data
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._sync_write, collection, item_id, data)

    def _sync_write(self, collection: str, item_id: str, data: Dict[str, Any]) -> None:
        path = self._path(collection, item_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, default=str), encoding="utf-8")

    async def _read(self, collection: str, item_id: str) -> Optional[Dict[str, Any]]:
        cache_key = f"{collection}:{item_id}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        path = self._path(collection, item_id)
        if not path.exists():
            return None
        try:
            data: Dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
            self._cache[cache_key] = data
            return data
        except Exception as exc:
            logger.error("Failed to read %s: %s", path, exc)
            return None

    async def _list(self, collection: str) -> List[Dict[str, Any]]:
        self._ensure_dirs()
        folder = self.base_path / collection
        items: List[Dict[str, Any]] = []
        for fp in folder.glob("*.json"):
            try:
                items.append(json.loads(fp.read_text(encoding="utf-8")))
            except Exception as exc:
                logger.warning("Skip corrupt file %s: %s", fp, exc)
        return items

    async def save_session(self, session_id: str, data: Dict[str, Any]) -> None:
        await self._write("sessions", session_id, data)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return await self._read("sessions", session_id)

    async def save_incident(self, incident_id: str, data: Dict[str, Any]) -> None:
        await self._write("incidents", incident_id, data)

    async def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        return await self._read("incidents", incident_id)

    async def list_incidents(self) -> List[Dict[str, Any]]:
        return await self._list("incidents")

    async def find_incident_by_tracking_code(self, tracking_code: str) -> Optional[Dict[str, Any]]:
        incidents = await self.list_incidents()
        for incident in incidents:
            if incident.get("tracking_code") == tracking_code:
                return incident
        return None

    async def save_signal(self, signal_id: str, data: Dict[str, Any]) -> None:
        await self._write("signals", signal_id, data)

    async def get_signal(self, signal_id: str) -> Optional[Dict[str, Any]]:
        return await self._read("signals", signal_id)

    async def list_signals(self) -> List[Dict[str, Any]]:
        return await self._list("signals")

    async def save_resource(self, resource_id: str, data: Dict[str, Any]) -> None:
        await self._write("resources", resource_id, data)

    async def list_resources(self) -> List[Dict[str, Any]]:
        return await self._list("resources")

    async def save_dispatch(self, dispatch_id: str, data: Dict[str, Any]) -> None:
        await self._write("dispatch", dispatch_id, data)

    async def list_dispatch(self) -> List[Dict[str, Any]]:
        return await self._list("dispatch")

    async def update_incident(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = await self.get_incident(incident_id)
        if existing is None:
            return None
        existing.update(updates)
        await self.save_incident(incident_id, existing)
        return existing


@lru_cache()
def get_storage() -> StorageService:
    return StorageService()
