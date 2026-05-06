from __future__ import annotations
import logging
from typing import Any, Optional

from schemas.incident import Priority
from schemas.signal import NormalizedSignal, SignalType

logger = logging.getLogger(__name__)

_PRIORITY_RULES = {
    SignalType.PERSON_TRAPPED: Priority.P0,
    SignalType.MEDICAL_EMERGENCY: Priority.P0,
    SignalType.FIRE: Priority.P0,
    SignalType.STRUCTURAL_DAMAGE: Priority.P1,
    SignalType.MISSING_PERSON: Priority.P1,
    SignalType.FLOOD: Priority.P1,
    SignalType.RESOURCE_REQUEST: Priority.P2,
    SignalType.SAFE_STATUS: Priority.P3,
    SignalType.UNKNOWN: Priority.P2,
}

_P0_KEYWORDS = ["atrapado", "trapped", "no puede salir", "inconsciente", "unconscious", "no respira", "not breathing", "critical", "crítico", "sangre", "bleeding", "niño solo", "child alone"]
_P1_KEYWORDS = ["urgente", "urgent", "rescate", "rescue", "evacuar", "evacuate", "herido", "injured", "derrumbe", "collapse"]


async def classify_priority(
    signal: NormalizedSignal,
    vllm_client: Any = None,
) -> Priority:
    base = _PRIORITY_RULES.get(signal.signal_type, Priority.P2)

    text_lower = signal.raw_text.lower()

    if any(kw in text_lower for kw in _P0_KEYWORDS):
        if base in (Priority.P1, Priority.P2):
            logger.debug("Upgrading signal %s to P0 due to critical keywords", signal.id)
            return Priority.P0

    if any(kw in text_lower for kw in _P1_KEYWORDS):
        if base == Priority.P2:
            logger.debug("Upgrading signal %s to P1 due to urgency keywords", signal.id)
            return Priority.P1

    if signal.affected_people and signal.affected_people > 20:
        if base == Priority.P2:
            return Priority.P1
        if base == Priority.P1:
            return Priority.P0

    return base
