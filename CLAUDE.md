# AgriSense — IoT Smart Agriculture Monitoring & Decision Support System

## Project Overview
An IoT-based system that monitors soil and environmental conditions via ESP32 sensors, transmits data over an authenticated MQTT broker, stores it in MongoDB Atlas, applies advanced deep-learning models for crop / fertilizer / irrigation / soil-fertility recommendations, generates bilingual (English + Nepali) advice and PDF reports, and presents everything on a Next.js dashboard with email-based authentication.

The full stack is **containerized with Docker** and **deployed to AWS EC2 via a GitHub Actions CI/CD pipeline**, served over HTTPS behind an nginx reverse proxy.

**Academic project** for Bachelor of Computer Engineering at Far Western University, Mahendranagar, Nepal.

- **Live app:** https://smartagri.cloudcoesis.com
- **EC2 Elastic IP:** `13.235.169.146` (also the MQTT endpoint for the ESP32 on port 1883)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Firmware | ESP32 + MicroPython 1.23 |
| Protocol | MQTT (Eclipse Mosquitto 2.x, port 1883, **username/password auth**) |
| ML Backend | Python FastAPI 0.115.5 + Uvicorn (single worker) |
| Auth Backend | Express.js 5 + Mongoose + JWT |
| Auth | NextAuth 5 (email magic links, MongoDB adapter) |
| Database | MongoDB Atlas (Motor for Python, Mongoose for Node) |
| ML (Phase 8–9) | PyTorch 2.10 · pytorch-tabnet 4.1 · scikit-learn 1.5 · LIME · SHAP · imbalanced-learn (SMOTE) |
| AI Advice (Phase 9) | Google Gemini 2.5 Flash (`google-genai` SDK) · bilingual EN/NP · offline template fallback |
| PDF Reports (Phase 9) | WeasyPrint (Pango + HarfBuzz, correct Devanagari shaping) · Jinja2 |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Recharts |
| Weather | OpenWeatherMap API (free tier) |
| Containerization | Docker · Docker Compose (base / dev / prod overlays) |
| Reverse Proxy | nginx (TLS via Let's Encrypt) |
| Cloud / CI-CD | AWS EC2 + S3 + IAM (Terraform IaC) · GitHub Actions |

## Architecture
Four application containers run on one Docker network (`agrisense-net`); nginx is added in production.

| Service | Port | Directory | Role |
|---------|------|-----------|------|
| Eclipse Mosquitto | 1883 | `mosquitto/` | Authenticated MQTT broker (ESP32 ingest) |
| Python FastAPI | 8000 | `backend/` | Sensors, ML inference, advice, PDF, analytics, weather |
| NodeJS (Express) | 5000 | `NodeJSbackend/` | User onboarding, JWT token generation |
| Next.js Frontend | 3000 | `frontend/` | UI, auth (NextAuth), SSR |
| nginx (prod only) | 80/443 | `nginx/` | TLS termination + reverse proxy to all services |

**Request routing:**
- **Local dev:** Next.js `next.config.ts` `rewrites()` proxy `/api/sensors`, `/api/recommend`, `/api/analytics`, `/api/weather`, `/health` → FastAPI; `/api/account`, `/api/admin`, `/api/me`, etc. → NodeJS. (`/api/auth/*` stays with NextAuth.)
- **Production:** nginx (`nginx/nginx.conf`) performs the same routing and terminates TLS for `smartagri.cloudcoesis.com`.

**Data flow:** ESP32 → (MQTT 1883, authenticated) → Mosquitto → FastAPI subscriber → in-memory cache + MongoDB Atlas → REST API → frontend.

## MQTT Authentication (Phase 10)
- Broker runs with `allow_anonymous false` and a `password_file`.
- The password file is **generated at container start** from `MQTT_USERNAME` / `MQTT_PASSWORD` env vars (no hashed secret is committed). See the `mosquitto` service `command` in `docker-compose.yml`.
- FastAPI authenticates via `username_pw_set(...)` in `mqtt_service.py` (reads `settings.MQTT_USERNAME` / `MQTT_PASSWORD`).
- ESP32 sends credentials via `config.MQTT_USERNAME` / `MQTT_PASSWORD` (`mqtt_client.py`).
- The mosquitto healthcheck publishes with credentials so it reflects real auth.
- Credentials live in `backend/.env` locally and in the `BACKEND_ENV` GitHub secret for deployment (the `mosquitto` service shares `backend/.env` via `env_file`).

## Project Structure
```
mosquitto/             — Mosquitto broker config (mosquitto.conf)
nginx/                 — nginx reverse-proxy + TLS config (prod)
infrastructure/        — Terraform IaC (EC2, S3, IAM modules)
.github/workflows/     — CI/CD (deploy.yml → AWS EC2; ml-models.yml → S3)
docker-compose.yml         — base stack (mosquitto, fastapi, nodejs, frontend)
docker-compose.dev.yml     — dev overlay (hot reload, source bind-mounts)
docker-compose.prod.yml    — prod overlay (nginx, single worker, RO model mount)

frontend/              — Next.js 16 + TypeScript SPA
  src/app/             — App Router pages (auth, dashboard, onboarding, ai_advisor, history)
  src/app/services/    — API client (api.js)
  src/lib/             — NextAuth config, MongoDB client, Zod schemas
  src/components/      — Auth guards, shadcn/ui components
NodeJSbackend/         — Express.js auth & user management backend
  controllers/ middleware/ models/ routes/ config/
backend/               — Python FastAPI backend + ML
  app/                 — routes, services, models, database, core/settings
  ml/                  — training pipeline, model defs, datasets, saved models
  Dockerfile           — multi-stage build (WeasyPrint system deps included)
esp32-firmware/        — MicroPython sensor firmware (config.py, main.py, mqtt_client.py, sensors/)
```

## How to Run

### Option A — Docker (recommended; mirrors production)
```bash
# Base stack (built images, all ports exposed) — needs backend/.env, NodeJSbackend/.env, frontend/.env.local
docker compose -f docker-compose.yml up --build -d

# Dev overlay (hot reload via source bind-mounts)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Prod overlay (adds nginx on 80/443 — requires Let's Encrypt certs on host at /etc/letsencrypt)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
Local URLs: frontend `:3000`, FastAPI `:8000` (`/docs`), NodeJS `:5000`, MQTT `:1883`.

> Note (Windows + Docker Desktop): if a **native Mosquitto Windows service** is installed, it binds IPv4 `0.0.0.0:1883` and will intercept LAN/ESP32 traffic before the container. Stop/disable it (`Stop-Service mosquitto; Set-Service mosquitto -StartupType Disabled`) so the container owns 1883.

### Option B — Run services individually (no Docker)
```bash
# Python backend
cd backend && source venv/Scripts/activate && uvicorn app.main:app --reload   # :8000
# NodeJS backend
cd NodeJSbackend && npm install && npm run dev                                 # :5000
# Frontend
cd frontend && npm install && npm run dev                                      # :3000
```

### ML Model Training
```bash
cd backend && source venv/Scripts/activate
# Windows needs UTF-8 to avoid CP1252 errors on Unicode prints:
set PYTHONIOENCODING=utf-8 && python -X utf8 ml/train_models.py
# Trains SwiFT (crop), TTL (irrigation), TabNet×2 (soil + fertilizer); saves to ml/saved_models/
```

## Deployment (CI/CD)
- Push to `main` → `.github/workflows/deploy.yml` runs: discovers EC2 by tag `AgriSense-IoT-Server`, writes `.env` files from GitHub secrets (`BACKEND_ENV`, `NODEJS_ENV`, `FRONTEND_ENV`), rsyncs code, rewrites `MQTT_BROKER_HOST=localhost` → `mosquitto`, then `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`.
- Health verified at `https://smartagri.cloudcoesis.com/health`.
- Required GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_SSH_KEY`, `BACKEND_ENV`, `NODEJS_ENV`, `FRONTEND_ENV`.
- **`BACKEND_ENV` must include `MQTT_USERNAME` and `MQTT_PASSWORD`** — otherwise the broker (anonymous disabled, no password file) crash-loops and the deploy fails.
- Prereqs: EC2 security group allows inbound 1883; MongoDB Atlas IP allowlist includes the Elastic IP; DNS + Let's Encrypt cert exist for the domain.

## Key Files
- **Python backend entry:** `backend/app/main.py`
- **Settings:** `backend/app/core/settings.py` (Pydantic BaseSettings; MQTT auth fields `MQTT_USERNAME`/`MQTT_PASSWORD`)
- **Database (Python):** `backend/app/database/mongodb.py` · **Repository:** `backend/app/database/repository.py`
- **Routes:** `backend/app/routes/` (sensor, analytics, recommendation, weather)
- **MQTT service:** `backend/app/services/mqtt_service.py` (authenticated subscriber, in-memory cache, async DB bridge)
- **ML inference:** `backend/app/services/ml_service.py` (loads all 4 Phase 8–9 models)
- **Gemini advice:** `backend/app/services/advice_service.py` (bilingual single-call, thread-offloaded, 30s timeout, template fallback)
- **Advice templates:** `backend/app/services/advice_templates.py`
- **PDF service:** `backend/app/services/pdf_service.py` (WeasyPrint) · **Template:** `backend/app/templates/report.html`
- **Recommendation schemas:** `backend/app/models/recommendation.py` (pH bounds 0–14 across requests)
- **ML training:** `backend/ml/train_models.py` · **Model defs:** `backend/ml/models/swift_crop.py`, `ttl_irrigation.py`
- **Broker config:** `mosquitto/mosquitto.conf` · **Compose:** `docker-compose.yml` / `.dev.yml` / `.prod.yml`
- **nginx:** `nginx/nginx.conf` · **CI/CD:** `.github/workflows/deploy.yml` · **IaC:** `infrastructure/`
- **NodeJS entry:** `NodeJSbackend/index.js` · **Auth middleware:** `NodeJSbackend/middleware/AuthToken.js`
- **NextAuth config:** `frontend/src/lib/auth.ts` · **API client:** `frontend/src/app/services/api.js` · **Proxy rewrites:** `frontend/next.config.ts`
- **Auth guard:** `frontend/src/components/CheckAuth.tsx`
- **ESP32:** `esp32-firmware/main.py`, `config.py`, `mqtt_client.py`

## API Endpoints

### Python FastAPI (port 8000)
- `GET /health` — system status
- `GET /api/sensors/latest` · `GET /api/sensors/history` · `GET /api/sensors/status` · `POST /api/sensors/simulate`
- `GET /api/recommend/full` — all recommendations using live sensor + weather data
- `POST /api/recommend/crop` (SwiFT) · `POST /api/recommend/fertilizer` (TabNet) · `POST /api/recommend/irrigation` (TTL, crop-aware) · `POST /api/recommend/soil` (TabNet, Low/Med/High)
- `POST /api/recommend/complete` — Step 2 guided report: 3 ML models + bilingual advice for all 4 sections, saved to history
- `POST /api/recommend/advice` — on-demand bilingual (EN+NP) Gemini advice with offline fallback
- `POST /api/recommend/explain` — LIME XAI for fertilizer or soil
- `GET /api/recommend/status` — ML model load status
- `GET /api/recommend/history` — paginated history (RBAC) · `GET /api/recommend/history/{report_id}`
- `POST /api/recommend/report` — WeasyPrint PDF report
- `GET /api/analytics/summary/daily` · `GET /api/analytics/summary/week`
- `GET /api/weather/current`

### NodeJS Backend (port 5000)
- `POST /api/userOnboarding` — update profile from NextAuth session
- `GET /api/settingCookies` — generate JWT `backend_token` from session

## Authentication
- **Provider:** NextAuth 5, email magic links (Nodemailer/Gmail SMTP); MongoDB adapter stores sessions in `Agricult`.
- **Flow:** Login → email verify → onboarding (first time) → JWT `backend_token` (NodeJS) → dashboard.
- **Protected routes:** enforced by `CheckAuth.tsx`.

## Conventions
- **Git commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Python:** async/await; Motor for MongoDB; Pydantic validation. Blocking 3rd-party calls (e.g. Gemini) are offloaded with `asyncio.to_thread` + `asyncio.gather` to keep the single-worker event loop responsive.
- **Single Uvicorn worker** is mandatory in prod (`UVICORN_WORKERS=1`): the app runs one in-process MQTT subscriber with a fixed client id and in-memory cache; multiple workers cause MQTT "session taken over" reconnect loops and a split cache.
- **Frontend:** Next.js App Router; TypeScript; Tailwind + shadcn/ui; Recharts.
- **Secrets:** in `.env` / `.env.local` (gitignored) locally; in GitHub secrets for deploy. Never commit secrets.
- **Line endings:** `.gitattributes` forces `*.sh` to LF (container scripts); `mosquitto.conf` must stay LF.

## Database
Two databases on one MongoDB Atlas cluster:
- **`smart-agriculture-iot` (FastAPI):** `sensor_readings` (90-day TTL), `daily_summaries`, `recommendations` (180-day TTL), `devices`, `alerts`; compound indexes on `(device_id, received_at)` and `(created_at)`.
- **`Agricult` (NextAuth + NodeJS):** `users`, `sessions`, `accounts`, `verification_tokens`.

## Environment Variables
- `backend/.env` — MQTT (incl. `MQTT_USERNAME`/`MQTT_PASSWORD`), MongoDB, Weather API, ML, `GEMINI_API_KEY`. See `backend/.env.example`. Mirrored to the `BACKEND_ENV` GitHub secret.
- `frontend/.env.local` — `AUTH_SECRET`, `MONGODB_URI`, Gmail SMTP, `BACKEND`. Mirrored to `FRONTEND_ENV`.
- `NodeJSbackend/.env` — `MONGODB_URI`, JWT secret, `AUTH_SECRET`, CORS origins, `MLSERVER_URL`, `FRONTEND_URL`. Mirrored to `NODEJS_ENV`.

## ML Models (Phase 8–9 — Advanced DL, Nepal profiles)
Defined in `backend/ml/models/`, trained via `backend/ml/train_models.py` (18 Nepal crops; SMOTE for fertilizer imbalance).

1. **SwiFT Crop** — Sparse Weighted Fusion Transformer (PyTorch): 13 features → 18 crops · ~**77.1%**.
2. **TTL Irrigation** — FT-Transformer: 9 num + 2 cat → 5 levels · crop-aware dual-mode · ~**98.5%**.
3. **TabNet Soil** — pytorch-tabnet + LIME: 5 features → Low/Med/High · ~**98.7%**.
4. **TabNet Fertilizer** — pytorch-tabnet + LIME: 8 features → 5 fertilizers · ~**98.3%** (SMOTE upsampled).

## Sensors (ESP32)
- DHT22 (GPIO 4) — temperature & humidity
- Capacitive soil moisture (GPIO 34) — soil moisture %
- PH-4502C (GPIO 35) — soil pH (calibrate with buffer solutions; raw readings can exceed realistic soil range)
- NPK sensor — planned, not yet integrated

## Testing
- Test scaffolding exists (pytest / Jest / RTL) under each service; coverage is partial.
- Manual verification via `POST /api/sensors/simulate` and the `/api/recommend/*` endpoints.
- ML metrics printed during `train_models.py`.
