import {
  Clock,
  Car,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import type {
  DecisionLabScenarioInput,
  DecisionTransportMode,
  JourneyActivityType,
  ScheduleFlexibility,
} from "@/types/decision-lab";

interface ScenarioControlsProps {
  input: DecisionLabScenarioInput;
  onChange: (updated: DecisionLabScenarioInput) => void;
}

export function ScenarioControls({ input, onChange }: ScenarioControlsProps) {
  const update = <K extends keyof DecisionLabScenarioInput>(
    field: K,
    val: DecisionLabScenarioInput[K]
  ) => {
    onChange({
      ...input,
      [field]: val,
    });
  };

  const transportOptions: { id: DecisionTransportMode; label: string }[] = [
    { id: "metro", label: "Underground / AC Metro" },
    { id: "open_two_wheeler", label: "Two-Wheeler (Motorcycle)" },
    { id: "petrol_car", label: "Petrol Car (Private)" },
    { id: "diesel_car", label: "Diesel Car (Private/SUV)" },
    { id: "electric_cab", label: "Electric Cab / EV" },
    { id: "public_bus", label: "Public Bus (CNG/Diesel)" },
    { id: "walk_cycle", label: "Walking / Cycling" },
  ];

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#D6D6D2]/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-[#111111]">
            Scenario Parameters &amp; Timing Controls
          </h3>
          <p className="text-xs text-[#626762] mt-0.5">
            Configure baseline schedule vs. what-if alternative options
          </p>
        </div>

        {/* Activity Selector */}
        <div className="flex items-center gap-1.5 bg-[#FAFAF8] p-1 rounded-lg border border-[#D6D6D2]">
          {[
            { id: "commute", label: "Commute" },
            { id: "errands", label: "Errands" },
            { id: "outdoor_exercise", label: "Exercise" },
          ].map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => update("activityType", act.id as JourneyActivityType)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                input.activityType === act.id
                  ? "bg-[#111111] text-white"
                  : "text-[#626762] hover:text-[#111111]"
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Option A (Baseline Plan) */}
        <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-2">
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#E05A47]" />
              Option A: Current / Baseline Plan
            </span>
            <span className="text-[11px] font-mono text-[#626762]">Standard Schedule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Departure Time A */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#626762]" />
                Planned Departure Time:
              </label>
              <input
                type="time"
                value={input.departureTimeA}
                onChange={(e) => update("departureTimeA", e.target.value)}
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#111111]"
                aria-label="Planned Departure Time Option A"
              />
            </div>

            {/* Transport Mode A */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-[#626762]" />
                Transport Mode:
              </label>
              <select
                value={input.transportModeA}
                onChange={(e) =>
                  update("transportModeA", e.target.value as DecisionTransportMode)
                }
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#111111]"
                aria-label="Transport Mode Option A"
              >
                {transportOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Distance A */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#626762]" />
                One-Way Distance: <span className="font-mono text-[#111111]">{input.distanceKmA} km</span>
              </label>
              <input
                type="number"
                min="1"
                max="80"
                value={input.distanceKmA}
                onChange={(e) => update("distanceKmA", Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white text-xs font-mono"
                aria-label="Distance Option A"
              />
            </div>

            {/* Duration A */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#626762]" />
                Transit Duration: <span className="font-mono text-[#111111]">{input.durationMinutesA} min</span>
              </label>
              <input
                type="number"
                min="5"
                max="240"
                step="5"
                value={input.durationMinutesA}
                onChange={(e) => update("durationMinutesA", Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white text-xs font-mono"
                aria-label="Duration Option A"
              />
            </div>
          </div>
        </div>

        {/* Option B (What-If Alternative) */}
        <div className="p-4 rounded-xl border border-[#D1EB8F] bg-[#EDF6D5]/40 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D1EB8F] pb-2">
            <span className="text-xs font-bold text-[#285A1D] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#7BB350]" />
              Option B: What-If Alternative
            </span>
            <span className="text-[11px] font-mono text-[#285A1D]">Scenario Shift</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Departure Time B */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#285A1D]" />
                What-If Departure Time:
              </label>
              <input
                type="time"
                value={input.departureTimeB}
                onChange={(e) => update("departureTimeB", e.target.value)}
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#7BB350]"
                aria-label="What-If Departure Time Option B"
              />
            </div>

            {/* Transport Mode B */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-[#285A1D]" />
                What-If Mode:
              </label>
              <select
                value={input.transportModeB}
                onChange={(e) =>
                  update("transportModeB", e.target.value as DecisionTransportMode)
                }
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#7BB350]"
                aria-label="Transport Mode Option B"
              >
                {transportOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Distance B */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#285A1D]" />
                What-If Distance: <span className="font-mono text-[#285A1D]">{input.distanceKmB} km</span>
              </label>
              <input
                type="number"
                min="0"
                max="80"
                value={input.distanceKmB}
                onChange={(e) => update("distanceKmB", Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white text-xs font-mono"
                aria-label="Distance Option B"
              />
            </div>

            {/* Duration B */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#285A1D]" />
                Transit Duration: <span className="font-mono text-[#285A1D]">{input.durationMinutesB} min</span>
              </label>
              <input
                type="number"
                min="5"
                max="240"
                step="5"
                value={input.durationMinutesB}
                onChange={(e) => update("durationMinutesB", Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[#D6D6D2] bg-white text-xs font-mono"
                aria-label="Duration Option B"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Parameters: Errands & Flexibility */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs border-t border-[#D6D6D2]/60">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#626762]" />
            Trip Chaining (Errands):
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[#626762]">Plan A: {input.errandCountA} stop(s)</span>
            <ArrowRight className="h-3 w-3 text-[#626762]" />
            <span className="font-bold text-[#111111]">Plan B: {input.errandCountB} chained stop</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#626762]">Schedule Flexibility:</span>
          {(["high", "moderate", "low"] as ScheduleFlexibility[]).map((flex) => (
            <button
              key={flex}
              type="button"
              onClick={() => update("scheduleFlexibility", flex)}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-medium capitalize transition-all ${
                input.scheduleFlexibility === flex
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#D6D6D2] bg-white text-[#626762]"
              }`}
            >
              {flex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
