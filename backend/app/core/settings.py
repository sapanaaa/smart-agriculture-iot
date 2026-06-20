# =============================================================
# app/core/settings.py — Centralised Configuration
# =============================================================

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # ── FastAPI ───────────────────────────────────────────────
    APP_HOST:    str  = "0.0.0.0"
    APP_PORT:    int  = 8000
    APP_DEBUG:   bool = True
    APP_TITLE:   str  = "Smart Agriculture API"
    APP_VERSION: str  = "2.0.0"

    # ── MQTT ──────────────────────────────────────────────────
    MQTT_BROKER_HOST:       str = "localhost"
    MQTT_BROKER_PORT:       int = 1883
    MQTT_TOPIC_SENSOR_DATA: str = "smart_agriculture/sensor_data"
    MQTT_CLIENT_ID:         str = "fastapi_backend_01"

    # ── MongoDB Atlas ─────────────────────────────────────────
    # Local fallback:  mongodb://localhost:27017
    # Atlas format:    mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
    MONGO_URI:             str = "mongodb://localhost:27017"
    MONGO_DB_NAME:         str = "agrisense"          # clean production name

    # ── Collection names (schema-organised) ──────────────────
    # Each collection name follows the pattern: <domain>_<entity>
    MONGO_COL_SENSOR_READINGS:   str = "sensor_readings"   # raw IoT telemetry
    MONGO_COL_DAILY_SUMMARIES:   str = "daily_summaries"   # pre-aggregated stats
    MONGO_COL_RECOMMENDATIONS:   str = "recommendations"   # ML prediction history
    MONGO_COL_DEVICES:           str = "devices"           # registered ESP32 devices
    MONGO_COL_ALERTS:            str = "alerts"            # threshold breach alerts

    # ── Legacy aliases (keep for backwards compatibility) ─────
    @property
    def MONGO_COLLECTION_READINGS(self) -> str:
        return self.MONGO_COL_SENSOR_READINGS

    @property
    def MONGO_COLLECTION_DAILY(self) -> str:
        return self.MONGO_COL_DAILY_SUMMARIES

    # ── Weather API (OpenWeatherMap) ──────────────────────────
    WEATHER_API_KEY:      str = ""
    WEATHER_CITY:         str = "Mahendranagar"
    WEATHER_COUNTRY_CODE: str = "NP"
    WEATHER_CACHE_TTL:    int = 600

    # ── Machine Learning ──────────────────────────────────────
    ML_MODELS_DIR:       str   = "ml/saved_models"
    ML_DATASETS_DIR:     str   = "ml/datasets"
    ML_MIN_CONFIDENCE:   float = 0.45

    # ── Gemini AI (Phase 9) ───────────────────────────────────
    GEMINI_API_KEY:      str   = ""
    # Model used for bilingual advice generation. Keep on a model that still
    # has a free tier — gemini-2.0-flash was zeroed out (429 limit:0).
    # Good free options: gemini-2.5-flash (better quality) or
    # gemini-2.5-flash-lite (higher free quota). Override via env if Google
    # rotates models again.
    GEMINI_MODEL:        str   = "gemini-2.5-flash"


# Single instance imported everywhere
settings = Settings()
