/**
 * VayuVerse Indoor Air Guardian Types
 * Grounded in EPA, ASHRAE 62.2, and aerosol physics principles.
 */

export type HomeType = "apartment" | "independent_house";

export type RoadExposure =
  | "busy_corridor"       // Major arterial road / highway < 100m
  | "construction_nearby" // Active construction or demolition site
  | "residential_quiet";  // Interior residential street / colony

export type IndoorCookingFuel =
  | "lpg"
  | "piped_gas"
  | "electric_induction"
  | "biomass_wood_coal";

export type KitchenExhaustType =
  | "chimney_ducted"   // High-flow ducted electric chimney (>800 m³/h)
  | "wall_exhaust_fan" // Standard wall/window exhaust fan
  | "window_only"      // Open window without powered airflow
  | "none_enclosed";   // Enclosed kitchen with no dedicated exhaust

export type WindowTightness =
  | "modern_sealed"     // UPVC / double-glazed with rubber gasket seals
  | "sliding_gaps"      // Aluminum/PVC sliding windows with brush/track gaps
  | "traditional_mesh"  // Wood/steel casement with mosquito mesh
  | "loose_wooden";     // Older unsealed wooden frames with visible drafts

export type PurifierStatus =
  | "none"
  | "single_bedroom_hepa"
  | "multi_room_hepa"
  | "considering_purchase";

export type HouseholdVulnerability =
  | "infants_children"
  | "seniors"
  | "asthma_respiratory"
  | "pregnant"
  | "none";

export type BudgetPreference =
  | "zero_low_cost" // Strictly zero-cost habits & low-cost seals (< ₹1,000)
  | "moderate"      // Targeted seals + entry-level HEPA (₹1,000 – ₹8,000)
  | "premium";      // Multi-stage True-HEPA & advanced filtration (> ₹8,000)

export interface HouseholdProfile {
  homeType: HomeType;
  roomSizeSqFt: number; // e.g. 150 (small room), 220 (master bed), 380 (living)
  roadExposure: RoadExposure;
  cookingFuel: IndoorCookingFuel;
  kitchenExhaust: KitchenExhaustType;
  windowTightness: WindowTightness;
  purifierStatus: PurifierStatus;
  vulnerabilities: HouseholdVulnerability[];
  budgetPreference: BudgetPreference;
}

export type RecommendationCategory =
  | "source_reduction"
  | "cooking_ventilation"
  | "hepa_filtration"
  | "conditional_ventilation"
  | "low_cost_habits"
  | "pollution_episode";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Foundational";

export type CostTier = "Zero-Cost" | "Low-Cost (<₹1,000)" | "Moderate" | "Investment";

export interface IndoorRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  action: string;
  priority: PriorityLevel;
  costTier: CostTier;
  whyThisHelps: string;
  scientificRationale: string;
  citations: string[];
}

export interface PurifierSizingMatrix {
  roomSqFt: number;
  roomVolumeM3: number;
  requiredAch: number; // Air changes per hour (4–5 recommended for polluted air)
  recommendedCadrM3H: number; // Clean Air Delivery Rate in m³/hr
  recommendedCadrCfm: number;  // CADR in CFM
  ruleOfThumbSummary: string;
  safetyWarnings: string[];
}

export interface ConditionalVentilationAdvice {
  status: "seal_windows" | "selective_cross_ventilation" | "caution_minimal" | "data_unavailable_precautionary";
  headline: string;
  explanation: string;
  recommendedAction: string;
  outdoorContextNote: string;
}

export interface IndoorGuardianGuidance {
  profile: HouseholdProfile;
  recommendations: IndoorRecommendation[];
  purifierSizing: PurifierSizingMatrix;
  ventilationAdvice: ConditionalVentilationAdvice;
  indoorMeasurementNotice: string;
  scientificSafeguards: {
    debunkedPlantMyth: string;
    unmeasuredIndoorAirNotice: string;
    ionizerOzoneWarning: string;
  };
}
