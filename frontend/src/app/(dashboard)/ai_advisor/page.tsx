"use client";
import React, { useState } from "react";
import {
  T, F, Card, Err, ConfRow, Badge, Divider, Skeleton, fmt,
} from "../_components/DashboardComponents";
import {
  postCropRecommendation, postCompleteReport, postGenerateReport,
  postFertilizerRecommendation, postIrrigationRecommendation, postSoilFertility,
} from "@/app/services/api";
import LanguageToggle, { type Lang } from "../_components/LanguageToggle";
import SoilFertilityCard from "../_components/SoilFertilityCard";
import AdviceSection from "../_components/AdviceSection";
import ManualInputPanel, {
  defaultManualInput,
  type ManualInput,
} from "../_components/ManualInputPanel";

// ── Types ─────────────────────────────────────────────────────

type DataSource = "live" | "manual";

interface CropResult {
  crop:           string;
  confidence:     number;
  confidence_pct: string;
  top_3_crops:    Array<{ label: string; probability: number }>;
  advice:         string;
}

interface SectionAdvice {
  advice_en: string;
  advice_np: string;
  source:    string;
}

interface CompleteReport {
  report_id:       string;
  confirmed_crop:  string;
  crop_confidence: number | null;
  crop_top_3:      Array<{ label: string; probability: number }> | null;
  fertilizer:      any;
  irrigation:      any;
  soil:            any;
  advice:          { crop: SectionAdvice; fertilizer: SectionAdvice; irrigation: SectionAdvice; soil: SectionAdvice };
  sensor_data_used: Record<string, number>;
  generated_at:    string;
}

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
  action:           string;
  confidence:       number;
  confidence_pct:   string;
  advice?:          string;
  water_amount_mm?: number;
  urgency:          string;
}

type LoadingPanel = "crop" | "soil" | "fert" | "irrig" | "report" | null;

// ── Sub-components ────────────────────────────────────────────

function TopM({ rank, label, pct, color, selected, onClick }: any) {
  const [hov, setHov] = useState(false);
  const isSelected = selected === label;
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 12px",
        borderRadius: 10,
        border: `2px solid ${isSelected ? color : hov ? `${color}40` : T.border}`,
        background: isSelected ? `${color}12` : hov ? `${color}06` : T.surface,
        cursor: "pointer", width: "100%",
        transition: "all 0.18s",
        marginBottom: 8,
      }}
    >
      <span style={{ color: T.textSub, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{["🥇", "🥈", "🥉"][rank]}</span>
        <span style={{ textTransform: "capitalize", fontWeight: isSelected ? 700 : 400 }}>{label}</span>
        {isSelected && <span style={{ fontSize: 10, color, fontWeight: 700 }}>✓ Selected</span>}
      </span>
      <span style={{ color, fontFamily: F.mono, fontSize: 14, fontWeight: 600 }}>
        {pct}%
      </span>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function AIAdvisorPage() {
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

  const uc = { low: T.accent, medium: T.amber, high: T.rose } as const;

  // ── Crop recommendation ──────────────────────────────────────
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

  const runSoil = async () => {
    setLoadingPanel("soil"); setError(null); setSoilResult(null);
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
    setLoadingPanel("fert"); setError(null); setFertResult(null);
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
    setLoadingPanel("irrig"); setError(null); setIrrigResult(null);
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

  // ── Full report ───────────────────────────────────────────────
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

  const downloadPDF = async () => {
    if (!report) return;
    setPdfBusy(true);
    try {
      const body = {
        report_id:  report.report_id,
        crop:       report.confirmed_crop,
        fertilizer: report.fertilizer?.fertilizer,
        soil_class: report.soil?.fertility_class,
        irrigation: report.irrigation?.action,
        advice_en:  report.advice?.crop?.advice_en,
        advice_np:  report.advice?.crop?.advice_np,
        input_data: report.sensor_data_used,
        language:   lang,
      };
      const res = await postGenerateReport(body);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `SmartAgri_Report_${report.report_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? "PDF download failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const resetAll = () => {
    setCropResult(null); setSoilResult(null);
    setFertResult(null); setIrrigResult(null);
    setConfirmedCrop(null); setReport(null); setError(null);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const t = (en: string, np: string) => lang === "en" ? en : np;

  function SectionCard({
    icon, iconBg, title, subtitle, accentColor, children,
  }: {
    icon: string; iconBg: string; title: string; subtitle: string;
    accentColor: string; children: React.ReactNode;
  }) {
    return (
      <div style={{
        background: T.surface,
        borderRadius: 20,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "16px 24px 0",
          borderBottom: `3px solid ${accentColor}`,
          paddingBottom: 16,
          background: `${accentColor}08`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: iconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>
              {icon}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{title}</h3>
              <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>{subtitle}</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px", flex: 1 }}>
          {children}
        </div>
      </div>
    );
  }

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
}
