# =============================================================
# app/models/recommendation.py — Weather & ML Response Schemas
# =============================================================

from pydantic import BaseModel, Field
from typing import Optional


# ── Weather Models ────────────────────────────────────────────

class WeatherResponse(BaseModel):
    """Current weather data returned by GET /api/weather/current"""
    city:                 str
    country:              str
    temperature_c:        float
    feels_like_c:         float
    temp_min_c:           float
    temp_max_c:           float
    humidity_pct:         float
    pressure_hpa:         float
    wind_speed_ms:        float
    cloudiness_pct:       int
    rainfall_1h_mm:       float
    rainfall_3h_mm:       float
    rainfall_monthly_mm:  float
    condition_main:       str
    condition_desc:       str
    condition_icon:       str
    fetched_at:           float


# ── Recommendation Request Models ────────────────────────────

class CropRecommendationRequest(BaseModel):
    """
    Input for crop recommendation.
    NPK values can be provided manually or fetched from sensor (future NPK sensor).
    Weather fields are auto-filled from WeatherService if not provided.
    """
    # All optional — auto-filled from live sensors / weather / NPK defaults
    # when omitted (Live Sensor mode sends an empty body). Manual mode supplies them.
    nitrogen:    Optional[float] = Field(None, ge=0,  le=200, description="Nitrogen (kg/ha)")
    phosphorus:  Optional[float] = Field(None, ge=0,  le=200, description="Phosphorus (kg/ha)")
    potassium:   Optional[float] = Field(None, ge=0,  le=200, description="Potassium (kg/ha)")
    ph:          Optional[float] = Field(None, ge=0,  le=14,  description="Soil pH")

    # Optional — auto-filled from live sensors/weather if omitted
    temperature: Optional[float] = Field(None, ge=-10, le=60)
    humidity:    Optional[float] = Field(None, ge=0,   le=100)
    rainfall:    Optional[float] = Field(None, ge=0,   le=500,
                                         description="Monthly rainfall (mm)")

    class Config:
        json_schema_extra = {
            "example": {
                "nitrogen": 90, "phosphorus": 42, "potassium": 43,
                "ph": 6.5, "temperature": 28.0,
                "humidity": 82.0, "rainfall": 202.9
            }
        }


class FertilizerRecommendationRequest(BaseModel):
    """Input for fertilizer recommendation."""
    # Optional — auto-filled with sensible defaults in Live Sensor mode
    # (no NPK sensor yet). Manual mode supplies real values.
    nitrogen:    Optional[float] = Field(None, ge=0, le=200)
    phosphorus:  Optional[float] = Field(None, ge=0, le=200)
    potassium:   Optional[float] = Field(None, ge=0, le=200)
    soil_type:   Optional[str]   = Field("Loamy", description="Sandy | Loamy | Black | Red | Clayey")
    crop_type:   Optional[str]   = Field("Wheat", description="e.g. Wheat, Rice, Maize, Cotton")

    # Auto-filled from live sensors if omitted
    temperature: Optional[float] = Field(None, ge=-10, le=60)
    humidity:    Optional[float] = Field(None, ge=0,   le=100)
    moisture:    Optional[float] = Field(None, ge=0,   le=100,
                                         description="Soil moisture (%)")

    class Config:
        json_schema_extra = {
            "example": {
                "nitrogen": 37, "phosphorus": 0, "potassium": 0,
                "soil_type": "Sandy", "crop_type": "Maize",
                "temperature": 26.0, "humidity": 52.0, "moisture": 38.0
            }
        }


class IrrigationRecommendationRequest(BaseModel):
    """
    Input for irrigation recommendation.
    All fields auto-filled from live sensor + weather data if not provided.
    """
    soil_moisture: Optional[float] = Field(None, ge=0,  le=100)
    temperature:   Optional[float] = Field(None, ge=-10, le=60)
    humidity:      Optional[float] = Field(None, ge=0,  le=100)
    ph:            Optional[float] = Field(None, ge=0,  le=14)
    rainfall_mm:   Optional[float] = Field(None, ge=0,  le=500)
    crop_type:     Optional[str]   = Field("Wheat", description="Crop type for crop-aware mode")
    growth_stage:  Optional[str]   = Field("mid_season", description="Growth stage")
    crop_aware:    bool             = Field(False, description="Use crop-recommendation output to inform irrigation")


# ── Recommendation Response Models ───────────────────────────

class TopPrediction(BaseModel):
    label:       str
    probability: float


class CropRecommendationResponse(BaseModel):
    crop:           str
    confidence:     float
    confidence_pct: str
    top_3_crops:    list[TopPrediction]
    advice:         str
    input_used:     dict
    weather_used:   bool = False


class FertilizerRecommendationResponse(BaseModel):
    fertilizer:       str
    confidence:       float
    confidence_pct:   str
    top_3_fertilizers: list[TopPrediction]
    advice:           str
    npk_status:       dict
    input_used:       dict
    weather_used:     bool = False


class IrrigationRecommendationResponse(BaseModel):
    action:          str
    confidence:      float
    confidence_pct:  str
    advice:          str
    water_amount_mm: Optional[float]
    urgency:         str
    input_used:      dict
    weather_used:    bool = False


# ── Soil Fertility Models ─────────────────────────────────────

class SoilFertilityRequest(BaseModel):
    nitrogen:   float          = Field(60.0, ge=0,   le=200, description="Nitrogen (kg/ha)")
    phosphorus: float          = Field(40.0, ge=0,   le=150, description="Phosphorus (kg/ha)")
    potassium:  float          = Field(40.0, ge=0,   le=250, description="Potassium (kg/ha)")
    # Accept the full 0-14 pH scale (consistent with crop/irrigation requests).
    # Raw/uncalibrated sensors can report values outside the typical soil range
    # (3.5-9); rejecting them with a 422 would break the whole report flow.
    ph:         float          = Field(6.5,  ge=0,   le=14,  description="Soil pH")
    moisture:   Optional[float] = Field(None, ge=0,  le=100, description="Soil moisture %. Auto-filled from sensor if None.")
    explain:    bool            = Field(False, description="Include LIME feature importance explanation")


class SoilFertilityResponse(BaseModel):
    fertility_class: str
    confidence:      float
    confidence_pct:  str
    class_probs:     dict
    advice:          str
    explanation:     Optional[dict] = None
    input_used:      dict


class ExplainRequest(BaseModel):
    model_type:  str   = Field(..., description="'fertilizer' or 'soil'")
    nitrogen:    float = Field(60.0)
    phosphorus:  float = Field(40.0)
    potassium:   float = Field(40.0)
    ph:          float = Field(6.5)
    moisture:    float = Field(50.0)
    temperature: float = Field(25.0)
    humidity:    float = Field(60.0)
    soil_type:   str   = Field("Loamy")
    crop_type:   str   = Field("Wheat")


class FullRecommendationResponse(BaseModel):
    """
    Combined response from GET /api/recommend/full
    Runs all four models in one call using latest sensor + weather data.
    This is the primary endpoint for the farmer dashboard.
    """
    sensor_data_used:  Optional[dict]
    weather_data_used: Optional[dict]
    crop:              Optional[CropRecommendationResponse]
    fertilizer:        Optional[FertilizerRecommendationResponse]
    irrigation:        Optional[IrrigationRecommendationResponse]
    soil:              Optional[SoilFertilityResponse] = None
    ml_ready:          bool
    weather_available: bool
    warnings:          list[str] = []


# ── Complete Report (2-step guided workflow) ──────────────────

class CompleteReportRequest(BaseModel):
    """
    Input for POST /api/recommend/complete — Step 2 of the guided workflow.
    Farmer has already confirmed a crop in Step 1; this generates the full report.
    All sensor fields are optional — fall back to live sensor / weather / defaults.
    """
    confirmed_crop:   str
    crop_confidence:  Optional[float] = None
    crop_top_3:       Optional[list]  = None
    nitrogen:         Optional[float] = Field(None, ge=0,   le=200)
    phosphorus:       Optional[float] = Field(None, ge=0,   le=200)
    potassium:        Optional[float] = Field(None, ge=0,   le=250)
    temperature:      Optional[float] = Field(None, ge=-10, le=60)
    humidity:         Optional[float] = Field(None, ge=0,   le=100)
    # Full 0-14 pH scale — consistent with the other recommendation requests
    # so live (possibly uncalibrated) sensor pH never 422s the report.
    ph:               Optional[float] = Field(None, ge=0,   le=14)
    rainfall:         Optional[float] = Field(None, ge=0,   le=500)
    soil_moisture:    Optional[float] = Field(None, ge=0,   le=100)
    soil_type:        Optional[str]   = "Loamy"


class SectionAdvice(BaseModel):
    advice_en: str
    advice_np: str
    source:    str  # "gemini" | "template"


class CompleteReportResponse(BaseModel):
    """
    Full 4-section report returned by POST /api/recommend/complete.
    Includes ML predictions + Gemini advice for all 4 sections + report_id for history.
    """
    report_id:       str
    confirmed_crop:  str
    crop_confidence: Optional[float]
    crop_top_3:      Optional[list]
    fertilizer:      dict
    irrigation:      dict
    soil:            dict
    advice:          dict   # keys: crop, fertilizer, irrigation, soil → SectionAdvice
    sensor_data_used: dict
    generated_at:    str
