#!/usr/bin/env bash
set -euo pipefail

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

cd /app/backend
python3 -m uvicorn main:app --host "${BACKEND_HOST}" --port "${BACKEND_PORT}" &
backend_pid=$!

cd /app/frontend
npx next start -H "${FRONTEND_HOST}" -p "${FRONTEND_PORT}" &
frontend_pid=$!

cleanup() {
  kill "${backend_pid}" "${frontend_pid}" "${nginx_pid:-0}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

nginx -g 'daemon off;' &
nginx_pid=$!

wait -n "${backend_pid}" "${frontend_pid}" "${nginx_pid}"
