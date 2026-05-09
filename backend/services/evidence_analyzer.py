from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from services.location_resolver import extract_exif_gps, resolve_location

SAFETY_NOTE = "Decision support only. Not connected to emergency services."


def _match_analysis(text: str) -> Dict[str, Any]:
    normalized = text.lower()

    if any(token in normalized for token in ("smoke", "fire", "wildfire", "flames")):
        return {
            "incident_type": "wildfire",
            "title": "Wildfire escalation report",
            "severity": "high",
            "priority": "P1",
            "confidence": 0.84,
            "evidence_findings": [
                "Rule-based fallback analysis matched smoke or fire indicators.",
                "Potential spread or air-quality impact requires human review.",
            ],
            "recommended_resources": [
                "Wildfire suppression unit",
                "Evacuation coordination support",
                "Air quality monitoring",
            ],
        }

    if any(token in normalized for token in ("trapped", "injured", "medical")):
        return {
            "incident_type": "rescue_medical",
            "title": "Rescue or medical escalation",
            "severity": "critical",
            "priority": "P0",
            "confidence": 0.9,
            "evidence_findings": [
                "Rule-based fallback analysis matched rescue or medical distress language.",
                "Potential life-safety impact requires immediate operator review.",
            ],
            "recommended_resources": [
                "Ambulance or medical team",
                "Rescue extraction support",
                "Incident commander review",
            ],
        }

    if any(token in normalized for token in ("flood", "water", "river")):
        return {
            "incident_type": "flood",
            "title": "Flood impact report",
            "severity": "high",
            "priority": "P1",
            "confidence": 0.82,
            "evidence_findings": [
                "Rule-based fallback analysis matched flood or water-impact indicators.",
                "Access and safety conditions should be verified by human operators.",
            ],
            "recommended_resources": [
                "Flood response crew",
                "Water rescue vehicle",
                "Road access control",
            ],
        }

    if any(token in normalized for token in ("collapsed", "road", "damage")):
        return {
            "incident_type": "infrastructure_damage",
            "title": "Infrastructure damage assessment",
            "severity": "medium",
            "priority": "P2",
            "confidence": 0.75,
            "evidence_findings": [
                "Rule-based fallback analysis matched road or structural damage keywords.",
                "Site inspection is needed before operational dispatch decisions.",
            ],
            "recommended_resources": [
                "Public works inspection team",
                "Traffic control support",
                "Safety perimeter materials",
            ],
        }

    return {
        "incident_type": "field_report",
        "title": "Field report pending classification",
        "severity": "medium",
        "priority": "P2",
        "confidence": 0.68,
        "evidence_findings": [
            "Rule-based fallback analysis did not find a stronger emergency pattern.",
            "Human review is needed to validate incident type and urgency.",
        ],
        "recommended_resources": [
            "Operations desk review",
            "Field verification follow-up",
        ],
    }


def analyze_evidence(
    *,
    report_text: str,
    location_text: Optional[str],
    image_filename: Optional[str],
    image_content_type: Optional[str],
    image_bytes: Optional[bytes],
    audio_filename: Optional[str],
    audio_content_type: Optional[str],
    audio_bytes: Optional[bytes],
    client_lat: Optional[float],
    client_lng: Optional[float],
    location_source: Optional[str],
) -> Dict[str, Any]:
    combined_text = " ".join(
        part for part in [report_text or "", location_text or "", image_filename or "", audio_filename or ""] if part
    )
    matched = _match_analysis(combined_text)
    location = resolve_location(
        client_lat=client_lat,
        client_lng=client_lng,
        location_source=location_source,
        location_text=location_text,
        image_bytes=image_bytes,
    )
    image_exif_found = extract_exif_gps(image_bytes or b"") is not None

    summary_parts: List[str] = [
        "Rule-based fallback analysis processed submitted evidence.",
        f"Incident classified as {matched['incident_type']} with {matched['severity']} severity.",
    ]
    if location["source"] == "unknown":
        summary_parts.append("Location is pending human review because no reliable source was available.")
    else:
        summary_parts.append(f"Location source: {location['source']}.")

    return {
        "incident_id": str(uuid.uuid4()),
        "incident_type": matched["incident_type"],
        "title": matched["title"],
        "summary": " ".join(summary_parts),
        "severity": matched["severity"],
        "priority": matched["priority"],
        "location": location,
        "evidence": {
            "image": {
                "filename": image_filename,
                "content_type": image_content_type,
                "size_bytes": len(image_bytes) if image_bytes is not None else None,
                "exif_gps_found": image_exif_found,
            },
            "audio": {
                "filename": audio_filename,
                "content_type": audio_content_type,
                "size_bytes": len(audio_bytes) if audio_bytes is not None else None,
                "transcript": None,
                "status": "received_not_transcribed" if audio_bytes is not None else None,
            },
            "text": {
                "report_text": report_text,
                "location_text": location_text or "",
            },
        },
        "evidence_findings": matched["evidence_findings"],
        "recommended_resources": matched["recommended_resources"],
        "confidence": matched["confidence"],
        "human_review_required": True,
        "safety_note": SAFETY_NOTE,
    }
