#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${PRODUCTIV_ENV_FILE:-.env.runtime}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE is required." >&2
  exit 2
fi

for key in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY; do
  if ! grep -Eq "^${key}=.+" "$ENV_FILE"; then
    echo "ERROR: ${key} is missing from $ENV_FILE." >&2
    exit 2
  fi
done

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed." >&2
  exit 3
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 is not available." >&2
  exit 3
fi

echo "Validating Productiv Compose configuration..."
docker compose --env-file "$ENV_FILE" config --quiet

echo "Building and starting Productiv..."
docker compose --env-file "$ENV_FILE" up -d --build

echo "Waiting for /healthz..."
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:8788/healthz >/tmp/productiv-health.json 2>/dev/null; then
    cat /tmp/productiv-health.json
    echo
    echo "Productiv health check: PASS"
    docker compose --env-file "$ENV_FILE" ps
    exit 0
  fi
  sleep 2
done

echo "ERROR: Productiv did not become healthy within 60 seconds." >&2
docker compose --env-file "$ENV_FILE" ps >&2 || true
docker compose --env-file "$ENV_FILE" logs --tail=120 productiv >&2 || true
exit 4
