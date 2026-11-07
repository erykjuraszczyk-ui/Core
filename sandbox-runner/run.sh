#!/bin/bash
set -euo pipefail

IMAGE="${CORTANA_SANDBOX_IMAGE:-cortana-sandbox:0.10.0}"
SOURCE="${1:-}"
TIME_LIMIT="${CORTANA_SANDBOX_TIMEOUT_SECONDS:-5}"

if [[ -z "$SOURCE" || ! -f "$SOURCE" ]]; then
  echo "Użycie: $0 /ścieżka/do/artefaktu.mjs" >&2
  exit 2
fi
if [[ ! "$TIME_LIMIT" =~ ^[0-9]+$ ]] || (( TIME_LIMIT < 1 || TIME_LIMIT > 10 )); then
  echo "Limit czasu musi mieścić się w zakresie 1–10 sekund." >&2
  exit 2
fi
SIZE=$(wc -c < "$SOURCE" | tr -d ' ')
if (( SIZE < 1 || SIZE > 20000 )); then
  echo "Artefakt musi mieć 1–20 000 bajtów." >&2
  exit 2
fi
if ! docker info --format '{{json .Runtimes}}' | grep -q '"runsc"'; then
  echo "BLOCKED: wymagany runtime gVisor (runsc) nie jest dostępny. Brak fallbacku do runc." >&2
  exit 3
fi
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Brak obrazu $IMAGE. Zbuduj go: docker build -t $IMAGE sandbox-runner" >&2
  exit 3
fi

WORK=$(mktemp -d)
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT HUP INT TERM
cp "$SOURCE" "$WORK/artifact.mjs"
chmod 0444 "$WORK/artifact.mjs"

set +e
timeout "${TIME_LIMIT}s" docker run --rm --pull=never \
  --runtime=runsc --network=none --read-only --user=10001:10001 \
  --cap-drop=ALL --security-opt=no-new-privileges \
  --pids-limit=32 --memory=128m --memory-swap=128m --cpus=0.50 \
  --ulimit=nofile=64:64 --ipc=none --cgroupns=private \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --mount "type=bind,src=$WORK/artifact.mjs,dst=/workspace/artifact.mjs,readonly" \
  --entrypoint=node "$IMAGE" \
  --permission --allow-fs-read=/workspace --allow-fs-write=/tmp \
  --disable-proto=throw /workspace/runner.mjs /workspace/artifact.mjs 2>&1 | head -c 65536
PIPE_STATUS=${PIPESTATUS[0]}
set -e
if (( PIPE_STATUS == 124 )); then
  echo "BLOCKED: przekroczono limit czasu." >&2
  exit 124
fi
exit "$PIPE_STATUS"
