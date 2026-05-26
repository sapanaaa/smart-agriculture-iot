# =============================================================
# app/routes/recommendation_routes.py — ML Recommendation API
#
# Endpoints:
#   GET  /api/recommend/full          → all 4 recommendations at once
#                                       (uses live sensor + weather data)
#   POST /api/recommend/crop          → crop recommendation Step 1 (manual input)
#   POST /api/recommend/complete      → Step 2: full report (fertilizer + irrigation +
#                                       soil + Gemini advice) after crop confirmed
#   POST /api/recommend/fertilizer    → fertilizer recommendation
#   POST /api/recommend/irrigation    → irrigation recommendation (crop-aware)
#   GET  /api/recommend/status        → ML models load status
#   POST /api/recommend/soil          → soil fertility analysis (Low/Med/High)
#   POST /api/recommend/explain       → LIME XAI explanation
# =============================================================

import logging
from fastapi import APIRouter, HTTPException
from typing import Optional

from app.services.ml_service      import ml_service
from app.services.weather_service import weather_service
from app.services                 import mqtt_service as mqtt_module
from app.models.recommendation import (
    CropRecommendationRequest,
    CropRecommendationResponse,
    FertilizerRecommendationRequest,
    FertilizerRecommendationResponse,
    IrrigationRecommendationRequest,
    IrrigationRecommendationResponse,
    FullRecommendationResponse,
    TopPrediction,
    SoilFertilityRequest,
    SoilFertilityResponse,
    ExplainRequest,
    CompleteReportRequest,
    CompleteReportResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recommend", tags=["ML Recommendations"])


# ── Helpers ───────────────────────────────────────────────────

def _require_ml():
    """Raises 503 if ML models are not loaded yet."""
    if not ml_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail=(
                "ML models not loaded. "
                "Run: python ml/train_models.py — then restart the server."
            )
        )


def _format_crop(result) -> CropRecommendationResponse:
    return CropRecommendationResponse(
        crop           = result.crop,
        confidence     = result.confidence,
        confidence_pct = f"{result.confidence * 100:.1f}%",
        top_3_crops    = [
            TopPrediction(label=c, probability=p) for c, p in result.top_3
        ],
        advice       = result.advice,
        input_used   = result.input_features,
        weather_used = result.input_features.get("rainfall_mm") is not None,
    )


def _format_fertilizer(result) -> FertilizerRecommendationResponse:
    return FertilizerRecommendationResponse(
        fertilizer         = result.fertilizer,
        confidence         = result.confidence,
        confidence_pct     = f"{result.confidence * 100:.1f}%",
        top_3_fertilizers  = [
            TopPrediction(label=f, probability=p) for f, p in result.top_3
        ],
        advice       = result.advice,
        npk_status   = result.npk_status,
        input_used   = result.input_features,
        weather_used = True,
    )


def _format_irrigation(result) -> IrrigationRecommendationResponse:
    return IrrigationRecommendationResponse(
        action          = result.action,
        confidence      = result.confidence,
        confidence_pct  = f"{result.confidence * 100:.1f}%",
        advice          = result.advice,
        water_amount_mm = result.water_amount_mm,
        urgency         = result.urgency,
        input_used      = result.input_features,
        weather_used    = result.input_features.get("rainfall_mm", 0) > 0,
    )


def _format_soil(result) -> SoilFertilityResponse:
    return SoilFertilityResponse(
        fertility_class = result.fertility_class,
        confidence      = result.confidence,
        confidence_pct  = f"{result.confidence * 100:.1f}%",
        class_probs     = result.class_probs,
        advice          = result.advice,
        explanation     = result.explanation,
        input_used      = result.input_features,
    )


# ── Routes ────────────────────────────────────────────────────

@router.get(
    "/full",
    response_model=FullRecommendationResponse,
    summary="Run all 3 ML recommendations using live sensor + weather data"
)
async def get_full_recommendation():
    """
    The primary endpoint for the farmer dashboard.

    Automatically pulls:
      - Latest sensor readings (temperature, humidity, soil moisture, pH)
      - Current weather data (temperature, humidity, rainfall)

    Then runs all three ML models and returns combined recommendations.

    Note: NPK values default to moderate levels if no NPK sensor is
    connected yet. Add NPK sensor in Phase 5 hardware upgrade.
    """
    _require_ml()

    warnings     = []
    sensor_dict  = None
    weather_dict = None

    # ── 1. Get latest sensor reading ──────────────────────────
    latest = mqtt_module.latest_reading
    if latest is None:
        warnings.append(
            "No live sensor data available. "
            "Using default values for sensor fields."
        )

    # ── 2. Get weather data ───────────────────────────────────
    weather = await weather_service.get_current_weather()
    if weather is None:
        warnings.append(
            "Weather API not configured or unavailable. "
            "Using default rainfall value. "
            "Add WEATHER_API_KEY to .env for better recommendations."
        )

    # ── 3. Build unified feature values ──────────────────────
    # Sensor values — fall back to safe defaults if no reading
    temperature_c     = (latest.temperature_c    or 25.0) if latest else 25.0
    humidity_pct      = (latest.humidity_pct     or 60.0) if latest else 60.0
    soil_moisture_pct = (latest.soil_moisture_pct or 50.0) if latest else 50.0
    ph_value          = (latest.ph_value         or 6.5)  if latest else 6.5

    # Weather values — fall back to safe defaults
    weather_temp     = weather.temperature_c     if weather else temperature_c
    weather_humidity = weather.humidity_pct      if weather else humidity_pct
    rainfall_mm      = weather.rainfall_monthly_mm if weather else 100.0

    # NPK defaults (used until NPK sensor is added)
    # These are typical moderate fertility values
    nitrogen   = 60.0
    phosphorus = 40.0
    potassium  = 40.0

    if latest:
        sensor_dict = {
            "temperature_c":     temperature_c,
            "humidity_pct":      humidity_pct,
            "soil_moisture_pct": soil_moisture_pct,
            "ph_value":          ph_value,
        }

    if weather:
        weather_dict = weather.to_dict()

    # ── 4. Run all four ML models ─────────────────────────────

    # Crop recommendation — uses weather temp/humidity/rainfall
    crop_result = ml_service.predict_crop(
        nitrogen    = nitrogen,
        phosphorus  = phosphorus,
        potassium   = potassium,
        temperature = weather_temp,
        humidity    = weather_humidity,
        ph          = ph_value,
        rainfall    = rainfall_mm,
    )

    # Fertilizer recommendation — uses sensor moisture + weather
    fert_result = ml_service.predict_fertilizer(
        temperature = weather_temp,
        humidity    = weather_humidity,
        moisture    = soil_moisture_pct,
        soil_type   = "Loamy",      # default — user can override via POST endpoint
        crop_type   = "Wheat",      # default — user can override via POST endpoint
        nitrogen    = nitrogen,
        potassium   = potassium,
        phosphorus  = phosphorus,
    )

    # Soil fertility — uses same NPK + sensor data
    soil_result = ml_service.predict_soil_fertility(
        nitrogen   = nitrogen,
        phosphorus = phosphorus,
        potassium  = potassium,
        ph         = ph_value,
        moisture   = soil_moisture_pct,
    )

    # Irrigation — crop-aware using crop recommendation output
    best_crop = crop_result.crop if crop_result else "Wheat"
    irrig_result = ml_service.predict_irrigation(
        soil_moisture = soil_moisture_pct,
        temperature   = temperature_c,
        humidity      = humidity_pct,
        ph            = ph_value,
        rainfall_mm   = rainfall_mm,
        crop_type     = best_crop,
        growth_stage  = "mid_season",
        crop_aware    = True,
    )

    return FullRecommendationResponse(
        sensor_data_used  = sensor_dict,
        weather_data_used = weather_dict,
        crop              = _format_crop(crop_result)        if crop_result  else None,
        fertilizer        = _format_fertilizer(fert_result)  if fert_result  else None,
        irrigation        = _format_irrigation(irrig_result) if irrig_result else None,
        soil              = _format_soil(soil_result)        if soil_result  else None,
        ml_ready          = ml_service.is_ready(),
        weather_available = weather is not None,
        warnings          = warnings,
    )


@router.post(
    "/crop",
    response_model=CropRecommendationResponse,
    summary="Get crop recommendation with custom NPK input"
)
async def recommend_crop(request: CropRecommendationRequest):
    """
    Recommends the best crop based on soil NPK, pH, and weather.
    Temperature, humidity, and rainfall auto-filled from live data
    if not provided in the request body.
    """
    _require_ml()

    # Auto-fill from sensors/weather if not provided
    weather = await weather_service.get_current_weather()
    latest  = mqtt_module.latest_reading

    temperature = request.temperature
    humidity    = request.humidity
    rainfall    = request.rainfall

    if temperature is None:
        temperature = (
            weather.temperature_c if weather
            else (latest.temperature_c if latest else 25.0)
        )
    if humidity is None:
        humidity = (
            weather.humidity_pct if weather
            else (latest.humidity_pct if latest else 60.0)
        )
    if rainfall is None:
        rainfall = weather.rainfall_monthly_mm if weather else 100.0

    result = ml_service.predict_crop(
        nitrogen    = request.nitrogen,
        phosphorus  = request.phosphorus,
        potassium   = request.potassium,
        temperature = temperature,
        humidity    = humidity,
        ph          = request.ph,
        rainfall    = rainfall,
    )

    if result is None:
        raise HTTPException(status_code=500, detail="Crop prediction failed.")

    return _format_crop(result)


@router.post(
    "/fertilizer",
    response_model=FertilizerRecommendationResponse,
    summary="Get fertilizer recommendation"
)
async def recommend_fertilizer(request: FertilizerRecommendationRequest):
    """
    Recommends the best fertilizer based on soil NPK and crop type.
    Temperature, humidity, moisture auto-filled from live sensors if not provided.
    """
    _require_ml()

    weather = await weather_service.get_current_weather()
    latest  = mqtt_module.latest_reading

    temperature = request.temperature or (
        weather.temperature_c if weather
        else (latest.temperature_c if latest else 25.0)
    )
    humidity = request.humidity or (
        weather.humidity_pct if weather
        else (latest.humidity_pct if latest else 60.0)
    )
    moisture = request.moisture or (
        latest.soil_moisture_pct if latest else 50.0
    )

    result = ml_service.predict_fertilizer(
        temperature = temperature,
        humidity    = humidity,
        moisture    = moisture,
        soil_type   = request.soil_type,
        crop_type   = request.crop_type,
        nitrogen    = request.nitrogen,
        potassium   = request.potassium,
        phosphorus  = request.phosphorus,
    )

    if result is None:
        raise HTTPException(status_code=500, detail="Fertilizer prediction failed.")

    return _format_fertilizer(result)


@router.post(
    "/irrigation",
    response_model=IrrigationRecommendationResponse,
    summary="Get irrigation recommendation"
)
async def recommend_irrigation(request: IrrigationRecommendationRequest):
    """
    Recommends irrigation action based on soil moisture and weather.
    All fields auto-filled from live sensor + weather data if not provided.
    """
    _require_ml()

    weather = await weather_service.get_current_weather()
    latest  = mqtt_module.latest_reading

    soil_moisture = request.soil_moisture or (
        latest.soil_moisture_pct if latest else 50.0
    )
    temperature = request.temperature or (
        latest.temperature_c if latest else 25.0
    )
    humidity = request.humidity or (
        latest.humidity_pct if latest else 60.0
    )
    ph = request.ph or (
        latest.ph_value if latest else 6.5
    )
    rainfall_mm = request.rainfall_mm or (
        weather.rainfall_monthly_mm if weather else 50.0
    )

    result = ml_service.predict_irrigation(
        soil_moisture = soil_moisture,
        temperature   = temperature,
        humidity      = humidity,
        ph            = ph,
        rainfall_mm   = rainfall_mm,
        crop_type     = request.crop_type,
        growth_stage  = request.growth_stage,
        crop_aware    = request.crop_aware,
    )

    if result is None:
        raise HTTPException(status_code=500, detail="Irrigation prediction failed.")

    return _format_irrigation(result)


@router.get("/status", summary="Check ML models load status")
async def get_ml_status():
    """Returns which ML models are loaded and ready for inference."""
    return {
        "ml_ready":           ml_service.is_ready(),
        "swift_crop_model":   ml_service._swift_model  is not None,
        "ttl_irrigation":     ml_service._ttl_model    is not None,
        "tabnet_soil":        ml_service._soil_model   is not None,
        "tabnet_fertilizer":  ml_service._fert_model   is not None,
        "phase":              "Phase 8 — Advanced DL Models (SwiFT + TTL + TabNet×2)",
        "weather_configured": weather_service.is_configured(),
        "message": (
            "All 4 Phase 8 models ready." if ml_service.is_ready()
            else "Run: python ml/train_models.py — then restart."
        )
    }


@router.post(
    "/soil",
    response_model=SoilFertilityResponse,
    summary="Soil fertility analysis (Low/Medium/High) with optional LIME explanation"
)
async def recommend_soil(request: SoilFertilityRequest):
    """
    Classifies soil fertility using TabNet.
    Optionally returns LIME feature importance explaining the prediction.
    Moisture and pH auto-filled from live sensor if not provided.
    """
    _require_ml()

    latest = mqtt_module.latest_reading
    moisture = request.moisture
    if moisture is None:
        moisture = (latest.soil_moisture_pct if latest else 50.0)

    result = ml_service.predict_soil_fertility(
        nitrogen   = request.nitrogen,
        phosphorus = request.phosphorus,
        potassium  = request.potassium,
        ph         = request.ph,
        moisture   = moisture,
        explain    = request.explain,
    )
    if result is None:
        raise HTTPException(status_code=500, detail="Soil fertility prediction failed.")
    return _format_soil(result)


@router.post(
    "/complete",
    response_model=CompleteReportResponse,
    summary="Generate full 4-section report after farmer confirms crop (Step 2)"
)
async def generate_complete_report(request: CompleteReportRequest):
    """
    Step 2 of the guided ML Advisor workflow.

    Farmer has already confirmed a crop recommendation in Step 1.
    This endpoint runs fertilizer, irrigation, and soil fertility models
    using the confirmed crop, then fetches bilingual Gemini advice for all
    4 sections, saves the complete report to MongoDB, and returns the result.

    All sensor/weather fields are optional — auto-filled from live data if absent.
    """
    _require_ml()

    from app.services.advice_service import (
        get_crop_advice, get_fertilizer_advice,
        get_irrigation_advice, get_soil_advice,
    )
    from app.database.repository import repository
    from datetime import datetime as _dt

    # ── 1. Resolve sensor / weather values ──────────────────────
    weather = await weather_service.get_current_weather()
    latest  = mqtt_module.latest_reading

    def _r(manual, sensor_val, weather_val, default):
        if manual is not None:
            return manual
        if sensor_val is not None:
            return sensor_val
        if weather_val is not None:
            return weather_val
        return default

    temperature   = _r(request.temperature,   getattr(latest, "temperature_c",     None) if latest else None, getattr(weather, "temperature_c",     None) if weather else None, 25.0)
    humidity      = _r(request.humidity,      getattr(latest, "humidity_pct",      None) if latest else None, getattr(weather, "humidity_pct",      None) if weather else None, 65.0)
    soil_moisture = _r(request.soil_moisture, getattr(latest, "soil_moisture_pct", None) if latest else None, None, 50.0)
    ph            = _r(request.ph,            getattr(latest, "ph_value",          None) if latest else None, None, 6.5)
    rainfall      = _r(request.rainfall,      None, getattr(weather, "rainfall_monthly_mm", None) if weather else None, 100.0)
    nitrogen      = request.nitrogen   or 60.0
    phosphorus    = request.phosphorus or 40.0
    potassium     = request.potassium  or 40.0
    soil_type     = request.soil_type  or "Loamy"

    confirmed_crop = request.confirmed_crop

    # ── 2. Run 3 ML models with confirmed crop ───────────────────
    fert_result = ml_service.predict_fertilizer(
        temperature = temperature,
        humidity    = humidity,
        moisture    = soil_moisture,
        soil_type   = soil_type,
        crop_type   = confirmed_crop,
        nitrogen    = nitrogen,
        potassium   = potassium,
        phosphorus  = phosphorus,
    )

    irrig_result = ml_service.predict_irrigation(
        soil_moisture = soil_moisture,
        temperature   = temperature,
        humidity      = humidity,
        ph            = ph,
        rainfall_mm   = rainfall,
        crop_type     = confirmed_crop,
        growth_stage  = "mid_season",
        crop_aware    = True,
    )

    soil_result = ml_service.predict_soil_fertility(
        nitrogen   = nitrogen,
        phosphorus = phosphorus,
        potassium  = potassium,
        ph         = ph,
        moisture   = soil_moisture,
        explain    = True,
    )

    if not fert_result or not irrig_result or not soil_result:
        raise HTTPException(500, "One or more ML models failed to produce a result.")

    fert_fmt  = _format_fertilizer(fert_result)
    irrig_fmt = _format_irrigation(irrig_result)
    soil_fmt  = _format_soil(soil_result)

    # ── 3. Fetch bilingual Gemini advice for all 4 sections ──────
    crop_advice = get_crop_advice(
        crop       = confirmed_crop,
        confidence = request.crop_confidence or 0.0,
        nitrogen   = nitrogen,  phosphorus = phosphorus,
        potassium  = potassium, temperature = temperature,
        humidity   = humidity,  ph = ph, rainfall = rainfall,
    )
    fert_advice = get_fertilizer_advice(
        fertilizer = fert_result.fertilizer,
        confidence = fert_result.confidence,
        nitrogen   = nitrogen, phosphorus = phosphorus,
        potassium  = potassium,
        crop_type  = confirmed_crop,
        soil_type  = soil_type,
    )
    _urgency_to_class = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    irrig_advice = get_irrigation_advice(
        irrigation_class = _urgency_to_class.get(irrig_result.urgency, 1),
        action           = irrig_result.action,
        confidence       = irrig_result.confidence,
        soil_moisture    = soil_moisture,
        temperature      = temperature,
        crop_type        = confirmed_crop,
    )
    soil_advice = get_soil_advice(
        fertility_class = soil_result.fertility_class,
        confidence      = soil_result.confidence,
        nitrogen        = nitrogen, phosphorus = phosphorus,
        potassium       = potassium, ph = ph, moisture = soil_moisture,
    )

    advice_bundle = {
        "crop":       {"advice_en": crop_advice.advice_en,   "advice_np": crop_advice.advice_np,   "source": crop_advice.source},
        "fertilizer": {"advice_en": fert_advice.advice_en,   "advice_np": fert_advice.advice_np,   "source": fert_advice.source},
        "irrigation": {"advice_en": irrig_advice.advice_en,  "advice_np": irrig_advice.advice_np,  "source": irrig_advice.source},
        "soil":       {"advice_en": soil_advice.advice_en,   "advice_np": soil_advice.advice_np,   "source": soil_advice.source},
    }

    sensor_data_used = {
        "N": nitrogen, "P": phosphorus, "K": potassium,
        "ph": ph, "soil_moisture_pct": soil_moisture,
        "temperature_c": temperature, "humidity_pct": humidity,
        "rainfall_mm": rainfall,
    }

    generated_at = _dt.utcnow().isoformat()

    # ── 4. Save complete report to MongoDB ───────────────────────
    report_data = {
        "confirmed_crop":   confirmed_crop,
        "crop_confidence":  request.crop_confidence,
        "crop_top_3":       request.crop_top_3,
        "fertilizer":       fert_fmt.model_dump(),
        "irrigation":       irrig_fmt.model_dump(),
        "soil":             soil_fmt.model_dump(),
        "advice":           advice_bundle,
        "sensor_data_used": sensor_data_used,
        "generated_at":     generated_at,
    }
    report_id = await repository.save_full_report(report_data)
    report_id = report_id or f"AGS-LOCAL-{_dt.utcnow().strftime('%H%M%S')}"

    return CompleteReportResponse(
        report_id        = report_id,
        confirmed_crop   = confirmed_crop,
        crop_confidence  = request.crop_confidence,
        crop_top_3       = request.crop_top_3,
        fertilizer       = fert_fmt.model_dump(),
        irrigation       = irrig_fmt.model_dump(),
        soil             = soil_fmt.model_dump(),
        advice           = advice_bundle,
        sensor_data_used = sensor_data_used,
        generated_at     = generated_at,
    )


@router.post(
    "/explain",
    summary="Get LIME XAI explanation for a fertilizer or soil fertility prediction"
)
async def get_explanation(request: ExplainRequest):
    """
    Returns LIME feature importance weights showing which soil/environment
    features most influenced the recommendation. Useful for farmer transparency.
    """
    _require_ml()

    if request.model_type == "soil":
        result = ml_service.predict_soil_fertility(
            nitrogen=request.nitrogen, phosphorus=request.phosphorus,
            potassium=request.potassium, ph=request.ph,
            moisture=request.moisture, explain=True,
        )
        if result is None:
            raise HTTPException(status_code=500, detail="Soil fertility prediction failed.")
        return {
            "model": "soil_fertility",
            "prediction": result.fertility_class,
            "explanation": result.explanation,
        }

    if request.model_type == "fertilizer":
        result = ml_service.predict_fertilizer(
            temperature=request.temperature, humidity=request.humidity,
            moisture=request.moisture, soil_type=request.soil_type,
            crop_type=request.crop_type, nitrogen=request.nitrogen,
            potassium=request.potassium, phosphorus=request.phosphorus,
            explain=True,
        )
        if result is None:
            raise HTTPException(status_code=500, detail="Fertilizer prediction failed.")
        return {
            "model": "fertilizer",
            "prediction": result.fertilizer,
            "explanation": result.explanation,
        }

    raise HTTPException(status_code=400, detail="model_type must be 'fertilizer' or 'soil'")


# ── /advice — On-demand Gemini bilingual advice ───────────────

from pydantic import BaseModel as _BaseModel
from typing import Literal as _Literal, Any as _Any
from datetime import datetime as _datetime


class AdviceRequest(_BaseModel):
    advice_type: _Literal["crop", "fertilizer", "irrigation", "soil"]
    # Crop fields
    crop:        Optional[str]   = None
    confidence:  Optional[float] = None
    # Shared soil fields
    nitrogen:    Optional[float] = 60.0
    phosphorus:  Optional[float] = 40.0
    potassium:   Optional[float] = 40.0
    ph:          Optional[float] = 6.5
    moisture:    Optional[float] = 50.0
    # Climate fields
    temperature: Optional[float] = 25.0
    humidity:    Optional[float] = 65.0
    rainfall:    Optional[float] = 100.0
    # Fertilizer specific
    fertilizer:  Optional[str]   = None
    soil_type:   Optional[str]   = "Loamy"
    crop_type:   Optional[str]   = "Rice"
    # Irrigation specific
    soil_moisture:    Optional[float] = 50.0
    irrigation_class: Optional[int]   = 1
    irrigation_action: Optional[str]  = None
    # Soil fertility
    fertility_class: Optional[str] = None
    # User info for saving
    user_id: Optional[str] = None
    device_id: Optional[str] = None


@router.post("/advice", summary="On-demand bilingual advice (Gemini + offline fallback)")
async def get_advice(request: AdviceRequest):
    """
    Called ONLY when the farmer clicks 'Get Detailed Advice'.
    Returns bilingual (English + Nepali) structured advice from Gemini Flash.
    Falls back to offline templates if API is unavailable.
    """
    from app.services.advice_service import (
        get_crop_advice, get_fertilizer_advice,
        get_irrigation_advice, get_soil_advice
    )

    t = request.advice_type

    if t == "crop":
        if not request.crop:
            raise HTTPException(400, "crop field is required for crop advice")
        result = get_crop_advice(
            crop=request.crop,
            confidence=request.confidence or 0.0,
            nitrogen=request.nitrogen, phosphorus=request.phosphorus,
            potassium=request.potassium, temperature=request.temperature,
            humidity=request.humidity, ph=request.ph, rainfall=request.rainfall,
        )

    elif t == "fertilizer":
        if not request.fertilizer:
            raise HTTPException(400, "fertilizer field is required")
        result = get_fertilizer_advice(
            fertilizer=request.fertilizer,
            confidence=request.confidence or 0.0,
            nitrogen=request.nitrogen, phosphorus=request.phosphorus,
            potassium=request.potassium,
            crop_type=request.crop_type, soil_type=request.soil_type,
        )

    elif t == "irrigation":
        result = get_irrigation_advice(
            irrigation_class=request.irrigation_class or 1,
            action=request.irrigation_action or "Irrigation Recommended",
            confidence=request.confidence or 0.0,
            soil_moisture=request.soil_moisture or request.moisture,
            temperature=request.temperature,
            crop_type=request.crop_type or "Rice",
        )

    elif t == "soil":
        if not request.fertility_class:
            raise HTTPException(400, "fertility_class field is required")
        result = get_soil_advice(
            fertility_class=request.fertility_class,
            confidence=request.confidence or 0.0,
            nitrogen=request.nitrogen, phosphorus=request.phosphorus,
            potassium=request.potassium, ph=request.ph, moisture=request.moisture,
        )
    else:
        raise HTTPException(400, "Invalid advice_type")

    return {
        "advice_type": t,
        "advice_en":   result.advice_en,
        "advice_np":   result.advice_np,
        "source":      result.source,
        "generated_at": _datetime.utcnow().isoformat(),
    }


# ── /history — Recommendation history (RBAC) ─────────────────

from fastapi import Query as _Query


@router.get("/history", summary="Get recommendation history (per-user or all for admin)")
async def get_recommendation_history(
    user_id:  Optional[str] = _Query(None, description="Filter by user_id"),
    page:     int           = _Query(1, ge=1),
    per_page: int           = _Query(20, ge=1, le=100),
):
    """
    Returns paginated recommendation history from MongoDB.
    - Regular user: pass their own user_id to see their history.
    - Admin: omit user_id to see all history.
    RBAC is enforced at the frontend via JWT role check.
    """
    try:
        from app.database.repository import repository
        skip = (page - 1) * per_page

        query: dict = {}
        if user_id:
            query["user_id"] = user_id

        records = await repository.get_recommendation_history(
            query=query, skip=skip, limit=per_page
        )
        total = await repository.count_recommendations(query=query)

        return {
            "page":     page,
            "per_page": per_page,
            "total":    total,
            "records":  records,
        }
    except Exception as e:
        logger.error(f"[History] Failed: {e}")
        raise HTTPException(500, f"History fetch failed: {e}")


@router.get("/history/{report_id}", summary="Get a single recommendation report by ID")
async def get_recommendation_by_id(report_id: str):
    """Returns one recommendation record by report_id (AGS-YYYYMMDD-XXXX format)."""
    try:
        from app.database.repository import repository
        record = await repository.get_recommendation_by_report_id(report_id)
        if record is None:
            raise HTTPException(404, f"Report {report_id} not found")
        return record
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[History] get_by_id failed: {e}")
        raise HTTPException(500, str(e))


# ── /report — PDF generation ──────────────────────────────────

class ReportRequest(_BaseModel):
    report_id:   Optional[str] = None
    farmer_name: Optional[str] = "Farmer"
    device_id:   Optional[str] = None
    district:    Optional[str] = None
    region:      Optional[str] = None
    crop:        Optional[str] = None
    fertilizer:  Optional[str] = None
    soil_class:  Optional[str] = None
    irrigation:  Optional[str] = None
    advice_en:   Optional[str] = None
    advice_np:   Optional[str] = None
    input_data:  Optional[dict] = None
    language:    _Literal["en", "np", "both"] = "both"


from fastapi.responses import StreamingResponse as _StreamingResponse
import io as _io


@router.post("/report", summary="Generate PDF farm report (xhtml2pdf)")
async def generate_report(request: ReportRequest):
    """
    Generates a professional bilingual PDF farm report.
    Returns binary PDF stream for direct browser download.
    """
    try:
        from app.services.pdf_service import generate_pdf
        pdf_bytes = await generate_pdf(request.dict())
        return _StreamingResponse(
            _io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="SmartAgri_Report_{request.report_id or "farm"}.pdf"'
                )
            }
        )
    except Exception as e:
        logger.error(f"[PDF] Generation failed: {e}")
        raise HTTPException(500, f"PDF generation failed: {e}")
