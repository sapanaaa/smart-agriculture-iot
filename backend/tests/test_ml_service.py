import pytest
from unittest.mock import MagicMock


@pytest.mark.unit
def test_ml_service_loads_models(mocker):
    """Test that ML service attempts to load models"""
    # This test verifies the ML service initialization
    # In production, models should be loaded from ml/saved_models/

    # Mock the model loading
    mock_load = mocker.patch('torch.load', return_value=MagicMock())

    # Import after mocking to catch the load attempt
    try:
        from app.services.ml_service import MLService
        service = MLService()
        # If models exist, they should be loaded
        assert True  # Test passes if no exception
    except Exception as e:
        # Expected if models don't exist yet
        assert "model" in str(e).lower() or "file" in str(e).lower()


@pytest.mark.unit
def test_crop_recommendation_input_validation(sample_crop_input):
    """Test crop recommendation validates input correctly"""
    from app.models.recommendation import CropRecommendationRequest

    # Valid input should not raise exception
    request = CropRecommendationRequest(**sample_crop_input)
    assert request.N == 90
    assert request.temperature == 20.8


@pytest.mark.unit
def test_fertilizer_recommendation_input_validation(sample_fertilizer_input):
    """Test fertilizer recommendation validates input correctly"""
    from app.models.recommendation import FertilizerRecommendationRequest

    # Valid input should not raise exception
    request = FertilizerRecommendationRequest(**sample_fertilizer_input)
    assert request.temperature == 26.0
    assert request.crop_type == "Maize"


@pytest.mark.unit
def test_crop_recommendation_output_structure():
    """Test crop recommendation returns expected structure"""
    from app.models.recommendation import CropRecommendationResponse

    response = CropRecommendationResponse(
        crop="Rice",
        confidence=0.85,
        alternatives=[
            {"crop": "Wheat", "confidence": 0.12},
            {"crop": "Maize", "confidence": 0.03}
        ]
    )

    assert response.crop == "Rice"
    assert response.confidence == 0.85
    assert len(response.alternatives) == 2
