import {
  Sparkles,
  ArrowRight,
  Clock,
  Train,
  Layers,
  Dumbbell,
} from "lucide-react";
import { INITIAL_SIMULATION_PRESETS } from "@/lib/decision-lab-engine";
import type { SimulationPreset } from "@/types/decision-lab";

interface SimulationPresetsProps {
  activePresetId: string;
  onSelectPreset: (preset: SimulationPreset) => void;
}

export function SimulationPresets({
  activePresetId,
  onSelectPreset,
}: SimulationPresetsProps) {
  const getIcon = (simNumber: number) => {
    switch (simNumber) {
      case 1:
      case 2:
        return Clock;
      case 3:
        return Train;
      case 4:
        return Layers;
      case 5:
      default:
        return Dumbbell;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#7BB350]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
          Initial Simulation Scenarios (One-Click)
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {INITIAL_SIMULATION_PRESETS.map((preset) => {
          const isSelected = preset.id === activePresetId;
          const Icon = getIcon(preset.simulationNumber);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-[#111111] bg-white ring-2 ring-[#111111] shadow-xs"
                  : "border-[#D6D6D2] bg-white hover:border-[#7BB350] hover:bg-[#FAFAF8]"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? "bg-[#111111] text-white"
                        : "bg-[#EDF6D5] text-[#285A1D]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-mono text-[#626762]">
                    #{preset.simulationNumber}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#111111] line-clamp-2 leading-tight">
                  {preset.title.replace(/^\d+\.\s*/, "")}
                </h4>

                <p className="text-[11px] text-[#626762] line-clamp-2">
                  {preset.subtitle}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-[#D6D6D2]/60 flex items-center justify-between text-[10px] font-semibold text-[#111111]">
                <span>Run Test</span>
                <ArrowRight className="h-3 w-3 text-[#7BB350]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
