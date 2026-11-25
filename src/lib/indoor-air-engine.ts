import type {
  HouseholdProfile,
  IndoorRecommendation,
  PurifierSizingMatrix,
  ConditionalVentilationAdvice,
  IndoorGuardianGuidance,
} from "../types/indoor-air";
import type { StationObservationResponse } from "../types/air-quality";

export const DEFAULT_HOUSEHOLD_PROFILE: HouseholdProfile = {
  homeType: "apartment",
  roomSizeSqFt: 180,
  roadExposure: "busy_corridor",
  cookingFuel: "lpg",
  kitchenExhaust: "wall_exhaust_fan",
  windowTightness: "sliding_gaps",
  purifierStatus: "none",
  vulnerabilities: ["asthma_respiratory"],
  budgetPreference: "zero_low_cost",
};

/**
 * Calculates Clean Air Delivery Rate (CADR) sizing according to US EPA & AHAM standards.
 * Standard assumption: 2.7m (8.85 ft) ceiling height, 4.5 Air Changes per Hour (ACH) for polluted regions.
 */
export function calculatePurifierSizing(roomSqFt: number): PurifierSizingMatrix {
  const clampedSqFt = Math.max(50, Math.min(1500, roomSqFt));
  const ceilingHeightM = 2.7;
  const roomAreaM2 = clampedSqFt * 0.092903;
  const roomVolumeM3 = roomAreaM2 * ceilingHeightM;

  // For high-pollution Indian urban environments, EPA & aerosol scientists recommend 4.5 to 5.0 ACH
  const requiredAch = 4.5;
  const recommendedCadrM3H = Math.round(roomVolumeM3 * requiredAch);
  // 1 CFM = 1.699 m³/hr
  const recommendedCadrCfm = Math.round(recommendedCadrM3H / 1.699);

  return {
    roomSqFt: clampedSqFt,
    roomVolumeM3: Math.round(roomVolumeM3 * 10) / 10,
    requiredAch,
    recommendedCadrM3H,
    recommendedCadrCfm,
    ruleOfThumbSummary: `AHAM 2/3 Rule: A CADR of ~${recommendedCadrCfm} CFM (${recommendedCadrM3H} m³/h) provides ${requiredAch} clean air exchanges per hour for a ${clampedSqFt} sq ft room.`,
    safetyWarnings: [
      "Choose mechanical True-HEPA (H13 or H14 glass fiber) media only.",
      "Avoid purifiers advertising 'active oxygen', 'ionizer', or 'plasma' without certified zero-ozone emissions (ozone causes airway inflammation).",
      "Do NOT place HEPA purifiers directly inside the kitchen; aerosolized cooking oils will rapidly glaze and destroy the HEPA fibers.",
    ],
  };
}

/**
 * Formulates conditional window opening / ventilation advice based on outdoor telemetry and window situation.
 */
export function determineConditionalVentilation(
  profile: HouseholdProfile,
  outdoorObservations?: StationObservationResponse | null
): ConditionalVentilationAdvice {
  // Case 1: Missing or unavailable outdoor observation telemetry
  if (!outdoorObservations || !outdoorObservations.isAvailable) {
    return {
      status: "data_unavailable_precautionary",
      headline: "Outdoor Station Telemetry Unavailable — Apply Diurnal Precaution",
      explanation:
        "Local ground monitoring station data is currently offline. In Indian urban areas, ambient particulate matter peaks sharply between 05:00–09:00 and 18:00–22:00 due to atmospheric boundary-layer compression and vehicular exhaust.",
      recommendedAction:
        "Keep windows sealed during early morning and evening hours. If indoor air feels stuffy, perform a restricted 10–15 minute cross-ventilation during peak solar midday (12:30–15:00) when natural convective mixing is highest.",
      outdoorContextNote: "Local ambient AQI unmeasured; relying on diurnal atmospheric boundary-layer physics.",
    };
  }

  const pm25Val = outdoorObservations.pm25?.value ?? 0;
  const aqiVal = outdoorObservations.naqi?.overallAqi ?? 0;

  // Case 2: Severe outdoor pollution
  if (pm25Val > 120 || aqiVal > 200) {
    return {
      status: "seal_windows",
      headline: "Keep All Exterior Windows Sealed — Elevated Outdoor Smog",
      explanation: `Ambient PM2.5 is currently elevated (${pm25Val} µg/m³ at station ${outdoorObservations.station?.name || "nearby"}). Opening windows will flood your living quarters with fine combustion aerosols within 15–20 minutes.`,
      recommendedAction:
        profile.windowTightness === "loose_wooden" || profile.windowTightness === "sliding_gaps"
          ? "Seal window tracks with foam tape or place damp rolled towels along frame gaps. Run indoor filtration or stay in a closed central room."
          : "Keep all UPVC/sealed windows latched shut. Avoid using non-ducted kitchen exhaust that creates negative pressure drawing outdoor smog in.",
      outdoorContextNote: `Outdoor verified PM2.5: ${pm25Val} µg/m³ (Severe exposure threshold exceeded).`,
    };
  }

  // Case 3: Moderate / Elevated outdoor pollution (60 - 120 µg/m³)
  if (pm25Val > 60 || aqiVal > 100) {
    return {
      status: "caution_minimal",
      headline: "Restricted Ventilation Window — Midday Only",
      explanation: `Ambient outdoor air is moderately polluted (${pm25Val} µg/m³). Infiltration will occur if windows remain continuously open, especially on road-facing facades.`,
      recommendedAction:
        profile.roadExposure === "busy_corridor"
          ? "Never open road-facing windows. If ventilating to dilute indoor CO₂, open only courtyard or interior shaft windows for 15 minutes between 12:00 and 15:00."
          : "Limit cross-ventilation to a 20-minute window during peak afternoon warmth. Close and latch before evening twilight (17:30).",
      outdoorContextNote: `Outdoor verified PM2.5: ${pm25Val} µg/m³ (Moderate exceedance).`,
    };
  }

  // Case 4: Relatively clean outdoor atmosphere (<= 60 µg/m³)
  return {
    status: "selective_cross_ventilation",
    headline: "Safe Afternoon Cross-Ventilation Permitted",
    explanation: `Outdoor PM2.5 is currently within national standards (${pm25Val} µg/m³). Natural cross-ventilation helps flush accumulated indoor VOCs, carbon dioxide, and cooking moisture.`,
    recommendedAction:
      "Open opposite windows to establish cross-airflow for 30–45 minutes during afternoon hours. Monitor local construction dust if nearby.",
    outdoorContextNote: `Outdoor verified PM2.5: ${pm25Val} µg/m³ (Satisfactory / Good).`,
  };
}

/**
 * Generates personalized, prioritized indoor clean-air recommendations
 * according to household profile inputs, budget, and outdoor conditions.
 */
export function generateIndoorRecommendations(
  profile: HouseholdProfile,
  outdoorObservations?: StationObservationResponse | null
): IndoorRecommendation[] {
  const recs: IndoorRecommendation[] = [];

  const hasKidsOrSeniors = profile.vulnerabilities.some(
    (v) => v === "infants_children" || v === "seniors" || v === "asthma_respiratory"
  );
  const isElevatedOutdoor = (outdoorObservations?.pm25?.value ?? 0) > 60;

  // ==========================================
  // 1. REDUCE INDOOR POLLUTION SOURCES
  // ==========================================

  // Incense, Dhoop, and Mosquito Coils
  recs.push({
    id: "src-incense-coils",
    category: "source_reduction",
    title: "Zero-Combustion Policy: Eliminate Agarbatti & Mosquito Coils",
    action:
      "Cease burning incense sticks (agarbatti), dhoop, and mosquito coils inside closed living rooms. Switch to electrical liquid vaporizers or physical window mesh.",
    priority: hasKidsOrSeniors ? "Critical" : "High",
    costTier: "Zero-Cost",
    whyThisHelps:
      "A single burning mosquito coil releases as much fine PM2.5 as 75–100 cigarettes, along with formaldehyde and benzene. Incense smoke produces ultrafine particles that penetrate deep into alveolar lung tissues.",
    scientificRationale:
      "Aerosol characterization studies demonstrate that incense burning in typical Indian apartments elevates indoor PM2.5 to 200–600 µg/m³ within 30 minutes, lingering for up to 8 hours without mechanical ventilation.",
    citations: [
      "WHO Indoor Air Quality Guidelines: Selected Pollutants (2010)",
      "Liu et al., 'Mosquito coil smoke and its health implications', Environmental Health Perspectives",
    ],
  });

  // Smoking / Secondhand smoke
  recs.push({
    id: "src-indoor-smoking",
    category: "source_reduction",
    title: "Strict Indoor Smoke-Free Sanctuary",
    action:
      "Enforce an absolute zero-smoking rule inside the home, including balconies with open adjoining doors.",
    priority: "Critical",
    costTier: "Zero-Cost",
    whyThisHelps:
      "Tobacco and bidi smoke contains over 7,000 chemicals and generates high concentrations of PM0.1 and PM2.5 that adhere to curtains, sofas, and walls (thirdhand smoke).",
    scientificRationale:
      "US EPA and Surgeon General reports confirm no safe level of indoor secondhand smoke exposure exists.",
    citations: ["US EPA Health Effects of Exposure to Secondhand Smoke"],
  });

  // ==========================================
  // 2. COOKING VENTILATION & EXHAUST
  // ==========================================

  if (profile.cookingFuel === "biomass_wood_coal") {
    recs.push({
      id: "cook-biomass-critical",
      category: "cooking_ventilation",
      title: "Urgent Biomass/Solid Fuel Airway Isolation",
      action:
        "Never burn wood, coal, or biomass inside an unvented kitchen or living space. Create a dedicated outdoor cooking shelter or switch to clean LPG/induction via government welfare schemes (PM Ujjwala).",
      priority: "Critical",
      costTier: "Low-Cost (<₹1,000)",
      whyThisHelps:
        "Biomass combustion produces extreme levels of carbon monoxide, black carbon, and PM2.5, causing severe indoor air pollution and chronic obstructive pulmonary disease (COPD).",
      scientificRationale:
        "WHO guidelines classify unprocessed solid biomass combustion as a primary household health hazard.",
      citations: ["WHO Guidelines for Indoor Air Quality: Household Fuel Combustion (2014)"],
    });
  }

  if (profile.kitchenExhaust === "none_enclosed" || profile.kitchenExhaust === "window_only") {
    recs.push({
      id: "cook-install-exhaust",
      category: "cooking_ventilation",
      title: "Establish Mechanical Kitchen Air Extraction",
      action:
        "Install a dedicated wall/window exhaust fan. While cooking, keep the kitchen door closed to the rest of the home to isolate cooking fumes.",
      priority: "Critical",
      costTier: "Low-Cost (<₹1,000)",
      whyThisHelps:
        "Without forced exhaust, oil aerosols from Indian cooking (tadka, deep frying) disperse across bedrooms and living rooms, where they remain suspended for hours.",
      scientificRationale:
        "ASHRAE 62.2 requires a minimum intermittent kitchen exhaust airflow of 100 CFM (170 m³/h) to prevent whole-house aerosol contamination.",
      citations: ["ASHRAE Standard 62.2: Ventilation and Acceptable Indoor Air Quality in Residential Buildings"],
    });
  } else if (profile.kitchenExhaust === "chimney_ducted") {
    recs.push({
      id: "cook-chimney-protocol",
      category: "cooking_ventilation",
      title: "Optimized Chimney Timing & Rear-Burner Priority",
      action:
        "Turn your kitchen chimney on 2 minutes BEFORE lighting the stove to establish updraft. Cook high-heat tadka and frying on the REAR burners.",
      priority: "High",
      costTier: "Zero-Cost",
      whyThisHelps:
        "Ducted chimneys capture 80–90% of plumes from rear burners, but only 50–60% from front burners. Turning the hood on early sets up the thermal siphon effect.",
      scientificRationale:
        "Lawrence Berkeley National Laboratory (LBNL) kitchen ventilation experiments show cooking on back burners reduces occupant particle exposure by over 35%.",
      citations: ["Singer et al., Lawrence Berkeley National Laboratory: 'Pollutant Capture Efficiency of Residential Range Hoods'"],
    });
  }

  // Universal cooking habit: Pan lids
  recs.push({
    id: "cook-lid-technique",
    category: "cooking_ventilation",
    title: "Pan Lids During Simmering & Boiling",
    action:
      "Keep tight-fitting lids on pots and pans while simmering, boiling, and sautéing until final seasoning.",
    priority: "Medium",
    costTier: "Zero-Cost",
    whyThisHelps:
      "Reduces excess steam and oil droplets from aerosolizing into fine respirable mists, and conserves cooking energy.",
    scientificRationale:
      "Physical containment reduces aerosol generation rate by up to 45% during the preliminary cooking phase.",
    citations: ["US EPA Residential Air Quality in Kitchens Guidance"],
  });

  // ==========================================
  // 3. HEPA FILTRATION & PURIFIER SIZING
  // ==========================================

  const sizing = calculatePurifierSizing(profile.roomSizeSqFt);

  if (profile.purifierStatus === "none" || profile.purifierStatus === "considering_purchase") {
    recs.push({
      id: "hepa-selection-guide",
      category: "hepa_filtration",
      title: `Purifier Sizing: Minimum ${sizing.recommendedCadrM3H} m³/h CADR for ${profile.roomSizeSqFt} sq ft`,
      action:
        `If purchasing an air purifier, verify that the Clean Air Delivery Rate (CADR) for smoke/fine particles is at least ${sizing.recommendedCadrM3H} m³/h (~${sizing.recommendedCadrCfm} CFM). Choose True-HEPA (H13/H14) without ionizers.`,
      priority: profile.vulnerabilities.length > 0 && isElevatedOutdoor ? "High" : "Medium",
      costTier: profile.budgetPreference === "zero_low_cost" ? "Low-Cost (<₹1,000)" : "Investment",
      whyThisHelps:
        `Under-sizing a purifier fails to overcome residential air infiltration. For ${profile.roomSizeSqFt} sq ft in polluted Indian conditions, you need ${sizing.requiredAch} clean air changes per hour.`,
      scientificRationale:
        "US EPA 'Residential Air Cleaners Technical Summary' (EPA 402-F-08-004) confirms mechanical True-HEPA delivers >99.97% single-pass efficiency for 0.3 µm particles without emitting toxic secondary ozone.",
      citations: [
        "US EPA 402-F-08-004: Residential Air Cleaners — A Technical Summary",
        "AHAM AC-1: Method for Measuring Performance of Portable Household Electric Cord-Connected Room Air Cleaners",
      ],
    });
  } else {
    recs.push({
      id: "hepa-operation-placement",
      category: "hepa_filtration",
      title: "Optimized Purifier Placement & Continuous Low-Speed Operation",
      action:
        "Position your HEPA purifier at least 1 meter away from walls, headboards, and heavy curtains. Run it continuously on low/medium speed rather than burst high-speed cycles.",
      priority: "High",
      costTier: "Zero-Cost",
      whyThisHelps:
        "Air purifiers rely on 360° toroidal airflow to circulate clean air across the breathing zone. Placing them in tight corners restricts intake flow by up to 50%. Continuous low-speed operation maintains steady air changes without noise fatigue.",
      scientificRationale:
        "Computational fluid dynamics (CFD) modeling of indoor airflow indicates center-wall placement at breathing level achieves the fastest uniform particulate clearance.",
      citations: ["ASHRAE Epidemic Task Force: Filtration & Disinfection Guidance"],
    });
  }

  // ==========================================
  // 4. CONDITIONAL WINDOW & VENTILATION GUIDANCE
  // ==========================================

  if (profile.windowTightness === "loose_wooden" || profile.windowTightness === "sliding_gaps") {
    recs.push({
      id: "vent-weatherstripping",
      category: "conditional_ventilation",
      title: "Seal Window Frame Gaps with Adhesive Foam Strips",
      action:
        "Apply self-adhesive EPDM rubber or foam weatherstripping tape along sliding tracks and wooden window sills. Install a door-bottom sweep.",
      priority: isElevatedOutdoor ? "Critical" : "High",
      costTier: "Low-Cost (<₹1,000)",
      whyThisHelps:
        "Infiltration through window and door cracks accounts for 50–70% of indoor PM2.5 during severe winter smog episodes. Sealing gaps stops outdoor soot from continuously replenishing indoor air.",
      scientificRationale:
        "Building science research shows weatherstripping older residential envelopes reduces the indoor-to-outdoor (I/O) particulate penetration coefficient from ~0.7 to <0.35.",
      citations: ["Chen et al., 'Air infiltration and indoor particle concentrations in residences', Atmospheric Environment"],
    });
  }

  if (profile.roadExposure === "busy_corridor" || profile.roadExposure === "construction_nearby") {
    recs.push({
      id: "vent-facade-management",
      category: "conditional_ventilation",
      title: "Selective Leeward Window Opening (Avoid Traffic Facade)",
      action:
        "Keep all windows directly facing the primary road or construction site closed at all times. Use only rear-facing or internal courtyard windows when short ventilation is needed.",
      priority: "High",
      costTier: "Zero-Cost",
      whyThisHelps:
        "Particulate and nitrogen dioxide (NO₂) concentrations decay exponentially within 100–150 meters of active traffic corridors. Road-facing windows receive direct, unmixed vehicular exhaust.",
      scientificRationale:
        "HEI (Health Effects Institute) Special Report 17: Traffic-related air pollution exposure gradients demonstrate a 40–60% drop in primary combustion particles on the leeward/interior side of structures.",
      citations: ["Health Effects Institute Special Report 17: Traffic-Related Air Pollution"],
    });
  }

  // ==========================================
  // 5. LOW-COST INDOOR HABITS
  // ==========================================

  // Wet Mopping vs Dry Sweeping
  recs.push({
    id: "habit-wet-mop",
    category: "low_cost_habits",
    title: "Wet Mopping with Microfiber (Ban Dry Jhadu/Brooming)",
    action:
      "Damp mop hard floors using a microfiber mop. Do not use dry grass brooms (jhadu) or dry feather dusters inside closed rooms.",
    priority: "High",
    costTier: "Zero-Cost",
    whyThisHelps:
      "Dry brooms do not remove fine dust—they re-suspend settled toxic PM10, PM2.5, heavy metals, and tire dust directly into the air you breathe for the next 2 to 4 hours.",
    scientificRationale:
      "Indoor resuspension studies demonstrate that dry sweeping elevates breathing-zone PM10 by 300% and PM2.5 by 120% relative to resting background levels.",
    citations: ["US EPA Healthy Indoor Environments in Residences"],
  });

  // Shoe-free home entry
  recs.push({
    id: "habit-shoe-free",
    category: "low_cost_habits",
    title: "Shoe-Free Entryway & High-Traction Doormats",
    action:
      "Remove outdoor footwear immediately at the entrance door. Place a dual-mat system (coarse scraper outside, absorbent microfiber inside).",
    priority: "Medium",
    costTier: "Zero-Cost",
    whyThisHelps:
      "Up to 80% of indoor floor dust, vehicle soot, polycyclic aromatic hydrocarbons (PAHs), and street biological pathogens are tracked inside on footwear soles.",
    scientificRationale:
      "University of Arizona microbiology and indoor dust studies confirm removing outdoor shoes dramatically reduces residential lead and PAH deposition.",
    citations: ["Hunt et al., 'Tracking of outdoor dust into indoor residential spaces'"],
  });

  // ==========================================
  // 6. POLLUTION EPISODE ADJUSTMENTS
  // ==========================================

  recs.push({
    id: "episode-clean-sanctuary",
    category: "pollution_episode",
    title: "Establish a Designated 'Clean-Air Sanctuary Room'",
    action:
      "Designate the smallest, most sealed bedroom as the family clean air sanctuary during severe pollution episodes. Keep its door closed and prioritize filtration in this single room.",
    priority: hasKidsOrSeniors ? "Critical" : "High",
    costTier: "Zero-Cost",
    whyThisHelps:
      "Focusing air sealing and filtration on one compact room allows you to achieve high air changes per hour (ACH) even with modest equipment or simple sealing measures.",
    scientificRationale:
      "US EPA Wildfire Smoke Guide recommends creating a designated 'Clean Room' inside residences to minimize vulnerable population exposure during emergency air episodes.",
    citations: ["US EPA Smoke-Ready Toolbox: 'Create a Clean Room at Home'"],
  });

  // Sort by priority and budget alignment
  const priorityOrder: Record<string, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Foundational: 3,
  };

  // If budget preference is zero_low_cost, ensure Zero-Cost and Low-Cost items appear first
  return recs.sort((a, b) => {
    if (profile.budgetPreference === "zero_low_cost") {
      const aIsCheap = a.costTier === "Zero-Cost" || a.costTier === "Low-Cost (<₹1,000)";
      const bIsCheap = b.costTier === "Zero-Cost" || b.costTier === "Low-Cost (<₹1,000)";
      if (aIsCheap && !bIsCheap) return -1;
      if (!aIsCheap && bIsCheap) return 1;
    }
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    return aPriority - bPriority;
  });
}

/**
 * Builds the complete structured Indoor Air Guardian guidance package.
 */
export function buildIndoorGuardianGuidance(
  profile: HouseholdProfile,
  outdoorObservations?: StationObservationResponse | null
): IndoorGuardianGuidance {
  const recommendations = generateIndoorRecommendations(profile, outdoorObservations);
  const purifierSizing = calculatePurifierSizing(profile.roomSizeSqFt);
  const ventilationAdvice = determineConditionalVentilation(profile, outdoorObservations);

  return {
    profile,
    recommendations,
    purifierSizing,
    ventilationAdvice,
    indoorMeasurementNotice:
      "IMPORTANT SAFEGUARD: Indoor air quality is NOT identical to outdoor AQI. Unless you have calibrated indoor particle sensors operating in your home, indoor PM2.5 cannot be treated as a known numerical measurement.",
    scientificSafeguards: {
      debunkedPlantMyth:
        "SCIENTIFIC EVIDENCE ON HOUSEPLANTS: While popular articles cite the 1989 NASA study, that research took place in small, sealed 0.5 m³ Plexiglas chambers. In real-world homes with natural air exchange (0.3 to 1.0 ACH), indoor plants have a Clean Air Delivery Rate (CADR) of less than 0.1 m³/h. You would need 100 to 1,000 plants per room to match one compact HEPA filter, which creates dangerous humidity and fungal mold spores. Plants cannot replace mechanical filtration.",
      unmeasuredIndoorAirNotice:
        "NO SYNTHETIC INDOOR AQI: VayuVerse will never synthesize or fabricate an indoor PM2.5 number. Indoor particulate levels depend on cooking, sealing, smoking, and infiltration, and can only be measured with physical indoor hardware.",
      ionizerOzoneWarning:
        "AVOID OZONE-GENERATING AIR CLEANERS: Never buy air cleaners that rely on intentional ozone emission, unshielded needlepoint ionizers, or photocatalytic oxidation without verified zero-ozone CARB certification. Ozone is a toxic pulmonary irritant that permanently damages lung airway lining.",
    },
  };
}
