# =============================================================
# app/services/advice_service.py
# On-demand Gemini 2.0 Flash bilingual advice generator.
# Falls back to offline templates when API is unavailable.
# Called ONLY when farmer clicks "Get Detailed Advice".
# =============================================================

import logging
import os
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


def _get_model() -> str:
    """Resolve the Gemini model name from settings/env, with a safe default."""
    try:
        from app.core.settings import settings
        return getattr(settings, "GEMINI_MODEL", None) or "gemini-2.5-flash"
    except Exception:
        return os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


@dataclass
class AdviceResult:
    advice_en:  str
    advice_np:  str
    source:     str  # "gemini" | "template"
    crop:       Optional[str] = None
    fertilizer: Optional[str] = None
    soil:       Optional[str] = None
    irrigation: Optional[int] = None


def _get_api_key() -> Optional[str]:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        try:
            from app.core.settings import settings
            key = getattr(settings, "GEMINI_API_KEY", "")
        except Exception:
            pass
    return key or None


def _call_gemini(prompt_en: str, prompt_np: str) -> Optional[tuple[str, str]]:
    """Call Gemini Flash API. Returns (english, nepali) text or None on failure."""
    api_key = _get_api_key()
    if not api_key:
        logger.info("[Advice] No GEMINI_API_KEY configured, using templates.")
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        model = _get_model()
        resp_en = client.models.generate_content(model=model, contents=prompt_en)
        resp_np = client.models.generate_content(model=model, contents=prompt_np)

        en = (resp_en.text or "").strip()
        np_text = (resp_np.text or "").strip()

        if en and np_text:
            return en, np_text
        return None
    except Exception as e:
        logger.warning(f"[Advice] Gemini API failed: {e}. Falling back to templates.")
        return None


# ── Crop Advice ───────────────────────────────────────────────

def get_crop_advice(
    crop: str,
    confidence: float,
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    temperature: float,
    humidity: float,
    ph: float,
    rainfall: float,
) -> AdviceResult:
    from app.services.advice_templates import CROP_ADVICE_EN, CROP_ADVICE_NP

    prompt_en = (
        f"You are an agricultural expert advising a farmer in Nepal. "
        f"The AI crop recommendation system has predicted {crop.upper()} with {confidence*100:.1f}% confidence "
        f"based on these soil/climate conditions: "
        f"Nitrogen={nitrogen:.0f} mg/kg, Phosphorus={phosphorus:.0f} mg/kg, "
        f"Potassium={potassium:.0f} mg/kg, Temperature={temperature:.1f}°C, "
        f"Humidity={humidity:.0f}%, pH={ph:.1f}, Rainfall={rainfall:.0f} mm/year. "
        f"Provide practical, specific farming advice for growing {crop} in Nepal's Terai or mid-hills region. "
        f"Include: best sowing/planting time (months), soil preparation tips, "
        f"fertilizer schedule, irrigation guidance, and one key pest/disease to watch for. "
        f"Keep it concise (150-200 words). Write in professional but easy-to-understand English."
    )

    prompt_np = (
        f"तपाईं नेपालका किसानलाई सल्लाह दिने कृषि विशेषज्ञ हुनुहुन्छ। "
        f"एआई प्रणालीले यी माटो/जलवायु अवस्थाहरूको आधारमा {crop.upper()} सिफारिस गरेको छ: "
        f"नाइट्रोजन={nitrogen:.0f}, फस्फोरस={phosphorus:.0f}, "
        f"पोटासियम={potassium:.0f}, तापक्रम={temperature:.1f}°C, "
        f"आर्द्रता={humidity:.0f}%, पीएच={ph:.1f}, वर्षा={rainfall:.0f} मिमि/वर्ष। "
        f"नेपालमा {crop} उगाउनका लागि व्यावहारिक सल्लाह दिनुहोस्। "
        f"रोप्ने समय, माटो तयारी, मलखाद तालिका, सिँचाई र एउटा मुख्य रोग/किरा समावेश गर्नुहोस्। "
        f"सरल नेपाली भाषामा (१५०-२०० शब्द) लेख्नुहोस्।"
    )

    result = _call_gemini(prompt_en, prompt_np)
    if result:
        return AdviceResult(
            advice_en=result[0], advice_np=result[1],
            source="gemini", crop=crop
        )

    # Fallback to templates
    en = CROP_ADVICE_EN.get(crop.lower(),
        f"Ensure proper soil management for {crop} cultivation. "
        f"Contact your local Krishi Karyalaya for region-specific guidance.")
    np_text = CROP_ADVICE_NP.get(crop.lower(),
        f"{crop} खेतीका लागि उचित माटो व्यवस्थापन सुनिश्चित गर्नुहोस्। "
        f"क्षेत्र-विशेष मार्गदर्शनका लागि स्थानीय कृषि कार्यालयमा सम्पर्क गर्नुहोस्।")
    return AdviceResult(advice_en=en, advice_np=np_text, source="template", crop=crop)


# ── Fertilizer Advice ─────────────────────────────────────────

def get_fertilizer_advice(
    fertilizer: str,
    confidence: float,
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    crop_type: str,
    soil_type: str,
) -> AdviceResult:
    from app.services.advice_templates import FERTILIZER_ADVICE_EN, FERTILIZER_ADVICE_NP

    prompt_en = (
        f"You are an agricultural expert advising a farmer in Nepal. "
        f"The AI system recommends {fertilizer} fertilizer ({confidence*100:.1f}% confidence) "
        f"for {crop_type} growing in {soil_type} soil. "
        f"Current soil nutrients: N={nitrogen:.0f}, P={phosphorus:.0f}, K={potassium:.0f} mg/kg. "
        f"Provide practical advice on: exact application rate (kg/ha) for Nepal conditions, "
        f"timing (when to apply relative to crop growth stage), method of application, "
        f"and what results the farmer should expect. "
        f"Keep it concise (120-150 words). Focus on {fertilizer} specifically."
    )

    prompt_np = (
        f"तपाईं नेपालका किसानलाई सल्लाह दिने कृषि विशेषज्ञ हुनुहुन्छ। "
        f"एआई प्रणालीले {soil_type} माटोमा {crop_type} बालीका लागि {fertilizer} मल सिफारिस गरेको छ। "
        f"वर्तमान माटो पोषक तत्व: N={nitrogen:.0f}, P={phosphorus:.0f}, K={potassium:.0f}। "
        f"व्यावहारिक सल्लाह दिनुहोस्: नेपाल अवस्थाका लागि सही मात्रा (किग्रा/हेक्टर), "
        f"कहिले र कसरी प्रयोग गर्ने, र के नतिजा अपेक्षा गर्ने। "
        f"सरल नेपाली भाषामा (१२०-१५० शब्द) लेख्नुहोस्।"
    )

    result = _call_gemini(prompt_en, prompt_np)
    if result:
        return AdviceResult(
            advice_en=result[0], advice_np=result[1],
            source="gemini", fertilizer=fertilizer
        )

    en = FERTILIZER_ADVICE_EN.get(fertilizer,
        f"Apply {fertilizer} as recommended by your local Krishi Karyalaya.")
    np_text = FERTILIZER_ADVICE_NP.get(fertilizer,
        f"स्थानीय कृषि कार्यालयको सिफारिस अनुसार {fertilizer} प्रयोग गर्नुहोस्।")
    return AdviceResult(advice_en=en, advice_np=np_text, source="template", fertilizer=fertilizer)


# ── Irrigation Advice ─────────────────────────────────────────

def get_irrigation_advice(
    irrigation_class: int,
    action: str,
    confidence: float,
    soil_moisture: float,
    temperature: float,
    crop_type: str,
) -> AdviceResult:
    from app.services.advice_templates import IRRIGATION_ADVICE_EN, IRRIGATION_ADVICE_NP

    prompt_en = (
        f"You are an agricultural expert advising a farmer in Nepal. "
        f"The AI irrigation system recommends: '{action}' ({confidence*100:.1f}% confidence). "
        f"Conditions: soil moisture={soil_moisture:.1f}%, temperature={temperature:.1f}°C, "
        f"crop={crop_type}. "
        f"Provide practical irrigation advice specific to Nepal: "
        f"exact water amount (mm), best time of day, method, and what to watch for after irrigating. "
        f"Keep it concise (100-130 words)."
    )

    prompt_np = (
        f"तपाईं नेपालका किसानलाई सल्लाह दिने कृषि विशेषज्ञ हुनुहुन्छ। "
        f"एआई सिँचाई प्रणालीको सिफारिस: '{action}'। "
        f"अवस्था: माटो आर्द्रता={soil_moisture:.1f}%, तापक्रम={temperature:.1f}°C, "
        f"बाली={crop_type}। "
        f"नेपाल-विशेष व्यावहारिक सिँचाई सल्लाह दिनुहोस्: "
        f"पानीको मात्रा (मिमि), सबैभन्दा राम्रो समय, विधि र सिँचाईपछि के गर्ने। "
        f"सरल नेपाली भाषामा (१००-१३० शब्द) लेख्नुहोस्।"
    )

    result = _call_gemini(prompt_en, prompt_np)
    if result:
        return AdviceResult(
            advice_en=result[0], advice_np=result[1],
            source="gemini", irrigation=irrigation_class
        )

    en = IRRIGATION_ADVICE_EN.get(irrigation_class,
        "Monitor soil moisture and irrigate as needed.")
    np_text = IRRIGATION_ADVICE_NP.get(irrigation_class,
        "माटोको आर्द्रता अनुगमन गर्नुहोस् र आवश्यकता अनुसार सिँचाई गर्नुहोस्।")
    return AdviceResult(advice_en=en, advice_np=np_text, source="template", irrigation=irrigation_class)


# ── Soil Fertility Advice ─────────────────────────────────────

def get_soil_advice(
    fertility_class: str,
    confidence: float,
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    ph: float,
    moisture: float,
) -> AdviceResult:
    from app.services.advice_templates import SOIL_ADVICE_EN, SOIL_ADVICE_NP

    prompt_en = (
        f"You are a soil scientist advising a farmer in Nepal. "
        f"The AI soil analysis shows {fertility_class.upper()} fertility ({confidence*100:.1f}% confidence). "
        f"Soil values: N={nitrogen:.0f}, P={phosphorus:.0f}, K={potassium:.0f} mg/kg, "
        f"pH={ph:.1f}, moisture={moisture:.1f}%. "
        f"Provide practical soil improvement advice for Nepal agriculture: "
        f"specific organic amendments, fertilizer adjustments, and one management practice. "
        f"Keep it concise (120-150 words). Reference Nepal-available inputs."
    )

    prompt_np = (
        f"तपाईं नेपालका किसानलाई सल्लाह दिने माटो वैज्ञानिक हुनुहुन्छ। "
        f"एआई माटो विश्लेषणले {fertility_class.upper()} उर्वरता देखाएको छ। "
        f"माटो मान: N={nitrogen:.0f}, P={phosphorus:.0f}, K={potassium:.0f} mg/kg, "
        f"पीएच={ph:.1f}, आर्द्रता={moisture:.1f}%। "
        f"नेपाल कृषिका लागि व्यावहारिक माटो सुधार सल्लाह दिनुहोस्: "
        f"जैविक संशोधन, मलखाद समायोजन र एक व्यवस्थापन अभ्यास। "
        f"सरल नेपाली भाषामा (१२०-१५० शब्द) लेख्नुहोस्।"
    )

    result = _call_gemini(prompt_en, prompt_np)
    if result:
        return AdviceResult(
            advice_en=result[0], advice_np=result[1],
            source="gemini", soil=fertility_class
        )

    en = SOIL_ADVICE_EN.get(fertility_class, "Conduct a soil test for detailed analysis.")
    np_text = SOIL_ADVICE_NP.get(fertility_class, "विस्तृत विश्लेषणका लागि माटो परीक्षण गर्नुहोस्।")
    return AdviceResult(advice_en=en, advice_np=np_text, source="template", soil=fertility_class)
