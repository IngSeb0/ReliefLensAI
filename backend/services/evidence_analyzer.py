from __future__ import annotations

from datetime import datetime
import uuid
from typing import Any, Dict, List, Optional

from services.llmIncidentAnalyzer import analyze_incident_with_qwen
from services.location_resolver import extract_exif_gps, resolve_location

SAFETY_NOTE = "Decision support only. Not connected to emergency services."

_INCIDENT_TITLES = {
    "flood": "Flood impact report",
    "fire": "Fire escalation report",
    "medical": "Medical incident report",
    "collapse": "Collapse or infrastructure damage assessment",
    "violence": "Violence escalation report",
    "landslide": "Landslide hazard report",
    "rescue_medical": "Rescue or medical escalation",
    "other": "Field report pending classification",
}


def _priority_from_analysis(severity: str, life_safety_risk: bool) -> str:
    if severity == "critical" or life_safety_risk:
        return "P0"
    if severity == "high":
        return "P1"
    if severity == "medium":
        return "P2"
    return "P3"


def _evidence_findings_from_analysis(analysis: Dict[str, Any]) -> List[str]:
    findings = [
        f"{analysis['incident_type']} classification produced by {analysis['analysis_provider']}.",
    ]
    if analysis["life_safety_risk"]:
        findings.append("Potential immediate life-safety impact requires urgent human review.")
    else:
        findings.append("Human review remains required before any operational action.")
    if analysis["detected_risks"]:
        findings.append(f"Detected risks: {', '.join(analysis['detected_risks'])}.")
    return findings


def _normalize_llm_analysis(raw: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {
        "incident_type": raw["incident_type"],
        "title": _INCIDENT_TITLES.get(raw["incident_type"], "Field report pending classification"),
        "severity": raw["severity"],
        "priority": _priority_from_analysis(raw["severity"], raw["life_safety_risk"]),
        "confidence": raw["confidence"],
        "life_safety_risk": raw["life_safety_risk"],
        "detected_risks": raw["detected_risks"],
        "evidence_summary": raw["evidence_summary"],
        "admin_notes": raw["admin_notes"],
        "recommended_resources": raw["recommended_resources"],
        "requires_human_review": raw["requires_human_review"],
        "analysis_provider": "qwen",
    }
    normalized["evidence_findings"] = _evidence_findings_from_analysis(normalized)
    return normalized


def _match_analysis(text: str) -> Dict[str, Any]:
    normalized = text.lower()
    life_safety_tokens = (
        "trapped",
        "injured",
        "medical",
        "unconscious",
        "people may be trapped",
        "rising quickly",
        "rising fast",
        "blocked roads",
    )
    life_safety_risk = any(token in normalized for token in life_safety_tokens)

    if any(token in normalized for token in ("smoke", "fire", "wildfire", "flames")):
        return {
            "incident_type": "fire",
            "title": "Fire escalation report",
            "severity": "critical" if life_safety_risk else "high",
            "priority": "P0" if life_safety_risk else "P1",
            "confidence": 0.9 if life_safety_risk else 0.84,
            "analysis_provider": "rule_based_fallback",
            "life_safety_risk": life_safety_risk,
            "detected_risks": ["fire spread", "smoke exposure"] + (["possible trapped people"] if life_safety_risk else []),
            "evidence_summary": "Reported fire or smoke conditions with potential spread toward occupied areas.",
            "admin_notes": "Verify fire spread, affected structures, and evacuation constraints.",
            "requires_human_review": True,
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

    if any(token in normalized for token in ("flood", "water", "river")):
        critical_flood = life_safety_risk or any(
            token in normalized for token in ("rising quickly", "rising fast", "stuck cars", "stuck vehicles")
        )
        return {
            "incident_type": "flood",
            "title": "Flood impact report",
            "severity": "critical" if critical_flood else "high",
            "priority": "P0" if critical_flood else "P1",
            "confidence": 0.9 if critical_flood else 0.82,
            "analysis_provider": "rule_based_fallback",
            "life_safety_risk": critical_flood,
            "detected_risks": [
                "rising flood water",
                "vehicle entrapment",
                "blocked roadway access",
            ] + (["possible trapped occupants"] if critical_flood else []),
            "evidence_summary": "Flooding is affecting road access and nearby structures, with conditions worsening.",
            "admin_notes": "Verify water rise rate, trapped occupants, and route accessibility.",
            "requires_human_review": True,
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

    if any(token in normalized for token in ("trapped", "injured", "medical")):
        return {
            "incident_type": "rescue_medical",
            "title": "Rescue or medical escalation",
            "severity": "critical",
            "priority": "P0",
            "confidence": 0.9,
            "analysis_provider": "rule_based_fallback",
            "life_safety_risk": True,
            "detected_risks": ["possible trapped person", "medical distress"],
            "evidence_summary": "Evidence suggests an immediate rescue or medical life-safety event.",
            "admin_notes": "Prioritize welfare verification and rapid human triage.",
            "requires_human_review": True,
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

    if any(token in normalized for token in ("collapsed", "road", "damage")):
        return {
            "incident_type": "collapse",
            "title": "Collapse or infrastructure damage assessment",
            "severity": "critical" if life_safety_risk else "medium",
            "priority": "P0" if life_safety_risk else "P2",
            "confidence": 0.84 if life_safety_risk else 0.75,
            "analysis_provider": "rule_based_fallback",
            "life_safety_risk": life_safety_risk,
            "detected_risks": ["structural instability", "blocked road access"],
            "evidence_summary": "Evidence indicates structural or roadway damage that may restrict safe access.",
            "admin_notes": "Confirm structural stability before assigning field teams.",
            "requires_human_review": True,
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
        "incident_type": "other",
        "title": "Field report pending classification",
        "severity": "medium",
        "priority": "P2",
        "confidence": 0.68,
        "analysis_provider": "rule_based_fallback",
        "life_safety_risk": False,
        "detected_risks": ["unconfirmed field conditions"],
        "evidence_summary": "Submitted evidence does not yet support a more specific emergency classification.",
        "admin_notes": "Review the report manually and request clarification if needed.",
        "requires_human_review": True,
        "evidence_findings": [
            "Rule-based fallback analysis did not find a stronger emergency pattern.",
            "Human review is needed to validate incident type and urgency.",
        ],
        "recommended_resources": [
            "Operations desk review",
            "Field verification follow-up",
        ],
    }


def _create_tracking_code() -> str:
    return f"RL-{uuid.uuid4().hex[:8].upper()}"


def _build_image_findings(
    *,
    image_filename: Optional[str],
    image_content_type: Optional[str],
    image_exif_found: bool,
) -> Optional[str]:
    if not image_filename and not image_content_type:
        return None

    findings: List[str] = []
    if image_filename:
        findings.append(f"Image file uploaded: {image_filename}.")
    if image_content_type:
        findings.append(f"Content type: {image_content_type}.")
    findings.append("EXIF GPS detected." if image_exif_found else "No EXIF GPS detected.")
    return " ".join(findings)


async def build_incident_record(
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
    location = resolve_location(
        client_lat=client_lat,
        client_lng=client_lng,
        location_source=location_source,
        location_text=location_text,
        image_bytes=image_bytes,
    )
    image_exif_found = extract_exif_gps(image_bytes or b"") is not None
    image_findings = _build_image_findings(
        image_filename=image_filename,
        image_content_type=image_content_type,
        image_exif_found=image_exif_found,
    )
    audio_transcript = None
    combined_text = " ".join(
        part
        for part in [
            report_text or "",
            location_text or "",
            image_filename or "",
            audio_filename or "",
            image_findings or "",
            audio_transcript or "",
        ]
        if part
    )
    llm_analysis = await analyze_incident_with_qwen(
        report_text=report_text,
        image_findings=image_findings,
        audio_transcript=audio_transcript,
        location_metadata=location,
    )
    matched = _normalize_llm_analysis(llm_analysis.model_dump()) if llm_analysis else _match_analysis(combined_text)
    analysis_provider = matched.get("analysis_provider", "rule_based_fallback")
    now = datetime.utcnow().isoformat()

    summary_parts: List[str] = [
        matched["evidence_summary"],
        f"Analysis provider: {analysis_provider}.",
        f"Incident classified as {matched['incident_type']} with {matched['severity']} severity.",
    ]
    if location["source"] == "unknown":
        summary_parts.append("Location is pending human review because no reliable source was available.")
    else:
        summary_parts.append(f"Location source: {location['source']}.")

    evidence = {
        "image": {
            "filename": image_filename,
            "content_type": image_content_type,
            "size_bytes": len(image_bytes) if image_bytes is not None else None,
            "exif_gps_found": image_exif_found,
            "findings": image_findings,
        },
        "audio": {
            "filename": audio_filename,
            "content_type": audio_content_type,
            "size_bytes": len(audio_bytes) if audio_bytes is not None else None,
            "transcript": audio_transcript,
            "status": "received_not_transcribed" if audio_bytes is not None else None,
        },
        "text": {
            "report_text": report_text,
            "location_text": location_text or "",
        },
    }

    return {
        "incident_id": str(uuid.uuid4()),
        "tracking_code": _create_tracking_code(),
        "created_at": now,
        "updated_at": now,
        "status": "received",
        "reviewed": False,
        "admin_notes": "",
        "assigned_team": "",
        "incident_type": matched["incident_type"],
        "title": matched["title"],
        "summary": " ".join(summary_parts),
        "severity": matched["severity"],
        "priority": matched["priority"],
        "analysis_provider": analysis_provider,
        "life_safety_risk": matched["life_safety_risk"],
        "detected_risks": matched["detected_risks"],
        "evidence_summary": matched["evidence_summary"],
        "analysis_admin_notes": matched["admin_notes"],
        "location": location,
        "evidence": evidence,
        "evidence_findings": matched["evidence_findings"],
        "recommended_resources": matched["recommended_resources"],
        "confidence": matched["confidence"],
        "human_review_required": matched["requires_human_review"],
        "safety_note": SAFETY_NOTE,
    }


def public_incident_response(incident: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "incident_id": incident["incident_id"],
        "tracking_code": incident["tracking_code"],
        "status": incident["status"],
        "incident_type": incident["incident_type"],
        "title": incident["title"],
        "summary": incident["summary"],
        "severity": incident["severity"],
        "priority": incident["priority"],
        "analysis_provider": incident.get("analysis_provider", "rule_based_fallback"),
        "life_safety_risk": incident.get("life_safety_risk", False),
        "detected_risks": incident.get("detected_risks", []),
        "evidence_summary": incident.get("evidence_summary", incident["summary"]),
        "analysis_admin_notes": incident.get("analysis_admin_notes", ""),
        "location": incident["location"],
        "evidence": incident["evidence"],
        "evidence_findings": incident["evidence_findings"],
        "recommended_resources": incident["recommended_resources"],
        "confidence": incident["confidence"],
        "human_review_required": incident["human_review_required"],
        "safety_note": incident["safety_note"],
    }


async def analyze_evidence(
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
    incident = await build_incident_record(
        report_text=report_text,
        location_text=location_text,
        image_filename=image_filename,
        image_content_type=image_content_type,
        image_bytes=image_bytes,
        audio_filename=audio_filename,
        audio_content_type=audio_content_type,
        audio_bytes=audio_bytes,
        client_lat=client_lat,
        client_lng=client_lng,
        location_source=location_source,
    )
    return public_incident_response(incident)
