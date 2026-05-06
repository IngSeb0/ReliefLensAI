from __future__ import annotations
import csv
import io
import json
from typing import List

from schemas.incident import Incident


async def export_incident_report(incidents: List[Incident], format: str = "json") -> str:
    if format == "json":
        data = [inc.model_dump(mode="json") for inc in incidents]
        return json.dumps(data, indent=2, default=str)

    if format == "csv":
        output = io.StringIO()
        if not incidents:
            return ""
        fieldnames = [
            "id", "session_id", "title", "description", "priority",
            "status", "location", "affected_people", "confidence",
            "created_at", "human_approved",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for inc in incidents:
            row = inc.model_dump(mode="json")
            writer.writerow({k: row.get(k, "") for k in fieldnames})
        return output.getvalue()

    raise ValueError(f"Unsupported format: {format}. Use 'json' or 'csv'.")
