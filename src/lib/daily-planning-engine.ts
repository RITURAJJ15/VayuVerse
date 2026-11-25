import type { GeoLocation } from "@/types/location";
import type { UserProfile } from "@/types/profile";
import type { StationObservationResponse } from "@/types/air-quality";
import type {
  AirQualityForecastResponse,
  HourlyForecastPoint,
  DayForecastSummary,
} from "@/types/forecast";
import type { DayPlanResponse } from "@/types/recommendations";

export type NaqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe"
  | "Unavailable";

export interface CleanestWindowInfo {
  startHour: string;
  endHour: string;
  label: string;
  expectedPm25Range: string;
  expectedAqiRange?: string;
  isAfternoonCleanest: boolean;
}

export interface PeakPollutionWindowInfo {
  startHour: string;
  endHour: string;
  label: string;
  expectedPm25: number | null;
  expectedAqi: number | null;
}

export interface DailyPlanPeriod {
  periodName: "Morning" | "Afternoon" | "Evening";
  timeWindow: string;
  action: string;
  why: string;
  evidence: string;
  severity: NaqiCategory;
  priority: "Low" | "Moderate" | "High" | "Critical";
  lifestyleTip: string;
  category: "commute" | "indoor" | "outdoor" | "lifestyle" | "health_protection";
}

export interface ComputedDailyPlan {
  planId: string;
  date: string;
  locationName: string;
  overallSeverity: NaqiCategory;
  dominantPollutant: string;
  cleanestWindow: CleanestWindowInfo;
  peakWindow: PeakPollutionWindowInfo;
  diurnalTrend: "improving" | "deteriorating" | "stable" | "inverted";
  dataSourceTag: string;
  isForecastOnly: boolean;
  isStationStale: boolean;
  hasSeverePollutionAlert: boolean;
  protectiveNotice?: string;
  periods: {
    morning: DailyPlanPeriod;
    afternoon: DailyPlanPeriod;
    evening: DailyPlanPeriod;
  };
  environmentalSnapshot: {
    cityName: string;
    stationName?: string;
    aqi?: number;
    aqiCategory?: string;
    pm25?: number;
    pm10?: number;
    timestamp: string;
  };
  medicalDisclaimer: string;
}

/**
 * Maps PM2.5 (24h continuous average) to official Indian CPCB NAQI Category
 */
export function getIndianNaqiCategoryFromPm25(pm25: number | null | undefined): NaqiCategory {
  if (pm25 === null || pm25 === undefined || isNaN(pm25)) return "Unavailable";
  if (pm25 <= 30) return "Good";
  if (pm25 <= 60) return "Satisfactory";
  if (pm25 <= 90) return "Moderate";
  if (pm25 <= 120) return "Poor";
  if (pm25 <= 250) return "Very Poor";
  return "Severe";
}

/**
 * Maps overall AQI value to official Indian CPCB NAQI Category
 */
export function getIndianNaqiCategoryFromAqi(aqi: number | null | undefined): NaqiCategory {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return "Unavailable";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

export const CPCB_SEVERITY_COLORS: Record<NaqiCategory, { bg: string; text: string; border: string; pill: string }> = {
  Good: { bg: "bg-[#EDF6D5]", text: "text-[#285A1D]", border: "border-[#D1EB8F]", pill: "#2E7D4E" },
  Satisfactory: { bg: "bg-[#F0FDF4]", text: "text-[#166534]", border: "border-[#BBF7D0]", pill: "#5A8B35" },
  Moderate: { bg: "bg-[#FEFCE8]", text: "text-[#854D0E]", border: "border-[#FEF08A]", pill: "#B8860B" },
  Poor: { bg: "bg-[#FFF7ED]", text: "text-[#9A3412]", border: "border-[#FFEDD5]", pill: "#C65D28" },
  "Very Poor": { bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", border: "border-[#FECACA]", pill: "#B93838" },
  Severe: { bg: "bg-[#450A0A]/10 text-[#450A0A]", text: "text-[#450A0A]", border: "border-[#7F1D1D]", pill: "#731E1E" },
  Unavailable: { bg: "bg-[#F3F4F6]", text: "text-[#4B5563]", border: "border-[#E5E7EB]", pill: "#6B7280" },
};

/**
 * Analyzes the hourly forecast curve for the day to find:
 * - The actual cleanest window
 * - The peak pollution window
 * - The diurnal trend (does not assume afternoons are cleaner if data shows otherwise!)
 */
export function analyzeForecastCurve(forecast?: AirQualityForecastResponse): {
  cleanestWindow: CleanestWindowInfo;
  peakWindow: PeakPollutionWindowInfo;
  diurnalTrend: "improving" | "deteriorating" | "stable" | "inverted";
} {
  const dayZero = forecast?.days?.[0] as (DayForecastSummary & { hours?: HourlyForecastPoint[] }) | undefined;
  const hours = dayZero?.hourly || dayZero?.hours || [];

  if (!hours || hours.length === 0) {
    return {
      cleanestWindow: {
        startHour: "12:00",
        endHour: "16:00",
        label: "Midday (12:00 – 16:00)",
        expectedPm25Range: "Pending forecast sync",
        isAfternoonCleanest: true,
      },
      peakWindow: {
        startHour: "08:00",
        endHour: "10:00",
        label: "Morning rush (08:00 – 10:00)",
        expectedPm25: null,
        expectedAqi: null,
      },
      diurnalTrend: "stable",
    };
  }

  // Filter daytime and scan for min and max PM2.5
  let minPm25 = Infinity;
  let minHourIdx = -1;
  let maxPm25 = -Infinity;
  let maxHourIdx = -1;

  for (let i = 0; i < hours.length; i++) {
    const val = hours[i]?.pm25;
    if (val !== null && val !== undefined && !isNaN(val)) {
      if (val < minPm25) {
        minPm25 = val;
        minHourIdx = i;
      }
      if (val > maxPm25) {
        maxPm25 = val;
        maxHourIdx = i;
      }
    }
  }

  // Fallbacks if all null
  if (minHourIdx === -1) {
    minHourIdx = 14;
    minPm25 = 45;
  }
  if (maxHourIdx === -1) {
    maxHourIdx = 8;
    maxPm25 = 110;
  }

  const cleanestHour = hours[minHourIdx]?.hour || 14;
  const peakHour = hours[maxHourIdx]?.hour || 8;

  // Window format
  const startClean = Math.max(6, cleanestHour - 1);
  const endClean = Math.min(22, cleanestHour + 2);

  const startPeak = Math.max(6, peakHour - 1);
  const endPeak = Math.min(23, peakHour + 1);

  const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

  const isAfternoonCleanest = cleanestHour >= 11 && cleanestHour <= 17;

  // Diurnal trend analysis based on morning (07-09), afternoon (13-15), evening (19-21)
  const getAvgRange = (start: number, end: number) => {
    const slice = hours.filter((h: HourlyForecastPoint) => h.hour >= start && h.hour <= end && h.pm25 !== null);
    if (slice.length === 0) return null;
    return slice.reduce((acc: number, curr: HourlyForecastPoint) => acc + (curr.pm25 || 0), 0) / slice.length;
  };

  const morningAvg = getAvgRange(7, 9);
  const afternoonAvg = getAvgRange(13, 15);
  const eveningAvg = getAvgRange(19, 21);

  let diurnalTrend: "improving" | "deteriorating" | "stable" | "inverted" = "stable";

  if (morningAvg !== null && afternoonAvg !== null && eveningAvg !== null) {
    if (afternoonAvg < morningAvg * 0.8 && eveningAvg > afternoonAvg * 1.2) {
      // Standard daytime solar boundary layer expansion with nocturnal inversion
      diurnalTrend = "improving";
    } else if (afternoonAvg > morningAvg * 1.2) {
      // Unusual afternoon spike (e.g. dust or secondary ozone)
      diurnalTrend = "inverted";
    } else if (eveningAvg > afternoonAvg * 1.25) {
      diurnalTrend = "deteriorating";
    }
  }

  return {
    cleanestWindow: {
      startHour: formatHour(startClean),
      endHour: formatHour(endClean),
      label: `${formatHour(startClean)} – ${formatHour(endClean)}`,
      expectedPm25Range: `${Math.round(minPm25 * 0.9)}–${Math.round(minPm25 * 1.15)} µg/m³`,
      isAfternoonCleanest,
    },
    peakWindow: {
      startHour: formatHour(startPeak),
      endHour: formatHour(endPeak),
      label: `${formatHour(startPeak)} – ${formatHour(endPeak)}`,
      expectedPm25: Math.round(maxPm25),
      expectedAqi: Math.round(maxPm25 * 1.5),
    },
    diurnalTrend,
  };
}

/**
 * Deterministically constructs a comprehensive daily clean-air plan
 * adhering strictly to CPCB categories, CAMS curves, and persona lifestyle.
 */
export function generateDeterministicDailyPlan(
  location: GeoLocation,
  profile: UserProfile,
  observations?: StationObservationResponse,
  forecast?: AirQualityForecastResponse,
  customDate?: string
): ComputedDailyPlan {
  const today = customDate || new Date().toISOString().split("T")[0]!;

  const isObsAvailable = Boolean(observations?.isAvailable && observations?.station);
  const isStale = Boolean(
    observations?.freshness?.category === "stale" ||
    (observations?.freshness?.hoursAgo && observations.freshness.hoursAgo > 24)
  );

  const observedPm25 = isObsAvailable && !isStale ? observations?.pm25?.value ?? null : null;
  const observedPm10 = isObsAvailable && !isStale ? observations?.pm10?.value ?? null : null;
  const observedAqi = isObsAvailable && !isStale ? observations?.naqi?.overallAqi ?? null : null;

  // Dominant pollutant
  const dominantPollutant = observations?.naqi?.responsiblePollutant || "PM2.5";

  // Forecast curve metrics
  const { cleanestWindow, peakWindow, diurnalTrend } = analyzeForecastCurve(forecast);

  // Overall day severity calculation:
  // If observed AQI is available, use it; otherwise compute from observed PM2.5 or peak forecast
  const isDataUnavailable = observedAqi === null && observedPm25 === null && peakWindow.expectedPm25 === null;

  let overallSeverity: NaqiCategory;
  if (observedAqi !== null) {
    overallSeverity = getIndianNaqiCategoryFromAqi(observedAqi);
  } else if (observedPm25 !== null) {
    overallSeverity = getIndianNaqiCategoryFromPm25(observedPm25);
  } else if (peakWindow.expectedPm25 !== null) {
    overallSeverity = getIndianNaqiCategoryFromPm25(peakWindow.expectedPm25);
  } else {
    overallSeverity = "Unavailable";
  }

  const isPoorOrWorse =
    overallSeverity === "Poor" ||
    overallSeverity === "Very Poor" ||
    overallSeverity === "Severe";

  // Data source tag
  let dataSourceTag = "Modeled: CAMS Global Forecast (~40km grid)";
  let isForecastOnly = true;

  if (isObsAvailable && !isStale) {
    dataSourceTag = `Observed: ${observations?.station?.name || "Ground Station"} (${observations?.station?.distanceKm ? `${observations.station.distanceKm} km` : "CAAQMS"})`;
    isForecastOnly = false;
  } else if (isStale) {
    dataSourceTag = `Ground station telemetry is stale (>24h). Modeled CAMS forecast active.`;
    isForecastOnly = true;
  }

  // Severe pollution protective notice
  const hasSeverePollutionAlert = isPoorOrWorse;
  const protectiveNotice = hasSeverePollutionAlert
    ? `Protective Alert (${overallSeverity} Pollution): Ambient particulate matter is significantly elevated. Strenuous outdoor workouts should be suspended or moved indoors. Equip an N95/FFP2 respirator for necessary transit, operate mechanical HEPA filtration, and keep residential windows sealed.`
    : undefined;

  // Determine period time windows using user's routine
  const wakeUp = profile.wakeUpTime || "06:30";
  const departure = profile.departureTime || "08:30";
  const returnTime = profile.returnTime || "17:30";
  const sleepTime = profile.sleepTime || "22:30";

  const morningWindow = `${wakeUp} – ${departure}`;
  const afternoonWindow = `11:00 – ${returnTime.split(":")[0] || "17"}:00`;
  const eveningWindow = `${returnTime.split(":")[0] || "17"}:00 – ${sleepTime}`;

  // Priority mapping based on overall severity
  const basePriority: "Low" | "Moderate" | "High" | "Critical" =
    overallSeverity === "Severe"
      ? "Critical"
      : overallSeverity === "Very Poor" || overallSeverity === "Poor"
      ? "High"
      : overallSeverity === "Moderate"
      ? "Moderate"
      : "Low";

  // Evidence string
  const evidenceObs = observedPm25 !== null
    ? `${observations?.station?.name || "Local station"} PM2.5: ${Math.round(observedPm25)} µg/m³`
    : `CAMS dispersion forecast (${cleanestWindow.expectedPm25Range})`;

  // ==================== 1. Morning Period ====================
  let morningAction: string;
  let morningWhy: string;
  let morningTip: string;

  if (isDataUnavailable) {
    morningAction = "Awaiting local air readings; standard indoor daily routine recommended.";
    morningWhy = "Real-time ground station and forecast streams are currently pending sync for this locality.";
    morningTip = "Check back shortly or refresh when monitoring connection is active.";
  } else if (overallSeverity === "Good" || overallSeverity === "Satisfactory") {
    morningAction = "Safe for morning commute, walks, and standard outdoor activities.";
    morningWhy = `Air quality is ${overallSeverity} (${evidenceObs}). Surface boundary conditions allow comfortable outdoor movement.`;
    morningTip = profile.category === "college_student"
      ? "Walking or cycling across campus is safe this morning."
      : profile.category === "senior_citizen"
      ? "Good window for morning park walks or light stretching."
      : "Standard morning routine without respiratory constraints.";
  } else if (overallSeverity === "Moderate") {
    morningAction = "Moderate morning activity; sensitive groups should consider sheltered transit.";
    morningWhy = `PM2.5 levels are moderate (${evidenceObs}). Morning ground inversion may concentrate vehicular exhaust along traffic arteries.`;
    morningTip = profile.category === "parent_child"
      ? "Ensure school bus windows are kept closed during morning rush."
      : profile.commuteMode === "two_wheeler"
      ? "Consider wearing an N95 mask in dense traffic corridors."
      : "Ventilate indoor spaces briefly only if facing away from high-traffic roadways.";
  } else {
    // Poor, Very Poor, Severe
    morningAction = profile.category === "senior_citizen"
      ? "Perform all morning stretching indoors. Postpone outdoor walks completely."
      : profile.commuteMode === "two_wheeler" || profile.commuteMode === "walk_cycle"
      ? "Mandatory N95/FFP2 mask for commute. Switch to closed metro/cab if possible."
      : "Keep residence tightly closed; avoid outdoor cardio or exercise.";
    morningWhy = `Morning surface thermal inversion traps heavy diesel exhaust and PM2.5 near breathing level (${evidenceObs}).`;
    morningTip = profile.category === "college_student"
      ? "Study in ventilated campus libraries rather than open outdoor benches."
      : profile.category === "senior_citizen"
      ? "Perform gentle indoor movement and stretching; postpone outdoor walks."
      : profile.hasChildren
      ? "Avoid early morning outdoor playtime for children."
      : "Run bedroom HEPA purifier on whisper mode until leaving home.";
  }

  // ==================== 2. Afternoon Period ====================
  let afternoonAction: string;
  let afternoonWhy: string;
  let afternoonTip: string;

  if (isDataUnavailable) {
    afternoonAction = "Maintain standard indoor routines; verify local readings before intense workouts.";
    afternoonWhy = "Midday solar boundary-layer status pending live atmospheric observation sync.";
    afternoonTip = "Check back once monitoring station link is updated.";
  } else if (cleanestWindow.isAfternoonCleanest && !isPoorOrWorse) {
    afternoonAction = `Best window for necessary outdoor errands and 20-min cross-ventilation (${cleanestWindow.label}).`;
    afternoonWhy = `Solar heating expands the convective boundary-layer mixing height, diluting ground particulate density (${cleanestWindow.expectedPm25Range}).`;
    afternoonTip = "Open opposite windows for 15-20 minutes to purge indoor carbon dioxide without heavy particulate ingress.";
  } else if (isPoorOrWorse) {
    afternoonAction = "Maintain sealed indoor environment; keep residential windows closed despite daytime sun.";
    afternoonWhy = `Even with daytime boundary layer expansion, regional particulate load remains elevated in the ${overallSeverity} category (${evidenceObs}).`;
    afternoonTip = "Operate air purifiers continuously on auto mode in primary work or living spaces.";
  } else {
    afternoonAction = "Standard afternoon routines; schedule outdoor tasks during cleanest window.";
    afternoonWhy = `Forecast indicates stable conditions with PM2.5 hovering around ${cleanestWindow.expectedPm25Range}.`;
    afternoonTip = "Opt for indoor dining or shaded corridors during peak midday hours.";
  }

  // ==================== 3. Evening Period ====================
  let eveningAction: string;
  let eveningWhy: string;
  let eveningTip: string;

  if (isDataUnavailable) {
    eveningAction = "Standard evening routine; minimize unnecessary exposure along heavy traffic corridors.";
    eveningWhy = "Nocturnal particulate dispersion conditions pending verified sensor telemetry.";
    eveningTip = "Keep bedroom windows closed and operate indoor filtration if available.";
  } else if (isPoorOrWorse) {
    eveningAction = "Close and seal all windows before dusk (17:30). Pre-filter bedroom 1 hour prior to sleep.";
    eveningWhy = `Cooling evening temperatures trigger boundary-layer descent and traffic exhaust trapping (${peakWindow.label}).`;
    eveningTip = profile.purifierAvailability !== "none"
      ? "Turn bedroom HEPA purifier to medium 45 minutes before bedtime, then switch to quiet night mode."
      : "Use draft stoppers under bedroom doors and keep window latches firmly engaged.";
  } else if (overallSeverity === "Moderate") {
    eveningAction = "Keep windows closed during evening traffic peak (18:00 – 20:30). Prefer indoor workouts.";
    eveningWhy = `Evening rush-hour emissions coincide with cooling ambient temperatures, causing localized particulate rise.`;
    eveningTip = "Use kitchen chimney/exhaust fan before lighting stove burners for dinner preparation.";
  } else {
    eveningAction = "Favorable evening atmosphere. Safe for evening walks or outdoor recreation.";
    eveningWhy = `Ambient conditions remain ${overallSeverity} through the evening hours with stable dispersion.`;
    eveningTip = "Good time for outdoor recreation or park exercise.";
  }

  return {
    planId: `plan-${location.name.toLowerCase().replace(/\s+/g, "-")}-${today}`,
    date: today,
    locationName: location.name,
    overallSeverity,
    dominantPollutant,
    cleanestWindow,
    peakWindow,
    diurnalTrend,
    dataSourceTag,
    isForecastOnly,
    isStationStale: isStale,
    hasSeverePollutionAlert,
    protectiveNotice,
    periods: {
      morning: {
        periodName: "Morning",
        timeWindow: morningWindow,
        action: morningAction,
        why: morningWhy,
        evidence: isDataUnavailable ? "Pending sensor sync" : evidenceObs,
        severity: overallSeverity,
        priority: isDataUnavailable ? "Low" : basePriority,
        lifestyleTip: morningTip,
        category: "outdoor",
      },
      afternoon: {
        periodName: "Afternoon",
        timeWindow: afternoonWindow,
        action: afternoonAction,
        why: afternoonWhy,
        evidence: isDataUnavailable ? "Pending forecast sync" : `Forecast Window: ${cleanestWindow.label}`,
        severity: isDataUnavailable ? "Unavailable" : cleanestWindow.isAfternoonCleanest && !isPoorOrWorse ? "Satisfactory" : overallSeverity,
        priority: isDataUnavailable ? "Low" : cleanestWindow.isAfternoonCleanest ? "Moderate" : basePriority,
        lifestyleTip: afternoonTip,
        category: "indoor",
      },
      evening: {
        periodName: "Evening",
        timeWindow: eveningWindow,
        action: eveningAction,
        why: eveningWhy,
        evidence: isDataUnavailable ? "Pending telemetry" : `Peak Inversion: ${peakWindow.label}`,
        severity: isDataUnavailable ? "Unavailable" : isPoorOrWorse ? "Very Poor" : overallSeverity,
        priority: isDataUnavailable ? "Low" : isPoorOrWorse ? "Critical" : basePriority,
        lifestyleTip: eveningTip,
        category: "health_protection",
      },
    },
    environmentalSnapshot: {
      cityName: location.name,
      stationName: observations?.station?.name,
      aqi: observedAqi ?? peakWindow.expectedAqi ?? undefined,
      aqiCategory: overallSeverity,
      pm25: observedPm25 ?? peakWindow.expectedPm25 ?? undefined,
      pm10: observedPm10 ?? undefined,
      timestamp: new Date().toISOString(),
    },
    medicalDisclaimer:
      "Informational environmental guidance only. Not a clinical diagnosis or individualized medical advice. Consult a healthcare provider for persistent cough, asthma flare-ups, or respiratory symptoms. Seek immediate emergency medical care for severe shortness of breath or chest tightness.",
  };
}

/**
 * Adapts a ComputedDailyPlan into the DayPlanResponse format expected by UI & DB.
 */
export function adaptComputedPlanToResponse(plan: ComputedDailyPlan): DayPlanResponse {
  return {
    locationName: plan.locationName,
    generatedAtUtc: new Date().toISOString(),
    personaTitle: "Daily Air-Quality Routine",
    isAiGenerated: false,
    modelUsed: "Deterministic Indian CPCB & CAMS Rules Engine",
    sections: {
      morning: {
        period: "morning",
        title: "Morning Routine",
        timeRange: plan.periods.morning.timeWindow,
        atmosphericContext: plan.periods.morning.why,
        recommendations: [
          {
            id: `det-m-${plan.date}`,
            title: "Morning Action",
            action: plan.periods.morning.action,
            explanation: plan.periods.morning.why,
            timeWindow: plan.periods.morning.timeWindow,
            evidenceReferences: [plan.periods.morning.evidence],
            confidenceLevel: plan.isForecastOnly ? "Medium" : "High",
            limitations: plan.periods.morning.lifestyleTip,
            actionCategory: plan.periods.morning.category,
          },
        ],
      },
      afternoon: {
        period: "afternoon",
        title: "Afternoon Plan",
        timeRange: plan.periods.afternoon.timeWindow,
        atmosphericContext: plan.periods.afternoon.why,
        recommendations: [
          {
            id: `det-a-${plan.date}`,
            title: "Afternoon Action",
            action: plan.periods.afternoon.action,
            explanation: plan.periods.afternoon.why,
            timeWindow: plan.periods.afternoon.timeWindow,
            evidenceReferences: [plan.periods.afternoon.evidence],
            confidenceLevel: "Medium",
            limitations: plan.periods.afternoon.lifestyleTip,
            actionCategory: plan.periods.afternoon.category,
          },
        ],
      },
      evening: {
        period: "evening",
        title: "Evening & Rest",
        timeRange: plan.periods.evening.timeWindow,
        atmosphericContext: plan.periods.evening.why,
        recommendations: [
          {
            id: `det-e-${plan.date}`,
            title: "Evening Action",
            action: plan.periods.evening.action,
            explanation: plan.periods.evening.why,
            timeWindow: plan.periods.evening.timeWindow,
            evidenceReferences: [plan.periods.evening.evidence],
            confidenceLevel: "High",
            limitations: plan.periods.evening.lifestyleTip,
            actionCategory: plan.periods.evening.category,
          },
        ],
      },
    },
    environmentalSummary: {
      observedStationName: plan.environmentalSnapshot.stationName || null,
      observedPm25: plan.environmentalSnapshot.pm25 ?? null,
      observedPm10: plan.environmentalSnapshot.pm10 ?? null,
      observedAqi: plan.environmentalSnapshot.aqi ?? null,
      forecastCleanestWindow: plan.cleanestWindow.label,
      dataFreshnessStatus: plan.isStationStale ? "Stale (>24h)" : plan.isForecastOnly ? "Modeled Forecast" : "Live Telemetry",
    },
    safetyRulesApplied: [
      plan.dataSourceTag,
      `Severity: ${plan.overallSeverity}`,
      `Trend: ${plan.diurnalTrend}`,
      ...(plan.hasSeverePollutionAlert ? ["PROTECTIVE_OVERRIDE_ACTIVE"] : []),
    ],
  };
}
