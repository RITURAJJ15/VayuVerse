import { z } from "zod";
import type { GeoLocation } from "./location";
import type { UserProfile } from "./profile";

export type ActionCategory =
  | "commute"
  | "indoor"
  | "outdoor"
  | "lifestyle"
  | "health_protection";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface RecommendationAction {
  id: string;
  title: string;
  action: string;
  explanation: string;
  timeWindow: string; // e.g. "06:00 – 09:30"
  evidenceReferences: string[]; // e.g. ["OpenAQ Lodhi Road PM2.5: 60.9 µg/m³", "CAMS Global Afternoon Solar Window"]
  confidenceLevel: ConfidenceLevel;
  limitations: string;
  actionCategory: ActionCategory;
  isPlanned?: boolean;
  isDismissed?: boolean;
}

export interface DayPlanSection {
  period: "morning" | "afternoon" | "evening";
  title: string;
  timeRange: string;
  atmosphericContext: string;
  recommendations: RecommendationAction[];
}

export interface DayPlanResponse {
  locationName: string;
  generatedAtUtc: string;
  personaTitle: string;
  isAiGenerated: boolean;
  modelUsed?: string;
  fallbackReason?: string;
  sections: {
    morning: DayPlanSection;
    afternoon: DayPlanSection;
    evening: DayPlanSection;
  };
  environmentalSummary: {
    observedStationName: string | null;
    observedPm25: number | null;
    observedPm10: number | null;
    observedAqi: number | null;
    forecastCleanestWindow: string | null;
    dataFreshnessStatus: string;
  };
  safetyRulesApplied: string[];
}

export interface RecommendationRequest {
  location: GeoLocation;
  profile: UserProfile;
  refreshSection?: "morning" | "afternoon" | "evening" | "all";
}

// Zod schema for validating the structured JSON response from Gemini
export const RecommendationActionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string().min(3),
  action: z.string().min(5),
  explanation: z.string().min(10),
  timeWindow: z.string().min(3),
  evidenceReferences: z.array(z.string()).default([]),
  confidenceLevel: z.enum(["High", "Medium", "Low"]).default("Medium"),
  limitations: z.string().default("Subject to local street-level microclimate variation"),
  actionCategory: z.enum([
    "commute",
    "indoor",
    "outdoor",
    "lifestyle",
    "health_protection",
  ]).default("lifestyle"),
});

export const GeminiDayPlanOutputSchema = z.object({
  morning: z.object({
    atmosphericContext: z.string(),
    recommendations: z.array(RecommendationActionSchema).min(1).max(4),
  }),
  afternoon: z.object({
    atmosphericContext: z.string(),
    recommendations: z.array(RecommendationActionSchema).min(1).max(4),
  }),
  evening: z.object({
    atmosphericContext: z.string(),
    recommendations: z.array(RecommendationActionSchema).min(1).max(4),
  }),
});

export type GeminiDayPlanOutput = z.infer<typeof GeminiDayPlanOutputSchema>;

export interface DeterministicRulesResult {
  constraints: string[];
  evidencePayload: {
    location: {
      name: string;
      state: string;
      coordinates: { latitude: number; longitude: number };
    };
    observations: {
      isAvailable: boolean;
      stationName: string | null;
      distanceKm: number | null;
      pm25: number | null;
      pm10: number | null;
      aqi: number | null;
      freshness: string;
      isStaleOrDelayed: boolean;
    };
    forecast: {
      isAvailable: boolean;
      cleanestWindow: string | null;
      peakHours: string | null;
      diurnalTrend: string;
    };
    profile: {
      category: string;
      displayName: string;
      commuteMode: string;
      scheduleTimings: string;
      outdoorHabits: string;
      scheduleFlexibility: string;
      hasChildrenOrSeniors: boolean;
      sensitivity: string;
      indoorSetup: string;
    };
  };
  fallbackPlan: DayPlanResponse;
}
