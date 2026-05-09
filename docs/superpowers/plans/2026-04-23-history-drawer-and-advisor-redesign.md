# History Drawer + ML Advisor Independent Panels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make history records openable (right-side drawer showing full report data) and restructure the ML Advisor page so Crop, Soil, Fertilizer, and Irrigation run independently in a 2×2 grid, with the existing Full Report as an explicit summary step.

**Architecture:** All changes are frontend-only. The backend already exposes `GET /api/recommend/history/{report_id}` for the drawer and separate `POST` endpoints for each ML model for independent panel runs. No backend code changes required.

**Tech Stack:** Next.js 16, TypeScript, React hooks (`useState`, `useEffect`), existing `DashboardComponents` (T, F, ConfRow, Badge, Divider, Err), `SoilFertilityCard`, `AdviceSection`, `ManualInputPanel`, `LanguageToggle`.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/app/services/api.js` | Add `getRecommendationById(reportId)` |
| `frontend/src/app/(dashboard)/history/page.tsx` | Add `selectedId` state, card `onClick`, `DrawerSection` + `DrawerContent` + `HistoryDetailDrawer` components |
| `frontend/src/app/(dashboard)/ai_advisor/page.tsx` | Replace step-based state with 4 independent panel states, add `IndependentPanel` sub-component, restructure layout |

---

## Task 1: Add `getRecommendationById` API helper

**Files:**
- Modify: `frontend/src/app/services/api.js`

- [ ] **Step 1: Add the function to api.js**

Open `frontend/src/app/services/api.js`. After the `getRecommendHistory` line, add:

```js
export const getRecommendationById = (reportId) =>
  request(`/api/recommend/history/${reportId}`);
```

- [ ] **Step 2: Verify the dev server is running and test the endpoint manually**

In a browser console (on the dashboard), run:
```js
fetch("http://localhost:8000/api/recommend/history/AGS-20260423-KVHE")
  .then(r => r.json()).then(console.log)
```
Expected: a JSON object with fields like `confirmed_crop`, `fertilizer`, `soil`, `irrigation`, `advice`, `sensor_data_used`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/services/api.js
git commit -m "feat(api): add getRecommendationById helper"
```

---

## Task 2: History page — clickable cards + drawer state

**Files:**
- Modify: `frontend/src/app/(dashboard)/history/page.tsx`

- [ ] **Step 1: Update React imports**

Change the top import from:
```tsx
import { useCallback, useState } from "react";
```
to:
```tsx
import { useCallback, useEffect, useState } from "react";
```

- [ ] **Step 2: Update DashboardComponents import**

Change:
```tsx
import { T, F } from "../_components/DashboardComponents";
```
to:
```tsx
import { T, F, ConfRow, Badge, Divider, Err } from "../_components/DashboardComponents";
```

- [ ] **Step 3: Add missing component imports**

After the `LanguageToggle` import line, add:
```tsx
import SoilFertilityCard from "../_components/SoilFertilityCard";
import AdviceSection from "../_components/AdviceSection";
import { getRecommendationById } from "@/app/services/api";
```

- [ ] **Step 4: Add `selectedId` state inside `HistoryPage`**

Inside the `HistoryPage` function, after the existing `useState` declarations, add:
```tsx
const [selectedId, setSelectedId] = useState<string | null>(null);
```

- [ ] **Step 5: Add `onClick` and cursor style to each record card**

Find the `<div key={rec.id}` that renders each record card (around line 149). Replace its `style` object and add an `onClick`:

```tsx
<div
  key={rec.id}
  onClick={() => setSelectedId(rec.report_id ?? null)}
  style={{
    padding: "16px 20px",
    background: T.surface,
    borderRadius: 14,
    border: `1px solid ${T.border}`,
    borderLeft: `4px solid ${color}`,
    transition: "all 0.2s",
    cursor: "pointer",
  }}
  onMouseEnter={e => (e.currentTarget.style.background = T.cardHover)}
  onMouseLeave={e => (e.currentTarget.style.background = T.surface)}
>
```

- [ ] **Step 6: Mount the drawer in the JSX return**

Inside the `return (...)` of `HistoryPage`, just before the closing `</div>` of the outermost wrapper, add:

```tsx
{selectedId && (
  <HistoryDetailDrawer
    reportId={selectedId}
    lang={lang}
    onClose={() => setSelectedId(null)}
  />
)}
```

- [ ] **Step 7: Verify cards are clickable**

Open `http://localhost:3000/history` in the browser. Click any record card. The page should not navigate away and `setSelectedId` should fire (nothing visible yet — the drawer component is added in Task 3). Confirm no TypeScript errors in the terminal.

---

## Task 3: History page — `HistoryDetailDrawer` component

**Files:**
- Modify: `frontend/src/app/(dashboard)/history/page.tsx`

Add all three sub-components **above** the `export default function HistoryPage()` declaration.

- [ ] **Step 1: Add `DrawerSection` helper component**

```tsx
function DrawerSection({
  icon, color, iconBg, title, children,
}: {
  icon: string; color: string; iconBg: string;
  title: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: T.surface, borderRadius: 14,
      border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${color}`,
      overflow: "hidden", marginBottom: 0,
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 8,
        background: `${color}06`,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Add `DrawerContent` component**

```tsx
function DrawerContent({
  rec, lang,
}: {
  rec: any; lang: Lang;
}) {
  const t = (en: string, np: string) => lang === "en" ? en : np;
  const uc = { low: "#0284c7", medium: "#d97706", high: "#dc2626" } as const;

  const crop       = rec.confirmed_crop ?? rec.result?.crop?.crop ?? rec.result?.crop;
  const cropConf   = rec.crop_confidence ?? rec.result?.crop?.confidence;
  const cropTop3   = rec.crop_top_3 ?? rec.result?.crop?.top_3_crops;
  const soil       = rec.soil ?? rec.result?.soil;
  const fertilizer = rec.fertilizer ?? rec.result?.fertilizer;
  const irrigation = rec.irrigation ?? rec.result?.irrigation;
  const advice     = rec.advice;
  const sensorData = rec.sensor_data_used;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Crop */}
      {crop && (
        <DrawerSection icon="🌾" color="#2d6a2d" iconBg="#2d6a2d18"
          title={t("Crop Recommendation", "बाली सिफारिस")}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#2d6a2d", textTransform: "capitalize", marginBottom: 8 }}>
            {crop}
          </div>
          {cropConf != null && (
            <ConfRow label={t("Confidence", "विश्वास")} value={cropConf} color="#2d6a2d" />
          )}
          {cropTop3 && cropTop3.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                {t("Top 3 Matches", "शीर्ष ३ मिलान")}
              </div>
              {cropTop3.map((c: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textMuted, fontSize: 13 }}>
                    {["🥇","🥈","🥉"][i]}{" "}
                    <span style={{ textTransform: "capitalize" }}>{c.label}</span>
                  </span>
                  <span style={{ color: "#2d6a2d", fontFamily: F.mono, fontSize: 13, fontWeight: 600 }}>
                    {Math.round(c.probability * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          {advice?.crop && (
            <AdviceSection
              adviceEn={advice.crop.advice_en} adviceNp={advice.crop.advice_np}
              source={advice.crop.source} lang={lang}
            />
          )}
        </DrawerSection>
      )}

      {/* Soil */}
      {soil && (
        <DrawerSection
          icon="🌿"
          color={({"High":"#2d6a2d","Medium":"#d97706","Low":"#dc2626"} as any)[soil.fertility_class] ?? "#0d9488"}
          iconBg={`${({"High":"#2d6a2d","Medium":"#d97706","Low":"#dc2626"} as any)[soil.fertility_class] ?? "#0d9488"}18`}
          title={t("Soil Fertility", "माटो उर्वरता")}
        >
          <SoilFertilityCard
            fertility_class={soil.fertility_class}
            confidence={soil.confidence}
            confidence_pct={soil.confidence_pct}
            class_probs={soil.class_probs}
            advice={soil.advice}
            explanation={soil.explanation}
            lang={lang}
            adviceEn={advice?.soil?.advice_en}
            adviceNp={advice?.soil?.advice_np}
            adviceSource={advice?.soil?.source}
            embedded
          />
        </DrawerSection>
      )}

      {/* Irrigation */}
      {irrigation && (() => {
        const urgency = (irrigation.urgency ?? "low") as "low" | "medium" | "high";
        const c = uc[urgency] ?? "#0d9488";
        return (
          <DrawerSection icon="💧" color={c} iconBg={`${c}18`}
            title={t("Irrigation", "सिँचाई")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Badge text={urgency.toUpperCase()} color={c} size="sm" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c, marginBottom: 10, wordBreak: "break-word" }}>
              {irrigation.action?.replace(/_/g, " ")}
            </div>
            <ConfRow label={t("Confidence", "विश्वास")} value={irrigation.confidence} color={c} />
            {irrigation.water_amount_mm && (
              <div style={{ margin: "12px 0", padding: 12, borderRadius: 10, background: `${c}08`, border: `1px solid ${c}20`, textAlign: "center" }}>
                <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: c }}>
                  {irrigation.water_amount_mm}
                  <span style={{ fontSize: 13, color: T.textMuted, marginLeft: 4 }}>mm</span>
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>
                  {t("Recommended water volume", "सिफारिस पानी मात्रा")}
                </div>
              </div>
            )}
            {irrigation.advice && (
              <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6 }}>{irrigation.advice}</p>
            )}
            {advice?.irrigation && (
              <AdviceSection
                adviceEn={advice.irrigation.advice_en} adviceNp={advice.irrigation.advice_np}
                source={advice.irrigation.source} lang={lang}
              />
            )}
          </DrawerSection>
        );
      })()}

      {/* Fertilizer */}
      {fertilizer && (
        <DrawerSection icon="🧪" color="#d97706" iconBg="#d9770618"
          title={t("Fertilizer", "मलखाद")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#d97706" }}>{fertilizer.fertilizer}</div>
            <Badge text={fertilizer.confidence_pct} color="#d97706" size="sm" />
          </div>
          <ConfRow label={t("Confidence", "विश्वास")} value={fertilizer.confidence} color="#d97706" />
          {fertilizer.advice && (
            <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, margin: "10px 0" }}>{fertilizer.advice}</p>
          )}
          {fertilizer.npk_status && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                {t("NPK Status", "एनपीके अवस्था")}
              </div>
              {Object.entries(fertilizer.npk_status).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textMuted, fontSize: 13, textTransform: "capitalize" }}>{k}</span>
                  <Badge
                    text={v as string}
                    color={(v as string) === "optimal" ? "#2d6a2d" : (v as string) === "low" ? "#dc2626" : "#d97706"}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
          {advice?.fertilizer && (
            <AdviceSection
              adviceEn={advice.fertilizer.advice_en} adviceNp={advice.fertilizer.advice_np}
              source={advice.fertilizer.source} lang={lang}
            />
          )}
        </DrawerSection>
      )}

      {/* Sensor Data */}
      {sensorData && (
        <DrawerSection icon="📊" color="#7c3aed" iconBg="#7c3aed15"
          title={t("Data Used for This Report", "यस रिपोर्टका लागि प्रयोग गरिएको डेटा")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            {Object.entries(sensorData).map(([k, v]) => (
              <div key={k} style={{ padding: "8px 10px", background: T.cardHover, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2, textTransform: "capitalize" }}>
                  {k.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#2d6a2d", fontFamily: F.mono }}>
                  {typeof v === "number" ? v.toFixed(1) : String(v)}
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add `HistoryDetailDrawer` component**

```tsx
function HistoryDetailDrawer({
  reportId, lang, onClose,
}: {
  reportId: string; lang: Lang; onClose: () => void;
}) {
  const [rec, setRec]         = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null); setRec(null);
    getRecommendationById(reportId)
      .then((data: any) => { if (!cancelled) setRec(data); })
      .catch((e: any)  => { if (!cancelled) setErr(e.message ?? String(e)); })
      .finally(()      => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reportId]);

  const color = TYPE_COLOR[rec?.type ?? "full"] ?? "#0d9488";
  const icon  = TYPE_ICON[rec?.type  ?? "full"] ?? "🤖";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)", zIndex: 100,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, right: 0,
        width: "min(55vw, 860px)", height: "100vh",
        background: "#f1f5f9",
        borderLeft: `1px solid #94a3b8`,
        zIndex: 101,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>

        {/* Drawer header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid #94a3b8`,
          background: "#ffffff",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text, textTransform: "capitalize" }}>
                {rec?.type ?? "—"} Recommendation
              </span>
              {rec?.report_id && (
                <span style={{ fontSize: 11, color: T.textMuted, fontFamily: F.mono }}>
                  #{rec.report_id}
                </span>
              )}
            </div>
            {rec?.created_at && (
              <div style={{ fontSize: 12, color: T.textMuted }}>
                {new Date(rec.created_at).toLocaleString()}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid #94a3b8`, background: "#f8fafc",
              cursor: "pointer", fontSize: 18, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textMuted,
            }}
          >
            ×
          </button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  height: 110, borderRadius: 14,
                  background: `linear-gradient(90deg,#f8fafc 25%,#e2e8f0 50%,#f8fafc 75%)`,
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }} />
              ))}
            </div>
          )}
          {err && (
            <div style={{
              padding: "12px 16px", borderRadius: 10,
              background: "#fee2e2", border: "1px solid #fca5a5",
              color: "#991b1b", fontSize: 13,
            }}>
              Failed to load report: {err}
            </div>
          )}
          {rec && !loading && <DrawerContent rec={rec} lang={lang} />}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Test the drawer end-to-end**

1. Open `http://localhost:3000/history`.
2. Click any record card. The dark backdrop and right-side drawer should appear.
3. Drawer fetches data — skeletons appear briefly, then real content renders.
4. Verify all sections present in the record (crop, soil, fertilizer, irrigation) appear as `DrawerSection` blocks.
5. Click the `×` button and confirm the drawer closes. Click the backdrop and confirm it also closes.
6. Switch language toggle in the list — the drawer's advice text should also switch (lang is passed down from parent).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(dashboard)/history/page.tsx
git commit -m "feat(history): add clickable record cards with full-detail right-side drawer"
```

---

## Task 4: ML Advisor — restructure state, types, and handlers

**Files:**
- Modify: `frontend/src/app/(dashboard)/ai_advisor/page.tsx`

- [ ] **Step 1: Update imports**

Replace the existing API imports:
```tsx
import {
  postCropRecommendation, postCompleteReport, postGenerateReport,
} from "@/app/services/api";
```
with:
```tsx
import {
  postCropRecommendation, postCompleteReport, postGenerateReport,
  postFertilizerRecommendation, postIrrigationRecommendation, postSoilFertility,
} from "@/app/services/api";
```

- [ ] **Step 2: Add new result type definitions**

In the `// ── Types ─────────────────────────────────────────────────────` section, after the existing type definitions, add:

```tsx
interface SoilResult {
  fertility_class: string;
  confidence:      number;
  confidence_pct:  string;
  class_probs?:    Record<string, number>;
  advice?:         string;
  explanation?:    Record<string, number> | null;
}

interface FertResult {
  fertilizer:          string;
  confidence:          number;
  confidence_pct:      string;
  top_3_fertilizers?:  Array<{ label: string; probability: number }>;
  advice?:             string;
  npk_status?:         Record<string, string>;
}

interface IrrigResult {
  action:          string;
  confidence:      number;
  confidence_pct:  string;
  advice?:         string;
  water_amount_mm?: number;
  urgency:         string;
}

type LoadingPanel = "crop" | "soil" | "fert" | "irrig" | "report" | null;
```

- [ ] **Step 3: Replace the state declarations inside `AIAdvisorPage`**

Replace the current block of `useState` declarations:
```tsx
const [step,          setStep]          = useState<Step>("initial");
const [dataSource,    setDataSource]    = useState<DataSource>("live");
const [manualInput,   setManualInput]   = useState<ManualInput>(defaultManualInput);
const [cropResult,    setCropResult]    = useState<CropResult | null>(null);
const [confirmedCrop, setConfirmedCrop] = useState<string | null>(null);
const [report,        setReport]        = useState<CompleteReport | null>(null);
const [loading,       setLoading]       = useState<Loading>(null);
const [error,         setError]         = useState<string | null>(null);
const [lang,          setLang]          = useState<Lang>("en");
const [pdfBusy,       setPdfBusy]       = useState(false);
```
with:
```tsx
const [cropResult,    setCropResult]    = useState<CropResult | null>(null);
const [soilResult,    setSoilResult]    = useState<SoilResult | null>(null);
const [fertResult,    setFertResult]    = useState<FertResult | null>(null);
const [irrigResult,   setIrrigResult]   = useState<IrrigResult | null>(null);
const [confirmedCrop, setConfirmedCrop] = useState<string | null>(null);
const [loadingPanel,  setLoadingPanel]  = useState<LoadingPanel>(null);
const [report,        setReport]        = useState<CompleteReport | null>(null);
const [pdfBusy,       setPdfBusy]       = useState(false);
const [error,         setError]         = useState<string | null>(null);
const [lang,          setLang]          = useState<Lang>("en");
const [dataSource,    setDataSource]    = useState<DataSource>("live");
const [manualInput,   setManualInput]   = useState<ManualInput>(defaultManualInput);
```

Also remove the now-unused type aliases `Step` and `Loading` from the Types section.

- [ ] **Step 4: Replace the `resetAll` function**

Replace:
```tsx
const resetAll = () => {
  setStep("initial");
  setCropResult(null);
  setConfirmedCrop(null);
  setReport(null);
  setError(null);
};
```
with:
```tsx
const resetAll = () => {
  setCropResult(null); setSoilResult(null);
  setFertResult(null); setIrrigResult(null);
  setConfirmedCrop(null); setReport(null); setError(null);
};
```

- [ ] **Step 5: Replace `runCropRecommendation` with `runCrop`**

Replace the entire `runCropRecommendation` function with:
```tsx
const runCrop = async () => {
  setLoadingPanel("crop"); setError(null);
  setCropResult(null); setConfirmedCrop(null); setReport(null);
  try {
    const body = dataSource === "manual"
      ? {
          nitrogen:    manualInput.nitrogen,
          phosphorus:  manualInput.phosphorus,
          potassium:   manualInput.potassium,
          ph:          manualInput.ph,
          temperature: manualInput.temperature,
          humidity:    manualInput.humidity,
          rainfall:    manualInput.rainfall,
        }
      : {};
    const result = await postCropRecommendation(body);
    setCropResult(result);
  } catch (e: any) {
    setError(e.message ?? "Crop recommendation failed");
  } finally {
    setLoadingPanel(null);
  }
};
```

- [ ] **Step 6: Add `runSoil`, `runFert`, `runIrrig` handlers**

After `runCrop`, add:

```tsx
const runSoil = async () => {
  setLoadingPanel("soil"); setError(null);
  try {
    const body = dataSource === "manual"
      ? {
          nitrogen:   manualInput.nitrogen,
          phosphorus: manualInput.phosphorus,
          potassium:  manualInput.potassium,
          ph:         manualInput.ph,
          moisture:   manualInput.soil_moisture,
        }
      : {};
    const result = await postSoilFertility(body);
    setSoilResult(result);
  } catch (e: any) {
    setError(e.message ?? "Soil analysis failed");
  } finally {
    setLoadingPanel(null);
  }
};

const runFert = async () => {
  setLoadingPanel("fert"); setError(null);
  try {
    const body: any = dataSource === "manual"
      ? {
          nitrogen:    manualInput.nitrogen,
          phosphorus:  manualInput.phosphorus,
          potassium:   manualInput.potassium,
          temperature: manualInput.temperature,
          humidity:    manualInput.humidity,
          moisture:    manualInput.soil_moisture,
          soil_type:   manualInput.soil_type,
          ph:          manualInput.ph,
        }
      : {};
    body.crop_type = confirmedCrop ?? "General";
    const result = await postFertilizerRecommendation(body);
    setFertResult(result);
  } catch (e: any) {
    setError(e.message ?? "Fertilizer recommendation failed");
  } finally {
    setLoadingPanel(null);
  }
};

const runIrrig = async () => {
  setLoadingPanel("irrig"); setError(null);
  try {
    const body: any = dataSource === "manual"
      ? {
          soil_moisture: manualInput.soil_moisture,
          temperature:   manualInput.temperature,
          humidity:      manualInput.humidity,
          ph:            manualInput.ph,
          rainfall_mm:   manualInput.rainfall,
        }
      : {};
    if (confirmedCrop) {
      body.crop_type  = confirmedCrop;
      body.crop_aware = true;
    } else {
      body.crop_aware = false;
    }
    const result = await postIrrigationRecommendation(body);
    setIrrigResult(result);
  } catch (e: any) {
    setError(e.message ?? "Irrigation recommendation failed");
  } finally {
    setLoadingPanel(null);
  }
};
```

- [ ] **Step 7: Update `runFullReport` to use `loadingPanel`**

Replace the existing `runFullReport` function with:
```tsx
const runFullReport = async () => {
  if (!confirmedCrop || !cropResult) return;
  setLoadingPanel("report"); setError(null);
  try {
    const body: any = {
      confirmed_crop:  confirmedCrop,
      crop_confidence: cropResult.confidence,
      crop_top_3:      cropResult.top_3_crops,
    };
    if (dataSource === "manual") {
      body.nitrogen      = manualInput.nitrogen;
      body.phosphorus    = manualInput.phosphorus;
      body.potassium     = manualInput.potassium;
      body.temperature   = manualInput.temperature;
      body.humidity      = manualInput.humidity;
      body.ph            = manualInput.ph;
      body.rainfall      = manualInput.rainfall;
      body.soil_moisture = manualInput.soil_moisture;
      body.soil_type     = manualInput.soil_type;
    }
    const result = await postCompleteReport(body);
    setReport(result);
  } catch (e: any) {
    setError(e.message ?? "Report generation failed");
  } finally {
    setLoadingPanel(null);
  }
};
```

- [ ] **Step 8: Remove the now-unused `StepBadge` component**

Delete the `StepBadge` function definition entirely (it was used only for the old step-based flow).

- [ ] **Step 9: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors related to the new state variables or removed `Step`/`Loading` types.

---

## Task 5: ML Advisor — rebuild layout with 4 independent panels

**Files:**
- Modify: `frontend/src/app/(dashboard)/ai_advisor/page.tsx`

- [ ] **Step 1: Add `IndependentPanel` sub-component**

Define this **inside** `AIAdvisorPage`, after the `SectionCard` definition (so it has closure access to `t`):

```tsx
function IndependentPanel({
  panelTitle, subtitle, icon, accentColor,
  buttonLabel, isLoading, disabled, onRun,
  cropNote, children,
}: {
  panelTitle: string; subtitle: string; icon: string; accentColor: string;
  buttonLabel: string; isLoading: boolean; disabled: boolean; onRun: () => void;
  cropNote?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      background: T.surface, borderRadius: 20,
      border: `1px solid ${T.border}`,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "16px 20px", background: `${accentColor}08`,
        borderBottom: `3px solid ${accentColor}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${accentColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{panelTitle}</h3>
          <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ padding: "16px 20px", flex: 1 }}>
        {cropNote && (
          <div style={{
            fontSize: 11, color: accentColor, fontWeight: 600,
            marginBottom: 12, padding: "4px 10px", borderRadius: 6,
            background: `${accentColor}10`, display: "inline-block",
          }}>
            🌱 {cropNote}
          </div>
        )}
        <button
          onClick={onRun}
          disabled={disabled}
          style={{
            padding: "11px 20px", borderRadius: 10, border: "none",
            background: isLoading ? T.cardHover : accentColor,
            color: isLoading ? T.textMuted : "#fff",
            fontWeight: 700, fontSize: 13,
            cursor: disabled ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.2s",
            opacity: (disabled && !isLoading) ? 0.55 : 1,
            marginBottom: children ? 16 : 0,
            width: "100%", justifyContent: "center",
          }}
        >
          {isLoading
            ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>{t("Analyzing…", "विश्लेषण गर्दै…")}</>
            : <><span>{icon}</span>{buttonLabel}</>
          }
        </button>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the entire render section (after the helper definitions)**

Replace everything from `// ── Render ─` to the closing `</div>` (and the `<style>` tag) of the current return with:

```tsx
// ── Render ────────────────────────────────────────────────────
const allEmpty = !cropResult && !soilResult && !fertResult && !irrigResult;

return (
  <div style={{ backgroundColor: T.bg, minHeight: "100vh", padding: "24px" }}>

    {/* ── Page Header ── */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.02em" }}>
          🌱 {t("ML Advisor", "एमएल सल्लाहकार")}
        </h1>
        <p style={{ fontSize: 13, color: T.textMuted, margin: "4px 0 0" }}>
          {t("Independent crop & soil recommendations", "स्वतन्त्र बाली र माटो सिफारिस")}
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <LanguageToggle lang={lang} onChange={setLang} />
        {report && (
          <button
            onClick={downloadPDF}
            disabled={pdfBusy}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px",
              background: "#fffbf0", border: "1px solid #d4a017",
              borderRadius: 10, color: "#9a7212",
              fontSize: 13, fontWeight: 600,
              cursor: pdfBusy ? "default" : "pointer",
              opacity: pdfBusy ? 0.7 : 1,
            }}
          >
            {pdfBusy ? "⟳" : "📄"} {t("Download PDF", "PDF डाउनलोड")}
          </button>
        )}
        {!allEmpty && (
          <button
            onClick={resetAll}
            style={{
              padding: "9px 16px", background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: 10,
              color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            🔄 {t("Reset All", "सबै रिसेट गर्नुहोस्")}
          </button>
        )}
      </div>
    </div>

    <Err msg={error} />

    {/* ── Data Source Toggle ── */}
    <div style={{
      background: T.surface, borderRadius: 16,
      border: `1px solid ${T.border}`,
      padding: "20px 24px", marginBottom: 20,
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        {t("Data Source", "डेटा स्रोत")}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: dataSource === "manual" ? 20 : 0 }}>
        {(["live", "manual"] as const).map(src => (
          <button
            key={src}
            onClick={() => { setDataSource(src); resetAll(); }}
            style={{
              padding: "10px 20px", borderRadius: 10,
              border: `2px solid ${dataSource === src ? "#2d6a2d" : T.border}`,
              background: dataSource === src ? "#e8f4e8" : T.cardHover,
              color: dataSource === src ? "#2d6a2d" : T.textMuted,
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              transition: "all 0.18s",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {src === "live"
              ? <><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 2px #22c55e40" }} />{t("Live Sensor", "लाइभ सेन्सर")}</>
              : <><span>✏️</span>{t("Manual Input", "म्यानुअल इनपुट")}</>
            }
          </button>
        ))}
      </div>
      {dataSource === "manual" && <ManualInputPanel lang={lang} onChange={setManualInput} />}
      {dataSource === "live" && (
        <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
          {t(
            "Using live sensor + weather data. Switch to Manual Input if sensors are offline.",
            "लाइभ सेन्सर र मौसम डेटा प्रयोग गर्दै। सेन्सर अफलाइन भएमा म्यानुअल इनपुटमा स्विच गर्नुहोस्।"
          )}
        </p>
      )}
    </div>

    {/* ── 2×2 Independent Panel Grid ── */}
    <div
      style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 20 }}
      className="recommendations-grid"
    >
      {/* Crop Panel */}
      <IndependentPanel
        panelTitle={t("Crop Recommendation", "बाली सिफारिस")}
        subtitle={t("SwiFT Transformer AI", "स्विफ्ट ट्रान्सफर्मर एआई")}
        icon="🌾" accentColor="#2d6a2d"
        buttonLabel={t("Get Crop Recommendation", "बाली सिफारिस प्राप्त गर्नुहोस्")}
        isLoading={loadingPanel === "crop"}
        disabled={loadingPanel !== null}
        onRun={runCrop}
      >
        {cropResult && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {t("Select your crop — Top 3 matches", "आफ्नो बाली छान्नुहोस् — शीर्ष ३ मिलान")}
            </div>
            {cropResult.top_3_crops?.map((c, i) => (
              <TopM
                key={c.label} rank={i} label={c.label}
                pct={Math.round(c.probability * 100)}
                color="#2d6a2d" selected={confirmedCrop}
                onClick={() => setConfirmedCrop(c.label)}
              />
            ))}
            {cropResult.advice && (
              <p style={{ fontSize: 12, color: T.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                {cropResult.advice}
              </p>
            )}
            {confirmedCrop && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#2d6a2d", fontWeight: 600 }}>
                ✓ {confirmedCrop} {t("confirmed", "पुष्टि भयो")}
              </div>
            )}
          </div>
        )}
      </IndependentPanel>

      {/* Soil Panel */}
      <IndependentPanel
        panelTitle={t("Soil Fertility", "माटो उर्वरता")}
        subtitle={t("TabNet AI + LIME Explanation", "ट्याबनेट एआई + LIME व्याख्या")}
        icon="🌿" accentColor="#7c3aed"
        buttonLabel={t("Analyze Soil Fertility", "माटो उर्वरता विश्लेषण गर्नुहोस्")}
        isLoading={loadingPanel === "soil"}
        disabled={loadingPanel !== null}
        onRun={runSoil}
      >
        {soilResult && (
          <SoilFertilityCard
            fertility_class={soilResult.fertility_class}
            confidence={soilResult.confidence}
            confidence_pct={soilResult.confidence_pct}
            class_probs={soilResult.class_probs}
            advice={soilResult.advice}
            explanation={soilResult.explanation}
            lang={lang}
            embedded
          />
        )}
      </IndependentPanel>

      {/* Fertilizer Panel */}
      <IndependentPanel
        panelTitle={t("Fertilizer", "मलखाद")}
        subtitle={t("TabNet AI + NPK Analysis", "ट्याबनेट एआई + एनपीके विश्लेषण")}
        icon="🧪" accentColor={T.amber}
        buttonLabel={t("Get Fertilizer Advice", "मलखाद सल्लाह प्राप्त गर्नुहोस्")}
        isLoading={loadingPanel === "fert"}
        disabled={loadingPanel !== null}
        onRun={runFert}
        cropNote={confirmedCrop ? `${t("Using crop:", "बाली प्रयोग:")} ${confirmedCrop}` : undefined}
      >
        {fertResult && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.amber }}>{fertResult.fertilizer}</div>
              <Badge text={fertResult.confidence_pct} color={T.amber} size="sm" />
            </div>
            <ConfRow label={t("Confidence", "विश्वास")} value={fertResult.confidence} color={T.amber} />
            {fertResult.advice && (
              <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, margin: "10px 0" }}>{fertResult.advice}</p>
            )}
            {fertResult.npk_status && Object.entries(fertResult.npk_status).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.textMuted, fontSize: 13, textTransform: "capitalize" }}>{k}</span>
                <Badge
                  text={v as string}
                  color={(v as string) === "optimal" ? "#2d6a2d" : (v as string) === "low" ? "#dc2626" : T.amber}
                  size="sm"
                />
              </div>
            ))}
          </>
        )}
      </IndependentPanel>

      {/* Irrigation Panel */}
      <IndependentPanel
        panelTitle={t("Irrigation", "सिँचाई")}
        subtitle={t("FT-Transformer AI (crop-aware)", "एफटी-ट्रान्सफर्मर एआई (बाली-सचेत)")}
        icon="💧" accentColor={T.accent}
        buttonLabel={t("Get Irrigation Advice", "सिँचाई सल्लाह प्राप्त गर्नुहोस्")}
        isLoading={loadingPanel === "irrig"}
        disabled={loadingPanel !== null}
        onRun={runIrrig}
        cropNote={confirmedCrop ? `${t("Crop-aware:", "बाली-सचेत:")} ${confirmedCrop}` : undefined}
      >
        {irrigResult && (() => {
          const urgency = (irrigResult.urgency ?? "low") as "low" | "medium" | "high";
          const c = uc[urgency] ?? T.teal;
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Badge text={urgency.toUpperCase()} color={c} size="sm" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c, marginBottom: 10, wordBreak: "break-word" }}>
                {irrigResult.action?.replace(/_/g, " ")}
              </div>
              <ConfRow label={t("Confidence", "विश्वास")} value={irrigResult.confidence} color={c} />
              {irrigResult.water_amount_mm && (
                <div style={{ margin: "12px 0", padding: 12, borderRadius: 10, background: `${c}08`, border: `1px solid ${c}20`, textAlign: "center" }}>
                  <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: c }}>
                    {irrigResult.water_amount_mm}
                    <span style={{ fontSize: 13, color: T.textMuted, marginLeft: 4 }}>mm</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>
                    {t("Recommended water volume", "सिफारिस पानी मात्रा")}
                  </div>
                </div>
              )}
              {irrigResult.advice && (
                <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6 }}>{irrigResult.advice}</p>
              )}
            </>
          );
        })()}
      </IndependentPanel>
    </div>

    {/* ── Full Report Section (visible when crop is confirmed) ── */}
    {confirmedCrop && (
      <div style={{
        background: T.surface, borderRadius: 16,
        border: `1px solid ${loadingPanel === "report" ? "#2d6a2d60" : T.border}`,
        padding: "20px 24px", marginBottom: 20,
        boxShadow: loadingPanel === "report" ? "0 0 0 3px #2d6a2d15" : "0 1px 6px rgba(0,0,0,0.04)",
        transition: "all 0.25s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: report ? "#2d6a2d" : "#e8f4e8",
            color: report ? "#fff" : "#2d6a2d",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            border: `2px solid #2d6a2d`,
          }}>
            {report ? "✓" : "★"}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
              {t("Complete Farm Report", "पूर्ण कृषि रिपोर्ट")}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              {t(
                `Fertilizer · Irrigation · Soil · Gemini Advice for ${confirmedCrop}`,
                `${confirmedCrop} का लागि मलखाद · सिँचाई · माटो · जेमिनी सल्लाह`
              )}
            </div>
          </div>
        </div>

        <button
          onClick={runFullReport}
          disabled={loadingPanel !== null || !!report}
          style={{
            padding: "13px 28px", borderRadius: 12,
            border: report ? "2px solid #2d6a2d40" : "none",
            background: report ? "#f0faf0" : loadingPanel === "report" ? T.cardHover : "#2d6a2d",
            color: report ? "#2d6a2d" : loadingPanel === "report" ? T.textMuted : "#fff",
            fontWeight: 700, fontSize: 14,
            cursor: loadingPanel !== null || !!report ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.2s",
          }}
        >
          {loadingPanel === "report"
            ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>{t("Generating report…", "रिपोर्ट तयार गर्दै…")}</>
            : report
            ? <><span>✓</span>{t("Report Generated", "रिपोर्ट तयार भयो")}</>
            : <><span>📊</span>{t("Generate Full Report", "पूर्ण रिपोर्ट बनाउनुहोस्")}</>
          }
        </button>

        {loadingPanel === "report" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              t("Running fertilizer model…", "मलखाद मोडल चलाउँदै…"),
              t("Running irrigation model…", "सिँचाई मोडल चलाउँदै…"),
              t("Running soil fertility model…", "माटो उर्वरता मोडल चलाउँदै…"),
              t("Generating bilingual advice…", "द्विभाषी सल्लाह तयार गर्दै…"),
            ].map((msg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, fontSize: 12 }}>
                <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block", animationDelay: `${i * 0.2}s` }}>⟳</span>
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* ── Full Report Results ── */}
    {report && (
      <>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
          {t("Complete Farm Report", "पूर्ण कृषि रिपोर्ट")} · {report.report_id}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 20 }} className="recommendations-grid">

          {/* Crop Card */}
          <SectionCard icon="🌾" iconBg="#2d6a2d18" title={t("Crop Recommendation", "बाली सिफारिस")} subtitle={t("SwiFT Transformer AI", "स्विफ्ट ट्रान्सफर्मर एआई")} accentColor="#2d6a2d">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#2d6a2d", textTransform: "capitalize" }}>{report.confirmed_crop}</div>
              <Badge text={`${Math.round((report.crop_confidence ?? 0) * 100)}% Match`} color="#2d6a2d" size="sm" />
            </div>
            <ConfRow label={t("Model confidence", "मोडल विश्वास")} value={report.crop_confidence ?? 0} color="#2d6a2d" />
            {report.crop_top_3 && report.crop_top_3.length > 0 && (
              <>
                <Divider />
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 8px" }}>
                  {t("Top 3 Matches", "शीर्ष ३ मिलान")}
                </div>
                {report.crop_top_3.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: T.textMuted, fontSize: 13 }}>{["🥇","🥈","🥉"][i]} <span style={{ textTransform: "capitalize" }}>{c.label}</span></span>
                    <span style={{ color: "#2d6a2d", fontFamily: F.mono, fontWeight: 600, fontSize: 13 }}>{Math.round(c.probability * 100)}%</span>
                  </div>
                ))}
              </>
            )}
            <AdviceSection adviceEn={report.advice.crop.advice_en} adviceNp={report.advice.crop.advice_np} source={report.advice.crop.source} lang={lang} />
          </SectionCard>

          {/* Soil Card */}
          <SectionCard
            icon="🌿"
            iconBg={`${({"High":"#2d6a2d","Medium":"#d97706","Low":"#dc2626"} as any)[report.soil?.fertility_class] ?? T.teal}18`}
            title={t("Soil Fertility", "माटो उर्वरता")}
            subtitle={t("TabNet AI + LIME Explanation", "ट्याबनेट एआई + LIME व्याख्या")}
            accentColor={({"High":"#2d6a2d","Medium":"#d97706","Low":"#dc2626"} as any)[report.soil?.fertility_class] ?? T.teal}
          >
            <SoilFertilityCard
              fertility_class={report.soil.fertility_class}
              confidence={report.soil.confidence}
              confidence_pct={report.soil.confidence_pct}
              class_probs={report.soil.class_probs}
              advice={report.soil.advice}
              explanation={report.soil.explanation}
              lang={lang}
              adviceEn={report.advice.soil.advice_en}
              adviceNp={report.advice.soil.advice_np}
              adviceSource={report.advice.soil.source}
              embedded
            />
          </SectionCard>

          {/* Irrigation Card */}
          {(() => {
            const urgency = report.irrigation?.urgency as "low" | "medium" | "high" ?? "low";
            const c = uc[urgency] ?? T.teal;
            return (
              <SectionCard icon="💧" iconBg={`${c}18`} title={t("Irrigation", "सिँचाई")} subtitle={t("FT-Transformer AI (crop-aware)", "एफटी-ट्रान्सफर्मर एआई (बाली-सचेत)")} accentColor={c}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <Badge text={urgency.toUpperCase()} color={c} size="sm" />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c, marginBottom: 12, wordBreak: "break-word" }}>
                  {report.irrigation.action?.replace(/_/g, " ")}
                </div>
                <ConfRow label={t("Model confidence", "मोडल विश्वास")} value={report.irrigation.confidence} color={c} />
                {report.irrigation.water_amount_mm && (
                  <div style={{ margin: "14px 0", padding: 14, borderRadius: 12, background: `${c}08`, border: `1px solid ${c}20`, textAlign: "center" }}>
                    <div style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 700, color: c, lineHeight: 1 }}>
                      {report.irrigation.water_amount_mm}
                      <span style={{ fontSize: 14, fontWeight: 400, color: T.textMuted, marginLeft: 4 }}>mm</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{t("Recommended water volume", "सिफारिस पानी मात्रा")}</div>
                  </div>
                )}
                <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6 }}>{report.irrigation.advice}</p>
                <AdviceSection adviceEn={report.advice.irrigation.advice_en} adviceNp={report.advice.irrigation.advice_np} source={report.advice.irrigation.source} lang={lang} />
              </SectionCard>
            );
          })()}

          {/* Fertilizer Card */}
          <SectionCard icon="🧪" iconBg={`${T.amber}18`} title={t("Fertilizer", "मलखाद")} subtitle={t("TabNet AI + NPK Analysis", "ट्याबनेट एआई + एनपीके विश्लेषण")} accentColor={T.amber}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.amber }}>{report.fertilizer.fertilizer}</div>
              <Badge text={report.fertilizer.confidence_pct} color={T.amber} size="sm" />
            </div>
            <ConfRow label={t("Model confidence", "मोडल विश्वास")} value={report.fertilizer.confidence} color={T.amber} />
            <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, margin: "10px 0" }}>{report.fertilizer.advice}</p>
            {report.fertilizer.npk_status && (
              <>
                <Divider />
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 8px" }}>
                  {t("NPK Status", "एनपीके अवस्था")}
                </div>
                {Object.entries(report.fertilizer.npk_status).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: T.textMuted, fontSize: 13, textTransform: "capitalize" }}>{k}</span>
                    <Badge text={v as string} color={(v as string) === "optimal" ? "#2d6a2d" : (v as string) === "low" ? "#dc2626" : T.amber} size="sm" />
                  </div>
                ))}
              </>
            )}
            {report.fertilizer.top_3_fertilizers && (
              <>
                <Divider />
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 8px" }}>
                  {t("Top 3 Fertilizers", "शीर्ष ३ मलखाद")}
                </div>
                {report.fertilizer.top_3_fertilizers.map((f: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: T.textMuted, fontSize: 13 }}>{["🥇","🥈","🥉"][i]} {f.label}</span>
                    <span style={{ color: T.amber, fontFamily: F.mono, fontWeight: 600, fontSize: 13 }}>{Math.round(f.probability * 100)}%</span>
                  </div>
                ))}
              </>
            )}
            <AdviceSection adviceEn={report.advice.fertilizer.advice_en} adviceNp={report.advice.fertilizer.advice_np} source={report.advice.fertilizer.source} lang={lang} />
          </SectionCard>
        </div>

        {/* Sensor Data Used */}
        <Card style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.violet}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📊</div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
              {t("Data Used for This Report", "यस रिपोर्टका लागि प्रयोग गरिएको डेटा")}
            </h3>
            <span style={{ marginLeft: "auto", fontSize: 11, color: T.textMuted }}>
              {dataSource === "manual" ? t("Manual Input", "म्यानुअल इनपुट") : t("Live Sensor + Weather", "लाइभ सेन्सर + मौसम")}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            {Object.entries(report.sensor_data_used).map(([k, v]) => (
              <div key={k} style={{ padding: "10px 12px", background: T.cardHover, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3, textTransform: "capitalize" }}>
                  {k.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#2d6a2d", fontFamily: F.mono }}>
                  {fmt(v as number, 1)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </>
    )}

    {/* ── Empty State ── */}
    {allEmpty && loadingPanel === null && (
      <div style={{
        padding: "40px 32px", textAlign: "center",
        background: T.surface, borderRadius: 20,
        border: `1px dashed ${T.border}`,
      }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>🤖</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>
          {t("Ready to analyze your farm", "तपाईंको खेत विश्लेषण गर्न तयार")}
        </h3>
        <p style={{ fontSize: 13, color: T.textMuted, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>
          {t(
            "Choose your data source above, then click any panel button to run an independent recommendation.",
            "माथि आफ्नो डेटा स्रोत छान्नुहोस्, त्यसपछि स्वतन्त्र सिफारिस चलाउन कुनै पनि प्यानल बटन क्लिक गर्नुहोस्।"
          )}
        </p>
      </div>
    )}

    <style>{`
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @media (max-width: 1024px) { .recommendations-grid { grid-template-columns: 1fr !important; } }
    `}</style>
  </div>
);
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Manual test — independent panels**

1. Open `http://localhost:3000/ai_advisor`.
2. Confirm 4 panels appear in a 2×2 grid, each with its own button.
3. Click **Analyze Soil Fertility** — soil result appears in the soil panel without affecting others.
4. Click **Get Fertilizer Advice** — fertilizer result appears. Confirm the crop note says "Using crop: General" (since no crop confirmed yet).
5. Click **Get Crop Recommendation** — top-3 list appears. Click a crop to confirm it.
6. Re-run **Get Fertilizer Advice** — crop note should now show the confirmed crop name.
7. Re-run **Get Irrigation Advice** — should use `crop_aware: true` (verify via backend log).
8. Confirm the Full Report section appears below the grid only after a crop is confirmed.
9. Click **Generate Full Report** — all 4 result cards appear below, Sensor Data panel shows.
10. PDF download button appears in header; click it and confirm a PDF downloads.
11. Switch language toggle to नेपाली — all labels in all panels switch.
12. Click **Reset All** — all panels clear, empty state reappears.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(dashboard)/ai_advisor/page.tsx
git commit -m "feat(advisor): restructure ML advisor to independent recommendation panels with 2x2 grid"
```

---

## Summary of Commits

| Commit | Message |
|--------|---------|
| 1 | `feat(api): add getRecommendationById helper` |
| 2 | `feat(history): add clickable record cards with full-detail right-side drawer` |
| 3 | `feat(advisor): restructure ML advisor to independent recommendation panels with 2x2 grid` |
