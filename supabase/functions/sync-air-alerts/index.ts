import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Type declaration for Deno runtime in non-Deno TypeScript environments
interface DenoRuntime {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Promise<Response>) => void;
}
declare const Deno: DenoRuntime | undefined;

// =============================================================================
// Type Definitions
// =============================================================================

export interface OptedInUser {
  user_id: string;
  minimum_severity: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export interface UserSavedLocation {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface UserProfileSummary {
  user_id: string;
  category?: string;
  sensitivity?: string;
  commute_mode?: string;
  purifier_availability?: string;
}

export interface OpenAQSensorItem {
  id: number;
  parameter?: {
    name?: string;
    displayName?: string;
    units?: string;
  };
}

export interface OpenAQStationItem {
  id: number;
  name: string;
  distance?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  provider?: {
    name?: string;
  };
  datetimeLast?: {
    utc?: string;
  };
  timezone?: string;
  sensors?: OpenAQSensorItem[];
}

export interface OpenAQMeasurementItem {
  sensorsId: number;
  value: number;
  datetime?: {
    utc?: string;
    local?: string;
  };
  period?: {
    label?: string;
    interval?: number;
  };
}

export interface AveragingMetadata {
  periodHours: number;
  validHoursCount: number; // Must be >= 16 for official CPCB 24-hour average
}

export interface EvaluatedObservation {
  stationId: number;
  stationName: string;
  distanceKm: number;
  coordinates: { latitude: number; longitude: number };
  provider: string;
  observedAtUtc: string;
  hoursAgo: number;
  isFreshForUrgent: boolean; // <= 3 hours old
  pm25: { value: number; unit: string; sensorId: number } | null;
  pm10: { value: number; unit: string; sensorId: number } | null;
  averaging: AveragingMetadata;
  isOfficial24hAqi: boolean;
  officialAqiValue: number | null; // Strictly null for hourly/instantaneous telemetry
  concentrationCategory: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
  dominantPollutant: "PM2.5" | "PM10" | null;
  dominantValue: number;
  pollutantCount: number;
}

export interface PreparedAlertPayload {
  user_id: string;
  location_id: string;
  alert_type: "elevated_hazard" | "observed_threshold";
  severity: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
  status: "active";
  source_type: "observed";
  pollutant: string;
  observed_value: number;
  aqi_value: number | null; // Null unless official 24-hour averaging criteria met
  source_name: string;
  source_timestamp: string;
  title: string;
  message: string;
  recommended_action: string;
  fingerprint: string;
}

// =============================================================================
// Helper: Structured Logger
// =============================================================================

function logStructured(level: "INFO" | "WARN" | "ERROR", event: string, details: Record<string, unknown> = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    service: "sync-air-alerts",
    level,
    event,
    ...details,
  };
  if (level === "ERROR") {
    console.error(JSON.stringify(payload));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

// =============================================================================
// Constant-Time String Comparison (Timing Attack Protection)
// =============================================================================

export function constantTimeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// =============================================================================
// CPCB Indian National AQI vs Hourly Concentration Advisory Logic
// =============================================================================

/**
 * Maps raw PM2.5 concentration (µg/m³) to CPCB health hazard category.
 * Used for hourly concentration advisories.
 */
export function getPm25ConcentrationCategory(
  conc: number
): "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe" {
  if (conc <= 30) return "Good";
  if (conc <= 60) return "Satisfactory";
  if (conc <= 90) return "Moderate";
  if (conc <= 120) return "Poor";
  if (conc <= 250) return "Very Poor";
  return "Severe";
}

/**
 * Maps raw PM10 concentration (µg/m³) to CPCB health hazard category.
 * Used for hourly concentration advisories.
 */
export function getPm10ConcentrationCategory(
  conc: number
): "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe" {
  if (conc <= 50) return "Good";
  if (conc <= 100) return "Satisfactory";
  if (conc <= 250) return "Moderate";
  if (conc <= 350) return "Poor";
  if (conc <= 430) return "Very Poor";
  return "Severe";
}

/**
 * Calculates PM2.5 24-hour sub-index following CPCB standard piecewise formula.
 * ONLY applicable when a true 24-hour average concentration is provided.
 */
export function calculatePm25SubIndex(conc: number): number {
  if (conc <= 30) return Math.round((conc / 30) * 50);
  if (conc <= 60) return Math.round(50 + ((conc - 30) / 30) * 50);
  if (conc <= 90) return Math.round(100 + ((conc - 60) / 30) * 100);
  if (conc <= 120) return Math.round(200 + ((conc - 90) / 30) * 100);
  if (conc <= 250) return Math.round(300 + ((conc - 120) / 130) * 100);
  return Math.min(500, Math.round(400 + ((conc - 250) / 130) * 100));
}

/**
 * Calculates PM10 24-hour sub-index following CPCB standard piecewise formula.
 * ONLY applicable when a true 24-hour average concentration is provided.
 */
export function calculatePm10SubIndex(conc: number): number {
  if (conc <= 50) return Math.round((conc / 50) * 50);
  if (conc <= 100) return Math.round(50 + ((conc - 50) / 50) * 50);
  if (conc <= 250) return Math.round(100 + ((conc - 100) / 150) * 100);
  if (conc <= 350) return Math.round(200 + ((conc - 250) / 100) * 100);
  if (conc <= 430) return Math.round(300 + ((conc - 350) / 80) * 100);
  return Math.min(500, Math.round(400 + ((conc - 430) / 70) * 100));
}

export function getIndianNaqiCategory(
  aqi: number
): "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe" {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

/**
 * Evaluates whether CPCB data sufficiency criteria are met for an official 24-hour AQI:
 * 1. Requires a 24-hour monitoring period.
 * 2. Requires data completeness of at least 16 hours out of 24 hours (>= 66.7%).
 * 3. Requires at least 3 monitored pollutants, with at least one particulate matter (PM2.5 or PM10).
 *
 * If criteria are not met, returns null. Under no circumstances should hourly or instantaneous
 * measurements be presented as an official Indian AQI number.
 */
export function calculateOfficialCpcb24hAqi(params: {
  subIndices: { pm25?: number; pm10?: number; other?: number[] };
  averaging: AveragingMetadata;
  totalMonitoredPollutants: number;
}): number | null {
  const { subIndices, averaging, totalMonitoredPollutants } = params;

  // Criteria 1 & 2: Averaging period must be 24 hours with >= 16 hours data completeness
  if (averaging.periodHours < 24 || averaging.validHoursCount < 16) {
    return null;
  }

  // Criteria 3: Minimum 3 pollutants with at least one PM
  const hasPm = subIndices.pm25 !== undefined || subIndices.pm10 !== undefined;
  if (!hasPm || totalMonitoredPollutants < 3) {
    return null;
  }

  const allSub = [
    subIndices.pm25,
    subIndices.pm10,
    ...(subIndices.other || []),
  ].filter((v): v is number => v !== undefined && !isNaN(v));

  if (allSub.length === 0) return null;
  return Math.max(...allSub);
}

export const SEVERITY_RANK: Record<string, number> = {
  Good: 1,
  Satisfactory: 2,
  Moderate: 3,
  Poor: 4,
  "Very Poor": 5,
  Severe: 6,
};

// =============================================================================
// Helper: Quiet Hours Evaluation
// =============================================================================

export function isWithinQuietHours(currentTime: Date, startStr: string = "22:00", endStr: string = "07:00"): boolean {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// =============================================================================
// Provider Data Retrieval: OpenAQ v3
// =============================================================================

async function fetchOpenAQWithTimeout(
  url: string,
  apiKey: string,
  timeoutMs = 6000,
  retryCount = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "X-API-Key": apiKey,
        "Accept": "application/json",
        "User-Agent": "VayuVerse-EdgeIngestion/1.0",
      },
    });

    // Handle transient rate limit (429) or service unavailable (503) with 1 retry
    if ((res.status === 429 || res.status === 503) && retryCount > 0) {
      logStructured("WARN", "OPENAQ_TRANSIENT_RETRY", { status: res.status, url });
      await new Promise((r) => setTimeout(r, 1000));
      return fetchOpenAQWithTimeout(url, apiKey, timeoutMs, retryCount - 1);
    }

    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchStationObservation(
  lat: number,
  lon: number,
  apiKey: string
): Promise<EvaluatedObservation | null> {
  if (!apiKey) {
    logStructured("WARN", "MISSING_OPENAQ_API_KEY", { lat: lat.toFixed(2), lon: lon.toFixed(2) });
    return null;
  }

  // 1. Discover active stations within 25km radius
  const locUrl = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=25000&limit=8`;
  let locRes: Response;
  try {
    locRes = await fetchOpenAQWithTimeout(locUrl, apiKey);
  } catch (err) {
    logStructured("WARN", "OPENAQ_LOCATIONS_FETCH_TIMEOUT", { message: (err as Error).message });
    return null;
  }

  if (locRes.status === 429) {
    logStructured("WARN", "OPENAQ_RATE_LIMITED", { endpoint: "locations" });
    return null;
  }

  if (!locRes.ok) {
    logStructured("WARN", "OPENAQ_LOCATIONS_HTTP_ERROR", { status: locRes.status });
    return null;
  }

  const locData = await locRes.json();
  const rawStations: OpenAQStationItem[] = locData.results || [];
  if (!Array.isArray(rawStations) || rawStations.length === 0) {
    return null;
  }

  // Score candidate stations by distance and sensor presence
  const ranked = rawStations
    .map((s) => {
      let score = 0;
      const dist = s.distance || 25000;
      score += Math.max(0, (25000 - dist) / 500); // Up to 50 pts for proximity
      const sensors = s.sensors || [];
      const hasPm25 = sensors.some((sn) => sn.parameter?.name?.toLowerCase() === "pm25");
      const hasPm10 = sensors.some((sn) => sn.parameter?.name?.toLowerCase() === "pm10");
      if (hasPm25) score += 40;
      if (hasPm10) score += 20;
      return { station: s, score };
    })
    .sort((a, b) => b.score - a.score);

  const bestStation = ranked[0]?.station;
  if (!bestStation) return null;

  // 2. Fetch latest measurements for the top-ranked station
  const latestUrl = `https://api.openaq.org/v3/locations/${bestStation.id}/latest`;
  let latestRes: Response;
  try {
    latestRes = await fetchOpenAQWithTimeout(latestUrl, apiKey);
  } catch {
    logStructured("WARN", "OPENAQ_LATEST_FETCH_TIMEOUT", { stationId: bestStation.id });
    return null;
  }

  if (!latestRes.ok) {
    logStructured("WARN", "OPENAQ_LATEST_HTTP_ERROR", { stationId: bestStation.id, status: latestRes.status });
    return null;
  }

  const latestData = await latestRes.json();
  const measurements: OpenAQMeasurementItem[] = latestData.results || [];
  if (!Array.isArray(measurements) || measurements.length === 0) {
    return null;
  }

  // Map measurements to sensor parameter descriptors
  const sensorMap = new Map<number, OpenAQSensorItem>();
  for (const s of bestStation.sensors || []) {
    sensorMap.set(s.id, s);
  }

  let pm25Obs: { value: number; unit: string; sensorId: number; utc: string } | null = null;
  let pm10Obs: { value: number; unit: string; sensorId: number; utc: string } | null = null;
  const validPollutants = new Set<string>();
  let mostRecentUtc = "";
  let mostRecentMs = 0;

  for (const m of measurements) {
    // Data validation: reject negative, NaN, or physically implausible concentrations (> 2500 µg/m³)
    if (typeof m.value !== "number" || isNaN(m.value) || m.value < 0 || m.value > 2500) {
      continue;
    }

    const sensor = sensorMap.get(m.sensorsId);
    const paramName = sensor?.parameter?.name?.toLowerCase() || "";
    const unit = sensor?.parameter?.units || "µg/m³";
    const obsUtc = m.datetime?.utc || "";
    const obsMs = obsUtc ? new Date(obsUtc).getTime() : 0;

    // Reject future timestamps (> 10 mins in future)
    if (obsMs > Date.now() + 600000) continue;

    if (obsMs > mostRecentMs) {
      mostRecentMs = obsMs;
      mostRecentUtc = obsUtc;
    }

    if (paramName === "pm25" && (!pm25Obs || obsMs > new Date(pm25Obs.utc).getTime())) {
      pm25Obs = { value: Number(m.value.toFixed(1)), unit, sensorId: m.sensorsId, utc: obsUtc };
      validPollutants.add("pm25");
    } else if (paramName === "pm10" && (!pm10Obs || obsMs > new Date(pm10Obs.utc).getTime())) {
      pm10Obs = { value: Number(m.value.toFixed(1)), unit, sensorId: m.sensorsId, utc: obsUtc };
      validPollutants.add("pm10");
    } else if (paramName) {
      validPollutants.add(paramName);
    }
  }

  if (!mostRecentUtc) return null;

  const nowMs = Date.now();
  const hoursAgo = Number(((nowMs - mostRecentMs) / 3600000).toFixed(1));
  const isFreshForUrgent = hoursAgo <= 3.0; // Source-aware freshness requirement

  // Averaging period: /latest delivers 1-hour / instantaneous telemetry
  const averaging: AveragingMetadata = {
    periodHours: 1,
    validHoursCount: 1, // Only 1 reading available from /latest
  };

  // Check official 24-hour AQI criteria (strictly false for hourly data)
  const isOfficial24hAqi = false;
  const officialAqiValue: number | null = null; // Strictly null for hourly observations

  // Determine concentration health category for advisory purposes
  let dominantPollutant: "PM2.5" | "PM10" | null = null;
  let dominantValue = 0;
  let concentrationCategory: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe" = "Good";

  if (pm25Obs) {
    dominantPollutant = "PM2.5";
    dominantValue = pm25Obs.value;
    concentrationCategory = getPm25ConcentrationCategory(pm25Obs.value);
  } else if (pm10Obs) {
    dominantPollutant = "PM10";
    dominantValue = pm10Obs.value;
    concentrationCategory = getPm10ConcentrationCategory(pm10Obs.value);
  }

  return {
    stationId: bestStation.id,
    stationName: bestStation.name || "CPCB Monitoring Station",
    distanceKm: Number(((bestStation.distance || 0) / 1000).toFixed(1)),
    coordinates: {
      latitude: bestStation.coordinates?.latitude || lat,
      longitude: bestStation.coordinates?.longitude || lon,
    },
    provider: bestStation.provider?.name || "CPCB / SPCB",
    observedAtUtc: mostRecentUtc,
    hoursAgo,
    isFreshForUrgent,
    pm25: pm25Obs ? { value: pm25Obs.value, unit: pm25Obs.unit, sensorId: pm25Obs.sensorId } : null,
    pm10: pm10Obs ? { value: pm10Obs.value, unit: pm10Obs.unit, sensorId: pm10Obs.sensorId } : null,
    averaging,
    isOfficial24hAqi,
    officialAqiValue,
    concentrationCategory,
    dominantPollutant,
    dominantValue,
    pollutantCount: validPollutants.size,
  };
}

// =============================================================================
// Helper: Personalized Guidance Generator (Hourly Advisory)
// =============================================================================

function generateConcentrationAdvisoryGuidance(
  severity: "Poor" | "Very Poor" | "Severe",
  stationName: string,
  pollutant: string,
  observedVal: number,
  category: string
): { title: string; message: string; recommendedAction: string } {
  // Title explicitly frames reading as an Hourly Concentration Advisory, NOT an official AQI category
  const title = `Hourly ${pollutant} Advisory: Elevated Hazard (${observedVal} µg/m³) - ${severity} Air`;
  const message = `Ground sensor at ${stationName} recorded an hourly ${pollutant} concentration of ${observedVal} µg/m³. Note: This advisory is based on hourly telemetry; official Indian National AQI requires a 24-hour average across ≥16 hours of continuous monitoring with at least 3 criteria pollutants.`;

  let recommendedAction = "Keep residential windows firmly latched. Run HEPA air purifier on medium/high.";
  if (category === "college_student") {
    recommendedAction = "Relocate campus study to well-ventilated libraries. Wear a certified N95 respirator between lecture halls.";
  } else if (category === "office_commuter") {
    recommendedAction = "Equip sealed N95/FFP2 mask during commute. Switch vehicle HVAC strictly to internal cabin recirculation.";
  } else if (category === "senior_citizen" || category === "parent_child") {
    recommendedAction = "Avoid all outdoor exertion or park strolls. Maintain indoor air filtration and seal drafty window gaps.";
  }

  return { title, message, recommendedAction };
}

// =============================================================================
// Core Ingestion Engine
// =============================================================================

export async function processAirAlertsSync(
  supabase: SupabaseClient,
  openAqApiKey: string,
  options: { dryRun?: boolean; targetUserId?: string } = {}
) {
  const startTime = Date.now();
  const isDryRun = !!options.dryRun;

  logStructured("INFO", "INGESTION_RUN_STARTED", { isDryRun, targetUser: options.targetUserId || "all" });

  // 1. Fetch opted-in users
  let prefQuery = supabase
    .from("notification_preferences")
    .select("user_id, minimum_severity, quiet_hours_start, quiet_hours_end, timezone")
    .eq("enabled", true);

  if (options.targetUserId) {
    prefQuery = prefQuery.eq("user_id", options.targetUserId);
  }

  const { data: optedInUsers, error: prefErr } = await prefQuery;
  if (prefErr || !optedInUsers || optedInUsers.length === 0) {
    logStructured("INFO", "NO_OPTED_IN_USERS", { error: prefErr?.message });
    return { success: true, processedUsers: 0, alertsEvaluated: 0, alertsCreated: 0, alertsWritten: 0, dryRun: isDryRun };
  }

  const userIds = optedInUsers.map((u) => u.user_id);

  // 2. Fetch saved locations for these opted-in users
  // Normalizes both schema variants (location_name/rounded_latitude vs name/latitude)
  const { data: rawLocations, error: locErr } = await supabase
    .from("saved_locations")
    .select("*")
    .in("user_id", userIds);

  const locations: UserSavedLocation[] = ((rawLocations as unknown as Array<Record<string, unknown>>) || []).map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.location_name || row.name || "Saved Location"),
    latitude: Number(row.rounded_latitude ?? row.latitude),
    longitude: Number(row.rounded_longitude ?? row.longitude),
  })).filter((l) => !isNaN(l.latitude) && !isNaN(l.longitude));

  if (locErr || locations.length === 0) {
    logStructured("INFO", "NO_SAVED_LOCATIONS", { error: locErr?.message, rawCount: rawLocations?.length || 0 });
    return { success: true, processedUsers: userIds.length, alertsEvaluated: 0, alertsCreated: 0, alertsWritten: 0, dryRun: isDryRun };
  }

  // 3. Fetch user profiles for personalization
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, category, sensitivity, commute_mode, purifier_availability")
    .in("user_id", userIds);

  const profileMap = new Map<string, UserProfileSummary>();
  for (const p of profiles || []) {
    profileMap.set(p.user_id, p);
  }

  // 4. Cluster unique geographic coordinates (< 5km) to avoid duplicate OpenAQ queries
  interface GeoCluster {
    centerLat: number;
    centerLon: number;
    locations: UserSavedLocation[];
  }

  const clusters: GeoCluster[] = [];
  for (const loc of locations) {
    let matchedCluster: GeoCluster | null = null;
    for (const c of clusters) {
      // Approx 0.045 deg ~= 5 km
      if (Math.abs(c.centerLat - loc.latitude) < 0.045 && Math.abs(c.centerLon - loc.longitude) < 0.045) {
        matchedCluster = c;
        break;
      }
    }
    if (matchedCluster) {
      matchedCluster.locations.push(loc);
    } else {
      clusters.push({
        centerLat: loc.latitude,
        centerLon: loc.longitude,
        locations: [loc],
      });
    }
  }

  logStructured("INFO", "LOCATIONS_CLUSTERED", {
    totalLocations: locations.length,
    distinctClusters: clusters.length,
  });

  // 5. Query OpenAQ with bounded concurrency (batch size = 3)
  const clusterObservations = new Map<GeoCluster, EvaluatedObservation | null>();
  const batchSize = 3;
  for (let i = 0; i < clusters.length; i += batchSize) {
    const batch = clusters.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((c) => fetchStationObservation(c.centerLat, c.centerLon, openAqApiKey))
    );

    for (let j = 0; j < batch.length; j++) {
      const cluster = batch[j]!;
      const res = results[j]!;
      clusterObservations.set(cluster, res.status === "fulfilled" ? res.value : null);
    }
  }

  // 6. Evaluate alerts user-by-user
  const preparedAlerts: PreparedAlertPayload[] = [];
  const now = new Date();
  const hourBucket = now.toISOString().slice(0, 13); // e.g. "2026-11-23T00"

  for (const cluster of clusters) {
    const obs = clusterObservations.get(cluster);
    if (!obs) {
      // Provider unavailable or station has no recent data: skip gracefully without resolving or fabricating
      continue;
    }

    // Only process elevated hazards (Poor, Very Poor, Severe)
    const isUrgentHazard =
      obs.concentrationCategory === "Poor" ||
      obs.concentrationCategory === "Very Poor" ||
      obs.concentrationCategory === "Severe";
    if (!isUrgentHazard) {
      continue;
    }

    // Source-Aware Freshness Gate: Reject observations older than 3 hours from triggering active hazard alerts
    if (!obs.isFreshForUrgent) {
      logStructured("INFO", "OBSERVATION_STALE_SKIPPED", {
        stationName: obs.stationName,
        hoursAgo: obs.hoursAgo,
        severity: obs.concentrationCategory,
      });
      continue;
    }

    const obsRank = SEVERITY_RANK[obs.concentrationCategory] || 0;

    for (const loc of cluster.locations) {
      const userPref = optedInUsers.find((u) => u.user_id === loc.user_id);
      if (!userPref) continue;

      // Minimum severity check
      const minRank = SEVERITY_RANK[userPref.minimum_severity] || 3;
      if (obsRank < minRank) {
        continue;
      }

      // Quiet hours check: Suppress alerts during quiet hours unless Severe or Very Poor
      const isQuiet = isWithinQuietHours(now, userPref.quiet_hours_start, userPref.quiet_hours_end);
      if (isQuiet && obs.concentrationCategory !== "Severe" && obs.concentrationCategory !== "Very Poor") {
        continue;
      }

      const userProf = profileMap.get(loc.user_id);
      const pollutantName = obs.dominantPollutant || "PM2.5";
      const guidance = generateConcentrationAdvisoryGuidance(
        obs.concentrationCategory as "Poor" | "Very Poor" | "Severe",
        obs.stationName,
        pollutantName,
        obs.dominantValue,
        userProf?.category || "general_individual"
      );

      const cleanLoc = loc.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      const cleanCat = obs.concentrationCategory.toLowerCase().trim().replace(/\s+/g, "-");
      const cleanPollutant = pollutantName.toLowerCase().trim().replace(/[^a-z0-9.]+/g, "");
      // Stable deduplication fingerprint incorporating hourly bucket, location, category, and pollutant
      const fingerprint = `${cleanLoc}_hourly_advisory_${cleanCat}_${cleanPollutant}_${hourBucket}`;

      preparedAlerts.push({
        user_id: loc.user_id,
        location_id: loc.id,
        alert_type: "elevated_hazard",
        severity: obs.concentrationCategory,
        status: "active",
        source_type: "observed",
        pollutant: pollutantName,
        observed_value: obs.dominantValue,
        // Official 24-hour AQI generation is explicitly disabled:
        // OpenAQ /latest provides instantaneous/hourly telemetry. Official Indian NAQI
        // mandates 24-hour continuous averaging across >= 16 hours for 3+ pollutants.
        // Therefore, aqi_value is strictly null.
        aqi_value: null,
        source_name: obs.stationName,
        source_timestamp: obs.observedAtUtc,
        title: guidance.title,
        message: guidance.message,
        recommended_action: guidance.recommendedAction,
        fingerprint,
      });
    }
  }

  // 7. Deduplicated Write to public.air_alerts using service_role
  let createdCount = 0;
  if (!isDryRun && preparedAlerts.length > 0) {
    for (const alert of preparedAlerts) {
      // Use ignoreDuplicates: true (ON CONFLICT (user_id, fingerprint) DO NOTHING)
      // and .select("id") to count ONLY newly created rows, excluding duplicate-suppressed rows
      const { data: insertedRows, error: insErr } = await supabase
        .from("air_alerts")
        .upsert(alert, {
          onConflict: "user_id,fingerprint",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insErr) {
        logStructured("ERROR", "ALERT_UPSERT_FAILED", {
          userIdMasked: alert.user_id.slice(0, 8),
          error: insErr.message,
        });
      } else if (insertedRows && insertedRows.length > 0) {
        createdCount++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  logStructured("INFO", "INGESTION_RUN_COMPLETED", {
    durationMs,
    locationsScanned: locations.length,
    clustersQueried: clusters.length,
    alertsEvaluated: preparedAlerts.length,
    alertsCreated: isDryRun ? 0 : createdCount,
    alertsWritten: isDryRun ? 0 : createdCount,
    dryRun: isDryRun,
  });

  return {
    success: true,
    processedUsers: userIds.length,
    locationsScanned: locations.length,
    alertsEvaluated: preparedAlerts.length,
    alertsCreated: isDryRun ? 0 : createdCount,
    alertsWritten: isDryRun ? 0 : createdCount,
    dryRun: isDryRun,
    evaluatedAlerts: isDryRun ? preparedAlerts : undefined,
  };
}

// =============================================================================
// Edge Function HTTP Entrypoint
// =============================================================================

export async function handleRequest(req: Request): Promise<Response> {
  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Fail closed if required server secrets are missing
  const cronSecret = typeof Deno !== "undefined" ? Deno.env.get("CRON_SECRET") : process.env.CRON_SECRET;
  const serviceRoleKey = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") : process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : process.env.SUPABASE_URL;
  const openAqApiKey = typeof Deno !== "undefined" ? Deno.env.get("OPENAQ_API_KEY") : process.env.OPENAQ_API_KEY;

  if (!cronSecret || !serviceRoleKey || !supabaseUrl || !openAqApiKey) {
    logStructured("ERROR", "MISSING_REQUIRED_SERVER_SECRETS", {
      hasCronSecret: !!cronSecret,
      hasServiceRoleKey: !!serviceRoleKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasOpenAqApiKey: !!openAqApiKey,
    });
    return new Response(
      JSON.stringify({ error: "Server configuration error: required secrets are unconfigured." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. Validate Service-to-Service Authentication
  // Gateway Compatibility:
  // - If Gateway JWT verification is enabled, caller sends Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
  //   or provides x-cron-secret: <CRON_SECRET>.
  // - If deployed with --no-verify-jwt, Authorization: Bearer <CRON_SECRET> is accepted directly.
  const authHeader = req.headers.get("Authorization");
  const customCronHeader = req.headers.get("x-cron-secret");

  let bearerToken: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.slice(7).trim();
  }

  const isCronSecretValid =
    (customCronHeader && constantTimeStringCompare(customCronHeader, cronSecret)) ||
    (bearerToken && constantTimeStringCompare(bearerToken, cronSecret));

  const isServiceRoleValid = bearerToken && constantTimeStringCompare(bearerToken, serviceRoleKey);

  if (!isCronSecretValid && !isServiceRoleValid) {
    logStructured("WARN", "UNAUTHORIZED_INVOCATION_ATTEMPT");
    return new Response(
      JSON.stringify({ error: "Unauthorized: Invalid service-to-service credentials." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Parse options (e.g. dryRun query param or JSON body)
  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get("dry_run") === "true";
  let dryRunBody = false;
  let targetUserId: string | undefined;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      dryRunBody = !!body.dryRun;
      if (body.targetUserId) targetUserId = body.targetUserId;
    } catch {
      // Ignore body parse errors if empty
    }
  }

  const dryRun = dryRunParam || dryRunBody;

  // 4. Initialize Supabase service-role client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await processAirAlertsSync(supabase, openAqApiKey, { dryRun, targetUserId });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStructured("ERROR", "INGESTION_FATAL_ERROR", { message: (err as Error).message });
    return new Response(
      JSON.stringify({ error: "Ingestion failed.", detail: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(handleRequest);
}
