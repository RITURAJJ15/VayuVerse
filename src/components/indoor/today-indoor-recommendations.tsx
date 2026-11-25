import {
  Wind,
  Fan,
  Flame,
  AlertOctagon,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  calculateIndoorStatusSummary,
  getDynamicIndoorRecommendations,
  type IndoorStatusSummary,
} from "@/lib/indoor-guardian-service";
import type { StationObservationResponse } from "@/types/air-quality";
import type { HouseholdProfile } from "@/types/indoor-air";

interface TodayIndoorRecommendationsProps {
  observations?: StationObservationResponse | null;
  profile: HouseholdProfile;
}

export function TodayIndoorRecommendationsCard({
  observations,
  profile,
}: TodayIndoorRecommendationsProps) {
  const pm25Val = observations?.pm25?.value ?? null;
  const aqiVal = observations?.naqi?.overallAqi ?? null;

  const homeTypeKey =
    profile.windowTightness === "modern_sealed"
      ? "sealed_apartment"
      : profile.homeType === "independent_house"
      ? "independent_house"
      : "apartment";

  const statusSummary: IndoorStatusSummary = calculateIndoorStatusSummary(
    pm25Val,
    aqiVal,
    homeTypeKey
  );

  const purifierAvailable =
    profile.purifierStatus === "single_bedroom_hepa" ||
    profile.purifierStatus === "multi_room_hepa";

  const dynamicRecs = getDynamicIndoorRecommendations(
    statusSummary.outdoorCategory,
    pm25Val,
    purifierAvailable
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#D6D6D2]/60 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2E7D4E]">
            <Wind className="h-3.5 w-3.5" />
            <span>Section 1: Dynamic Protection</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111111] mt-0.5">
            Today&apos;s Indoor Air Recommendations
          </h2>
        </div>
        <Badge
          variant="outline"
          className="text-xs bg-white text-[#111111] border-[#D6D6D2] self-start sm:self-auto"
        >
          Outdoor AQI: {statusSummary.outdoorCategory}
        </Badge>
      </div>

      {/* Current Indoor Status Summary Card */}
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tile 1: Estimated Indoor PM2.5 Range */}
          <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#626762]">
              Estimated Indoor PM2.5
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#111111]">
              {statusSummary.estimatedIndoorPm25Min !== null && statusSummary.estimatedIndoorPm25Max !== null
                ? `${statusSummary.estimatedIndoorPm25Min} – ${statusSummary.estimatedIndoorPm25Max} µg/m³`
                : "Awaiting readings"}
            </div>
            <div className="text-[11px] text-[#626762]">
              {statusSummary.homeTypeLabel} ({statusSummary.homeInfiltrationFactor}× factor)
            </div>
          </div>

          {/* Tile 2: Ventilation for Current Hour */}
          <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#626762]">
              Current Ventilation Rule
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#111111] flex items-center gap-2">
              <span
                className={
                  statusSummary.ventilationRecommendation === "Open windows"
                    ? "text-[#2E7D4E]"
                    : statusSummary.ventilationRecommendation === "Ventilate at midday"
                    ? "text-[#B8860B]"
                    : "text-[#B93838]"
                }
              >
                {statusSummary.ventilationRecommendation}
              </span>
            </div>
            <div className="text-[11px] text-[#626762]">
              {statusSummary.ventilationTimeWindow
                ? `Optimal window: ${statusSummary.ventilationTimeWindow}`
                : statusSummary.ventilationRecommendation === "Open windows"
                ? "Ambient air is clean; cross-ventilation encouraged"
                : "Outdoor particulate ingress exceeds indoor threshold"}
            </div>
          </div>

          {/* Tile 3: Mechanical Air Filtration Mode */}
          <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#626762]">
              Filtration Strategy
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#111111]">
              {purifierAvailable
                ? statusSummary.outdoorCategory === "Poor" ||
                  statusSummary.outdoorCategory === "Very Poor" ||
                  statusSummary.outdoorCategory === "Severe"
                  ? "24/7 Medium"
                  : statusSummary.outdoorCategory === "Moderate"
                  ? "Auto Mode"
                  : "Eco / Whisper"
                : "Sanctuary Mode"}
            </div>
            <div className="text-[11px] text-[#626762]">
              {purifierAvailable
                ? "True-HEPA running in primary living / bedroom space"
                : "No purifier detected; rely on room sealing and draft stoppers"}
            </div>
          </div>
        </div>

        {/* Mandatory Explicit Disclaimer */}
        <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-3.5 flex items-start gap-2.5 text-xs text-[#626762]">
          <Info className="h-4 w-4 text-[#7BB350] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Disclosure:</strong> {statusSummary.disclaimer} Indoor concentrations depend heavily on internal cooking emissions, incense burning, floor sweeping, and building envelope leakage.
          </p>
        </div>
      </div>

      {/* Dynamic Action Cards for Today */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
          Immediate Actions Grounded in Today&apos;s Conditions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dynamicRecs.map((rec) => {
            const isCritical = rec.priority === "Critical";
            return (
              <div
                key={rec.id}
                className={`rounded-2xl border p-5 space-y-3 transition-all ${
                  isCritical
                    ? "border-[#F8B4B4] bg-[#FDF2F2]"
                    : "border-[#D6D6D2] bg-white shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rec.actionType === "emergency" ? (
                      <AlertOctagon className="h-4 w-4 text-[#991B1B]" />
                    ) : rec.actionType === "ventilation" ? (
                      <Wind className="h-4 w-4 text-[#2E7D4E]" />
                    ) : rec.actionType === "filtration" ? (
                      <Fan className="h-4 w-4 text-[#111111]" />
                    ) : (
                      <Flame className="h-4 w-4 text-[#B8860B]" />
                    )}
                    <h4 className="text-sm font-bold text-[#111111]">
                      {rec.title}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      isCritical
                        ? "bg-[#FDE8E8] text-[#9B1C1C] border-[#F8B4B4]"
                        : "bg-[#EDF6D5] text-[#285A1D] border-[#D1EB8F]"
                    }`}
                  >
                    {rec.priority}
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#111111] leading-relaxed">
                  {rec.action}
                </p>

                <p className="text-xs text-[#626762] leading-relaxed pt-1 border-t border-[#D6D6D2]/40">
                  <strong>Scientific rationale:</strong> {rec.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
