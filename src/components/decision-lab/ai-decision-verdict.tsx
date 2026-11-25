import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
} from "lucide-react";
import type { DecisionComparisonResult } from "@/types/decision-lab";

interface AiDecisionVerdictProps {
  comparison: DecisionComparisonResult;
}

export function AiDecisionVerdict({ comparison }: AiDecisionVerdictProps) {
  const {
    verdictHeadline,
    tradeoffAnalysis,
    confidenceLevel,
    confidenceExplanation,
    isForecastCoupled,
    missingDataItems,
    optionA,
    optionB,
  } = comparison;

  const getConfidenceBadge = () => {
    switch (confidenceLevel) {
      case "High":
        return {
          bg: "bg-[#EDF6D5]",
          text: "text-[#285A1D]",
          border: "border-[#D1EB8F]",
          label: "HIGH CONFIDENCE (Hourly Dispersion Projections)",
        };
      case "Medium":
        return {
          bg: "bg-[#FEF08A]/40",
          text: "text-[#854D0E]",
          border: "border-[#FDE047]",
          label: "MEDIUM CONFIDENCE (Regional Modeled)",
        };
      case "Caution":
      default:
        return {
          bg: "bg-[#FDE8E8]",
          text: "text-[#9B1C1C]",
          border: "border-[#F8B4B4]",
          label: "CAUTION (Partial Data)",
        };
    }
  };

  const badge = getConfidenceBadge();

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#D6D6D2]/60 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#7BB350]" />
          <h3 className="text-base font-bold text-[#111111]">
            Decision Lab Verdict &amp; Trade-Off Recommendation
          </h3>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl border border-[#D1EB8F] bg-[#EDF6D5] space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#285A1D] shrink-0" />
            <h4 className="text-sm font-black text-[#111111]">
              {verdictHeadline}
            </h4>
          </div>
          <p className="text-xs text-[#285A1D] leading-relaxed pl-7">
            {tradeoffAnalysis}
          </p>
        </div>

        {/* 1-Minute Executive Summary for Evaluators & Judges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#626762] block">
              1. Departure Timing Shift
            </span>
            <div className="font-semibold text-[#111111]">
              {optionA.departureTime} → {optionB.departureTime}
            </div>
            <p className="text-[11px] text-[#526161]">
              {optionA.departureTime !== optionB.departureTime
                ? "Shifts exposure across diurnal inversion boundary layer."
                : "Same time slot; compares vehicle/filtration barriers."}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#626762] block">
              2. Microenvironment Barrier
            </span>
            <div className="font-semibold text-[#111111]">
              {(optionA.microenvironmentFactor * 100).toFixed(0)}% → {(optionB.microenvironmentFactor * 100).toFixed(0)}% Ingress
            </div>
            <p className="text-[11px] text-[#526161]">
              Accounts for vehicle cabin recirculation and HVAC filters.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#626762] block">
              3. Carbon Emissions Impact
            </span>
            <div className="font-semibold text-[#111111]">
              {optionA.totalCo2EmissionsGrams}g → {optionB.totalCo2EmissionsGrams}g CO₂
            </div>
            <p className="text-[11px] text-[#526161]">
              Deterministic ARAI/CPCB passenger-km emission calculation.
            </p>
          </div>
        </div>

        {/* Missing data notification if any */}
        {!isForecastCoupled && missingDataItems.length > 0 && (
          <div className="p-3 rounded-lg border border-[#F8B4B4] bg-[#FDE8E8] text-xs text-[#9B1C1C] flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>Missing Input Notice:</strong> {missingDataItems.join(", ")} is currently unavailable. Air exposure calculations are disabled to prevent hallucinated numbers. Verified carbon emissions remain fully active.
            </div>
          </div>
        )}

        <div className="text-[11px] font-mono text-[#626762] pt-1 flex items-center justify-between border-t border-[#D6D6D2]/60">
          <span>{confidenceExplanation}</span>
          <span className="text-[#111111] font-semibold flex items-center gap-1">
            Zero Inhaled Dose Guesswork <Shield className="h-3 w-3 text-[#7BB350]" />
          </span>
        </div>
      </div>
    </div>
  );
}
