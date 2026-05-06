from __future__ import annotations
import logging
from datetime import datetime

from schemas.report import ReportInput, ReportType
from schemas.signal import NormalizedSignal, SignalType

logger = logging.getLogger(__name__)


class IntakeAgent:
    async def run(self, report: ReportInput) -> NormalizedSignal:
        logger.debug("IntakeAgent processing report %s (type=%s)", report.id, report.report_type)

        content = report.content or ""
        modality = report.report_type.value

        if report.report_type == ReportType.LOCATION:
            signal_type = SignalType.FLOOD
            description = f"Location data received: {content[:200]}"
            confidence = 0.70
        elif report.report_type == ReportType.CSV:
            signal_type = SignalType.FLOOD
            description = f"CSV batch data: {content[:200]}"
            confidence = 0.70
        else:
            signal_type = SignalType.UNKNOWN
            description = content[:200] if content else f"Report from {modality}"
            confidence = 0.60

        return NormalizedSignal(
            source_report_id=report.id,
            signal_type=signal_type,
            description=description,
            raw_text=content,
            confidence=confidence,
            modality=modality,
            created_at=datetime.utcnow(),
        )
