from __future__ import annotations
import logging
import uuid
from datetime import datetime
from typing import Any, List, Optional

from schemas.incident import EvidenceItem, Incident, IncidentStatus, Priority
from schemas.signal import NormalizedSignal, SignalType
from skills.calculate_confidence import calculate_confidence
from skills.classify_priority import classify_priority

logger = logging.getLogger(__name__)

_PRIORITY_ORDER = {Priority.P0: 0, Priority.P1: 1, Priority.P2: 2, Priority.P3: 3}


class TriageAgent:
    def __init__(self, session_id: str, vllm_client: Any = None) -> None:
        self.session_id = session_id
        self.vllm_client = vllm_client

    async def run(self, signals: List[NormalizedSignal]) -> List[Incident]:
        logger.info("TriageAgent: creating incidents from %d signals", len(signals))
        incidents: List[Incident] = []

        groups: dict = {}
        for signal in signals:
            key = (signal.signal_type, signal.location or "unknown")
            groups.setdefault(key, []).append(signal)

        for (signal_type, location), group_signals in groups.items():
            priority = await classify_priority(group_signals[0], self.vllm_client)

            total_affected: Optional[int] = None
            for s in group_signals:
                if s.affected_people:
                    total_affected = (total_affected or 0) + s.affected_people

            confidence = await calculate_confidence(group_signals)
            title = self._make_title(signal_type, location)
            description = self._make_description(signal_type, location, group_signals, total_affected)

            coords = next((s.coordinates for s in group_signals if s.coordinates), None)
            evidence = [
                EvidenceItem(
                    report_id=s.source_report_id,
                    modality=s.modality,
                    description=s.description[:150],
                )
                for s in group_signals
            ]

            incident = Incident(
                id=str(uuid.uuid4()),
                session_id=self.session_id,
                title=title,
                description=description,
                priority=priority,
                status=IncidentStatus.NEW,
                signal_ids=[s.id for s in group_signals],
                evidence=evidence,
                location=location if location != "unknown" else None,
                coordinates=coords,
                affected_people=total_affected,
                confidence=confidence,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            incidents.append(incident)

        incidents.sort(key=lambda x: _PRIORITY_ORDER.get(x.priority, 99))
        logger.info("TriageAgent: created %d incidents", len(incidents))
        return incidents

    def _make_title(self, signal_type: SignalType, location: str) -> str:
        type_labels = {
            SignalType.PERSON_TRAPPED: "Persona(s) Atrapada(s)",
            SignalType.MEDICAL_EMERGENCY: "Emergencia Médica",
            SignalType.STRUCTURAL_DAMAGE: "Daño Estructural",
            SignalType.FLOOD: "Inundación",
            SignalType.FIRE: "Incendio",
            SignalType.MISSING_PERSON: "Persona Desaparecida",
            SignalType.RESOURCE_REQUEST: "Solicitud de Recursos",
            SignalType.SAFE_STATUS: "Reporte de Seguridad",
            SignalType.UNKNOWN: "Incidente Desconocido",
        }
        label = type_labels.get(signal_type, "Incidente")
        loc = location.title() if location and location != "unknown" else "Barrio Santa Ana"
        return f"{label} — {loc}"

    def _make_description(
        self,
        signal_type: SignalType,
        location: str,
        signals: List[NormalizedSignal],
        affected: Optional[int],
    ) -> str:
        parts = [f"Tipo: {signal_type.value.replace('_', ' ').title()}."]
        if location and location != "unknown":
            parts.append(f"Ubicación: {location}.")
        if affected:
            parts.append(f"Personas afectadas estimadas: {affected}.")
        parts.append(f"Basado en {len(signals)} señal(es) recibida(s).")
        if signals:
            parts.append(f"Reporte más reciente: {signals[-1].description[:100]}.")
        return " ".join(parts)
