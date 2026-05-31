"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * Map between section IDs and clean URL paths.
   * Clicking a navbar link scrolls to that section AND updates the URL bar
   * to e.g. /supervisors. Middleware rewrites /supervisors → / so the page
   * still serves the same landing page on refresh.
   */
  const sectionRoutes: Record<string, string> = {
    features: "/features",
    "how-it-works": "/how-it-works",
    about: "/about",
    supervisors: "/supervisors",
  };

  const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const path = sectionRoutes[id] ?? "/";
    window.history.pushState(null, "", path);
  };

  // On first paint, if we landed at /features /supervisors etc, scroll there.
  useEffect(() => {
    const path = window.location.pathname;
    const id = Object.entries(sectionRoutes).find(([, p]) => p === path)?.[0];
    if (id) {
      // small delay so layout is ready before scrolling
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Reveal-on-scroll observer.
   * Adds .is-visible to elements with .reveal or .reveal-stagger
   * the first time they enter the viewport. Once revealed, they
   * stay revealed (we unobserve after firing).
   */
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* ───────────────────────── Navigation ───────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.replaceState(null, "", "/");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center space-x-3 group"
              aria-label="SmartAgri home"
            >
              <div className="w-11 h-11 bg-[#2E8B57] rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                {/* Leaf-with-circuit logo: organic leaf shape + tech node accent */}
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-2.66 15.4-8.2 17.04Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6" />
                  <circle cx="14.5" cy="9.5" r="1.2" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className={`text-xl font-extrabold tracking-tight ${scrolled ? "text-gray-900" : "text-white"}`}>SmartAgri</div>
                <div className={`text-[11px] tracking-wide ${scrolled ? "text-gray-500" : "text-white/70"}`}>Smart Agriculture IoT</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-10">
              <a href="/features" onClick={scrollToId("features")} className={`text-base font-semibold transition-colors ${scrolled ? "text-gray-700 hover:text-gray-900" : "text-white/85 hover:text-white"}`}>Features</a>
              <a href="/how-it-works" onClick={scrollToId("how-it-works")} className={`text-base font-semibold transition-colors ${scrolled ? "text-gray-700 hover:text-gray-900" : "text-white/85 hover:text-white"}`}>How It Works</a>
              <a href="/about" onClick={scrollToId("about")} className={`text-base font-semibold transition-colors ${scrolled ? "text-gray-700 hover:text-gray-900" : "text-white/85 hover:text-white"}`}>About</a>
              <a href="/supervisors" onClick={scrollToId("supervisors")} className={`text-base font-semibold transition-colors ${scrolled ? "text-gray-700 hover:text-gray-900" : "text-white/85 hover:text-white"}`}>Supervisors</a>
              <Link href="/login" className="px-7 py-2.5 bg-[#2E8B57] text-white text-base font-bold rounded-full hover:bg-[#256d44] transition-colors shadow-lg">
                Get Started
              </Link>
            </div>

            <Link href="/login" className="md:hidden px-5 py-2 bg-[#2E8B57] text-white font-bold rounded-full hover:bg-[#256d44] transition-colors text-sm">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative h-screen flex items-center px-4 lg:px-8 overflow-hidden">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/hero6.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Strong left-to-right dark gradient — text readable on left,
              image vivid on the right (matches reference style) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
          {/* Soft top + bottom darkening for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        </div>

        {/* Foreground content */}
        <div className="container mx-auto relative z-10 pt-24 pb-20">
          <div className="max-w-2xl">
            {/* small category label */}
            <div className="hero-fade-up flex items-center gap-2 mb-6" style={{ animationDelay: "0.2s" }}>
              <svg className="w-5 h-5 text-[#3FAE6F]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
              </svg>
              <span className="text-[#3FAE6F] font-semibold tracking-wide uppercase text-sm">
                Smart Agriculture &amp; IoT
              </span>
            </div>

            <h1
              className="hero-fade-up text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6"
              style={{ animationDelay: "0.55s" }}
            >
              Monitor Your Farm
              <br />
              <span className="text-[#3FAE6F]">in Real-Time</span> with Us
            </h1>

            <p
              className="hero-fade-up text-lg text-white/85 leading-relaxed mb-8 max-w-xl"
              style={{ animationDelay: "1.1s" }}
            >
              Professional IoT agriculture platform combining ESP32 sensors, machine learning models,
              and real-time analytics for data-driven farming decisions across Nepal.
            </p>

            <div
              className="hero-fade-up flex flex-wrap gap-4 mb-12"
              style={{ animationDelay: "1.5s" }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#2E8B57] hover:bg-[#256d44] text-white font-semibold rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                Start Monitoring
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </Link>
              <a
                href="/how-it-works"
                onClick={scrollToId("how-it-works")}
                className="inline-flex items-center px-8 py-4 text-white border-2 border-white/40 hover:bg-white/10 rounded-full transition-all font-medium"
              >
                Learn More
              </a>
            </div>

            {/* stat pills row */}
            <div
              className="hero-fade-up grid grid-cols-3 gap-6 max-w-lg"
              style={{ animationDelay: "1.85s" }}
            >
              <div>
                <div className="text-3xl font-bold text-white">98%</div>
                <div className="text-xs text-white/70 uppercase tracking-wider mt-1">ML Accuracy</div>
              </div>
              <div className="border-l border-white/20 pl-6">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-xs text-white/70 uppercase tracking-wider mt-1">Monitoring</div>
              </div>
              <div className="border-l border-white/20 pl-6">
                <div className="text-3xl font-bold text-white">18</div>
                <div className="text-xs text-white/70 uppercase tracking-wider mt-1">Crops</div>
              </div>
            </div>
          </div>

          {/* hero is now clean — feature pills moved to the Live Dashboard section */}
        </div>
      </section>

      {/* ───────────────────────── Live Dashboard preview ───────────────────────── */}
      <section className="min-h-screen flex items-center py-24 px-4 lg:px-8 bg-white relative overflow-hidden">
        {/* subtle ambient backdrop */}
        <div className="absolute inset-0 -z-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#2E8B57]/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#2E8B57]/5 blur-3xl" />
        </div>

        <div className="container mx-auto relative max-w-7xl">
          <div className="reveal text-center mb-10 max-w-3xl mx-auto">
            <span className="inline-block px-3 py-1 bg-[#2E8B57]/10 text-[#2E8B57] rounded text-xs font-bold tracking-wide uppercase mb-4 border border-[#2E8B57]/20">
              Live Dashboard
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Everything you need at a glance
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              Real-time sensor readings, ML recommendations, and analytics in one place.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Tilted dashboard mockup — left column */}
            <div
              className="reveal lg:col-span-9 relative"
              style={{ perspective: "1800px" }}
            >
              <div className="absolute -inset-x-12 -bottom-10 h-40 bg-[#2E8B57]/15 blur-3xl rounded-full" />

              <div
                className="relative transition-transform duration-700 ease-out hover:[transform:rotateX(2deg)_rotateY(-3deg)_scale(1.01)]"
                style={{
                  transform: "rotateX(8deg) rotateY(-12deg) rotateZ(1deg)",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                }}
              >
                <Image
                  src="/dashboard.png"
                  alt="SmartAgri Dashboard"
                  width={1400}
                  height={900}
                  className="rounded-2xl shadow-2xl border border-gray-200 w-full h-auto"
                  priority
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating live metric cards (kept — they belong on the dashboard preview) */}
              <div className="floating-card absolute -left-4 top-1/4 bg-white rounded-xl shadow-xl px-4 py-3 border border-gray-100 hidden lg:block">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2E8B57] animate-pulse" />
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Soil Moisture</div>
                </div>
                <div className="text-xl font-bold text-[#2E8B57]">82.1%</div>
              </div>

              <div className="floating-card-delayed absolute -right-4 top-1/3 bg-white rounded-xl shadow-xl px-4 py-3 border border-gray-100 hidden lg:block">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Temperature</div>
                </div>
                <div className="text-xl font-bold text-orange-600">26.4°C</div>
              </div>

              <div className="floating-card-slow absolute -left-6 bottom-1/4 bg-white rounded-xl shadow-xl px-4 py-3 border border-gray-100 hidden lg:block">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">NPK Status</div>
                </div>
                <div className="text-xl font-bold text-blue-600">Good</div>
              </div>
            </div>

            {/* Right column — three 3D floating icon orbs (no cards) */}
            <div className="reveal-stagger lg:col-span-3 flex lg:flex-col gap-8 items-center justify-center">
              {[
                {
                  title: "Healthy Soil",
                  sub: "NPK · pH · moisture",
                  icon: (
                    <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-2.66 15.4-8.2 17.04Z" />
                      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
                    </svg>
                  ),
                  delay: "0s",
                },
                {
                  title: "Smart Irrigation",
                  sub: "Crop-aware",
                  icon: (
                    <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
                    </svg>
                  ),
                  delay: "0.6s",
                },
                {
                  title: "AI Advisor",
                  sub: "Bilingual EN · NP",
                  icon: (
                    <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <circle cx="12" cy="5" r="2" />
                      <path d="M12 7v4" />
                      <line x1="8" y1="16" x2="8" y2="16" />
                      <line x1="16" y1="16" x2="16" y2="16" />
                    </svg>
                  ),
                  delay: "1.2s",
                },
              ].map((f) => (
                <div key={f.title} className="text-center group">
                  <div
                    className="orb-3d w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#3FAE6F] to-[#1f6940] flex items-center justify-center shadow-2xl ring-4 ring-[#2E8B57]/10 transition-transform duration-500 group-hover:scale-110"
                    style={{ animationDelay: f.delay }}
                  >
                    {f.icon}
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-3">{f.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Features ───────────────────────── */}
      <section id="features" className="min-h-screen flex items-center py-16 bg-gray-50 px-4 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="reveal text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Complete Agriculture Monitoring System
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to monitor, analyze, and optimize your farm operations
            </p>
          </div>

          <div className="reveal-stagger grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Real-time Monitoring",
                desc: "ESP32 sensors track temperature, humidity, soil moisture, pH, and NPK levels continuously",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                color: "green"
              },
              {
                title: "ML Crop Analysis",
                desc: "SwiFT transformer predicts optimal crops with 77% accuracy across 18 Nepal-specific varieties",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                color: "blue"
              },
              {
                title: "Smart Irrigation",
                desc: "TTL model recommends precise irrigation timing with 98.5% accuracy and crop-aware scheduling",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ),
                color: "purple"
              },
              {
                title: "Soil & Fertilizer",
                desc: "TabNet analyzes soil fertility and suggests optimal fertilizers with 98% accuracy using LIME explainability",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                ),
                color: "orange"
              },
              {
                title: "Weather Integration",
                desc: "Real-time weather data from OpenWeatherMap with 10-minute caching for your district",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ),
                color: "sky"
              },
              {
                title: "AI Advisor",
                desc: "Gemini AI provides bilingual farming advice in English and Nepali with offline template fallback",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                ),
                color: "indigo"
              },
              {
                title: "Analytics Dashboard",
                desc: "Comprehensive daily and weekly summaries with trend visualization and historical data analysis",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                ),
                color: "teal"
              },
              {
                title: "PDF Reports",
                desc: "Generate detailed farm reports with sensor data, recommendations, and actionable insights",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                color: "pink"
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="feature-card bg-white p-6 rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  transform: hoveredCard === i ? 'translateY(-8px) rotateX(5deg)' : 'translateY(0) rotateX(0)',
                }}
              >
                <div className={`w-12 h-12 bg-${feature.color}-100 rounded-lg flex items-center justify-center text-${feature.color}-600 mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── How It Works ───────────────────────── */}
      <section id="how-it-works" className="min-h-screen flex items-center py-16 px-4 lg:px-8 bg-gray-50">
        <div className="container mx-auto max-w-7xl pt-12">
          <div className="reveal text-center mb-10">
            <span className="inline-block px-3 py-1 bg-[#2E8B57]/10 text-[#2E8B57] rounded text-xs font-bold tracking-wide uppercase mb-4 border border-[#2E8B57]/20">
              Architecture &amp; Stack
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              How SmartAgri Works
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              A three-layer architecture connecting field sensors to AI-driven decisions on a clean dashboard.
            </p>
          </div>

          <div className="reveal-stagger grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                num: "01",
                title: "IoT Hardware",
                role: "Edge devices",
                desc: "ESP32 microcontrollers running MicroPython collect soil moisture, pH, NPK, temperature and humidity, streaming readings over MQTT.",
                stack: ["ESP32", "MicroPython 1.23", "Mosquitto MQTT", "DHT22 · NPK · pH"],
              },
              {
                num: "02",
                title: "ML Backend",
                role: "Brains of the system",
                desc: "FastAPI ingests sensor data, runs PyTorch models for crop, irrigation and fertilizer prediction, and stores everything in MongoDB Atlas.",
                stack: ["FastAPI 0.115", "PyTorch 2.10", "TabNet · SwiFT · TTL", "Express + JWT", "MongoDB Atlas"],
              },
              {
                num: "03",
                title: "Dashboard",
                role: "What the farmer sees",
                desc: "Next.js renders real-time charts, ML recommendations and bilingual Gemini advice, with one-click PDF report export.",
                stack: ["Next.js 16", "TypeScript", "Tailwind 4 · shadcn/ui", "Recharts", "Docker · CI/CD"],
              },
            ].map((layer) => (
              <div
                key={layer.num}
                className="relative bg-white rounded-2xl border border-gray-200 p-7 lg:p-8 hover:border-[#2E8B57] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-5">
                  <span className="text-6xl lg:text-7xl font-bold text-[#2E8B57]/15 leading-none">{layer.num}</span>
                  <span className="text-[10px] font-bold text-[#2E8B57] uppercase tracking-wider bg-[#2E8B57]/10 px-3 py-1.5 rounded-full">
                    {layer.role}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{layer.title}</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-5">{layer.desc}</p>
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Built with</div>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.stack.map((s) => (
                      <span
                        key={s}
                        className="text-xs font-medium px-2.5 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── About / Project ───────────────────────── */}
      <section id="about" className="min-h-screen flex items-center py-16 px-4 lg:px-8 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="reveal text-center mb-10">
            <span className="inline-block px-3 py-1 bg-[#2E8B57]/10 text-[#2E8B57] rounded text-xs font-bold tracking-wide uppercase mb-4 border border-[#2E8B57]/20">
              About the Project
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              A Major Project in Computer Engineering
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              SmartAgri is the final-year major project of Bachelor of Computer Engineering students at
              Far Western University, Mahendranagar, Nepal.
            </p>
          </div>

          <div className="reveal-stagger grid lg:grid-cols-5 gap-8 items-stretch">
            {/* Project story */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-7 md:p-8 hover:border-[#2E8B57]/40 hover:shadow-xl transition-all">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Our Story</h3>
              <div className="space-y-3 text-sm md:text-base text-gray-600 leading-relaxed">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                  fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                  culpa qui officia deserunt mollit anim id est laborum.
                </p>
                <p>
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
                  doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
                  veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#2E8B57]">2025</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Started</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#2E8B57]">9</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Phases</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#2E8B57]">3</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">ML Models</div>
                </div>
              </div>
            </div>

            {/* Knowledge applied */}
            <div className="lg:col-span-2 bg-[#2E8B57] rounded-2xl p-7 md:p-8 text-white shadow-xl flex flex-col">
              <h3 className="text-xl md:text-2xl font-bold mb-2">Knowledge Applied</h3>
              <p className="text-sm text-white/85 mb-5 leading-relaxed">
                Every layer of SmartAgri leans on coursework we have actually studied:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Computer Networks", note: "MQTT · TCP/IP · HTTP" },
                  { label: "Cloud Computing", note: "AWS · MongoDB Atlas" },
                  { label: "Embedded & Distributed", note: "ESP32 · MicroPython" },
                  { label: "Digital Logic", note: "Sensor interfacing · GPIO" },
                  { label: "Artificial Intelligence", note: "PyTorch · SwiFT · TabNet" },
                  { label: "IoT Systems", note: "End-to-end pipeline" },
                  { label: "Database Systems", note: "MongoDB · indexes · TTL" },
                  { label: "Software Engineering", note: "Docker · CI/CD" },
                ].map((item) => (
                  <span
                    key={item.label}
                    title={item.note}
                    className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-medium text-white hover:bg-white/20 transition-colors cursor-default"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-5 text-xs font-medium text-white/75 border-t border-white/25">
                These are some subject that we studied during academics that helped us.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Supervisors (final page) ───────────────────────── */}
      <section id="supervisors" className="min-h-screen flex flex-col bg-gray-50 px-4 lg:px-8">
        <div className="container mx-auto max-w-6xl w-full flex-1 flex flex-col justify-center pt-24 pb-6 gap-8">
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-[#2E8B57]/10 text-[#2E8B57] rounded text-[10px] font-bold tracking-wide uppercase mb-3 border border-[#2E8B57]/20">
              Project Supervisors
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Under Whose Guidance This Project Was Built
            </h2>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              Their mentorship shaped both the technical direction and the engineering rigor of SmartAgri.
            </p>
          </div>

          {/* Supervisor cards — bigger gap between them, slightly wider container */}
          <div className="reveal-stagger grid sm:grid-cols-2 gap-10 max-w-4xl mx-auto w-full">
            {[
              {
                name: "Er. Birendra Singh Dhami",
                role: "Project Supervisor",
                photo: "/supervisors/birendra.jpg",
                initials: "BD",
                imgScale: 1, // default
                imgPosition: "center 25%",
              },
              {
                name: "Er. Kamal Lekhak",
                role: "Project Supervisor",
                photo: "/supervisors/kamal.jpg",
                initials: "KL",
                imgScale: 0.78, // zoomed out — show more of the photo
                imgPosition: "center 35%",
              },
            ].map((sup) => (
              <div
                key={sup.name}
                className="bg-white rounded-xl border border-gray-200 hover:border-[#2E8B57] hover:shadow-lg transition-all overflow-hidden group"
              >
                <div className="relative w-full aspect-[2/1] bg-gradient-to-br from-[#2E8B57]/20 to-[#2E8B57]/5 overflow-hidden">
                  <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-[#2E8B57]/30 select-none">
                    {sup.initials}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sup.photo}
                    alt={sup.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{
                      objectPosition: sup.imgPosition,
                      transform: `scale(${sup.imgScale})`,
                    }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>

                <div className="p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-0.5">{sup.name}</h3>
                  <p className="text-xs text-[#2E8B57] font-semibold mb-1.5">{sup.role}</p>
                  <div className="flex items-start gap-1.5 text-[11px] text-gray-500 leading-snug">
                    <svg className="w-3 h-3 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    <span>Department of Engineering · Far Western University</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Acknowledgments — compact under cards */}
          <div className="reveal bg-[#2E8B57] rounded-xl p-5 text-white shadow-xl max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-2.5">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <h3 className="text-lg font-bold">Acknowledgments</h3>
            </div>
            <p className="text-xs md:text-sm text-white/90 leading-relaxed mb-2">
              We are deeply grateful to{" "}
              <span className="font-semibold text-white">Er. Birendra Singh Dhami</span> and{" "}
              <span className="font-semibold text-white">Er. Kamal Lekhak</span> for their guidance,
              patience, and technical mentorship throughout the development of this project.
            </p>
            <p className="text-xs md:text-sm text-white/90 leading-relaxed">
              Special thanks to{" "}
              <span className="font-semibold text-white">Er. Toran Prasad Bhatt</span> and{" "}
              <span className="font-semibold text-white">Er. Kishan Datta Bhatta</span>, and the
              entire{" "}
              <span className="font-semibold text-white">Department of Computer Engineering, Far Western University</span>
              {" "}for their continued support and creating an environment where projects like this become possible.
            </p>
            <div className="mt-2.5 pt-2 text-[11px] font-medium text-white/80 border-t border-white/25">
              Bachelor of Computer Engineering · 2025
            </div>
          </div>
        </div>

        {/* ── Footer is now part of the same viewport, sits at the bottom of supervisors page ── */}
        <footer className="border-t border-gray-200 py-4 px-4 lg:px-8 bg-white/50">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-[#2E8B57] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-2.66 15.4-8.2 17.04Z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900">SmartAgri IoT</span>
              </div>
              <p className="text-xs text-gray-600">
                Academic Project • Far Western University, Nepal
              </p>
            </div>
          </div>
        </footer>
      </section>

      <style jsx>{`
        /* Always-on 3D perspective tilt for the dashboard */
        .perspective {
          perspective: 1800px;
        }

        .dashboard-tilt {
          transform: rotateX(8deg) rotateY(-12deg) rotateZ(1deg);
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .dashboard-tilt:hover {
          transform: rotateX(2deg) rotateY(-3deg) rotateZ(0deg) scale(1.02);
        }

        /* Legacy alias kept in case anything still references it */
        .dashboard-3d {
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }
        .dashboard-3d:hover {
          transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) rotateY(0deg); }
          50% { transform: translateY(-10px) rotateY(8deg); }
        }

        .orb-3d {
          animation: orbFloat 4s ease-in-out infinite;
          will-change: transform;
        }

        .floating-card {
          animation: float 3.4s ease-in-out infinite;
        }

        .floating-card-delayed {
          animation: float 3.6s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .floating-card-slow {
          animation: float 4.2s ease-in-out infinite;
          animation-delay: 1.2s;
        }

        .feature-card {
          transform-style: preserve-3d;
          transition: all 0.3s ease;
        }

        .tech-card {
          transform-style: preserve-3d;
          transition: all 0.3s ease;
        }

        .tech-card:hover {
          transform: perspective(1000px) translateY(-5px) rotateX(5deg);
        }

        @media (max-width: 1023px) {
          .dashboard-tilt {
            transform: none;
          }
        }

        @media (max-width: 768px) {
          .floating-card,
          .floating-card-delayed,
          .floating-card-slow {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
