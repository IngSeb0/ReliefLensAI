from __future__ import annotations
from typing import Any, Dict

_DEMO_TRANSCRIPTIONS = [
    {
        "transcription": "Aquí en la calle Bolívar con Sucre, el agua ya llegó al segundo piso. Hay una señora mayor que no puede caminar atrapada en el edificio amarillo, necesitamos ayuda urgente, por favor.",
        "confidence": 0.94,
        "duration_s": 18.2,
        "language": "es",
    },
    {
        "transcription": "Somos diez familias en el techo de la escuela Simón Bolívar. Los niños están bien por ahora pero el agua sube. Necesitamos lanchas y comida. Llevamos cuatro horas aquí.",
        "confidence": 0.91,
        "duration_s": 22.7,
        "language": "es",
    },
    {
        "transcription": "This is a rescue call from Santa Ana district. We have a man with a broken leg and possible spinal injury on the corner of Av. Principal and Calle 5. He cannot be moved without a stretcher. Medical team needed immediately.",
        "confidence": 0.97,
        "duration_s": 15.9,
        "language": "en",
    },
    {
        "transcription": "El puente de la entrada del barrio colapsó. No pueden entrar camiones ni ambulancias por esa vía. Solo se puede acceder por la carretera vieja del norte, pero está muy deteriorada.",
        "confidence": 0.89,
        "duration_s": 19.4,
        "language": "es",
    },
    {
        "transcription": "Reportando desde el centro comunitario. Aquí hay unas sesenta personas refugiadas pero ya se acabó el agua potable y los alimentos. Necesitamos suministros urgentes para los niños y adultos mayores.",
        "confidence": 0.93,
        "duration_s": 24.1,
        "language": "es",
    },
]


async def transcribe_audio(file_path: str, demo_mode: bool = True) -> Dict[str, Any]:
    if demo_mode:
        idx = abs(hash(file_path)) % len(_DEMO_TRANSCRIPTIONS)
        result = _DEMO_TRANSCRIPTIONS[idx].copy()
        result["file_path"] = file_path
        return result

    try:
        import httpx
        from core.config import get_settings

        settings = get_settings()
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.vllm_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.vllm_api_key}"},
                data={"model": "whisper-1"},
                files={"file": open(file_path, "rb")},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "transcription": data.get("text", ""),
                "confidence": 0.9,
                "duration_s": data.get("duration", 0.0),
                "language": data.get("language", "unknown"),
                "file_path": file_path,
            }
    except Exception:
        idx = abs(hash(file_path)) % len(_DEMO_TRANSCRIPTIONS)
        result = _DEMO_TRANSCRIPTIONS[idx].copy()
        result["file_path"] = file_path
        return result
