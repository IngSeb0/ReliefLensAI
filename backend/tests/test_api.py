from __future__ import annotations
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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


def test_demo_run(client):
    resp = client.post("/api/demo/run")
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert "total_incidents" in data
    assert data["status"] == "ready"


def test_amd_performance(client):
    resp = client.get("/api/amd/performance")
    assert resp.status_code == 200
    data = resp.json()
    assert "tokens_per_second" in data
    assert data["tokens_per_second"] > 0


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
