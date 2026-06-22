"use client";
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── Enhanced Theme Tokens for Maximum Visibility ──
export const T = {
  bg:"#f1f5f9",        // slate-100 - slightly darker background for contrast
  surface:"#ffffff",    // white - cards surface
  card:"#ffffff",       // white - cards
  cardHover:"#f8fafc",  // slate-50 - card hover
  overlay:"#e2e8f0",    // slate-200 - overlay
  
  // Borders - much darker for definition
  border:"#94a3b8",     // slate-400 - darker borders
  borderLight:"#64748b", // slate-500 - even darker for hover
  
  // Accent colors - keep vibrant but ensure contrast
  accent:"#0284c7",     // sky-600 - darker for better contrast
  accentDim:"#0369a1",  // sky-700
  accentSubtle:"#e0f2fe", // sky-50
  
  // Status colors - darker for better visibility
  blue:"#2563eb",       // blue-600
  blueSubtle:"#dbeafe", // blue-50
  amber:"#d97706",      // amber-600
  amberSubtle:"#fef3c7", // amber-50
  rose:"#dc2626",       // red-600
  roseSubtle:"#fee2e2", // red-50
  teal:"#0d9488",       // teal-600
  tealSubtle:"#ccfbf1", // teal-50
  violet:"#7c3aed",     // violet-600
  
  // Text colors - SIGNIFICANTLY DARKER for maximum readability
  text:"#020617",       // slate-950 - almost black
  textSub:"#0f172a",    // slate-900 - very dark
  textMuted:"#1e293b",  // slate-800 - dark
  textDim:"#334155",    // slate-700 - medium dark
};

export const F = {
  body:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  display:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  mono:"'GeistMono','JetBrains Mono','Fira Code','Consolas',monospace",
};

// ── Helpers ───────────────────────────────────────────────────
export const fmt = (v: number | null | undefined, d = 1) => 
  v == null ? "—" : Number(v).toFixed(d);

export const clamp = (v: number, lo: number, hi: number) => 
  Math.min(hi, Math.max(lo, v ?? lo));

// The backend emits naive-UTC timestamps (e.g. "2026-06-22T04:28:19") with no
// 'Z'/offset. The browser would otherwise parse those as LOCAL time, making a
// fresh reading look hours off (by the viewer's UTC offset). parseUTC() treats
// such strings as UTC so relative times and clock labels are always correct.
export const parseUTC = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  return isNaN(d.getTime()) ? null : d;
};

export const ago = (iso: string | null | undefined) => {
  const d = parseUTC(iso);
  if (!d) return "—";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const hhmm = (iso: string | null | undefined) => {
  const d = parseUTC(iso);
  if (!d) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ── Animated counter ──────────────────────────────────────────
export function useCountUp(target: number | null | undefined, dur = 800) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  
  useEffect(() => {
    if (target == null || isNaN(target)) {
      setVal(target);
      return;
    }
    const start = prev.current ?? 0;
    const diff = target - start;
    if (Math.abs(diff) < 0.01) return;
    
    const t0 = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setVal(start + diff * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
      else prev.current = target;
    };
    requestAnimationFrame(frame);
  }, [target, dur]);
  
  return val;
}

// ── Card Component with Enhanced Visibility ──
export function Card({ children, style = {}, accent, onClick, glow, padding = "20px 22px" }: any) {
  const [hov, setHov] = useState(false);
  const gc = accent || T.accent;
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.card,
        border: `1px solid ${hov ? gc : T.border}`,
        borderRadius: 16,
        padding,
        transition: "all 0.2s ease",
        boxShadow: hov
          ? "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)"
          : glow
          ? `0 4px 15px ${gc}30`
          : "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05)",
        transform: hov && onClick ? "translateY(-2px)" : "none",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {hov && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg,transparent,${gc},transparent)`,
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </div>
  );
}

// ── Metric Component with Maximum Contrast ──
export function Metric({ label, value, unit, color = T.accent, icon, sub, decimals = 1 }: any) {
  const [hov, setHov] = useState(false);
  const num = parseFloat(value);
  const counted = useCountUp(isNaN(num) ? null : num);
  const display = isNaN(num)
    ? value ?? "—"
    : counted != null
    ? Number(counted).toFixed(decimals)
    : "—";
    
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "20px",
        borderRadius: 16,
        background: T.card,
        border: `1px solid ${hov ? color : T.border}`,
        transition: "all 0.2s ease",
        boxShadow: hov 
          ? "0 10px 25px -5px rgba(0,0,0,0.15)" 
          : "0 4px 6px -1px rgba(0,0,0,0.1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          bottom: 12,
          width: 4,
          borderRadius: "0 4px 4px 0",
          background: `linear-gradient(180deg, ${color}, ${color}CC)`,
          opacity: 1,
        }}
      />
      <div
        style={{
          fontSize: 12,
          color: T.textSub,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 700,
          marginBottom: 12,
          paddingLeft: 8,
        }}
      >
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, paddingLeft: 8 }}>
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 36,
            fontWeight: 700,
            color: color,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {display}
        </span>
        {unit && <span style={{ fontSize: 14, color: T.textMuted, fontWeight: 500 }}>{unit}</span>}
      </div>
      {sub && (
        <div style={{ marginTop: 10, fontSize: 12, color: T.textMuted, fontWeight: 500, paddingLeft: 8 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── ProgressBar with Better Contrast ──
export function ProgressBar({ value, max = 100, color = T.accent, height = 6 }: any) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div
      style={{
        height,
        borderRadius: height,
        background: `${color}25`, // Darker background
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: height,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}DD)`,
          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}

// ── ConfRow with Better Contrast ──
export function ConfRow({ label, value, color }: any) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        {label && <span style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>{label}</span>}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color,
            fontFamily: F.mono,
          }}
        >
          {pct}%
        </span>
      </div>
      <ProgressBar value={pct} color={color} height={4} />
    </div>
  );
}

// ── Badge with Better Contrast ──
export function Badge({ text, color = T.accent, size = "sm" }: any) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "sm" ? "4px 10px" : "6px 14px",
        borderRadius: 20,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        color: color,
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

// ── LiveDot with Better Visibility ──
export function LiveDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: T.accent,
        animation: "pulseDot 2s infinite",
        verticalAlign: "middle",
        marginRight: 6,
        boxShadow: `0 0 0 2px ${T.accent}25`,
      }}
    />
  );
}

// ── Divider with Better Contrast ──
export function Divider({ style = {} }: any) {
  return <div style={{ height: 1, background: T.border, margin: "16px 0", ...style }} />;
}

// ── SHead with Better Contrast ──
export function SHead({ title, sub, right }: any) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: F.display,
            fontSize: 20,
            fontWeight: 700,
            color: T.text,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted, fontWeight: 500, lineHeight: 1.5 }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

// ── Err with Better Contrast ──
export function Err({ msg }: any) {
  return msg ? (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        marginBottom: 16,
        background: T.roseSubtle,
        border: `1px solid ${T.rose}40`,
        color: T.rose,
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 16 }}>⚠️</span>
      {msg}
    </div>
  ) : null;
}

// ── Skeleton with Better Contrast ──
export function Skeleton({ height = 80, radius = 12 }: any) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background: T.overlay,
        backgroundImage: `linear-gradient(90deg, ${T.overlay} 0%, ${T.border} 40%, ${T.overlay} 80%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease infinite",
      }}
    />
  );
}

// ── ChartTip with Better Contrast ──
export const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 8, fontFamily: F.mono }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ fontSize: 12, color: T.textSub, fontWeight: 500, minWidth: 80 }}>{p.name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: F.mono }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── AISnip with Better Contrast ──
export function AISnip({ label, color, icon, children, right }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: hov ? `${color}12` : `${color}08`,
        border: `1px solid ${hov ? color + "40" : color + "25"}`,
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 700,
          }}
        >
          {icon} {label}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── TRow with Better Contrast ──
export function TRow({ r }: any) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ 
        background: hov ? T.cardHover : "transparent", 
        transition: "background 0.15s",
        cursor: "default",
      }}
    >
      {[
        { v: hhmm(r.received_at), c: T.textSub },
        { v: fmt(r.temperature_c), c: T.rose },
        { v: fmt(r.humidity_pct), c: T.blue },
        { v: fmt(r.soil_moisture_pct), c: T.accent },
        { v: fmt(r.ph_value, 2), c: T.amber },
        { badge: true },
      ].map((cell, i) => (
        <td
          key={i}
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${T.border}`,
            color: cell.c,
            fontFamily: F.mono,
            fontSize: 13,
            fontWeight: cell.badge ? 400 : 600,
          }}
        >
          {cell.badge ? (
            <Badge 
              text={r.has_errors ? "Alert" : "Normal"} 
              color={r.has_errors ? T.rose : T.accent} 
            />
          ) : (
            cell.v
          )}
        </td>
      ))}
    </tr>
  );
}