from __future__ import annotations
import logging
from typing import List, Set

from schemas.signal import NormalizedSignal

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> Set[str]:
    return set(text.lower().split())


def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 1.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0


async def detect_duplicates(
    signals: List[NormalizedSignal],
    threshold: float = 0.75,
) -> List[NormalizedSignal]:
    if len(signals) <= 1:
        return signals

    unique: List[NormalizedSignal] = []
    tokenized = [_tokenize(s.raw_text) for s in signals]

    for i, signal in enumerate(signals):
        is_dup = False
        for j, kept in enumerate(unique):
            kept_idx = signals.index(kept)
            sim = _jaccard(tokenized[i], tokenized[kept_idx])
            if sim >= threshold:
                is_dup = True
                logger.debug(
                    "Signal %s is duplicate of %s (jaccard=%.2f)",
                    signal.id,
                    kept.id,
                    sim,
                )
                break
        if not is_dup:
            unique.append(signal)

    logger.info("Dedup: %d → %d signals (removed %d duplicates)", len(signals), len(unique), len(signals) - len(unique))
    return unique
