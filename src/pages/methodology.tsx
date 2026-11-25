import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Database,
  Brain,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
  HeartPulse,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TRANSPORT_EMISSION_FACTORS } from "@/lib/emissions-calculator";
import { useAuth } from "@/context/auth-context";
import { Sidebar, ApprovedVayuMark } from "@/components/layout/sidebar";
import { TopControls } from "@/components/layout/top-controls";
import { AuthModal } from "@/components/auth/auth-modal";

export function SourcesMethodologyPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] overflow-x-hidden">
      {/* 1. AUTHENTICATED DUAL LAYOUT: Fixed Left Sidebar + PageShell Header */}
      {user ? (
        <div className="flex min-h-screen">
          {/* Desktop Fixed Left Sidebar */}
          <div className="hidden md:block fixed inset-y-0 left-0 w-60 z-30">
            <Sidebar className="w-60 h-full" />
          </div>

          {/* Mobile Drawer Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-[#111111]/40 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="relative flex flex-col w-64 max-w-[80%] h-full bg-[#FAFAF8] shadow-xl z-10">
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[#D6D6D2]">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2"
                  >
                    <ApprovedVayuMark className="text-[#111111]" />
                    <span className="font-bold text-lg text-[#111111]">VayuVerse</span>
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-md text-[#111111] hover:bg-[#EDF6D5]"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <Sidebar onNavClick={() => setMobileMenuOpen(false)} className="border-r-0 flex-1" />
              </div>
            </div>
          )}

          {/* Main Area with Desktop Offset */}
          <div className="flex-1 flex flex-col min-w-0 md:pl-60">
            <header className="sticky top-0 z-20 flex h-14 items-center justify-between px-4 sm:px-8 bg-[#FAFAF8]/90 backdrop-blur-xs border-b border-[#D6D6D2]/60">
              <div className="flex items-center gap-3 md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-1.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] hover:bg-[#EDF6D5]"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <Link to="/" className="flex items-center gap-1.5">
                  <ApprovedVayuMark className="text-[#111111]" />
                  <span className="font-bold text-base text-[#111111]">VayuVerse</span>
                </Link>
              </div>
              <div className="hidden md:block" />
              <TopControls />
            </header>

            <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">
              <MethodologyContent />
            </main>
          </div>
        </div>
      ) : (
        /* 2. PUBLIC STANDALONE LAYOUT: Top Public Header + Centered Responsive Container */
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 sm:px-8 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#D6D6D2]">
            <Link to="/" className="flex items-center gap-2.5">
              <ApprovedVayuMark className="text-[#111111]" />
              <span className="text-xl font-bold tracking-tight text-[#111111]">
                VayuVerse
              </span>
              <span className="text-xs text-[#626762] hidden sm:inline-block border-l border-[#D6D6D2] pl-2.5">
                Scientific Transparency Charter
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#626762] hover:text-[#111111] px-3 py-1.5 rounded-full hover:bg-[#EDF6D5]/60 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </Link>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-xs font-semibold px-4 py-2 rounded-full border border-[#D6D6D2] bg-white hover:bg-[#EDF6D5] transition-colors text-[#111111] cursor-pointer"
              >
                Sign In
              </button>
              <Link
                to="/onboarding"
                className="text-xs font-semibold px-4 py-2 rounded-full bg-[#D1EB8F] hover:bg-[#c2e078] transition-colors text-[#111111]"
              >
                Get Started
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-8 py-10 max-w-6xl w-full mx-auto">
            <MethodologyContent />
          </main>

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function MethodologyContent() {
  return (
    <div className="space-y-12 animate-fade-in pb-16">
      {/* Header */}
      <section className="space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#EDF6D5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#285A1D]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D4E]" />
          Scientific Transparency &amp; Data Provenance Charter
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
          Sources &amp; Methodology
        </h1>
        <p className="text-xs sm:text-sm text-[#626762] max-w-3xl leading-relaxed">
          Our engineering charter: complete data provenance, strict separation of observed vs. modeled air quality, zero synthetic readings, deterministic safety guardrails, and evidence-grounded AI interpretation.
        </p>
      </section>

      {/* Main Content Sections */}
      <div className="space-y-12">
        {/* SECTION 1: Core Principles */}
        <section aria-labelledby="section-1-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-1-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 1 — Core Engineering Principles
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
                  <h3 className="text-sm font-bold text-[#111111]">
                    Zero Synthetic Numbers
                  </h3>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  We never simulate, randomize, or invent current AQI or pollutant measurements. If monitoring station data is offline or pending, the system explicitly displays &ldquo;Awaiting verified reading&rdquo; rather than a plausible-looking placeholder.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
                  <h3 className="text-sm font-bold text-[#111111]">
                    Separation of Observed vs. Modeled
                  </h3>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  Modeled forecast projections are always labeled distinctly from physical ground station observations. A model is an atmospheric dispersion simulation, not an in-situ physical sensor reading.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
                  <h3 className="text-sm font-bold text-[#111111]">
                    Deterministic Guardrails First
                  </h3>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  All safety limits (strenuous outdoor restrictions, N95 mandates, window-closing thresholds) are computed deterministically before AI formatting. AI can never relax or override environmental safety boundaries.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
                  <h3 className="text-sm font-bold text-[#111111]">
                    Transparent Uncertainty
                  </h3>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  Every recommendation discloses its evidence source (e.g., ground station name, distance in km, or regional forecast grid cell). If telemetry is stale or delayed, uncertainty is prominently reported.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 2: Data Sources & Provenance */}
        <section aria-labelledby="section-2-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-2-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 2 — Verified Environmental Data Sources &amp; Provenance
            </h2>
          </div>

          <div className="space-y-4">
            {/* OpenAQ */}
            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Database className="h-4 w-4 text-[#111111]" />
                    <h3 className="text-sm font-bold text-[#111111]">
                      OpenAQ API v3 (Continuous Ambient Ground Station Telemetry)
                    </h3>
                  </div>
                  <Badge variant="verified" className="bg-[#EDF6D5] text-[#285A1D] border-[#D1EB8F]">
                    Live Telemetry
                  </Badge>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  OpenAQ aggregates physical ground sensors from governmental monitoring networks across India, including the Central Pollution Control Board (CPCB) and State Pollution Control Boards (SPCBs) through standardized continuous ambient air quality monitoring stations (CAAQMS).
                </p>
                <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] text-xs text-[#626762] flex flex-wrap gap-4">
                  <span><strong>Target Pollutants:</strong> PM2.5, PM10, NO₂, SO₂, CO, Ozone</span>
                  <span><strong>Resolution:</strong> 1-Hour Continuous Station Averages</span>
                  <span><strong>Units:</strong> µg/m³ &amp; ppb</span>
                </div>
              </CardContent>
            </Card>

            {/* Open-Meteo & Copernicus CAMS */}
            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-[#111111]" />
                    <h3 className="text-sm font-bold text-[#111111]">
                      Open-Meteo &amp; Copernicus CAMS Global (Atmospheric Dispersion Projections)
                    </h3>
                  </div>
                  <Badge variant="modeled" className="bg-[#EDF6D5] text-[#111111] border-[#D6D6D2]">
                    Atmospheric Model
                  </Badge>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  Provides 3-day hourly atmospheric dispersion forecasts derived from the European Centre for Medium-Range Weather Forecasts (ECMWF) and the Copernicus Atmosphere Monitoring Service (CAMS Global) domain, alongside high-accuracy Indian geographical search via the Open-Meteo Geocoding API.
                </p>
                <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] text-xs text-[#626762] flex flex-wrap gap-4">
                  <span><strong>Model Domain:</strong> cams_global</span>
                  <span><strong>Grid Resolution:</strong> ~40 km (0.4° global grid)</span>
                  <span><strong>Forecast Horizon:</strong> 72 hours (1-hour step)</span>
                  <span><strong>Projected Parameters:</strong> PM2.5, PM10, Ozone, NO₂, SO₂, Dust</span>
                </div>
              </CardContent>
            </Card>

            {/* OpenRouteService */}
            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Compass className="h-4 w-4 text-[#111111]" />
                    <h3 className="text-sm font-bold text-[#111111]">
                      OpenRouteService (Real-World Road &amp; Transit Routing)
                    </h3>
                  </div>
                  <Badge variant="verified" className="bg-[#EDF6D5] text-[#285A1D] border-[#D1EB8F]">
                    Topological Pathing
                  </Badge>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  Calculates real vehicular and walking trajectories using OpenStreetMap road topologies. Path waypoints are segmented and sampled to compute duration-weighted environmental exposure proxies along actual commuter corridors.
                </p>
              </CardContent>
            </Card>

            {/* Gemini AI */}
            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Brain className="h-4 w-4 text-[#111111]" />
                    <h3 className="text-sm font-bold text-[#111111]">
                      Google Gemini AI (Grounded Reasoning &amp; Presentation Layer)
                    </h3>
                  </div>
                  <Badge variant="softgreen" className="bg-[#EDF6D5] text-[#111111] border-[#D6D6D2]">
                    AI Presentation Layer
                  </Badge>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  Gemini receives pre-computed deterministic constraints and evidence payloads. It formats, personalizes, and enriches human-friendly explanations. If Gemini is unavailable, the deterministic rules engine directly powers the interface with zero loss of scientific accuracy.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 3: Spatial Resolution & Modeling Boundaries */}
        <section aria-labelledby="section-3-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-3-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 3 — Spatial Resolution &amp; Modeling Boundaries
            </h2>
          </div>

          <div className="p-5 rounded-2xl border border-[#D6D6D2] bg-white space-y-3 text-xs text-[#626762]">
            <p className="leading-relaxed">
              <strong>Understanding the ~40 km Grid Cell:</strong> The Copernicus CAMS Global model solves numerical atmospheric equations across approximately 40 × 40 kilometer grid cells. This macro-scale resolution accurately captures regional aerosol transport, wind-driven crop-residue smoke plumes, dust storms, and diurnal atmospheric boundary-layer expansion.
            </p>
            <p className="leading-relaxed">
              <strong>Micro-Scale Limitations:</strong> Regional numerical models cannot resolve hyper-local street canyon turbulence, immediate tailpipe emissions in traffic congestion, or localized biomass burning in residential alleys.
            </p>
            <p className="leading-relaxed">
              <strong>Why VayuVerse Pairs Both:</strong> In VayuVerse, CAMS forecasts guide <em>temporal planning</em> (identifying when daytime solar mixing dilutes regional background smog), while physical OpenAQ/CAAQMS ground sensors provide <em>current localized ground-level truth</em>.
            </p>
          </div>
        </section>

        {/* SECTION 4: Indian National AQI Breakpoints */}
        <section aria-labelledby="section-4-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-4-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 4 — Indian National Air Quality Index (NAQI) Standards
            </h2>
          </div>
          <p className="text-xs text-[#626762]">
            Standardized breakpoints defined by the Central Pollution Control Board (CPCB) of India (2014):
          </p>

          <div className="overflow-x-auto rounded-xl border border-[#D6D6D2] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] text-[#111111] border-b border-[#D6D6D2]">
                <tr>
                  <th className="p-3 font-bold uppercase text-[10px]">NAQI Band</th>
                  <th className="p-3 font-bold uppercase text-[10px]">Index Range</th>
                  <th className="p-3 font-bold uppercase text-[10px]">PM2.5 (24h avg)</th>
                  <th className="p-3 font-bold uppercase text-[10px]">PM10 (24h avg)</th>
                  <th className="p-3 font-bold uppercase text-[10px]">Health Impact Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6D6D2] text-[#626762]">
                <tr>
                  <td className="p-3 font-semibold text-[#2E7D4E]">Good</td>
                  <td className="p-3 font-mono">0 – 50</td>
                  <td className="p-3">0 – 30 µg/m³</td>
                  <td className="p-3">0 – 50 µg/m³</td>
                  <td className="p-3">Minimal impact. Safe for all outdoor activities.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#5A8B35]">Satisfactory</td>
                  <td className="p-3 font-mono">51 – 100</td>
                  <td className="p-3">31 – 60 µg/m³</td>
                  <td className="p-3">51 – 100 µg/m³</td>
                  <td className="p-3">Minor breathing discomfort to sensitive people.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#B8860B]">Moderate</td>
                  <td className="p-3 font-mono">101 – 200</td>
                  <td className="p-3">61 – 90 µg/m³</td>
                  <td className="p-3">101 – 250 µg/m³</td>
                  <td className="p-3">Breathing discomfort to people with lungs, asthma and heart disease.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#C65D28]">Poor</td>
                  <td className="p-3 font-mono">201 – 300</td>
                  <td className="p-3">91 – 120 µg/m³</td>
                  <td className="p-3">251 – 350 µg/m³</td>
                  <td className="p-3">Breathing discomfort to most people on prolonged exposure.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#B93838]">Very Poor</td>
                  <td className="p-3 font-mono">301 – 400</td>
                  <td className="p-3">121 – 250 µg/m³</td>
                  <td className="p-3">351 – 430 µg/m³</td>
                  <td className="p-3">Respiratory illness on prolonged exposure.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#731E1E]">Severe</td>
                  <td className="p-3 font-mono">401 – 500+</td>
                  <td className="p-3">250+ µg/m³</td>
                  <td className="p-3">430+ µg/m³</td>
                  <td className="p-3">Affects healthy people and seriously impacts those with existing conditions.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#626762] italic">
            * Note on Missing Parameters: If official NAQI cannot be calculated due to missing parameters (CPCB requires at least 3 parameters with PM2.5 or PM10), VayuVerse explicitly reports PM2.5 concentration against standard benchmarks and never manufactures a pseudo-AQI.
          </p>
        </section>

        {/* SECTION 5: Route Exposure Calculation Methodology */}
        <section aria-labelledby="section-5-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-5-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 5 — Route Exposure Calculation Methodology
            </h2>
          </div>
          <p className="text-xs text-[#626762] leading-relaxed">
            In Decision Lab, trip routes are evaluated using a duration-weighted concentration-time exposure proxy:
          </p>

          <div className="p-4 rounded-xl border border-[#D6D6D2] bg-white font-mono text-xs text-[#111111] space-y-2">
            <div>
              Exposure Proxy (µg·h/m³) = ∑ [ Segment PM2.5 (µg/m³) × Duration (hours) × Microenvironment Factor ]
            </div>
            <div className="text-[11px] font-sans text-[#626762]">
              <strong>Essential Scientific Boundary:</strong> This is an environmental concentration-time proxy. It is explicitly <em>not</em> an inhaled dose or personal lung deposition metric, which depends on individual respiratory ventilation rate (L/min) and physical exertion.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { mode: "Underground / AC Metro", factor: "0.20", notes: "Substantial air filtration & station platform barriers." },
              { mode: "Car AC (Recirculation)", factor: "0.50", notes: "Vehicle cabin filter active with closed windows." },
              { mode: "Public Bus (Non-AC)", factor: "0.85", notes: "Open windows near traffic tailpipe plume." },
              { mode: "Walking / Two-Wheeler", factor: "1.00", notes: "Direct ambient street-level exposure." },
            ].map((m) => (
              <div key={m.mode} className="p-3.5 rounded-xl border border-[#D6D6D2] bg-white space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-[#111111]">
                  <span>{m.mode}</span>
                  <span className="font-mono text-[#2E7D4E]">{m.factor}×</span>
                </div>
                <p className="text-[11px] text-[#626762]">{m.notes}</p>
              </div>
            ))}
          </div>

          {/* Transport Carbon Emission Factors Table */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Transport Carbon Emission Factors (ARAI / CPCB / India GHG Program)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#D6D6D2] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] text-[#111111] border-b border-[#D6D6D2]">
                  <tr>
                    <th className="p-3 font-bold uppercase text-[10px]">Transport Mode</th>
                    <th className="p-3 font-bold uppercase text-[10px]">Emissions (g CO₂/p-km)</th>
                    <th className="p-3 font-bold uppercase text-[10px]">Source Citation</th>
                    <th className="p-3 font-bold uppercase text-[10px]">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6D6D2] text-[#626762]">
                  {Object.values(TRANSPORT_EMISSION_FACTORS).map((factor) => (
                    <tr key={factor.mode}>
                      <td className="p-3 font-semibold text-[#111111]">{factor.label}</td>
                      <td className="p-3 font-mono font-bold text-[#2E7D4E]">
                        {factor.factorGramsCo2PerPassengerKm} g
                      </td>
                      <td className="p-3 text-[11px]">{factor.source}</td>
                      <td className="p-3 text-[11px]">{factor.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 6: Indoor Air Quality Estimation */}
        <section aria-labelledby="section-6-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-6-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 6 — Indoor Air Quality Estimation &amp; CADR Sizing
            </h2>
          </div>

          <div className="p-5 rounded-2xl border border-[#D6D6D2] bg-white space-y-3 text-xs text-[#626762]">
            <p className="leading-relaxed">
              <strong>Unmeasured Indoor Space:</strong> Indoor air is explicitly unmeasured unless a household operates dedicated physical indoor particle monitors. VayuVerse estimates indoor aerosol ingress using envelope infiltration factors:
            </p>
            <ul className="space-y-1 list-disc pl-5 text-[11px]">
              <li><strong>Sealed / AC Apartment:</strong> Infiltration factor ~0.30× outdoor ambient PM2.5</li>
              <li><strong>Standard Apartment:</strong> Infiltration factor ~0.60× outdoor ambient PM2.5</li>
              <li><strong>Naturally Ventilated / Independent House:</strong> Infiltration factor ~0.85× outdoor ambient PM2.5</li>
            </ul>
            <p className="leading-relaxed">
              <strong>Clean Air Delivery Rate (CADR) Formula:</strong> Mechanical filtration sizing is governed by AHAM and US EPA standards requiring at least 4.5 to 5.0 Air Changes per Hour (ACH) in high-pollution regions:
            </p>
            <div className="p-3 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] font-mono text-[11px] text-[#111111]">
              Required CADR (m³/h) = Room Volume (m³) × Required ACH (4.5) / 1.7
            </div>
            <p className="leading-relaxed">
              <strong>The Houseplant Myth:</strong> Real-world residential air exchange (0.3–1.0 ACH) overwhelms the negligible volatile organic compound (VOC) removal rate of decorative houseplants. A home would require over 500 plants per room to equal a single compact True-HEPA purifier, which creates hazardous fungal mold spores. Houseplants cannot replace mechanical HEPA filtration.
            </p>
          </div>
        </section>

        {/* SECTION 7: Daily Planning Engine */}
        <section aria-labelledby="section-7-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-7-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 7 — Deterministic Daily Planning Engine
            </h2>
          </div>

          <div className="p-5 rounded-2xl border border-[#D6D6D2] bg-white space-y-3 text-xs text-[#626762]">
            <p className="leading-relaxed">
              <strong>Diurnal Curve Scanning:</strong> Rather than assuming afternoon hours are universally cleaner or mornings worse, the daily planning engine evaluates the hourly CAMS forecast curve across all 24 hours of the selected day to find the true lowest PM2.5 window and peak pollution hours.
            </p>
            <p className="leading-relaxed">
              <strong>Lifestyle Personalization:</strong> Recommendations adapt to user lifestyle (student, working professional, senior citizen, parent with children) and routine timings (wake-up time, commute departure, and sleep schedule).
            </p>
            <p className="leading-relaxed">
              <strong>Protective Overrides:</strong> On days when ambient pollution reaches Poor, Very Poor, or Severe (&gt;200 AQI or &gt;120 µg/m³ PM2.5), the engine triggers an automatic protective override: outdoor cardio is canceled, N95 respirators are advised for transit, and residential windows are ordered sealed.
            </p>
          </div>
        </section>

        {/* SECTION 8: Health Guidance Guardrails */}
        <section aria-labelledby="section-8-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-8-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 8 — Health Guidance Guardrails &amp; Medical Boundaries
            </h2>
          </div>

          <div className="rounded-2xl border border-[#D6D6D2] bg-white p-5 space-y-3 text-xs text-[#626762]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#111111]">
              <HeartPulse className="h-4 w-4 text-[#B93838]" />
              <span>Non-Clinical Environmental Information Notice</span>
            </div>
            <p className="leading-relaxed">
              VayuVerse is an environmental navigator and exposure reduction tool. It does <strong>not</strong> provide medical diagnoses, clinical treatment plans, or individualized pharmacological prescriptions.
            </p>
            <p className="leading-relaxed">
              <strong>No Fabricated Reduction Claims:</strong> We never state arbitrary individual risk reduction percentages (such as &ldquo;reduces your lung disease risk by 43%&rdquo;). All comparative figures reference verified engineering benchmarks (e.g. g CO₂/p-km, microenvironment attenuation ratios).
            </p>
            <div className="p-3.5 rounded-xl border border-[#F8B4B4] bg-[#FDF2F2] text-[#991B1B] space-y-1">
              <strong>Emergency Care Advisory:</strong>
              <p className="text-[11px] leading-relaxed">
                If you or a household member experience acute respiratory distress, persistent wheezing, chest tightness, or severe shortness of breath, do not rely on digital applications. Seek immediate emergency medical attention at a hospital or clinic.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 9: Data Freshness, Caching & Fallback Protocols */}
        <section aria-labelledby="section-9-title" className="space-y-4">
          <div className="border-b border-[#D6D6D2]/60 pb-2">
            <h2 id="section-9-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Section 9 — Data Freshness, Caching &amp; Resilient Fallbacks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#111111]">
                  <Clock className="h-4 w-4 text-[#2E7D4E]" />
                  <span>Ground Stations: 1-Hour</span>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  OpenAQ ground monitoring stations report 1-hour continuous averages. If a station has not updated in over 24 hours, the data is tagged as stale.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#111111]">
                  <Layers className="h-4 w-4 text-[#111111]" />
                  <span>CAMS Forecast: 6-Hour</span>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  Atmospheric dispersion models from Copernicus CAMS are synchronized at 6-hour numerical simulation cycles, delivering forward 72-hour trajectories.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#111111]">
                  <AlertTriangle className="h-4 w-4 text-[#B8860B]" />
                  <span>Graceful Degradation</span>
                </div>
                <p className="text-xs text-[#626762] leading-relaxed">
                  If ground stations are unreachable, the system activates Forecast-Only mode with explicit notices. If external AI fails, deterministic rules handle 100% of the workflow.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
