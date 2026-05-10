from __future__ import annotations

import json
import logging
from typing import Any, Dict, Literal

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from core.config import Settings, get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an emergency evidence analysis assistant for a decision-support demo.\n"
    "You are not connected to emergency services and must not claim that help has been dispatched.\n"
    "Analyze submitted evidence from text, image description or image metadata, audio transcript, and location metadata.\n"
    "Return only valid JSON matching the required schema.\n"
    "Prioritize human safety. If there are signs of trapped people, medical distress, fire, flooding, structural collapse, violence, blocked roads, or rapidly worsening conditions, set requires_human_review to true.\n"
    "Use severity critical only when there is possible immediate life-safety impact.\n"
    "Use concise, operational language for admin_notes."
)


class QwenIncidentAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    incident_type: Literal["flood", "fire", "medical", "collapse", "violence", "landslide", "rescue_medical", "other"]
    severity: Literal["low", "medium", "high", "critical"]
    confidence: float = Field(ge=0.0, le=1.0)
    life_safety_risk: bool
    detected_risks: list[str]
    evidence_summary: str
    recommended_resources: list[str]
    admin_notes: str
    requires_human_review: bool


async def _request_qwen_completion(
    *,
    settings: Settings,
    payload: Dict[str, Any],
) -> str:
    base_url = settings.qwen_base_url.rstrip("/")
    headers = {"Content-Type": "application/json"}
    if settings.qwen_api_key:
        headers["Authorization"] = f"Bearer {settings.qwen_api_key}"

    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def _extract_json_object(raw: str) -> Dict[str, Any]:
    stripped = raw.strip()
    if stripped.startswith("```"):
        parts = stripped.split("```")
        if len(parts) >= 2:
            stripped = parts[1]
        if stripped.startswith("json"):
            stripped = stripped[4:]
        stripped = stripped.strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON object found in Qwen response")

    return json.loads(stripped[start : end + 1])


def _build_user_prompt(
    *,
    report_text: str,
    image_findings: str | None,
    audio_transcript: str | None,
    location_metadata: Dict[str, Any],
) -> str:
    return json.dumps(
        {
            "report_text": report_text,
            "image_findings": image_findings,
            "audio_transcript": audio_transcript,
            "location_metadata": location_metadata,
            "required_schema": {
                "incident_type": [
                    "flood",
                    "fire",
                    "medical",
                    "collapse",
                    "violence",
                    "landslide",
                    "rescue_medical",
                    "other",
                ],
                "severity": ["low", "medium", "high", "critical"],
                "confidence": "number",
                "life_safety_risk": "boolean",
                "detected_risks": ["string"],
                "evidence_summary": "string",
                "recommended_resources": ["string"],
                "admin_notes": "string",
                "requires_human_review": "boolean",
            },
        },
        ensure_ascii=True,
    )


async def analyze_incident_with_qwen(
    *,
    report_text: str,
    image_findings: str | None,
    audio_transcript: str | None,
    location_metadata: Dict[str, Any],
    settings: Settings | None = None,
) -> QwenIncidentAnalysis | None:
    settings = settings or get_settings()
    if not settings.qwen_enabled:
        return None

    if not any(
        [
            report_text.strip(),
            image_findings and image_findings.strip(),
            audio_transcript and audio_transcript.strip(),
        ]
    ):
        logger.warning("Qwen incident analysis skipped because no analyzable evidence was provided")
        return None

    payload = {
        "model": settings.qwen_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(
                    report_text=report_text,
                    image_findings=image_findings,
                    audio_transcript=audio_transcript,
                    location_metadata=location_metadata,
                ),
            },
        ],
        "temperature": 0,
        "max_tokens": 500,
        "response_format": {"type": "json_object"},
    }

    try:
        raw_content = await _request_qwen_completion(settings=settings, payload=payload)
        parsed = _extract_json_object(raw_content)
        return QwenIncidentAnalysis.model_validate(parsed)
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.warning("Qwen incident analysis request failed: %s", exc)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Qwen incident analysis returned malformed JSON: %s", exc)
    except ValidationError as exc:
        logger.warning("Qwen incident analysis failed schema validation: %s", exc)
    except Exception as exc:
        logger.warning("Qwen incident analysis failed unexpectedly: %s", exc)
    return None
