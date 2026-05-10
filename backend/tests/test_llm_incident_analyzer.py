from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest


@pytest.fixture()
def llm_env(monkeypatch):
    backend_root = Path(__file__).resolve().parents[1]
    monkeypatch.chdir(backend_root)
    monkeypatch.setenv("QWEN_BASE_URL", "http://localhost:8000/v1")
    monkeypatch.setenv("QWEN_API_KEY", "test-key")
    monkeypatch.setenv("QWEN_MODEL", "Qwen/Qwen2.5-7B-Instruct")
    monkeypatch.setenv("QWEN_ENABLED", "true")
    monkeypatch.setenv("STORAGE_PATH", str(backend_root / "test_artifacts" / "llm-tests"))

    from core.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_valid_llm_json(llm_env, monkeypatch):
    from services.llmIncidentAnalyzer import analyze_incident_with_qwen

    async def fake_request(*, settings, payload):
        del settings, payload
        return """
        {
          "incident_type": "flood",
          "severity": "high",
          "confidence": 0.88,
          "life_safety_risk": true,
          "detected_risks": ["rising flood water", "vehicle entrapment"],
          "evidence_summary": "Flash flood conditions are affecting occupied residential streets.",
          "recommended_resources": ["Water rescue vehicle", "Flood response crew"],
          "admin_notes": "Confirm trapped occupants and route access.",
          "requires_human_review": true
        }
        """

    monkeypatch.setattr("services.llmIncidentAnalyzer._request_qwen_completion", fake_request)

    result = await analyze_incident_with_qwen(
        report_text="Flash flood with trapped vehicles and rising water.",
        image_findings="Flooded street and people moving to higher ground.",
        audio_transcript=None,
        location_metadata={"source": "browser_geolocation", "confidence": 0.9},
    )

    assert result is not None
    assert result.incident_type == "flood"
    assert result.life_safety_risk is True


@pytest.mark.asyncio
async def test_malformed_llm_json_fallback(llm_env, monkeypatch):
    from services.evidence_analyzer import build_incident_record

    async def fake_request(*, settings, payload):
        del settings, payload
        return "not valid json"

    monkeypatch.setattr("services.llmIncidentAnalyzer._request_qwen_completion", fake_request)

    incident = await build_incident_record(
        report_text="Flooded street and trapped vehicles near homes.",
        location_text="Santa Ana",
        image_filename="flood.jpg",
        image_content_type="image/jpeg",
        image_bytes=b"image-bytes",
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=34.10,
        client_lng=-117.90,
        location_source="browser_geolocation",
    )

    assert incident["analysis_provider"] == "rule_based_fallback"
    assert incident["incident_type"] == "flood"


@pytest.mark.asyncio
async def test_invalid_llm_severity_fallback(llm_env, monkeypatch):
    from services.evidence_analyzer import build_incident_record

    async def fake_request(*, settings, payload):
        del settings, payload
        return """
        {
          "incident_type": "flood",
          "severity": "urgent",
          "confidence": 0.88,
          "life_safety_risk": true,
          "detected_risks": ["rising flood water"],
          "evidence_summary": "Flash flood conditions are affecting occupied residential streets.",
          "recommended_resources": ["Water rescue vehicle", "Flood response crew"],
          "admin_notes": "Confirm trapped occupants and route access.",
          "requires_human_review": true
        }
        """

    monkeypatch.setattr("services.llmIncidentAnalyzer._request_qwen_completion", fake_request)

    incident = await build_incident_record(
        report_text="Flooded street and trapped vehicles near homes.",
        location_text="Santa Ana",
        image_filename="flood.jpg",
        image_content_type="image/jpeg",
        image_bytes=b"image-bytes",
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=34.10,
        client_lng=-117.90,
        location_source="browser_geolocation",
    )

    assert incident["analysis_provider"] == "rule_based_fallback"
    assert incident["incident_type"] == "flood"


@pytest.mark.asyncio
async def test_invalid_llm_incident_type_fallback(llm_env, monkeypatch):
    from services.evidence_analyzer import build_incident_record

    async def fake_request(*, settings, payload):
        del settings, payload
        return """
        {
          "incident_type": "flooding_event",
          "severity": "high",
          "confidence": 0.88,
          "life_safety_risk": true,
          "detected_risks": ["rising flood water"],
          "evidence_summary": "Flash flood conditions are affecting occupied residential streets.",
          "recommended_resources": ["Water rescue vehicle", "Flood response crew"],
          "admin_notes": "Confirm trapped occupants and route access.",
          "requires_human_review": true
        }
        """

    monkeypatch.setattr("services.llmIncidentAnalyzer._request_qwen_completion", fake_request)

    incident = await build_incident_record(
        report_text="Flooded street and trapped vehicles near homes.",
        location_text="Santa Ana",
        image_filename="flood.jpg",
        image_content_type="image/jpeg",
        image_bytes=b"image-bytes",
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=34.10,
        client_lng=-117.90,
        location_source="browser_geolocation",
    )

    assert incident["analysis_provider"] == "rule_based_fallback"
    assert incident["incident_type"] == "flood"


@pytest.mark.asyncio
async def test_qwen_timeout_fallback(llm_env, monkeypatch):
    from services.evidence_analyzer import build_incident_record

    async def fake_request(*, settings, payload):
        del settings, payload
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr("services.llmIncidentAnalyzer._request_qwen_completion", fake_request)

    incident = await build_incident_record(
        report_text="Flooded street and trapped vehicles near homes.",
        location_text="Santa Ana",
        image_filename="flood.jpg",
        image_content_type="image/jpeg",
        image_bytes=b"image-bytes",
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=34.10,
        client_lng=-117.90,
        location_source="browser_geolocation",
    )

    assert incident["analysis_provider"] == "rule_based_fallback"
    assert incident["incident_type"] == "flood"


@pytest.mark.asyncio
async def test_qwen_disabled_fallback(monkeypatch):
    backend_root = Path(__file__).resolve().parents[1]
    monkeypatch.chdir(backend_root)
    monkeypatch.setenv("QWEN_ENABLED", "false")

    from core.config import get_settings
    from services.evidence_analyzer import build_incident_record

    get_settings.cache_clear()

    incident = await build_incident_record(
        report_text="Smoke and fire visible near occupied homes.",
        location_text="Santa Ana",
        image_filename=None,
        image_content_type=None,
        image_bytes=None,
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=None,
        client_lng=None,
        location_source=None,
    )

    assert incident["analysis_provider"] == "rule_based_fallback"
    assert incident["incident_type"] == "fire"


@pytest.mark.asyncio
async def test_critical_flood_classification(monkeypatch):
    backend_root = Path(__file__).resolve().parents[1]
    monkeypatch.chdir(backend_root)
    monkeypatch.setenv("QWEN_ENABLED", "false")

    from core.config import get_settings
    from services.evidence_analyzer import build_incident_record

    get_settings.cache_clear()

    incident = await build_incident_record(
        report_text="A severe flash flood is affecting a residential area. Streets are partially flooded, several vehicles are stuck, and people may be trapped inside nearby buildings. Water level appears to be rising quickly after heavy rainfall.",
        location_text="Santa Ana residential flood corridor",
        image_filename="flooded-street.jpg",
        image_content_type="image/jpeg",
        image_bytes=b"fake-image",
        audio_filename=None,
        audio_content_type=None,
        audio_bytes=None,
        client_lat=34.10,
        client_lng=-117.90,
        location_source="browser_geolocation",
    )

    assert incident["incident_type"] == "flood"
    assert incident["severity"] == "critical"
    assert incident["priority"] == "P0"
    assert incident["life_safety_risk"] is True
