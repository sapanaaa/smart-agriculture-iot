import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
import mongomock


@pytest.fixture
def mock_mongodb():
    """Mock MongoDB client for testing"""
    return mongomock.MongoClient()


@pytest.fixture
def mock_mqtt_client():
    """Mock MQTT client for testing"""
    mock = MagicMock()
    mock.connect = MagicMock()
    mock.subscribe = MagicMock()
    mock.publish = MagicMock()
    mock.loop_start = MagicMock()
    mock.loop_stop = MagicMock()
    return mock


@pytest.fixture
def sample_sensor_reading():
    """Sample sensor reading data for tests"""
    return {
        "device_id": "ESP32_TEST_001",
        "temperature": 25.5,
        "humidity": 65.0,
        "soil_moisture": 45.0,
        "soil_ph": 6.5,
        "timestamp": "2024-05-19T10:30:00Z"
    }


@pytest.fixture
def sample_crop_input():
    """Sample crop recommendation input"""
    return {
        "N": 90,
        "P": 42,
        "K": 43,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9
    }


@pytest.fixture
def sample_fertilizer_input():
    """Sample fertilizer recommendation input"""
    return {
        "temperature": 26.0,
        "humidity": 52.0,
        "moisture": 38.0,
        "soil_type": "Sandy",
        "crop_type": "Maize",
        "nitrogen": 37,
        "potassium": 0,
        "phosphorous": 0
    }
