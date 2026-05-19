FROM node:20-alpine AS base
WORKDIR /app

# ── 後端依賴 ──
FROM base AS backend-deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --production

# ── 後端 TypeScript 編譯 ──
FROM base AS backend-build
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend/ ./backend/
RUN cd backend && npm run build

# ── 前端建置 ──
FROM base AS frontend-build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── 最終映像 ──
FROM base AS runner
WORKDIR /app

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY database/ ./database/
COPY --from=frontend-build /app/frontend/dist ./backend/public

# SQLite 資料庫目錄（掛載 Volume）
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
