from __future__ import annotations
import logging
from typing import Any, List

from schemas.incident import Incident
from schemas.resource import ResourceRecommendation
from skills.recommend_resources import recommend_resources

logger = logging.getLogger(__name__)


class ResourceAgent:
    def __init__(self, vllm_client: Any = None) -> None:
        self.vllm_client = vllm_client

    async def run(self, incidents: List[Incident]) -> List[ResourceRecommendation]:
        logger.info("ResourceAgent: generating recommendations for %d incidents", len(incidents))
        all_recommendations: List[ResourceRecommendation] = []
        for incident in incidents:
            recs = await recommend_resources(incident, self.vllm_client)
            all_recommendations.extend(recs)
        logger.info("ResourceAgent: generated %d total recommendations", len(all_recommendations))
        return all_recommendations
