#!/usr/bin/env bash
# Orchestrator load test checkout: migrate -> seed -> build -> run API -> load test -> verify.
# Env yang bisa di-set: TOTAL (default 6000), CONCURRENCY (default 100).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

set -a
source .env.loadtest
set +a

echo "[1/5] Migrasi DB load test..."
DATABASE_URL_WRITE="$DATABASE_URL" npx prisma migrate deploy

echo "[2/5] Seed data..."
node test/loadtest/go/seed.js

echo "[3/5] Build app..."
npm run build >/dev/null 2>&1

echo "[4/5] Start API (background, port ${PORT})..."
node dist/apps/api/apps/api/src/main.js &
APP_PID=$!
trap 'kill "$APP_PID" 2>/dev/null || true' EXIT

for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT}/api/v1/health" >/dev/null 2>&1; then
    echo "  API siap setelah ${i}s."
    break
  fi
  sleep 1
done

echo "[5/5] Load test (${TOTAL:-6000} request, concurrency ${CONCURRENCY:-100})..."
cd test/loadtest/go
go run loadtest.go -total "${TOTAL:-6000}" -concurrency "${CONCURRENCY:-100}"

echo ""
echo "Verifikasi konsistensi DB..."
cd "$ROOT"
node test/loadtest/go/verify.js