# RedMushroom production image — simplified multi-stage build.
#
# All apt-get installs removed from the runtime stage to avoid Railway
# build-env network/disk hiccups. Native better-sqlite3 binaries ship
# prebuilt for linux-x64 glibc (node:20-bookworm-slim matches), so no
# C++ toolchain is needed at runtime.
#
# Runtime layout:
#   /app/backend/dist/index.js   compiled server
#   /app/backend/data/           dictionary.json (read-only)
#   /app/frontend/dist/          static SPA + fonts
#   /app/database/               persistent volume (DB + WAL)
#   /app/scripts/                seed + init scripts (run on first boot)

# ── Stage 1: frontend build ──
# Railway trial build workers have limited memory; cap Node heap and skip
# lifecycle scripts (frontend has no native postinstall deps) to keep the
# install footprint low.
FROM node:20-bookworm AS frontend-build
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app/frontend
COPY frontend/package*.json ./
# --ignore-scripts: frontend has no native deps needing postinstall hooks.
# --no-optional: skip optionalDependencies (saves ~100 MB on common stacks).
RUN npm ci --ignore-scripts --no-optional --prefer-offline
COPY frontend/ ./
RUN npm run build

# ── Stage 2: backend build (TypeScript → JS) ──
# Backend has heavier deps (better-sqlite3, bcrypt native, vitest, etc).
# Same memory-conservative flags as frontend, plus --maxsockets=1 to
# serialise tarball extraction (reduces parallel-extract memory peak).
FROM node:20-bookworm AS backend-build
ENV NODE_OPTIONS=--max-old-space-size=768
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_MAXSOCKETS=1
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --no-optional --prefer-offline
COPY backend/ ./
RUN npm run build

# ── Stage 3: scripts deps (better-sqlite3 + tsx for entrypoint seeding) ──
FROM node:20-bookworm AS scripts-build
ENV NODE_OPTIONS=--max-old-space-size=768
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_MAXSOCKETS=1
WORKDIR /app/scripts
COPY scripts/package*.json ./
RUN npm ci --no-optional --prefer-offline

# ── Stage 4: runtime ──
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Backend production deps. better-sqlite3 prebuilt binary for linux-x64
# glibc is in the npm package — no compilation needed at this point.
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev && rm -rf /root/.npm

# Compiled backend + bundled data
COPY --from=backend-build /app/backend/dist ./dist
COPY backend/data ./data

# Frontend static SPA (Express serves these in production)
WORKDIR /app
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Schema + seed scripts (entrypoint runs them on first boot when the
# persistent volume is empty)
COPY database ./database
COPY --from=scripts-build /app/scripts/node_modules ./scripts/node_modules
COPY scripts ./scripts
COPY package.json ./

# Entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["/usr/local/bin/docker-entrypoint.sh"]
