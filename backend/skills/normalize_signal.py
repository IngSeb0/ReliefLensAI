from __future__ import annotations
import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_SIGNAL_KEYWORDS: Dict[str, list] = {
    "person_trapped": ["atrapado", "trapped", "encerrado", "no puede salir", "rescatar", "techo", "rooftop"],
    "medical_emergency": ["herido", "injured", "médico", "medical", "paramédico", "ambulancia", "fractura", "inconsciente", "sangre"],
    "structural_damage": ["derrumbe", "collapse", "pared", "wall", "edificio", "building", "escombros", "debris", "grieta"],
    "flood": ["inundación", "flood", "agua", "water", "nivel", "sube", "corriente", "creciente"],
    "missing_person": ["desaparecido", "missing", "no aparece", "perdido", "lost", "buscar", "paradero"],
    "resource_request": ["necesitamos", "need", "falta", "sin", "without", "suministros", "supplies", "comida", "food", "agua"],
    "safe_status": ["estamos bien", "safe", "a salvo", "sin heridos", "no hay heridos", "refugiados", "shelter"],
    "fire": ["fuego", "fire", "incendio", "humo", "smoke", "llamas", "flames"],
}


def _infer_signal_type(text: str) -> str:
    text_lower = text.lower()
    scores: Dict[str, int] = {}
    for stype, keywords in _SIGNAL_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[stype] = score
    if not scores:
        return "unknown"
    return max(scores, key=lambda k: scores[k])


def _extract_affected_people(text: str) -> Optional[int]:
    patterns = [
        r"(\d+)\s*(?:personas|people|familias|families|vecinos|residents|niños|adults|adultos)",
        r"(?:unas?|aproximadamente|about|around)\s+(\d+)",
        r"(\d+)\s*(?:heridos|injured|atrapados|trapped)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


async def normalize_signal(
    raw_text: str,
    modality: str,
    report_id: str,
    vllm_client: Any = None,
) -> Dict[str, Any]:
    from skills.extract_location import extract_location

    signal_type = _infer_signal_type(raw_text)
    location_data = await extract_location(raw_text)
    affected = _extract_affected_people(raw_text)

    confidence = 0.75
    if location_data["confidence"] > 0.8:
        confidence += 0.05
    if signal_type != "unknown":
        confidence += 0.05
    if affected is not None:
        confidence += 0.05
    confidence = min(confidence, 1.0)

    if vllm_client is not None:
        try:
            prompt = (
                f"Extract structured disaster signal data from this report:\n\n\"{raw_text}\"\n\n"
                f"Return JSON with keys: signal_type, description, location, affected_people (int or null), confidence (0-1).\n"
                f"signal_type must be one of: structural_damage, person_trapped, medical_emergency, flood, fire, missing_person, resource_request, safe_status, unknown."
            )
            result = await vllm_client.complete_json(prompt)
            if result and "signal_type" in result:
                signal_type = result.get("signal_type", signal_type)
                confidence = float(result.get("confidence", confidence))
                if result.get("affected_people"):
                    affected = result["affected_people"]
                if result.get("location") and not location_data["location_name"]:
                    location_data["location_name"] = result["location"]
        except Exception as exc:
            logger.warning("LLM normalization failed, using heuristics: %s", exc)

    description = raw_text[:200] if len(raw_text) > 200 else raw_text

    return {
        "source_report_id": report_id,
        "signal_type": signal_type,
        "description": description,
        "location": location_data.get("location_name"),
        "coordinates": location_data.get("coordinates"),
        "affected_people": affected,
        "raw_text": raw_text,
        "confidence": round(confidence, 3),
        "modality": modality,
        "created_at": datetime.utcnow().isoformat(),
    }
