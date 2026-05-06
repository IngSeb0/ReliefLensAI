from __future__ import annotations
import logging
from datetime import datetime

from schemas.signal import NormalizedSignal, SignalType
from skills.normalize_signal import normalize_signal

logger = logging.getLogger(__name__)


class NormalizationAgent:
    def __init__(self, vllm_client=None) -> None:
        self.vllm_client = vllm_client

    async def run(self, raw_text: str, report_id: str, modality: str) -> NormalizedSignal:
        logger.debug("NormalizationAgent processing text from report %s", report_id)
        data = await normalize_signal(raw_text, modality, report_id, vllm_client=self.vllm_client)

        signal_type_str = data.get("signal_type", "unknown")
        try:
            signal_type = SignalType(signal_type_str)
        except ValueError:
            signal_type = SignalType.UNKNOWN

        created_raw = data.get("created_at", datetime.utcnow().isoformat())
        if isinstance(created_raw, str):
            try:
                created_at = datetime.fromisoformat(created_raw)
            except ValueError:
                created_at = datetime.utcnow()
        else:
            created_at = created_raw

        return NormalizedSignal(
            source_report_id=report_id,
            signal_type=signal_type,
            description=data.get("description", raw_text[:200]),
            location=data.get("location"),
            coordinates=data.get("coordinates"),
            affected_people=data.get("affected_people"),
            raw_text=raw_text,
            confidence=data.get("confidence", 0.7),
            modality=modality,
            created_at=created_at,
        )
