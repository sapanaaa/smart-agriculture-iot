# =============================================================
# app/services/mqtt_service.py — MQTT Subscriber Service
#
# When a message arrives from ESP32, this module now:
#   1. Parses the JSON payload
#   2. Validates it against the SensorReading Pydantic model
#   3. Stores it in an in-memory buffer (latest + rolling history)
#   4. Saves it to MongoDB via the repository (Phase 3 ✅)
#
# IMPORTANT: Paho MQTT callbacks run in a background thread, NOT
# in the asyncio event loop. To call async functions (like the
# Motor MongoDB driver) from a sync callback, we use
# asyncio.run_coroutine_threadsafe() to safely bridge the gap.
# =============================================================

import json
import asyncio
import logging
from datetime import datetime
from typing import Optional

import paho.mqtt.client as mqtt

from app.core.settings import settings
from app.models.sensor_data import SensorReading, SensorReadingResponse

logger = logging.getLogger(__name__)

# ── In-Memory Storage (still kept for instant /latest response) ─
latest_reading:  Optional[SensorReadingResponse] = None
reading_history: list[SensorReadingResponse]     = []
MAX_HISTORY = 100

# ── Event loop reference (set at startup) ─────────────────────
# Paho runs in its own thread. We capture the main asyncio loop
# here so we can schedule async MongoDB saves from that thread.
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Called from main.py lifespan to register the running event loop."""
    global _main_loop
    _main_loop = loop
    logger.info("[MQTT] Event loop registered for async DB saves.")


async def _save_to_db(response: SensorReadingResponse) -> None:
    """
    Async coroutine that saves a reading to MongoDB.
    Runs on the main asyncio event loop, scheduled from the MQTT thread.
    Import is deferred to avoid circular imports at module load time.
    """
    try:
        from app.database.repository import sensor_repository
        from app.database.mongodb import is_connected

        if not is_connected():
            logger.debug("[MQTT] MongoDB not connected — skipping DB save.")
            return

        inserted_id = await sensor_repository.save_reading(response)

        if inserted_id:
            # Update the in-memory reading with its MongoDB _id
            response.id = inserted_id
            logger.debug(f"[MQTT] Reading persisted to MongoDB: {inserted_id}")

    except Exception as e:
        logger.error(f"[MQTT] Async DB save failed: {e}")


def _on_connect(client, userdata, flags, reason_code, properties=None):
    """Subscribes to sensor topic on connect (and on every reconnect)."""
    if reason_code == 0:
        logger.info(
            f"[MQTT] Connected to broker at "
            f"{settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}"
        )
        client.subscribe(settings.MQTT_TOPIC_SENSOR_DATA)
        logger.info(f"[MQTT] Subscribed to: {settings.MQTT_TOPIC_SENSOR_DATA}")
    else:
        logger.error(f"[MQTT] Connection failed — reason code: {reason_code}")


def _on_message(client, userdata, message):
    """
    Called every time a sensor payload arrives.
    Runs in Paho's background thread — must not await directly.
    """
    global latest_reading, reading_history

    try:
        # 1. Decode raw bytes → dict
        raw_payload = message.payload.decode("utf-8")
        data_dict   = json.loads(raw_payload)
        logger.info(f"[MQTT] Message received on '{message.topic}'")

        # 2. Validate with Pydantic
        reading = SensorReading(**data_dict)

        # 3. Build response with server-side metadata
        has_errors = False
        if reading.sensor_status:
            has_errors = any(
                v == "error"
                for v in reading.sensor_status.model_dump().values()
            )

        response = SensorReadingResponse(
            **reading.model_dump(),
            received_at = datetime.utcnow(),
            has_errors  = has_errors
        )

        # 4. Update in-memory latest + rolling history
        latest_reading = response
        reading_history.append(response)
        if len(reading_history) > MAX_HISTORY:
            reading_history.pop(0)

        logger.info(
            f"[MQTT] Stored — "
            f"Temp: {response.temperature_c}°C | "
            f"Humidity: {response.humidity_pct}% | "
            f"Moisture: {response.soil_moisture_pct}% | "
            f"pH: {response.ph_value}"
        )

        # 5. Save to MongoDB (async, scheduled on main event loop)
        if _main_loop and _main_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                _save_to_db(response),
                _main_loop
            )
        else:
            logger.warning("[MQTT] No event loop available — skipping DB save.")

    except json.JSONDecodeError as e:
        logger.error(f"[MQTT] Invalid JSON payload: {e}")
    except Exception as e:
        logger.error(f"[MQTT] Failed to process message: {e}")


def _on_disconnect(client, userdata, flags, reason_code, properties=None):
    """Logs disconnection. Paho will auto-reconnect."""
    if reason_code != 0:
        logger.warning(
            f"[MQTT] Unexpected disconnect (code: {reason_code}). "
            "Paho will attempt reconnect..."
        )


class MQTTService:
    """Manages the MQTT client lifecycle."""

    def __init__(self):
        self._client: Optional[mqtt.Client] = None

    def start(self):
        """Creates client, registers callbacks, connects, starts loop thread."""
        self._client = mqtt.Client(
            client_id            = settings.MQTT_CLIENT_ID,
            callback_api_version = mqtt.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect    = _on_connect
        self._client.on_message    = _on_message
        self._client.on_disconnect = _on_disconnect

        # Authenticate when broker credentials are configured.
        if settings.MQTT_USERNAME:
            self._client.username_pw_set(
                settings.MQTT_USERNAME,
                settings.MQTT_PASSWORD or None,
            )
            logger.info(f"[MQTT] Using credentials for user '{settings.MQTT_USERNAME}'.")

        try:
            self._client.connect(
                host      = settings.MQTT_BROKER_HOST,
                port      = settings.MQTT_BROKER_PORT,
                keepalive = 60
            )
            self._client.loop_start()
            logger.info("[MQTT] Service started.")
        except Exception as e:
            logger.error(f"[MQTT] Could not connect to broker: {e}")

    def stop(self):
        """Gracefully stops the MQTT loop and disconnects."""
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            logger.info("[MQTT] Service stopped.")


# Single instance used across the application
mqtt_service = MQTTService()
