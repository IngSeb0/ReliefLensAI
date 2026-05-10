from __future__ import annotations
import os
import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, backend_root)

    storage_path = Path(backend_root) / "test_artifacts" / f"storage-{uuid.uuid4()}"
    storage_path.mkdir(parents=True, exist_ok=True)

    os.environ["STORAGE_PATH"] = str(storage_path)
    os.environ["DEMO_MODE"] = "true"
    os.environ["DEBUG"] = "false"
    os.environ["ADMIN_USERNAME"] = "admin"
    os.environ["ADMIN_PASSWORD"] = "test-password"
    os.environ["ADMIN_TOKEN_SECRET"] = "test-secret"
    os.environ["ADMIN_TOKEN_EXPIRE_MINUTES"] = "720"

    from core.config import get_settings
    from services.storage import get_storage
    from services.vllm_client import get_vllm_client

    get_settings.cache_clear()
    get_storage.cache_clear()
    get_vllm_client.cache_clear()

    from main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    response = client.post("/api/admin/login", json={"username": "admin", "password": "test-password"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "ReliefLensAI"
    assert data["status"] == "ready"


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


def test_demo_scenario(client):
    resp = client.get("/api/demo/scenario")
    assert resp.status_code == 200
    data = resp.json()
    assert "scenario_name" in data
    assert "reports" in data


def test_demo_incidents(client):
    resp = client.get("/api/demo/incidents")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "incident_id" in data[0]
    assert "priority" in data[0]
    assert "location" in data[0]


def test_demo_run(client):
    resp = client.post("/api/demo/run")
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert "total_incidents" in data
    assert data["status"] == "ready"


def test_demo_analyze_image(client):
    files = {
        "image": ("field-evidence.jpg", b"fake-image-bytes", "image/jpeg"),
    }
    data = {
        "report_text": "Smoke and fire visible near homes, possible evacuation support needed",
        "lat": "33.7518",
        "lng": "-117.8689",
    }
    resp = client.post("/api/demo/analyze-image", files=files, data=data)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["incident_type"] == "fire"
    assert payload["priority"] == "P1"
    assert payload["human_review_required"] is True
    assert payload["evidence"]["image"]["size_bytes"] == len(b"fake-image-bytes")
    assert payload["tracking_code"].startswith("RL-")


def test_evidence_intake_browser_geolocation(client):
    data = {
        "report_text": "Flood water is rising and residents need help",
        "location_text": "",
        "client_lat": "33.7520",
        "client_lng": "-117.8700",
        "location_source": "browser_geolocation",
    }
    resp = client.post("/api/evidence/intake", data=data)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["incident_type"] == "flood"
    assert payload["location"]["source"] == "browser_geolocation"
    assert payload["location"]["lat"] == 33.752
    assert payload["location"]["confidence"] == 0.9
    assert payload["status"] == "received"


def test_evidence_intake_image(client):
    files = {
        "image": ("damage-road.jpg", b"fake-image-bytes", "image/jpeg"),
    }
    data = {
        "report_text": "Road damage and partial collapse reported",
        "location_text": "Santa Ana civic center",
    }
    resp = client.post("/api/evidence/intake", files=files, data=data)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["incident_type"] == "collapse"
    assert payload["location"]["source"] == "text_location"
    assert payload["location"]["lat"] == 34.10
    assert payload["location"]["lng"] == -117.90


def test_evidence_intake_audio_metadata(client):
    files = {
        "audio": ("field-audio.webm", b"fake-audio-bytes", "audio/webm"),
    }
    data = {
        "report_text": "Medical assistance needed for injured resident",
    }
    resp = client.post("/api/evidence/intake", files=files, data=data)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["incident_type"] == "rescue_medical"
    assert payload["evidence"]["audio"]["status"] == "received_not_transcribed"
    assert payload["evidence"]["audio"]["transcript"] is None


def test_evidence_intake_without_location(client):
    data = {
        "report_text": "General field report with no location details",
    }
    resp = client.post("/api/evidence/intake", data=data)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["location"]["source"] == "unknown"
    assert payload["location"]["lat"] is None
    assert payload["location"]["label"] == "Location requires human review"


def test_evidence_status(client):
    data = {
        "report_text": "Flood water is rising and residents need help",
        "client_lat": "33.7520",
        "client_lng": "-117.8700",
        "location_source": "browser_geolocation",
    }
    intake = client.post("/api/evidence/intake", data=data)
    tracking_code = intake.json()["tracking_code"]
    resp = client.get(f"/api/evidence/status/{tracking_code}")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["tracking_code"] == tracking_code
    assert payload["status"] == "received"


def test_admin_login_valid(client):
    resp = client.post("/api/admin/login", json={"username": "admin", "password": "test-password"})
    assert resp.status_code == 200
    payload = resp.json()
    assert "access_token" in payload
    assert payload["token_type"] == "bearer"


def test_admin_login_invalid(client):
    resp = client.post("/api/admin/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_admin_incidents_requires_token(client):
    resp = client.get("/api/admin/incidents")
    assert resp.status_code == 401


def test_admin_incidents_with_token(client, admin_token: str):
    resp = client.get("/api/admin/incidents", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_admin_patch_incident_with_token(client, admin_token: str):
    intake = client.post("/api/evidence/intake", data={"report_text": "Fire in neighborhood", "location_text": "Santa Ana"})
    incident_id = intake.json()["incident_id"]
    resp = client.patch(
        f"/api/admin/incidents/{incident_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "triaged", "reviewed": True, "admin_notes": "Validated", "assigned_team": "North Team"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["status"] == "triaged"
    assert payload["reviewed"] is True
    assert payload["assigned_team"] == "North Team"


def test_qwen_saved_incident_success_path(client, admin_token: str, monkeypatch):
    from core.config import get_settings

    monkeypatch.setenv("QWEN_ENABLED", "true")
    monkeypatch.setenv("QWEN_BASE_URL", "http://localhost:8000/v1")
    monkeypatch.setenv("QWEN_API_KEY", "test-key")
    monkeypatch.setenv("QWEN_MODEL", "Qwen/Qwen2.5-7B-Instruct")
    get_settings.cache_clear()

    async def fake_request(*, settings, payload):
        del settings, payload
        return """
        {
          "incident_type": "flood",
          "severity": "critical",
          "confidence": 0.94,
          "life_safety_risk": true,
          "detected_risks": ["rising flood water", "possible trapped occupants"],
          "evidence_summary": "Critical flash flood conditions threaten occupied homes and road access.",
          "recommended_resources": ["Water rescue vehicle", "Flood response crew"],
          "admin_notes": "Prioritize rooftop checks and route closure verification.",
          "requires_human_review": true
        }
        """

    monkeypatch.setattr("services.llmIncidentAnalyzer._request_qwen_completion", fake_request)

    try:
        intake = client.post(
            "/api/evidence/intake",
            data={
                "report_text": "Flash flood is rising near homes and people may be trapped.",
                "location_text": "Santa Ana",
                "client_lat": "34.10",
                "client_lng": "-117.90",
                "location_source": "browser_geolocation",
            },
        )
        assert intake.status_code == 200
        payload = intake.json()
        incident_id = payload["incident_id"]

        saved = client.get(
            f"/api/admin/incidents/{incident_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert saved.status_code == 200
        incident = saved.json()

        assert incident["analysis_provider"] == "qwen"
        assert incident["severity"] == "critical"
        assert incident["human_review_required"] is True
        assert incident["detected_risks"] == ["rising flood water", "possible trapped occupants"]
        assert incident["evidence_summary"] == "Critical flash flood conditions threaten occupied homes and road access."
        assert incident["analysis_admin_notes"] == "Prioritize rooftop checks and route closure verification."
        assert incident["admin_notes"] == ""
    finally:
        get_settings.cache_clear()


def test_admin_me(client, admin_token: str):
    resp = client.get("/api/admin/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


def test_admin_telemetry(client, admin_token: str):
    resp = client.get("/api/admin/telemetry", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["health"] == "healthy"
    assert "amd_metrics" in payload


def test_amd_performance(client):
    resp = client.get("/api/amd/performance")
    assert resp.status_code == 200
    data = resp.json()
    assert "tokens_per_second" in data
    assert "model_name" in data


def test_list_incidents(client):
    resp = client.get("/api/incidents")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_incident_not_found(client):
    resp = client.get("/api/incidents/nonexistent-id")
    assert resp.status_code == 404


def test_crisis_room_creation(client):
    import uuid
    from datetime import datetime

    session_id = str(uuid.uuid4())
    payload = {
        "batch": {
            "session_id": session_id,
            "scenario_name": "Test Flood",
            "reports": [
                {
                    "id": str(uuid.uuid4()),
                    "session_id": session_id,
                    "report_type": "text",
                    "content": "Hay personas atrapadas en el techo de la escuela en Barrio Santa Ana, necesitamos rescate urgente",
                    "metadata": {},
                    "created_at": datetime.utcnow().isoformat(),
                },
                {
                    "id": str(uuid.uuid4()),
                    "session_id": session_id,
                    "report_type": "text",
                    "content": "Estamos bien en el centro comunitario, tenemos a 20 personas refugiadas pero falta agua",
                    "metadata": {},
                    "created_at": datetime.utcnow().isoformat(),
                },
            ],
        }
    }
    resp = client.post("/api/crisis-room", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == session_id
    assert data["total_incidents"] > 0
    assert data["status"] == "ready"
