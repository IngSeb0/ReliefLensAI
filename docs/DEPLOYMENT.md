# ReliefLens AI Deployment Guide

## 1. Recommended deployment architecture

### Option A. Frontend on Hugging Face Space + backend and inference on AMD Developer Cloud

**Layout**

- Hugging Face Space:
  - Gradio or Streamlit frontend
  - public demo URL
- AMD Developer Cloud:
  - vLLM OpenAI-compatible server on MI300X
  - FastAPI backend
  - ROCm metrics collection

**Pros**

- Fastest public demo path
- Easy to share with judges
- Keeps GPU burn on AMD only
- HF Space gives a clean public UI without managing frontend hosting

**Cons**

- Cross-origin configuration required
- Two deployment surfaces
- Space availability depends on HF build queue

### Option B. Everything on AMD Developer Cloud

**Layout**

- Same VM:
  - vLLM
  - FastAPI
  - frontend app
  - reverse proxy

**Pros**

- Simplest runtime topology
- No cross-platform latency
- Easiest to debug if you already know Linux and reverse proxies

**Cons**

- You must expose and secure the public entrypoint yourself
- More DevOps work for SSL/reverse proxy/tunnel
- Harder to get polished public frontend fast

### Option C. Frontend on Vercel + backend on AMD Developer Cloud

**Layout**

- Vercel:
  - Next.js frontend
- AMD Developer Cloud:
  - FastAPI
  - vLLM

**Pros**

- Best polished frontend
- Fast iteration if your UI is already Next.js
- Vercel preview deployments are convenient

**Cons**

- More moving parts than Option A
- Need robust CORS and stable backend URL
- Not ideal if the frontend is still immature

### Recommendation for a 48-hour hackathon

**Best choice: Option A**

- If you need speed and a public link fast, use **Gradio on Hugging Face Space** plus **FastAPI + vLLM on AMD Developer Cloud**.
- If your existing frontend is already strong in Next.js, Option C is the second-best choice.
- Do not choose Option B unless you are comfortable exposing and proxying services on a VM under time pressure.

## 2. Final repo shape

```text
ReliefLensAI/
├── backend/
│   ├── api/
│   ├── agents/
│   ├── core/
│   ├── data/
│   ├── schemas/
│   ├── services/
│   ├── skills/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── demo_data/
├── docs/
│   └── DEPLOYMENT.md
├── scripts/
│   ├── setup.sh
│   ├── run_backend.sh
│   ├── run_vllm_rocm.sh
│   ├── smoke_test_backend.sh
│   └── benchmark_vllm.sh
├── README.md
└── .gitignore
```

## 3. Files you should have before deployment

### Backend

- `backend/Dockerfile`
- `backend/requirements.txt`
- `backend/.env.example`
- `backend/main.py`
- `backend/services/vllm_client.py`

### Frontend

- Hugging Face variant:
  - `space_app.py` or `app.py`
  - `requirements.txt`
  - `README.md` with Space metadata
- Vercel variant:
  - `frontend/package.json`
  - `frontend/.env.example`
  - `frontend/next.config.ts`

### Scripts

- `scripts/run_vllm_rocm.sh`
- `scripts/run_backend.sh`
- `scripts/smoke_test_backend.sh`
- `scripts/benchmark_vllm.sh`

## 4. Minimal backend .env.example

```env
APP_ENV=production
DEBUG=false
DEMO_MODE=false
STORAGE_PATH=./data

VLLM_BASE_URL=http://127.0.0.1:8000/v1
VLLM_API_KEY=token-abc123
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct
VLLM_VISION_MODEL=Qwen/Qwen2.5-VL-7B-Instruct

AMD_LLM_BASE_URL=http://127.0.0.1:8000/v1
AMD_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
BACKEND_PUBLIC_URL=http://YOUR_PUBLIC_IP:8080
FRONTEND_PUBLIC_URL=https://YOUR_SPACE_OR_VERCEL_URL
HF_TOKEN=
MAX_BATCH_SIZE=16
ENABLE_AMD_METRICS=true
CORS_ORIGINS=http://localhost:3000,https://YOUR_SPACE_OR_VERCEL_URL
```

## 5. AMD Developer Cloud setup

### Step 1. Create the VM

Pick:

- AMD Developer Cloud VM
- MI300X instance
- image with ROCm and Docker preinstalled if available
- public IP enabled
- SSH key attached at creation time

If AMD provides a ready-made vLLM image, prefer that over manual install.

### Step 2. SSH into the box

```bash
ssh root@<PUBLIC_IP>
```

### Step 3. Verify GPU and drivers

```bash
rocm-smi
rocminfo | head -50
```

If `rocm-smi` is unavailable, try:

```bash
amd-smi list
amd-smi monitor
```

### Step 4. Clone repo

```bash
git clone https://github.com/<ORG_OR_USER>/ReliefLensAI.git
cd ReliefLensAI
```

### Step 5. Prepare backend environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
mkdir -p data
```

### Step 6. Configure Hugging Face token

```bash
export HF_TOKEN=hf_xxx
huggingface-cli login --token "$HF_TOKEN"
```

If `huggingface-cli` is not installed:

```bash
pip install "huggingface_hub[cli]"
huggingface-cli login --token "$HF_TOKEN"
```

## 6. Run vLLM on AMD MI300X

### Recommended model for MVP

- Primary: `Qwen/Qwen2.5-7B-Instruct`
- Alternative: `meta-llama/Llama-3.1-8B-Instruct`

For the 48-hour demo, start with one text model only. Add vision later if stable.

### Option 1. Native `vllm serve`

```bash
export HF_TOKEN=hf_xxx
export VLLM_API_KEY=token-abc123
export HIP_VISIBLE_DEVICES=0

vllm serve Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$VLLM_API_KEY" \
  --dtype auto \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --served-model-name Qwen/Qwen2.5-7B-Instruct
```

### Option 2. Docker image for ROCm

```bash
docker run -d \
  --name relieflens-vllm \
  --restart unless-stopped \
  -p 8000:8000 \
  --device=/dev/kfd \
  --device=/dev/dri \
  --group-add video \
  --ipc=host \
  --cap-add=SYS_PTRACE \
  --security-opt seccomp=unconfined \
  --shm-size 16G \
  -e HUGGING_FACE_HUB_TOKEN=$HF_TOKEN \
  -e VLLM_API_KEY=token-abc123 \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  vllm serve Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key token-abc123 \
  --dtype auto \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90
```

### Tensor parallel

For one MI300X:

- use `--tensor-parallel-size 1`

Only increase TP if your ADC instance exposes multiple GPUs and you have actually verified them with ROCm.

### Credit-saving recommendations

- start with 7B or 8B instruct model
- avoid 70B for MVP unless the credits are generous
- keep one model loaded at a time
- use smaller `max-model-len`
- shut down the VM when not demoing

## 7. Test the OpenAI-compatible endpoint

### Basic health-style probe

```bash
curl http://127.0.0.1:8000/v1/models \
  -H "Authorization: Bearer token-abc123"
```

### Chat completion test

```bash
curl http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token-abc123" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "messages": [
      {"role": "system", "content": "You are a disaster triage assistant."},
      {"role": "user", "content": "Prioritize: family trapped on roof during flood."}
    ],
    "temperature": 0.1,
    "max_tokens": 200
  }'
```

## 8. Run FastAPI backend

From the backend directory:

```bash
source .venv/bin/activate
export APP_ENV=production
export DEBUG=false
export DEMO_MODE=false
export STORAGE_PATH=./data
export VLLM_BASE_URL=http://127.0.0.1:8000/v1
export VLLM_API_KEY=token-abc123
export VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct
export ENABLE_AMD_METRICS=true

uvicorn main:app --host 0.0.0.0 --port 8080
```

### Smoke test backend

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/api/amd/performance
```

## 9. Expose the backend publicly

### Option 1. Open port directly

Open these ports in the VM security rules if ADC allows it:

- `8080` for FastAPI
- optional `8000` only if you explicitly want public direct access to vLLM

Prefer exposing only `8080`.

### Option 2. Reverse proxy with Nginx

Install:

```bash
apt-get update
apt-get install -y nginx
```

Basic proxy:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 3. Cloudflare Tunnel or ngrok for demo

Use this if:

- you do not want to fight firewall rules
- you only need a stable demo URL fast

Example with ngrok:

```bash
ngrok http 8080
```

### Security rules

- Do not expose Hugging Face token
- Do not expose raw vLLM port unless needed
- Keep CORS restricted to your frontend URL
- Use a simple bearer key between frontend and backend if you have time

## 10. Frontend deployment variant 1: Hugging Face Space

### Recommendation

Use **Gradio** for the fastest route.

Streamlit is still possible, but Hugging Face deprecated the built-in Streamlit SDK in 2025 and now prefers Docker-based Streamlit setups.

### Create the Space

1. Go to Hugging Face Spaces
2. Click **Create new Space**
3. Choose:
   - SDK: `gradio` for fastest MVP
   - visibility: `public`
4. Clone the Space repo locally

### Files to push

- `app.py`
- `requirements.txt`
- `README.md` with metadata block

### Example Space README metadata

```yaml
---
title: ReliefLens AI
emoji: 🚨
colorFrom: blue
colorTo: red
sdk: gradio
python_version: "3.10"
---
```

### Space variables and secrets

Set in **Settings -> Variables and secrets**

Variables:

- `BACKEND_PUBLIC_URL`
- `AMD_LLM_MODEL`
- `DEMO_MODE`

Secrets:

- `BACKEND_API_KEY` if you add one

### Connect the Space to AMD backend

Frontend should call:

```python
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL")
requests.get(f"{BACKEND_PUBLIC_URL}/health")
requests.post(f"{BACKEND_PUBLIC_URL}/api/demo/run")
```

### Streamlit on HF Space

If you insist on Streamlit:

- use Docker Space or current Streamlit-compatible template
- keep app on port `8501`
- avoid file permission assumptions

## 11. Frontend deployment variant 2: Next.js on Vercel

### Setup

From `frontend/`:

```bash
npm install
npm run build
```

### Deploy

```bash
npm i -g vercel
vercel
```

### Required Vercel env vars

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_DEMO_MODE`
- `NEXT_PUBLIC_APP_NAME=ReliefLens AI`

If you need server-side calls:

- `BACKEND_PUBLIC_URL`
- `BACKEND_API_KEY`

### CORS

Allow the Vercel app domain in the backend:

```env
CORS_ORIGINS=https://your-app.vercel.app
```

## 12. Recommended scripts

### `scripts/run_vllm_rocm.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

export HF_TOKEN=${HF_TOKEN:?HF_TOKEN is required}
export VLLM_API_KEY=${VLLM_API_KEY:-token-abc123}

vllm serve Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$VLLM_API_KEY" \
  --dtype auto \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90
```

### `scripts/smoke_test_backend.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://127.0.0.1:8080}

curl -fsS "$BACKEND_URL/health"
curl -fsS "$BACKEND_URL/api/amd/performance"
```

### `scripts/benchmark_vllm.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

VLLM_URL=${VLLM_URL:-http://127.0.0.1:8000/v1/chat/completions}
MODEL=${MODEL:-Qwen/Qwen2.5-7B-Instruct}
KEY=${VLLM_API_KEY:-token-abc123}

time curl -s "$VLLM_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Summarize flood incident priorities in 5 bullets.\"}],
    \"temperature\": 0.1,
    \"max_tokens\": 256
  }" > /tmp/relieflens-benchmark.json
```

## 13. Submission checklist

- public GitHub repository
- public app URL
- readable README with architecture and quickstart
- demo video
- slides
- screenshots of:
  - `rocm-smi`
  - backend dashboard
  - incident output
  - AMD metrics panel
- benchmark note:
  - model name
  - GPU type
  - latency
  - tokens/sec if available
- explicit human-in-the-loop disclaimer
- local run instructions

## 14. Troubleshooting

### vLLM does not start on ROCm

- verify GPU exists with `rocm-smi`
- verify `/dev/kfd` and `/dev/dri`
- use a ROCm-compatible image
- start with a smaller model

### Model does not fit

- switch to 7B
- reduce `--max-model-len`
- keep one model active
- avoid loading text and vision models simultaneously until text path is stable

### Invalid Hugging Face token

- rerun:

```bash
huggingface-cli whoami
```

- confirm gated model access

### CORS error

- set:

```env
CORS_ORIGINS=https://your-space.hf.space,https://your-app.vercel.app
```

- restart backend

### Frontend cannot reach backend

- test from local machine:

```bash
curl http://<PUBLIC_IP>:8080/health
```

- if that fails, your port is blocked or not bound to `0.0.0.0`

### Space does not see variables

- add them in Space settings
- restart the Space
- confirm exact variable names in code

### GPU not detected

- wrong VM type
- ROCm not installed correctly
- Docker missing device flags

### Credit burn is too high

- stop the VM when idle
- do not benchmark large models repeatedly
- keep one model loaded
- cap sequence length

## 15. Fastest winning path

If you need the shortest path to a working public submission:

1. deploy `vLLM + FastAPI` on AMD Developer Cloud
2. run only `Qwen2.5-7B-Instruct` first
3. keep `DEMO_MODE=false` but maintain fallback handling
4. deploy a **Gradio Space** as the public UI
5. expose backend via port `8080` or an ngrok/Cloudflare tunnel
6. capture `rocm-smi`, backend outputs, and dashboard for the video
