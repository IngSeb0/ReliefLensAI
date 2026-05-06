from __future__ import annotations
import logging

from core.config import get_settings
from schemas.report import ReportInput
from skills.caption_image import caption_image

logger = logging.getLogger(__name__)


class VisionAgent:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def run(self, report: ReportInput) -> str:
        logger.debug("VisionAgent processing report %s", report.id)
        image_path = report.file_path or ""
        if not image_path and report.content:
            image_path = report.content

        result = await caption_image(image_path, demo_mode=self.settings.demo_mode)
        caption: str = result.get("caption", "")
        hazards = result.get("hazards", [])
        if hazards:
            caption += f" Hazards identified: {', '.join(hazards)}."

        logger.info("Captioned image report %s: %.80s...", report.id, caption)
        return caption
