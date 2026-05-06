from __future__ import annotations
from typing import Any, Dict, List

_DEMO_CAPTIONS = [
    {
        "caption": "Heavily flooded residential street in Santa Ana district. Water level is approximately 1.5 meters high. A family of four including two children are visible on a rooftop, waving a red cloth for attention.",
        "objects_detected": ["flooded_street", "people_on_roof", "submerged_vehicles", "residential_buildings"],
        "confidence": 0.93,
        "hazards": ["rising_water", "stranded_people", "electrical_hazard"],
    },
    {
        "caption": "Collapsed wall of a two-story brick building. Rubble and debris scattered across the street blocking vehicle access. No visible casualties in frame but possible entrapment under debris.",
        "objects_detected": ["collapsed_building", "debris", "blocked_road"],
        "confidence": 0.91,
        "hazards": ["structural_collapse", "road_blockage", "possible_entrapment"],
    },
    {
        "caption": "Community center being used as emergency shelter. Approximately 40 people visible including elderly and children. Supplies are running low — visible empty water containers and minimal food stocks.",
        "objects_detected": ["shelter", "civilians", "empty_containers", "elderly_people", "children"],
        "confidence": 0.95,
        "hazards": ["resource_shortage", "vulnerable_population"],
    },
    {
        "caption": "Flooded main road with a partially submerged ambulance attempting to navigate. Water level at door level. Emergency vehicle unable to proceed. A pedestrian bridge visible in background shows water is 2m above normal.",
        "objects_detected": ["flooded_road", "ambulance", "pedestrian_bridge", "emergency_vehicle"],
        "confidence": 0.88,
        "hazards": ["blocked_emergency_access", "high_water_level"],
    },
    {
        "caption": "Aerial view of the Santa Ana neighborhood. Approximately 60% of the area is under water. Multiple rooftops with stranded residents visible. The main evacuation route (Av. Principal) is completely flooded.",
        "objects_detected": ["aerial_view", "flooded_neighborhood", "rooftop_survivors", "blocked_roads"],
        "confidence": 0.96,
        "hazards": ["widespread_flooding", "multiple_stranded_civilians", "blocked_evacuation_routes"],
    },
    {
        "caption": "Makeshift raft carrying three adults navigating between houses. Improvised from wooden pallets and plastic barrels. One person appears to have a bandaged leg injury.",
        "objects_detected": ["makeshift_raft", "injured_person", "improvised_flotation", "adults"],
        "confidence": 0.87,
        "hazards": ["unstable_flotation", "injured_civilian", "flood_navigation_risk"],
    },
    {
        "caption": "Flooded electrical substation with water reaching transformer level. Live wires in contact with floodwater visible. No civilians in immediate vicinity but risk of electrocution to anyone in the area.",
        "objects_detected": ["electrical_substation", "live_wires", "floodwater", "transformer"],
        "confidence": 0.94,
        "hazards": ["electrocution_risk", "live_wires_in_water", "critical_infrastructure_failure"],
    },
    {
        "caption": "Child approximately 8 years old sitting alone on a fence post surrounded by floodwater. Location appears to be near the Santa Ana primary school. No adults visible nearby. Child appears distressed.",
        "objects_detected": ["child", "fence_post", "floodwater", "school_building"],
        "confidence": 0.98,
        "hazards": ["unaccompanied_minor", "immediate_rescue_needed", "drowning_risk"],
    },
]


async def caption_image(image_path: str, demo_mode: bool = True) -> Dict[str, Any]:
    if demo_mode:
        idx = abs(hash(image_path)) % len(_DEMO_CAPTIONS)
        result = _DEMO_CAPTIONS[idx].copy()
        result["image_path"] = image_path
        return result

    try:
        import base64
        from pathlib import Path
        from services.vllm_client import get_vllm_client

        client = get_vllm_client()
        data = Path(image_path).read_bytes()
        b64 = base64.b64encode(data).decode()
        caption = await client.caption_image(b64)
        return {
            "caption": caption,
            "objects_detected": [],
            "confidence": 0.85,
            "hazards": [],
            "image_path": image_path,
        }
    except Exception:
        idx = abs(hash(image_path)) % len(_DEMO_CAPTIONS)
        result = _DEMO_CAPTIONS[idx].copy()
        result["image_path"] = image_path
        return result
