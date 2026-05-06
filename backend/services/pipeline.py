from __future__ import annotations
import asyncio
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List

from agents.dedup_agent import DedupAgent
from agents.dispatch_agent import DispatchAgent
from agents.intake_agent import IntakeAgent
from agents.normalization_agent import NormalizationAgent
from agents.resource_agent import ResourceAgent
from agents.triage_agent import TriageAgent
from agents.transcription_agent import TranscriptionAgent
from agents.vision_agent import VisionAgent
from core.config import get_settings
from schemas.crisis_room import CrisisRoomSummary
from schemas.incident import Incident, Priority
from schemas.report import ReportInput, ReportType, UploadBatch
from schemas.signal import NormalizedSignal
from services.storage import get_storage
from services.vllm_client import get_vllm_client
from skills.fetch_amd_metrics import fetch_amd_metrics

logger = logging.getLogger(__name__)


class Pipeline:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.storage = get_storage()
        self.vllm = get_vllm_client()

    async def process_batch(self, batch: UploadBatch) -> CrisisRoomSummary:
        t_start = time.monotonic()
        session_id = batch.session_id
        scenario_name = batch.scenario_name or "Disaster Response Session"

        logger.info("Pipeline: processing batch session=%s (%d reports)", session_id, len(batch.reports))

        await self.storage.save_session(session_id, {
            "session_id": session_id,
            "scenario_name": scenario_name,
            "total_reports": len(batch.reports),
            "status": "processing",
            "created_at": datetime.utcnow().isoformat(),
        })

        # Step 1: Intake
        intake_agent = IntakeAgent()
        raw_signals: List[NormalizedSignal] = []
        for report in batch.reports:
            sig = await intake_agent.run(report)
            raw_signals.append(sig)

        # Step 2 & 3: Transcription + Vision (in parallel)
        transcription_agent = TranscriptionAgent()
        vision_agent = VisionAgent()
        normalization_agent = NormalizationAgent(vllm_client=self.vllm)

        text_signals: List[NormalizedSignal] = []

        audio_reports = [r for r in batch.reports if r.report_type == ReportType.AUDIO]
        image_reports = [r for r in batch.reports if r.report_type == ReportType.IMAGE]
        text_reports = [r for r in batch.reports if r.report_type in (ReportType.TEXT, ReportType.CSV, ReportType.LOCATION)]

        async def process_audio(report: ReportInput) -> NormalizedSignal:
            transcription = await transcription_agent.run(report)
            return await normalization_agent.run(transcription, report.id, "audio")

        async def process_image(report: ReportInput) -> NormalizedSignal:
            caption = await vision_agent.run(report)
            return await normalization_agent.run(caption, report.id, "image")

        async def process_text(report: ReportInput) -> NormalizedSignal:
            content = report.content or ""
            return await normalization_agent.run(content, report.id, report.report_type.value)

        tasks = (
            [process_audio(r) for r in audio_reports]
            + [process_image(r) for r in image_reports]
            + [process_text(r) for r in text_reports]
        )

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, NormalizedSignal):
                    text_signals.append(result)
                elif isinstance(result, Exception):
                    logger.warning("Signal processing error: %s", result)

        all_signals = text_signals if text_signals else raw_signals

        # Step 5: Dedup
        dedup_agent = DedupAgent(threshold=0.75)
        unique_signals = await dedup_agent.run(all_signals)

        # Save signals
        for signal in unique_signals:
            await self.storage.save_signal(signal.id, signal.model_dump(mode="json"))

        # Step 6: Triage
        triage_agent = TriageAgent(session_id=session_id, vllm_client=self.vllm)
        incidents = await triage_agent.run(unique_signals)
        for incident in incidents:
            await self.storage.save_incident(incident.id, incident.model_dump(mode="json"))

        # Step 7: Resources
        resource_agent = ResourceAgent(vllm_client=self.vllm)
        resources = await resource_agent.run(incidents)
        for resource in resources:
            await self.storage.save_resource(resource.id, resource.model_dump(mode="json"))

        # Step 8: Dispatch
        dispatch_agent = DispatchAgent(vllm_client=self.vllm)
        dispatch_messages = await dispatch_agent.run(incidents, resources)
        for msg in dispatch_messages:
            await self.storage.save_dispatch(msg.id, msg.model_dump(mode="json"))

        # Step 9: AMD metrics
        amd_metrics = await fetch_amd_metrics(
            self.settings.vllm_base_url,
            demo_mode=self.settings.demo_mode,
        )

        # Step 10: Build summary
        incidents_by_priority: Dict[str, int] = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
        for inc in incidents:
            incidents_by_priority[inc.priority.value] += 1

        critical = [i for i in incidents if i.priority in (Priority.P0, Priority.P1)]

        processing_time = time.monotonic() - t_start

        summary = CrisisRoomSummary(
            session_id=session_id,
            scenario_name=scenario_name,
            total_reports=len(batch.reports),
            total_signals=len(unique_signals),
            total_incidents=len(incidents),
            incidents_by_priority=incidents_by_priority,
            critical_incidents=critical,
            resource_recommendations=resources,
            dispatch_messages=dispatch_messages,
            amd_metrics=amd_metrics,
            processing_time_seconds=round(processing_time, 2),
            created_at=datetime.utcnow(),
            status="ready",
        )

        await self.storage.save_session(session_id, {
            "session_id": session_id,
            "scenario_name": scenario_name,
            "total_reports": len(batch.reports),
            "total_signals": len(unique_signals),
            "total_incidents": len(incidents),
            "status": "ready",
            "processing_time_seconds": round(processing_time, 2),
            "created_at": datetime.utcnow().isoformat(),
        })

        logger.info(
            "Pipeline complete: session=%s incidents=%d time=%.2fs",
            session_id,
            len(incidents),
            processing_time,
        )
        return summary
