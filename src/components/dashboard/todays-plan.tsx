import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Sun,
  Wind,
  Home,
  RefreshCw,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useLocationState } from "@/context/location-context";
import { useProfileState } from "@/context/profile-context";
import { useAuth } from "@/context/auth-context";
import { useAirQuality } from "@/hooks/use-air-quality";
import { useForecast } from "@/hooks/use-forecast";
import {
  generateDeterministicDailyPlan,
  CPCB_SEVERITY_COLORS,
  type ComputedDailyPlan,
} from "@/lib/daily-planning-engine";
import { persistenceService } from "@/lib/persistence-service";
import type { DbSavedPlan } from "@/types/database";

export function TodaysPlanCard() {
  const { currentLocation } = useLocationState();
  const { currentProfile } = useProfileState();
  const { user } = useAuth();

  const { data: aqData, refetch: refetchAq } = useAirQuality(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  const { data: forecastData, refetch: refetchForecast } = useForecast(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  const [cachedPlan, setCachedPlan] = useState<ComputedDailyPlan | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Just now");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0]!, []);

  // Compute fresh plan using deterministic engine
  const computedPlan = useMemo<ComputedDailyPlan | null>(() => {
    if (!currentLocation) return null;
    return generateDeterministicDailyPlan(
      currentLocation,
      currentProfile,
      aqData,
      forecastData,
      todayStr
    );
  }, [currentLocation, currentProfile, aqData, forecastData, todayStr]);

  // Load saved plan from database if user is authenticated and matches today + location
  useEffect(() => {
    let isSubscribed = true;

    async function loadCachedPlan() {
      if (!user || !currentLocation) {
        setCachedPlan(null);
        return;
      }

      try {
        const { data: savedPlans } = await persistenceService.getSavedPlans(user.id);
        if (!isSubscribed) return;

        if (savedPlans && savedPlans.length > 0) {
          // Look for plan matching today and current location
          const matchingPlan = savedPlans.find((p) => {
            const planDate = p.environmental_snapshot?.timestamp?.split("T")[0] || p.created_at?.split("T")[0];
            return (
              planDate === todayStr &&
              p.environmental_snapshot?.cityName?.toLowerCase() === currentLocation.name.toLowerCase()
            );
          });

          if (matchingPlan && matchingPlan.generated_plan) {
            // Reconstruct computed plan from saved DB entity
            const gp = matchingPlan.generated_plan;
            const snap = matchingPlan.environmental_snapshot;

            // Type-safe restoration of cached plan
            const restored: ComputedDailyPlan = {
              planId: matchingPlan.id,
              date: todayStr,
              locationName: snap.cityName || currentLocation.name,
              overallSeverity: (snap.aqiCategory as ComputedDailyPlan["overallSeverity"]) || "Moderate",
              dominantPollutant: "PM2.5",
              cleanestWindow: {
                startHour: "12:00",
                endHour: "16:00",
                label: "Midday (12:00 – 16:00)",
                expectedPm25Range: snap.pm25 ? `${Math.round(snap.pm25 * 0.8)}–${Math.round(snap.pm25 * 1.1)} µg/m³` : "Modeled range",
                isAfternoonCleanest: true,
              },
              peakWindow: {
                startHour: "08:00",
                endHour: "10:00",
                label: "Morning Peak",
                expectedPm25: snap.pm25 || 100,
                expectedAqi: snap.aqi || 150,
              },
              diurnalTrend: "improving",
              dataSourceTag: snap.stationName ? `Observed: ${snap.stationName}` : "Saved daily plan",
              isForecastOnly: !snap.stationName,
              isStationStale: false,
              hasSeverePollutionAlert: (snap.aqi && snap.aqi > 200) || (snap.pm25 && snap.pm25 > 120) || false,
              protectiveNotice:
                (snap.aqi && snap.aqi > 200) || (snap.pm25 && snap.pm25 > 120)
                  ? `Protective Alert: Ambient particulate matter is elevated in ${snap.cityName}. Strenuous outdoor workouts should be moved indoors and N95 respirators used for transit.`
                  : undefined,
              periods: {
                morning: {
                  periodName: "Morning",
                  timeWindow: currentProfile.wakeUpTime ? `${currentProfile.wakeUpTime} – 11:00` : "06:30 – 11:00",
                  action: gp.dailyGuidance?.morning || "Keep morning commute protected; use filtered transit where available.",
                  why: gp.recommendations?.[0]?.rationale || "Early morning temperature inversions trap localized particulate matter.",
                  evidence: snap.stationName ? `Station: ${snap.stationName}` : "CAMS Forecast curve",
                  severity: (snap.aqiCategory as ComputedDailyPlan["overallSeverity"]) || "Moderate",
                  priority: "High",
                  lifestyleTip: gp.recommendations?.[0]?.action || "Stay in ventilated corridors.",
                  category: "commute",
                },
                afternoon: {
                  periodName: "Afternoon",
                  timeWindow: "11:00 – 17:00",
                  action: gp.dailyGuidance?.afternoon || "Optimal midday ventilation window; schedule essential outdoor errands.",
                  why: gp.recommendations?.[1]?.rationale || "Solar boundary-layer expansion dilutes ground-level aerosols.",
                  evidence: "Daytime solar mixing",
                  severity: "Satisfactory",
                  priority: "Moderate",
                  lifestyleTip: gp.recommendations?.[1]?.action || "Perform cross-ventilation.",
                  category: "indoor",
                },
                evening: {
                  periodName: "Evening",
                  timeWindow: currentProfile.returnTime ? `${currentProfile.returnTime} – 22:30` : "17:30 – 22:30",
                  action: gp.dailyGuidance?.evening || "Close windows before dusk; pre-filter sleeping areas with HEPA.",
                  why: gp.recommendations?.[2]?.rationale || "Atmospheric boundary layer descends with evening traffic rush.",
                  evidence: "Nocturnal boundary layer",
                  severity: (snap.aqiCategory as ComputedDailyPlan["overallSeverity"]) || "Moderate",
                  priority: "High",
                  lifestyleTip: gp.recommendations?.[2]?.action || "Keep windows sealed.",
                  category: "health_protection",
                },
              },
              environmentalSnapshot: snap,
              medicalDisclaimer:
                "Informational environmental guidance only. Consult healthcare providers for respiratory symptoms. Seek emergency care for severe breathing difficulty.",
            };

            setCachedPlan(restored);
            const savedTime = new Date(matchingPlan.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            setLastUpdated(`Saved today at ${savedTime}`);
            return;
          }
        }

        // If no matching saved plan exists today, save the newly computed plan to Supabase
        if (computedPlan) {
          const snapshot = computedPlan.environmentalSnapshot;
          const generatedPlan: DbSavedPlan["generated_plan"] = {
            headline: `Daily Clean-Air Plan for ${currentLocation.name}`,
            summary: computedPlan.protectiveNotice || `Diurnal clean-air pacing for ${currentProfile.category}.`,
            dailyGuidance: {
              morning: computedPlan.periods.morning.action,
              afternoon: computedPlan.periods.afternoon.action,
              evening: computedPlan.periods.evening.action,
            },
            recommendations: [
              {
                category: computedPlan.periods.morning.category,
                action: computedPlan.periods.morning.action,
                rationale: computedPlan.periods.morning.why,
                impactRating: "high",
              },
              {
                category: computedPlan.periods.afternoon.category,
                action: computedPlan.periods.afternoon.action,
                rationale: computedPlan.periods.afternoon.why,
                impactRating: "medium",
              },
              {
                category: computedPlan.periods.evening.category,
                action: computedPlan.periods.evening.action,
                rationale: computedPlan.periods.evening.why,
                impactRating: "high",
              },
            ],
          };

          await persistenceService.savePlan(user.id, snapshot, generatedPlan);
          setLastUpdated("Generated today just now");
        }
      } catch (err) {
        console.warn("[TodaysPlan] Error loading cached plan:", err);
      }
    }

    loadCachedPlan();

    return () => {
      isSubscribed = false;
    };
  }, [user, currentLocation, todayStr, computedPlan, currentProfile]);

  // Active plan to display (prefers cached plan if valid for today, falls back to freshly computed)
  const activePlan = cachedPlan || computedPlan;

  // Handle explicit refresh button
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refetchAq(), refetchForecast()]);
      if (user && currentLocation && computedPlan) {
        const snapshot = computedPlan.environmentalSnapshot;
        const generatedPlan: DbSavedPlan["generated_plan"] = {
          headline: `Daily Clean-Air Plan for ${currentLocation.name}`,
          summary: computedPlan.protectiveNotice || `Updated diurnal plan for ${currentLocation.name}.`,
          dailyGuidance: {
            morning: computedPlan.periods.morning.action,
            afternoon: computedPlan.periods.afternoon.action,
            evening: computedPlan.periods.evening.action,
          },
          recommendations: [
            {
              category: computedPlan.periods.morning.category,
              action: computedPlan.periods.morning.action,
              rationale: computedPlan.periods.morning.why,
              impactRating: "high",
            },
            {
              category: computedPlan.periods.afternoon.category,
              action: computedPlan.periods.afternoon.action,
              rationale: computedPlan.periods.afternoon.why,
              impactRating: "medium",
            },
            {
              category: computedPlan.periods.evening.category,
              action: computedPlan.periods.evening.action,
              rationale: computedPlan.periods.evening.why,
              impactRating: "high",
            },
          ],
        };
        await persistenceService.savePlan(user.id, snapshot, generatedPlan);
        setCachedPlan(computedPlan);
      }
      setLastUpdated("Just now");
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAq, refetchForecast, user, currentLocation, computedPlan]);

  const formattedToday = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const morningPeriod = activePlan?.periods.morning;
  const afternoonPeriod = activePlan?.periods.afternoon;
  const eveningPeriod = activePlan?.periods.evening;

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs flex flex-col justify-between h-full space-y-5">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#D6D6D2]/60 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#111111]" />
              <h3 className="text-xl font-bold tracking-tight text-[#111111]">
                Today's plan
              </h3>
              <span className="sr-only">My Day Planner Preview</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDF6D5] text-[#285A1D] border border-[#D1EB8F] font-semibold">
                {activePlan?.overallSeverity || "Active"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#626762]">
              <span className="flex items-center gap-1 font-medium text-[#111111]">
                <MapPin className="h-3 w-3 text-[#2E7D4E]" />
                {currentLocation?.name || "Local Area"}
              </span>
              <span>•</span>
              <span>{formattedToday}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lastUpdated}
              </span>
            </div>
          </div>

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D6D6D2] bg-[#FAFAF8] hover:bg-[#EDF6D5] text-xs font-semibold text-[#111111] transition-colors disabled:opacity-50"
            title="Refresh plan with latest atmospheric observations"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh Plan</span>
          </button>
        </div>

        {/* Severe Pollution Warning Banner */}
        {activePlan?.hasSeverePollutionAlert && (
          <div className="rounded-xl border border-[#F8B4B4] bg-[#FDF2F2] p-3.5 flex items-start gap-3 text-xs text-[#991B1B]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#B93838]" />
            <div className="space-y-0.5">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Protective Pollution Override Active
              </span>
              <p className="text-[11px] leading-relaxed">
                {activePlan.protectiveNotice ||
                  "Air quality is currently Poor or Severe. Avoid intense outdoor exertion, keep windows sealed, and equip an N95 respirator."}
              </p>
            </div>
          </div>
        )}

        {/* 3 Periods: Morning, Afternoon, Evening */}
        <div className="space-y-4">
          {/* Segment 1: Morning */}
          {morningPeriod && (
            <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-[#111111]">
                  <Sun className="h-4 w-4 text-[#B8860B]" />
                  <span>Morning ({morningPeriod.timeWindow})</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    CPCB_SEVERITY_COLORS[morningPeriod.severity]?.bg || "bg-white"
                  } ${CPCB_SEVERITY_COLORS[morningPeriod.severity]?.text || "text-[#111111]"} ${
                    CPCB_SEVERITY_COLORS[morningPeriod.severity]?.border || "border-[#D6D6D2]"
                  }`}
                >
                  {morningPeriod.severity}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#111111] leading-snug">
                {morningPeriod.action}
              </p>
              <div className="space-y-1 text-[11px] text-[#626762] pt-1 border-t border-[#D6D6D2]/50">
                <p>
                  <strong>Why this recommendation?</strong> {morningPeriod.why}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#2E7D4E]">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>{morningPeriod.evidence}</span>
                </div>
              </div>
            </div>
          )}

          {/* Segment 2: Afternoon */}
          {afternoonPeriod && (
            <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-[#111111]">
                  <Wind className="h-4 w-4 text-[#2E7D4E]" />
                  <span>Afternoon ({afternoonPeriod.timeWindow})</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    CPCB_SEVERITY_COLORS[afternoonPeriod.severity]?.bg || "bg-white"
                  } ${CPCB_SEVERITY_COLORS[afternoonPeriod.severity]?.text || "text-[#111111]"} ${
                    CPCB_SEVERITY_COLORS[afternoonPeriod.severity]?.border || "border-[#D6D6D2]"
                  }`}
                >
                  {afternoonPeriod.severity}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#111111] leading-snug">
                {afternoonPeriod.action}
              </p>
              <div className="space-y-1 text-[11px] text-[#626762] pt-1 border-t border-[#D6D6D2]/50">
                <p>
                  <strong>Why this recommendation?</strong> {afternoonPeriod.why}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#2E7D4E]">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>{afternoonPeriod.evidence}</span>
                </div>
              </div>
            </div>
          )}

          {/* Segment 3: Evening */}
          {eveningPeriod && (
            <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-[#111111]">
                  <Home className="h-4 w-4 text-[#626762]" />
                  <span>Evening ({eveningPeriod.timeWindow})</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    CPCB_SEVERITY_COLORS[eveningPeriod.severity]?.bg || "bg-white"
                  } ${CPCB_SEVERITY_COLORS[eveningPeriod.severity]?.text || "text-[#111111]"} ${
                    CPCB_SEVERITY_COLORS[eveningPeriod.severity]?.border || "border-[#D6D6D2]"
                  }`}
                >
                  {eveningPeriod.severity}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#111111] leading-snug">
                {eveningPeriod.action}
              </p>
              <div className="space-y-1 text-[11px] text-[#626762] pt-1 border-t border-[#D6D6D2]/50">
                <p>
                  <strong>Why this recommendation?</strong> {eveningPeriod.why}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#2E7D4E]">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>{eveningPeriod.evidence}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Link to /my-day */}
      <div className="pt-2 flex items-center justify-between text-xs border-t border-[#D6D6D2]/40">
        <span className="text-[11px] text-[#626762]">
          {activePlan?.dataSourceTag || "Modeled CAMS Global Dispersion"}
        </span>
        <Link
          to="/my-day"
          className="font-semibold text-[#111111] hover:text-[#2E7D4E] hover:underline"
        >
          View detailed 24h schedule →
        </Link>
      </div>
    </div>
  );
}
