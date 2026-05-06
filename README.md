# ReliefLens AI

ReliefLens AI is a multimodal, human-in-the-loop disaster triage system built for the AMD Developer Hackathon.

It ingests chaotic field reports such as text messages, audio, images, and CSV location hints, then turns them into:

- consolidated incidents
- P0 / P1 / P2 / P3 priority labels
- linked evidence
- recommended resources
- dispatch-ready messages
- AMD performance telemetry

## Stack

- Backend: FastAPI
- Frontend: Next.js
- AI serving: vLLM OpenAI-compatible server
- GPU target: AMD Instinct MI300X
- Runtime: ROCm

## Repo layout

```text
backend/     FastAPI API, agents, skills, schemas, tests
frontend/    Next.js crisis room UI
demo_data/   Santa Ana demo scenario
docs/        deployment notes
scripts/     local run and smoke-test scripts
```

## Quickstart

### 1. Local setup

Windows PowerShell:

```powershell
.\scripts\setup_backend.ps1
.\scripts\setup_frontend.ps1
```

Linux/macOS:

```bash
bash scripts/setup.sh
cd frontend && npm install
```

### 2. Run backend

Windows PowerShell:

```powershell
.\scripts\run_backend.ps1
```

Linux/macOS:

```bash
bash scripts/run_backend.sh
```

### 3. Run frontend

Windows PowerShell:

```powershell
.\scripts\run_frontend.ps1 -Mode dev -Port 3000
```

Linux/macOS:

```bash
MODE=dev PORT=3000 bash scripts/run_frontend.sh
```

### 4. Smoke test

With backend running on `http://127.0.0.1:8080`:

```powershell
python scripts/smoke_test_backend.py
```

## Demo flow

1. Start backend
2. Start frontend
3. Open `http://localhost:3000`
4. Run `Demo Santa Ana`
5. Review incidents, resources, dispatch messages, and AMD metrics

## Environment

Copy `backend/.env.example` to `backend/.env` and set:

- `VLLM_BASE_URL`
- `VLLM_API_KEY`
- `VLLM_MODEL`
- `DEMO_MODE`
- `CORS_ORIGINS`

For local-only development, `backend/.venv`, `frontend/node_modules`, `backend/.deps`, `backend/.testdeps`, `.env`, and generated `backend/data/*.json` stay on disk but are ignored by Git.

## Tests

Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests -v
```

Linux/macOS:

```bash
cd backend
python -m pytest tests -v
```

## Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the AMD Developer Cloud and Hugging Face deployment guide.

## AMD bootstrap

Once the repo is on an AMD Developer Cloud instance with ROCm and Python available:

```bash
cp backend/.env.example backend/.env
AMD_MODEL="Qwen/Qwen2.5-7B-Instruct" HF_TOKEN="..." bash scripts/run_vllm_rocm.sh
```

Then run the API:

```bash
bash scripts/run_backend.sh
```
