# ── Stage 1: install all Python dependencies ──────────────────
FROM python:3.13-slim AS builder

WORKDIR /build

# System deps needed to build pycairo (required by reportlab / xhtml2pdf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ pkg-config libcairo2-dev meson \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip

# PyTorch CPU-only wheel (avoids ~2 GB CUDA download)
RUN pip install --no-cache-dir \
    torch==2.10.0 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

# ── Stage 2: minimal runtime image ────────────────────────────
FROM python:3.13-slim AS runtime

# Runtime shared library for pycairo / reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy application source
COPY app/ app/

# Copy ML model architecture files (not saved_models — that's a volume)
COPY ml/models/ ml/models/

# Create directory for ML models (will be mounted from host)
RUN mkdir -p ml/saved_models

# Add startup entrypoint script
COPY docker-entrypoint.sh /app/
# Strip any Windows CR characters and make it executable.
# Avoids "exec ...: no such file or directory" caused by CRLF line endings.
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
# 2 workers default; override via UVICORN_WORKERS env var in prod
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS:-2}"]
