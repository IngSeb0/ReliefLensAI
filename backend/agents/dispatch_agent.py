from __future__ import annotations
import logging
from typing import Any, List

from schemas.dispatch import DispatchMessage
from schemas.incident import Incident
from schemas.resource import ResourceRecommendation
from skills.generate_dispatch_message import generate_dispatch_message

logger = logging.getLogger(__name__)


class DispatchAgent:
    def __init__(self, vllm_client: Any = None) -> None:
        self.vllm_client = vllm_client

    async def run(
        self,
        incidents: List[Incident],
        all_resources: List[ResourceRecommendation],
    ) -> List[DispatchMessage]:
        logger.info("DispatchAgent: generating messages for %d incidents", len(incidents))
        messages: List[DispatchMessage] = []
        resource_by_incident = {}
        for r in all_resources:
            resource_by_incident.setdefault(r.incident_id, []).append(r)

        for incident in incidents:
            incident_resources = resource_by_incident.get(incident.id, [])
            msg = await generate_dispatch_message(
                incident,
                incident_resources,
                channel="radio",
                vllm_client=self.vllm_client,
            )
            messages.append(msg)

        logger.info("DispatchAgent: generated %d dispatch messages", len(messages))
        return messages
