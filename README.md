# ReliefLens AI

ReliefLens AI is a multimodal, human-in-the-loop emergency triage demo built for the AMD Developer Hackathon. It accepts field evidence such as text, image uploads, optional audio, browser location, map-selected location, and textual place references, then produces prioritized incidents with recommended resources and operational explanations.

## Public demo

- Hugging Face Space frontend: `https://lablab-ai-amd-developer-hackathon-relieflens-frontend.hf.space`
- AMD FastAPI backend: `http://134.199.203.136:8080`

## What the system does

- Ingests image, text, optional audio, and location hints
- Resolves location from the best available source without inventing exact coordinates
- Produces prioritized incidents with severity, findings, and recommended resources
- Shows a crisis operations dashboard with a live queue, incident map, and AMD telemetry

## Location inference model

ReliefLens does not pretend that a photo alone can reveal exact location. Location is resolved in this order:

1. Browser geolocation, if the user shares it
2. Image GPS EXIF, if present
3. Textual location hints such as `Santa Ana`
4. Manual correction through map click
5. `Location requires human review` when evidence is insufficient

If there is no browser location, no EXIF GPS, and no usable text location, the incident stays unresolved and requires human review.

## Safety

- Synthetic demo data only
- Human-in-the-loop required
- Not connected to emergency services
- Not for real-world dispatch
- AI suggestions are advisory only

## Demo mode vs future multimodal mode

Current behavior uses deterministic, rule-based fallback analysis. It does not claim real computer vision or real audio transcription unless those models are explicitly connected later.

Current fallback behavior:

- Text, filenames, and location hints drive incident classification
- Audio files are accepted but returned as `received_not_transcribed`
- Images are inspected only for metadata and optional EXIF GPS

Future mode can plug in:

- multimodal vision models on AMD
- ASR for audio transcription
- stronger geocoding and entity extraction
- richer dispatch planning

## Architecture

Hugging Face Docker Space -> Next.js frontend -> `/backend` rewrite proxy -> AMD FastAPI backend -> ROCm / MI300X / vLLM

The browser does not call `localhost:8080`, `127.0.0.1:8080`, or the AMD public IP directly from client-side code. Frontend API requests use `/backend`, and Next.js rewrites that path to the backend.

## Frontend evidence flow

The evidence intake panel supports:

- image upload
- optional audio upload
- `What is happening?`
- `Where is this happening?`
- `Use my current location`
- map click to adjust or set location
- `Analyze Evidence`

## Backend endpoints

- `GET /health`
- `GET /api/demo/incidents`
- `GET /api/demo/scenario`
- `POST /api/demo/run`
- `POST /api/evidence/intake`
- `POST /api/demo/analyze-image`
- `GET /api/amd/performance`

## Local development

### Backend

```bash
cd backend
python -m pytest tests -v
python -m uvicorn main:app --host 0.0.0.0 --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Deployment to AMD Cloud

```bash
cd ~/ReliefLensAI
git pull origin main

cd backend
source .venv/bin/activate
pip install -r requirements.txt

tmux kill-session -t backend 2>/dev/null || true
tmux new -d -s backend "cd ~/ReliefLensAI/backend && source .venv/bin/activate && python -m uvicorn main:app --host 0.0.0.0 --port 8080"

curl http://127.0.0.1:8080/health
curl http://134.199.203.136:8080/health
```

## Deployment to Hugging Face Docker Space

1. Copy the updated `frontend/` application into the Space repository.
2. Keep:
   - `NEXT_PUBLIC_API_URL=/backend`
   - `NEXT_PUBLIC_API_BASE_URL=/backend`
   - `NEXT_PUBLIC_BACKEND_URL=/backend`
3. Push and wait for the Docker build.
4. Test:
   - `https://lablab-ai-amd-developer-hackathon-relieflens-frontend.hf.space/backend/health`

The Space container uses Node 20, builds the Next.js app, and serves it on port `7860`.

## Known limitations

- Current incident classification is rule-based fallback analysis
- Audio is accepted but not transcribed unless an ASR model is connected later
- EXIF GPS is only available for images that actually contain GPS metadata
- Text-location resolution is intentionally conservative and does not invent precise coordinates
- Human review remains mandatory for operational use
