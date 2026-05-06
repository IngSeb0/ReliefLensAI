#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
FRONTEND_DIR="$(cd -- "$SCRIPT_DIR/../frontend" && pwd -P)"
PORT="${PORT:-3000}"
MODE="${MODE:-start}"

log_info() {
  printf '[INFO] %s\n' "$*" >&2
}

log_error() {
  printf '[ERROR] %s\n' "$*" >&2
}

cleanup_on_error() {
  log_error "Frontend startup failed on line ${1}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "Missing required command: $1"
    exit 1
  }
}

trap 'cleanup_on_error "$LINENO"' ERR

require_cmd npm

cd "$FRONTEND_DIR"

[[ -f package.json ]] || {
  log_error "package.json not found in $FRONTEND_DIR"
  exit 1
}

if [[ ! -d node_modules ]]; then
  log_error "Missing frontend/node_modules. Run: cd frontend && npm install"
  exit 1
fi

case "$MODE" in
  dev)
    log_info "Starting frontend in dev mode on port $PORT"
    npm run dev -- --port "$PORT"
    ;;
  start)
    log_info "Starting frontend in production mode on port $PORT"
    npm run start -- --port "$PORT"
    ;;
  *)
    log_error "Invalid MODE: $MODE. Use MODE=dev or MODE=start."
    exit 1
    ;;
esac
