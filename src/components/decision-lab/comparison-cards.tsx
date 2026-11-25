import {
  Clock,
  Car,
  CloudSun,
  Leaf,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DecisionComparisonResult } from "@/types/decision-lab";

interface ComparisonCardsProps {
  comparison: DecisionComparisonResult;
}

export function ComparisonCards({ comparison }: ComparisonCardsProps) {
  const { optionA, optionB, exposureProxyReductionPercent, emissionsReductionPercent } =
    comparison;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#111111]">
          Side-by-Side Trade-off Analysis
        </h3>
        <span className="text-xs text-[#626762]">
          Concentration-time proxy &amp; ARAI/CPCB deterministic emissions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A Card (Baseline) */}
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-[#F8B4B4] bg-[#FDE8E8] text-[#9B1C1C]">
                Option A: Baseline Plan
              </span>
              <span className="text-xs font-mono text-[#626762]">
                {optionA.durationMinutes} min • {optionA.distanceKm} km
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-[#111111] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#626762]" />
                {optionA.departureTime}
              </div>
              <div className="text-xs font-semibold text-[#626762] mt-0.5 flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" />
                {optionA.transportLabel}
              </div>
            </div>

            {/* Environmental Forecast Point */}
            <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#626762] flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4 text-[#7BB350]" />
                  Modeled Ambient PM2.5 (CAMS):
                </span>
                <span className="font-mono font-bold text-[#111111]">
                  {optionA.forecastPm25 !== null
                    ? `${optionA.forecastPm25} µg/m³`
                    : "Forecast unavailable"}
                </span>
              </div>

              {/* Concentration-time proxy */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D6D6D2]/60">
                <span className="text-[#626762]">Concentration-Time Proxy:</span>
                <span className="font-mono font-bold text-[#E05A47]">
                  {optionA.effectiveExposureProxy !== null
                    ? `${optionA.effectiveExposureProxy} µg·h/m³`
                    : "—"}
                </span>
              </div>

              <div className="text-[10px] text-[#626762] leading-tight">
                Microenvironment Factor: <strong>{(optionA.microenvironmentFactor * 100).toFixed(0)}%</strong> ambient ingress (
                {optionA.transportMode === "metro"
                  ? "filtered carriage"
                  : optionA.transportMode === "petrol_car" || optionA.transportMode === "diesel_car" || optionA.transportMode === "electric_cab"
                  ? "cabin recirculation"
                  : "unconditioned roadway"}
                )
              </div>
            </div>

            {/* Emissions Point */}
            <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#626762] flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-[#626762]" />
                  Estimated Carbon Emissions:
                </span>
                <span className="font-mono font-bold text-[#111111]">
                  {optionA.totalCo2EmissionsGrams} g CO₂
                </span>
              </div>
              <div className="text-[10px] text-[#626762]">
                Factor: {optionA.emissionFactorGramsPerKm} g CO₂/passenger-km
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#626762] pt-2 border-t border-[#D6D6D2]/60">
            Baseline reference for exposure and emissions evaluation.
          </div>
        </div>

        {/* Option B Card (What-If Alternative) */}
        <div className="rounded-2xl border border-[#D1EB8F] bg-[#EDF6D5]/30 p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D1EB8F] pb-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-[#D1EB8F] bg-[#EDF6D5] text-[#285A1D]">
                Option B: What-If Alternative
              </span>
              <span className="text-xs font-mono text-[#285A1D]">
                {optionB.durationMinutes} min • {optionB.distanceKm} km
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-[#111111] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#285A1D]" />
                {optionB.departureTime}
              </div>
              <div className="text-xs font-semibold text-[#285A1D] mt-0.5 flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" />
                {optionB.transportLabel}
              </div>
            </div>

            {/* Environmental Forecast Point */}
            <div className="p-3.5 rounded-xl border border-[#C8DAC7] bg-white space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#626762] flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4 text-[#7BB350]" />
                  Modeled Ambient PM2.5 (CAMS):
                </span>
                <span className="font-mono font-bold text-[#111111]">
                  {optionB.forecastPm25 !== null
                    ? `${optionB.forecastPm25} µg/m³`
                    : "Forecast unavailable"}
                </span>
              </div>

              {/* Concentration-time proxy */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D6D6D2]/60">
                <span className="text-[#626762]">Concentration-Time Proxy:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#285A1D]">
                    {optionB.effectiveExposureProxy !== null
                      ? `${optionB.effectiveExposureProxy} µg·h/m³`
                      : "—"}
                  </span>
                  {exposureProxyReductionPercent !== null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center ${
                        exposureProxyReductionPercent >= 0
                          ? "bg-[#EDF6D5] text-[#285A1D]"
                          : "bg-[#FDE8E8] text-[#9B1C1C]"
                      }`}
                    >
                      {exposureProxyReductionPercent >= 0 ? (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      )}
                      {exposureProxyReductionPercent >= 0
                        ? `-${exposureProxyReductionPercent}%`
                        : `+${Math.abs(exposureProxyReductionPercent)}%`}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-[#626762] leading-tight">
                Microenvironment Factor: <strong>{(optionB.microenvironmentFactor * 100).toFixed(0)}%</strong> ambient ingress (
                {optionB.transportMode === "metro"
                  ? "filtered carriage"
                  : optionB.transportMode === "petrol_car" || optionB.transportMode === "diesel_car" || optionB.transportMode === "electric_cab"
                  ? "cabin recirculation"
                  : optionB.transportMode === "walk_cycle" && !optionB.distanceKm
                  ? "indoor space"
                  : "unconditioned roadway"}
                )
              </div>
            </div>

            {/* Emissions Point */}
            <div className="p-3.5 rounded-xl border border-[#C8DAC7] bg-white space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#626762] flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-[#7BB350]" />
                  Estimated Carbon Emissions:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#111111]">
                    {optionB.totalCo2EmissionsGrams} g CO₂
                  </span>
                  {emissionsReductionPercent > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#EDF6D5] text-[#285A1D] flex items-center">
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                      -{emissionsReductionPercent}%
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-[#626762]">
                Factor: {optionB.emissionFactorGramsPerKm} g CO₂/passenger-km
              </div>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[#285A1D] pt-2 border-t border-[#D1EB8F] flex items-center justify-between">
            <span>Net Carbon Avoided:</span>
            <span className="font-mono font-bold">
              {comparison.absoluteCo2SavedGrams > 0
                ? `${comparison.absoluteCo2SavedGrams} g CO₂e saved`
                : "0 g (Zero additional emissions)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
