from __future__ import annotations
import pytest
from datetime import datetime

from schemas.report import ReportInput, ReportType, UploadBatch
from schemas.signal import NormalizedSignal, SignalType
from schemas.incident import Incident, IncidentStatus, Priority, EvidenceItem
from schemas.resource import ResourceRecommendation, ResourceType
from schemas.dispatch import DispatchMessage
from schemas.amd import AMDPerformanceMetric
from schemas.crisis_room import CrisisRoomSummary


def test_report_input_defaults():
    r = ReportInput(session_id="s1", report_type=ReportType.TEXT, content="Hello")
    assert r.id
    assert r.report_type == ReportType.TEXT
    assert r.metadata == {}


def test_upload_batch():
    r = ReportInput(session_id="s1", report_type=ReportType.TEXT, content="Test")
    batch = UploadBatch(reports=[r])
    assert len(batch.reports) == 1


def test_normalized_signal():
    sig = NormalizedSignal(
        source_report_id="r1",
        signal_type=SignalType.FLOOD,
        description="Flooding in sector 4",
        raw_text="Water is rising",
        confidence=0.85,
        modality="text",
        created_at=datetime.utcnow(),
    )
    assert sig.id
    assert sig.signal_type == SignalType.FLOOD


def test_incident():
    inc = Incident(
        session_id="s1",
        title="Flood incident",
        description="Major flood",
        priority=Priority.P0,
        confidence=0.9,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert inc.status == IncidentStatus.NEW
    assert not inc.human_approved


def test_resource_recommendation():
    rec = ResourceRecommendation(
        incident_id="i1",
        resource_type=ResourceType.RESCUE_TEAM,
        description="Rescue team needed",
        urgency="immediate",
        rationale="People trapped",
    )
    assert rec.id


def test_dispatch_message():
    msg = DispatchMessage(
        incident_id="i1",
        channel="radio",
        message="ALERTA P0 - Santa Ana: personas atrapadas",
    )
    assert not msg.approved


def test_amd_metrics():
    m = AMDPerformanceMetric(
        timestamp=datetime.utcnow(),
        gpu_utilization=87.4,
        memory_used_gb=182.3,
        memory_total_gb=192.0,
        tokens_per_second=2340.5,
        requests_processed=128,
        avg_latency_ms=312.7,
        model_name="Qwen/Qwen2.5-72B-Instruct",
        rocm_version="6.1.0",
        power_watts=680.2,
    )
    assert m.gpu_utilization == 87.4


def test_crisis_room_summary():
    now = datetime.utcnow()
    inc = Incident(
        session_id="s1",
        title="Test",
        description="desc",
        priority=Priority.P0,
        confidence=0.9,
        created_at=now,
        updated_at=now,
    )
    summary = CrisisRoomSummary(
        session_id="s1",
        scenario_name="Test Flood",
        total_reports=5,
        total_signals=4,
        total_incidents=2,
        incidents_by_priority={"P0": 1, "P1": 1, "P2": 0, "P3": 0},
        critical_incidents=[inc],
        resource_recommendations=[],
        dispatch_messages=[],
        processing_time_seconds=1.23,
        created_at=now,
        status="ready",
    )
    assert summary.total_reports == 5
