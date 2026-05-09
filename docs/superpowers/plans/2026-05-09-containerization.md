# AgriSense Containerization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize all three AgriSense services plus the Mosquitto MQTT broker using Docker Compose, with a base + dev override + prod override file pattern for clean environment separation.

**Architecture:** `docker-compose.yml` defines all shared service config. `docker-compose.dev.yml` overrides commands and volumes for hot reload + exposed ports. `docker-compose.prod.yml` adds an Nginx reverse proxy on port 80. MongoDB Atlas, Gemini, OpenWeatherMap, and Gmail remain as external cloud services.

**Tech Stack:** Docker Engine 24+, Docker Compose v2, `python:3.13-slim` (FastAPI multi-stage), `node:22-alpine` (NodeJS single-stage + Next.js multi-stage), `eclipse-mosquitto:2`, `nginx:alpine`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/.dockerignore` | Create | Exclude venv, pycache, env files, datasets, saved_models from build context |
| `backend/Dockerfile` | Create | Multi-stage: builder (pip + PyTorch CPU) → runtime (app code only) |
| `NodeJSbackend/.dockerignore` | Create | Exclude node_modules, .env from build context |
| `NodeJSbackend/Dockerfile` | Create | Single-stage node:22-alpine, prod deps only |
| `frontend/.dockerignore` | Create | Exclude node_modules, .next, .env.local |
| `frontend/Dockerfile` | Create | Multi-stage: deps → builder (next build) → runner (standalone) |
| `frontend/next.config.ts` | Modify | Add `output: 'standalone'` for self-contained prod image |
| `mosquitto/mosquitto.conf` | Create | Minimal broker config: listener 1883, anonymous, persistence |
| `nginx/nginx.conf` | Create | Reverse proxy: routes by exact path to fastapi/nodejs/frontend |
| `docker-compose.yml` | Create | Base: all services, health checks, shared volumes, no ports (except MQTT 1883) |
| `docker-compose.dev.yml` | Create | Dev overrides: hot-reload commands, exposed ports, source bind-mounts |
| `docker-compose.prod.yml` | Create | Prod overrides: Nginx service + 4-worker FastAPI |
| `.env.docker.example` | Create | Documents Docker-specific env var changes for the team |
| `scripts/dev.sh` | Create | Convenience: `docker compose -f base -f dev up --build` |
| `scripts/prod.sh` | Create | Convenience: `docker compose -f base -f prod up --build -d` |

---

## Task 1: Create `.dockerignore` Files

**Files:**
- Create: `backend/.dockerignore`
- Create: `NodeJSbackend/.dockerignore`
- Create: `frontend/.dockerignore`
- Create: `nginx/.dockerignore`

- [ ] **Step 1: Create `backend/.dockerignore`**

```
venv/
__pycache__/
*.pyc
*.pyo
.env
ml/saved_models/
ml/datasets/
.pytest_cache/
*.egg-info/
.git/
```

- [ ] **Step 2: Create `NodeJSbackend/.dockerignore`**

```
node_modules/
.env
.git/
*.log
```

- [ ] **Step 3: Create `frontend/.dockerignore`**

```
node_modules/
.next/
.env.local
.git/
*.log
```

- [ ] **Step 4: Create `nginx/.dockerignore`**

```
.git/
```

- [ ] **Step 5: Commit**

```bash
git add backend/.dockerignore NodeJSbackend/.dockerignore frontend/.dockerignore nginx/.dockerignore
git commit -m "chore(docker): add .dockerignore files for all services"
```

---

## Task 2: Enable Next.js Standalone Output

**Files:**
- Modify: `frontend/next.config.ts`

The standalone output mode bundles only the files needed at runtime into `.next/standalone/`, producing a much smaller production image.

- [ ] **Step 1: Add `output: 'standalone'` to `frontend/next.config.ts`**

Replace the entire file with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Verify the config is valid**

Run from the `frontend/` directory:

```bash
cd frontend && npx next info
```

Expected: prints Next.js version info without errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/next.config.ts
git commit -m "feat(frontend): enable standalone output for Docker production build"
```

---

## Task 3: Create Mosquitto Configuration

**Files:**
- Create: `mosquitto/mosquitto.conf`

- [ ] **Step 1: Create `mosquitto/` directory and config**

```bash
mkdir mosquitto
```

Create `mosquitto/mosquitto.conf`:

```conf
listener 1883
allow_anonymous true

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information
```

- [ ] **Step 2: Commit**

```bash
git add mosquitto/mosquitto.conf
git commit -m "chore(docker): add Mosquitto broker configuration"
```

---

## Task 4: Create the FastAPI Dockerfile

**Files:**
- Create: `backend/Dockerfile`

Two stages: `builder` installs all Python deps into a virtual environment; `runtime` copies only the venv + app code — no pip, no build tools, no source cache.

PyTorch is installed separately with `--index-url https://download.pytorch.org/whl/cpu` to fetch the CPU-only wheel (~800 MB instead of ~3 GB for CUDA).

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
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
RUN pip install --no-cache-dir -r requirements.txt

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
```

- [ ] **Step 2: Test that the image builds (dependencies only, no model files needed)**

Run from the project root:

```bash
docker build -t agrisense-fastapi-test ./backend
```

Expected: build succeeds. The final `runtime` stage should be output. Ignore any model-not-found warnings — the container needs the volume mounted to run fully.

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat(docker): add FastAPI multi-stage Dockerfile (PyTorch CPU build)"
```

---

## Task 5: Create the NodeJS (Express) Dockerfile

**Files:**
- Create: `NodeJSbackend/Dockerfile`

Single-stage build. `nodemon` is already in `dependencies` (not devDependencies) in `package.json`, so it's available in prod installs and can be used for dev hot-reload without a separate Dockerfile target.

- [ ] **Step 1: Create `NodeJSbackend/Dockerfile`**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "index.js"]
```

- [ ] **Step 2: Test that the image builds**

```bash
docker build -t agrisense-nodejs-test ./NodeJSbackend
```

Expected: build succeeds and prints the layer for `npm ci`.

- [ ] **Step 3: Commit**

```bash
git add NodeJSbackend/Dockerfile
git commit -m "feat(docker): add NodeJS Express Dockerfile (node:22-alpine)"
```

---

## Task 6: Create the Next.js Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`

Three stages:
- `deps` — install all npm packages (used as dev build target)
- `builder` — run `next build` to produce `.next/standalone/`
- `runner` — copy only the standalone output; tiny final image (used as prod build target)

- [ ] **Step 1: Create `frontend/Dockerfile`**

```dockerfile
# ── Stage 1: install dependencies ─────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build the Next.js application ───────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: minimal production runtime ──────────────────────
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

WORKDIR /app

# standalone output is self-contained — includes only required node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Test that the image builds to the `runner` stage**

```bash
docker build -t agrisense-frontend-test ./frontend
```

Expected: three stages complete. Final image is based on `node:22-alpine` with only the standalone output. Build will take a few minutes for `next build`.

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile
git commit -m "feat(docker): add Next.js multi-stage Dockerfile (standalone output)"
```

---

## Task 7: Create the Nginx Reverse Proxy Config

**Files:**
- Create: `nginx/nginx.conf`

Routes requests by exact path. Both NodeJS and FastAPI use the `/api/` prefix, so NodeJS routes are matched as exact locations before the FastAPI prefix blocks.

- [ ] **Step 1: Create `nginx/nginx.conf`**

```nginx
upstream frontend_upstream {
    server frontend:3000;
}

upstream fastapi_upstream {
    server fastapi:8000;
}

upstream nodejs_upstream {
    server nodejs:5000;
}

server {
    listen 80;

    # ── NodeJS exact routes ──────────────────────────────────
    location = /api/userOnboarding {
        proxy_pass         http://nodejs_upstream;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }

    location = /api/settingCookies {
        proxy_pass         http://nodejs_upstream;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }

    # ── FastAPI routes ───────────────────────────────────────
    location /api/sensors/ {
        proxy_pass         http://fastapi_upstream;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    location /api/recommend/ {
        proxy_pass         http://fastapi_upstream;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }

    location /api/analytics/ {
        proxy_pass         http://fastapi_upstream;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }

    location /api/weather/ {
        proxy_pass         http://fastapi_upstream;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }

    location = /health {
        proxy_pass         http://fastapi_upstream;
        proxy_set_header   Host              $host;
    }

    # ── Next.js frontend (catch-all) ─────────────────────────
    location / {
        proxy_pass         http://frontend_upstream;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx/nginx.conf
git commit -m "feat(docker): add Nginx reverse proxy configuration"
```

---

## Task 8: Create `docker-compose.yml` (Base)

**Files:**
- Create: `docker-compose.yml`

Defines all services with their shared config: networks, health checks, env_file references, restart policies. No ports are exposed here (except Mosquitto port 1883, which must always be reachable by ESP32 hardware on the LAN). Dev and prod override files add the rest.

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
networks:
  agrisense-net:
    driver: bridge

volumes:
  mosquitto_data:
  mosquitto_log:

services:

  # ── MQTT Broker ────────────────────────────────────────────
  mosquitto:
    image: eclipse-mosquitto:2
    networks: [agrisense-net]
    restart: unless-stopped
    ports:
      - "1883:1883"          # always exposed — ESP32 hardware on LAN needs this
    volumes:
      - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    healthcheck:
      test: ["CMD", "mosquitto_pub", "-h", "localhost", "-p", "1883",
             "-t", "health/check", "-m", "ping", "-q"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # ── Python FastAPI (ML + sensors + weather) ────────────────
  fastapi:
    build:
      context: ./backend
      dockerfile: Dockerfile
    networks: [agrisense-net]
    restart: unless-stopped
    env_file: ./backend/.env
    environment:
      MQTT_BROKER_HOST: mosquitto       # override localhost → service name
    volumes:
      - ./backend/ml/saved_models:/app/ml/saved_models  # host bind-mount
    depends_on:
      mosquitto:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c",
             "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s      # ML model loading takes ~30-60s on first start

  # ── NodeJS Express (auth + user management) ────────────────
  nodejs:
    build:
      context: ./NodeJSbackend
      dockerfile: Dockerfile
    networks: [agrisense-net]
    restart: unless-stopped
    env_file: ./NodeJSbackend/.env
    environment:
      MLSERVER_URL: http://fastapi:8000   # override localhost → service name
      FRONTEND_URL: http://frontend:3000  # override localhost → service name
    depends_on:
      fastapi:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e",
             "const h=require('http');h.get('http://localhost:5000/',r=>{process.exit(r.statusCode<500?0:1)}).on('error',_=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  # ── Next.js Frontend ───────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runner                      # prod: standalone build
    networks: [agrisense-net]
    restart: unless-stopped
    env_file: ./frontend/.env.local
    environment:
      BACKEND: http://nodejs:5000         # server-side SSR calls
    depends_on:
      nodejs:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e",
             "const h=require('http');h.get('http://localhost:3000/',r=>{process.exit(r.statusCode<500?0:1)}).on('error',_=>process.exit(1))"]
      interval: 30s
      timeout: 15s
      retries: 3
      start_period: 30s
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add base docker-compose.yml with all services and health checks"
```

---

## Task 9: Create `docker-compose.dev.yml` (Dev Overrides)

**Files:**
- Create: `docker-compose.dev.yml`

Adds: hot-reload commands (uvicorn --reload, nodemon, next dev), exposed ports (3000, 5000, 8000), source bind-mounts for live code changes.

**Node.js volume trick:** `./NodeJSbackend:/app` bind-mounts the source. The additional anonymous volume `- /app/node_modules` masks that subdirectory with the image's Linux-native node_modules, preventing Windows-compiled binaries from being used inside the container.

- [ ] **Step 1: Create `docker-compose.dev.yml`**

```yaml
# Dev overrides — merge with: docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

services:

  fastapi:
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    ports:
      - "8000:8000"
    volumes:
      # bind-mount source for hot reload (venv lives at /venv, not /app, so no conflict)
      - ./backend/app:/app/app
      - ./backend/ml/models:/app/ml/models
      # saved_models from host (inherited from base — no change needed)

  nodejs:
    command: ["node_modules/.bin/nodemon", "index.js"]
    ports:
      - "5000:5000"
    volumes:
      - ./NodeJSbackend:/app
      - /app/node_modules     # anonymous volume: preserves Linux node_modules from image

  frontend:
    build:
      target: deps            # only install deps stage — skip next build
    command: ["npm", "run", "dev"]
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules     # anonymous volume: preserves Linux node_modules from image
      - /app/.next            # anonymous volume: preserves Next.js build cache
```

- [ ] **Step 2: Start dev environment and verify all services come up healthy**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Expected output (after ~2-3 minutes):
```
mosquitto-1  | mosquitto version ... running
fastapi-1    | INFO:     Application startup complete.
nodejs-1     | [nodemon] starting `node index.js`
frontend-1   | ▲ Next.js 16.x.x
frontend-1   |   - Local: http://localhost:3000
```

Check health status in a second terminal:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

Expected: all four services show `(healthy)`.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "feat(docker): add dev override compose file (hot reload, exposed ports)"
```

---

## Task 10: Create `docker-compose.prod.yml` (Prod Overrides)

**Files:**
- Create: `docker-compose.prod.yml`

Adds the Nginx service (prod-only). Sets FastAPI to use 4 workers. No source bind-mounts — containers run from built images only.

- [ ] **Step 1: Create `docker-compose.prod.yml`**

```yaml
# Prod overrides — merge with: docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

services:

  fastapi:
    environment:
      UVICORN_WORKERS: "4"   # increase workers for production load

  nginx:
    image: nginx:alpine
    networks: [agrisense-net]
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend:
        condition: service_healthy
      fastapi:
        condition: service_healthy
      nodejs:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO/dev/null http://localhost/ 2>&1 && exit 0 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat(docker): add prod override compose file (Nginx, 4-worker FastAPI)"
```

---

## Task 11: Create `.env.docker.example` and Convenience Scripts

**Files:**
- Create: `.env.docker.example`
- Create: `scripts/dev.sh`
- Create: `scripts/prod.sh`

- [ ] **Step 1: Create `.env.docker.example`**

```bash
# Docker-specific environment variable overrides
#
# When running inside Docker, service hostnames replace 'localhost'.
# Copy these values into each service's .env file:
#
# ── backend/.env ─────────────────────────────────────────────
# Change:  MQTT_BROKER_HOST=localhost
# To:      MQTT_BROKER_HOST=mosquitto
#
# ── NodeJSbackend/.env ───────────────────────────────────────
# Change:  MLSERVER_URL=http://localhost:8000
# To:      MLSERVER_URL=http://fastapi:8000
#
# Change:  FRONTEND_URL=http://localhost:3000
# To:      FRONTEND_URL=http://frontend:3000
#
# ── frontend/.env.local ──────────────────────────────────────
# The BACKEND variable is overridden directly in docker-compose.yml.
# No manual change needed in .env.local for Docker.
#
# ── All secrets remain unchanged ─────────────────────────────
# MONGODB_URI, JWT secrets, AUTH_SECRET, GEMINI_API_KEY,
# GMAIL credentials, and WEATHER_API_KEY do not change for Docker.
```

- [ ] **Step 2: Create `scripts/` directory and `scripts/dev.sh`**

```bash
mkdir scripts
```

`scripts/dev.sh`:
```bash
#!/usr/bin/env bash
set -e
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build "$@"
```

- [ ] **Step 3: Create `scripts/prod.sh`**

`scripts/prod.sh`:
```bash
#!/usr/bin/env bash
set -e
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d "$@"
echo ""
echo "AgriSense running at http://localhost"
echo "  Logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "  Stop: docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
```

- [ ] **Step 4: Make scripts executable**

On Linux/Mac:
```bash
chmod +x scripts/dev.sh scripts/prod.sh
```

On Windows (PowerShell — scripts are called via bash explicitly, so executable bit not strictly needed):
```powershell
# No action needed on Windows — scripts are invoked as: bash scripts/dev.sh
```

- [ ] **Step 5: Commit**

```bash
git add .env.docker.example scripts/dev.sh scripts/prod.sh
git commit -m "chore(docker): add .env.docker.example and convenience startup scripts"
```

---

## Task 12: Dev Smoke Test

Verify the full dev environment works end-to-end. All four services must be healthy, MQTT must receive data, and the UI must be accessible.

- [ ] **Step 1: Start the dev environment**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Wait until all services print their ready messages (see Task 9 Step 2 for expected output).

- [ ] **Step 2: Verify FastAPI health**

```bash
curl http://localhost:8000/health
```

Expected response: `{"status": "healthy", ...}` with HTTP 200.

- [ ] **Step 3: Verify MQTT pipeline (inject test sensor data)**

```bash
curl -X POST http://localhost:8000/api/sensors/simulate
```

Expected: `{"status": "ok", ...}` and the FastAPI terminal shows MQTT publish/receive log lines.

- [ ] **Step 4: Verify ML recommendation endpoint**

```bash
curl -X POST http://localhost:8000/api/recommend/crop \
  -H "Content-Type: application/json" \
  -d '{"N":90,"P":42,"K":43,"temperature":21,"humidity":82,"ph":6.5,"rainfall":202}'
```

Expected: JSON response with `crop` field. If `{"detail": "Models not loaded"}` appears, the saved_models volume is empty — run `python ml/train_models.py` in the backend directory first.

- [ ] **Step 5: Verify NodeJS backend is reachable**

```bash
curl -v http://localhost:5000/api/settingCookies
```

Expected: HTTP 4xx (not connection refused). A 401 or 403 means the server is running and auth is working correctly.

- [ ] **Step 6: Verify Next.js frontend**

Open `http://localhost:3000` in a browser. Expected: AgriSense login page loads. Check that no console errors indicate failed connections to backends.

- [ ] **Step 7: Verify hot reload (FastAPI)**

Edit any file in `backend/app/` (e.g., add a comment). Expected: the FastAPI container log shows `WatchFiles detected changes`, and the server reloads automatically without restarting the container.

- [ ] **Step 8: Verify hot reload (NodeJS)**

Edit `NodeJSbackend/index.js` (e.g., add a comment). Expected: nodemon log shows `restarting due to changes`.

- [ ] **Step 9: Verify hot reload (Next.js)**

Edit any file in `frontend/src/`. Expected: Next.js logs show `Fast Refresh` and the browser updates without a full page reload.

- [ ] **Step 10: Verify automatic restart (fault tolerance)**

```bash
# In a second terminal, kill the FastAPI container
docker kill smart-agriculture-iot-fastapi-1

# Wait 10 seconds, then check status
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

Expected: the `fastapi` service shows `Restarting` briefly, then returns to `Running (healthy)` within ~30-60 seconds.

- [ ] **Step 11: Stop dev environment**

```bash
# Ctrl+C in the first terminal, then:
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Expected: all containers stop cleanly.

- [ ] **Step 12: Commit (no code changes — just verify git is clean)**

```bash
git status
```

Expected: nothing to commit. If any files changed during testing (e.g., `.env`), do not commit them.

---

## Task 13: Prod Smoke Test

Verify the production configuration works: Nginx routes correctly, services are only accessible through port 80, and the fault tolerance restart policy is active.

- [ ] **Step 1: Start the prod environment**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Expected: all images build (this will take several minutes for the first build — next build runs in the builder stage). All containers start in detached mode.

- [ ] **Step 2: Wait for all services to be healthy**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Wait until all five services (mosquitto, fastapi, nodejs, frontend, nginx) show `(healthy)`. The FastAPI container may take up to 60 seconds due to ML model loading.

- [ ] **Step 3: Verify Nginx routes to FastAPI**

```bash
curl http://localhost/health
```

Expected: `{"status": "healthy", ...}` — Nginx proxied to FastAPI on port 8000.

- [ ] **Step 4: Verify Nginx routes to NodeJS**

```bash
curl -v http://localhost/api/settingCookies
```

Expected: HTTP 4xx response (not connection refused) — Nginx proxied to NodeJS on port 5000.

- [ ] **Step 5: Verify Nginx routes to Next.js**

```bash
curl -s http://localhost/ | head -20
```

Expected: HTML starting with `<!DOCTYPE html>` — Next.js standalone server responded through Nginx.

- [ ] **Step 6: Verify app ports are NOT directly accessible from host**

```bash
curl http://localhost:3000/
curl http://localhost:5000/
curl http://localhost:8000/health
```

Expected: all three commands fail with `Connection refused`. Only Nginx port 80 is exposed in prod. (Mosquitto:1883 is still exposed for ESP32.)

- [ ] **Step 7: View live logs**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f fastapi
```

Expected: FastAPI request logs appear for the curl requests made in previous steps.

- [ ] **Step 8: Stop prod environment**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

---

## Quick Reference

```bash
# Dev (hot reload, ports 3000/5000/8000/1883 exposed)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Prod (Nginx on port 80, detached)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# View logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f fastapi

# Restart a single service
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart fastapi

# Rebuild and restart a single service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build fastapi

# Stop and remove containers (keeps volumes)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Stop and remove everything including mosquitto data volume
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```
