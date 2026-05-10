#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
BACKEND_DIR="$REPO_ROOT/backend"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/.venv}"

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

trap 'log_error "Deployment failed on line ${LINENO}"' ERR

require_cmd python3
require_cmd git

if ! command -v tmux >/dev/null 2>&1; then
  log_info "Installing tmux"
  sudo apt-get update
  sudo apt-get install -y tmux
fi

cd "$REPO_ROOT"

if [[ -d .git ]]; then
  log_info "Pulling latest changes from origin/main"
  git pull origin main
fi

if [[ ! -d "$VENV_DIR" ]]; then
  log_info "Creating virtual environment at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

log_info "Installing backend dependencies"
python -m pip install --upgrade pip
python -m pip install -r "$BACKEND_DIR/requirements.txt"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  log_info "Creating backend/.env from backend/.env.example"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  log_info "Edit backend/.env with AMD Qwen and admin credentials before starting the service"
fi

mkdir -p "$BACKEND_DIR/data"

log_info "Backend bootstrap complete"
log_info "Next step: edit backend/.env and run scripts/start_backend_amd.sh"
