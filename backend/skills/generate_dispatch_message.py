from __future__ import annotations
from typing import Any, List, Optional

from schemas.dispatch import DispatchMessage
from schemas.incident import Incident, Priority
from schemas.resource import ResourceRecommendation

_BRIGADE_MAP = {
    Priority.P0: "Brigada Alfa — Rescate Crítico",
    Priority.P1: "Brigada Beta — Respuesta Urgente",
    Priority.P2: "Brigada Gamma — Apoyo Logístico",
    Priority.P3: "Brigada Delta — Monitoreo",
}


async def generate_dispatch_message(
    incident: Incident,
    resources: List[ResourceRecommendation],
    channel: str = "radio",
    vllm_client: Any = None,
) -> DispatchMessage:
    brigade = _BRIGADE_MAP.get(incident.priority, "Brigada General")
    location_str = incident.location or "ubicación desconocida"
    people_str = f" — {incident.affected_people} personas afectadas" if incident.affected_people else ""

    resource_lines = []
    for r in resources[:3]:
        qty = f"{r.quantity}x " if r.quantity else ""
        resource_lines.append(f"{qty}{r.description}")
    resource_summary = ", ".join(resource_lines) if resource_lines else "evaluando recursos"

    message = (
        f"ALERTA {incident.priority.value} — {location_str.title()}: "
        f"{incident.description[:120]}{people_str}. "
        f"Recursos necesarios: {resource_summary}. "
        f"Coordinar con: {brigade}. "
        f"ID incidente: {incident.id[:8]}. CAMBIO."
    )

    return DispatchMessage(
        incident_id=incident.id,
        channel=channel,
        message=message,
        brigade_target=brigade,
        approved=False,
    )
