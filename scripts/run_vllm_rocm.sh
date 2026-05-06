#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
BACKEND_DIR="$(cd -- "$REPO_ROOT/backend" && pwd -P)"

AMD_MODEL="${AMD_MODEL:-Qwen/Qwen2.5-7B-Instruct}"
VLLM_HOST="${VLLM_HOST:-0.0.0.0}"
VLLM_PORT="${VLLM_PORT:-8000}"
HF_HOME="${HF_HOME:-$HOME/.cache/huggingface}"
VLLM_API_KEY="${VLLM_API_KEY:-token-abc123}"
GPU_MEM_UTIL="${GPU_MEM_UTIL:-0.90}"
TENSOR_PARALLEL_SIZE="${TENSOR_PARALLEL_SIZE:-1}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"

log_info() {
  printf '[INFO] %s\n' "$*" >&2
}

log_error() {
  printf '[ERROR] %s\n' "$*" >&2
}

cleanup_on_error() {
  log_error "vLLM startup failed on line ${1}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "Missing required command: $1"
    exit 1
  }
}

trap 'cleanup_on_error "$LINENO"' ERR

require_cmd python
require_cmd rocm-smi

if ! python -c "import vllm" >/dev/null 2>&1; then
  log_error "Python package 'vllm' is not installed in the active environment"
  exit 1
fi

if [[ -z "${HF_TOKEN:-}" ]]; then
  log_error "HF_TOKEN is required to download gated or remote Hugging Face models"
  exit 1
fi

mkdir -p "$HF_HOME"

cd "$BACKEND_DIR"

log_info "Checking AMD GPU visibility"
rocm-smi

export HUGGING_FACE_HUB_TOKEN="$HF_TOKEN"
export VLLM_USE_MODELSCOPE="False"

log_info "Starting vLLM on http://$VLLM_HOST:$VLLM_PORT with model $AMD_MODEL"
python -m vllm.entrypoints.openai.api_server \
  --host "$VLLM_HOST" \
  --port "$VLLM_PORT" \
  --model "$AMD_MODEL" \
  --api-key "$VLLM_API_KEY" \
  --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
  --gpu-memory-utilization "$GPU_MEM_UTIL" \
  --max-model-len "$MAX_MODEL_LEN"
