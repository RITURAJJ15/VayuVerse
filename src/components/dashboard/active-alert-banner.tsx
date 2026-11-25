import { useState } from "react";
import { AlertTriangle, X, ArrowRight, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useAlerts } from "@/hooks/use-alerts";
import type { AirAlertSeverity } from "@/types/alerts";

const BANNER_THEMES: Record<
  AirAlertSeverity,
  {
    wrapper: string;
    badge: string;
    titleColor: string;
    accent: string;
  }
> = {
  Severe: {
    wrapper: "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]",
    badge: "bg-[#991B1B] text-white",
    titleColor: "text-[#991B1B]",
    accent: "text-[#B91C1C]",
  },
  "Very Poor": {
    wrapper: "bg-[#FFF7ED] border-[#FDBA74] text-[#C2410C]",
    badge: "bg-[#C2410C] text-white",
    titleColor: "text-[#C2410C]",
    accent: "text-[#C2410C]",
  },
  Poor: {
    wrapper: "bg-[#FEFCE8] border-[#FDE047] text-[#854D0E]",
    badge: "bg-[#D97706] text-white",
    titleColor: "text-[#854D0E]",
    accent: "text-[#B45309]",
  },
  Moderate: {
    wrapper: "bg-[#FEF9C3]/60 border-[#FACC15]/60 text-[#713F12]",
    badge: "bg-[#CA8A04] text-white",
    titleColor: "text-[#713F12]",
    accent: "text-[#854D0E]",
  },
  Satisfactory: {
    wrapper: "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]",
    badge: "bg-[#16A34A] text-white",
    titleColor: "text-[#166534]",
    accent: "text-[#15803D]",
  },
  Good: {
    wrapper: "bg-[#EDF6D5] border-[#D1EB8F] text-[#285A1D]",
    badge: "bg-[#2E7D4E] text-white",
    titleColor: "text-[#285A1D]",
    accent: "text-[#285A1D]",
  },
  Unavailable: {
    wrapper: "bg-slate-100 border-slate-300 text-slate-700",
    badge: "bg-slate-500 text-white",
    titleColor: "text-slate-800",
    accent: "text-slate-600",
  },
};

export function ActiveAlertBanner() {
  const { activeBannerAlert, dismissBanner } = useAlerts();
  const [mountTime] = useState(() => Date.now());

  if (!activeBannerAlert) return null;

  // Rule: Do not show warning banner for Good or Satisfactory conditions
  if (
    activeBannerAlert.severity === "Good" ||
    activeBannerAlert.severity === "Satisfactory"
  ) {
    return null;
  }

  // Source-Aware Freshness check (Requirement 6):
  // For urgent emergency warnings (Severe, Very Poor, Poor), source data must be <= 3 hours old.
  // Never treat a 12h or 23h old observation as an active emergency banner.
  const alertTime = new Date(activeBannerAlert.created_at).getTime();
  const alertAgeHours = (mountTime - alertTime) / (60 * 60 * 1000);
  const isEmergency =
    activeBannerAlert.severity === "Severe" ||
    activeBannerAlert.severity === "Very Poor" ||
    activeBannerAlert.severity === "Poor";

  if (isEmergency && alertAgeHours > 3) {
    return null;
  }
  if (alertAgeHours > 24) {
    return null;
  }

  const theme = BANNER_THEMES[activeBannerAlert.severity] || BANNER_THEMES.Moderate;
  const isForecast = activeBannerAlert.source_type === "forecast";

  return (
    <aside
      aria-label="Active air quality alert"
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${theme.wrapper}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-2xs mt-0.5">
            <AlertTriangle className={`h-5 w-5 ${theme.accent}`} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${theme.badge}`}>
                {activeBannerAlert.severity.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 border border-black/10 text-[#444]">
                {isForecast ? "FORECAST ADVISORY" : "OBSERVED ALERT"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#555] font-medium">
                <MapPin className="h-3 w-3" />
                {activeBannerAlert.location_name}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#555]">
                <Clock className="h-3 w-3" />
                {new Date(activeBannerAlert.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <h3 className={`text-sm font-bold ${theme.titleColor}`}>
              {activeBannerAlert.title}
            </h3>

            <p className="text-xs text-[#333] max-w-3xl leading-relaxed">
              {activeBannerAlert.message}
            </p>

            {activeBannerAlert.recommended_action && (
              <p className="text-xs font-medium text-[#111] bg-white/60 rounded-lg px-2.5 py-1 inline-block mt-1">
                <strong>Recommended action:</strong> {activeBannerAlert.recommended_action}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <Link
            to="/my-day"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#111111] text-white hover:bg-[#2E7D4E] transition-colors shadow-2xs"
          >
            <span>Review Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => dismissBanner(activeBannerAlert.id)}
            className="p-1.5 rounded-lg text-[#555] hover:text-[#111] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
