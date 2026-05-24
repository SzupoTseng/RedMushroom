# RedMushroom production image — multi-stage build.
#
#   Stage 1: build the React/Vite frontend → frontend/dist
#   Stage 2: compile the TypeScript backend → backend/dist
#   Stage 3: install scripts deps (used by entrypoint to seed DB on first boot)
#   Stage 4: slim runtime — node + native bindings + both dists
#
# Runtime layout (inside container):
#   /app/backend/dist/index.js         <- compiled server entrypoint
#   /app/backend/data/dictionary.json  <- dictionary (read-only)
#   /app/frontend/dist/                <- static SPA + fonts
#   /app/database/                     <- mounted persistent volume (DB + WAL)
#   /app/scripts/                      <- init + seed scripts (run by entrypoint)

# ────────────────────────────────────────────────────────────
# Stage 1: frontend build
# ────────────────────────────────────────────────────────────
FROM node:20-bookworm AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ────────────────────────────────────────────────────────────
# Stage 2: backend build (TypeScript → JS)
# ────────────────────────────────────────────────────────────
FROM node:20-bookworm AS backend-build
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ────────────────────────────────────────────────────────────
# Stage 3: scripts deps (better-sqlite3 + bcrypt for seeding)
# ────────────────────────────────────────────────────────────
FROM node:20-bookworm AS scripts-deps
WORKDIR /app/scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY scripts/package*.json ./
RUN npm ci

# ────────────────────────────────────────────────────────────
# Stage 4: runtime
# ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Runtime helpers: sqlite3 CLI (debugging), CA certs, dumb-init (PID 1)
RUN apt-get update && apt-get install -y --no-install-recommends \
      sqlite3 ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Backend production deps. Install with build tools, then strip them out.
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* /root/.npm

# Compiled backend + the in-memory dictionary
COPY --from=backend-build /app/backend/dist ./dist
COPY backend/data ./data

# Frontend dist (Express serves these in production)
WORKDIR /app
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Schema + seeds (entrypoint runs these on first boot if DB is empty)
COPY database ./database
COPY --from=scripts-deps /app/scripts/node_modules ./scripts/node_modules
COPY scripts ./scripts
COPY package.json ./

# Entrypoint: seed DB if absent, then start server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Non-root user
RUN groupadd -g 1001 mushroom && useradd -u 1001 -g mushroom -m -s /bin/bash mushroom \
    && chown -R mushroom:mushroom /app
USER mushroom

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
