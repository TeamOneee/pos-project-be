#!/usr/bin/env bash
# Orchestrator skenario multi-aktor k6: migrate -> seed -> build -> API -> k6 -> verify.
# Asumsi: Docker Postgres pos_loadtest sudah jalan di localhost:55432.
# Env: N_MERCHANTS (default 500), K6_TARGET p95 checkout (default 1500ms).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

set -a
source .env.loadtest
set +a

echo "[1/6] Migrasi DB load test..."
DATABASE_URL_WRITE="$DATABASE_URL" npx prisma migrate deploy

echo "[2/6] Seed skenario (${N_MERCHANTS:-500} merchant)..."
N_MERCHANTS="${N_MERCHANTS:-500}" node test/loadtest/k6/seed.js

echo "[3/6] Build app..."
npm run build >/dev/null 2>&1

echo "[4/6] Start API (background, port ${PORT})..."
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

echo "[5/6] Skenario k6 (checkout + dashboard t5s + admin t6s)..."
cd test/loadtest/k6
k6 run scenario.js

echo ""
echo "[6/6] Verifikasi konsistensi DB..."
cd "$ROOT"
node test/loadtest/k6/verify.js
