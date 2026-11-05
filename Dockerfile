# ---- Frontend build ----
FROM node:24-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---- Backend build ----
FROM rust:1.98-alpine AS backend
WORKDIR /app/backend

COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

COPY backend/src ./src
RUN touch src/main.rs && cargo build --release

# ---- Runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=backend /app/backend/target/release/backend ./backend
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV STATIC_DIR=/app/frontend/dist \
    DATABASE_PATH=/app/data/media_kit.db

RUN addgroup -S app \
    && adduser -S app -G app \
    && mkdir -p /app/data \
    && chown -R app:app /app

USER app
EXPOSE 3000

CMD ["./backend"]
