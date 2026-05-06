from __future__ import annotations
import pytest
import pytest_asyncio
from datetime import datetime

from schemas.signal import NormalizedSignal, SignalType


@pytest.mark.asyncio
async def test_transcribe_audio_demo():
    from skills.transcribe_audio import transcribe_audio
    result = await transcribe_audio("audio_001.mp3", demo_mode=True)
    assert "transcription" in result
    assert len(result["transcription"]) > 10
    assert 0 <= result["confidence"] <= 1


@pytest.mark.asyncio
async def test_caption_image_demo():
    from skills.caption_image import caption_image
    result = await caption_image("image_001.jpg", demo_mode=True)
    assert "caption" in result
    assert len(result["caption"]) > 10
    assert "objects_detected" in result


@pytest.mark.asyncio
async def test_extract_location_known():
    from skills.extract_location import extract_location
    result = await extract_location("Hay inundación en Barrio Santa Ana")
    assert result["location_name"] is not None
    assert result["confidence"] > 0.5


@pytest.mark.asyncio
async def test_extract_location_unknown():
    from skills.extract_location import extract_location
    result = await extract_location("No location mentioned here xyz abc")
    assert result["confidence"] >= 0


@pytest.mark.asyncio
async def test_normalize_signal_demo():
    from skills.normalize_signal import normalize_signal
    result = await normalize_signal(
        raw_text="Hay personas atrapadas en Barrio Santa Ana, al menos 5 heridos",
        modality="text",
        report_id="r_test_001",
        vllm_client=None,
    )
    assert "signal_type" in result
    assert "confidence" in result
    assert result["source_report_id"] == "r_test_001"


@pytest.mark.asyncio
async def test_detect_duplicates():
    from skills.detect_duplicates import detect_duplicates
    now = datetime.utcnow()
    signals = [
        NormalizedSignal(
            source_report_id="r1",
            signal_type=SignalType.FLOOD,
            description="Flooding in Santa Ana",
            raw_text="Flooding in Santa Ana barrio water rising fast",
            confidence=0.9,
            modality="text",
            created_at=now,
        ),
        NormalizedSignal(
            source_report_id="r2",
            signal_type=SignalType.FLOOD,
            description="Flooding in Santa Ana",
            raw_text="Flooding in Santa Ana barrio water rising fast",
            confidence=0.85,
            modality="text",
            created_at=now,
        ),
        NormalizedSignal(
            source_report_id="r3",
            signal_type=SignalType.PERSON_TRAPPED,
            description="Person trapped on roof",
            raw_text="There is a person trapped on the roof of the school building",
            confidence=0.92,
            modality="text",
            created_at=now,
        ),
    ]
    unique = await detect_duplicates(signals, threshold=0.75)
    assert len(unique) == 2


@pytest.mark.asyncio
async def test_classify_priority_person_trapped():
    from skills.classify_priority import classify_priority
    from schemas.incident import Priority
    now = datetime.utcnow()
    signal = NormalizedSignal(
        source_report_id="r1",
        signal_type=SignalType.PERSON_TRAPPED,
        description="Person trapped",
        raw_text="Hay una persona atrapada en el edificio, no puede salir",
        confidence=0.9,
        modality="text",
        created_at=now,
    )
    priority = await classify_priority(signal)
    assert priority == Priority.P0


@pytest.mark.asyncio
async def test_classify_priority_safe_status():
    from skills.classify_priority import classify_priority
    from schemas.incident import Priority
    now = datetime.utcnow()
    signal = NormalizedSignal(
        source_report_id="r1",
        signal_type=SignalType.SAFE_STATUS,
        description="We are safe",
        raw_text="Estamos bien, a salvo en el centro comunitario sin heridos",
        confidence=0.8,
        modality="text",
        created_at=now,
    )
    priority = await classify_priority(signal)
    assert priority == Priority.P3


@pytest.mark.asyncio
async def test_recommend_resources():
    from skills.recommend_resources import recommend_resources
    from schemas.incident import Incident, Priority
    now = datetime.utcnow()
    incident = Incident(
        session_id="s1",
        title="Flood — Santa Ana",
        description="inundación severa, personas atrapadas, agua subiendo",
        priority=Priority.P0,
        confidence=0.9,
        signal_ids=["sig1"],
        created_at=now,
        updated_at=now,
    )
    recs = await recommend_resources(incident)
    assert len(recs) > 0
    assert any(r.urgency == "immediate" for r in recs)


@pytest.mark.asyncio
async def test_generate_dispatch_message():
    from skills.generate_dispatch_message import generate_dispatch_message
    from schemas.incident import Incident, Priority
    from schemas.resource import ResourceRecommendation, ResourceType
    now = datetime.utcnow()
    incident = Incident(
        session_id="s1",
        title="Persona atrapada — Santa Ana",
        description="Persona atrapada en techo, agua subiendo",
        priority=Priority.P0,
        location="Barrio Santa Ana",
        confidence=0.95,
        affected_people=3,
        signal_ids=["sig1"],
        created_at=now,
        updated_at=now,
    )
    resources = [
        ResourceRecommendation(
            incident_id=incident.id,
            resource_type=ResourceType.RESCUE_TEAM,
            description="Equipo rescate acuático",
            quantity=2,
            urgency="immediate",
            rationale="Personas atrapadas",
        )
    ]
    msg = await generate_dispatch_message(incident, resources)
    assert "ALERTA" in msg.message
    assert "P0" in msg.message
    assert "Santa Ana" in msg.message


@pytest.mark.asyncio
async def test_calculate_confidence():
    from skills.calculate_confidence import calculate_confidence
    now = datetime.utcnow()
    signals = [
        NormalizedSignal(source_report_id="r1", signal_type=SignalType.FLOOD, description="d", raw_text="t", confidence=0.9, modality="text", created_at=now),
        NormalizedSignal(source_report_id="r2", signal_type=SignalType.FLOOD, description="d", raw_text="t", confidence=0.8, modality="image", created_at=now),
    ]
    conf = await calculate_confidence(signals)
    assert 0.0 <= conf <= 1.0


@pytest.mark.asyncio
async def test_fetch_amd_metrics_demo():
    from skills.fetch_amd_metrics import fetch_amd_metrics
    metrics = await fetch_amd_metrics("http://localhost:8000/v1", demo_mode=True)
    assert metrics.tokens_per_second > 0
    assert metrics.gpu_utilization > 0


@pytest.mark.asyncio
async def test_export_incident_report_json():
    from skills.export_incident_report import export_incident_report
    from schemas.incident import Incident, Priority
    import json
    now = datetime.utcnow()
    incidents = [
        Incident(session_id="s1", title="Test", description="desc", priority=Priority.P1, confidence=0.8, created_at=now, updated_at=now)
    ]
    output = await export_incident_report(incidents, format="json")
    data = json.loads(output)
    assert len(data) == 1
    assert data[0]["priority"] == "P1"


@pytest.mark.asyncio
async def test_export_incident_report_csv():
    from skills.export_incident_report import export_incident_report
    from schemas.incident import Incident, Priority
    now = datetime.utcnow()
    incidents = [
        Incident(session_id="s1", title="CSV Test", description="desc", priority=Priority.P2, confidence=0.7, created_at=now, updated_at=now)
    ]
    output = await export_incident_report(incidents, format="csv")
    assert "CSV Test" in output
    assert "P2" in output
