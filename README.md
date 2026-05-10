# ReliefLens AI

ReliefLens AI is a multimodal, human-in-the-loop emergency triage demo built for the AMD Developer Hackathon. It accepts public field evidence such as text, image uploads, optional audio, browser location, map-selected location, and textual place references, then produces prioritized incidents with recommended resources, location confidence, and operational explanations.

## Public demo

- Hugging Face Space frontend: `https://lablab-ai-amd-developer-hackathon-relieflens-frontend.hf.space`
- AMD FastAPI backend: `http://134.199.203.136:8080`

## Application routes

- Public portal: `/emergencies`
- Private admin: `/admin`
- Admin login: `/admin/login`
- Admin incident queue: `/admin/incidents`
- Admin incident detail: `/admin/incidents/[id]`
- Admin telemetry: `/admin/telemetry`

The public portal is limited to evidence submission and public-safe confirmation details. Sensitive incident management stays behind authenticated admin routes.

## What the system does

- Ingests image, text, optional audio, and location hints
- Resolves location from the best available source without inventing exact coordinates
- Produces prioritized incidents with severity, findings, and recommended resources
- Separates public intake from private incident management
- Shows admin telemetry for backend health and AMD demo metrics

## Location resolution

ReliefLens does not pretend that a photo alone can reveal exact location. Location is resolved in this order:

1. Browser geolocation, if the user shares it
2. Manual map click, if the user selects or corrects a point
3. Image GPS EXIF, if present
4. Textual location hints such as `Santa Ana`
5. `Location requires human review` when evidence is insufficient

If there is no browser location, no map point, no EXIF GPS, and no usable text location, the incident stays unresolved and requires human review.

## Evidence intake behavior

The public `/emergencies` portal supports:

- image upload
- optional audio recording or upload
- `What is happening?`
- `Where is this happening?`
- `Use my current location`
- map click to adjust or set location
- `Analyze Evidence`

Current behavior uses deterministic, rule-based fallback analysis:

- text, filenames, and location hints drive incident classification
- audio files are accepted but returned as `received_not_transcribed` when no ASR model is connected
- images are inspected only for metadata and optional EXIF GPS
- the system does not claim real vision inference unless a model is explicitly connected later

## Qwen-powered incident analysis

Rescue Evidence Intelligence can analyze submitted evidence with a Qwen model through an OpenAI-compatible API.

Required backend variables:

- `QWEN_BASE_URL`
- `QWEN_API_KEY`
- `QWEN_MODEL`
- `QWEN_ENABLED`

Behavior:

- if `QWEN_ENABLED=false`, the backend uses the existing rule-based fallback classifier
- if `QWEN_ENABLED=true`, the backend attempts Qwen analysis first
- if the model server times out, returns malformed JSON, or is unavailable, the backend falls back to `rule_based_fallback`
- the frontend never receives the API key

The admin dashboard shows:

- incident type
- severity
- confidence
- detected risks
- evidence summary
- recommended resources
- requires human review
- analysis provider: `qwen` or `rule_based_fallback`

## Admin incident management

Authenticated admins can:

- sign in through `/admin/login`
- review the full incident queue
- inspect detailed evidence metadata
- update incident status, review state, notes, and assigned team
- inspect backend and AMD telemetry

Required backend environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_SECRET`
- `ADMIN_TOKEN_EXPIRE_MINUTES`

These values must stay on the backend. Do not expose them through `NEXT_PUBLIC_*` variables or commit secrets to git.

## Safety

- Synthetic demo data only
- Human-in-the-loop required
- Not connected to emergency services
- Not for real-world dispatch
- AI suggestions are advisory only

## Security limitations

- The hackathon MVP uses bearer token authentication for `/api/admin/*`
- The frontend stores the admin access token in `sessionStorage`
- This is acceptable for the demo, but production should use HTTPS end-to-end and secure HttpOnly cookies
- Admin credentials must be configured from backend environment variables, not frontend code

## Architecture

Local development:

`Next.js frontend -> /backend rewrite proxy -> FastAPI backend`

Hugging Face Space deployment:

`Hugging Face Docker Space -> nginx on :7860 -> Next.js frontend + FastAPI backend -> external AMD Qwen OpenAI-compatible endpoint`

The browser does not call `localhost:8080`, `127.0.0.1:8080`, or the AMD public IP directly from client-side code. Local frontend requests use `/backend`. The Hugging Face Space build uses same-origin `/api`, which nginx proxies to the internal FastAPI backend.

## Backend endpoints

- `GET /health`
- `GET /api/demo/incidents`
- `GET /api/demo/scenario`
- `POST /api/demo/run`
- `POST /api/evidence/intake`
- `GET /api/evidence/status/{tracking_code}`
- `POST /api/demo/analyze-image`
- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET /api/admin/incidents`
- `GET /api/admin/incidents/{incident_id}`
- `PATCH /api/admin/incidents/{incident_id}`
- `GET /api/admin/telemetry`
- `GET /api/amd/performance`

## Local development

### Backend

```bash
cd backend
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=admin123
set ADMIN_TOKEN_SECRET=local-dev-secret-change-me
set ADMIN_TOKEN_EXPIRE_MINUTES=720
set QWEN_ENABLED=false
python -m pytest tests -v
python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Run locally with Qwen disabled:

- keep `QWEN_ENABLED=false`
- the backend will use the rule-based fallback pipeline

Run locally with Qwen through vLLM or another OpenAI-compatible server:

```bash
cd backend
set QWEN_BASE_URL=http://127.0.0.1:8000/v1
set QWEN_API_KEY=token-abc123
set QWEN_MODEL=Qwen/Qwen2.5-7B-Instruct
set QWEN_ENABLED=true
python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

Local frontend environment file:

```env
NEXT_PUBLIC_API_URL=/backend
NEXT_PUBLIC_API_BASE_URL=/backend
NEXT_PUBLIC_BACKEND_URL=/backend
BACKEND_ORIGIN=http://localhost:8080
```

Local proxy checks:

- `http://localhost:3000/backend/health`
- `http://localhost:3000/admin/login`

Local admin login test credentials:

- username: `admin`
- password: `admin123`

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

Set or export these backend variables on the AMD VM before starting the app:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_SECRET`
- `ADMIN_TOKEN_EXPIRE_MINUTES`

## Deployment to Hugging Face Docker Space

The repository now includes a root `Dockerfile` for a single Hugging Face Docker Space container.

Container behavior:

- FastAPI backend runs internally on `127.0.0.1:8080`
- Next.js frontend runs internally on `127.0.0.1:3000`
- `nginx` exposes only port `7860`
- `/` routes to the Next.js frontend
- `/api/*` routes to the FastAPI backend
- `/backend/*` is also proxied to the backend for compatibility with the older frontend path layout

Public browser behavior:

- the browser calls same-origin `/api` in the Hugging Face Space build
- no Qwen secret is exposed to the frontend bundle
- the backend reads `QWEN_*` variables at runtime inside the container

Space variables:

- `QWEN_ENABLED=true`
- `QWEN_BASE_URL=http://AMD_PUBLIC_IP:8000/v1`
- `QWEN_MODEL=Qwen/Qwen2-7B-Instruct`
- `NEXT_PUBLIC_API_URL=/api`
- `NEXT_PUBLIC_API_BASE_URL=/api`
- `NEXT_PUBLIC_BACKEND_URL=/api`

Space secrets:

- `QWEN_API_KEY`

Do not put `QWEN_API_KEY`, admin credentials, or token secrets in any `NEXT_PUBLIC_*` variable.

Build and push flow:

1. Push this repository to the Hugging Face Space repo.
2. Configure the Space variables and secret above.
3. Wait for the Docker build to finish.
4. Test:
   - `https://YOUR_SPACE.hf.space/health`
   - `https://YOUR_SPACE.hf.space/api/demo/incidents`
   - `https://YOUR_SPACE.hf.space/emergencies`

The Space container uses the root `Dockerfile` and serves the full app on port `7860`.

## Hugging Face Space + AMD Qwen Deployment

This deployment mode keeps Qwen external on AMD infrastructure while Hugging Face hosts the public UI and API gateway container.

Architecture:

`Hugging Face Docker Space -> nginx on :7860 -> Next.js on :3000 + FastAPI on :8080 -> AMD Qwen OpenAI-compatible endpoint`

Recommended AMD Qwen runtime variables for the Space:

- `QWEN_ENABLED=true`
- `QWEN_BASE_URL=http://AMD_PUBLIC_IP:8000/v1`
- `QWEN_MODEL=Qwen/Qwen2-7B-Instruct`

Required Hugging Face Space secret:

- `QWEN_API_KEY`

Optional local Docker smoke test before pushing to Hugging Face:

```bash
docker build -t relieflens-space .
docker run --rm -p 7860:7860 \
  -e QWEN_ENABLED=true \
  -e QWEN_BASE_URL=http://AMD_PUBLIC_IP:8000/v1 \
  -e QWEN_MODEL=Qwen/Qwen2-7B-Instruct \
  -e QWEN_API_KEY=your-secret \
  relieflens-space
```

Then test:

- `http://localhost:7860/health`
- `http://localhost:7860/api/demo/incidents`
- `http://localhost:7860/admin/login`

## Known limitations

- Qwen analysis depends on a reachable OpenAI-compatible model server returning valid JSON
- If Qwen is disabled or fails, the system falls back to rule-based analysis
- Audio is accepted but not transcribed unless an ASR model is connected later
- EXIF GPS is only available for images that actually contain GPS metadata
- Text-location resolution is intentionally conservative and does not invent precise coordinates
- Map clicks are user-provided hints, not verified GPS
- Human review remains mandatory for operational use

## Flood demo case

To test the seeded flood case in the admin dashboard or API, use evidence like:

- Evidence text:
  `A severe flash flood is affecting a residential area. Streets are partially flooded, several vehicles are stuck, and people may be trapped inside nearby buildings. Water level appears to be rising quickly after heavy rainfall.`
- Image findings:
  `Flooded urban street, muddy water reaching residential entrances, stuck cars, people moving to higher ground.`
- Audio transcript:
  `No audio uploaded.`
- Location:
  browser geolocation with `confidence=0.90`

Expected result:

- `incident_type=flood`
- `severity=critical`
- `priority=P0`
- `requires_human_review=true`
- provider `qwen` when available, otherwise `rule_based_fallback`
