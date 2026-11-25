import { useState } from "react";
import {
  Sparkles,
  CloudSun,
  Shield,
  Clock,
  Navigation,
} from "lucide-react";
import { useLocationState } from "@/context/location-context";
import { useProfileState } from "@/context/profile-context";
import { useForecast } from "@/hooks/use-forecast";
import { useAirQuality } from "@/hooks/use-air-quality";
import {
  INITIAL_SIMULATION_PRESETS,
  evaluateDecisionComparison,
} from "@/lib/decision-lab-engine";
import type {
  DecisionLabScenarioInput,
  SimulationPreset,
} from "@/types/decision-lab";
import { SimulationPresets } from "@/components/decision-lab/simulation-presets";
import { ScenarioControls } from "@/components/decision-lab/scenario-controls";
import { ComparisonCards } from "@/components/decision-lab/comparison-cards";
import { ImpactChart } from "@/components/decision-lab/impact-chart";
import { AiDecisionVerdict } from "@/components/decision-lab/ai-decision-verdict";
import { AssumptionsDrawer } from "@/components/decision-lab/assumptions-drawer";
import { RouteComparisonPanel } from "@/components/decision-lab/route-comparison-panel";

export function DecisionLabPage() {
  const { currentLocation } = useLocationState();
  const { currentProfile } = useProfileState();

  // Mode switcher: "timing_simulation" vs "real_routing"
  const [activeTab, setActiveTab] = useState<"timing_simulation" | "real_routing">(
    "timing_simulation"
  );

  // Retrieve CAMS Global hourly forecast for predicted timing windows
  const { data: forecast } = useForecast(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  // Retrieve verified ground station observation for contextual reference
  const { data: outdoorObservations } = useAirQuality(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  // Active scenario input state
  const [activePresetId, setActivePresetId] = useState<string>(
    INITIAL_SIMULATION_PRESETS[0]?.id || "leave-one-hour-earlier"
  );

  const [scenarioInput, setScenarioInput] = useState<DecisionLabScenarioInput>(() => {
    const initialPreset = INITIAL_SIMULATION_PRESETS[0]!;
    return {
      ...initialPreset.input,
      cityName: currentLocation?.name || "Local Area",
      transportModeA:
        currentProfile.commuteMode === "metro"
          ? "metro"
          : currentProfile.commuteMode === "walk_cycle"
          ? "walk_cycle"
          : "open_two_wheeler",
    };
  });

  const handleSelectPreset = (preset: SimulationPreset) => {
    setActivePresetId(preset.id);
    setScenarioInput({
      ...preset.input,
      cityName: currentLocation?.name || "Local Area",
    });
  };

  // Dynamically resolve city name without cascading render effects
  const activeCityName = currentLocation?.name || scenarioInput.cityName || "Local Area";
  const effectiveScenarioInput = {
    ...scenarioInput,
    cityName: activeCityName,
  };

  // Evaluate comparison
  const comparison = evaluateDecisionComparison(effectiveScenarioInput, forecast);

  const currentPm25Number =
    outdoorObservations?.pm25?.value ||
    forecast?.days?.[0]?.hourly?.[0]?.pm25 ||
    80;

  return (
    <div className="animate-fade-in bg-[#FAFAF8] min-h-[85vh] pb-16">
      {/* Editorial Header */}
      <section className="space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#EDF6D5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111111]">
          <Sparkles className="h-3.5 w-3.5 text-[#111111]" />
          Empirical Exposure &amp; Impact Modeling
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
          What-If Decision Lab
        </h1>
        <p className="text-xs sm:text-sm text-[#626762] max-w-3xl leading-relaxed">
          Explore concrete lifestyle choices and see verified exposure differentials calculated from aerosol physics and CAMS atmospheric modeling in{" "}
          <span className="font-semibold text-[#111111]">{currentLocation?.name || "India"}</span> — never invented numbers or arbitrary health scores.
        </p>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-2 pt-2 border-b border-[#D6D6D2] pb-3" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "timing_simulation"}
            onClick={() => setActiveTab("timing_simulation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "timing_simulation"
                ? "bg-[#D1EB8F] text-[#111111] shadow-2xs"
                : "bg-white text-[#626762] hover:bg-[#EDF6D5]/60 border border-[#D6D6D2]"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Departure &amp; Mode Simulation</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "real_routing"}
            onClick={() => setActiveTab("real_routing")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "real_routing"
                ? "bg-[#D1EB8F] text-[#111111] shadow-2xs"
                : "bg-white text-[#626762] hover:bg-[#EDF6D5]/60 border border-[#D6D6D2]"
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Smart Route Planner</span>
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="pt-6 space-y-8">
        {/* Contextual Physical Ground Reading & Forecast Status */}
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#EDF6D5] flex items-center justify-center text-[#285A1D]">
              <CloudSun className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#111111] flex items-center gap-2">
                <span>Current Atmosphere Context: {currentLocation?.name || "India"}</span>
                {outdoorObservations?.isAvailable && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EAEAEA] text-[10px] text-[#111111] font-mono">
                    Station: {outdoorObservations.station?.name || "Verified Sensor"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#626762] mt-0.5">
                {outdoorObservations?.pm25
                  ? `Observed ground PM2.5: ${outdoorObservations.pm25.value} µg/m³ • CAMS modeled hourly projections active for comparative departure windows.`
                  : "Awaiting local sensor telemetry • Utilizing regional CAMS atmospheric dispersion projections."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#626762] shrink-0">
            <Shield className="h-4 w-4 text-[#7BB350]" />
            <span>Data-Based Recommendations</span>
          </div>
        </div>

        {/* Tab 1: Timing Simulation Mode */}
        {activeTab === "timing_simulation" && (
          <div className="space-y-8">
            {/* 1. Initial Simulation Presets (One-Click) */}
            <SimulationPresets
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
            />

            {/* 2. Interactive Scenario Controls */}
            <ScenarioControls
              input={scenarioInput}
              onChange={(updated) => {
                setScenarioInput(updated);
                setActivePresetId(""); // Clear preset active highlight when custom inputs change
              }}
            />

            {/* 3. Decision Lab Verdict & 1-Minute Executive Summary */}
            <AiDecisionVerdict comparison={comparison} />

            {/* 4. Side-by-Side Trade-off Comparison Cards */}
            <ComparisonCards comparison={comparison} />

            {/* 5. Responsive Impact Visual Chart */}
            <ImpactChart comparison={comparison} />

            {/* 6. Scientific Assumptions & Emission Factors Drawer */}
            <AssumptionsDrawer />
          </div>
        )}

        {/* Tab 2: Real Route Navigator Mode */}
        {activeTab === "real_routing" && (
          <RouteComparisonPanel
            predictedPm25={currentPm25Number}
            initialCityName={currentLocation?.name || "Local Area"}
          />
        )}
      </div>
    </div>
  );
}
