# ---- Frontend build ----
FROM node:24-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---- Backend dependencies ----
FROM oven/bun:1-alpine AS backend-deps
WORKDIR /app/backend

COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Runtime ----
FROM oven/bun:1-alpine
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production \
    STATIC_DIR=/app/frontend/dist \
    DATABASE_PATH=/app/data/media_kit.db

RUN addgroup -S app \
    && adduser -S app -G app \
    && mkdir -p /app/data \
    && chown -R app:app /app

USER app
EXPOSE 3000

CMD ["bun", "run", "backend/src/index.ts"]
