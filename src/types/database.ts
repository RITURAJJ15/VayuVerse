/**
 * Supabase Database Entity Types for VayuVerse
 * Matches public schema tables: profiles, saved_locations, saved_plans, action_logs
 */

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  persona:
    | "college_student"
    | "office_commuter"
    | "parent_children"
    | "senior_citizen"
    | "general_individual"
    | "family_household"
    | null;
  preferences: {
    commuteMode?: string;
    commuteWindow?: string;
    outdoorDurationMinutes?: number;
    scheduleFlexibility?: "high" | "moderate" | "low";
    healthSensitivity?: "normal" | "sensitive" | "high";
    hasChildrenOrSeniors?: boolean;
    useAirPurifier?: boolean;
    cookingFuel?: "lpg" | "induction" | "biomass" | "electric";
  };
  home_configuration: {
    homeType?: "apartment" | "independent_house";
    roomSizeSqFt?: number;
    hasExhaustFan?: boolean;
    windowSealing?: "well_sealed" | "moderate" | "leaky";
  };
  created_at: string;
  updated_at: string;
}

export interface DbSavedLocation {
  id: string;
  user_id: string;
  location_name: string;
  rounded_latitude: number; // Rounded to 3 decimal places (~100m) for privacy
  rounded_longitude: number;
  created_at: string;
}

export interface DbSavedPlan {
  id: string;
  user_id: string;
  profile_id?: string | null;
  environmental_snapshot: {
    cityName: string;
    stationName?: string;
    aqi?: number;
    aqiCategory?: string;
    pm25?: number;
    pm10?: number;
    timestamp: string;
  };
  generated_plan: {
    headline: string;
    summary: string;
    dailyGuidance: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    recommendations: Array<{
      category: string;
      action: string;
      rationale: string;
      impactRating: "high" | "medium" | "low";
    }>;
  };
  prompt_version: string;
  created_at: string;
}

export type ActionStatus = "planned" | "completed" | "dismissed";

export interface DbActionLog {
  id: string;
  user_id: string;
  action_type:
    | "commute_modal_shift" // Shifting car/bike to metro/bus
    | "indoor_hepa_schedule" // Running purifier during peak pollution
    | "exhaust_ventilation" // Kitchen exhaust during cooking
    | "schedule_optimization" // Commuting during cleaner time window
    | "outdoor_protective_wear" // N95 mask during high AQI exposure
    | "civic_reporting"; // Reporting open waste burning via Sameer App
  status: ActionStatus;
  baseline_assumptions: {
    originalMode?: string;
    alternativeMode?: string;
    distanceKm?: number;
    ambientPm25?: number;
    notes?: string;
  };
  calculated_impact: {
    emissionsGramsCo2Saved: number;
    exposureProxySavedUghM3?: number;
  };
  calculation_method: string; // e.g. "CPCB_ARAI_MODAL_SHIFT_V2023"
  completed_at: string | null;
  created_at: string;
}

export interface DbAirAlert {
  id: string;
  user_id: string;
  location_id: string | null;
  alert_type: string;
  severity: string;
  status: "active" | "read" | "dismissed" | "resolved";
  source_type: "observed" | "forecast" | "data_unavailable";
  pollutant: string | null;
  observed_value: number | null;
  aqi_value: number | null;
  source_timestamp: string;
  source_name: string;
  title: string;
  message: string;
  recommended_action: string;
  fingerprint: string;
  created_at: string;
  resolved_at: string | null;
}

export interface DbNotificationPreferences {
  user_id: string;
  enabled: boolean;
  browser_notifications_enabled: boolean;
  minimum_severity: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface DbPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  subscription_data: Record<string, unknown>;
  created_at: string;
}
