from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, Optional

from PIL import ExifTags, Image


def _rational_to_float(value: Any) -> float:
    if isinstance(value, tuple) and len(value) == 2:
        numerator, denominator = value
        return float(numerator) / float(denominator) if denominator else 0.0
    if hasattr(value, "numerator") and hasattr(value, "denominator"):
        denominator = float(value.denominator)
        return float(value.numerator) / denominator if denominator else 0.0
    return float(value)


def _gps_to_decimal(values: Any, ref: str) -> Optional[float]:
    if not values or len(values) != 3:
        return None
    degrees = _rational_to_float(values[0])
    minutes = _rational_to_float(values[1])
    seconds = _rational_to_float(values[2])
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref in {"S", "W"}:
        decimal *= -1
    return decimal


def extract_exif_gps(image_bytes: bytes) -> Optional[Dict[str, float]]:
    if not image_bytes:
        return None

    try:
        image = Image.open(BytesIO(image_bytes))
        exif = image.getexif()
        if not exif:
            return None

        gps_info = None
        for tag_id, value in exif.items():
            tag_name = ExifTags.TAGS.get(tag_id, tag_id)
            if tag_name == "GPSInfo":
                gps_info = value
                break

        if not gps_info:
            return None

        gps_tags = {
            ExifTags.GPSTAGS.get(key, key): val
            for key, val in gps_info.items()
        }
        lat = _gps_to_decimal(gps_tags.get("GPSLatitude"), gps_tags.get("GPSLatitudeRef", "N"))
        lng = _gps_to_decimal(gps_tags.get("GPSLongitude"), gps_tags.get("GPSLongitudeRef", "E"))
        if lat is None or lng is None:
            return None
        return {"lat": lat, "lng": lng}
    except Exception:
        return None


def resolve_location(
    *,
    client_lat: Optional[float],
    client_lng: Optional[float],
    location_source: Optional[str],
    location_text: Optional[str],
    image_bytes: Optional[bytes],
) -> Dict[str, Any]:
    if client_lat is not None and client_lng is not None:
        source = location_source or "browser_geolocation"
        confidence = 0.80 if source == "map_click" else 0.90
        label = "Map-selected location" if source == "map_click" else "Browser-shared location"
        return {
            "lat": client_lat,
            "lng": client_lng,
            "label": label,
            "source": source,
            "confidence": confidence,
        }

    exif_gps = extract_exif_gps(image_bytes or b"")
    if exif_gps:
        return {
            "lat": exif_gps["lat"],
            "lng": exif_gps["lng"],
            "label": "Location from image EXIF GPS",
            "source": "image_exif",
            "confidence": 0.85,
        }

    if location_text:
        cleaned = location_text.strip()
        location = {
            "lat": None,
            "lng": None,
            "label": cleaned,
            "source": "text_location",
            "confidence": 0.60,
        }
        if "santa ana" in cleaned.lower():
            location["lat"] = 34.10
            location["lng"] = -117.90
        return location

    return {
        "lat": None,
        "lng": None,
        "label": "Location requires human review",
        "source": "unknown",
        "confidence": 0.0,
    }
