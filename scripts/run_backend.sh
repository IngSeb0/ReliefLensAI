#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BACKEND_DIR="$(cd -- "$SCRIPT_DIR/../backend" && pwd -P)"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/.venv}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"
RELOAD="${RELOAD:-true}"

log_info() {
  printf '[INFO] %s\n' "$*" >&2
}

log_error() {
  printf '[ERROR] %s\n' "$*" >&2
}

cleanup_on_error() {
  log_error "Backend startup failed on line ${1}"
}

require_file() {
  [[ -f "$1" ]] || {
    log_error "Required file not found: $1"
    exit 1
  }
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "Missing required command: $1"
    exit 1
  }
}

trap 'cleanup_on_error "$LINENO"' ERR

require_cmd python
require_file "$BACKEND_DIR/main.py"

if [[ ! -d "$VENV_DIR" ]]; then
  log_error "Missing virtual environment at $VENV_DIR. Run scripts/setup.sh first."
  exit 1
fi

cd "$BACKEND_DIR"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

args=(main:app --host "$HOST" --port "$PORT")
if [[ "$RELOAD" == "true" ]]; then
  args+=(--reload)
fi

log_info "Starting backend on http://$HOST:$PORT"
python -m uvicorn "${args[@]}"
