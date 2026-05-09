---
title: ReliefLens AI Frontend
emoji: 🚨
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
---

# ReliefLens AI Frontend

Next.js crisis operations dashboard for the AMD Developer Hackathon demo.

## Runtime shape

Hugging Face Docker Space serves the frontend over HTTPS.

Frontend requests use `/backend`, and Next.js rewrites proxy that path to the AMD FastAPI backend at `http://134.199.203.136:8080`.

## Build variables

The Docker image expects:

- `NEXT_PUBLIC_API_URL=/backend`
- `NEXT_PUBLIC_API_BASE_URL=/backend`
- `NEXT_PUBLIC_BACKEND_URL=/backend`

## Container command

```bash
npx next start -H 0.0.0.0 -p 7860
```

## Safety

- Synthetic demo data only
- Human-in-the-loop required
- Not connected to emergency services
- Not for real-world dispatch
