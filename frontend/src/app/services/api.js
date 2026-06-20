// src/services/api.js
// ─────────────────────────────────────────────────────────────
// Central API service — all HTTP calls to the FastAPI backend.
//
// Always relative "/api/..." paths: the browser is on the production domain
// and nginx proxies /api/sensors, /api/recommend, /api/analytics, /api/weather
// to the FastAPI container.
// ─────────────────────────────────────────────────────────────

const API_BASE_URL = "";
export const BACKEND_URL = API_BASE_URL;

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    // FastAPI validation errors return detail as an array of {loc,msg,type}.
    // Flatten it into a readable string instead of "[object Object]".
    let message;
    if (Array.isArray(err?.detail)) {
      message = err.detail
        .map((e) => (e?.msg ? `${e.msg}${e.loc ? ` (${e.loc.join(".")})` : ""}` : JSON.stringify(e)))
        .join("; ");
    } else if (typeof err?.detail === "string") {
      message = err.detail;
    } else {
      message = err?.detail ? JSON.stringify(err.detail) : `HTTP ${res.status}`;
    }
    throw new Error(message);
  }
  return res.json();
}

// ── Sensor Data ───────────────────────────────────────────────
export const getLatestReading   = ()              => request("/api/sensors/latest");
export const getSensorHistory   = (limit = 40)   => request(`/api/sensors/history?limit=${limit}`);
export const getSystemStatus    = ()              => request("/api/sensors/status");

// ── Analytics ─────────────────────────────────────────────────
export const getDailySummary    = (date)          => request(`/api/analytics/summary/daily${date ? `?date=${date}` : ""}`);
export const getWeeklySummary   = ()              => request("/api/analytics/summary/week");

// ── Weather ───────────────────────────────────────────────────
export const getCurrentWeather  = ()              => request("/api/weather/current");

// ── ML Recommendations ────────────────────────────────────────
export const getFullRecommendation = ()           => request("/api/recommend/full");
export const getRecommendStatus    = ()           => request("/api/recommend/status");

export const postCropRecommendation = (body)      =>
  request("/api/recommend/crop", { method: "POST", body: JSON.stringify(body) });

export const postFertilizerRecommendation = (body) =>
  request("/api/recommend/fertilizer", { method: "POST", body: JSON.stringify(body) });

export const postIrrigationRecommendation = (body) =>
  request("/api/recommend/irrigation", { method: "POST", body: JSON.stringify(body) });

// ── Soil + Explain ────────────────────────────────────────────
export const postSoilFertility = (body) =>
  request("/api/recommend/soil", { method: "POST", body: JSON.stringify(body) });

export const postExplain = (body) =>
  request("/api/recommend/explain", { method: "POST", body: JSON.stringify(body) });

// ── Complete 4-section report (Step 2 guided workflow) ────────
export const postCompleteReport = (body) =>
  request("/api/recommend/complete", { method: "POST", body: JSON.stringify(body) });

// ── On-demand Advice (Gemini) ─────────────────────────────────
export const postAdvice = (body) =>
  request("/api/recommend/advice", { method: "POST", body: JSON.stringify(body) });

// ── PDF Report ────────────────────────────────────────────────
export const postGenerateReport = (body) =>
  fetch(`${API_BASE_URL}/api/recommend/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Recommendation History ────────────────────────────────────
export const getRecommendHistory = (userId, page = 1) =>
  request(`/api/recommend/history?${userId ? `user_id=${userId}&` : ""}page=${page}`);

export const getRecommendationById = (reportId) =>
  request(`/api/recommend/history/${reportId}`);

// ── Health ────────────────────────────────────────────────────
export const getHealth = () => request("/health");