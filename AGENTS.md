# ReliefLens AI Agentic Architecture Spec

## 1. Objetivo

ReliefLens AI es un sistema human-in-the-loop para triage multimodal de desastre orientado a demo de hackathon. Debe transformar texto, audio, imagen y CSV de ubicación en:

- incidentes únicos consolidados
- prioridad `P0/P1/P2/P3`
- evidencia asociada
- recursos recomendados
- mensajes listos para brigadas
- tablero operativo
- panel de uso AMD

La meta de 48 horas no es construir autonomía compleja. La meta es construir una tubería confiable, visible y rápida de demostrar.

## 2. Decisión de orquestación

### Recomendación

Para el MVP de hackathon conviene **orquestación simple con funciones Python + clases de agente**, no CrewAI y no LangGraph completo en la primera iteración.

### Razón

1. Ya existe un `backend/services/pipeline.py` que modela bien el DAG real.
2. El flujo es mayormente determinista: ingestión -> enriquecimiento multimodal -> normalización -> deduplicación -> triage -> recursos -> dispatch.
3. CrewAI agrega overhead de coordinación y es menos útil cuando el flujo no requiere negociación entre agentes.
4. LangGraph vale la pena solo si van a implementar durante la hackathon:
   - pausa/reanudación
   - retries por nodo
   - human approval en nodos formales
   - trazabilidad tipo grafo para demo técnica

### Decisión práctica

- **MVP**: `FastAPI + Pipeline + Agent Modules + Pydantic`.
- **Upgrade si sobra tiempo**: envolver los agentes existentes en un grafo LangGraph, manteniendo los mismos contratos de entrada/salida.
- **No recomendado para 48h**: CrewAI como capa principal.

## 3. Agentes recomendados

### A. IntakeRouterAgent

- **Responsabilidad**: clasificar cada input por modalidad, validar metadatos mínimos y generar `ReportInput`.
- **Input**: archivo o payload crudo de upload.
- **Output**: `ReportInput`.
- **Skills/tools**: validación MIME, parser de CSV, extractor de metadata, hash de archivo.
- **Modelo recomendado**: ninguno; determinista.
- **Prompt base**: no aplica.
- **Riesgos**: MIME incorrecto, CSV mal formado, metadata vacía, archivos pesados.
- **Validación**:
  - `report_type` válido
  - `session_id` presente
  - `content` o `file_path` presente
  - tamaño y extensión dentro de límites

### B. AudioTranscriptionAgent

- **Responsabilidad**: convertir audio corto a texto utilizable para triage.
- **Input**: `ReportInput(report_type="audio")`.
- **Output**: transcripción limpia en español y texto bruto.
- **Skills/tools**: `transcribe_audio`, normalización ligera de ASR.
- **Modelo recomendado**:
  - MVP: `distil-whisper/distil-large-v3` o `faster-whisper`
  - si ROCm estable: Whisper en `transformers` sobre AMD
- **Prompt base**:
  - "Transcribe este audio de emergencia en español. Conserva ubicación, número de personas, lesiones, bloqueos y pedidos de ayuda. No inventes información."
- **Riesgos**: ruido, solapamiento de voces, nombres de barrios mal transcritos.
- **Validación**:
  - longitud mínima de texto
  - confidence de ASR
  - detección de tokens sospechosos
  - fallback a texto bruto si falla limpieza

### C. VisionEvidenceAgent

- **Responsabilidad**: convertir imagen a evidencia textual estructurable.
- **Input**: `ReportInput(report_type="image")`.
- **Output**: caption operacional con daños, personas, agua, fuego, accesos, riesgo eléctrico.
- **Skills/tools**: `caption_image`, OCR opcional, compresión/redimensionado.
- **Modelo recomendado**:
  - `Qwen/Qwen2.5-VL-7B-Instruct`
  - alternativa: `Llama-3.2-11B-Vision-Instruct`
- **Prompt base**:
  - "Describe la escena para respuesta a desastres. Extrae: peligro inmediato, personas visibles, daño estructural, nivel de agua, accesibilidad y evidencia accionable. No especules."
- **Riesgos**: alucinación visual, mala lectura de escala, sobreinterpretación.
- **Validación**:
  - salida con campos esperados
  - negar inferencias no observables
  - confidence menor si la imagen es borrosa/nocturna

### D. SignalNormalizationAgent

- **Responsabilidad**: convertir texto, transcripción o caption en `NormalizedSignal`.
- **Input**: texto bruto + `report_id` + modalidad + metadata opcional.
- **Output**: `NormalizedSignal`.
- **Skills/tools**: `normalize_signal`, `extract_location`, `calculate_confidence`.
- **Modelo recomendado**:
  - texto: `Qwen2.5-7B-Instruct` o `Llama-3.1-8B-Instruct`
- **Prompt base**:
  - "Convierte el reporte a JSON estricto con: signal_type, description, location, coordinates, affected_people, confidence. Si algo no está presente, usa null. No inventes coordenadas."
- **Riesgos**: JSON inválido, coordenadas inventadas, clasificación demasiado genérica.
- **Validación**:
  - parseo Pydantic
  - `confidence` entre 0 y 1
  - `signal_type` en enum
  - campos faltantes como `null`, no inventados

### E. DeduplicationAgent

- **Responsabilidad**: agrupar reportes redundantes del mismo incidente.
- **Input**: lista de `NormalizedSignal`.
- **Output**: lista de señales únicas o clusters con miembros.
- **Skills/tools**: `detect_duplicates`, fuzzy match, hash semántico, proximidad temporal/espacial.
- **Modelo recomendado**:
  - MVP: heurístico + embeddings livianos opcionales
  - no usar LLM si no hace falta
- **Prompt base**: no aplica en MVP.
- **Riesgos**: fusionar incidentes distintos en la misma cuadra; no unir duplicados con wording distinto.
- **Validación**:
  - umbral explícito
  - misma zona + mismo tipo + ventana temporal
  - conservar trazabilidad a reportes originales

### F. TriagePriorityAgent

- **Responsabilidad**: consolidar señales en `Incident` y asignar `P0/P1/P2/P3`.
- **Input**: señales deduplicadas o clusters.
- **Output**: lista de `Incident`.
- **Skills/tools**: `classify_priority`, `calculate_confidence`, reglas de severidad.
- **Modelo recomendado**:
  - MVP: reglas primero, LLM como desempate
  - texto: `Qwen2.5-7B-Instruct`
- **Prompt base**:
  - "Asigna prioridad de respuesta humanitaria. P0: riesgo inminente de muerte. P1: urgencia alta. P2: atención necesaria sin riesgo inmediato. P3: informativo o baja prioridad. Devuelve prioridad y breve rationale."
- **Riesgos**: sobrepriorización por lenguaje emocional; subpriorización de atrapados o trauma.
- **Validación**:
  - reglas duras para palabras críticas
  - revisión humana obligatoria para `P0`
  - rationale corto y verificable

### G. ResourcePlanningAgent

- **Responsabilidad**: recomendar recursos por incidente.
- **Input**: `Incident`.
- **Output**: `ResourceRecommendation[]`.
- **Skills/tools**: `recommend_resources`.
- **Modelo recomendado**:
  - `Qwen2.5-7B-Instruct`
- **Prompt base**:
  - "Recomienda recursos humanitarios concretos para este incidente. Incluye tipo, cantidad, urgencia y rationale operacional. No recomiendes activos imposibles para una brigada local."
- **Riesgos**: recursos irreales, cantidades arbitrarias, lenguaje muy militar.
- **Validación**:
  - catálogo finito de recursos
  - cantidad positiva
  - urgencia en enum
  - coherencia con prioridad

### H. DispatchMessageAgent

- **Responsabilidad**: generar mensaje corto listo para brigada o sala situacional.
- **Input**: `Incident` + `ResourceRecommendation[]`.
- **Output**: `DispatchMessage`.
- **Skills/tools**: `generate_dispatch_message`.
- **Modelo recomendado**:
  - `Qwen2.5-7B-Instruct`
- **Prompt base**:
  - "Genera un mensaje breve y accionable para brigada. Incluye prioridad, lugar, situación, recursos y siguiente acción. Evita lenguaje ambiguo."
- **Riesgos**: mensajes largos, vagos o no accionables.
- **Validación**:
  - menos de 400 caracteres para radio/chat
  - incluye prioridad, ubicación y acción
  - no contiene instrucciones médicas peligrosas

### I. AMDTelemetryAgent

- **Responsabilidad**: recolectar métricas para demostrar uso de MI300X/vLLM.
- **Input**: base URL de vLLM, host AMD.
- **Output**: `AMDPerformanceMetric`.
- **Skills/tools**: `fetch_amd_metrics`, `/metrics`, `rocm-smi`.
- **Modelo recomendado**: ninguno; determinista.
- **Prompt base**: no aplica.
- **Riesgos**: métricas simuladas mezcladas con reales, formatos inconsistentes.
- **Validación**:
  - timestamp
  - origen de cada métrica
  - diferenciar `demo_mode=true`

### J. CrisisRoomSummaryAgent

- **Responsabilidad**: ensamblar el resumen operativo final para UI.
- **Input**: incidentes, recursos, mensajes, métricas.
- **Output**: `CrisisRoomSummary`.
- **Skills/tools**: agregación determinista, export opcional.
- **Modelo recomendado**: ninguno.
- **Prompt base**: no aplica.
- **Riesgos**: conteos inconsistentes, incidentes sin evidencia, panel sin P0 destacados.
- **Validación**:
  - suma por prioridad consistente
  - cada incidente con evidencia
  - tiempos de proceso presentes

## 4. Skills reutilizables

El catálogo detallado vive en [.agents/skills/README.md](./.agents/skills/README.md).

Skills mínimas para el MVP:

- `transcribe_audio`
- `caption_image`
- `extract_location`
- `normalize_signal`
- `detect_duplicates`
- `classify_priority`
- `recommend_resources`
- `generate_dispatch_message`
- `calculate_confidence`
- `fetch_amd_metrics`
- `export_incident_report`

## 5. Pipeline completo

### Paso 1. Upload

- UI sube texto, audio, imagen y CSV.
- Backend guarda archivos y crea `ReportInput`.
- Se genera `session_id` para la demo actual.

### Paso 2. Separación por modalidad

- `text`: pasa directo a normalización.
- `audio`: pasa a transcripción.
- `image`: pasa a caption visual.
- `csv/location`: se parsea a señales de contexto o ubicación.

### Paso 3. Procesamiento de audio

- ASR genera transcripción.
- limpieza ligera de puntuación
- conservación de nombres propios y números
- confidence de ASR

### Paso 4. Procesamiento de imagen

- caption operacional
- OCR opcional si aparece señalización o letreros
- extracción de peligros visibles

### Paso 5. Normalización de señales

- todo se convierte a `NormalizedSignal`
- se extraen:
  - tipo de señal
  - descripción corta
  - ubicación
  - coordenadas si existen
  - personas afectadas
  - confidence

### Paso 6. Detección de duplicados

- agrupar por:
  - tipo de incidente
  - proximidad geográfica
  - similitud textual
  - ventana temporal
- conservar lista de `source_report_id`

### Paso 7. Priorización

- reglas duras primero
- LLM como respaldo para casos ambiguos
- `P0` y `P1` destacados en dashboard

### Paso 8. Planeación de recursos

- por incidente consolidado
- recursos concretos, pocos y creíbles
- cantidades discretas y urgencia

### Paso 9. Generación de mensajes

- mensaje corto por incidente
- formato listo para WhatsApp/radio/brigada

### Paso 10. Guardrail human-in-the-loop

- operador revisa:
  - incidentes `P0`
  - incidentes con confidence baja
  - merge dudoso de duplicados
- solo después se marca `human_approved=true`

### Paso 11. Render del dashboard

- KPIs por prioridad
- lista de incidentes
- panel de evidencia
- mapa con coordenadas aproximadas
- panel AMD con latencia, throughput y uso GPU

## 6. Schemas Pydantic requeridos

El backend actual ya tiene la base correcta. Estos son los contratos objetivo.

### ReportInput

```python
class ReportInput(BaseModel):
    id: str
    session_id: str
    report_type: Literal["text", "audio", "image", "csv", "location"]
    content: str | None
    file_path: str | None
    metadata: dict[str, Any] = {}
    created_at: datetime
```

### NormalizedSignal

```python
class NormalizedSignal(BaseModel):
    id: str
    source_report_id: str
    signal_type: Literal[
        "structural_damage", "person_trapped", "medical_emergency",
        "flood", "fire", "missing_person", "resource_request",
        "safe_status", "unknown"
    ]
    description: str
    location: str | None
    coordinates: dict[str, float] | None
    affected_people: int | None
    raw_text: str
    confidence: float
    modality: str
    created_at: datetime
```

### EvidenceItem

```python
class EvidenceItem(BaseModel):
    id: str
    report_id: str
    modality: str
    description: str
    file_path: str | None
    timestamp: datetime
```

### Incident

```python
class Incident(BaseModel):
    id: str
    session_id: str
    title: str
    description: str
    priority: Literal["P0", "P1", "P2", "P3"]
    status: Literal["new", "acknowledged", "in_progress", "resolved"]
    signal_ids: list[str]
    evidence: list[EvidenceItem]
    location: str | None
    coordinates: dict[str, float] | None
    affected_people: int | None
    confidence: float
    created_at: datetime
    updated_at: datetime
    human_approved: bool = False
    notes: str | None = None
```

### ResourceRecommendation

```python
class ResourceRecommendation(BaseModel):
    id: str
    incident_id: str
    resource_type: str
    description: str
    quantity: int
    urgency: Literal["immediate", "within_hour", "today"]
    rationale: str
```

### DispatchMessage

```python
class DispatchMessage(BaseModel):
    id: str
    incident_id: str
    priority: Literal["P0", "P1", "P2", "P3"]
    destination: str
    channel: Literal["radio", "whatsapp", "ops_room"]
    message: str
    created_at: datetime
```

### AMDPerformanceMetric

```python
class AMDPerformanceMetric(BaseModel):
    gpu_name: str
    gpu_utilization_percent: float
    vram_used_gb: float
    temperature_c: float | None
    power_watts: float | None
    model_name: str
    total_requests: int
    avg_latency_ms: float
    tokens_per_second: float | None
    timestamp: datetime
    source: Literal["rocm_smi", "vllm_metrics", "demo"]
```

### CrisisRoomSummary

```python
class CrisisRoomSummary(BaseModel):
    session_id: str
    scenario_name: str
    total_reports: int
    total_signals: int
    total_incidents: int
    incidents_by_priority: dict[str, int]
    critical_incidents: list[Incident]
    resource_recommendations: list[ResourceRecommendation]
    dispatch_messages: list[DispatchMessage]
    amd_metrics: AMDPerformanceMetric | None
    processing_time_seconds: float
    created_at: datetime
    status: Literal["processing", "ready", "error"]
```

## 7. Endpoints FastAPI recomendados

### `POST /api/crisis-room`

- **Descripción**: ejecutar pipeline end-to-end para una sesión.
- **Request**: `UploadBatch`
- **Response**: `CrisisRoomSummary`

### `POST /api/reports/upload`

- **Descripción**: subir archivos y registrar `ReportInput`.
- **Request**: `multipart/form-data`
- **Response**:

```json
{
  "session_id": "uuid",
  "uploaded_reports": 29,
  "reports": [{ "id": "uuid", "report_type": "image", "file_path": "..." }]
}
```

### `POST /api/reports/process`

- **Descripción**: procesar una lista ya cargada.
- **Request**:

```json
{
  "session_id": "uuid",
  "scenario_name": "Santa Ana Flood",
  "reports": []
}
```

- **Response**: `CrisisRoomSummary`

### `GET /api/incidents`

- **Descripción**: listar incidentes, opcionalmente por `session_id`.
- **Response**: `Incident[]`

### `GET /api/incidents/{id}`

- **Descripción**: obtener incidente único.
- **Response**: `Incident`

### `POST /api/incidents/{id}/dispatch-message`

- **Descripción**: regenerar o aprobar mensaje de brigada.
- **Request**:

```json
{
  "destination": "Brigada Norte",
  "channel": "whatsapp"
}
```

- **Response**: `DispatchMessage`

### `GET /api/amd/performance`

- **Descripción**: métricas del backend AMD/vLLM.
- **Response**: `AMDPerformanceMetric`

### `GET /api/demo/scenario`

- **Descripción**: devolver escenario listo para demo.
- **Response**: JSON con mensajes, audios, imágenes, CSV y ground truth esperada.

## 8. Estructura de carpetas recomendada

La base actual es buena. Recomiendo mantener esta forma:

```text
ReliefLensAI/
├── AGENTS.md
├── .agents/
│   └── skills/
│       └── README.md
├── backend/
│   ├── api/
│   │   └── routes/
│   ├── agents/
│   ├── core/
│   ├── data/
│   ├── schemas/
│   ├── services/
│   ├── skills/
│   ├── tests/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
├── demo_data/
├── docs/
├── scripts/
└── README.md
```

## 9. Integración AMD concreta

### Variables de entorno

```env
APP_ENV=dev
DEMO_MODE=false
STORAGE_PATH=backend/data

VLLM_BASE_URL=http://amd-vllm-host:8000/v1
VLLM_API_KEY=EMPTY
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct
VLLM_VISION_MODEL=Qwen/Qwen2.5-VL-7B-Instruct

AMD_METRICS_MODE=rocm
ROCM_SMI_PATH=/opt/rocm/bin/rocm-smi
AMD_GPU_NAME=MI300X
```

### Endpoint OpenAI-compatible

`vLLM` debe exponerse con:

- `POST /v1/chat/completions`
- opcional `GET /metrics`

### Flujo de llamada

1. FastAPI recibe request.
2. `Pipeline` decide qué etapas requieren inferencia.
3. Texto y visión llaman a `VLLMClient`.
4. `VLLMClient` envía payload OpenAI-compatible a `VLLM_BASE_URL`.
5. ASR corre aparte:
   - preferible como servicio Python local con `transformers` o `faster-whisper`
   - si ROCm no está listo, CPU para MVP
6. `fetch_amd_metrics` consulta `rocm-smi` y/o `/metrics`.

### Qué corre en AMD

Debe correr en MI300X:

- `normalize_signal` con LLM
- `caption_image` con modelo vision
- `recommend_resources`
- `generate_dispatch_message`
- opcional `classify_priority` cuando no baste la regla

Puede correr local/CPU:

- upload/parsing
- CSV parsing
- deduplicación heurística
- export
- ASR en fallback si ROCm no está estable

### Métricas AMD a capturar

- nombre GPU
- utilización GPU %
- VRAM usada
- temperatura
- potencia
- requests al servidor vLLM
- latencia promedio por llamada
- tokens/segundo
- tiempo total de procesamiento de la crisis room
- conteo de inferencias por modalidad

## 10. Plan por fases

### Fase 1. MVP mínimo funcional

- upload de texto, imagen simulada y CSV
- pipeline completo
- incidentes con prioridad
- recursos
- mensajes
- JSON persistence
- dashboard básico

### Fase 2. Multimodal real

- ASR real
- caption de imagen real
- evidencias por incidente
- deduplicación mejorada

### Fase 3. Dashboard visual

- tarjetas por prioridad
- mapa simple
- tabla de incidentes
- detalle expandible con evidencia

### Fase 4. AMD performance panel

- panel de métricas en tiempo real
- badge de modelo usado
- latencia total y por llamada

### Fase 5. Polish para demo

- dataset Santa Ana fijo
- botón "Run Demo"
- seed determinista para resultados
- textos cortos y consistentes
- manejo de error elegante

## 11. Criterios de aceptación

El sistema está listo para presentar cuando cumple esto:

1. Carga el escenario de demo completo en una sola sesión.
2. Consolida duplicados en menos incidentes que reportes.
3. Identifica al menos 2 casos críticos como `P0` o `P1`.
4. Cada incidente muestra evidencia, prioridad y ubicación.
5. Genera recursos recomendados coherentes.
6. Genera mensajes listos para brigada.
7. El dashboard renderiza KPIs, incidentes y panel AMD.
8. El pipeline corre de punta a punta sin intervención manual técnica.
9. Existe guardrail de aprobación humana para incidentes críticos.
10. Puede explicarse en 3 minutos con una demo visual clara.

## 12. Simplificaciones correctas para 48 horas

Mantener estas simplificaciones es una buena decisión:

- deduplicación heurística en lugar de clustering complejo
- SQLite/JSON local en lugar de base distribuida
- LangGraph solo si queda tiempo
- mapa con coordenadas aproximadas, no GIS avanzado
- métricas AMD básicas, no observabilidad completa
- ASR CPU fallback si ROCm ASR consume demasiado tiempo

## 13. Siguiente implementación recomendada

1. cerrar contratos Pydantic y respuestas API
2. fijar escenario demo de Santa Ana
3. estabilizar `pipeline.py` con salidas deterministas
4. conectar `VLLMClient` a MI300X para texto y visión
5. montar dashboard con botón único de demo
