from __future__ import annotations
import logging
from typing import List

from schemas.signal import NormalizedSignal
from skills.detect_duplicates import detect_duplicates

logger = logging.getLogger(__name__)


class DedupAgent:
    def __init__(self, threshold: float = 0.75) -> None:
        self.threshold = threshold

    async def run(self, signals: List[NormalizedSignal]) -> List[NormalizedSignal]:
        logger.info("DedupAgent: processing %d signals", len(signals))
        unique = await detect_duplicates(signals, threshold=self.threshold)
        logger.info("DedupAgent: %d unique signals after dedup", len(unique))
        return unique
