import { supabase } from "./supabase";

export interface IndoorStatusSummary {
  outdoorPm25: number | null;
  outdoorAqi: number | null;
  outdoorCategory: string;
  homeInfiltrationFactor: number;
  homeTypeLabel: string;
  estimatedIndoorPm25Min: number | null;
  estimatedIndoorPm25Max: number | null;
  ventilationRecommendation: "Open windows" | "Keep closed" | "Ventilate at midday";
  ventilationTimeWindow?: string;
  disclaimer: string;
}

export interface DynamicIndoorRecommendation {
  id: string;
  title: string;
  action: string;
  rationale: string;
  priority: "Critical" | "High" | "Medium" | "Foundational";
  actionType: "ventilation" | "filtration" | "source_control" | "emergency";
}

export interface ChecklistItem {
  id: string;
  title: string;
  action: string;
  category: "habits" | "physical" | "filtration" | "moisture";
  costTier: "Zero-Cost" | "Low-Cost (<₹1,000)" | "Moderate" | "Investment";
  priority: "Critical" | "High" | "Medium" | "Foundational";
  details: string;
}

export const PERSISTENT_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "chk-no-smoke",
    title: "Zero Indoor Tobacco Smoke",
    action: "Enforce strict zero-smoking rule in all indoor rooms and balconies.",
    category: "habits",
    costTier: "Zero-Cost",
    priority: "Critical",
    details: "Secondhand and thirdhand smoke deposits dangerous polycyclic aromatic hydrocarbons (PAHs) onto walls and furniture that re-emit for months.",
  },
  {
    id: "chk-no-incense-coils",
    title: "Eliminate Incense & Mosquito Coils",
    action: "Discontinue burning agarbatti, dhoop, and mosquito coils in living and sleeping spaces.",
    category: "habits",
    costTier: "Zero-Cost",
    priority: "Critical",
    details: "Burning a single mosquito coil emits PM2.5 equivalent to 75–100 cigarettes, alongside formaldehyde and benzene.",
  },
  {
    id: "chk-kitchen-exhaust",
    title: "Mandatory Kitchen Exhaust during Cooking",
    action: "Turn on kitchen chimney or exhaust fan 2 minutes before lighting burners and leave running 5 minutes after.",
    category: "habits",
    costTier: "Zero-Cost",
    priority: "High",
    details: "Oil frying, tempering (tadka), and LPG combustion routinely spike indoor PM2.5 above 350 µg/m³ within minutes.",
  },
  {
    id: "chk-wet-mopping",
    title: "Wet Microfiber Mopping (No Dry Brooms)",
    action: "Clean floors with damp microfiber mops instead of dry broom sweeping.",
    category: "habits",
    costTier: "Zero-Cost",
    priority: "Medium",
    details: "Dry sweeping aerosolizes settled toxic road dust and fine particulates directly into the indoor breathing zone.",
  },
  {
    id: "chk-weather-strip",
    title: "Weather-Strip Exterior Doors & Windows",
    action: "Apply self-adhesive foam or rubber sealing tape along window frames and sliding door tracks.",
    category: "physical",
    costTier: "Low-Cost (<₹1,000)",
    priority: "High",
    details: "Sealing frame gaps cuts outdoor fine particle infiltration by 40% to 60% in high-smog neighborhoods.",
  },
  {
    id: "chk-door-draft-stoppers",
    title: "Install Door Draft Stoppers",
    action: "Place silicone or twin-draft fabric stoppers under entry doors and bedroom doors.",
    category: "physical",
    costTier: "Low-Cost (<₹1,000)",
    priority: "Medium",
    details: "Prevents dusty corridor airflow and outdoor road aerosols from seeping through doorway thresholds.",
  },
  {
    id: "chk-ac-sleeve-seal",
    title: "Seal Split-AC Piping Wall Openings",
    action: "Fill gaps around refrigerant pipes, wall penetrations, and window AC units with silicone putty or expanding foam.",
    category: "physical",
    costTier: "Low-Cost (<₹1,000)",
    priority: "Medium",
    details: "Unsealed wall penetrations create significant negative-pressure infiltration bypass channels.",
  },
  {
    id: "chk-cadr-purifier",
    title: "Size True-HEPA Purifier by Room CADR",
    action: "Deploy mechanical True-HEPA (H13) air purifier delivering at least 4.5 Air Changes per Hour (ACH).",
    category: "filtration",
    costTier: "Moderate",
    priority: "High",
    details: "Formula: Required CADR (m³/h) = Room Volume (m³) × 4.5 ACH / 1.7. True-HEPA captures 99.97% of particles down to 0.3 µm.",
  },
  {
    id: "chk-filter-maintenance",
    title: "Maintain Bi-Weekly Filter Cleaning Routine",
    action: "Vacuum outer pre-filter mesh every 2 weeks and replace main HEPA cylinder every 6–9 months.",
    category: "filtration",
    costTier: "Moderate",
    priority: "Medium",
    details: "Clogged pre-filters restrict fan throughput, increasing electrical draw while cutting Clean Air Delivery Rate in half.",
  },
  {
    id: "chk-humidity-mold",
    title: "Moisture & Mold Defense (30%–50% RH)",
    action: "Keep indoor relative humidity between 30% and 50%; run bathroom exhaust fans during hot showers.",
    category: "moisture",
    costTier: "Zero-Cost",
    priority: "Medium",
    details: "High indoor humidity (>60%) accelerates dust mite breeding and fungal mold spore amplification in mattress fabrics.",
  },
];

const LOCAL_STORAGE_KEY_PREFIX = "vayuverse_indoor_checklist_";

export function getLocalChecklistState(userId?: string | null): Record<string, boolean> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalChecklistState(state: Record<string, boolean>, userId?: string | null) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export async function fetchUserChecklistState(userId?: string | null): Promise<Record<string, boolean>> {
  const local = getLocalChecklistState(userId);
  if (!userId) return local;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data?.preferences) {
      const dbChecklist = (data.preferences as Record<string, unknown>).indoor_checklist as Record<string, boolean> | undefined;
      if (dbChecklist && typeof dbChecklist === "object") {
        const merged = { ...local, ...dbChecklist };
        saveLocalChecklistState(merged, userId);
        return merged;
      }
    }
  } catch (err) {
    console.warn("[IndoorChecklist] DB fetch error, using local:", err);
  }

  return local;
}

export async function persistUserChecklistState(
  state: Record<string, boolean>,
  userId?: string | null
): Promise<void> {
  saveLocalChecklistState(state, userId);
  if (!userId) return;

  try {
    // Read current profile preferences to merge
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();

    const existingPrefs = (profile?.preferences as Record<string, unknown>) || {};
    const updatedPrefs = {
      ...existingPrefs,
      indoor_checklist: state,
    };

    await supabase
      .from("profiles")
      .update({ preferences: updatedPrefs })
      .eq("user_id", userId);
  } catch (err) {
    console.warn("[IndoorChecklist] DB persist error:", err);
  }
}

/**
 * Calculates estimated indoor status summary based on outdoor readings and home type.
 */
export function calculateIndoorStatusSummary(
  outdoorPm25: number | null | undefined,
  outdoorAqi: number | null | undefined,
  homeType: "apartment" | "independent_house" | "sealed_apartment" = "apartment"
): IndoorStatusSummary {
  // Infiltration factors:
  // Sealed/AC: 0.30 (range: 0.25–0.35)
  // Standard apartment: 0.60 (range: 0.50–0.70)
  // Naturally ventilated / independent house: 0.85 (range: 0.75–0.95)
  let factor = 0.60;
  let label = "Standard Apartment (Moderate Infiltration)";

  if (homeType === "sealed_apartment") {
    factor = 0.30;
    label = "Sealed / Well-Insulated Apartment";
  } else if (homeType === "independent_house") {
    factor = 0.85;
    label = "Naturally Ventilated / Independent House";
  }

  const validPm25 = outdoorPm25 !== null && outdoorPm25 !== undefined && !isNaN(outdoorPm25) ? outdoorPm25 : null;
  const validAqi = outdoorAqi !== null && outdoorAqi !== undefined && !isNaN(outdoorAqi) ? outdoorAqi : null;

  let estimatedMin: number | null = null;
  let estimatedMax: number | null = null;

  if (validPm25 !== null) {
    estimatedMin = Math.round(validPm25 * (factor - 0.08));
    estimatedMax = Math.round(validPm25 * (factor + 0.08));
  }

  let outdoorCategory = "Moderate";
  if (validAqi !== null) {
    if (validAqi <= 50) outdoorCategory = "Good";
    else if (validAqi <= 100) outdoorCategory = "Satisfactory";
    else if (validAqi <= 200) outdoorCategory = "Moderate";
    else if (validAqi <= 300) outdoorCategory = "Poor";
    else if (validAqi <= 400) outdoorCategory = "Very Poor";
    else outdoorCategory = "Severe";
  } else if (validPm25 !== null) {
    if (validPm25 <= 30) outdoorCategory = "Good";
    else if (validPm25 <= 60) outdoorCategory = "Satisfactory";
    else if (validPm25 <= 90) outdoorCategory = "Moderate";
    else if (validPm25 <= 120) outdoorCategory = "Poor";
    else if (validPm25 <= 250) outdoorCategory = "Very Poor";
    else outdoorCategory = "Severe";
  }

  // Ventilation recommendation for the current hour
  let ventilationRecommendation: "Open windows" | "Keep closed" | "Ventilate at midday";
  let ventilationTimeWindow: string | undefined = undefined;

  if (outdoorCategory === "Good" || outdoorCategory === "Satisfactory") {
    ventilationRecommendation = "Open windows";
  } else if (outdoorCategory === "Moderate") {
    ventilationRecommendation = "Ventilate at midday";
    ventilationTimeWindow = "12:00 – 15:30";
  } else {
    ventilationRecommendation = "Keep closed";
  }

  return {
    outdoorPm25: validPm25,
    outdoorAqi: validAqi,
    outdoorCategory,
    homeInfiltrationFactor: factor,
    homeTypeLabel: label,
    estimatedIndoorPm25Min: estimatedMin,
    estimatedIndoorPm25Max: estimatedMax,
    ventilationRecommendation,
    ventilationTimeWindow,
    disclaimer: "Estimated from outdoor conditions and building type. Not a physical indoor measurement.",
  };
}

/**
 * Generates dynamic indoor air recommendations matching today's outdoor air severity.
 */
export function getDynamicIndoorRecommendations(
  outdoorCategory: string,
  pm25: number | null,
  purifierAvailable: boolean
): DynamicIndoorRecommendation[] {
  const recs: DynamicIndoorRecommendation[] = [];

  if (outdoorCategory === "Good" || outdoorCategory === "Satisfactory") {
    recs.push({
      id: "dyn-vent-good",
      title: "Strategic Fresh Air Ventilation",
      action: "Open opposite windows for 30–60 minutes to flush accumulated carbon dioxide and indoor VOCs.",
      rationale: `Ambient outdoor air is clean (${outdoorCategory}). Natural cross-ventilation improves indoor cognitive clarity without particulate penalties.`,
      priority: "Foundational",
      actionType: "ventilation",
    });
    recs.push({
      id: "dyn-purifier-low",
      title: "Energy-Saving Purifier Modulation",
      action: "Switch air purifiers to low/eco mode or turn off in well-ventilated rooms to conserve electricity.",
      rationale: "Clean outdoor conditions reduce mechanical filtration needs during open-window hours.",
      priority: "Foundational",
      actionType: "filtration",
    });
  } else if (outdoorCategory === "Moderate") {
    recs.push({
      id: "dyn-vent-moderate",
      title: "Midday Solar Ventilation Window",
      action: "Limit window opening to a 20-minute window between 12:00 and 15:30. Keep road-facing windows closed.",
      rationale: "Daytime solar heating expands the atmospheric mixing height, providing the lowest diurnal PM2.5 window for air exchange.",
      priority: "Medium",
      actionType: "ventilation",
    });
    recs.push({
      id: "dyn-purifier-auto",
      title: "Run Purifier on Auto in Living Areas",
      action: purifierAvailable
        ? "Keep True-HEPA purifier on auto-sensing mode in the primary room."
        : "Prepare bedroom clean sanctuary by closing doors and window latches.",
      rationale: "Maintains a baseline particle barrier against ambient road infiltration.",
      priority: "Medium",
      actionType: "filtration",
    });
  } else {
    // Poor, Very Poor, Severe
    const isEmergency = outdoorCategory === "Severe" || (pm25 !== null && pm25 > 250);

    recs.push({
      id: "dyn-seal-strict",
      title: isEmergency ? "Emergency Residential Enclosure" : "Strict Window & Door Sealing",
      action: "Keep all exterior windows, balcony sliders, and balcony doors locked shut throughout the day and evening.",
      rationale: `Ambient PM2.5 is severely elevated (${outdoorCategory}). Outdoor aerosols penetrate unsealed rooms within 20 minutes.`,
      priority: "Critical",
      actionType: "ventilation",
    });

    recs.push({
      id: "dyn-combustion-ban",
      title: "Zero Indoor Combustion Policy",
      action: "Do not burn incense, candles, or mosquito coils. Use high-speed chimney exhaust when cooking with oil.",
      rationale: "Indoor combustion in a sealed room creates extreme particulate spikes exceeding 500 µg/m³ with no dilution path.",
      priority: "Critical",
      actionType: "source_control",
    });

    recs.push({
      id: "dyn-hepa-continuous",
      title: "Continuous True-HEPA Filtration",
      action: purifierAvailable
        ? "Run True-HEPA filtration 24/7 on medium/high in occupied rooms. Create a closed bedroom sanctuary."
        : "Equip an N95 respirator indoors if severe smoke enters and mechanical filtration is unavailable.",
      rationale: "Continuous mechanical filtration is essential to remove fine particulates that infiltrate through building crevices.",
      priority: isEmergency ? "Critical" : "High",
      actionType: "filtration",
    });

    if (isEmergency) {
      recs.push({
        id: "dyn-co-precaution",
        title: "Carbon Monoxide Precaution during Tight Sealing",
        action: "Ensure adequate air exchange if operating unvented gas water heaters or gas burners in sealed homes.",
        rationale: "Tightly sealed rooms can accumulate hazardous carbon monoxide when gas combustion appliances operate without dedicated flue vents.",
        priority: "Critical",
        actionType: "emergency",
      });
    }
  }

  return recs;
}
