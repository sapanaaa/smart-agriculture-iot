# =============================================================
# config.py — Smart Agriculture ESP32 Configuration
# All hardware pins, WiFi credentials, and system settings
# are defined here. Never hardcode these in other files.
# =============================================================

# ── WiFi ──────────────────────────────────────────────────────
WIFI_SSID     = "Madan_DHFibernet"
WIFI_PASSWORD = "#include(conio.h)"
WIFI_TIMEOUT  = 15          # seconds to wait for connection

# ── MQTT Broker ───────────────────────────────────────────────
# Production: the EC2 Elastic IP (stable). For local testing, swap this
# for your PC's LAN IP running the broker.
MQTT_BROKER   = "13.235.169.146"   # EC2 Elastic IP
MQTT_PORT     = 1883
MQTT_CLIENT_ID = "esp32_farm_01"
MQTT_TOPIC    = "smart_agriculture/sensor_data"
# Broker authentication — must match MQTT_USERNAME / MQTT_PASSWORD in the
# server's backend/.env (and the BACKEND_ENV GitHub secret used for deploy).
MQTT_USERNAME = "agrisense_esp32"
MQTT_PASSWORD = "AgriSense_ESP32_2026"

# ── Sensor Pin Mapping (ESP32 GPIO) ───────────────────────────
# DHT22 — Digital sensor, single data wire
DHT22_PIN     = 4             # GPIO 4 (D4)

# Soil Moisture — Analog output (0–4095 on ESP32 12-bit ADC)
SOIL_MOISTURE_PIN = 34        # GPIO 34 (ADC1_CH6) — input only

# pH Sensor PH-4502C — Analog output (0–3.3V mapped to pH 0–14)
PH_PIN        = 35            # GPIO 35 (ADC1_CH7) — input only

# ── Sensor Calibration ────────────────────────────────────────
# Soil Moisture: raw ADC values (calibrate by testing dry/wet soil)
SOIL_DRY_VALUE  = 3200        # ADC reading in completely dry soil
SOIL_WET_VALUE  = 1100        # ADC reading in fully submerged sensor

# pH Calibration (PH-4502C outputs ~2.5V at pH 7.0)
# Adjust these after calibrating with known pH buffer solutions
PH_NEUTRAL_VOLTAGE = 2.5      # Voltage at pH 7.0
PH_ACID_VOLTAGE    = 3.0      # Voltage at pH 4.0 (for slope calc)

# ── Timing ────────────────────────────────────────────────────
SENSOR_READ_INTERVAL = 10     # seconds between each sensor reading
MQTT_RETRY_DELAY     = 5      # seconds before retrying failed publish

# ── System ────────────────────────────────────────────────────
DEVICE_ID     = "farm_node_01"   # unique identifier for this ESP32
DEBUG_MODE    = True             # True = print logs to serial console
