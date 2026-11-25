import { useState } from "react";
import {
  Sun,
  Sunset,
  Clock,
  Wind,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Bookmark,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationState } from "@/context/location-context";
import { useProfileState } from "@/context/profile-context";
import { useAuth } from "@/context/auth-context";
import { persistenceService } from "@/lib/persistence-service";
import type { DbSavedPlan } from "@/types/database";
import { SENSITIVITY_PROFILES } from "@/types/profile";
import { AwaitingReadingState } from "@/components/common/state-views";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useAirQuality } from "@/hooks/use-air-quality";
import { useForecast } from "@/hooks/use-forecast";
import { useAlerts } from "@/hooks/use-alerts";
import { DayTimeline } from "@/components/planner/day-timeline";

interface DaySlot {
  id: string;
  period: string;
  timeRange: string;
  icon: typeof Sun;
  diurnalPattern: string;
  recommendedActivity: string;
  ventilationStatus: "ideal" | "caution" | "avoid";
  maskAdvice: string;
}

const DAY_SLOTS: DaySlot[] = [
  {
    id: "early-morning",
    period: "Early Morning",
    timeRange: "05:00 – 08:30",
    icon: Clock,
    diurnalPattern: "Nocturnal boundary layer compression. Ground-level cold inversion traps heavy diesel exhaust and biomass smoke.",
    recommendedActivity: "Indoor yoga or home exercise. Strenuous outdoor running strictly discouraged.",
    ventilationStatus: "avoid",
    maskAdvice: "N95 / FFP2 mandatory if commuting",
  },
  {
    id: "midday",
    period: "Midday Solar Window",
    timeRange: "11:30 – 15:30",
    icon: Sun,
    diurnalPattern: "Solar heating expands convective mixing height. Particulate concentrations reach their lowest ground-level density.",
    recommendedActivity: "Prime time for outdoor errands, transit, and quick cross-ventilation of living spaces.",
    ventilationStatus: "ideal",
    maskAdvice: "Recommended for sensitive groups",
  },
  {
    id: "evening",
    period: "Evening Rush",
    timeRange: "17:30 – 21:30",
    icon: Sunset,
    diurnalPattern: "Cooling air temperatures cause boundary layer descent. Heavy vehicular traffic leads to sharp PM2.5 and NO₂ spikes.",
    recommendedActivity: "Closed-cabin transit preferred. Seal residential windows before 18:00.",
    ventilationStatus: "avoid",
    maskAdvice: "N95 recommended for all outdoor transit",
  },
  {
    id: "night",
    period: "Night Rest",
    timeRange: "22:00 – 05:00",
    icon: Clock,
    diurnalPattern: "Stable atmospheric conditions with slow lateral air movement. Purified indoor air environment essential for restful sleep.",
    recommendedActivity: "Run HEPA air purifier on low/night mode in closed bedroom.",
    ventilationStatus: "caution",
    maskAdvice: "Not applicable indoors",
  },
];

export function MyDayPlannerPage() {
  const { currentLocation, setIsLocationSelectorOpen } = useLocationState();
  const { currentProfile } = useProfileState();
  const { user } = useAuth();
  const { planUpdatedNotice, clearPlanUpdatedNotice } = useAlerts();
  const [selectedSensitivity, setSelectedSensitivity] = useState("general");
  const [selectedSlot, setSelectedSlot] = useState<string>("midday");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isPlanSaved, setIsPlanSaved] = useState(false);

  // Retrieve current physical observations and dispersion forecast
  const { data: aqData } = useAirQuality(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );
  const { data: forecastData } = useForecast(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  // Call the recommendation engine hook with dynamic telemetry
  const {
    data: recData,
    isLoading: isRecLoading,
    isFetching: isRecFetching,
    error: recError,
    refetch: refetchRecs,
  } = useRecommendations(currentLocation, currentProfile, aqData, forecastData);

  const activeSensitivity =
    SENSITIVITY_PROFILES.find((p) => p.id === selectedSensitivity) ||
    SENSITIVITY_PROFILES[0]!;

  const handleSaveRoutine = async () => {
    if (!user || !recData) return;
    setIsSavingPlan(true);
    try {
      const planPayload: DbSavedPlan["generated_plan"] = {
        headline: `Daily Clean-Air Plan for ${currentLocation?.name || "Local Area"}`,
        summary: `Diurnal schedule optimized for ${currentProfile.category}.`,
        dailyGuidance: {
          morning: recData.sections?.morning?.recommendations?.[0]?.action || "Morning routine",
          afternoon: recData.sections?.afternoon?.recommendations?.[0]?.action || "Afternoon plan",
          evening: recData.sections?.evening?.recommendations?.[0]?.action || "Evening plan",
        },
        recommendations: [
          ...(recData.sections?.morning?.recommendations || []).map((r) => ({
            category: r.actionCategory,
            action: r.action,
            rationale: r.explanation,
            impactRating: "high" as const,
          })),
          ...(recData.sections?.afternoon?.recommendations || []).map((r) => ({
            category: r.actionCategory,
            action: r.action,
            rationale: r.explanation,
            impactRating: "medium" as const,
          })),
          ...(recData.sections?.evening?.recommendations || []).map((r) => ({
            category: r.actionCategory,
            action: r.action,
            rationale: r.explanation,
            impactRating: "high" as const,
          })),
        ],
      };

      await persistenceService.savePlan(
        user.id,
        {
          cityName: currentLocation?.name || "Local Area",
          aqi: recData.environmentalSummary?.observedAqi ?? undefined,
          pm25: recData.environmentalSummary?.observedPm25 ?? undefined,
          timestamp: new Date().toISOString(),
        },
        planPayload
      );
      setIsPlanSaved(true);
      setTimeout(() => setIsPlanSaved(false), 4000);
    } catch (err) {
      console.warn("[MyDay] Save plan exception:", err);
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Editorial Header */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#EDF6D5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111111]">
              <Wind className="h-3.5 w-3.5 text-[#111111]" />
              Diurnal Rhythm Optimization
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
              My Day Clean-Air Planner
            </h1>
            <p className="text-xs sm:text-sm text-[#626762] leading-relaxed">
              Personalized clean-air timeline for{" "}
              <span className="font-semibold text-[#111111]">{currentProfile.displayName || "Navigator"}</span> in{" "}
              <span className="font-semibold text-[#111111]">{currentLocation?.name || "India"}</span>,
              grounded in empirical station telemetry, CAMS dispersion forecasts, and deterministic safety rules.
            </p>
          </div>

          {/* Sensitivity Profile Switcher */}
          <div className="border border-[#D6D6D2] rounded-2xl p-4 bg-white shadow-xs max-w-md w-full">
            <div className="text-[11px] font-bold text-[#111111] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Sensitivity Profile:</span>
              <span className="text-[#2E7D4E] font-mono text-[10px]">{activeSensitivity.label}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SENSITIVITY_PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedSensitivity(p.id)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-xl border transition-all cursor-pointer ${
                    selectedSensitivity === p.id
                      ? "bg-[#D1EB8F] text-[#111111] border-[#D1EB8F] shadow-2xs"
                      : "bg-[#FAFAF8] text-[#626762] border-[#D6D6D2] hover:bg-[#EDF6D5]/60 hover:text-[#111111]"
                  }`}
                >
                  {p.label.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Save Routine Action for Authenticated Users */}
            {user && (
              <div className="pt-3 mt-3 border-t border-[#D6D6D2]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#626762]">
                  {isPlanSaved ? "Saved to your account!" : "Sync today's plan:"}
                </span>
                <Button
                  size="sm"
                  onClick={handleSaveRoutine}
                  disabled={isSavingPlan || !recData}
                  className="rounded-lg bg-[#2E7D4E] hover:bg-[#25633e] text-white text-[11px] font-bold h-7 px-3 cursor-pointer"
                >
                  {isSavingPlan ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : isPlanSaved ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3 w-3 mr-1" />
                      Save Routine
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="space-y-10">
        {/* Subtle Alert-Triggered Plan Invalidation Banner */}
        {planUpdatedNotice && (
          <div
            role="status"
            className="flex items-center justify-between p-4 rounded-2xl border border-[#D1EB8F] bg-[#EDF6D5] text-[#285A1D] text-xs font-medium shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-[#285A1D]" />
              <span>
                <strong>Plan updated due to air-quality changes:</strong> {planUpdatedNotice}
              </span>
            </div>
            <button
              type="button"
              onClick={clearPlanUpdatedNotice}
              className="p-1 rounded-md text-[#285A1D] hover:bg-[#D1EB8F] transition-colors cursor-pointer"
              aria-label="Dismiss plan update notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!currentLocation && (
          <AwaitingReadingState
            locationName="selected Indian location"
            onSelectLocation={() => setIsLocationSelectorOpen(true)}
          />
        )}

        {/* Personalized AI Clean-Air Day Timeline */}
        {currentLocation && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7BB350]" />
                <h2 className="text-sm font-bold tracking-tight uppercase text-[#111111]">
                  Personalized Clean-Air Schedule
                </h2>
              </div>
              <span className="text-[11px] text-[#626762]">
                Evidence-grounded recommendations for {currentProfile.category}
              </span>
            </div>

            <DayTimeline
              data={recData}
              isLoading={isRecLoading}
              isFetching={isRecFetching}
              error={recError as Error | null}
              onRefresh={refetchRecs}
              selectedCityName={currentLocation?.name}
            />
          </section>
        )}

        {/* 24-Hour Diurnal Atmospheric Windows */}
        <section className="pt-6 border-t border-[#D6D6D2]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-[#111111]">
                Diurnal Atmospheric Windows
              </h2>
              <p className="text-[11px] text-[#626762]">
                Empirical atmospheric boundary-layer phases and cross-ventilation safety
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {DAY_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              const Icon = slot.icon;

              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`cursor-pointer rounded-2xl border p-5 transition-all text-left shadow-xs ${
                    isSelected
                      ? "border-[#111111] bg-white ring-1 ring-[#111111]"
                      : "border-[#D6D6D2] bg-white hover:border-[#D1EB8F]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#111111]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge
                      variant={
                        slot.ventilationStatus === "ideal"
                          ? "verified"
                          : slot.ventilationStatus === "caution"
                          ? "modeled"
                          : "waiting"
                      }
                      className={
                        slot.ventilationStatus === "ideal"
                          ? "bg-[#EDF6D5] text-[#111111] border-[#D6D6D2]"
                          : ""
                      }
                    >
                      {slot.ventilationStatus === "ideal"
                        ? "Cleanest Window"
                        : slot.ventilationStatus === "caution"
                        ? "Moderate"
                        : "Peak Inversion"}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-[#111111]">{slot.period}</h3>
                  <div className="text-[11px] text-[#626762] mt-0.5 font-mono">{slot.timeRange}</div>

                  <p className="mt-3 text-xs text-[#626762] line-clamp-3 leading-relaxed">
                    {slot.diurnalPattern}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#D6D6D2]/60 flex items-center justify-between text-[11px]">
                    <span className="text-[#626762]">Ventilation:</span>
                    <span
                      className={`font-semibold ${
                        slot.ventilationStatus === "ideal"
                          ? "text-[#2E7D4E]"
                          : slot.ventilationStatus === "caution"
                          ? "text-[#B8860B]"
                          : "text-[#B93838]"
                      }`}
                    >
                      {slot.ventilationStatus === "ideal" ? "Recommended" : "Keep Closed"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detailed Focus on Selected Time Slot */}
        {selectedSlot && (
          <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
            <CardContent className="p-6">
              {(() => {
                const current = DAY_SLOTS.find((s) => s.id === selectedSlot)!;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="softgreen" className="rounded-lg">{current.timeRange}</Badge>
                        <h3 className="text-base font-bold text-[#111111]">
                          {current.period} Atmospheric Protocol
                        </h3>
                      </div>

                      <p className="text-xs text-[#626762] leading-relaxed">
                        {current.diurnalPattern}
                      </p>

                      <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#111111]">
                          <Activity className="h-4 w-4 text-[#2E7D4E]" />
                          Activity Guidance ({activeSensitivity.label})
                        </div>
                        <p className="text-xs text-[#626762] leading-relaxed">
                          {current.recommendedActivity}
                        </p>
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-[#D6D6D2] md:pl-6 space-y-4">
                      <div className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                        Protective Measures
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-[#626762] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-[#111111] block">Mask Requirement:</span>
                            <span className="text-[#626762]">{current.maskAdvice}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          {current.ventilationStatus === "ideal" ? (
                            <CheckCircle2 className="h-4 w-4 text-[#2E7D4E] shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-[#B8860B] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-[#111111] block">Home Ventilation:</span>
                            <span className="text-[#626762]">
                              {current.ventilationStatus === "ideal"
                                ? "Safe for 15-20 min cross-ventilation"
                                : "Keep windows sealed against infiltration"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
