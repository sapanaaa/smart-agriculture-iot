"use client";
import { useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  T,
  F,
  Card,
  ProgressBar,
  Badge,
  ChartTip,
  fmt,
  hhmm,
  clamp,
  parseUTC,
} from "../_components/DashboardComponents";
import { usePolling } from "@/app/hooks/useApi";
import { getLatestReading, getSensorHistory } from "@/app/services/api";
import { Thermometer, Droplets, Sprout, FlaskConical } from "lucide-react";

// Define interfaces for type safety
interface SensorReading {
  temperature_c: number;
  humidity_pct: number;
  soil_moisture_pct: number;
  ph_value: number;
  received_at: string;
}

interface SensorData {
  [key: string]: number | string | undefined;
  temperature_c?: number;
  humidity_pct?: number;
  soil_moisture_pct?: number;
  ph_value?: number;
  received_at?: string;
}

export default function SensorsLivePage() {
  // Cast the returned data to proper types
  const { data: sensor } = usePolling(
    useCallback(() => getLatestReading(), []), 
    8000
  ) as { data: SensorData | null; error: any; loading: boolean };
  
  const { data: hist } = usePolling(
    useCallback(() => getSensorHistory(60), []), 
    15000
  ) as { data: { readings: SensorReading[]; total?: number } | null; error: any; loading: boolean };

  const readings = (hist?.readings || []).slice().reverse();

  const SENSORS = [
    { key: "temperature_c" as const, label: "Temperature", unit: "°C", color: T.rose, icon: "🌡️", lo: 0, hi: 50 },
    { key: "humidity_pct" as const, label: "Humidity", unit: "%", color: T.blue, icon: "💧", lo: 0, hi: 100 },
    { key: "soil_moisture_pct" as const, label: "Soil Moisture", unit: "%", color: T.accent, icon: "🌱", lo: 0, hi: 100 },
    { key: "ph_value" as const, label: "Soil pH", unit: "pH", color: T.amber, icon: "⚗️", lo: 0, hi: 14 },
  ];

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div style={{ backgroundColor: T.bg, minHeight: "100vh", padding: "24px" }}>
      {/* Header Section */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "row",
          flexWrap: "wrap",
          gap: "16px",
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <div>
            <h1 style={{ 
              fontSize: "clamp(24px, 4vw, 32px)", 
              fontWeight: "600", 
              color: T.text,
              marginBottom: "4px",
              letterSpacing: "-0.02em"
            }}>
              {getGreeting()}
            </h1>
            <p style={{ 
              fontSize: "clamp(12px, 2vw, 14px)", 
              color: T.textMuted,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap"
            }}>
              <span style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: T.accent,
                animation: "pulseDot 2s infinite"
              }} />
              <span>Live sensor feed · Auto-refresh every 8s</span>
            </p>
          </div>

          {/* Stats Summary */}
          <div style={{
            display: "flex",
            gap: "16px",
            padding: "12px 20px",
            backgroundColor: T.surface,
            borderRadius: "16px",
            border: `1px solid ${T.border}`,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "600", color: T.accent }}>
                {hist?.readings && (hist.readings as SensorReading[]).length > 0 ? "Active" : "Waiting"}
              </div>
              <div style={{ fontSize: "11px", color: T.textMuted }}>Status</div>
            </div>
            <div style={{ width: "1px", background: T.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "600", color: T.text }}>
                {hist?.total ?? (hist?.readings?.length ?? 0)}
              </div>
              <div style={{ fontSize: "11px", color: T.textMuted }}>Readings</div>
            </div>
          </div>
        </div>
      </div>

      {/* No Data Message - Shows when no sensor data */}
      {!sensor && readings.length === 0 && (
        <Card style={{ 
          padding: "48px 32px",
          background: T.surface,
          borderRadius: "20px",
          marginBottom: "24px",
          textAlign: "center",
          border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.8 }}>📡</div>
          <h3 style={{ fontSize: "20px", fontWeight: "600", color: T.text, marginBottom: "8px" }}>
            No sensor data received yet
          </h3>
          <p style={{ fontSize: "15px", color: T.textMuted, maxWidth: "500px", margin: "0 auto 16px", lineHeight: 1.6 }}>
            Ensure ESP32 is running and MQTT broker is active.
          </p>
          <div style={{
            display: "inline-block",
            padding: "8px 16px",
            background: T.cardHover,
            borderRadius: "20px",
            border: `1px solid ${T.border}`,
            fontSize: "13px",
            color: T.textMuted,
          }}>
            Waiting for connection...
          </div>
        </Card>
      )}

      {/* Main Sensor Cards - 4 Column Grid */}
      <div className="sensor-cards-grid" style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)", 
        gap: "20px", 
        marginBottom: "28px" 
      }}>
        {SENSORS.map((s) => {
          const val = sensor?.[s.key] as number | undefined;
          const pct = val !== undefined ? clamp(((val - s.lo) / (s.hi - s.lo)) * 100, 0, 100) : 0;
          const warn = s.key === "soil_moisture_pct" && (val || 0) < 30;
          
          return (
            <Card 
              key={s.key} 
              accent={warn ? T.rose : s.color} 
              glow={warn}
              style={{ 
                padding: "24px",
                background: T.surface,
                borderRadius: "20px",
                width: "100%",
              }}
            >
              {/* Header with Icon and Status */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "8px",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: `${s.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: T.textSub,
                    }}>
                      {s.label}
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: T.textMuted,
                    }}>
                      Range: {s.lo} - {s.hi} {s.unit}
                    </div>
                  </div>
                </div>
                {warn && <Badge text="LOW" color={T.rose} />}
              </div>

              {/* Current Value */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{
                  fontFamily: F.mono,
                  fontSize: "clamp(36px, 4vw, 48px)",
                  fontWeight: "600",
                  color: val !== undefined ? s.color : T.textMuted,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}>
                  {val !== undefined ? fmt(val) : "—"}
                  {val !== undefined && (
                    <span style={{ 
                      fontSize: "clamp(14px, 2vw, 18px)", 
                      fontWeight: "400", 
                      color: T.textMuted,
                      marginLeft: "4px"
                    }}>
                      {s.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {val !== undefined ? (
                <>
                  <div style={{ marginBottom: "8px" }}>
                    <ProgressBar value={pct} color={s.color} height={6} />
                  </div>
                  {/* Range Indicator */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: T.textDim,
                  }}>
                    <span>Min: {s.lo}</span>
                    <span>Current: {Math.round(pct)}%</span>
                    <span>Max: {s.hi}</span>
                  </div>
                </>
              ) : (
                <div style={{ 
                  height: "6px",
                  background: `${s.color}15`,
                  borderRadius: "6px",
                  marginBottom: "8px",
                }} />
              )}
            </Card>
          );
        })}
      </div>

      {/* Charts Section - 2 Column Grid */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          color: T.text,
          marginBottom: "16px",
          letterSpacing: "-0.01em",
        }}>
          Historical Trends
        </h2>
        <div className="charts-grid" style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: "20px" 
        }}>
          {SENSORS.map((s) => {
            const typedReadings = readings as SensorReading[];
            const data = typedReadings.map((r) => ({ 
              t: hhmm(r.received_at), 
              v: r[s.key] 
            }));
            const hasData = data.length > 0 && data.some(d => d.v !== undefined);
            
            return (
              <Card 
                key={s.key}
                style={{ 
                  padding: "20px",
                  background: T.surface,
                  borderRadius: "20px",
                  width: "100%",
                }}
              >
                {/* Chart Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: `${s.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                    }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: T.text,
                      }}>
                        {s.label} History
                      </div>
                      <div style={{
                        fontSize: "11px",
                        color: T.textMuted,
                      }}>
                        Last 60 readings
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: F.mono,
                    fontSize: "18px",
                    fontWeight: "600",
                    color: s.color,
                  }}>
                    {sensor?.[s.key] !== undefined ? fmt(sensor[s.key] as number) : "—"}
                    {sensor?.[s.key] !== undefined && (
                      <span style={{ fontSize: "11px", fontWeight: "400", color: T.textMuted, marginLeft: "4px" }}>
                        {s.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chart */}
                {hasData ? (
                  <>
                    <div style={{ height: "140px", width: "100%" }}>
                      <ResponsiveContainer>
                        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={T.border} 
                            vertical={false} 
                            strokeOpacity={0.5}
                          />
                          <XAxis
                            dataKey="t"
                            tick={{ fill: T.textDim, fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fill: T.textDim, fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[s.lo, s.hi]}
                            width={30}
                          />
                          <Tooltip content={<ChartTip />} />
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke={s.color}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ 
                              r: 6, 
                              fill: s.color, 
                              stroke: T.surface, 
                              strokeWidth: 2 
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Mini Stats */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "12px",
                      padding: "8px 12px",
                      background: T.cardHover,
                      borderRadius: "12px",
                      fontSize: "11px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}>
                      <div>
                        <span style={{ color: T.textMuted }}>Min: </span>
                        <span style={{ color: s.color, fontWeight: "500" }}>
                          {fmt(Math.min(...data.map(d => d.v).filter((v): v is number => v !== undefined)), 1)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: T.textMuted }}>Avg: </span>
                        <span style={{ color: s.color, fontWeight: "500" }}>
                          {fmt(data.reduce((acc, d) => acc + (d.v || 0), 0) / data.length, 1)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: T.textMuted }}>Max: </span>
                        <span style={{ color: s.color, fontWeight: "500" }}>
                          {fmt(Math.max(...data.map(d => d.v).filter((v): v is number => v !== undefined)), 1)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    height: "140px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    background: T.cardHover,
                    borderRadius: "12px",
                    color: T.textMuted,
                    fontSize: "14px",
                  }}>
                    No historical data available
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Status Footer */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "clamp(12px, 3vw, 24px)",
        padding: "16px",
        background: T.surface,
        borderRadius: "16px",
        border: `1px solid ${T.border}`,
        fontSize: "clamp(11px, 2vw, 12px)",
        color: T.textMuted,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: T.accent }}>🟢</span> System Online
        </div>
        <div>📊 {hist?.total ?? readings.length} readings in database</div>
        <div>⏱️ Last update: {parseUTC(sensor?.received_at)?.toLocaleTimeString() ?? '—'}</div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        @keyframes pulseDot {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @media (max-width: 1024px) {
          .sensor-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 640px) {
          .sensor-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}