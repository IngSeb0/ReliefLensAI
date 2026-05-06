from __future__ import annotations
from typing import List

from schemas.signal import NormalizedSignal


async def calculate_confidence(signals: List[NormalizedSignal]) -> float:
    if not signals:
        return 0.0

    weights = {
        "text": 1.0,
        "audio": 0.9,
        "image": 1.1,
        "csv": 0.8,
        "location": 0.7,
    }

    total_weight = 0.0
    weighted_sum = 0.0
    for signal in signals:
        w = weights.get(signal.modality, 1.0)
        weighted_sum += signal.confidence * w
        total_weight += w

    if total_weight == 0:
        return 0.0

    base = weighted_sum / total_weight

    count_bonus = min(0.05 * (len(signals) - 1), 0.15)
    return round(min(base + count_bonus, 1.0), 3)
