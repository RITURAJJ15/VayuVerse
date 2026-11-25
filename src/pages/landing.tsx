import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Wind,
  Calendar,
  Navigation,
  Home,
  Leaf,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Compass,
  Layers,
  Activity,
  Heart,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApprovedVayuMark } from "@/components/layout/sidebar";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuth } from "@/context/auth-context";
import { useLocationState } from "@/context/location-context";
import { NatureSoundControl } from "@/components/landing/nature-sound-control";

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentLocation } = useLocationState();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(() => {
    const state = location.state as { openAuth?: boolean } | null;
    return Boolean(state?.openAuth);
  });

  // Manage HTML5 Video background lifecycle (reduced motion + visibility handling)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check prefers-reduced-motion: if active, keep video paused (displays poster)
    const isReducedMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    if (isReducedMotion) {
      video.pause();
    }

    // Pause video when browser tab is hidden to conserve battery/GPU; resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else if (!isReducedMotion) {
        void video.play().catch(() => {
          // Ignore transient autoplay errors if any
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handlePrimaryAction = () => {
    if (user) {
      if (currentLocation) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleSmoothScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] text-[#202820] flex flex-col overflow-x-hidden selection:bg-[#DCE8D5] selection:text-[#244936]">
      {/* 1. Cinematic Video Background Hero Container */}
      <div className="relative overflow-hidden min-h-[94vh] sm:min-h-screen flex flex-col justify-between">
        {/* HTML5 Ambient Nature Background Video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline

          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          aria-hidden="true"
        >
          <source src="/video/landing%20video.mp4" type="video/mp4" />
          <source src="/video/landing video.mp4" type="video/mp4" />
        </video>

        {/* Subtle Atmospheric Wash Overlay to ensure editorial contrast & legibility */}
        <div
          className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-white/25 via-transparent to-[#F7F7F0]"
          aria-hidden="true"
        />

        {/* 1.1 Floating Translucent Navigation Bar (Matching Reference Mockup) */}
        <header className="sticky top-3 sm:top-5 z-40 w-full px-4 sm:px-8">
          <div className="mx-auto max-w-6xl rounded-full bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(36,73,54,0.08)] py-2.5 px-5 sm:px-7 flex items-center justify-between transition-all">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-[#DCE8D5]/80 text-[#1b3b2b] flex items-center justify-center transition-transform group-hover:scale-105">
                <ApprovedVayuMark className="h-4.5 w-4.5 text-[#1b3b2b]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#1b3b2b] leading-tight">
                  VayuVerse
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#526B4B]">
                  Atmospheric Wellness
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav
              className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#526B4B]"
              aria-label="Landing Navigation"
            >
              <button
                onClick={() => handleSmoothScroll("why-vayuverse")}
                className="hover:text-[#1b3b2b] transition-colors cursor-pointer"
              >
                Why VayuVerse
              </button>
              <button
                onClick={() => handleSmoothScroll("features")}
                className="hover:text-[#1b3b2b] transition-colors cursor-pointer"
              >
                Your Companion
              </button>
              <button
                onClick={() => handleSmoothScroll("how-it-works")}
                className="hover:text-[#1b3b2b] transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => handleSmoothScroll("environmental-science")}
                className="hover:text-[#1b3b2b] transition-colors cursor-pointer"
              >
                Real Intelligence
              </button>
              <Link
                to="/methodology"
                className="hover:text-[#1b3b2b] transition-colors"
              >
                Methodology
              </Link>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <Button
                  onClick={handlePrimaryAction}
                  className="rounded-full bg-[#1b3b2b] hover:bg-[#12281d] text-white text-xs font-bold px-5 py-2 shadow-sm transition-all"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="hidden sm:inline-flex text-xs font-semibold text-[#1b3b2b] hover:text-[#12281d] hover:underline px-2.5 py-1.5 cursor-pointer"
                  >
                    Sign In
                  </button>
                  <Button
                    onClick={handlePrimaryAction}
                    className="rounded-full bg-[#1b3b2b] hover:bg-[#12281d] text-white text-xs font-bold px-5 py-2 shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 1.2 Two-Column Cinematic Hero Main Body */}
        <section className="relative flex-1 flex items-center pt-8 pb-14 sm:pt-12 sm:pb-20">
          <div className="mx-auto max-w-7xl w-full px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center relative z-20">
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-7 space-y-7 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-[#1b3b2b] shadow-2xs">
                <Leaf className="h-3.5 w-3.5 text-[#526B4B]" />
                <span>Conscious Atmospheric Living</span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-serif-editorial font-bold tracking-tight text-[#1b3b2b] leading-[1.08] drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
                  Breathe better. <br />
                  <span className="italic font-normal text-[#244936] inline-flex items-center gap-3">
                    Live closer to nature.
                    <Leaf className="inline-block h-8 w-8 text-[#526b4b] stroke-[1.5] -rotate-45" />
                  </span>
                </h1>
                <p className="max-w-xl text-base sm:text-lg text-[#2d4734] font-medium leading-relaxed drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                  Understand the air around you, plan your day with confidence, and make everyday choices that feel better for you and the planet.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
                <Button
                  onClick={handlePrimaryAction}
                  className="rounded-full bg-[#1b3b2b] hover:bg-[#12281d] text-white font-bold text-sm px-8 py-6 shadow-lg shadow-[#1b3b2b]/20 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <button
                  type="button"
                  onClick={() => handleSmoothScroll("why-vayuverse")}
                  className="inline-flex items-center justify-center rounded-full border border-white/80 hover:border-[#1b3b2b] bg-white/80 hover:bg-white text-[#1b3b2b] text-sm font-semibold px-7 py-4 shadow-sm backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span>Discover VayuVerse</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-[#526B4B]" />
                </button>
              </div>

              {/* Scientific Credentials Pill Bar */}
              <div className="pt-3 flex flex-wrap items-center gap-6 text-xs text-[#244936] font-semibold border-t border-white/60 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-[#244936]" />
                  <span>Verified CAAQMS Sensors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-[#244936]" />
                  <span>Diurnal Atmospheric Pacing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#244936]" />
                  <span>Zero Synthetic Values</span>
                </div>
              </div>
            </div>

            {/* Right Column: Atmospheric Information Card (Matching Reference Mockup) */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md rounded-3xl bg-white/75 sm:bg-white/85 backdrop-blur-xl border border-white/70 p-7 sm:p-8 shadow-2xl flex flex-col justify-between overflow-hidden">
                {/* Card Top: Sparkle Emblem & Philosophy Quote */}
                <div className="space-y-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-[#1b3b2b] text-[#F7F7F0] flex items-center justify-center shadow-md">
                    <Sparkles className="h-5 w-5 text-[#DCE8D5]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b3b2b] leading-snug">
                    “Every choice shapes the air you take inside.”
                  </div>
                  <p className="text-xs text-[#526B4B] leading-relaxed">
                    Air is not a fixed fate — it shifts by time of day, room ventilation, and your path through the city.
                  </p>
                </div>

                {/* Undulating Atmospheric Rhythm Sine Wave Graph */}
                <div className="py-4 my-2" aria-hidden="true">
                  <svg viewBox="0 0 320 75" className="w-full h-14 overflow-visible" fill="none">
                    <defs>
                      <linearGradient id="rhythm-wave-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#9CBF88" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#DCE8D5" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,50 Q 40,15 80,40 T 160,45 T 240,20 T 320,35 L 320,75 L 0,75 Z"
                      fill="url(#rhythm-wave-grad)"
                    />
                    <path
                      d="M 0,50 Q 40,15 80,40 T 160,45 T 240,20 T 320,35"
                      stroke="#43702a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Footer Metadata & Natural Rhythms Capsule */}
                <div className="space-y-3 pt-3 border-t border-[#D6D6D2]/60">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#8A9085]">Philosophy</span>
                    <span className="text-[#1b3b2b] font-bold">Empirical &amp; Gentle</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/90 border border-white/80 shadow-2xs text-[11px] text-[#526B4B] space-y-1">
                    <div className="font-bold text-[#1b3b2b] flex items-center gap-1.5">
                      <Leaf className="h-3.5 w-3.5 text-[#526B4B]" />
                      <span>Harmonized with natural rhythms</span>
                    </div>
                    <p className="leading-relaxed">
                      Aligning daily tasks with solar convective mixing to minimize urban pollution exposure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 3. SECTION 2: Why VayuVerse? (The Reality of Urban Indian Air) */}
      <section
        id="why-vayuverse"
        className="py-24 bg-white border-y border-[#D6D6D2]/80 scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-12 space-y-16">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#526B4B]">
              <Compass className="h-4 w-4" />
              <span>Understanding the Atmosphere</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#202820]">
              Why VayuVerse?
            </h2>
            <p className="text-sm sm:text-base text-[#526B4B] leading-relaxed">
              Urban air quality in Indian cities fluctuates dramatically through the day. A single number on a widget misses the truth of when and where the air clears.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Story Card 1 */}
            <div className="p-8 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center font-bold text-lg">
                01
              </div>
              <h3 className="text-lg font-bold text-[#202820]">
                Diurnal Boundary Dynamics
              </h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                Cool nighttime air traps particulate matter near the ground. When the sun warms the surface, thermal convection lifts this inversion layer, often creating significantly cleaner windows between midday and late afternoon.
              </p>
            </div>

            {/* Story Card 2 */}
            <div className="p-8 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center font-bold text-lg">
                02
              </div>
              <h3 className="text-lg font-bold text-[#202820]">
                Microenvironment Disparity
              </h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                Being stuck in open traffic on a two-wheeler exposes lungs to concentrated vehicle exhaust, whereas traveling in an air-conditioned metro train or a properly sealed living room dramatically reduces particulate intake.
              </p>
            </div>

            {/* Story Card 3 */}
            <div className="p-8 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center font-bold text-lg">
                03
              </div>
              <h3 className="text-lg font-bold text-[#202820]">
                Practical Daily Agency
              </h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                We replace panic and alarmist headlines with actionable intelligence: timing your outdoor exercise, choosing lower-exposure commute routes, and adopting clean indoor ventilation habits grounded in physics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3: Your Everyday Air Companion (Asymmetric Editorial Layout) */}
      <section
        id="features"
        className="py-24 bg-[#F7F7F0] scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-12 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526B4B]">
              Integrated Feature Suite
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#202820]">
              Your everyday air companion
            </h2>
            <p className="text-sm text-[#526B4B]">
              Five thoughtfully architected modules designed for real daily decisions.
            </p>
          </div>

          <div className="space-y-8">
            {/* Feature 1 & 2: Asymmetric Row (Large Card + Medium Card) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Feature 1: Live Air Quality & CPCB Multi-Pollutant Index (7 cols) */}
              <div className="lg:col-span-7 rounded-3xl border border-[#D6D6D2] bg-white p-8 sm:p-10 shadow-sm space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center">
                    <Wind className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#526B4B]">
                      Continuous Ambient Monitoring
                    </span>
                    <h3 className="text-2xl font-bold text-[#202820]">
                      Real-Time Ground Air Quality
                    </h3>
                    <p className="text-xs sm:text-sm text-[#526B4B] leading-relaxed">
                      Connects directly to verified continuous ambient air quality monitoring stations (CAAQMS) across India. Formulated using the official Central Pollution Control Board (CPCB) NAQI mathematical standard for PM2.5, PM10, NO₂, and secondary criteria gases.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F7F0] border border-[#D6D6D2] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[#8A9085] text-[10px] uppercase">Data Source</div>
                    <div className="font-bold text-[#202820]">CPCB via OpenAQ v3</div>
                  </div>
                  <div>
                    <div className="text-[#8A9085] text-[10px] uppercase">Primary Units</div>
                    <div className="font-bold text-[#202820]">µg/m³ &amp; ppb</div>
                  </div>
                  <div>
                    <div className="text-[#8A9085] text-[10px] uppercase">Synthetics</div>
                    <div className="font-bold text-[#244936]">Strictly Zero</div>
                  </div>
                </div>
              </div>

              {/* Feature 2: Personalized Daily Planner (5 cols) */}
              <div className="lg:col-span-5 rounded-3xl border border-[#D6D6D2] bg-white p-8 sm:p-10 shadow-sm space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#526B4B]">
                      Diurnal Pacing
                    </span>
                    <h3 className="text-xl font-bold text-[#202820]">
                      Personalized Daily Planner
                    </h3>
                    <p className="text-xs text-[#526B4B] leading-relaxed">
                      Translates upcoming 24-hour atmospheric dispersion models into clear time windows. Know exactly when to step outside for exercise and when to shelter indoors.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F7F7F0] border border-[#D6D6D2] text-[11px] text-[#526B4B]">
                  Tailored to Students, Working Professionals, and Seniors without clinical diagnostics.
                </div>
              </div>
            </div>

            {/* Feature 3, 4 & 5: Asymmetric Row (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* Feature 3: Smart Route & Commute Planner */}
              <div className="rounded-3xl border border-[#D6D6D2] bg-white p-8 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-[#202820]">
                    Smart Commute Planning
                  </h3>
                  <p className="text-xs text-[#526B4B] leading-relaxed">
                    Compare driving, walking, cycling, and public transit. Accounts for in-cabin transit filtration factors and calculates real travel carbon emissions using official ARAI emission benchmarks.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-[#244936] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Turn-by-turn road geometry</span>
                </div>
              </div>

              {/* Feature 4: Indoor Air Guardian */}
              <div className="rounded-3xl border border-[#D6D6D2] bg-white p-8 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center">
                    <Home className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-[#202820]">
                    Indoor Air Guardian
                  </h3>
                  <p className="text-xs text-[#526B4B] leading-relaxed">
                    Practical room-by-room blueprint for Indian homes. Room CADR sizing, cooking exhaust recommendations, and conditional window ventilation when outdoor air clears.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-[#244936] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>HEPA sizing &amp; source control</span>
                </div>
              </div>

              {/* Feature 5: Sustainable Impact Tracking */}
              <div className="rounded-3xl border border-[#D6D6D2] bg-white p-8 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-[#202820]">
                    Sustainable Impact Ledger
                  </h3>
                  <p className="text-xs text-[#526B4B] leading-relaxed">
                    An honest, auditable ledger tracking your avoided CO₂ and cumulative inhalation reductions when you switch to cleaner transit or reschedule outdoor exposure.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-[#244936] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Persistent cross-device ledger</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 4: How It Works */}
      <section
        id="how-it-works"
        className="py-24 bg-white border-y border-[#D6D6D2]/80 scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-12 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526B4B]">
              Effortless Onboarding
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#202820]">
              How it works
            </h2>
            <p className="text-sm text-[#526B4B]">
              Four simple steps from unauthenticated guest to personalized atmospheric companion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-10 w-10 rounded-xl bg-[#244936] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-[#202820]">Sign In with Google</h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                One-click secure authentication with Supabase. Keeps your saved routes and impact logs synchronized across all your devices.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-10 w-10 rounded-xl bg-[#244936] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-[#202820]">Choose Lifestyle</h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                Select between Student, Working Professional, or Elderly Person to calibrate diurnal routines, commute preferences, and sensitivity.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-10 w-10 rounded-xl bg-[#244936] text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-[#202820]">Set Your Location</h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                Actively search your Indian city or neighborhood, or use browser GPS. We never silently default to Delhi or any hidden location.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-[#F7F7F0] border border-[#D6D6D2] space-y-4">
              <div className="h-10 w-10 rounded-xl bg-[#244936] text-white flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="text-base font-bold text-[#202820]">Receive Guidance</h3>
              <p className="text-xs text-[#526B4B] leading-relaxed">
                Access your personalized dashboard with live ground observations, commute alternatives, and diurnal exposure pacing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5: Real Environmental Intelligence (Ground vs Forecast Science) */}
      <section
        id="environmental-science"
        className="py-24 bg-[#F7F7F0] scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-12 space-y-12">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526B4B]">
              Scientific Integrity &amp; Transparency
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#202820]">
              Real environmental intelligence
            </h2>
            <p className="text-sm sm:text-base text-[#526B4B] leading-relaxed">
              We believe users deserve total transparency about where numbers come from. VayuVerse strictly distinguishes between empirical ground observations and modelled atmospheric projections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Box A: Ground Observations */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#D6D6D2] space-y-4 shadow-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D5] text-xs font-bold text-[#244936]">
                <Activity className="h-3.5 w-3.5" />
                <span>Observed Physical Measurements</span>
              </div>
              <h3 className="text-xl font-bold text-[#202820]">
                Continuous Ground Monitoring (OpenAQ / CPCB)
              </h3>
              <p className="text-xs sm:text-sm text-[#526B4B] leading-relaxed">
                These represent real physical air samples drawn through automated beta-attenuation monitors (BAM) and chemiluminescence analyzers at certified stations. They represent what people are actively breathing on the street right now.
              </p>
              <ul className="space-y-2 text-xs text-[#526B4B] pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#244936]" />
                  <span>Real physical sensors, not simulations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#244936]" />
                  <span>Includes station attribution and observation timestamp</span>
                </li>
              </ul>
            </div>

            {/* Box B: Modelled Forecasts */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#D6D6D2] space-y-4 shadow-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F7F0] border border-[#D6D6D2] text-xs font-bold text-[#526B4B]">
                <Layers className="h-3.5 w-3.5" />
                <span>Atmospheric Model Projections</span>
              </div>
              <h3 className="text-xl font-bold text-[#202820]">
                Copernicus CAMS Global Atmospheric Model
              </h3>
              <p className="text-xs sm:text-sm text-[#526B4B] leading-relaxed">
                Atmospheric forecasts are computed simulations integrating satellite data, meteorological wind models, and emission inventories over a 40km grid. They project how pollutants disperse over the next 48 hours.
              </p>
              <ul className="space-y-2 text-xs text-[#526B4B] pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#526B4B]" />
                  <span>Honest disclosure: A model is a projection, not a physical sensor</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#526B4B]" />
                  <span>Used to predict boundary layer lift and clean daily windows</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 6: Final CTA */}
      <section className="py-24 bg-[#244936] text-[#F7F7F0] relative overflow-hidden">
        {/* Subtle decorative leaf silhouette in CTA */}
        <div
          className="absolute -right-20 -bottom-20 w-96 h-96 text-[#9CBF88]/10 pointer-events-none"
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M50,5 C25,25 15,60 50,95 C85,60 75,25 50,5 Z" />
          </svg>
        </div>

        <div className="mx-auto max-w-4xl px-6 sm:px-12 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE8D5]/30 bg-[#DCE8D5]/10 px-4 py-1.5 text-xs font-semibold text-[#DCE8D5]">
            <Heart className="h-3.5 w-3.5 text-[#9CBF88]" />
            <span>Gentle, Science-Backed Atmospheric Living</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Make room for better air.
          </h2>

          <p className="max-w-xl mx-auto text-sm sm:text-base text-[#DCE8D5]/80 leading-relaxed">
            Join thousands taking control of urban exposure through transparent scientific telemetry, smarter commute routes, and diurnal awareness.
          </p>

          <div className="pt-2 flex justify-center">
            <Button
              onClick={handlePrimaryAction}
              className="rounded-full bg-[#DCE8D5] hover:bg-[#c8dbbf] text-[#244936] font-bold text-sm px-10 py-6 shadow-xl transition-all cursor-pointer"
            >
              <span>Create Your Account</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* 8. SECTION 7: Footer */}
      <footer className="mt-auto border-t border-[#D6D6D2] bg-white py-14 text-xs text-[#526B4B]">
        <div className="mx-auto max-w-6xl px-6 sm:px-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-4 col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <ApprovedVayuMark className="h-6 w-6 text-[#244936]" />
              <span className="font-bold text-base text-[#244936]">VayuVerse</span>
            </div>
            <p className="text-xs leading-relaxed text-[#8A9085] max-w-sm">
              Personal atmospheric navigation and verified environmental intelligence across Indian cities. Grounded in empirical data and diurnal physics.
            </p>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#202820] uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handlePrimaryAction()}
                  className="hover:text-[#244936] transition-colors cursor-pointer text-left"
                >
                  Overview Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePrimaryAction()}
                  className="hover:text-[#244936] transition-colors cursor-pointer text-left"
                >
                  My Day Planner
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePrimaryAction()}
                  className="hover:text-[#244936] transition-colors cursor-pointer text-left"
                >
                  Smart Route Planner
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePrimaryAction()}
                  className="hover:text-[#244936] transition-colors cursor-pointer text-left"
                >
                  Indoor Air Guardian
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Methodology */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#202820] uppercase tracking-wider text-[11px]">Science</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/methodology" className="hover:text-[#244936] transition-colors">
                  Data Provenance Charter
                </Link>
              </li>
              <li>
                <Link to="/methodology" className="hover:text-[#244936] transition-colors">
                  CPCB NAQI Standards
                </Link>
              </li>
              <li>
                <Link to="/methodology" className="hover:text-[#244936] transition-colors">
                  ARAI Emission Factors
                </Link>
              </li>
              <li>
                <Link to="/impact" className="hover:text-[#244936] transition-colors">
                  Impact Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Ethics */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#202820] uppercase tracking-wider text-[11px]">Ethics &amp; Trust</h4>
            <ul className="space-y-2">
              <li>
                <span className="hover:text-[#244936] cursor-pointer">Privacy &amp; Data Safeguards</span>
              </li>
              <li>
                <span className="hover:text-[#244936] cursor-pointer">Terms of Service</span>
              </li>
              <li>
                <span className="hover:text-[#244936] cursor-pointer">Non-Clinical Disclosure</span>
              </li>
              <li>
                <span className="hover:text-[#244936] cursor-pointer">Contact Support</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 sm:px-12 pt-10 mt-10 border-t border-[#D6D6D2]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8A9085]">
          <div>© {new Date().getFullYear()} VayuVerse. All rights reserved.</div>
          <div>Empirical science • Zero synthetic numbers • Dedicated to public atmospheric literacy.</div>
        </div>
      </footer>

      {/* Ambient Nature Sound Control Toggle */}
      <NatureSoundControl />

      {/* Authentication Dialog */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}
