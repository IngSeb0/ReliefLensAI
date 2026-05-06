#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def request_json(method: str, url: str, payload: dict | None = None) -> tuple[int, dict]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw_body": body}
        return exc.code, parsed


def ok(label: str, detail: str = "") -> None:
    suffix = f" - {detail}" if detail else ""
    print(f"[OK] {label}{suffix}")


def fail(label: str, detail: str = "") -> None:
    suffix = f" - {detail}" if detail else ""
    print(f"[FAIL] {label}{suffix}")


def assert_status(label: str, status: int, expected: int, body: dict) -> None:
    if status != expected:
        fail(label, f"status={status}, expected={expected}, body={json.dumps(body, ensure_ascii=False)[:500]}")
        raise SystemExit(1)


def main() -> int:
    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8080").rstrip("/")
    print(f"Testing ReliefLensAI backend at {backend_url}")

    status, body = request_json("GET", f"{backend_url}/health")
    assert_status("GET /health", status, 200, body)
    ok("GET /health", f"demo_mode={body.get('demo_mode')}, app_env={body.get('app_env')}")

    status, body = request_json("GET", f"{backend_url}/api/demo/scenario")
    assert_status("GET /api/demo/scenario", status, 200, body)
    report_count = len(body.get("reports", []))
    ok("GET /api/demo/scenario", f"scenario={body.get('scenario_name')}, reports={report_count}")

    status, body = request_json("GET", f"{backend_url}/api/amd/performance")
    assert_status("GET /api/amd/performance", status, 200, body)
    ok(
        "GET /api/amd/performance",
        f"gpu={body.get('gpu_name')}, model={body.get('model_name')}, tps={body.get('tokens_per_second')}",
    )

    status, body = request_json("POST", f"{backend_url}/api/demo/run")
    assert_status("POST /api/demo/run", status, 200, body)
    session_id = body.get("session_id")
    total_incidents = body.get("total_incidents")
    ok("POST /api/demo/run", f"session_id={session_id}, incidents={total_incidents}")

    query = urllib.parse.urlencode({"session_id": session_id})
    status, incidents = request_json("GET", f"{backend_url}/api/incidents?{query}")
    assert_status("GET /api/incidents", status, 200, incidents)
    if not isinstance(incidents, list):
        fail("GET /api/incidents", f"expected list, got {type(incidents).__name__}")
        return 1
    ok("GET /api/incidents", f"returned={len(incidents)}")

    if incidents:
        incident_id = incidents[0]["id"]
        status, incident = request_json("GET", f"{backend_url}/api/incidents/{incident_id}")
        assert_status("GET /api/incidents/{id}", status, 200, incident)
        ok(
            "GET /api/incidents/{id}",
            f"id={incident_id}, priority={incident.get('priority')}, location={incident.get('location')}",
        )

        status, dispatch = request_json("POST", f"{backend_url}/api/incidents/{incident_id}/dispatch-message")
        assert_status("POST /api/incidents/{id}/dispatch-message", status, 200, dispatch)
        ok("POST /api/incidents/{id}/dispatch-message", dispatch.get("message", "")[:120])

    print("Smoke test finished successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
