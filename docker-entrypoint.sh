#!/bin/sh
# RedMushroom container entrypoint.
#
# First boot (persistent volume is empty) → initialise schema + seed.
# Every subsequent boot → just start the server (data preserved on volume).
#
# Uses tsx + better-sqlite3 from /app/scripts/node_modules. No sqlite3 CLI
# is required at runtime, which keeps the image dependency-light.

set -e

DB_PATH="${DB_PATH:-/app/database/redmushroom.db}"
DB_DIR="$(dirname "$DB_PATH")"
SETUP_MARKER="$DB_DIR/.seeded"
TSX=/app/scripts/node_modules/.bin/tsx

mkdir -p "$DB_DIR"

if [ ! -f "$SETUP_MARKER" ] || [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] first boot — initialising schema + seeds..."

  cd /app/scripts

  echo "[entrypoint] running init-prod.ts (schema + migrations)"
  DB_PATH="$DB_PATH" $TSX init-prod.ts

  for seed in \
    seed-minimal.ts \
    generate-questions.ts \
    seed-questions-taiwan.ts \
    seed-math.ts \
    seed-praise-library.ts \
    seed-supplementary.ts
  do
    if [ -f "$seed" ]; then
      echo "[entrypoint] running $seed"
      DB_PATH="$DB_PATH" $TSX "$seed" || echo "[entrypoint] WARN: $seed failed, continuing"
    fi
  done

  touch "$SETUP_MARKER"
  echo "[entrypoint] seed complete."
else
  echo "[entrypoint] DB already exists at $DB_PATH — skipping seed."
fi

# Hand off to the server
echo "[entrypoint] starting backend on PORT=${PORT:-3001} ..."
cd /app/backend
exec node dist/index.js
