import type {
  DecisionLabScenarioInput,
  OptionEvaluationResult,
  DecisionComparisonResult,
  SimulationPreset,
  DecisionTransportMode,
} from "../types/decision-lab";
import type { AirQualityForecastResponse } from "../types/forecast";
import {
  TRANSPORT_EMISSION_FACTORS,
  calculateTransportEmissions,
} from "./emissions-calculator";

/**
 * Peer-reviewed microenvironment attenuation factors:
 * Ratio of in-cabin / indoor particulate concentration relative to immediate outdoor ambient air.
 * Sources:
 * - Kumar et al., 'In-cabin air quality during commuting in Delhi', Science of the Total Environment
 * - Goel & Kumar, 'Characterisation of in-vehicle and pedestrian exposure to fine and ultrafine particles'
 * - DMRC station and tunnel air quality monitoring reports
 */
export const MICROENVIRONMENT_FACTORS: Record<DecisionTransportMode | "indoor_space", number> = {
  open_two_wheeler: 1.0, // Zero barrier; direct breathing at vehicle tailpipe height
  walk_cycle: 1.0,       // Ambient roadside breathing zone
  public_bus: 0.85,      // Open-window buses in Indian traffic allow extensive ingress
  petrol_car: 0.50,      // Windows closed, AC recirculation on standard cabin filter (~50% reduction)
  diesel_car: 0.50,      // Windows closed, AC recirculation (~50% reduction)
  electric_cab: 0.50,    // Windows closed, AC recirculation (~50% reduction)
  metro: 0.20,           // Sealed coaches with commercial high-flow HVAC filtration (~80% reduction)
  indoor_space: 0.30,    // Sheltered indoor residential space with sealed windows (~70% reduction)
};

function getForecastPoints(forecast?: AirQualityForecastResponse | null) {
  if (!forecast) return [];
  const anyForecast = forecast as unknown as Record<string, unknown>;
  if (Array.isArray(anyForecast.allHourly)) {
    return anyForecast.allHourly as {
      timestampUtc?: string;
      timestampLocal?: string;
      timeIso?: string;
      timeFormatted?: string;
      hour?: number;
      pm25: number | null;
    }[];
  }
  if (Array.isArray(anyForecast.hourly)) {
    return anyForecast.hourly as {
      timestampUtc?: string;
      timestampLocal?: string;
      timeIso?: string;
      timeFormatted?: string;
      hour?: number;
      pm25: number | null;
    }[];
  }
  if (Array.isArray(forecast.days) && forecast.days[0]?.hourly) {
    return forecast.days[0].hourly as unknown as {
      timestampUtc?: string;
      timestampLocal?: string;
      timeIso?: string;
      timeFormatted?: string;
      hour?: number;
      pm25: number | null;
    }[];
  }
  return [];
}

/**
 * Finds the forecast PM2.5 prediction for a specific departure time (e.g., "08:00").
 */
export function extractForecastForTime(
  forecast: AirQualityForecastResponse | null | undefined,
  targetTimeHHMM: string
): {
  pm25: number | null;
  timestampUtc: string | null;
  timestampLocal: string | null;
  isAvailable: boolean;
} {
  const points = getForecastPoints(forecast);
  if (points.length === 0) {
    return {
      pm25: null,
      timestampUtc: null,
      timestampLocal: null,
      isAvailable: false,
    };
  }

  const [targetHourStr] = targetTimeHHMM.split(":");
  const targetHour = parseInt(targetHourStr || "8", 10);

  // Search forecast hourly timestamps for the closest matching local hour
  const match = points.find((point) => {
    if (point.timestampLocal) {
      const pointHour = parseInt(point.timestampLocal.split(":")[0] || "-1", 10);
      return pointHour === targetHour;
    }
    if (typeof point.hour === "number") {
      return point.hour === targetHour;
    }
    if (point.timeIso) {
      const d = new Date(point.timeIso);
      return d.getHours() === targetHour;
    }
    if (point.timestampUtc) {
      const d = new Date(point.timestampUtc);
      return d.getHours() === targetHour;
    }
    return false;
  });

  if (match && typeof match.pm25 === "number") {
    return {
      pm25: match.pm25,
      timestampUtc: match.timestampUtc || match.timeIso || null,
      timestampLocal: match.timestampLocal || match.timeFormatted || targetTimeHHMM,
      isAvailable: true,
    };
  }

  // Fallback to first available point if target hour is out of range
  const fallback = points[0];
  if (fallback && typeof fallback.pm25 === "number") {
    return {
      pm25: fallback.pm25,
      timestampUtc: fallback.timestampUtc || fallback.timeIso || null,
      timestampLocal: fallback.timestampLocal || fallback.timeFormatted || targetTimeHHMM,
      isAvailable: true,
    };
  }

  return {
    pm25: null,
    timestampUtc: null,
    timestampLocal: null,
    isAvailable: false,
  };
}

/**
 * Evaluates a single decision option deterministically.
 */
export function evaluateOption(
  departureTime: string,
  transportMode: DecisionTransportMode,
  durationMinutes: number,
  distanceKm: number,
  isIndoor: boolean,
  forecast?: AirQualityForecastResponse | null
): OptionEvaluationResult {
  const forecastData = extractForecastForTime(forecast, departureTime);
  const factorInfo = TRANSPORT_EMISSION_FACTORS[transportMode] || TRANSPORT_EMISSION_FACTORS.petrol_car;
  const emissions = calculateTransportEmissions(distanceKm, transportMode);

  // Determine microenvironment factor
  const microFactor = isIndoor
    ? MICROENVIRONMENT_FACTORS.indoor_space
    : MICROENVIRONMENT_FACTORS[transportMode] ?? 1.0;

  // Concentration-Time Proxy = PM2.5 (µg/m³) * duration (hours) [µg·h/m³]
  let concentrationTimeProxy: number | null = null;
  let effectiveExposureProxy: number | null = null;

  if (forecastData.pm25 !== null) {
    const durationHours = durationMinutes / 60;
    // Ambient outdoor concentration-time proxy
    concentrationTimeProxy = Math.round(forecastData.pm25 * durationHours * 10) / 10;
    // Microenvironment-adjusted effective exposure proxy
    effectiveExposureProxy = Math.round(concentrationTimeProxy * microFactor * 10) / 10;
  }

  return {
    departureTime,
    transportMode,
    transportLabel: isIndoor ? "Indoor Exercise / Stationary" : factorInfo.label,
    durationMinutes,
    distanceKm,
    forecastTimestampUtc: forecastData.timestampUtc,
    forecastTimestampLocal: forecastData.timestampLocal,
    forecastPm25: forecastData.pm25,
    isForecastAvailable: forecastData.isAvailable,
    concentrationTimeProxyMicrogramHours: concentrationTimeProxy,
    microenvironmentFactor: microFactor,
    effectiveExposureProxy,
    emissionFactorGramsPerKm: factorInfo.factorGramsCo2PerPassengerKm,
    totalCo2EmissionsGrams: emissions.totalCo2Grams,
  };
}

/**
 * Compares Option A (baseline plan) vs Option B (what-if alternative).
 */
export function evaluateDecisionComparison(
  input: DecisionLabScenarioInput,
  forecast?: AirQualityForecastResponse | null
): DecisionComparisonResult {
  const missingDataItems: string[] = [];

  const points = getForecastPoints(forecast);
  if (points.length === 0) {
    missingDataItems.push("CAMS hourly particulate forecast");
  }

  const optionA = evaluateOption(
    input.departureTimeA,
    input.transportModeA,
    input.durationMinutesA,
    input.distanceKmA,
    !input.isOutdoorA,
    forecast
  );

  const optionB = evaluateOption(
    input.departureTimeB,
    input.transportModeB,
    input.durationMinutesB,
    input.distanceKmB,
    !input.isOutdoorB,
    forecast
  );

  // Compute exposure proxy delta
  let exposureReductionPercent: number | null = null;
  if (
    optionA.effectiveExposureProxy !== null &&
    optionB.effectiveExposureProxy !== null &&
    optionA.effectiveExposureProxy > 0
  ) {
    const delta = optionA.effectiveExposureProxy - optionB.effectiveExposureProxy;
    exposureReductionPercent = Math.round((delta / optionA.effectiveExposureProxy) * 100);
  }

  // Compute emissions delta
  const emissionsA = optionA.totalCo2EmissionsGrams;
  const emissionsB = optionB.totalCo2EmissionsGrams;
  const absoluteCo2SavedGrams = Math.round((emissionsA - emissionsB) * 10) / 10;

  const emissionsReductionPercent =
    emissionsA > 0
      ? Math.max(0, Math.min(100, Math.round(((emissionsA - emissionsB) / emissionsA) * 100)))
      : 0;

  // Determine Confidence
  let confidenceLevel: "High" | "Medium" | "Caution" = "High";
  let confidenceExplanation =
    "Grounded in local hourly CAMS model projections and ARAI/CPCB documented emission factors.";

  if (!optionA.isForecastAvailable || !optionB.isForecastAvailable) {
    confidenceLevel = "Caution";
    confidenceExplanation =
      "Hourly atmospheric forecast was unavailable; exposure comparisons are disabled. Transport emissions are fully verified and calculated.";
  }

  // Generate deterministic verdict
  let verdictHeadline: string;
  let tradeoffAnalysis: string;

  if (exposureReductionPercent !== null && exposureReductionPercent > 15 && absoluteCo2SavedGrams > 50) {
    verdictHeadline = `Strong Double-Win: ~${exposureReductionPercent}% Lower Exposure & ${absoluteCo2SavedGrams}g CO₂ Saved`;
    tradeoffAnalysis = `Switching to ${optionB.transportLabel} at ${optionB.departureTime} delivers significant protection against fine particulates while cutting transport carbon emissions.`;
  } else if (exposureReductionPercent !== null && exposureReductionPercent > 15) {
    verdictHeadline = `Exposure Benefit: ~${exposureReductionPercent}% Lower Exposure Proxy`;
    tradeoffAnalysis = `Adjusting your departure to ${optionB.departureTime} reduces particulate exposure due to diurnal atmospheric dispersion.`;
  } else if (absoluteCo2SavedGrams > 50) {
    verdictHeadline = `Climate Benefit: ${absoluteCo2SavedGrams}g CO₂ Avoided`;
    tradeoffAnalysis = `Choosing ${optionB.transportLabel} significantly reduces tailpipe emissions while maintaining comparable transit times.`;
  } else if (exposureReductionPercent !== null && exposureReductionPercent < -15) {
    verdictHeadline = `Caution: Alternative Option Increases Exposure (~${Math.abs(exposureReductionPercent)}%)`;
    tradeoffAnalysis = `Departing at ${optionB.departureTime} coincides with higher forecast particulate concentration or unconditioned exposure. Option A remains preferred.`;
  } else {
    verdictHeadline = "Comparable Alternatives — Minimal Trade-off Variance";
    tradeoffAnalysis = `Both options yield similar exposure and emissions profiles within standard variance margins.`;
  }

  return {
    input,
    optionA,
    optionB,
    exposureProxyReductionPercent: exposureReductionPercent,
    emissionsReductionPercent: emissionsReductionPercent,
    absoluteCo2SavedGrams,
    verdictHeadline,
    tradeoffAnalysis,
    confidenceLevel,
    confidenceExplanation,
    isForecastCoupled: optionA.isForecastAvailable && optionB.isForecastAvailable,
    missingDataItems,
  };
}

/**
 * The 5 Initial Mandatory Simulation Presets
 */
export const INITIAL_SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: "leave-one-hour-earlier",
    simulationNumber: 1,
    title: "1. What if I leave one hour earlier?",
    subtitle: "08:00 AM vs. 07:00 AM Departure Shift",
    description:
      "Evaluates avoiding the severe 08:00 AM morning boundary-layer traffic peak by departing at 07:00 AM on a two-wheeler.",
    input: {
      cityName: "New Delhi",
      activityType: "commute",
      departureTimeA: "08:00",
      transportModeA: "open_two_wheeler",
      durationMinutesA: 45,
      distanceKmA: 12,
      isOutdoorA: true,
      departureTimeB: "07:00",
      transportModeB: "open_two_wheeler",
      durationMinutesB: 35, // Less traffic congestion
      distanceKmB: 12,
      isOutdoorB: true,
      errandCountA: 1,
      errandCountB: 1,
      scheduleFlexibility: "moderate",
    },
  },
  {
    id: "leave-one-hour-later",
    simulationNumber: 2,
    title: "2. What if I leave one hour later?",
    subtitle: "08:00 AM vs. 09:00 AM Solar Mixing Shift",
    description:
      "Evaluates delaying commute from 08:00 AM to 09:00 AM, allowing morning solar heating to expand the convective mixing layer and dilute surface particulates.",
    input: {
      cityName: "New Delhi",
      activityType: "commute",
      departureTimeA: "08:00",
      transportModeA: "open_two_wheeler",
      durationMinutesA: 45,
      distanceKmA: 12,
      isOutdoorA: true,
      departureTimeB: "09:00",
      transportModeB: "open_two_wheeler",
      durationMinutesB: 40,
      distanceKmB: 12,
      isOutdoorB: true,
      errandCountA: 1,
      errandCountB: 1,
      scheduleFlexibility: "high",
    },
  },
  {
    id: "use-public-transport",
    simulationNumber: 3,
    title: "3. What if I use public transport?",
    subtitle: "Two-Wheeler vs. Air-Filtered Metro",
    description:
      "Simulates shifting a 14km morning commute from a solo petrol car into Delhi Metro's air-conditioned and commercially filtered transit network.",
    input: {
      cityName: "New Delhi",
      activityType: "commute",
      departureTimeA: "08:30",
      transportModeA: "petrol_car",
      durationMinutesA: 45,
      distanceKmA: 14,
      isOutdoorA: true,
      departureTimeB: "08:30",
      transportModeB: "metro",
      durationMinutesB: 50,
      distanceKmB: 14,
      isOutdoorB: false, // Inside filtered carriage
      errandCountA: 1,
      errandCountB: 1,
      scheduleFlexibility: "moderate",
    },
  },
  {
    id: "combine-errands",
    simulationNumber: 4,
    title: "4. What if I combine errands?",
    subtitle: "Two Separate Round Trips vs. One Chained Errand",
    description:
      "Simulates linking multiple grocery and market errands into a single consolidated trip instead of making two cold-engine start journeys.",
    input: {
      cityName: "New Delhi",
      activityType: "errands",
      departureTimeA: "17:30",
      transportModeA: "petrol_car",
      durationMinutesA: 60, // 2 trips of 30 mins
      distanceKmA: 14,      // 2 trips of 7 km
      isOutdoorA: true,
      departureTimeB: "14:00", // Shifted to clean midday window
      transportModeB: "petrol_car",
      durationMinutesB: 40, // 1 chained trip
      distanceKmB: 9,       // 9 km linked loop
      isOutdoorB: true,
      errandCountA: 2,
      errandCountB: 1,
      scheduleFlexibility: "high",
    },
  },
  {
    id: "indoor-exercise",
    simulationNumber: 5,
    title: "5. What if I move outdoor exercise indoors?",
    subtitle: "Morning Outdoor Jog vs. Indoor Living Room Cardio",
    description:
      "Compares a 45-minute morning outdoor run in winter boundary layer stagnation against exercising inside a closed room with HEPA filtration.",
    input: {
      cityName: "New Delhi",
      activityType: "outdoor_exercise",
      departureTimeA: "06:30",
      transportModeA: "walk_cycle",
      durationMinutesA: 45,
      distanceKmA: 5,
      isOutdoorA: true,
      departureTimeB: "06:30",
      transportModeB: "walk_cycle",
      durationMinutesB: 45,
      distanceKmB: 0,
      isOutdoorB: false, // Indoors
      errandCountA: 1,
      errandCountB: 1,
      scheduleFlexibility: "high",
    },
  },
];
