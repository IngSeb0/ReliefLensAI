from __future__ import annotations
import re
from typing import Any, Dict, Optional

_KNOWN_LOCATIONS: Dict[str, Dict[str, float]] = {
    "barrio santa ana": {"lat": 10.4806, "lon": -66.9036},
    "santa ana": {"lat": 10.4806, "lon": -66.9036},
    "calle bolívar": {"lat": 10.4812, "lon": -66.9041},
    "calle bolivar": {"lat": 10.4812, "lon": -66.9041},
    "av. principal": {"lat": 10.4795, "lon": -66.9028},
    "avenida principal": {"lat": 10.4795, "lon": -66.9028},
    "escuela simón bolívar": {"lat": 10.4820, "lon": -66.9050},
    "centro comunitario": {"lat": 10.4808, "lon": -66.9033},
    "calle 5": {"lat": 10.4801, "lon": -66.9043},
    "puente": {"lat": 10.4790, "lon": -66.9020},
}

_LOCATION_PATTERNS = [
    r"(?:calle|carrera|avenida|av\.|blvd\.?)\s+[\w\s]+",
    r"barrio\s+[\w\s]+",
    r"sector\s+[\w\s]+",
    r"entre\s+[\w\s]+\s+y\s+[\w\s]+",
    r"esquina\s+[\w\s]+",
    r"cerca\s+(?:de\s+)?[\w\s]+",
]


async def extract_location(text: str) -> Dict[str, Any]:
    text_lower = text.lower()

    for loc_name, coords in _KNOWN_LOCATIONS.items():
        if loc_name in text_lower:
            return {
                "location_name": loc_name.title(),
                "coordinates": coords,
                "confidence": 0.90,
                "method": "known_location_lookup",
            }

    for pattern in _LOCATION_PATTERNS:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            location_text = match.group().strip()
            return {
                "location_name": location_text.title(),
                "coordinates": None,
                "confidence": 0.65,
                "method": "regex_extraction",
            }

    if "santa ana" in text_lower or "barrio" in text_lower:
        return {
            "location_name": "Barrio Santa Ana",
            "coordinates": {"lat": 10.4806, "lon": -66.9036},
            "confidence": 0.75,
            "method": "context_inference",
        }

    return {
        "location_name": None,
        "coordinates": None,
        "confidence": 0.0,
        "method": "not_found",
    }
