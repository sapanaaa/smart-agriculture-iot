# ── Stage 1: install all Python dependencies ──────────────────
FROM python:3.13-slim AS builder

WORKDIR /build
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

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy application source
COPY app/ app/

# Copy ML model architecture files (not saved_models — that's a volume)
COPY ml/models/ ml/models/

EXPOSE 8000

# 2 workers default; override via UVICORN_WORKERS env var in prod
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS:-2}"]
