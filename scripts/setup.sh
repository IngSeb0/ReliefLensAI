#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BACKEND_DIR="$(cd -- "$SCRIPT_DIR/../backend" && pwd -P)"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/.venv}"

log_info() {
  printf '[INFO] %s\n' "$*" >&2
}

log_error() {
  printf '[ERROR] %s\n' "$*" >&2
}

cleanup_on_error() {
  log_error "Setup failed on line ${1}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "Missing required command: $1"
    exit 1
  }
}

trap 'cleanup_on_error "$LINENO"' ERR

require_cmd python

cd "$BACKEND_DIR"

[[ -f requirements.txt ]] || {
  log_error "requirements.txt not found in $BACKEND_DIR"
  exit 1
}

[[ -f .env.example ]] || {
  log_error ".env.example not found in $BACKEND_DIR"
  exit 1
}

log_info "Setting up ReliefLensAI backend in $BACKEND_DIR"

if [[ ! -d "$VENV_DIR" ]]; then
  log_info "Creating virtual environment at $VENV_DIR"
  python -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if [[ ! -f .env ]]; then
  cp .env.example .env
  log_info "Created backend/.env from .env.example"
fi

mkdir -p data/dispatch data/incidents data/resources data/sessions data/signals

log_info "Backend setup complete"
