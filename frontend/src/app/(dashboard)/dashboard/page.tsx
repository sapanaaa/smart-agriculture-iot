"use client";
import { useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  T,
  F,
  Card,
  Metric,
  Err,
  LiveDot,
  Badge,
  AISnip,
  ConfRow,
  TRow,
  Skeleton,
  ChartTip,
  fmt,
  ago,
  hhmm,
} from "../_components/DashboardComponents";
import { usePolling } from "@/app/hooks/useApi";
import {
  Thermometer,
  Droplets,
  Sprout,
  FlaskConical,
} from "lucide-react";
import {
  getLatestReading,
  getSensorHistory,
  getCurrentWeather,
  getFullRecommendation,
} from "@/app/services/api";

// Define interfaces for type safety
interface SensorReading {
  temperature_c: number;
  humidity_pct: number;
  soil_moisture_pct: number;
  ph_value: number;
  received_at: string;
  has_errors?: boolean;
  moisture_level?: string;
  ph_category?: string;
}

interface WeatherData {
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  wind_speed_ms: number;
  condition_main: string;
  condition_desc: string;
  city: string;
  country: string;
}

interface RecommendationData {
  crop?: {
    crop: string;
    confidence: number;
    advice?: string;
  };
  irrigation?: {
    urgency: "low" | "medium" | "high";
    action: string;
    confidence: number;
    water_amount_mm?: number;
    advice?: string;
  };
  fertilizer?: {
    fertilizer: string;
    confidence: number;
    advice?: string;
  };
}

export default function OverviewPage() {
  // Cast the returned data to proper types
  const { data: sensor, error: sErr } = usePolling(
    useCallback(() => getLatestReading(), []),
    8000,
  ) as { data: SensorReading | null; error: any; loading: boolean };

  const { data: hist } = usePolling(
    useCallback(() => getSensorHistory(45), []),
    15000,
  ) as {
    data: { readings: SensorReading[] } | null;
    error: any;
    loading: boolean;
  };

  const { data: weather } = usePolling(
    useCallback(() => getCurrentWeather(), []),
    300000,
  ) as { data: WeatherData | null; error: any; loading: boolean };

  const { data: rec } = usePolling(
    useCallback(() => getFullRecommendation(), []),
    60000,
  ) as { data: RecommendationData | null; error: any; loading: boolean };

  const series = (hist?.readings || [])
    .slice()
    .reverse()
    .map((r: SensorReading) => ({
      t: hhmm(r.received_at),
      temp: r.temperature_c,
      hum: r.humidity_pct,
      mois: r.soil_moisture_pct,
    }));

  // Fix: Add index signature to uc object
  const uc: { [key: string]: string } = {
    low: T.accent,
    medium: T.amber,
    high: T.rose,
  };

  const wIcon = (c: string) =>
    ({
      Clear: "☀️",
      Clouds: "⛅",
      Rain: "🌧️",
      Drizzle: "🌦️",
      Thunderstorm: "⛈️",
      Mist: "🌫️",
    }[c] || "🌤️");

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Calculate average values for stats
  const avgTemp =
    series.reduce((acc, curr) => acc + (curr.temp || 0), 0) / series.length ||
    0;
  const avgHumidity =
    series.reduce((acc, curr) => acc + (curr.hum || 0), 0) / series.length || 0;

  return (
    <div style={{ backgroundColor: T.bg, minHeight: "100vh", padding: "24px" }}>
      {/* Header Section */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(24px, 4vw, 32px)",
                fontWeight: "600",
                color: T.text,
                marginBottom: "4px",
                letterSpacing: "-0.02em",
              }}
            >
              {getGreeting()},
            </h1>
            <p
              style={{
                fontSize: "clamp(12px, 2vw, 14px)",
                color: T.textMuted,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {sensor ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: T.accent,
                      animation: "pulseDot 2s infinite",
                    }}
                  />
                  <span>
                    Farm overview · Last updated {ago(sensor?.received_at)}
                  </span>
                </>
              ) : (
                "Waiting for sensor data…"
              )}
            </p>
          </div>

          {/* Weather Widget */}
          {weather && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
                backgroundColor: T.surface,
                borderRadius: "16px",
                border: `1px solid ${T.border}`,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                width: "auto",
                minWidth: "200px",
              }}
            >
              <span style={{ fontSize: "clamp(28px, 4vw, 36px)" }}>
                {wIcon(weather.condition_main)}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "clamp(20px, 3vw, 24px)",
                    fontWeight: "600",
                    color: T.text,
                    lineHeight: 1.2,
                  }}
                >
                  {fmt(weather.temperature_c)}°C
                </div>
                <div
                  style={{
                    fontSize: "clamp(11px, 1.5vw, 13px)",
                    color: T.textMuted,
                  }}
                >
                  {weather.city} · {weather.condition_desc}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Row - FIXED: 4 equal columns */}
        <div
          className="quick-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginTop: "20px",
            width: "100%",
          }}
        >
          <div
            style={{
              padding: "16px",
              backgroundColor: T.surface,
              borderRadius: "16px",
              border: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: T.textMuted,
                marginBottom: "4px",
              }}
            >
              Total Readings
            </div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: T.text }}>
              {hist?.readings?.length || 0}
            </div>
          </div>
          <div
            style={{
              padding: "16px",
              backgroundColor: T.surface,
              borderRadius: "16px",
              border: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: T.textMuted,
                marginBottom: "4px",
              }}
            >
              Avg Temperature
            </div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: T.rose }}>
              {fmt(avgTemp)}°C
            </div>
          </div>
          <div
            style={{
              padding: "16px",
              backgroundColor: T.surface,
              borderRadius: "16px",
              border: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: T.textMuted,
                marginBottom: "4px",
              }}
            >
              Avg Humidity
            </div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: T.blue }}>
              {fmt(avgHumidity)}%
            </div>
          </div>
          <div
            style={{
              padding: "16px",
              backgroundColor: T.surface,
              borderRadius: "16px",
              border: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: T.textMuted,
                marginBottom: "4px",
              }}
            >
              System Status
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: sensor ? T.accent : T.rose,
              }}
            >
              {sensor ? "Active" : "Waiting"}
            </div>
          </div>
        </div>
      </div>

      {/* No Data Message - Shows when no sensor data */}
      {!sensor && !sErr && (
        <Card
          style={{
            padding: "48px 32px",
            background: T.surface,
            borderRadius: "20px",
            marginBottom: "24px",
            textAlign: "center",
            border: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.8 }}>
            📡
          </div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: T.text,
              marginBottom: "8px",
            }}
          >
            No sensor data received yet
          </h3>
          <p
            style={{
              fontSize: "15px",
              color: T.textMuted,
              maxWidth: "500px",
              margin: "0 auto 16px",
              lineHeight: 1.6,
            }}
          >
            Ensure ESP32 is running and MQTT broker is active.
          </p>
          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: T.cardHover,
              borderRadius: "20px",
              border: `1px solid ${T.border}`,
              fontSize: "13px",
              color: T.textMuted,
            }}
          >
            Waiting for connection...
          </div>
        </Card>
      )}

      <Err msg={sErr} />

      {/* Main Metrics Grid - FIXED: 4 equal columns */}
      <div
        className="metrics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <Metric
          label="Temperature"
          value={sensor?.temperature_c}
          decimals={1}
          unit="°C"
          color={T.rose}
          icon={<Thermometer size={15} style={{ verticalAlign: "-2px" }} />}
          sub={
            sensor?.temperature_c && sensor?.temperature_c > 35
              ? "Heat stress"
              : "Optimal range"
          }
        />
        <Metric
          label="Humidity"
          value={sensor?.humidity_pct}
          decimals={1}
          unit="%"
          color={T.blue}
          icon={<Droplets size={15} style={{ verticalAlign: "-2px" }} />}
          sub={`${sensor?.humidity_pct || 0}% · Normal`}
        />
        <Metric
          label="Soil Moisture"
          value={sensor?.soil_moisture_pct}
          decimals={1}
          unit="%"
          color={T.accent}
          icon={<Sprout size={15} style={{ verticalAlign: "-2px" }} />}
          sub={
            sensor?.soil_moisture_pct && sensor?.soil_moisture_pct < 30
              ? "Low moisture"
              : "Healthy"
          }
        />
        <Metric
          label="Soil pH"
          value={sensor?.ph_value}
          decimals={2}
          unit="pH"
          color={T.amber}
          icon={<FlaskConical size={15} style={{ verticalAlign: "-2px" }} />}
          sub={sensor?.ph_category || "Neutral"}
        />
      </div>

      {/* Charts and AI Section - FIXED: 1.65fr / 1fr ratio */}
      <div
        className="charts-section"
        style={{
          display: "grid",
          gridTemplateColumns: "1.65fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Sensor Trends Chart */}
        <Card
          style={{
            padding: "24px",
            background: T.surface,
            borderRadius: "20px",
            width: "100%",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: `${T.accent}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                📊
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: T.text,
                    marginBottom: "2px",
                  }}
                >
                  Sensor Trends
                </h3>
                <p style={{ fontSize: "12px", color: T.textMuted }}>
                  Last 45 readings · Real-time updates
                </p>
              </div>
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginTop: "8px",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "Temperature", color: T.rose },
                { label: "Soil Moisture", color: T.accent },
                { label: "Humidity", color: T.blue },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: item.color,
                    }}
                  />
                  <span style={{ fontSize: "11px", color: T.textSub }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {hist?.readings && (hist.readings as SensorReading[]).length > 0 ? (
            <>
              <div style={{ height: "220px", width: "100%" }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={series}
                    margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="tempGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={T.rose}
                          stopOpacity={0.2}
                        />
                        <stop offset="95%" stopColor={T.rose} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient
                        id="moistureGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={T.accent}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={T.accent}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="humidityGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={T.blue}
                          stopOpacity={0.2}
                        />
                        <stop offset="95%" stopColor={T.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    />
                    <YAxis
                      tick={{ fill: T.textDim, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Area
                      type="monotone"
                      dataKey="temp"
                      name="Temperature °C"
                      stroke={T.rose}
                      fill="url(#tempGradient)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="mois"
                      name="Soil Moisture %"
                      stroke={T.accent}
                      fill="url(#moistureGradient)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="hum"
                      name="Humidity %"
                      stroke={T.blue}
                      fill="url(#humidityGradient)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Stats */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: T.cardHover,
                  borderRadius: "12px",
                  fontSize: "11px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <span style={{ color: T.textMuted }}>Min Temp: </span>
                  <span style={{ color: T.rose, fontWeight: "500" }}>
                    {fmt(
                      Math.min(...series.map((d) => d.temp).filter(Boolean)),
                      1,
                    )}
                    °C
                  </span>
                </div>
                <div>
                  <span style={{ color: T.textMuted }}>Max Temp: </span>
                  <span style={{ color: T.rose, fontWeight: "500" }}>
                    {fmt(
                      Math.max(...series.map((d) => d.temp).filter(Boolean)),
                      1,
                    )}
                    °C
                  </span>
                </div>
                <div>
                  <span style={{ color: T.textMuted }}>Avg: </span>
                  <span style={{ color: T.rose, fontWeight: "500" }}>
                    {fmt(avgTemp, 1)}°C
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                height: "220px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: T.cardHover,
                borderRadius: "12px",
                color: T.textMuted,
                fontSize: "14px",
              }}
            >
              No trend data available yet
            </div>
          )}
        </Card>

        {/* AI Recommendations */}
        <Card
          style={{
            padding: "24px",
            background: T.surface,
            borderRadius: "20px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: `${T.accent}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              ◈
            </div>
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: T.text,
                  marginBottom: "2px",
                }}
              >
                ML Recommendations
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ fontSize: "12px", color: T.textMuted }}>
                  Smart insights for your farm
                </p>
                <Badge text="LIVE" color={T.accent} />
              </div>
            </div>
          </div>

          {rec ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {rec.crop && (
                <AISnip label="Crop Recommendation" color={T.accent} icon="🌾">
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: T.accent,
                      marginBottom: "8px",
                    }}
                  >
                    {rec.crop.crop}
                  </div>
                  <ConfRow value={rec.crop.confidence} color={T.accent} />
                  {rec.crop.advice && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: T.textMuted,
                        marginTop: "8px",
                      }}
                    >
                      {rec.crop.advice}
                    </p>
                  )}
                </AISnip>
              )}
              {rec.irrigation && (
                <AISnip
                  label="Irrigation"
                  color={uc[rec.irrigation.urgency] || T.teal}
                  icon="💧"
                  right={
                    <Badge
                      text={rec.irrigation.urgency}
                      color={uc[rec.irrigation.urgency] || T.teal}
                    />
                  }
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: uc[rec.irrigation.urgency] || T.teal,
                    }}
                  >
                    {rec.irrigation.action?.replace(/_/g, " ")}
                  </div>
                  {rec.irrigation.water_amount_mm && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: `${uc[rec.irrigation.urgency] || T.teal}08`,
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: T.textSub,
                      }}
                    >
                      Recommended water:{" "}
                      <span
                        style={{
                          fontWeight: "600",
                          color: uc[rec.irrigation.urgency] || T.teal,
                        }}
                      >
                        {rec.irrigation.water_amount_mm}mm
                      </span>
                    </div>
                  )}
                  <ConfRow
                    value={rec.irrigation.confidence}
                    color={uc[rec.irrigation.urgency] || T.teal}
                  />
                </AISnip>
              )}
              {rec.fertilizer && (
                <AISnip label="Fertilizer" color={T.amber} icon="🧪">
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: T.amber,
                      marginBottom: "8px",
                    }}
                  >
                    {rec.fertilizer.fertilizer}
                  </div>
                  <ConfRow value={rec.fertilizer.confidence} color={T.amber} />
                </AISnip>
              )}
            </div>
          ) : (
            <div
              style={{
                height: "220px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: T.cardHover,
                borderRadius: "12px",
                color: T.textMuted,
                fontSize: "14px",
              }}
            >
              No recommendations available
            </div>
          )}
        </Card>
      </div>

      {/* Recent Readings Table */}
      <Card
        style={{
          padding: "24px",
          background: T.surface,
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: `${T.blue}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              📋
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: T.text }}>
              Recent Sensor Readings
            </h3>
          </div>
          <Badge text="Auto-refresh 8s" color={T.accent} />
        </div>

        <div style={{ overflowX: "auto" }}>
          {hist?.readings && (hist.readings as SensorReading[]).length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "600px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Time",
                    "Temperature",
                    "Humidity",
                    "Soil Moisture",
                    "pH",
                    "Status",
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "500",
                        color: T.textMuted,
                        borderBottom: `1px solid ${T.border}`,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(hist?.readings || [])
                  .slice(0, 8)
                  .map((reading: SensorReading, index: number) => (
                    <tr key={index}>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: T.textSub,
                        }}
                      >
                        {hhmm(reading.received_at)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: T.rose,
                          fontWeight: "500",
                        }}
                      >
                        {fmt(reading.temperature_c)}°C
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: T.blue,
                          fontWeight: "500",
                        }}
                      >
                        {fmt(reading.humidity_pct)}%
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: T.accent,
                          fontWeight: "500",
                        }}
                      >
                        {fmt(reading.soil_moisture_pct)}%
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: T.amber,
                          fontWeight: "500",
                        }}
                      >
                        {fmt(reading.ph_value, 2)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge
                          text={reading.has_errors ? "Alert" : "Normal"}
                          color={reading.has_errors ? T.rose : T.accent}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: T.textMuted,
                backgroundColor: T.cardHover,
                borderRadius: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "40px",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                📡
              </span>
              <p style={{ fontSize: "14px" }}>
                No sensor data yet. Connect your ESP32 to start receiving
                readings.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Responsive Styles */}
      <style>{`
        @keyframes pulseDot {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @media (max-width: 1024px) {
          .quick-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .charts-section {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 640px) {
          .quick-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
