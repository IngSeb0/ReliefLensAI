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

    from core.config import get_settings
    from services.storage import get_storage
    from services.vllm_client import get_vllm_client

    get_settings.cache_clear()
    get_storage.cache_clear()
    get_vllm_client.cache_clear()

    from main import app

    with TestClient(app) as c:
        yield c


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
    assert payload["incident_type"] == "wildfire"
    assert payload["priority"] == "P1"
    assert payload["human_review_required"] is True
    assert payload["evidence"]["image"]["size_bytes"] == len(b"fake-image-bytes")


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


def test_evidence_intake_image_and_location_text(client):
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
    assert payload["incident_type"] == "infrastructure_damage"
    assert payload["location"]["source"] == "text_location"
    assert payload["location"]["lat"] == 34.10
    assert payload["location"]["lng"] == -117.90


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


def test_amd_performance(client):
    resp = client.get("/api/amd/performance")
    assert resp.status_code == 200
    data = resp.json()
    assert "tokens_per_second" in data
    assert "model_name" in data


def test_list_incidents_empty(client):
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
