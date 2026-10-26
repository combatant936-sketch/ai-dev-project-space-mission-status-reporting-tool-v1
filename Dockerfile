# ============================================================
# Stage 1 – Build the React / Vite frontend
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Install deps first (layer-cache friendly)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Artefacts land in /app/frontend/dist


# ============================================================
# Stage 2 – Python runtime image
# ============================================================
FROM python:3.11-slim AS runtime

# --- system bits ---
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIR=/app/frontend/dist

# postgresql-client supplies pg_isready, used in CMD to wait for Postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Install uv (fast Python package manager used by this project)
RUN pip install --no-cache-dir uv

# Install Python dependencies via uv
# Copy lockfile + manifest first so Docker can cache this layer
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Copy backend source
COPY backend/ .

# Copy the compiled frontend into a location FastAPI can serve
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose the API port
EXPOSE 8000

# Entrypoint:
#   1. Wait until PostgreSQL is reachable (pg_isready polls the DB_HOST / DB_PORT)
#   2. Run Alembic migrations (idempotent – safe to run every startup)
#   3. Seed demo data  (idempotent – skips rows that already exist)
#   4. Start uvicorn bound to 0.0.0.0 so -p port mapping works
CMD until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -q; do \
        echo "Waiting for PostgreSQL…"; sleep 2; \
    done && \
    uv run alembic upgrade head && \
    uv run python seed.py && \
    uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
