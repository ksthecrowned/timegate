#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pick_python() {
  if command -v py >/dev/null 2>&1; then
    for v in 3.12 3.11; do
      if py -"${v}" -c "import sys" >/dev/null 2>&1; then
        echo "PY_LAUNCHER:${v}"
        return 0
      fi
    done
  fi

  for bin in python3.12 python3.11 python3 python; do
    if command -v "${bin}" >/dev/null 2>&1; then
      ver="$("${bin}" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")"
      major="${ver%%.*}"
      minor="${ver#*.}"
      if [[ "${major}" -eq 3 && "${minor}" -ge 11 && "${minor}" -le 12 ]]; then
        echo "BIN:${bin}"
        return 0
      fi
    fi
  done

  return 1
}

PYTHON_PICK="$(pick_python || true)"
if [[ -z "${PYTHON_PICK}" ]]; then
  echo "Could not find Python 3.11 or 3.12."
  echo "Install Python 3.12 x64 from python.org, then re-run this script."
  echo "Tip (Windows): the 'py' launcher is easiest: py -3.12 -m venv .venv"
  exit 1
fi

if [[ "${PYTHON_PICK}" == PY_LAUNCHER:* ]]; then
  PY_VER="${PYTHON_PICK#PY_LAUNCHER:}"
  echo "Using: py -${PY_VER}"
  py -"${PY_VER}" -m venv .venv
else
  PY_BIN="${PYTHON_PICK#BIN:}"
  echo "Using: ${PY_BIN}"
  "${PY_BIN}" -m venv .venv
fi
./.venv/Scripts/python.exe -m pip install -U pip setuptools wheel
./.venv/Scripts/python.exe -m pip install -r python/requirements.txt

echo
echo "Done."
echo "Set in api/.env:"
WIN_ROOT="${ROOT_DIR//\//\\\\}"
echo "  FACE_ENGINE_PYTHON_BIN=\"${WIN_ROOT}\\\\.venv\\\\Scripts\\\\python.exe\""
echo "(Git Bash also accepts forward slashes: FACE_ENGINE_PYTHON_BIN=\"${ROOT_DIR}/.venv/Scripts/python.exe\")"
