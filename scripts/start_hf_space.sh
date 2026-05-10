#!/usr/bin/env bash
set -euo pipefail

FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_ORIGIN="${BACKEND_ORIGIN:-http://129.212.185.232:8080}"

export BACKEND_ORIGIN
envsubst '${BACKEND_ORIGIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

cd /app/frontend
npx next start -H "${FRONTEND_HOST}" -p "${FRONTEND_PORT}" &
frontend_pid=$!

cleanup() {
  kill "${frontend_pid}" "${nginx_pid:-0}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

nginx -g 'daemon off;' &
nginx_pid=$!

wait -n "${frontend_pid}" "${nginx_pid}"
