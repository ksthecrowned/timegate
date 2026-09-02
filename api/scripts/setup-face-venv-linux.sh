#!/usr/bin/env bash
# Linux / Render: create api/.venv with face_recognition for the Nest face engine.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pick_python() {
  for bin in python3.12 python3.11 python3; do
    if command -v "${bin}" >/dev/null 2>&1; then
      ver="$("${bin}" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")"
      major="${ver%%.*}"
      minor="${ver#*.}"
      if [[ "${major}" -eq 3 && "${minor}" -ge 11 && "${minor}" -le 12 ]]; then
        echo "${bin}"
        return 0
      fi
    fi
  done
  return 1
}

strict_mode() {
  [[ "${STRICT_FACE_VENV:-}" == "1" ]] || [[ "${RENDER:-}" == "true" ]]
}

PY_BIN="$(pick_python || true)"
if [[ -z "${PY_BIN}" ]]; then
  if strict_mode; then
    echo "[face-venv] Python 3.11 or 3.12 is required on this host (Render/Linux)."
    exit 1
  fi
  echo "[face-venv] Python 3.11/3.12 not found — skipping (face verification unavailable)."
  exit 0
fi

VENV_PY="${ROOT_DIR}/.venv/bin/python"
if [[ -x "${VENV_PY}" ]] && "${VENV_PY}" -c "import face_recognition" 2>/dev/null; then
  echo "[face-venv] .venv already has face_recognition — skip"
  exit 0
fi

echo "[face-venv] Creating venv with ${PY_BIN}"
"${PY_BIN}" -m venv .venv
"${VENV_PY}" -m pip install -U pip setuptools wheel
echo "[face-venv] Installing python/requirements.txt (dlib + face_recognition; may take a few minutes)"
"${VENV_PY}" -m pip install -r python/requirements.txt
"${VENV_PY}" -c "import face_recognition; print('[face-venv] face_recognition import OK')"

echo "[face-venv] Done. Interpreter: ${VENV_PY}"
