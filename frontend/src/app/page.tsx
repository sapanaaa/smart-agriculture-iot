"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">SmartAgri</div>
                <div className="text-xs text-gray-500">Smart Agriculture IoT</div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#technology" className="text-gray-600 hover:text-gray-900 transition-colors">Technology</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
              <Link href="/login" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                Get Started
              </Link>
            </div>

            <Link href="/login" className="md:hidden px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 lg:px-8">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700">
                IoT-Powered Agriculture Platform
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Monitor Your Farm in Real-Time with AI
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed">
                Professional IoT agriculture system combining ESP32 sensors, machine learning models,
                and real-time analytics for data-driven farming decisions.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/login" className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl font-medium">
                  Start Monitoring
                </Link>
                <a href="#how-it-works" className="px-8 py-4 bg-white text-gray-900 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all font-medium">
                  Learn More
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">98%</div>
                  <div className="text-sm text-gray-600">ML Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">24/7</div>
                  <div className="text-sm text-gray-600">Monitoring</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">18</div>
                  <div className="text-sm text-gray-600">Nepal Crops</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="dashboard-3d">
                <Image
                  src="/dashboard.png"
                  alt="SmartAgri Dashboard"
                  width={800}
                  height={600}
                  className="rounded-xl shadow-2xl"
                  priority
                />
              </div>

              {/* Floating metric cards */}
              <div className="floating-card absolute -left-4 top-1/4 bg-white rounded-lg shadow-xl p-4 border border-gray-200 hidden lg:block">
                <div className="text-sm text-gray-600 mb-1">Soil Moisture</div>
                <div className="text-2xl font-bold text-green-600">82.1%</div>
                <div className="text-xs text-green-600 mt-1">Optimal</div>
              </div>

              <div className="floating-card-delayed absolute -right-4 top-1/3 bg-white rounded-lg shadow-xl p-4 border border-gray-200 hidden lg:block">
                <div className="text-sm text-gray-600 mb-1">Temperature</div>
                <div className="text-2xl font-bold text-orange-600">26.4°C</div>
                <div className="text-xs text-gray-600 mt-1">+2.1°C today</div>
              </div>

              <div className="floating-card-slow absolute -left-8 bottom-1/4 bg-white rounded-lg shadow-xl p-4 border border-gray-200 hidden lg:block">
                <div className="text-sm text-gray-600 mb-1">NPK Status</div>
                <div className="text-2xl font-bold text-blue-600">Good</div>
                <div className="text-xs text-green-600 mt-1">Balanced</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 px-4 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Complete Agriculture Monitoring System
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to monitor, analyze, and optimize your farm operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How SmartAgri Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three-layer architecture for reliable farm monitoring
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="tech-card text-center p-8 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 transition-all">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">IoT Hardware Layer</h3>
              <p className="text-gray-600 mb-4">ESP32 with MicroPython, DHT22, soil moisture, pH, and NPK sensors transmit via MQTT</p>
              <div className="text-sm text-gray-500">Mosquitto • ESP32 • MQTT Protocol</div>
            </div>

            <div className="tech-card text-center p-8 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ML Backend Layer</h3>
              <p className="text-gray-600 mb-4">PyTorch models analyze data: SwiFT for crops, TTL for irrigation, TabNet for soil and fertilizer</p>
              <div className="text-sm text-gray-500">FastAPI • PyTorch • MongoDB Atlas</div>
            </div>

            <div className="tech-card text-center p-8 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-500 transition-all">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard Layer</h3>
              <p className="text-gray-600 mb-4">Next.js dashboard with real-time charts, recommendations, AI advice, and PDF export</p>
              <div className="text-sm text-gray-500">Next.js 16 • TypeScript • Tailwind CSS</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="technology" className="py-20 bg-gray-50 px-4 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Technology Stack
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Backend & ML</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Python FastAPI 0.115.5 + Uvicorn</div>
                <div>• PyTorch 2.10 (SwiFT, TTL, TabNet)</div>
                <div>• scikit-learn 1.5 + LIME + SHAP</div>
                <div>• Node.js Express 5 + JWT auth</div>
                <div>• MongoDB Atlas (Motor + Mongoose)</div>
                <div>• MQTT Mosquitto broker</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Frontend & DevOps</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Next.js 16 + TypeScript</div>
                <div>• NextAuth 5 (email magic links)</div>
                <div>• Tailwind CSS 4 + shadcn/ui</div>
                <div>• Recharts for data visualization</div>
                <div>• Docker Compose deployment</div>
                <div>• xhtml2pdf for report generation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-green-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Monitor Your Farm?
            </h2>
            <p className="text-lg mb-8 text-green-100 max-w-2xl mx-auto">
              Join farmers using AI and IoT technology for data-driven agriculture.
              Built for Nepal&apos;s diverse agricultural landscape.
            </p>
            <Link href="/login" className="inline-block px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-bold shadow-lg">
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4 lg:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">SmartAgri IoT</span>
            </div>
            <p className="text-sm text-gray-600">
              Academic Project • Far Western University, Nepal
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .dashboard-3d {
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }
        .dashboard-3d:hover {
          transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .floating-card {
          animation: float 3s ease-in-out infinite;
        }

        .floating-card-delayed {
          animation: float 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .floating-card-slow {
          animation: float 4s ease-in-out infinite;
          animation-delay: 1s;
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
