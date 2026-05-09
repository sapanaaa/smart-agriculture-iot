# AgriSense Containerization Design

**Date:** 2026-05-09  
**Approach:** Docker Compose with dev/prod profiles  
**Scope:** All three app services + Mosquitto MQTT broker + Nginx reverse proxy (prod)

---

## Goals

- **Fault-tolerant:** Containers restart automatically on crash (`restart: unless-stopped` + health checks + `depends_on` ordering).
- **Scalable:** `docker compose scale fastapi=2` or `docker compose scale nodejs=2` as needed on a single host.
- **Fast:** Multi-stage Dockerfiles minimize final image size; Docker layer caching avoids re-installing deps on every build.
- **Easy:** `docker compose --profile dev up` or `docker compose --profile prod up` replaces the current 3-terminal workflow.

---

## Out of Scope

- ESP32 firmware — embedded hardware, not containerizable.
- MongoDB Atlas — external cloud service, stays as-is.
- OpenWeatherMap API — external cloud service, stays as-is.
- Gemini AI — external cloud service, stays as-is.
- Gmail SMTP — external cloud service, stays as-is.
- Kubernetes / Docker Swarm — not needed at current academic project scale.

---

## File Structure

```
smart-agriculture-iot/
├── docker-compose.yml              ← single file, all services, dev + prod profiles
├── .env.docker.example             ← documents Docker-specific env var overrides
├── nginx/
│   ├── nginx.conf                  ← prod reverse proxy config
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile                  ← multi-stage: deps → builder → runner
│   └── .dockerignore
├── NodeJSbackend/
│   ├── Dockerfile                  ← single-stage node:22-alpine
│   └── .dockerignore
└── backend/
    ├── Dockerfile                  ← multi-stage: builder (pip install) → runtime
    └── .dockerignore
```

---

## Services

| Container | Image base | Profile | Internal port | Exposed port |
|---|---|---|---|---|
| `mosquitto` | `eclipse-mosquitto:2` | dev + prod | 1883 | 1883 (dev only) |
| `fastapi` | `python:3.13-slim` | dev + prod | 8000 | 8000 (dev only) |
| `nodejs` | `node:22-alpine` | dev + prod | 5000 | 5000 (dev only) |
| `frontend` | `node:22-alpine` | dev + prod | 3000 | 3000 (dev only) |
| `nginx` | `nginx:alpine` | prod only | 80 | 80, 443 |

All containers share a single Docker bridge network named `agrisense-net`. Containers resolve each other by service name.

---

## Networking

### Dev profile
All service ports are bound to the host. Developers access services exactly as today:
- Frontend: `http://localhost:3000`
- NodeJS: `http://localhost:5000`
- FastAPI: `http://localhost:8000`
- Mosquitto: `localhost:1883`

### Prod profile
Only Nginx ports 80/443 are exposed. All app ports are internal only.

**Nginx routing rules:**

| Path pattern | Upstream |
|---|---|
| `/` (all unmatched) | `frontend:3000` |
| `/api/auth/*` | `nodejs:5000` |
| `/api/sensors/*` | `fastapi:8000` |
| `/api/recommend/*` | `fastapi:8000` |
| `/api/analytics/*` | `fastapi:8000` |
| `/api/weather/*` | `fastapi:8000` |
| `/health` | `fastapi:8000` |

---

## Dockerfiles

### `backend/Dockerfile` — Multi-stage (Python FastAPI + ML)

- **Stage 1 `builder`:** `python:3.13-slim`. Installs all pip dependencies from `requirements.txt` into `/install`. PyTorch CPU-only wheel (~800 MB) is fetched once and cached in a Docker layer.
- **Stage 2 `runtime`:** Copies `/install` from builder, copies application code (excluding `ml/saved_models/` and `ml/datasets/`). Runs `uvicorn app.main:app` with worker count controlled by `UVICORN_WORKERS` env var (default 2 in dev, 4 in prod).
- ML model files are **not baked in** — they are mounted via a named volume.

### `frontend/Dockerfile` — Multi-stage (Next.js)

- **Stage 1 `deps`:** `node:22-alpine`. Installs npm dependencies.
- **Stage 2 `builder`:** Runs `next build` using Next.js standalone output mode (`output: 'standalone'` in `next.config.ts`).
- **Stage 3 `runner`:** Minimal alpine image. Copies only `.next/standalone/` and `.next/static/`. Very small final image.
- **Dev override:** `docker-compose.yml` overrides the command to `next dev` and bind-mounts the source for hot reload.

### `NodeJSbackend/Dockerfile` — Single-stage

- `node:22-alpine`. Installs npm dependencies, copies source.
- Dev: command is `nodemon index.js` with source bind-mounted.
- Prod: command is `node index.js`.

### Mosquitto — No custom Dockerfile

- Uses official `eclipse-mosquitto:2` image.
- A minimal `mosquitto/mosquitto.conf` is bind-mounted in.
- `allow_anonymous true` for dev; restrict for prod.

---

## Fault Tolerance

### Restart policy
All services: `restart: unless-stopped`. On container crash, Docker restarts it immediately without human intervention.

### Health checks

| Service | Check | Interval | Retries |
|---|---|---|---|
| `fastapi` | `GET http://localhost:8000/health` | 30s | 3 |
| `nodejs` | TCP port 5000 | 30s | 3 |
| `frontend` | TCP port 3000 | 30s | 3 |
| `mosquitto` | TCP port 1883 | 30s | 3 |
| `nginx` (prod) | `GET http://localhost/` | 30s | 3 |

### Startup ordering
`depends_on` with `condition: service_healthy` ensures:
1. `mosquitto` starts first.
2. `fastapi` starts after `mosquitto` is healthy (FastAPI connects to MQTT on startup).
3. `nodejs` and `frontend` start after `fastapi` is healthy.
4. `nginx` (prod) starts after all three app services are healthy.

---

## Named Volumes

| Volume | Mounted at (container path) | Purpose |
|---|---|---|
| `ml_models` | `/app/ml/saved_models` (fastapi) | ML model files trained on host, persisted across container rebuilds |
| `mosquitto_data` | `/mosquitto/data` | MQTT retained message persistence |
| `mosquitto_log` | `/mosquitto/log` | Mosquitto broker logs |

**Workflow for models:** Train on host → files appear in `backend/ml/saved_models/` on host → volume reflects them inside the `fastapi` container immediately (no rebuild needed).

---

## Environment Variables

### Docker-specific overrides (service names replace `localhost`)

| Variable | Original value | Docker value | Service |
|---|---|---|---|
| `MQTT_BROKER_HOST` | `localhost` | `mosquitto` | FastAPI `.env` |
| `MLSERVER_URL` | `http://localhost:8000` | `http://fastapi:8000` | NodeJS `.env` |
| `FRONTEND_URL` | `http://localhost:3000` | `http://frontend:3000` | NodeJS `.env` |
| `BACKEND` | `http://localhost:5000` | `http://nodejs:5000` (server-side) | Frontend `.env.local` |

> **Note:** `BACKEND` in `frontend/.env.local` is used for server-side Next.js API calls (SSR). Browser-side calls go through Nginx in prod, so no change needed for client-side fetch URLs.

### Secrets (no change needed)
MongoDB URI, JWT secret, Gemini API key, Gmail credentials, AUTH_SECRET, and Weather API key remain in each service's `.env` / `.env.local` file — gitignored, no Docker changes required.

### `.env.docker.example`
A single file at the project root documenting all Docker-specific variable overrides for team members.

---

## `.dockerignore` Files

Each service excludes files that must not enter the build context:

| Service | Excluded |
|---|---|
| `backend/` | `venv/`, `__pycache__/`, `*.pyc`, `ml/saved_models/`, `ml/datasets/`, `.env` |
| `frontend/` | `node_modules/`, `.next/`, `.env.local` |
| `NodeJSbackend/` | `node_modules/`, `.env` |
| `nginx/` | (empty — only conf files present) |

---

## Commands Reference

```bash
# Start in dev mode (hot reload, all ports exposed)
docker compose --profile dev up --build

# Start in production mode (Nginx, optimized builds)
docker compose --profile prod up --build -d

# View logs for a specific service
docker compose logs -f fastapi

# Restart a crashed service
docker compose restart fastapi

# Stop everything
docker compose down

# Stop and remove volumes (WARNING: wipes mosquitto data)
docker compose down -v
```

---

## Testing Plan

1. Build all images: `docker compose --profile dev build` — all four images build without errors.
2. Start dev: `docker compose --profile dev up` — all services reach `healthy` state.
3. Verify MQTT: ESP32 (or `simulate` endpoint) publishes; FastAPI receives data; `GET /api/sensors/latest` returns a reading.
4. Verify ML: `POST /api/recommend/crop` returns a prediction — confirms model volume is mounted correctly.
5. Verify auth flow: Navigate to `http://localhost:3000`, complete magic link login flow end-to-end.
6. Build prod: `docker compose --profile prod build`.
7. Start prod: `docker compose --profile prod up -d`.
8. Verify Nginx routing: `curl http://localhost/health` → FastAPI; `curl http://localhost/` → Next.js HTML; `curl http://localhost/api/auth/settingCookies` → NodeJS.
9. Crash test: `docker kill agrisense-fastapi` → wait 10s → `docker ps` → container restarted automatically.
