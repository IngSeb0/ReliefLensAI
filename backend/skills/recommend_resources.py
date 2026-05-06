from __future__ import annotations
import uuid
from typing import Any, List

from schemas.incident import Incident, Priority
from schemas.resource import ResourceRecommendation, ResourceType

_RESOURCE_MAP = {
    "person_trapped": [
        (ResourceType.RESCUE_TEAM, "Equipo de rescate urbano/acuático", 2, "immediate"),
        (ResourceType.MEDICAL, "Paramédicos con equipo de trauma", 2, "immediate"),
        (ResourceType.TRANSPORT, "Lancha de rescate o helicóptero", 1, "immediate"),
    ],
    "medical_emergency": [
        (ResourceType.MEDICAL, "Unidad médica de emergencia", 1, "immediate"),
        (ResourceType.TRANSPORT, "Ambulancia o transporte médico", 1, "immediate"),
    ],
    "structural_damage": [
        (ResourceType.STRUCTURAL, "Equipo de evaluación estructural", 1, "within_hour"),
        (ResourceType.RESCUE_TEAM, "Brigada de rescate entre escombros", 1, "within_hour"),
    ],
    "flood": [
        (ResourceType.RESCUE_TEAM, "Equipo de rescate acuático", 2, "immediate"),
        (ResourceType.TRANSPORT, "Lanchas de evacuación", 3, "immediate"),
        (ResourceType.WATER, "Agua potable embotellada", 200, "within_hour"),
        (ResourceType.FOOD, "Raciones alimentarias de emergencia", 100, "within_hour"),
    ],
    "resource_request": [
        (ResourceType.FOOD, "Alimentos no perecederos", 50, "within_hour"),
        (ResourceType.WATER, "Agua potable", 100, "within_hour"),
        (ResourceType.SHELTER, "Kits de refugio temporal", 10, "within_day"),
    ],
    "missing_person": [
        (ResourceType.COMMUNICATION, "Equipo de comunicación y rastreo", 1, "within_hour"),
        (ResourceType.RESCUE_TEAM, "Brigada de búsqueda y rescate", 1, "within_hour"),
    ],
    "fire": [
        (ResourceType.RESCUE_TEAM, "Cuerpo de bomberos", 2, "immediate"),
        (ResourceType.MEDICAL, "Equipo médico para quemados", 1, "immediate"),
        (ResourceType.WATER, "Agua para extinción", 1000, "immediate"),
    ],
    "safe_status": [
        (ResourceType.SHELTER, "Registro en refugio temporal", 1, "within_day"),
    ],
    "unknown": [
        (ResourceType.COMMUNICATION, "Equipo de evaluación inicial", 1, "within_hour"),
    ],
}


async def recommend_resources(
    incident: Incident,
    vllm_client: Any = None,
) -> List[ResourceRecommendation]:
    signal_type_str = "unknown"
    if incident.signal_ids:
        description_lower = incident.description.lower()
        for stype in _RESOURCE_MAP:
            if stype.replace("_", " ") in description_lower or stype in description_lower:
                signal_type_str = stype
                break
        if signal_type_str == "unknown":
            if "atrapado" in description_lower or "trapped" in description_lower:
                signal_type_str = "person_trapped"
            elif "médico" in description_lower or "medical" in description_lower or "herido" in description_lower:
                signal_type_str = "medical_emergency"
            elif "inundación" in description_lower or "flood" in description_lower or "agua" in description_lower:
                signal_type_str = "flood"
            elif "derrumbe" in description_lower or "collapse" in description_lower:
                signal_type_str = "structural_damage"
            elif "falta" in description_lower or "necesitamos" in description_lower or "supplies" in description_lower:
                signal_type_str = "resource_request"

    templates = _RESOURCE_MAP.get(signal_type_str, _RESOURCE_MAP["unknown"])

    if incident.priority == Priority.P0:
        urgency_override = "immediate"
    elif incident.priority == Priority.P1:
        urgency_override = "immediate"
    else:
        urgency_override = None

    recommendations: List[ResourceRecommendation] = []
    for rtype, desc, qty, urgency in templates:
        effective_urgency = urgency_override if urgency_override and urgency != "immediate" else urgency
        recommendations.append(
            ResourceRecommendation(
                id=str(uuid.uuid4()),
                incident_id=incident.id,
                resource_type=rtype,
                description=desc,
                quantity=qty,
                urgency=effective_urgency,
                rationale=f"Requerido por incidente {incident.priority.value}: {incident.title[:60]}",
            )
        )
    return recommendations
