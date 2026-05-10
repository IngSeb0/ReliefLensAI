#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
BACKEND_DIR="$REPO_ROOT/backend"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/.venv}"
SESSION_NAME="${SESSION_NAME:-backend}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"

log_info() {
  printf '[INFO] %s\n' "$*" >&2
}

log_error() {
  printf '[ERROR] %s\n' "$*" >&2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "Missing required command: $1"
    exit 1
  }
}

trap 'log_error "Backend start failed on line ${LINENO}"' ERR

require_cmd tmux

if [[ ! -d "$VENV_DIR" ]]; then
  log_error "Missing virtual environment at $VENV_DIR. Run scripts/deploy_backend_amd.sh first."
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  log_error "Missing backend/.env. Create it from backend/.env.example and set your AMD values."
  exit 1
fi

tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

tmux new -d -s "$SESSION_NAME" "cd '$BACKEND_DIR' && source '$VENV_DIR/bin/activate' && set -a && source '$BACKEND_DIR/.env' && set +a && python -m uvicorn main:app --host '$HOST' --port '$PORT'"

log_info "Backend started in tmux session '$SESSION_NAME'"
log_info "Check logs with: tmux attach -t $SESSION_NAME"
log_info "Health check: curl http://127.0.0.1:$PORT/health"
log_info "Public health check: curl http://129.212.185.232:$PORT/health"
