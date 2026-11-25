import { BarChart3, Wind, Leaf } from "lucide-react";
import type { DecisionComparisonResult } from "@/types/decision-lab";

interface ImpactChartProps {
  comparison: DecisionComparisonResult;
}

export function ImpactChart({ comparison }: ImpactChartProps) {
  const { optionA, optionB } = comparison;

  // Max values for scale
  const maxExposure = Math.max(
    optionA.effectiveExposureProxy ?? 1,
    optionB.effectiveExposureProxy ?? 1,
    10
  );

  const maxEmissions = Math.max(
    optionA.totalCo2EmissionsGrams,
    optionB.totalCo2EmissionsGrams,
    100
  );

  const expPercentA =
    optionA.effectiveExposureProxy !== null
      ? (optionA.effectiveExposureProxy / maxExposure) * 100
      : 0;

  const expPercentB =
    optionB.effectiveExposureProxy !== null
      ? (optionB.effectiveExposureProxy / maxExposure) * 100
      : 0;

  const emPercentA = (optionA.totalCo2EmissionsGrams / maxEmissions) * 100;
  const emPercentB = (optionB.totalCo2EmissionsGrams / maxEmissions) * 100;

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#111111]" />
          <h3 className="text-base font-bold text-[#111111]">
            Visual Trade-Off Comparison
          </h3>
        </div>
        <span className="text-xs text-[#626762]">
          Normalized exposure proxy &amp; emissions impact
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Exposure Proxy Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#111111] flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-[#7BB350]" />
              Exposure Proxy (µg·h/m³)
            </span>
            <span className="text-[11px] text-[#626762]">Lower is better</span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Bar A */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#626762]">
                  Option A ({optionA.departureTime})
                </span>
                <span className="font-mono font-bold text-[#111111]">
                  {optionA.effectiveExposureProxy !== null
                    ? `${optionA.effectiveExposureProxy} µg·h`
                    : "Unavailable"}
                </span>
              </div>
              <div className="w-full h-3 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E05A47] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, expPercentA))}%` }}
                />
              </div>
            </div>

            {/* Bar B */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#285A1D]">
                  Option B ({optionB.departureTime})
                </span>
                <span className="font-mono font-bold text-[#285A1D]">
                  {optionB.effectiveExposureProxy !== null
                    ? `${optionB.effectiveExposureProxy} µg·h`
                    : "Unavailable"}
                </span>
              </div>
              <div className="w-full h-3 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7BB350] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, expPercentB))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Carbon Emissions Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#111111] flex items-center gap-1.5">
              <Leaf className="h-4 w-4 text-[#7BB350]" />
              Carbon Footprint (g CO₂)
            </span>
            <span className="text-[11px] text-[#626762]">Lower is better</span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Bar A */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#626762]">
                  Option A ({optionA.transportLabel.split(" ")[0]})
                </span>
                <span className="font-mono font-bold text-[#111111]">
                  {optionA.totalCo2EmissionsGrams} g
                </span>
              </div>
              <div className="w-full h-3 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#626762] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, emPercentA))}%` }}
                />
              </div>
            </div>

            {/* Bar B */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#285A1D]">
                  Option B ({optionB.transportLabel.split(" ")[0]})
                </span>
                <span className="font-mono font-bold text-[#285A1D]">
                  {optionB.totalCo2EmissionsGrams} g
                </span>
              </div>
              <div className="w-full h-3 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7BB350] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, emPercentB))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
