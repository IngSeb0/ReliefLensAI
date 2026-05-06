from __future__ import annotations
import asyncio
import json
import logging
import time
from functools import lru_cache
from typing import Any, Dict, Optional

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

_DEMO_RESPONSES: Dict[str, str] = {
    "normalize": json.dumps({
        "signal_type": "flood",
        "description": "Inundación reportada en Barrio Santa Ana, agua alcanza 1.5 metros",
        "location": "Barrio Santa Ana",
        "coordinates": {"lat": 10.4806, "lon": -66.9036},
        "affected_people": 30,
        "confidence": 0.92,
    }),
    "classify": json.dumps({"priority": "P1", "rationale": "Urgente — comunidad sin vías de evacuación"}),
    "resources": json.dumps([
        {"resource_type": "rescue_team", "description": "Equipo de rescate acuático", "quantity": 2, "urgency": "immediate", "rationale": "Personas atrapadas en techos"},
        {"resource_type": "medical", "description": "Paramédicos con botiquín de trauma", "quantity": 4, "urgency": "immediate", "rationale": "Posibles heridos"},
        {"resource_type": "water", "description": "Agua potable embotellada", "quantity": 500, "urgency": "within_hour", "rationale": "Contaminación del suministro local"},
    ]),
    "dispatch": "ALERTA P1 - Barrio Santa Ana: Inundación severa, familias en techos. Recursos: 2 equipos rescate acuático, 4 paramédicos, 500 botellas agua. Coordinar con: Brigada Norte. Contacto: Canal 7.",
}


class VLLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._request_count = 0
        self._total_latency_ms = 0.0

    async def complete(self, prompt: str, system: str = "", max_tokens: int = 1000) -> str:
        if self.settings.demo_mode:
            await asyncio.sleep(0.05)
            for key, val in _DEMO_RESPONSES.items():
                if key in prompt.lower():
                    return val
            return _DEMO_RESPONSES["normalize"]

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                payload = {
                    "model": self.settings.vllm_model,
                    "messages": [
                        {"role": "system", "content": system or "You are a helpful disaster response assistant."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.1,
                }
                resp = await client.post(
                    f"{self.settings.vllm_base_url}/chat/completions",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.settings.vllm_api_key}"},
                )
                resp.raise_for_status()
                data = resp.json()
                content: str = data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.warning("vLLM complete failed: %s", exc)
            return _DEMO_RESPONSES["normalize"]
        finally:
            elapsed = (time.monotonic() - t0) * 1000
            self._total_latency_ms += elapsed
            self._request_count += 1
        return content

    async def complete_json(self, prompt: str, system: str = "", schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        raw = await self.complete(prompt, system=system)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from LLM response, returning empty dict")
            return {}

    async def caption_image(self, image_base64: str, prompt: str = "") -> str:
        if self.settings.demo_mode:
            await asyncio.sleep(0.05)
            return (
                "Flooded street in residential area. Water level approximately 1.2 meters. "
                "A family of four visible on rooftop waving for help. Submerged vehicles. "
                "Single-story homes partially underwater. Power lines dangerously close to water."
            )

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                payload = {
                    "model": self.settings.vllm_vision_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                                {"type": "text", "text": prompt or "Describe this disaster scene in detail. Focus on victims, structural damage, and immediate hazards."},
                            ],
                        }
                    ],
                    "max_tokens": 500,
                }
                resp = await client.post(
                    f"{self.settings.vllm_base_url}/chat/completions",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.settings.vllm_api_key}"},
                )
                resp.raise_for_status()
                data = resp.json()
                caption: str = data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.warning("vLLM caption_image failed: %s", exc)
            caption = "Image analysis unavailable — vLLM connection error."
        finally:
            elapsed = (time.monotonic() - t0) * 1000
            self._total_latency_ms += elapsed
            self._request_count += 1
        return caption

    @property
    def avg_latency_ms(self) -> float:
        if self._request_count == 0:
            return 0.0
        return self._total_latency_ms / self._request_count


@lru_cache()
def get_vllm_client() -> VLLMClient:
    return VLLMClient()
