import { Check, Sparkles, MapPin, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EVALUATOR_PRESETS, type EvaluatorPreset } from "@/types/profile";
import { useProfileState } from "@/context/profile-context";

interface PresetSelectorProps {
  onSelect?: (preset: EvaluatorPreset) => void;
  className?: string;
}

export function PresetSelector({ onSelect, className = "" }: PresetSelectorProps) {
  const { activePresetId, selectPreset } = useProfileState();

  const handleSelect = (preset: EvaluatorPreset) => {
    selectPreset(preset.id);
    onSelect?.(preset);
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#2E7D4E]" />
            One-Click Evaluator Presets
          </h3>
          <p className="text-[11px] text-[#626762]">
            Select a realistic persona to simulate varied Indian schedules, exposure baselines, and fetch actual city telemetry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {EVALUATOR_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`group cursor-pointer rounded-2xl border p-4.5 transition-all flex flex-col justify-between text-left shadow-xs ${
                isActive
                  ? "border-[#111111] bg-[#EDF6D5]/50 ring-1 ring-[#111111]"
                  : "border-[#D6D6D2] bg-white hover:border-[#D1EB8F] hover:bg-[#FAFAF8]"
              }`}
              data-testid={`preset-card-${preset.id}`}
              aria-label={preset.title}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#111111] group-hover:text-[#2E7D4E] transition-colors">
                      {preset.title}
                    </span>
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold tracking-wide uppercase">
                      <Check className="h-3 w-3 text-[#D1EB8F]" />
                      Active
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[9px] rounded-md border-[#D6D6D2]">
                      Preset
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#626762]">
                  <MapPin className="h-3 w-3 text-[#626762]" />
                  <span className="font-semibold text-[#111111]">{preset.cityName}</span>
                  <span>({preset.state})</span>
                </div>

                <p className="text-[11px] text-[#626762] leading-relaxed line-clamp-2">
                  {preset.exposureRationale}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-[#D6D6D2] text-[#111111] flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-[#626762]" />
                    {preset.profile.departureTime} – {preset.profile.returnTime}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-[#D6D6D2] text-[#626762] font-mono">
                    {preset.profile.commuteMode.replace("_", " ")}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono uppercase ${
                      preset.profile.sensitivity === "high"
                        ? "bg-[#FFF8E7] text-[#B8860B] border border-[#E8DFCA]"
                        : "bg-[#FAFAF8] border border-[#D6D6D2] text-[#626762]"
                    }`}
                  >
                    {preset.profile.sensitivity} sensitivity
                  </span>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-[#D6D6D2]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#626762] text-[10px]">
                  {preset.profile.preferredLanguage}
                </span>
                <span className="font-semibold text-[#111111] group-hover:text-[#2E7D4E] flex items-center gap-1 text-[11px]">
                  {isActive ? "Currently Active" : "Apply & Fetch City"}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
