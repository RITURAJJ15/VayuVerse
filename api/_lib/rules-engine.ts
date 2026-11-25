import type { GeoLocation } from "../../src/types/location.js";
import type { UserProfile } from "../../src/types/profile.js";
import type { StationObservationResponse } from "../../src/types/air-quality.js";
import type { AirQualityForecastResponse } from "../../src/types/forecast.js";
import type {
  DeterministicRulesResult,
  DayPlanResponse,
  RecommendationAction,
} from "../../src/types/recommendations.js";

/**
 * Evaluates deterministic environmental safety constraints and builds
 * an evidence payload for Gemini, as well as an evidence-grounded fallback plan.
 */
export function evaluateDeterministicRules(
  location: GeoLocation,
  profile: UserProfile,
  observations?: StationObservationResponse,
  forecast?: AirQualityForecastResponse
): DeterministicRulesResult {
  const constraints: string[] = [];

  // 1. Environmental Data Availability & Freshness checks
  const isObsAvailable = Boolean(observations?.isAvailable && observations.station);
  const isStale = Boolean(
    observations?.freshness?.category === "stale" ||
    (observations?.freshness?.hoursAgo && observations.freshness.hoursAgo > 24)
  );
  const isDelayed = observations?.freshness?.category === "delayed";

  if (!isObsAvailable) {
    constraints.push(
      "STATION_UNAVAILABLE: No active ground monitoring stations within 25 km. Rely strictly on regional modeled CAMS forecasts and general caution."
    );
  } else if (isStale) {
    constraints.push(
      "STATION_STALE: Station measurements are >24h old. Must NOT present archived numbers as real-time atmosphere. Prioritize atmospheric dispersion forecast."
    );
  } else if (isDelayed) {
    constraints.push(
      "STATION_DELAYED: Station telemetry was delayed (>12h). Advise that local conditions may have evolved."
    );
  }

  // Current physical numbers (if verified and not stale)
  const currentPm25 = isObsAvailable && !isStale ? observations?.pm25?.value ?? null : null;
  const currentPm10 = isObsAvailable && !isStale ? observations?.pm10?.value ?? null : null;
  const currentAqi = isObsAvailable && !isStale ? observations?.naqi?.overallAqi ?? null : null;

  // 2. Elevated Pollution Thresholds
  const isElevated = (currentPm25 !== null && currentPm25 > 60) || (currentAqi !== null && currentAqi > 100);
  const isSevere = (currentPm25 !== null && currentPm25 > 120) || (currentAqi !== null && currentAqi > 200);

  if (isElevated) {
    constraints.push(
      "ELEVATED_POLLUTION: PM2.5 exceeds national ambient standard (60 µg/m³). Avoid recommending outdoor running, heavy cycling, or prolonged outdoor workouts."
    );
  }

  if (isSevere) {
    constraints.push(
      "SEVERE_EXPOSURE_RISK: Highly polluted ambient atmosphere. Mandate N95/FFP2 mask for unavoidable outdoor transit; strongly discourage open two-wheelers or open-window transit."
    );
  }

  // 3. User Persona and Household Vulnerabilities
  const isVulnerable =
    profile.sensitivity === "high" ||
    profile.hasChildren ||
    profile.hasSeniors ||
    profile.category === "senior_citizen" ||
    profile.category === "parent_child";

  if (isVulnerable) {
    constraints.push(
      "VULNERABLE_POPULATION: Children, seniors, or respiratory-sensitive members present. Prioritize indoor clean-air sanctuaries and strictly limit outdoor exposure during morning/evening thermal inversions."
    );
  }

  if (profile.category === "senior_citizen" || profile.hasSeniors) {
    constraints.push(
      "VULNERABLE_SENIOR: Advanced age group. Morning outdoor exertion strictly discouraged during nocturnal winter inversions."
    );
  }

  // 4. Commute Considerations
  if (profile.commuteMode === "two_wheeler" || profile.commuteMode === "walk_cycle") {
    if (isElevated) {
      constraints.push(
        "COMMUTE_EXPOSURE_OPEN: User travels in an unconditioned/open mode. Recommend closed mass-transit (metro/rail) or certified N95 respiratory protection."
      );
    }
  } else if (profile.commuteMode === "metro") {
    constraints.push(
      "COMMUTE_MODE_METRO: Underground/elevated metro has filtered cabin air. Highly recommended low-exposure commute alternative compared to road-level vehicular corridors."
    );
  }

  // 5. Indoor Environment & Cooking Fuel Safeguards
  if (profile.cookingFuel === "biomass_chulha") {
    constraints.push(
      "INDOOR_SOLID_FUEL: High indoor particulate risk from biomass/solid cooking fuel. Never assume indoor air is cleaner than ambient; urge exhaust ventilation and separation of living zones."
    );
  }

  if (profile.purifierAvailability === "none") {
    constraints.push(
      "NO_AIR_PURIFIER: User has no mechanical air filtration. Recommend physical sealing of sleeping rooms during nocturnal inversion and natural cross-ventilation during peak solar afternoon hours."
    );
  } else if (
    profile.purifierAvailability === "bedroom_hepa" ||
    profile.purifierAvailability === "multi_room_hepa"
  ) {
    constraints.push(
      "HEPA_EQUIPPED: User has HEPA filtration available. Recommend running purifier in closed bedroom before bedtime and during peak evening pollution spikes."
    );
  }

  // 6. Prohibitions & Hallucination Guardrails
  constraints.push("NO_MEDICAL_DIAGNOSES: Never state or imply medical diagnoses or individual disease probabilities.");
  constraints.push("NO_SYNTHETIC_STATISTICS: Never invent percentage reductions (e.g., 'reduces your lung damage by 34%') unless backed by peer-reviewed formulas.");
  constraints.push("EVIDENCE_GROUNDING: Every action must directly cite verified station data, CAMS forecast window, or persona living parameters.");

  // Build structured evidence payload for Gemini
  const forecastDay = forecast?.days?.[0];
  const cleanestWindow = forecastDay?.cleanestWindow || "Afternoon (12:00 PM – 05:00 PM)";

  const evidencePayload = {
    location: {
      name: location.name,
      state: location.state,
      coordinates: { latitude: location.latitude, longitude: location.longitude },
    },
    observations: {
      isAvailable: isObsAvailable,
      stationName: observations?.station?.name || null,
      distanceKm: observations?.station?.distanceKm || null,
      pm25: currentPm25,
      pm10: currentPm10,
      aqi: currentAqi,
      freshness: observations?.freshness?.label || "Unknown",
      stationFreshnessCategory: observations?.freshness?.category || "unavailable",
      isStaleOrDelayed: isStale || isDelayed,
      isTelemetryStale: isStale,
    },
    forecast: {
      isAvailable: Boolean(forecast?.isAvailable),
      cleanestWindow,
      peakHours: forecastDay?.peakHourFormatted || "08:00 AM",
      diurnalTrend: "Morning surface inversion traps exhaust; solar boundary layer expands in afternoon; evening traffic descent.",
    },
    profile: {
      category: profile.category,
      displayName: profile.displayName,
      commuteMode: profile.commuteMode,
      scheduleTimings: `${profile.departureTime} – ${profile.returnTime}`,
      outdoorHabits: profile.outdoorActivity,
      scheduleFlexibility: profile.scheduleFlexibility,
      hasChildrenOrSeniors: profile.hasChildren || profile.hasSeniors,
      sensitivity: profile.sensitivity,
      indoorSetup: `Home: ${profile.homeType}, Fuel: ${profile.cookingFuel}, Purifier: ${profile.purifierAvailability}`,
    },
  };

  // Generate deterministic baseline recommendations for fallback
  const morningActions: RecommendationAction[] = [];
  const afternoonActions: RecommendationAction[] = [];
  const eveningActions: RecommendationAction[] = [];

  const evidenceTag = isObsAvailable && currentPm25 !== null
    ? `${observations?.station?.name} PM2.5: ${currentPm25} µg/m³`
    : `CAMS Regional Model (~40km grid)`;

  // Persona-specific Morning rule
  if (profile.category === "college_student") {
    morningActions.push({
      id: "det-m-1",
      title: "Campus Morning Commute Advisory",
      action: isElevated
        ? "Shift to underground/AC metro instead of open two-wheeler, or wear an N95 mask"
        : "Standard morning transit; choose ventilated corridors",
      explanation: "Surface thermal inversion in morning traps vehicular emissions at street breathing level.",
      timeWindow: "07:30 – 09:30",
      evidenceReferences: [evidenceTag, "Morning inversion boundary layer physics"],
      confidenceLevel: "High",
      limitations: "Metro station proximity depends on local neighborhood access",
      actionCategory: "commute",
    });
  } else if (profile.category === "senior_citizen" || profile.hasSeniors) {
    morningActions.push({
      id: "det-m-2",
      title: "Gentle Indoor Morning Movement",
      action: "Conduct morning stretching or walking indoors; postpone park walks until midday",
      explanation: "Early morning cold air and stagnant air layers irritate respiratory passages in seniors.",
      timeWindow: "06:00 – 08:30",
      evidenceReferences: [evidenceTag, "Nocturnal boundary layer stagnation"],
      confidenceLevel: "High",
      limitations: "Depends on home indoor living space",
      actionCategory: "health_protection",
    });
  } else if (profile.category === "parent_child") {
    morningActions.push({
      id: "det-m-3",
      title: "School Run Respiratory Caution",
      action: "Ensure closed vehicle windows during drop-off; equip children with well-fitted youth masks if walking",
      explanation: "Children have higher breathing rates relative to body weight and breathe closer to vehicle exhaust height.",
      timeWindow: "07:00 – 08:30",
      evidenceReferences: [evidenceTag, "School commute peak rush emissions"],
      confidenceLevel: "High",
      limitations: "Child mask tolerance may vary",
      actionCategory: "health_protection",
    });
  } else {
    morningActions.push({
      id: "det-m-4",
      title: "Morning Inversion Protection",
      action: isElevated ? "Keep windows closed; limit outdoor cardio" : "Moderate outdoor activities",
      explanation: "Ground-level nocturnal inversion traps diesel and particulate matter until midday sun breaks the layer.",
      timeWindow: "06:30 – 09:00",
      evidenceReferences: [evidenceTag, "Morning thermal inversion"],
      confidenceLevel: "High",
      limitations: "Local street canyon geometry alters street pollution",
      actionCategory: "outdoor",
    });
  }

  // Afternoon rules (Universal solar ventilation window)
  afternoonActions.push({
    id: "det-a-1",
    title: "Midday Solar Ventilation Window",
    action: "Perform a 20-minute cross-ventilation of living/work spaces while sun warms the boundary layer",
    explanation: "Solar heating expands the atmospheric boundary layer, diluting ground-level particulate concentrations.",
    timeWindow: "12:00 – 15:30",
    evidenceReferences: [cleanestWindow, "CAMS forecast convective mixing height"],
    confidenceLevel: "High",
    limitations: "Avoid opening windows facing immediately adjacent highway construction or heavy idling",
    actionCategory: "indoor",
  });

  if (profile.outdoorActivity !== "none") {
    afternoonActions.push({
      id: "det-a-2",
      title: "Optimal Outdoor Errand Time",
      action: "Schedule essential outdoor errands, groceries, or walks during early afternoon",
      explanation: "Lowest diurnal particulate density coincides with peak daytime solar mixing.",
      timeWindow: "13:00 – 15:00",
      evidenceReferences: [cleanestWindow],
      confidenceLevel: "Medium",
      limitations: "Summer temperatures may require heat/sun protection balance",
      actionCategory: "lifestyle",
    });
  }

  // Evening rules
  if (
    profile.purifierAvailability === "bedroom_hepa" ||
    profile.purifierAvailability === "multi_room_hepa"
  ) {
    eveningActions.push({
      id: "det-e-1",
      title: "Pre-Sleep Bedroom HEPA Purifier Activation",
      action: "Turn on HEPA purifier in bedroom 45 minutes before sleep with door and windows sealed",
      explanation: "Pre-cleaning the sleeping room reduces overnight particulate inhalation during the longest continuous exposure period.",
      timeWindow: "21:00 – 22:30",
      evidenceReferences: ["Indoor particulate accumulation physics", profile.homeType],
      confidenceLevel: "High",
      limitations: "Requires room door and window sealing for optimal CADR",
      actionCategory: "indoor",
    });
  } else {
    eveningActions.push({
      id: "det-e-2",
      title: "Evening Air Infiltration Sealing",
      action: "Close and latch all street-facing windows before 17:30 to prevent evening rush traffic ingress",
      explanation: "Cooling twilight air traps evening vehicular exhaust and biomass emissions close to residential building facades.",
      timeWindow: "17:30 – 21:00",
      evidenceReferences: [evidenceTag, "Evening rush hour descent"],
      confidenceLevel: "High",
      limitations: "Adequate internal room air exchange is needed for CO2 management",
      actionCategory: "indoor",
    });
  }

  eveningActions.push({
    id: "det-e-3",
    title: "Evening Commute Timing Adjustment",
    action: profile.scheduleFlexibility !== "low"
      ? "Depart 20 minutes before peak 18:30 rush, or defer return until after 20:30"
      : "Wear N95 mask and utilize closed AC transit for evening return",
      explanation: "Evening peak combines high traffic volume with dropping temperatures and shallow boundary layer.",
    timeWindow: "17:30 – 19:30",
    evidenceReferences: [evidenceTag, "Traffic diurnal curve"],
    confidenceLevel: "High",
    limitations: "Dependent on workplace schedule constraints",
    actionCategory: "commute",
  });

  const fallbackPlan: DayPlanResponse = {
    locationName: location.name,
    generatedAtUtc: new Date().toISOString(),
    personaTitle: profile.displayName,
    isAiGenerated: false,
    modelUsed: "VayuVerse Deterministic Safety Engine (CPCB & Boundary-Layer Rules)",
    fallbackReason: "Operating in verified deterministic rules mode.",
    sections: {
      morning: {
        period: "morning",
        title: "Morning Protection & Commute",
        timeRange: "06:00 – 11:00",
        atmosphericContext: "Surface nocturnal inversion traps exhaust; highest diurnal particulate density.",
        recommendations: morningActions,
      },
      afternoon: {
        period: "afternoon",
        title: "Midday Solar Window & Tasks",
        timeRange: "11:00 – 17:00",
        atmosphericContext: "Convective solar boundary layer expansion provides cleanest daily ambient window.",
        recommendations: afternoonActions,
      },
      evening: {
        period: "evening",
        title: "Evening Rush & Night Sanctuary",
        timeRange: "17:00 – 22:00",
        atmosphericContext: "Cooling ambient temperature triggers boundary layer descent and evening rush spike.",
        recommendations: eveningActions,
      },
    },
    environmentalSummary: {
      observedStationName: observations?.station?.name || null,
      observedPm25: currentPm25,
      observedPm10: currentPm10,
      observedAqi: currentAqi,
      forecastCleanestWindow: cleanestWindow,
      dataFreshnessStatus: observations?.freshness?.label || "Forecast Only",
    },
    safetyRulesApplied: constraints,
  };

  return {
    constraints,
    evidencePayload,
    fallbackPlan,
  };
}
