#!/bin/sh
# RedMushroom container entrypoint.
#
# On first boot (volume is empty), initialise the SQLite DB and seed it.
# On every subsequent boot, just start the server — the persistent volume
# preserves users, sessions, EXP, etc.

set -e

DB_PATH="${DB_PATH:-/app/database/redmushroom.db}"
DB_DIR="$(dirname "$DB_PATH")"
SETUP_MARKER="$DB_DIR/.seeded"

mkdir -p "$DB_DIR"

if [ ! -f "$SETUP_MARKER" ] || [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] DB not initialised — seeding now (first-boot only)..."

  cd /app

  # 1. Create schema
  echo "[entrypoint] applying schema from database/init.sql"
  sqlite3 "$DB_PATH" < database/init.sql

  # 2. Apply migrations (idempotent)
  if [ -f database/upgrade_schema.sql ]; then
    echo "[entrypoint] applying upgrade_schema.sql"
    sqlite3 "$DB_PATH" < database/upgrade_schema.sql || true
  fi

  # 3. Seed questions, praises, demo accounts.
  # The scripts/ directory has its own node_modules with tsx + better-sqlite3
  # already compiled for Linux during image build.
  cd /app/scripts
  TSX=./node_modules/.bin/tsx

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
      $TSX "$seed" || echo "[entrypoint] WARN: $seed failed, continuing"
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
