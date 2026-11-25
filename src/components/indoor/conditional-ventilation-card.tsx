import {
  Wind,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { ConditionalVentilationAdvice } from "@/types/indoor-air";

interface ConditionalVentilationCardProps {
  advice: ConditionalVentilationAdvice;
}

export function ConditionalVentilationCard({
  advice,
}: ConditionalVentilationCardProps) {
  const getBadgeStyle = () => {
    switch (advice.status) {
      case "seal_windows":
        return {
          bg: "bg-[#FDE8E8]",
          text: "text-[#9B1C1C]",
          border: "border-[#F8B4B4]",
          icon: ShieldAlert,
          label: "KEEP WINDOWS SEALED",
        };
      case "caution_minimal":
        return {
          bg: "bg-[#FEF08A]/40",
          text: "text-[#854D0E]",
          border: "border-[#FDE047]",
          icon: AlertTriangle,
          label: "RESTRICTED MIDDAY VENTILATION",
        };
      case "selective_cross_ventilation":
        return {
          bg: "bg-[#EDF6D5]",
          text: "text-[#285A1D]",
          border: "border-[#D1EB8F]",
          icon: CheckCircle2,
          label: "SAFE CROSS-VENTILATION PERMITTED",
        };
      case "data_unavailable_precautionary":
      default:
        return {
          bg: "bg-[#F3F4F6]",
          text: "text-[#374151]",
          border: "border-[#E5E7EB]",
          icon: Info,
          label: "DIURNAL PRECAUTIONARY WINDOW",
        };
    }
  };

  const style = getBadgeStyle();
  const Icon = style.icon;

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wind className="h-5 w-5 text-[#111111]" />
          <h3 className="text-base font-bold text-[#111111]">
            Real-Time Conditional Ventilation Protocol
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${style.bg} ${style.text} ${style.border}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {style.label}
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <h4 className="font-semibold text-sm text-[#111111]">
          {advice.headline}
        </h4>
        <p className="text-[#526161] leading-relaxed">
          {advice.explanation}
        </p>

        <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1.5">
          <div className="font-semibold text-[#111111] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#7BB350]" />
            Recommended Action:
          </div>
          <p className="text-[#111111] leading-relaxed">
            {advice.recommendedAction}
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#626762] pt-1">
          {advice.outdoorContextNote}
        </div>
      </div>
    </div>
  );
}
