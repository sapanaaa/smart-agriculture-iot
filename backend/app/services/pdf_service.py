# =============================================================
# app/services/pdf_service.py
# Generates a professional, farmer-friendly bilingual PDF farm
# report using WeasyPrint (Pango + HarfBuzz).
#
# Why WeasyPrint: it shapes Devanagari (Nepali) correctly —
# conjuncts and vowel signs render properly — and embeds the
# Noto fonts installed in the Docker image. xhtml2pdf/ReportLab
# could not do this (Nepali showed up as "tofu" boxes).
#
# The report is designed like a medical blood report: every soil
# /climate reading is shown against a healthy reference range
# with a plain-language verdict a farmer can understand at a
# glance, followed by the ML predictions and the bilingual AI
# advice.
# =============================================================

import os
import asyncio
import logging
from datetime import datetime
from typing import Optional, Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")


# =============================================================
# Reference ranges for farmer-friendly interpretation.
#
# These are GENERAL agronomic guidance bands (tunable). Each
# entry: healthy band [low, high], unit, bilingual label, and a
# bilingual one-line message for each status (low / optimal /
# high). Values outside the band get a corrective hint.
# =============================================================

_READINGS = [
    {
        "keys": ["nitrogen", "N"],
        "label_en": "Nitrogen (N)", "label_np": "नाइट्रोजन (N)",
        "unit": "mg/kg", "low": 40, "high": 120,
        "msg": {
            "low":     ("Below the healthy range — apply urea or well-rotted compost to boost leafy growth.",
                        "स्वस्थ दायराभन्दा कम — पात-हाँगाको वृद्धिका लागि युरिया वा कुहिएको कम्पोस्ट हाल्नुहोस्।"),
            "optimal": ("Within the healthy range — good for strong vegetative growth.",
                        "स्वस्थ दायरामा — बलियो वानस्पतिक वृद्धिका लागि राम्रो।"),
            "high":    ("Above the healthy range — avoid extra nitrogen to prevent excess leafy growth.",
                        "स्वस्थ दायराभन्दा बढी — बढी पात आउन नदिन थप नाइट्रोजन मल नहाल्नुहोस्।"),
        },
    },
    {
        "keys": ["phosphorus", "P"],
        "label_en": "Phosphorus (P)", "label_np": "फस्फोरस (P)",
        "unit": "mg/kg", "low": 20, "high": 80,
        "msg": {
            "low":     ("Below the healthy range — add DAP or bone meal to support roots and flowering.",
                        "स्वस्थ दायराभन्दा कम — जरा र फूलका लागि DAP वा हड्डीको धूलो हाल्नुहोस्।"),
            "optimal": ("Within the healthy range — good for root and flower development.",
                        "स्वस्थ दायरामा — जरा र फूल विकासका लागि राम्रो।"),
            "high":    ("Above the healthy range — no extra phosphorus needed.",
                        "स्वस्थ दायराभन्दा बढी — थप फस्फोरस आवश्यक छैन।"),
        },
    },
    {
        "keys": ["potassium", "K"],
        "label_en": "Potassium (K)", "label_np": "पोटासियम (K)",
        "unit": "mg/kg", "low": 20, "high": 80,
        "msg": {
            "low":     ("Below the healthy range — add MOP (muriate of potash) for disease resistance.",
                        "स्वस्थ दायराभन्दा कम — रोग प्रतिरोधका लागि MOP (पोटास) हाल्नुहोस्।"),
            "optimal": ("Within the healthy range — good for crop quality and resilience.",
                        "स्वस्थ दायरामा — बालीको गुणस्तर र सहनशीलताका लागि राम्रो।"),
            "high":    ("Above the healthy range — no extra potassium needed.",
                        "स्वस्थ दायराभन्दा बढी — थप पोटासियम आवश्यक छैन।"),
        },
    },
    {
        "keys": ["ph", "pH"],
        "label_en": "Soil pH", "label_np": "माटोको pH",
        "unit": "", "low": 6.0, "high": 7.5,
        "msg": {
            "low":     ("Soil is acidic — apply agricultural lime to raise pH towards neutral.",
                        "माटो अम्लीय छ — pH बढाउन कृषि चुन (lime) प्रयोग गर्नुहोस्।"),
            "optimal": ("Near-neutral — ideal for most crops to absorb nutrients.",
                        "लगभग उदासीन — अधिकांश बालीले पोषक तत्व लिन उपयुक्त।"),
            "high":    ("Soil is alkaline — add organic matter or gypsum to lower pH.",
                        "माटो क्षारीय छ — pH घटाउन प्राङ्गारिक पदार्थ वा जिप्सम हाल्नुहोस्।"),
        },
    },
    {
        "keys": ["moisture", "soil_moisture", "soil_moisture_pct"],
        "label_en": "Soil Moisture", "label_np": "माटोको चिस्यान",
        "unit": "%", "low": 30, "high": 70,
        "msg": {
            "low":     ("Soil is dry — irrigation is recommended soon.",
                        "माटो सुक्खा छ — चाँडै सिँचाइ गर्नु राम्रो।"),
            "optimal": ("Good moisture level — adequate water for the crop.",
                        "उपयुक्त चिस्यान — बालीका लागि पर्याप्त पानी।"),
            "high":    ("Soil is very wet — hold irrigation and ensure good drainage.",
                        "माटो धेरै ओसिलो छ — सिँचाइ रोक्नुहोस् र निकास मिलाउनुहोस्।"),
        },
    },
    {
        "keys": ["temperature", "temperature_c", "temp"],
        "label_en": "Temperature", "label_np": "तापक्रम",
        "unit": "°C", "low": 15, "high": 32,
        "msg": {
            "low":     ("Cooler than ideal — growth may slow; suited to cool-season crops.",
                        "आदर्शभन्दा चिसो — वृद्धि सुस्त हुन सक्छ; जाडो मौसमका बालीलाई उपयुक्त।"),
            "optimal": ("Comfortable temperature for healthy crop growth.",
                        "स्वस्थ बाली वृद्धिका लागि उपयुक्त तापक्रम।"),
            "high":    ("Warmer than ideal — ensure enough water and shade-sensitive care.",
                        "आदर्शभन्दा तातो — पर्याप्त पानी र हेरचाहको ख्याल गर्नुहोस्।"),
        },
    },
    {
        "keys": ["humidity", "humidity_pct"],
        "label_en": "Humidity", "label_np": "आर्द्रता",
        "unit": "%", "low": 40, "high": 85,
        "msg": {
            "low":     ("Dry air — monitor crop water needs more closely.",
                        "सुक्खा हावा — बालीको पानी आवश्यकता नजिकबाट हेर्नुहोस्।"),
            "optimal": ("Comfortable humidity for most crops.",
                        "अधिकांश बालीका लागि उपयुक्त आर्द्रता।"),
            "high":    ("High humidity — watch for fungal diseases and ensure airflow.",
                        "उच्च आर्द्रता — ढुसीजन्य रोगबाट सतर्क रहनुहोस्, हावा चल्ने बनाउनुहोस्।"),
        },
    },
    {
        "keys": ["rainfall", "rainfall_mm"],
        "label_en": "Rainfall", "label_np": "वर्षा",
        "unit": "mm", "low": 50, "high": 300,
        "msg": {
            "low":     ("Low recent rainfall — plan supplementary irrigation.",
                        "हालैको वर्षा कम — पूरक सिँचाइको योजना गर्नुहोस्।"),
            "optimal": ("Adequate rainfall for typical field crops.",
                        "सामान्य बालीका लागि पर्याप्त वर्षा।"),
            "high":    ("Heavy rainfall — ensure drainage to avoid waterlogging.",
                        "धेरै वर्षा — जलजमाव हुन नदिन निकासको व्यवस्था गर्नुहोस्।"),
        },
    },
]

_STATUS_LABEL = {
    "low":     ("Low", "कम"),
    "optimal": ("Healthy", "स्वस्थ"),
    "high":    ("High", "बढी"),
    "na":      ("No data", "डाटा छैन"),
}


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "" or value == "—":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _lookup(input_data: dict, keys: list[str]) -> Optional[float]:
    for k in keys:
        if k in input_data:
            v = _to_float(input_data[k])
            if v is not None:
                return v
    return None


def _interpret_readings(input_data: Optional[dict]) -> list[dict]:
    """Turn raw sensor/soil values into farmer-friendly, blood-report-style rows."""
    input_data = input_data or {}
    rows: list[dict] = []

    for spec in _READINGS:
        value = _lookup(input_data, spec["keys"])

        if value is None:
            status = "na"
            msg_en = msg_np = "—"
        elif value < spec["low"]:
            status = "low"
            msg_en, msg_np = spec["msg"]["low"]
        elif value > spec["high"]:
            status = "high"
            msg_en, msg_np = spec["msg"]["high"]
        else:
            status = "optimal"
            msg_en, msg_np = spec["msg"]["optimal"]

        # Pretty value (trim trailing .0)
        if value is None:
            value_str = "—"
        elif float(value).is_integer():
            value_str = str(int(value))
        else:
            value_str = f"{value:.1f}"

        unit = spec["unit"]
        range_text = f"{_fmt_num(spec['low'])}–{_fmt_num(spec['high'])}{(' ' + unit) if unit else ''}"

        rows.append({
            "label_en": spec["label_en"],
            "label_np": spec["label_np"],
            "value": value_str,
            "unit": unit,
            "range_text": range_text,
            "status": status,
            "status_en": _STATUS_LABEL[status][0],
            "status_np": _STATUS_LABEL[status][1],
            "msg_en": msg_en,
            "msg_np": msg_np,
        })

    return rows


def _fmt_num(n: float) -> str:
    return str(int(n)) if float(n).is_integer() else f"{n:.1f}"


def _build_summary(data: dict, readings: list[dict]) -> dict:
    """A short, friendly digest shown at the very top of the report."""
    crop = data.get("crop")
    fertilizer = data.get("fertilizer")
    soil_class = data.get("soil_class")
    irrigation = data.get("irrigation")

    healthy = sum(1 for r in readings if r["status"] == "optimal")
    measured = sum(1 for r in readings if r["status"] != "na")
    attention = [r["label_en"] for r in readings if r["status"] in ("low", "high")]

    en_parts = []
    np_parts = []
    if crop:
        en_parts.append(f"Based on your field's soil and weather, the best crop to grow now is <b>{crop}</b>.")
        np_parts.append(f"तपाईंको खेतको माटो र मौसम अनुसार अहिले लगाउन उपयुक्त बाली <b>{crop}</b> हो।")
    if soil_class:
        en_parts.append(f"Your soil fertility is <b>{soil_class}</b>.")
        np_parts.append(f"तपाईंको माटोको उर्वरता <b>{soil_class}</b> छ।")
    if fertilizer:
        en_parts.append(f"Recommended fertilizer: <b>{fertilizer}</b>.")
        np_parts.append(f"सिफारिस गरिएको मल: <b>{fertilizer}</b>।")
    if irrigation:
        en_parts.append(f"Irrigation: <b>{irrigation}</b>.")
        np_parts.append(f"सिँचाइ: <b>{irrigation}</b>।")

    if measured:
        if attention:
            en_parts.append(
                f"{healthy} of {measured} readings are in the healthy range; "
                f"give attention to: {', '.join(attention)}."
            )
            np_parts.append(
                f"{measured} मध्ये {healthy} मापन स्वस्थ दायरामा छन्; "
                f"ध्यान दिनुपर्ने: {', '.join(attention)}।"
            )
        else:
            en_parts.append(f"All {measured} measured readings are in the healthy range.")
            np_parts.append(f"मापन गरिएका सबै {measured} मान स्वस्थ दायरामा छन्।")

    return {"en": " ".join(en_parts), "np": " ".join(np_parts)}


def _normalize_advice(data: dict) -> list[dict]:
    """
    Accepts either the full advice bundle (4 sections) or the legacy
    single advice_en/advice_np pair, and returns an ordered list of
    {title_en, title_np, advice_en, advice_np, source} sections.
    """
    sections: list[dict] = []
    bundle = data.get("advice")

    titles = {
        "crop":       ("Crop Guidance", "बाली सम्बन्धी सल्लाह"),
        "fertilizer": ("Fertilizer Guidance", "मल सम्बन्धी सल्लाह"),
        "irrigation": ("Irrigation Guidance", "सिँचाइ सम्बन्धी सल्लाह"),
        "soil":       ("Soil Improvement", "माटो सुधार"),
    }

    if isinstance(bundle, dict):
        for key in ("crop", "fertilizer", "irrigation", "soil"):
            sec = bundle.get(key)
            if isinstance(sec, dict) and (sec.get("advice_en") or sec.get("advice_np")):
                sections.append({
                    "title_en": titles[key][0], "title_np": titles[key][1],
                    "advice_en": sec.get("advice_en", ""),
                    "advice_np": sec.get("advice_np", ""),
                    "source": sec.get("source", "template"),
                })

    # Legacy fallback (single pair) if no bundle provided
    if not sections and (data.get("advice_en") or data.get("advice_np")):
        sections.append({
            "title_en": "Detailed Farming Advice", "title_np": "विस्तृत खेती सल्लाह",
            "advice_en": data.get("advice_en", ""),
            "advice_np": data.get("advice_np", ""),
            "source": "template",
        })

    return sections


def _render_html(data: dict) -> str:
    env = Environment(
        loader=FileSystemLoader(_TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("report.html")
    return template.render(**data)


def _build_context(data: dict) -> dict:
    """Enrich the raw request data with interpreted readings, summary, advice."""
    ctx = dict(data)

    if not ctx.get("report_id"):
        ctx["report_id"] = f"AGS-{datetime.utcnow().strftime('%Y%m%d')}-DEMO"
    if not ctx.get("generated_at"):
        ctx["generated_at"] = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

    lang = ctx.get("language") or "both"
    ctx["lang"] = lang
    ctx["show_en"] = lang in ("en", "both")
    ctx["show_np"] = lang in ("np", "both")

    readings = _interpret_readings(ctx.get("input_data"))
    ctx["readings"] = readings
    ctx["summary"] = _build_summary(ctx, readings)
    ctx["advice_sections"] = _normalize_advice(ctx)

    # Confidence percentages (optional)
    for key in ("crop_confidence", "fertilizer_confidence", "soil_confidence"):
        val = _to_float(ctx.get(key))
        ctx[key + "_pct"] = f"{val * 100:.1f}%" if val is not None else None

    return ctx


def _render_pdf_sync(data: dict) -> bytes:
    """Synchronous WeasyPrint render (run in a thread to avoid blocking the loop)."""
    from weasyprint import HTML

    ctx = _build_context(data)
    html_content = _render_html(ctx)
    return HTML(string=html_content, base_url=_TEMPLATE_DIR).write_pdf()


async def generate_pdf(data: dict) -> bytes:
    """
    Renders the farm report HTML and converts it to PDF bytes via WeasyPrint.
    Runs the (synchronous, CPU-bound) render in a worker thread.
    Falls back to returning the rendered HTML bytes if WeasyPrint is unavailable.
    """
    try:
        return await asyncio.to_thread(_render_pdf_sync, data)
    except ImportError:
        logger.warning("[PDF] WeasyPrint not installed — returning HTML fallback.")
        return _render_html(_build_context(data)).encode("utf-8")
    except Exception as e:
        logger.error(f"[PDF] generate_pdf failed: {e}")
        # Last-resort fallback so the endpoint never hard-fails
        try:
            return _render_html(_build_context(data)).encode("utf-8")
        except Exception:
            raise
