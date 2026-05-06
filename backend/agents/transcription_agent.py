from __future__ import annotations
import logging

from core.config import get_settings
from schemas.report import ReportInput
from skills.transcribe_audio import transcribe_audio

logger = logging.getLogger(__name__)


class TranscriptionAgent:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def run(self, report: ReportInput) -> str:
        logger.debug("TranscriptionAgent processing report %s", report.id)
        file_path = report.file_path or ""
        if not file_path and report.content:
            file_path = report.content

        result = await transcribe_audio(file_path, demo_mode=self.settings.demo_mode)
        transcription: str = result.get("transcription", "")
        logger.info(
            "Transcribed audio report %s: %.50s... (confidence=%.2f)",
            report.id,
            transcription,
            result.get("confidence", 0),
        )
        return transcription
