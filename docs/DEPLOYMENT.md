# ReliefLens AI Deployment

## Target topology

- AMD VM:
  - Qwen OpenAI-compatible endpoint on `127.0.0.1:8000`
  - FastAPI backend on `0.0.0.0:8080`
- Hugging Face Docker Space:
  - public entrypoint on `7860`
  - same-origin `/api` proxy to the AMD FastAPI backend

The browser should never call the AMD Qwen endpoint directly.

## 1. AMD VM backend setup

Clone the repository:

```bash
git clone https://github.com/<your-org-or-user>/ReliefLensAI.git
cd ReliefLensAI
```

Bootstrap the backend:

```bash
bash scripts/deploy_backend_amd.sh
cp backend/.env.amd.example backend/.env
```

Edit `backend/.env`:

```env
APP_ENV=production
DEBUG=false
DEMO_MODE=false
STORAGE_PATH=./data
CORS_ORIGINS=https://YOUR_SPACE.hf.space

QWEN_ENABLED=true
QWEN_BASE_URL=http://127.0.0.1:8000/v1
QWEN_API_KEY=amd-qwen-demo-key
QWEN_MODEL=Qwen/Qwen2-7B-Instruct

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_TOKEN_SECRET=relieflens-demo-secret-change-this
ADMIN_TOKEN_EXPIRE_MINUTES=720
```

Start the backend:

```bash
bash scripts/start_backend_amd.sh
curl http://127.0.0.1:8080/health
curl http://129.212.185.232:8080/health
```

## 2. AMD Qwen endpoint

If Qwen is running on the same VM, verify it:

```bash
curl http://127.0.0.1:8000/v1/models \
  -H "Authorization: Bearer amd-qwen-demo-key"
```

The backend reads `QWEN_*` at runtime and calls the OpenAI-compatible endpoint internally.

## 3. Hugging Face Docker Space

Use the root `Dockerfile` in this repository.

Space Variables:

- `NEXT_PUBLIC_API_URL=/api`
- `NEXT_PUBLIC_API_BASE_URL=/api`
- `NEXT_PUBLIC_BACKEND_URL=/api`
- `BACKEND_ORIGIN=http://129.212.185.232:8080`

After pushing the Space repository, validate:

```text
https://YOUR_SPACE.hf.space/health
https://YOUR_SPACE.hf.space/api/demo/incidents
https://YOUR_SPACE.hf.space/emergencies
https://YOUR_SPACE.hf.space/admin/login
```

## 4. Local validation before deploy

Backend:

```bash
python -m pytest backend/tests -v
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

## 5. Notes

- Do not put `QWEN_API_KEY` in frontend code, Hugging Face Space variables, or any `NEXT_PUBLIC_*` variable.
- Do not expose the AMD Qwen endpoint directly to the browser.
- Human review remains required for all operational decisions.

## 6. Final checklist

1. Verify Qwen on AMD:
   - `curl http://127.0.0.1:8000/v1/models -H "Authorization: Bearer amd-qwen-demo-key"`
2. Start AMD backend:
   - `bash scripts/start_backend_amd.sh`
3. Verify AMD backend locally:
   - `curl http://127.0.0.1:8080/health`
4. Verify AMD backend publicly:
   - `curl http://129.212.185.232:8080/health`
5. Configure Hugging Face Space variables:
   - `NEXT_PUBLIC_API_URL=/api`
   - `NEXT_PUBLIC_API_BASE_URL=/api`
   - `NEXT_PUBLIC_BACKEND_URL=/api`
   - `BACKEND_ORIGIN=http://129.212.185.232:8080`
6. Push to a new Docker Space.
7. Test:
   - `https://SPACE.hf.space/health`
   - `https://SPACE.hf.space/api/demo/incidents`
   - `https://SPACE.hf.space/emergencies`
8. Submit the flood report and verify the admin view shows `analysis_provider=qwen`.
