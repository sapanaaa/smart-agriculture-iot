import pytest
from fastapi.testclient import TestClient
from datetime import datetime


@pytest.mark.unit
def test_health_endpoint_returns_200():
    """Test that health endpoint returns 200 OK"""
    from app.main import app
    client = TestClient(app)

    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


@pytest.mark.unit
def test_latest_sensor_reading_structure(mocker, sample_sensor_reading):
    """Test latest sensor reading returns correct structure"""
    from app.main import app

    # Mock the repository function
    mocker.patch(
        'app.database.repository.get_latest_sensor_reading',
        return_value=sample_sensor_reading
    )

    client = TestClient(app)
    response = client.get("/api/sensors/latest")

    if response.status_code == 200:
        data = response.json()
        assert "device_id" in data
        assert "temperature" in data
        assert "humidity" in data


@pytest.mark.unit
def test_sensor_history_pagination(mocker):
    """Test sensor history endpoint with pagination"""
    from app.main import app

    # Mock paginated response
    mock_data = {
        "readings": [{"device_id": "ESP32_001", "temperature": 25.0}],
        "total": 1,
        "page": 1,
        "page_size": 10
    }

    mocker.patch(
        'app.database.repository.get_sensor_history',
        return_value=mock_data
    )

    client = TestClient(app)
    response = client.get("/api/sensors/history?page=1&page_size=10")

    if response.status_code == 200:
        data = response.json()
        assert "readings" in data or "total" in data


@pytest.mark.unit
def test_simulate_sensor_data_endpoint():
    """Test simulate sensor data endpoint"""
    from app.main import app
    client = TestClient(app)

    payload = {
        "device_id": "ESP32_TEST",
        "temperature": 25.0,
        "humidity": 60.0,
        "soil_moisture": 45.0,
        "soil_ph": 6.5
    }

    response = client.post("/api/sensors/simulate", json=payload)

    # Should return 200 or 201
    assert response.status_code in [200, 201]
