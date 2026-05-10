# ReliefLens AI Skill Catalog

Este directorio define los contratos reutilizables de skills para la arquitectura agentic. Cada skill debe aceptar JSON simple, devolver JSON validable por Pydantic y fallar de forma explícita.

## 1. `transcribe_audio`

- **Propósito**: convertir audio corto de emergencia a texto operativo.
- **Input JSON**:

```json
{
  "report_id": "uuid",
  "file_path": "backend/data/uploads/audio_01.wav",
  "language": "es",
  "metadata": {
    "source": "whatsapp",
    "duration_seconds": 18
  }
}
```

- **Output JSON**:

```json
{
  "report_id": "uuid",
  "transcript": "Hay dos personas atrapadas en el techo de la casa azul en Santa Ana.",
  "language": "es",
  "confidence": 0.88,
  "engine": "distil-whisper"
}
```

- **Dependencias**: `faster-whisper` o `transformers`, `ffmpeg`.
- **AMD/vLLM**: no usa vLLM; puede correr local o en AMD con ROCm si el modelo ASR está estable.
- **Ejemplo de uso**:

```python
result = await transcribe_audio({
    "report_id": report.id,
    "file_path": report.file_path,
    "language": "es"
})
```

## 2. `caption_image`

- **Propósito**: convertir imagen de desastre en descripción accionable.
- **Input JSON**:

```json
{
  "report_id": "uuid",
  "file_path": "backend/data/uploads/img_03.jpg",
  "focus": ["people", "flood", "access", "hazards"]
}
```

- **Output JSON**:

```json
{
  "report_id": "uuid",
  "caption": "Calle residencial inundada con agua por encima de las rodillas, dos personas visibles en techo, vehículo parcialmente sumergido y cables eléctricos cercanos.",
  "hazards": ["flood", "electrical_risk"],
  "visible_people": 2,
  "confidence": 0.84,
  "model": "Qwen2.5-VL-7B-Instruct"
}
```

- **Dependencias**: `httpx`, cliente OpenAI-compatible, codificación base64.
- **AMD/vLLM**: sí; debe correr por vLLM en MI300X.
- **Ejemplo de uso**:

```python
result = await caption_image({
    "report_id": report.id,
    "file_path": report.file_path,
    "focus": ["people", "damage", "hazards"]
})
```

## 3. `extract_location`

- **Propósito**: extraer barrio, referencia y coordenadas aproximadas si existen.
- **Input JSON**:

```json
{
  "text": "Estamos en la carrera 4 con calle 12, barrio Santa Ana, frente al colegio.",
  "metadata": {
    "csv_lat": 4.6097,
    "csv_lon": -74.0817
  }
}
```

- **Output JSON**:

```json
{
  "location": "Barrio Santa Ana",
  "reference": "carrera 4 con calle 12, frente al colegio",
  "coordinates": {
    "lat": 4.6097,
    "lon": -74.0817
  },
  "confidence": 0.91
}
```

- **Dependencias**: regex, parser de texto, metadata del CSV.
- **AMD/vLLM**: puede ejecutarse localmente; usar LLM solo si el texto es ambiguo.
- **Ejemplo de uso**:

```python
loc = extract_location({"text": text, "metadata": report.metadata})
```

## 4. `normalize_signal`

- **Propósito**: convertir entrada textual multimodal a una señal canónica.
- **Input JSON**:

```json
{
  "report_id": "uuid",
  "modality": "audio",
  "raw_text": "Hay una señora herida y el agua sigue subiendo en Santa Ana.",
  "metadata": {
    "source": "voice_note"
  }
}
```

- **Output JSON**:

```json
{
  "source_report_id": "uuid",
  "signal_type": "medical_emergency",
  "description": "Persona herida en zona inundada con aumento del nivel del agua.",
  "location": "Barrio Santa Ana",
  "coordinates": null,
  "affected_people": 1,
  "raw_text": "Hay una señora herida y el agua sigue subiendo en Santa Ana.",
  "confidence": 0.9,
  "modality": "audio"
}
```

- **Dependencias**: LLM texto, `extract_location`, Pydantic.
- **AMD/vLLM**: sí para mejor robustez; puede tener fallback heurístico local.
- **Ejemplo de uso**:

```python
signal = await normalize_signal({
    "report_id": report.id,
    "modality": "text",
    "raw_text": report.content
})
```

## 5. `detect_duplicates`

- **Propósito**: identificar señales redundantes del mismo incidente.
- **Input JSON**:

```json
{
  "signals": [
    {
      "id": "s1",
      "signal_type": "flood",
      "location": "Barrio Santa Ana",
      "description": "Familias en techos por inundación"
    },
    {
      "id": "s2",
      "signal_type": "flood",
      "location": "Barrio Santa Ana",
      "description": "Vecinos atrapados sobre techos"
    }
  ],
  "threshold": 0.75
}
```

- **Output JSON**:

```json
{
  "unique_signal_ids": ["s1"],
  "duplicate_map": {
    "s1": ["s2"]
  }
}
```

- **Dependencias**: fuzzy matching, distancia geográfica opcional.
- **AMD/vLLM**: local.
- **Ejemplo de uso**:

```python
dedup = await detect_duplicates({"signals": signals, "threshold": 0.75})
```

## 6. `classify_priority`

- **Propósito**: asignar `P0/P1/P2/P3`.
- **Input JSON**:

```json
{
  "signal_type": "person_trapped",
  "raw_text": "Dos niños atrapados en el segundo piso.",
  "affected_people": 2
}
```

- **Output JSON**:

```json
{
  "priority": "P0",
  "rationale": "Personas atrapadas con riesgo inmediato."
}
```

- **Dependencias**: reglas críticas, LLM opcional.
- **AMD/vLLM**: opcional; empezar local.
- **Ejemplo de uso**:

```python
priority = await classify_priority(signal_payload)
```

## 7. `recommend_resources`

- **Propósito**: proponer recursos concretos y defendibles.
- **Input JSON**:

```json
{
  "incident_id": "inc-01",
  "priority": "P1",
  "signal_type": "flood",
  "affected_people": 12,
  "location": "Barrio Santa Ana"
}
```

- **Output JSON**:

```json
{
  "incident_id": "inc-01",
  "resources": [
    {
      "resource_type": "rescue_team",
      "description": "Equipo de rescate acuático",
      "quantity": 2,
      "urgency": "immediate",
      "rationale": "Familias aisladas por inundación."
    }
  ]
}
```

- **Dependencias**: catálogo local de recursos, LLM texto.
- **AMD/vLLM**: sí, idealmente.
- **Ejemplo de uso**:

```python
resources = await recommend_resources(incident_payload)
```

## 8. `generate_dispatch_message`

- **Propósito**: generar mensaje operativo corto.
- **Input JSON**:

```json
{
  "incident": {
    "id": "inc-01",
    "priority": "P1",
    "location": "Barrio Santa Ana",
    "description": "Familias aisladas por inundación."
  },
  "resources": [
    {
      "resource_type": "rescue_team",
      "quantity": 2
    }
  ],
  "destination": "Brigada Norte",
  "channel": "whatsapp"
}
```

- **Output JSON**:

```json
{
  "incident_id": "inc-01",
  "destination": "Brigada Norte",
  "channel": "whatsapp",
  "message": "P1 Santa Ana: familias aisladas por inundación. Despachar 2 equipos de rescate acuático. Verificar acceso por calle 12.",
  "length": 123
}
```

- **Dependencias**: LLM texto, guardrails de longitud.
- **AMD/vLLM**: sí.
- **Ejemplo de uso**:

```python
dispatch = await generate_dispatch_message(payload)
```

## 9. `calculate_confidence`

- **Propósito**: calcular confianza de señal o incidente.
- **Input JSON**:

```json
{
  "signals": [
    { "id": "s1", "confidence": 0.9, "modality": "audio" },
    { "id": "s2", "confidence": 0.8, "modality": "image" }
  ]
}
```

- **Output JSON**:

```json
{
  "confidence": 0.86,
  "factors": [
    "multi_modal_confirmation",
    "high_source_confidence"
  ]
}
```

- **Dependencias**: heurística local.
- **AMD/vLLM**: local.
- **Ejemplo de uso**:

```python
conf = calculate_confidence({"signals": signal_group})
```

## 10. `fetch_amd_metrics`

- **Propósito**: recoger métricas de vLLM y MI300X para la demo.
- **Input JSON**:

```json
{
  "vllm_base_url": "http://amd-vllm-host:8000/v1",
  "demo_mode": false
}
```

- **Output JSON**:

```json
{
  "gpu_name": "AMD Instinct MI300X",
  "gpu_utilization_percent": 72.0,
  "vram_used_gb": 108.4,
  "temperature_c": 61.0,
  "power_watts": 510.0,
  "model_name": "Qwen2.5-VL-7B-Instruct",
  "total_requests": 38,
  "avg_latency_ms": 742.0,
  "tokens_per_second": 118.0,
  "source": "rocm_smi"
}
```

- **Dependencias**: `rocm-smi`, `/metrics`, parser Prometheus.
- **AMD/vLLM**: sí; este skill existe para demostrar el uso de AMD.
- **Ejemplo de uso**:

```python
metrics = await fetch_amd_metrics({
    "vllm_base_url": settings.vllm_base_url,
    "demo_mode": settings.demo_mode
})
```

## 11. `export_incident_report`

- **Propósito**: exportar incidente o resumen para jurados, PDF/JSON/CSV.
- **Input JSON**:

```json
{
  "session_id": "uuid",
  "format": "json",
  "include_metrics": true
}
```

- **Output JSON**:

```json
{
  "session_id": "uuid",
  "format": "json",
  "file_path": "backend/data/exports/session_uuid.json"
}
```

- **Dependencias**: serialización local.
- **AMD/vLLM**: local.
- **Ejemplo de uso**:

```python
artifact = export_incident_report({
    "session_id": session_id,
    "format": "json",
    "include_metrics": True
})
```

## Reglas de diseño para todas las skills

1. Input y output deben ser serializables a JSON.
2. Toda salida debe validarse con Pydantic.
3. Las skills con LLM deben pedir JSON estricto.
4. Todo campo desconocido debe salir como `null`, no inventado.
5. Toda skill debe devolver `confidence` o motivo de ausencia cuando aplique.
6. Las skills críticas deben incluir `source_report_id` o `incident_id`.
