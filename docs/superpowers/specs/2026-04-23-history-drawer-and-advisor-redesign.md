# Design: History Detail Drawer + ML Advisor Independent Panels

**Date:** 2026-04-23  
**Status:** Approved

---

## Problem

1. **History page** — record cards are not clickable. There is no way to view the full data for a saved recommendation.
2. **ML Advisor page** — soil, fertilizer, and irrigation recommendations are locked behind a strict two-step flow. They are only accessible after a crop is confirmed and the full report is generated. Farmers cannot run them independently.

---

## Feature 1: History Detail Drawer

### Goal
Clicking any record card on the History page opens a right-side drawer that displays the complete recommendation data for that record.

### Data Flow
- Each record card gets an `onClick` that sets `selectedId` state to `rec.report_id`.
- The drawer calls `GET /api/recommend/history/{report_id}` on open. This endpoint already exists in the backend.
- A new `getRecommendationById(reportId)` function is added to `frontend/src/app/services/api.js`.

### Drawer Layout
- Fixed right-side panel, ~55vw width, full viewport height, z-index above page content.
- Dark semi-transparent backdrop covers the rest of the page. Clicking it closes the drawer.
- `×` close button in the top-right corner of the drawer.
- **Header:** report ID, type badge, date/time, advice source badge (Gemini / Template).
- **Language toggle** (EN/NP) controls all bilingual text inside the drawer.
- **Body:** four collapsible section cards using the same `SectionCard` visual style from the advisor page:
  - Crop — crop name, confidence, top-3 matches, advice
  - Soil — fertility class (Low/Medium/High), confidence, class probabilities, LIME explanation if present, advice
  - Fertilizer — fertilizer name, confidence, NPK status, top-3 fertilizers, advice
  - Irrigation — action, urgency badge, water amount (mm), confidence, advice
  - Sections that are absent in the record (e.g., a crop-only record has no fertilizer) are simply not rendered.
- **Sensor Data Used** panel at the bottom (N, P, K, pH, moisture, temperature, humidity, rainfall).
- While loading: skeleton lines inside the drawer body.
- On error: inline error message with the HTTP detail string.

### Implementation Scope
- All changes are in `frontend/src/app/(dashboard)/history/page.tsx`.
- No new page or route required.
- The `HistoryDetailDrawer` sub-component is defined in the same file.

---

## Feature 2: ML Advisor — Independent Recommendation Panels

### Goal
Replace the strict two-step flow with four independent panels arranged in a 2×2 grid. Each panel can be run at any time. The existing "Generate Full Report" action becomes an explicit summary step at the bottom, available once a crop is confirmed.

### State Model (replaces current `step` string)

| State var | Type | Purpose |
|-----------|------|---------|
| `cropResult` | `CropResult \| null` | Result from crop panel |
| `soilResult` | `SoilFertilityResponse \| null` | Result from soil panel |
| `fertResult` | `FertilizerRecommendationResponse \| null` | Result from fertilizer panel |
| `irrigResult` | `IrrigationRecommendationResponse \| null` | Result from irrigation panel |
| `confirmedCrop` | `string \| null` | Crop selected by farmer in crop panel |
| `loadingPanel` | `"crop"\|"soil"\|"fert"\|"irrig"\|"report"\|null` | Which panel is currently fetching |
| `report` | `CompleteReport \| null` | Full report from /complete |
| `pdfBusy` | `boolean` | PDF download in progress |

### Panel Grid Layout

Four panels rendered in a 2×2 grid (collapses to 1 column on mobile via existing `.recommendations-grid` class):

**Crop panel (top-left, green `#2d6a2d`)**
- Button: "Get Crop Recommendation"
- Calls `POST /api/recommend/crop` with current data source values (live or manual).
- On result: shows top-3 crop selector. Farmer clicks a crop to set `confirmedCrop`.
- Running again resets `confirmedCrop`, `report`, and the crop result.

**Soil panel (top-right, purple `#7c3aed`)**
- Button: "Analyze Soil Fertility"
- Calls `POST /api/recommend/soil` with N, P, K, pH, moisture from current data source.
- No crop dependency. Runs anytime.
- Shows fertility class, confidence bar, class probabilities, LIME explanation if present.

**Fertilizer panel (bottom-left, amber `#d97706`)**
- Button: "Get Fertilizer Advice"
- Calls `POST /api/recommend/fertilizer`.
- If `confirmedCrop` is set → passes `crop_type: confirmedCrop`. Otherwise → passes `crop_type: "General"`.
- Shows fertilizer name, confidence, NPK status, top-3 fertilizers.

**Irrigation panel (bottom-right, blue `#0284c7`)**
- Button: "Get Irrigation Advice"
- Calls `POST /api/recommend/irrigation`.
- If `confirmedCrop` is set → passes `crop_type: confirmedCrop, crop_aware: true`. Otherwise → passes `crop_aware: false`.
- Shows action, urgency badge, water amount (mm), confidence.

### Full Report Section (below the grid)
- Visible only when `confirmedCrop` is set.
- Heading: "Complete Farm Report" with a note that it combines all 4 sections with Gemini bilingual advice.
- Button: "Generate Full Report" — calls existing `POST /api/recommend/complete`.
- On result: renders the existing full 4-card report view with Sensor Data Used panel.
- PDF download button appears in the page header once `report` is set (unchanged from current behavior).

### Empty State
- Shown only when all four panel results are null and `loadingPanel` is null.
- Same robot icon + "Ready to analyze your farm" message as today.

### Crop-Aware Inheritance
- When `confirmedCrop` changes (farmer selects or re-selects a crop), fertilizer and irrigation panels display a subtle note: "Using confirmed crop: [cropName]". They do not auto-re-run — the farmer must click the button again if they want updated results.

### Implementation Scope
- All changes are in `frontend/src/app/(dashboard)/ai_advisor/page.tsx`.
- Uses existing API functions: `postCropRecommendation`, `postSoilFertility`, `postFertilizerRecommendation`, `postIrrigationRecommendation`, `postCompleteReport`, `postGenerateReport`.
- No backend changes needed.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/app/services/api.js` | Add `getRecommendationById(reportId)` |
| `frontend/src/app/(dashboard)/history/page.tsx` | Add `selectedId` state, card `onClick`, `HistoryDetailDrawer` component |
| `frontend/src/app/(dashboard)/ai_advisor/page.tsx` | Replace step-based state with four independent panel states, restructure layout |

## Files Unchanged
- All backend Python files — no backend changes required.
- `AdviceSection`, `SoilFertilityCard`, `ManualInputPanel`, `LanguageToggle`, `DashboardComponents` — reused as-is.
