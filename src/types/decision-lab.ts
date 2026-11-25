/**
 * VayuVerse What-If Decision Lab Types
 * Grounded in deterministic transport emissions & empirical CAMS forecast hourly telemetry.
 */

export type JourneyActivityType =
  | "commute"
  | "errands"
  | "outdoor_exercise"
  | "leisure_transit";

export type DecisionTransportMode =
  | "metro"
  | "open_two_wheeler"
  | "petrol_car"
  | "diesel_car"
  | "electric_cab"
  | "public_bus"
  | "walk_cycle";

export interface TransportEmissionFactor {
  mode: DecisionTransportMode;
  label: string;
  factorGramsCo2PerPassengerKm: number;
  assumedOccupancy: number;
  source: string;
  sourceVersion: string;
  notes: string;
}

export type ScheduleFlexibility = "high" | "moderate" | "low";

export interface DecisionLabScenarioInput {
  cityName: string;
  activityType: JourneyActivityType;
  // Option A (Current Plan)
  departureTimeA: string; // e.g. "08:00"
  transportModeA: DecisionTransportMode;
  durationMinutesA: number;
  distanceKmA: number;
  isOutdoorA: boolean;

  // Option B (What-If Alternative)
  departureTimeB: string; // e.g. "07:00" or "09:00"
  transportModeB: DecisionTransportMode;
  durationMinutesB: number;
  distanceKmB: number;
  isOutdoorB: boolean;

  // Chained errands
  errandCountA: number;
  errandCountB: number;
  scheduleFlexibility: ScheduleFlexibility;
}

export interface OptionEvaluationResult {
  departureTime: string;
  transportMode: DecisionTransportMode;
  transportLabel: string;
  durationMinutes: number;
  distanceKm: number;

  // Forecast data for that departure time
  forecastTimestampUtc: string | null;
  forecastTimestampLocal: string | null;
  forecastPm25: number | null; // Predicted PM2.5 in µg/m³
  isForecastAvailable: boolean;

  // Environmental calculations
  // Concentration-time proxy = PM2.5 (µg/m³) * duration (hours) [µg·h/m³]
  concentrationTimeProxyMicrogramHours: number | null;
  microenvironmentFactor: number; // e.g., 0.2 for Metro AC, 1.0 for open two-wheeler
  effectiveExposureProxy: number | null;

  // Emission calculations (Deterministic)
  emissionFactorGramsPerKm: number;
  totalCo2EmissionsGrams: number;
}

export interface DecisionComparisonResult {
  input: DecisionLabScenarioInput;
  optionA: OptionEvaluationResult;
  optionB: OptionEvaluationResult;

  // Diffs
  exposureProxyReductionPercent: number | null; // e.g. 45% reduction
  emissionsReductionPercent: number; // e.g. 70% reduction
  absoluteCo2SavedGrams: number;

  // Verdict & Guidance
  verdictHeadline: string;
  tradeoffAnalysis: string;
  confidenceLevel: "High" | "Medium" | "Caution";
  confidenceExplanation: string;

  // Data status
  isForecastCoupled: boolean;
  missingDataItems: string[];
}

export interface SimulationPreset {
  id: string;
  simulationNumber: number;
  title: string;
  subtitle: string;
  description: string;
  input: DecisionLabScenarioInput;
}
